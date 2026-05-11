import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { startDate, endDate, category, taskId, userId } = query;

    const where: any = {};
    if (startDate && endDate) {
      where.OR = [
        { startDate: { gte: new Date(startDate) }, endDate: { lte: new Date(endDate) } },
        { startDate: { lte: new Date(endDate) }, endDate: { gte: new Date(startDate) } },
      ];
    }
    if (category) where.category = category;
    if (taskId) where.taskId = taskId;
    if (userId) {
      where.attendees = { contains: userId };
    }

    return this.prisma.calendarEvent.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        task: { select: { id: true, title: true, status: true, priority: true } },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        task: { select: { id: true, title: true, status: true, priority: true, dueDate: true } },
      },
    });
    if (!event) throw new NotFoundException('日程不存在');
    return event;
  }

  async create(dto: any, userId: string) {
    return this.prisma.calendarEvent.create({
      data: {
        title: dto.title,
        description: dto.description || '',
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate || dto.startDate),
        allDay: dto.allDay ?? false,
        color: dto.color || '#7c3aed',
        category: dto.category || 'EVENT',
        location: dto.location || null,
        taskId: dto.taskId || null,
        attendees: dto.attendees ? JSON.stringify(dto.attendees) : '[]',
        reminder: dto.reminder ?? false,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : null,
        creatorId: userId,
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        task: { select: { id: true, title: true, status: true } },
      },
    });
  }

  async update(id: string, dto: any) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('日程不存在');

    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        allDay: dto.allDay,
        color: dto.color,
        category: dto.category,
        location: dto.location,
        taskId: dto.taskId,
        attendees: dto.attendees ? JSON.stringify(dto.attendees) : undefined,
        reminder: dto.reminder,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        task: { select: { id: true, title: true, status: true } },
      },
    });
  }

  async remove(id: string) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('日程不存在');
    await this.prisma.calendarEvent.delete({ where: { id } });
    return { success: true };
  }

  // Get tasks with due dates (for calendar integration)
  async getTaskDeadlines(query: any) {
    const { startDate, endDate, projectId } = query;
    const where: any = { dueDate: { not: null } };
    if (startDate && endDate) {
      where.dueDate = { gte: new Date(startDate), lte: new Date(endDate) };
    }
    if (projectId) {
      where.projectId = projectId;
    }
    return this.prisma.task.findMany({
      where,
      select: {
        id: true, title: true, status: true, priority: true,
        dueDate: true, projectId: true,
        project: { select: { id: true, name: true, color: true } },
        assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}
