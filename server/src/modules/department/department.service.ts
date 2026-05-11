import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './department.dto';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      include: {
        _count: { select: { users: true, children: true } },
        head: { select: { id: true, name: true, avatar: true, position: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          include: {
            _count: { select: { users: true } },
            head: { select: { id: true, name: true, avatar: true } },
          },
        },
        head: { select: { id: true, name: true, avatar: true, position: true, email: true } },
        users: {
          select: { id: true, name: true, position: true, avatar: true, email: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!dept) throw new NotFoundException('部门不存在');
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: {
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId || null,
        headId: dto.headId || null,
      },
      include: {
        _count: { select: { users: true } },
        head: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('部门不存在');
    return this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
        headId: dto.headId,
      },
      include: {
        _count: { select: { users: true } },
        head: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async remove(id: string) {
    const children = await this.prisma.department.count({ where: { parentId: id } });
    if (children > 0) {
      await this.prisma.department.updateMany({
        where: { parentId: id },
        data: { parentId: null },
      });
    }
    await this.prisma.department.delete({ where: { id } });
    return { success: true };
  }
}
