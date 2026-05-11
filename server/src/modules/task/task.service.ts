import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = '1', pageSize = '20', status, priority, projectId, taskType, parentId } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (taskType === 'regular') where.projectId = null;
    if (taskType === 'project') where.projectId = { not: null };
    if (parentId) where.parentId = parentId;

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take,
        include: {
          creator: { select: { id: true, name: true, avatar: true } },
          assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
          project: { select: { id: true, name: true, color: true } },
          _count: { select: { comments: true, attachments: true, children: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async findOne(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        project: { select: { id: true, name: true, color: true } },
        comments: { include: { author: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'desc' } },
        attachments: true,
        children: { select: { id: true, title: true, status: true, priority: true } },
        activityLogs: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
  }

  async create(dto: any, userId: string) {
    const { assigneeIds, ...data } = dto;
    return this.prisma.task.create({
      data: {
        ...data,
        creatorId: userId,
        assignees: assigneeIds
          ? { create: assigneeIds.map((userId: string) => ({ userId })) }
          : undefined,
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    });
  }

  async update(id: string, dto: any) {
    const { assigneeIds, ...data } = dto;
    if (assigneeIds) {
      await this.prisma.taskAssignee.deleteMany({ where: { taskId: id } });
      await this.prisma.taskAssignee.createMany({
        data: assigneeIds.map((userId: string) => ({ taskId: id, userId })),
      });
    }
    return this.prisma.task.update({
      where: { id },
      data,
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    });
  }

  async remove(id: string) {
    await this.prisma.task.delete({ where: { id } });
    return { success: true };
  }

  async addAttachment(taskId: string, uploaderId: string, file: { filename: string; url: string; size: number; mimeType: string }) {
    return this.prisma.attachment.create({
      data: {
        filename: file.filename,
        url: file.url,
        size: file.size,
        mimeType: file.mimeType,
        taskId,
        uploaderId,
      },
    });
  }

  async removeAttachment(attachmentId: string) {
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    return { success: true };
  }
}
