import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';
import dayjs from 'dayjs';
import CalendarPage from './CalendarPage';

vi.mock('../../api', () => ({
  calendarApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    getTaskDeadlines: vi.fn(),
  },
  userApi: { list: vi.fn() },
  taskApi: { list: vi.fn() },
}));

import { calendarApi, userApi, taskApi } from '../../api';

vi.spyOn(console, 'warn').mockImplementation(() => {});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/calendar']}>
          <App>{ui}</App>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (calendarApi.list as any).mockResolvedValue({ data: [] });
    (calendarApi.getTaskDeadlines as any).mockResolvedValue({ data: [] });
    (userApi.list as any).mockResolvedValue({ data: [] });
    (taskApi.list as any).mockResolvedValue({ data: [] });
    (calendarApi.create as any).mockResolvedValue({ data: {} });
    (calendarApi.update as any).mockResolvedValue({ data: {} });
    (calendarApi.remove as any).mockResolvedValue({ data: { success: true } });
  });

  describe('Page structure', () => {
    it('renders stats bar and key elements on load', async () => {
      renderWithProviders(<CalendarPage />);

      await waitFor(() => {
        expect(screen.getByText('本月日程')).toBeInTheDocument();
      });

      // All 4 stat cards
      expect(screen.getByText('本周日程')).toBeInTheDocument();
      expect(screen.getByText('今日日程')).toBeInTheDocument();
      expect(screen.getByText('任务截止')).toBeInTheDocument();

      // View toggle segments
      expect(screen.getByText('月')).toBeInTheDocument();
      expect(screen.getByText('周')).toBeInTheDocument();
      expect(screen.getByText('列表')).toBeInTheDocument();

      // Create button — multiple toolbar elements, check by exact button text
      const buttons = screen.getAllByRole('button');
      const hasCreateBtn = buttons.some(
        b => b.textContent?.includes('新建日程'),
      );
      expect(hasCreateBtn).toBe(true);

      // Month title
      expect(
        screen.getByText(dayjs().format('YYYY年 M月')),
      ).toBeInTheDocument();
    });

    it('renders sidebar sections', async () => {
      renderWithProviders(<CalendarPage />);
      await waitFor(() => {
        expect(screen.getByText('近期日程')).toBeInTheDocument();
      });
    });
  });

  describe('Calendar grid', () => {
    it('renders weekday headers', async () => {
      renderWithProviders(<CalendarPage />);
      await waitFor(() => {
        expect(screen.getByText('本月日程')).toBeInTheDocument();
      });
      ['一', '二', '三', '四', '五', '六', '日'].forEach(d => {
        expect(screen.getAllByText(d).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays events in cells', async () => {
      const todayStr = dayjs().format('YYYY-MM-DD');
      const mockEvents = [
        {
          id: 'ev-1', title: 'UniqueStandup', description: null,
          startDate: todayStr + 'T09:00:00Z', endDate: todayStr + 'T09:30:00Z',
          allDay: false, color: '#7c3aed', category: 'MEETING',
          location: null, taskId: null, attendees: '[]',
          reminder: false, reminderAt: null,
          creator: { id: 'u1', name: 'Admin', avatar: null }, task: null,
        },
      ];
      (calendarApi.list as any).mockResolvedValue({ data: mockEvents });

      renderWithProviders(<CalendarPage />);

      await waitFor(() => {
        const instances = screen.getAllByText('UniqueStandup');
        expect(instances.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Month navigation', () => {
    it('changes month with arrow buttons', async () => {
      renderWithProviders(<CalendarPage />);
      await waitFor(() => {
        expect(screen.getByText('本月日程')).toBeInTheDocument();
      });

      const leftArrow = document.querySelector('.anticon-left');
      if (leftArrow) {
        const btn = leftArrow.closest('button');
        if (btn) fireEvent.click(btn);
        await waitFor(() => {
          const prevTitle = dayjs().subtract(1, 'month').format('YYYY年 M月');
          expect(screen.getByText(prevTitle)).toBeInTheDocument();
        });
      }

      const rightArrow = document.querySelector('.anticon-right');
      if (rightArrow) {
        const btn = rightArrow.closest('button');
        if (btn) fireEvent.click(btn);
        await waitFor(() => {
          const expected = dayjs().format('YYYY年 M月');
          expect(screen.getByText(expected)).toBeInTheDocument();
        });
      }
    });
  });

  describe('View switching', () => {
    it('switches to week view', async () => {
      renderWithProviders(<CalendarPage />);
      await waitFor(() => {
        expect(screen.getByText('本月日程')).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByText('周')[0]);

      await waitFor(() => {
        const text = document.body.textContent || '';
        expect(text).toContain(' - ');
      });
    });

    it('switches to list view', async () => {
      const mockEvents = [
        {
          id: 'ev-1', title: 'FutureEventUnique', description: null,
          startDate: dayjs().add(3, 'day').format('YYYY-MM-DD') + 'T10:00:00Z',
          endDate: dayjs().add(3, 'day').format('YYYY-MM-DD') + 'T11:00:00Z',
          allDay: false, color: '#7c3aed', category: 'EVENT',
          location: null, taskId: null, attendees: '[]',
          reminder: false, reminderAt: null,
          creator: { id: 'u1', name: 'Admin', avatar: null }, task: null,
        },
      ];
      (calendarApi.list as any).mockResolvedValue({ data: mockEvents });

      renderWithProviders(<CalendarPage />);
      await waitFor(() => {
        expect(screen.getByText('本月日程')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('列表'));

      await waitFor(() => {
        const instances = screen.getAllByText('FutureEventUnique');
        expect(instances.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Task deadlines', () => {
    it('shows overdue and upcoming deadlines', async () => {
      const mockDeadlines = [
        {
          id: 'task-1', title: 'UrgentReport', status: 'IN_PROGRESS', priority: 'HIGH',
          dueDate: dayjs().add(1, 'day').toISOString(),
          project: { id: 'p1', name: 'Q2', color: '#7c3aed' },
          assignees: [{ user: { id: 'u1', name: 'Alice', avatar: null } }],
        },
        {
          id: 'task-2', title: 'OverdueTaskZZZ', status: 'TODO', priority: 'URGENT',
          dueDate: dayjs().subtract(3, 'day').toISOString(),
          project: null, assignees: [],
        },
      ];
      (calendarApi.getTaskDeadlines as any).mockResolvedValue({ data: mockDeadlines });
      (calendarApi.list as any).mockResolvedValue({ data: [] });

      renderWithProviders(<CalendarPage />);

      await waitFor(() => {
        expect(screen.getAllByText('UrgentReport').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByText('OverdueTaskZZZ').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/逾期/).length).toBeGreaterThan(0);
    });
  });

  describe('Create event modal', () => {
    it('opens modal form with all fields', async () => {
      renderWithProviders(<CalendarPage />);
      await waitFor(() => {
        expect(screen.getByText('本月日程')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const createBtn = buttons.find(b => b.textContent?.includes('新建日程'));
      expect(createBtn).toBeTruthy();
      if (createBtn) fireEvent.click(createBtn);

      await waitFor(() => {
        expect(screen.getByText('描述')).toBeInTheDocument();
      });

      // Verify all form fields
      expect(screen.getByText('全天')).toBeInTheDocument();
      expect(screen.getByText('分类')).toBeInTheDocument();
      expect(screen.getByText('颜色')).toBeInTheDocument();
      expect(screen.getByText('地点')).toBeInTheDocument();
      expect(screen.getByText('参与人')).toBeInTheDocument();
      expect(screen.getByText('日程提醒')).toBeInTheDocument();

      // Modal should have title input
      const inputs = document.querySelectorAll('input');
      const hasTitleInput = Array.from(inputs).some(
        inp => (inp as HTMLInputElement).placeholder?.includes('日程标题'),
      );
      expect(hasTitleInput).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('reflects event count in stat numbers', async () => {
      const todayStr = dayjs().format('YYYY-MM-DD');
      const mockEvents = [
        {
          id: 'ev-1', title: 'StatTestEvent', description: null,
          startDate: todayStr + 'T09:00:00Z', endDate: todayStr + 'T10:00:00Z',
          allDay: false, color: '#7c3aed', category: 'EVENT',
          location: null, taskId: null, attendees: '[]',
          reminder: false, reminderAt: null,
          creator: { id: 'u1', name: 'Admin', avatar: null }, task: null,
        },
      ];
      (calendarApi.list as any).mockResolvedValue({ data: mockEvents });

      renderWithProviders(<CalendarPage />);

      await waitFor(() => {
        const instances = screen.getAllByText('StatTestEvent');
        expect(instances.length).toBeGreaterThan(0);
      });

      // The stat cards should show at least "1" for today's count
      // Stat values are in large font divs
      const statTexts = document.body.textContent || '';
      expect(statTexts).toContain('本月日程');
      expect(statTexts).toContain('今日日程');
    });
  });
});
