import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Space, Tag, Modal, Form, Input, Select, DatePicker, Switch,
  Typography, Segmented, App, Popconfirm, Tooltip, Badge,
} from 'antd';
import {
  PlusOutlined, LeftOutlined, RightOutlined,
  EnvironmentOutlined, ClockCircleOutlined, CalendarOutlined,
  FieldTimeOutlined, TeamOutlined, CarryOutOutlined,
} from '@ant-design/icons';
import { calendarApi, userApi, projectApi } from '../../api';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { Dayjs } from 'dayjs';

dayjs.extend(isoWeek);

const { Title, Text } = Typography;

const CATEGORIES: Record<string, { label: string; color: string; icon: string }> = {
  EVENT: { label: '日程', color: '#7c3aed', icon: '📅' },
  MEETING: { label: '会议', color: '#3b82f6', icon: '🤝' },
  REMINDER: { label: '提醒', color: '#f59e0b', icon: '🔔' },
  TASK: { label: '任务', color: '#10b981', icon: '✅' },
  HOLIDAY: { label: '假期', color: '#ef4444', icon: '🏖️' },
};

const EVENT_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];
const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  color?: string;
  category: string;
  location?: string;
  taskId?: string;
  attendees: string;
  reminder: boolean;
  reminderAt?: string;
  creator?: { id: string; name: string; avatar?: string };
  task?: { id: string; title: string; status: string; priority: string };
}

interface TaskDeadline {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  project?: { id: string; name: string; color?: string };
  assignees?: { user: { id: string; name: string; avatar?: string } }[];
}

function parseAttendees(attendees: string): string[] {
  if (!attendees) return [];
  try { return JSON.parse(attendees); } catch { return []; }
}

