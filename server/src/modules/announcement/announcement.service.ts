import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AnnouncementService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = '1', pageSize = '20', search, category } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }
    if (category) where.category = category;

    const [data, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take,
        include: {
          author: { select: { id: true, name: true, avatar: true } },
          reads: {
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { readAt: 'desc' },
            take: 8,
          },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async findOne(id: string) {
    return this.prisma.announcement.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        reads: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { readAt: 'desc' },
        },
      },
    });
  }

  async create(dto: any, userId: string) {
    return this.prisma.announcement.create({
      data: { ...dto, authorId: userId },
    });
  }

  async markRead(id: string, userId: string) {
    const result = await this.prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId: id, userId } },
      create: { announcementId: id, userId },
      update: {},
    });
    // Sync readCount
    const count = await this.prisma.announcementRead.count({ where: { announcementId: id } });
    await this.prisma.announcement.update({ where: { id }, data: { readCount: count } });
    return { success: true };
  }
}
