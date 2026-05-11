import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.project.findMany({
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        tasks: {
          include: {
            creator: { select: { id: true, name: true, avatar: true } },
            assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
            _count: { select: { children: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { tasks: true, members: true } },
      },
    });
  }

  async create(dto: any, userId: string) {
    const { memberIds, ...data } = dto;
    return this.prisma.project.create({
      data: {
        ...data,
        ownerId: userId,
        members: memberIds
          ? { create: memberIds.map((uid: string) => ({ userId: uid })) }
          : undefined,
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { tasks: true, members: true } },
      },
    });
  }

  async update(id: string, dto: any) {
    const { memberIds, ...data } = dto;
    if (memberIds) {
      await this.prisma.projectMember.deleteMany({ where: { projectId: id } });
      await this.prisma.projectMember.createMany({
        data: memberIds.map((userId: string) => ({ projectId: id, userId })),
      });
    }
    return this.prisma.project.update({
      where: { id },
      data,
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { tasks: true, members: true } },
      },
    });
  }

  async remove(id: string) {
    await this.prisma.project.delete({ where: { id } });
    return { success: true };
  }
}