function ColorPicker({ value, onChange }: { value?: string; onChange?: (c: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {EVENT_COLORS.map(c => {
        const selected = value === c;
        return (
          <div
            key={c}
            onClick={() => onChange?.(c)}
            style={{
              width: 28, height: 28, borderRadius: '50%', backgroundColor: c,
              border: selected ? `3px solid ${c}` : '2px solid #e5e7eb',
              cursor: 'pointer', transition: 'all 0.2s',
              transform: selected ? 'scale(1.15)' : 'scale(1)',
              boxShadow: selected ? `0 0 8px ${c}66` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [projectFilter, setProjectFilter] = useState<string | undefined>(
    searchParams.get('projectId') || undefined,
  );
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');

  const rangeStart = currentMonth.startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
  const rangeEnd = currentMonth.endOf('month').add(7, 'day').format('YYYY-MM-DD');

  const { data: events = [] } = useQuery({
    queryKey: ['calendarEvents', { startDate: rangeStart, endDate: rangeEnd, category: categoryFilter }],
    queryFn: () => calendarApi.list({ startDate: rangeStart, endDate: rangeEnd, category: categoryFilter }).then(r => r.data),
  });

  const { data: taskDeadlines = [] } = useQuery({
    queryKey: ['taskDeadlines', { startDate: rangeStart, endDate: rangeEnd, projectId: projectFilter }],
    queryFn: () => calendarApi.getTaskDeadlines({ startDate: rangeStart, endDate: rangeEnd, projectId: projectFilter }).then(r => r.data),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.list({ pageSize: '200' }).then(r => r.data.data),
    staleTime: 60000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list().then(r => r.data),
    staleTime: 60000,
  });

  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (Array.isArray(users)) {
      users.forEach((u: any) => { map[u.id] = u.name; });
    }
    return map;
  }, [users]);

  const createMutation = useMutation({
    mutationFn: (data: any) => calendarApi.create(data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      queryClient.invalidateQueries({ queryKey: ['taskDeadlines'] });
      if (data?.startDate) {
        const d = dayjs(data.startDate);
        setSelectedDate(d);
        setCurrentMonth(d.startOf('month'));
        setViewMode('month');
      }
      message.success('日程已创建');
      setModalOpen(false);
      form.resetFields();
      setEditingEvent(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => calendarApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      queryClient.invalidateQueries({ queryKey: ['taskDeadlines'] });
      message.success('日程已更新');
      setModalOpen(false);
      form.resetFields();
      setEditingEvent(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => calendarApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      queryClient.invalidateQueries({ queryKey: ['taskDeadlines'] });
      message.success('日程已删除');
    },
  });

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e: CalendarEvent) => {
      const key = dayjs(e.startDate).format('YYYY-MM-DD');
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  const deadlinesByDate = useMemo(() => {
    const map: Record<string, TaskDeadline[]> = {};
    taskDeadlines.forEach((d: TaskDeadline) => {
      const key = dayjs(d.dueDate).format('YYYY-MM-DD');
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return map;
  }, [taskDeadlines]);

  const today = dayjs().format('YYYY-MM-DD');

  // Statistics
  const stats = useMemo(() => {
    const now = dayjs();
    const monthStart = currentMonth.startOf('month');
    const monthEnd = currentMonth.endOf('month');
    const weekStart = now.startOf('isoWeek');
    const weekEnd = now.endOf('isoWeek');

    const monthEvents = events.filter((e: CalendarEvent) => {
      const d = dayjs(e.startDate);
      return d.isAfter(monthStart.subtract(1, 'day')) && d.isBefore(monthEnd.add(1, 'day'));
    });
    const weekEvents = monthEvents.filter((e: CalendarEvent) => {
      const d = dayjs(e.startDate);
      return d.isAfter(weekStart.subtract(1, 'day')) && d.isBefore(weekEnd.add(1, 'day'));
    });
    const todayEvents = eventsByDate[today] || [];

    return {
      monthTotal: monthEvents.length,
      weekTotal: weekEvents.length,
      todayTotal: todayEvents.length,
      deadlineTotal: (taskDeadlines as TaskDeadline[]).length,
    };
  }, [events, eventsByDate, taskDeadlines, currentMonth, today]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = selectedDate.format('YYYY-MM-DD');
    return eventsByDate[key] || [];
  }, [selectedDate, eventsByDate]);

  const selectedDateDeadlines = useMemo(() => {
    if (!selectedDate) return [];
    const key = selectedDate.format('YYYY-MM-DD');
    return deadlinesByDate[key] || [];
  }, [selectedDate, deadlinesByDate]);

  const upcomingEvents = useMemo(() => {
    const now = dayjs();
    return events
      .filter((e: CalendarEvent) => dayjs(e.startDate).isAfter(now))
      .sort((a: CalendarEvent, b: CalendarEvent) => dayjs(a.startDate).diff(dayjs(b.startDate)))
      .slice(0, 8);
  }, [events]);

  const calendarDays = useMemo(() => {
    const monthStart = currentMonth.startOf('month');
    const startDay = monthStart.day();
    const prevDays = startDay === 0 ? 6 : startDay - 1;
    const calendarStart = monthStart.subtract(prevDays, 'day');
    return Array.from({ length: 42 }, (_, i) => calendarStart.add(i, 'day'));
  }, [currentMonth]);

  const weeks = useMemo(() => {
    const ws: Dayjs[][] = [];
    for (let i = 0; i < 6; i++) {
      ws.push(calendarDays.slice(i * 7, (i + 1) * 7));
    }
    return ws;
  }, [calendarDays]);

  // Week view days
  const weekDays = useMemo(() => {
    const start = (selectedDate || dayjs()).startOf('isoWeek');
    return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
  }, [selectedDate]);

  function openCreateModal(day?: Dayjs) {
    setEditingEvent(null);
    form.resetFields();
    form.setFieldsValue({
      color: '#7c3aed',
      category: 'EVENT',
      allDay: false,
      reminder: false,
      startDate: day || dayjs().hour(9).minute(0).second(0),
      endDate: day ? day.add(1, 'hour') : dayjs().hour(10).minute(0).second(0),
    });
    setModalOpen(true);
  }

  function openEditModal(event: CalendarEvent) {
    setEditingEvent(event);
    form.setFieldsValue({
      ...event,
      startDate: dayjs(event.startDate),
      endDate: dayjs(event.endDate),
      reminderAt: event.reminderAt ? dayjs(event.reminderAt) : undefined,
      attendees: parseAttendees(event.attendees),
    });
    setModalOpen(true);
  }

  function handleSubmit() {
    form.validateFields().then(values => {
      const allDay = values.allDay;
      const data: any = {
        title: values.title,
        description: values.description || '',
        startDate: allDay ? values.startDate.startOf('day').toISOString() : values.startDate.toISOString(),
        endDate: allDay ? (values.endDate || values.startDate).endOf('day').toISOString() : (values.endDate || values.startDate).toISOString(),
        allDay,
        color: values.color,
        category: values.category,
        location: values.location || null,
        attendees: values.attendees || [],
        reminder: values.reminder,
        reminderAt: values.reminder && values.reminderAt ? values.reminderAt.toISOString() : null,
      };

      if (editingEvent) {
        updateMutation.mutate({ id: editingEvent.id, data });
      } else {
        createMutation.mutate(data);
      }
    });
  }

  function handleDelete() {
    if (!editingEvent) return;
    deleteMutation.mutate(editingEvent.id);
    setModalOpen(false);
    form.resetFields();
    setEditingEvent(null);
  }

  const allDayValue = Form.useWatch('allDay', form);

  const categoryOptions = Object.entries(CATEGORIES).map(([value, { label }]) => ({
    value, label,
  }));

  const userOptions = Array.isArray(users) ? users.map((u: any) => ({ label: u.name, value: u.id })) : [];

  // Render event card for calendar cell
  function renderEventCard(ev: CalendarEvent, compact = false) {
    const eventColor = ev.color || '#7c3aed';
    const timeStr = ev.allDay ? '全天' : dayjs(ev.startDate).format('HH:mm');

    if (compact) {
      return (
        <Tooltip key={ev.id} title={<div style={{ fontSize: 12 }}><b>{ev.title}</b><br />{timeStr}</div>}>
          <div
            onClick={(e) => { e.stopPropagation(); openEditModal(ev); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '1px 4px', borderRadius: 3, marginBottom: 1,
              fontSize: 10, lineHeight: '15px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              cursor: 'pointer', background: eventColor + '1a',
              borderLeft: `2px solid ${eventColor}`,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = eventColor + '30'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = eventColor + '1a'; }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: eventColor, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{ev.title}</span>
          </div>
        </Tooltip>
      );
    }

    return (
      <Tooltip
        key={ev.id}
        title={
          <div style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{ev.title}</div>
            {ev.description && <div style={{ marginBottom: 2, opacity: 0.8 }}>{ev.description}</div>}
            <div>{ev.allDay ? '全天' : dayjs(ev.startDate).format('MM-DD HH:mm') + ' - ' + dayjs(ev.endDate).format('HH:mm')}</div>
            {ev.location && <div><EnvironmentOutlined /> {ev.location}</div>}
            {ev.task && <div style={{ marginTop: 2, fontSize: 11 }}>关联: {ev.task.title}</div>}
          </div>
        }
      >
        <div
          onClick={(e) => { e.stopPropagation(); openEditModal(ev); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '2px 6px', borderRadius: 4,
            fontSize: 11, lineHeight: '17px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            cursor: 'pointer',
            background: eventColor + '15',
            borderLeft: `3px solid ${eventColor}`,
            transition: 'background 0.15s, transform 0.15s',
            marginBottom: 1,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = eventColor + '2e';
            (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = eventColor + '15';
            (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: eventColor, flexShrink: 0,
          }} />
          <span style={{ fontSize: 10, color: eventColor, fontWeight: 600, flexShrink: 0 }}>{timeStr}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{ev.title}</span>
        </div>
      </Tooltip>
    );
  }

  // Render task deadline card for calendar cell
  function renderDeadlineCard(d: TaskDeadline) {
    const diff = dayjs(d.dueDate).startOf('day').diff(dayjs().startOf('day'), 'day');
    const overdue = diff < 0;
    const soon = diff <= 2 && diff >= 0;
    const color = overdue ? '#ef4444' : soon ? '#f59e0b' : '#10b981';
    const label = overdue ? `逾期${Math.abs(diff)}天` : soon ? (diff === 0 ? '今天' : diff === 1 ? '明天' : `${diff}天后`) : `${diff}天后`;

    return (
      <Tooltip
        key={'dl-' + d.id}
        title={
          <div style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.title}</div>
            <div>截止: {dayjs(d.dueDate).format('YYYY-MM-DD')} · {label}</div>
            {d.project && <div>项目: {d.project.name}</div>}
          </div>
        }
      >
        <div
          onClick={(e) => { e.stopPropagation(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '1px 5px', borderRadius: 3,
            fontSize: 10, lineHeight: '15px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            cursor: 'default',
            background: color + '14',
            borderLeft: `2px solid ${color}`,
            transition: 'background 0.15s',
            marginBottom: 1,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = color + '28'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = color + '14'; }}
        >
          <span style={{
            width: 5, height: 5, borderRadius: 2,
            backgroundColor: color, flexShrink: 0,
          }} />
          <span style={{ fontSize: 9, color, fontWeight: 600, flexShrink: 0 }}>{label}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{d.title}</span>
        </div>
      </Tooltip>
    );
  }

  // Stat card component
  const StatCard = ({ icon: Icon, label, value, color, bg }: {
    icon: any; label: string; value: number; color: string; bg: string;
  }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 14,
      background: '#fff', border: '1px solid #f0f0f0',
      flex: 1, minWidth: 140,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color,
      }}>
        <Icon />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1e1b4b', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#8b8b8b' }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '16px 24px', display: 'flex', gap: 20, height: 'calc(100vh - 88px)' }}>
      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <Space size={12}>
            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as 'month' | 'week' | 'list')}
              options={[
                { label: '月', value: 'month' },
                { label: '周', value: 'week' },
                { label: '列表', value: 'list' },
              ]}
              style={{ background: '#f5f3ff' }}
            />
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="全部分类"
              allowClear
              style={{ width: 110 }}
              options={categoryOptions}
            />
            <Select
              value={projectFilter}
              onChange={(val) => {
                setProjectFilter(val);
                if (val) {
                  setSearchParams({ projectId: val });
                } else {
                  setSearchParams({});
                }
              }}
              placeholder="全部项目"
              allowClear
              style={{ width: 140 }}
              options={Array.isArray(projects) ? projects.map((p: any) => ({
                value: p.id,
                label: p.name,
              })) : []}
            />
          </Space>

          <Space size={12}>
            <Button onClick={() => {
              setCurrentMonth(dayjs().startOf('month'));
              setSelectedDate(dayjs());
            }}>今天</Button>
            <Space size={2}>
              <Button
                type="text"
                icon={<LeftOutlined />}
                onClick={() => {
                  if (viewMode === 'week') {
                    setSelectedDate(prev => (prev || dayjs()).subtract(1, 'week'));
                  } else {
                    setCurrentMonth(prev => prev.subtract(1, 'month'));
                  }
                }}
              />
              <Title level={4} style={{ margin: 0, minWidth: 140, textAlign: 'center', fontWeight: 600, fontSize: 17 }}>
                {viewMode === 'week'
                  ? `${weekDays[0].format('M/D')} - ${weekDays[6].format('M/D')}`
                  : currentMonth.format('YYYY年 M月')
                }
              </Title>
              <Button
                type="text"
                icon={<RightOutlined />}
                onClick={() => {
                  if (viewMode === 'week') {
                    setSelectedDate(prev => (prev || dayjs()).add(1, 'week'));
                  } else {
                    setCurrentMonth(prev => prev.add(1, 'month'));
                  }
                }}
              />
            </Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateModal()}>
              新建日程
            </Button>
          </Space>
        </div>

        {/* Statistics bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <StatCard icon={CalendarOutlined} label="本月日程" value={stats.monthTotal} color="#7c3aed" bg="#f5f3ff" />
          <StatCard icon={FieldTimeOutlined} label="本周日程" value={stats.weekTotal} color="#3b82f6" bg="#eff6ff" />
          <StatCard icon={ClockCircleOutlined} label="今日日程" value={stats.todayTotal} color="#f59e0b" bg="#fffbeb" />
          <StatCard icon={CarryOutOutlined} label="任务截止" value={stats.deadlineTotal} color="#ef4444" bg="#fef2f2" />
        </div>

        {/* Calendar / Week / List view */}
        {(viewMode === 'month' || viewMode === 'week') ? (
          <div style={{
            flex: 1, background: '#fff', borderRadius: 16,
            border: '1px solid #f0f0f0', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Weekday header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '40px repeat(7, 1fr)',
              borderBottom: '1px solid #f0f0f0', background: '#faf5ff',
            }}>
              <div style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 600, fontSize: 11, color: '#b0b0b0' }}>
                W
              </div>
              {WEEKDAY_LABELS.map((label, i) => (
                <div key={label} style={{
                  padding: '8px 6px', textAlign: 'center',
                  fontWeight: 600, fontSize: 12, color: i >= 5 ? '#ef4444' : '#7c3aed',
                  borderRight: i < 6 ? '1px solid #f0f0f0' : 'none',
                }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Grid body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {(viewMode === 'month' ? weeks : [weekDays]).map((wk, wi) => {
                const weekNum = wk[0].isoWeek();
                return (
                  <div key={wi} style={{
                    display: 'grid', gridTemplateColumns: '40px repeat(7, 1fr)',
                    flex: 1, borderBottom: wi < (viewMode === 'month' ? 5 : 0) ? '1px solid #f0f0f0' : 'none',
                  }}>
                    {/* Week number */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRight: '1px solid #f0f0f0',
                      fontSize: 10, color: '#b0b0b0', fontWeight: 500,
                      background: '#fafafa',
                    }}>
                      {weekNum}
                    </div>
                    {wk.map((day, di) => {
                      const dateKey = day.format('YYYY-MM-DD');
                      const dayEvents = eventsByDate[dateKey] || [];
                      const dayDeadlines = deadlinesByDate[dateKey] || [];
                      const isToday = day.isSame(dayjs(), 'day');
                      const isSelected = selectedDate?.isSame(day, 'day');
                      const isCurrentMonth = viewMode === 'week' || day.month() === currentMonth.month();
                      const isWeekend = di >= 5;
                      const maxEvents = viewMode === 'week' ? 8 : 4;
                      const maxDeadlines = viewMode === 'week' ? 4 : 2;
                      const displayEvents = dayEvents.slice(0, maxEvents);
                      const displayDeadlines = dayDeadlines.slice(0, maxDeadlines);
                      const totalOverflow = Math.max(0, dayEvents.length - maxEvents) + Math.max(0, dayDeadlines.length - maxDeadlines);
                      const compactMode = viewMode === 'month' && (dayEvents.length + dayDeadlines.length) > 3;

                      return (
                        <div
                          key={dateKey}
                          onClick={() => setSelectedDate(day)}
                          onDoubleClick={() => openCreateModal(day)}
                          style={{
                            padding: '3px 4px',
                            borderRight: di < 6 ? '1px solid #f0f0f0' : 'none',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            background: isSelected ? '#f5f3ff' : isWeekend ? '#fafafa' : '#fff',
                            opacity: isCurrentMonth ? 1 : 0.4,
                            display: 'flex', flexDirection: 'column',
                            minHeight: 0, overflow: 'hidden',
                            position: 'relative',
                          }}
                        >
                          {/* Date number + indicators */}
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 2, padding: '0 2px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 24, height: 24, borderRadius: '50%',
                                fontWeight: isToday ? 700 : 500, fontSize: 13,
                                background: isToday ? '#7c3aed' : 'transparent',
                                color: isToday ? '#fff' : isWeekend ? '#d0d0d0' : isCurrentMonth ? '#1e1b4b' : '#b0b0b0',
                                transition: 'all 0.2s',
                              }}>
                                {day.date()}
                              </span>
                            </div>
                            {totalOverflow > 0 && (
                              <span style={{ fontSize: 9, color: '#8b8b8b', fontWeight: 600 }}>
                                +{totalOverflow}
                              </span>
                            )}
                          </div>

                          {/* Event + Deadline cards */}
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 0 }}>
                            {displayEvents.map(ev => renderEventCard(ev, compactMode))}
                            {displayDeadlines.map(d => renderDeadlineCard(d))}
                          </div>

                          {/* Add button — visible when cell selected or hovered */}
                          <div
                            style={{
                              position: 'absolute', top: 2, right: 4,
                              width: 20, height: 20, borderRadius: '50%',
                              background: '#7c3aed', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 700, lineHeight: 1,
                              opacity: isSelected ? 0.75 : 0, transition: 'opacity 0.15s',
                              cursor: 'pointer',
                            }}
                            onClick={(e) => { e.stopPropagation(); openCreateModal(day); }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = isSelected ? '0.75' : '0'; }}
                          >
                            +
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List view */
          <div style={{ flex: 1, overflow: 'auto' }}>
            {(() => {
              const grouped: Record<string, CalendarEvent[]> = {};
              const now = dayjs();
              const todayStr = now.format('YYYY-MM-DD');
              const tomorrowStr = now.add(1, 'day').format('YYYY-MM-DD');
              const weekEnd = now.endOf('isoWeek').format('YYYY-MM-DD');
              const monthEnd = currentMonth.endOf('month').format('YYYY-MM-DD');

              events.forEach((e: CalendarEvent) => {
                const d = dayjs(e.startDate).format('YYYY-MM-DD');
                let group: string;
                if (d === todayStr) group = '今天';
                else if (d === tomorrowStr) group = '明天';
                else if (d <= weekEnd) group = '本周';
                else if (d <= monthEnd) group = '本月';
                else group = '之后';
                if (!grouped[group]) grouped[group] = [];
                grouped[group].push(e);
              });

              const groups = ['今天', '明天', '本周', '本月', '之后'];
              return (
                <>
                  {groups.map(g => {
                    if (!grouped[g]?.length) return null;
                    return (
                      <div key={g} style={{ marginBottom: 20 }}>
                        <Title level={5} style={{ marginBottom: 8, color: '#7c3aed', fontWeight: 600 }}>{g} · {grouped[g].length}</Title>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {grouped[g].map(ev => {
                            const cat = CATEGORIES[ev.category] || CATEGORIES.EVENT;
                            return (
                              <div
                                key={ev.id}
                                onClick={() => openEditModal(ev)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  padding: '12px 16px', background: '#fff',
                                  borderRadius: 12, border: '1px solid #f0f0f0',
                                  borderLeft: `4px solid ${ev.color || '#7c3aed'}`,
                                  cursor: 'pointer', transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.1)';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.boxShadow = 'none';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                <div style={{
                                  width: 38, height: 38, borderRadius: 10,
                                  background: (ev.color || '#7c3aed') + '18',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 18, flexShrink: 0,
                                }}>
                                  {cat.icon}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <Text style={{ fontWeight: 600, fontSize: 14 }} ellipsis>{ev.title}</Text>
                                  <div style={{ fontSize: 12, color: '#8b8b8b', marginTop: 2 }}>
                                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                                    {ev.allDay ? '全天' : dayjs(ev.startDate).format('MM-DD HH:mm') + ' - ' + dayjs(ev.endDate).format('HH:mm')}
                                    {ev.location && <span> · <EnvironmentOutlined /> {ev.location}</span>}
                                    {ev.description && <span> · {ev.description.slice(0, 30)}{ev.description.length > 30 ? '...' : ''}</span>}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  {parseAttendees(ev.attendees).length > 0 && (
                                    <Tooltip title={`${parseAttendees(ev.attendees).length} 位参与人`}>
                                      <TeamOutlined style={{ color: '#b0b0b0' }} />
                                    </Tooltip>
                                  )}
                                  <Tag color={cat.color} style={{ margin: 0 }}>{cat.label}</Tag>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {!events.length && (
                    <div style={{ textAlign: 'center', padding: 80, color: '#b0b0b0' }}>
                      <CalendarOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
                      <Text style={{ fontSize: 15, color: '#b0b0b0' }}>暂无日程，点击"新建日程"开始规划</Text>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        {/* Upcoming events */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid #f0f0f0', padding: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <Title level={5} style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>近期日程</Title>
              <Text style={{ fontSize: 11, color: '#b0b0b0' }}>未来待办事项一目了然</Text>
            </div>
            <Badge count={upcomingEvents.length} size="small" style={{ backgroundColor: '#7c3aed' }} />
          </div>
          {upcomingEvents.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 13 }}>暂无近期日程</Text>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {upcomingEvents.map((ev: CalendarEvent) => {
                const cat = CATEGORIES[ev.category] || CATEGORIES.EVENT;
                const eventColor = ev.color || '#7c3aed';
                const diff = dayjs(ev.startDate).startOf('day').diff(dayjs().startOf('day'), 'day');
                const distanceLabel = diff === 0 ? '今天' : diff === 1 ? '明天' : diff <= 7 ? `${diff}天后` : dayjs(ev.startDate).format('M/D');
                const distanceColor = diff === 0 ? '#ef4444' : diff === 1 ? '#f59e0b' : diff <= 7 ? '#7c3aed' : '#8b8b8b';
                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setSelectedDate(dayjs(ev.startDate));
                      setCurrentMonth(dayjs(ev.startDate).startOf('month'));
                      setViewMode('month');
                    }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '8px 10px', borderRadius: 10,
                      cursor: 'pointer', transition: 'background 0.15s',
                      borderLeft: `3px solid ${eventColor}`,
                      background: diff === 0 ? eventColor + '0a' : 'transparent',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = eventColor + '14'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = diff === 0 ? eventColor + '0a' : 'transparent'; }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: eventColor + '18',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0, marginTop: 2,
                    }}>
                      {cat.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13, fontWeight: 500 }} ellipsis>{ev.title}</Text>
                      <div style={{ fontSize: 11, color: '#8b8b8b', marginTop: 2 }}>
                        <span style={{ color: distanceColor, fontWeight: 600 }}>{distanceLabel}</span>
                        <span style={{ margin: '0 4px', color: '#d0d0d0' }}>·</span>
                        {dayjs(ev.startDate).format('MM/DD HH:mm')}
                        <Tag color={cat.color} style={{ marginLeft: 6, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                          {cat.label}
                        </Tag>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected date detail panel */}
        {selectedDate && (
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid #f0f0f0', padding: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <Title level={5} style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>
                  {selectedDate.format('M月D日')}
                </Title>
                <Text style={{ fontSize: 11, color: '#8b8b8b' }}>{selectedDate.format('ddd')}</Text>
              </div>
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openCreateModal(selectedDate)}>
                添加
              </Button>
            </div>

            {selectedDateEvents.length === 0 && selectedDateDeadlines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#b0b0b0' }}>
                <Text style={{ fontSize: 12, color: '#b0b0b0' }}>该日暂无日程</Text>
              </div>
            ) : (
              <>
                {selectedDateEvents.map(ev => {
                  const cat = CATEGORIES[ev.category] || CATEGORIES.EVENT;
                  const eventColor = ev.color || '#7c3aed';
                  const attendeeIds = parseAttendees(ev.attendees);
                  const attendeeNames = attendeeIds.map(id => userMap[id] || id).filter(Boolean);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => openEditModal(ev)}
                      style={{
                        padding: '8px 10px', borderRadius: 10, marginBottom: 6,
                        cursor: 'pointer', transition: 'all 0.15s',
                        borderLeft: `3px solid ${eventColor}`,
                        background: eventColor + '08',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = eventColor + '18'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = eventColor + '08'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 13, fontWeight: 600, flex: 1 }} ellipsis>{ev.title}</Text>
                        <Tag color={cat.color} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: '0 0 0 6px', flexShrink: 0 }}>
                          {cat.label}
                        </Tag>
                      </div>
                      <div style={{ fontSize: 11, color: '#8b8b8b', marginTop: 3 }}>
                        {ev.allDay ? '全天' : dayjs(ev.startDate).format('HH:mm') + ' - ' + dayjs(ev.endDate).format('HH:mm')}
                        {ev.location && <span> · <EnvironmentOutlined style={{ fontSize: 10 }} /> {ev.location}</span>}
                      </div>
                      {ev.description && (
                        <Text style={{ fontSize: 11, color: '#a0a0a0', display: 'block', marginTop: 2, lineHeight: '15px' }} ellipsis>
                          {ev.description}
                        </Text>
                      )}
                      {attendeeNames.length > 0 && (
                        <div style={{ fontSize: 10, color: '#a0a0a0', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <TeamOutlined style={{ fontSize: 10 }} />
                          {attendeeNames.join('、')}
                        </div>
                      )}
                    </div>
                  );
                })}

                {selectedDateDeadlines.length > 0 && (
                  <div style={{ marginTop: 2 }}>
                    <div style={{
                      fontSize: 11, color: '#f59e0b', fontWeight: 600,
                      padding: '4px 10px', marginBottom: 4,
                      background: '#fffbeb', borderRadius: 6,
                    }}>
                      🔔 {selectedDateDeadlines.length} 个任务截止
                    </div>
                    {selectedDateDeadlines.map(d => {
                      const dDiff = dayjs(d.dueDate).startOf('day').diff(dayjs().startOf('day'), 'day');
                      const dOverdue = dDiff < 0;
                      const dSoon = dDiff <= 2 && dDiff >= 0;
                      const dColor = dOverdue ? '#ef4444' : dSoon ? '#f59e0b' : '#10b981';
                      const dLabel = dOverdue ? `逾期${Math.abs(dDiff)}天` : dSoon ? (dDiff === 0 ? '今天截止' : dDiff === 1 ? '明天截止' : `${dDiff}天后截止`) : `${dDiff}天后截止`;
                      const assigneeNames = d.assignees?.map(a => a.user.name) || [];
                      return (
                        <div
                          key={d.id}
                          style={{
                            padding: '6px 10px', borderRadius: 8, marginBottom: 4,
                            borderLeft: `3px solid ${dColor}`,
                            background: dColor + '0a',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Text style={{ fontSize: 12, fontWeight: 600, flex: 1 }} ellipsis>{d.title}</Text>
                          </div>
                          <div style={{ fontSize: 10, color: '#8b8b8b', marginTop: 2 }}>
                            <span style={{ color: dColor, fontWeight: 500 }}>{dLabel}</span>
                            <span style={{ margin: '0 4px', color: '#d0d0d0' }}>·</span>
                            {dayjs(d.dueDate).format('MM/DD')}
                            {d.project && <span> · {d.project.name}</span>}
                          </div>
                          {assigneeNames.length > 0 && (
                            <div style={{ fontSize: 10, color: '#a0a0a0', marginTop: 2 }}>
                              <TeamOutlined style={{ fontSize: 10, marginRight: 3 }} />
                              {assigneeNames.join('、')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Event form modal (same as before) */}
      <Modal
        title={editingEvent ? '编辑日程' : '新建日程'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
          setEditingEvent(null);
        }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={560}
        destroyOnHidden
        footer={[
          <div key="footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {editingEvent && (
                <Popconfirm
                  title="确定删除此日程？"
                  onConfirm={handleDelete}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger type="text" loading={deleteMutation.isPending}>删除日程</Button>
                </Popconfirm>
              )}
            </div>
            <Space>
              <Button onClick={() => { setModalOpen(false); form.resetFields(); setEditingEvent(null); }}>取消</Button>
              <Button type="primary" onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
                {editingEvent ? '保存' : '创建'}
              </Button>
            </Space>
          </div>,
        ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入日程标题' }]}>
            <Input placeholder="日程标题" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="详细描述（可选）" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="allDay" label="全天" valuePropName="checked" style={{ flexShrink: 0 }}>
              <Switch />
            </Form.Item>
            <Form.Item name="startDate" label="开始时间" rules={[{ required: true, message: '请选择' }]} style={{ flex: 1 }}>
              <DatePicker
                showTime={!allDayValue}
                format={allDayValue ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm'}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item name="endDate" label="结束时间" rules={[{ required: true, message: '请选择' }]} style={{ flex: 1 }}>
              <DatePicker
                showTime={!allDayValue}
                format={allDayValue ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm'}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="category" label="分类" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={categoryOptions} />
            </Form.Item>
            <Form.Item name="color" label="颜色" style={{ flex: 1.5 }}>
              <ColorPicker />
            </Form.Item>
          </div>

          <Form.Item name="location" label="地点">
            <Input placeholder="地点（可选）" prefix={<EnvironmentOutlined style={{ color: '#b0b0b0' }} />} />
          </Form.Item>

          <Form.Item name="attendees" label="参与人">
            <Select
              mode="multiple"
              placeholder="选择参与人（可选）"
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={userOptions}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <Form.Item
              name="reminder"
              label="日程提醒"
              valuePropName="checked"
              style={{ flexShrink: 0 }}
              tooltip="开启后将在指定时间发送系统通知"
            >
              <Switch onChange={(checked) => { if (!checked) form.resetFields(['reminderAt']); }} />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.reminder !== cur.reminder}>
              {({ getFieldValue }) => {
                const reminder = getFieldValue('reminder');
                if (!reminder) return null;
                return (
                  <Form.Item name="reminderAt" label="通知时间" style={{ flex: 1 }} extra="指定发送提醒通知的时间">
                    <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} placeholder="选择提醒时间" />
                  </Form.Item>
                );
              }}
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
