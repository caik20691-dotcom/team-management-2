import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: any;

  const mockEvent = {
    id: 'event-1',
    title: '团队站会',
    description: '每日站会',
    startDate: new Date('2026-05-05T09:00:00Z'),
    endDate: new Date('2026-05-05T09:30:00Z'),
    allDay: false,
    color: '#7c3aed',
    category: 'MEETING',
    location: '会议室A',
    taskId: null,
    attendees: '["user-1","user-2"]',
    reminder: true,
    reminderAt: new Date('2026-05-05T08:30:00Z'),
    creatorId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: { id: 'user-1', name: '管理员', avatar: null },
    task: null,
  };

  const mockPrisma = {
    calendarEvent: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    prisma = mockPrisma;

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return events within date range', async () => {
      prisma.calendarEvent.findMany.mockResolvedValue([mockEvent]);

      const result = await service.findAll({
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('团队站会');
      expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({}),
              expect.objectContaining({}),
            ]),
          }),
          include: expect.objectContaining({
            creator: expect.any(Object),
            task: expect.any(Object),
          }),
          orderBy: { startDate: 'asc' },
        }),
      );
    });

    it('should filter by category', async () => {
      prisma.calendarEvent.findMany.mockResolvedValue([mockEvent]);

      await service.findAll({ category: 'MEETING' });

      expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'MEETING' }),
        }),
      );
    });

    it('should filter by taskId', async () => {
      prisma.calendarEvent.findMany.mockResolvedValue([]);

      await service.findAll({ taskId: 'task-1' });

      expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ taskId: 'task-1' }),
        }),
      );
    });

    it('should filter by userId in attendees', async () => {
      prisma.calendarEvent.findMany.mockResolvedValue([mockEvent]);

      await service.findAll({ userId: 'user-1' });

      expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ attendees: { contains: 'user-1' } }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single event', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(mockEvent);

      const result = await service.findOne('event-1');

      expect(result.title).toBe('团队站会');
      expect(result.creator.name).toBe('管理员');
    });

    it('should throw NotFoundException for missing event', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create an event with default values', async () => {
      const newEvent = { ...mockEvent, title: '新日程', color: '#7c3aed', category: 'EVENT' };
      prisma.calendarEvent.create.mockResolvedValue(newEvent);

      const dto = {
        title: '新日程',
        description: '描述',
        startDate: '2026-05-05T10:00:00Z',
        endDate: '2026-05-05T11:00:00Z',
        allDay: false,
      };

      const result = await service.create(dto, 'user-1');

      expect(result.title).toBe('新日程');
      expect(prisma.calendarEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: '新日程',
            color: '#7c3aed', // default
            category: 'EVENT', // default
            creatorId: 'user-1',
            attendees: '[]', // default
          }),
        }),
      );
    });

    it('should stringify attendees array', async () => {
      prisma.calendarEvent.create.mockResolvedValue(mockEvent);

      await service.create(
        { title: '测试', startDate: '2026-05-05T10:00:00Z', attendees: ['user-1', 'user-2'] },
        'user-1',
      );

      expect(prisma.calendarEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attendees: '["user-1","user-2"]',
          }),
        }),
      );
    });

    it('should set endDate to startDate if not provided', async () => {
      prisma.calendarEvent.create.mockResolvedValue(mockEvent);

      await service.create(
        { title: '测试', startDate: '2026-05-05T10:00:00Z' },
        'user-1',
      );

      const callData = prisma.calendarEvent.create.mock.calls[0][0].data;
      expect(callData.endDate).toEqual(new Date('2026-05-05T10:00:00Z'));
    });
  });

  describe('update', () => {
    it('should update an event partially', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(mockEvent);
      const updated = { ...mockEvent, title: '更新后的标题' };
      prisma.calendarEvent.update.mockResolvedValue(updated);

      const result = await service.update('event-1', { title: '更新后的标题' });

      expect(result.title).toBe('更新后的标题');
      expect(prisma.calendarEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-1' },
          data: expect.objectContaining({ title: '更新后的标题' }),
        }),
      );
    });

    it('should throw NotFoundException when event not found', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { title: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an event', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(mockEvent);
      prisma.calendarEvent.delete.mockResolvedValue(mockEvent);

      const result = await service.remove('event-1');

      expect(result).toEqual({ success: true });
      expect(prisma.calendarEvent.delete).toHaveBeenCalledWith({
        where: { id: 'event-1' },
      });
    });

    it('should throw NotFoundException when event not found', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTaskDeadlines', () => {
    it('should return tasks with non-null dueDate', async () => {
      const mockTask = {
        id: 'task-1',
        title: '完成报告',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date('2026-05-10'),
        projectId: 'proj-1',
        project: { id: 'proj-1', name: 'Q2规划', color: '#7c3aed' },
        assignees: [{ user: { id: 'user-1', name: '张三', avatar: null } }],
      };
      prisma.task.findMany.mockResolvedValue([mockTask]);

      const result = await service.getTaskDeadlines({
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('完成报告');
      expect(result[0].project?.name).toBe('Q2规划');
    });

    it('should filter tasks by date range', async () => {
      prisma.task.findMany.mockResolvedValue([]);

      await service.getTaskDeadlines({
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });
  });
});
