import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, query: any) {
    const { page = '1', pageSize = '20', unreadOnly, type } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = { userId };
    if (unreadOnly === 'true') where.isRead = false;
    if (type && type !== 'ALL') where.type = type;

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where, skip, take,
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { data, total, unreadCount, page: Number(page), pageSize: Number(pageSize) };
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async create(dto: any) {
    return this.prisma.notification.create({ data: dto });
  }
}
