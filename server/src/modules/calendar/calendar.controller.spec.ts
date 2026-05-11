import { Test, TestingModule } from '@nestjs/testing';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

describe('CalendarController', () => {
  let controller: CalendarController;
  let service: any;

  const mockCalendarService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getTaskDeadlines: jest.fn(),
  };

  const mockGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [
        { provide: CalendarService, useValue: mockCalendarService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<CalendarController>(CalendarController);
    service = mockCalendarService;

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return events from service', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: '站会',
          startDate: new Date('2026-05-05'),
          creator: { id: 'u1', name: '管理员', avatar: null },
          task: null,
        },
      ];
      service.findAll.mockResolvedValue(mockEvents);

      const result = await controller.findAll({ startDate: '2026-05-01', endDate: '2026-05-31' });

      expect(result).toEqual(mockEvents);
      expect(service.findAll).toHaveBeenCalledWith({
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      });
    });
  });

  describe('findOne', () => {
    it('should return a single event', async () => {
      const mockEvent = { id: 'event-1', title: '站会' };
      service.findOne.mockResolvedValue(mockEvent);

      const result = await controller.findOne('event-1');

      expect(result).toEqual(mockEvent);
      expect(service.findOne).toHaveBeenCalledWith('event-1');
    });
  });

  describe('create', () => {
    it('should create an event with userId', async () => {
      const dto = { title: '新日程', startDate: '2026-05-05T10:00:00Z' };
      const created = { id: 'event-2', ...dto, creatorId: 'user-1' };
      service.create.mockResolvedValue(created);

      const result = await controller.create(dto, 'user-1');

      expect(result.creatorId).toBe('user-1');
      expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('update', () => {
    it('should update an event', async () => {
      const updated = { id: 'event-1', title: '修改后' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update('event-1', { title: '修改后' });

      expect(result.title).toBe('修改后');
      expect(service.update).toHaveBeenCalledWith('event-1', { title: '修改后' });
    });
  });

  describe('remove', () => {
    it('should remove an event', async () => {
      service.remove.mockResolvedValue({ success: true });

      const result = await controller.remove('event-1');

      expect(result).toEqual({ success: true });
      expect(service.remove).toHaveBeenCalledWith('event-1');
    });
  });

  describe('getTaskDeadlines', () => {
    it('should return task deadlines', async () => {
      const mockTasks = [
        { id: 'task-1', title: '报告', dueDate: new Date('2026-05-10') },
      ];
      service.getTaskDeadlines.mockResolvedValue(mockTasks);

      const result = await controller.getTaskDeadlines({
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      });

      expect(result).toEqual(mockTasks);
    });
  });
});
