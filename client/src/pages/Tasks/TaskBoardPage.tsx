import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, Spin, Empty, App, Avatar, Tooltip, Badge } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ClockCircleOutlined,
  UnorderedListOutlined, ApartmentOutlined,
} from '@ant-design/icons';
import { taskApi } from '../../api';
import dayjs from 'dayjs';

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  LOW:    { label: '低',   color: '#6b7280', bg: '#f9fafb' },
  MEDIUM: { label: '中',   color: '#3b82f6', bg: '#eff6ff' },
  HIGH:   { label: '高',   color: '#f59e0b', bg: '#fffbeb' },
  URGENT: { label: '紧急', color: '#ef4444', bg: '#fef2f2' },
};


const priorityBorder: Record<string, string> = {
  LOW: '#d1d5db', MEDIUM: '#93c5fd', HIGH: '#fcd34d', URGENT: '#fca5a5',
};

const columns = [
  {
    key: 'TODO', label: '待处理', icon: '📥',
    accent: '#6b7280', accentBg: '#f9fafb', accentBorder: '#e5e7eb',
    dotColor: '#9ca3af', gradient: 'linear-gradient(180deg, #f9fafb, #f3f4f6)',
  },
  {
    key: 'IN_PROGRESS', label: '进行中', icon: '🚀',
    accent: '#7c3aed', accentBg: '#f5f3ff', accentBorder: '#ddd6fe',
    dotColor: '#7c3aed', gradient: 'linear-gradient(180deg, #faf5ff, #f5f3ff)',
  },
  {
    key: 'REVIEW', label: '审核中', icon: '🔍',
    accent: '#d97706', accentBg: '#fffbeb', accentBorder: '#fde68a',
    dotColor: '#f59e0b', gradient: 'linear-gradient(180deg, #fffbeb, #fef3c7)',
  },
  {
    key: 'DONE', label: '已完成', icon: '✅',
    accent: '#059669', accentBg: '#ecfdf5', accentBorder: '#a7f3d0',
    dotColor: '#10b981', gradient: 'linear-gradient(180deg, #ecfdf5, #d1fae5)',
  },
];

export default function TaskBoardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const taskType = location.pathname.startsWith('/project-tasks') ? 'project' : 'regular';
  const isProjectTask = taskType === 'project';

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'board', taskType],
    queryFn: () => taskApi.list({ pageSize: '200', taskType }).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => taskApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      message.success('已更新');
    },
  });

  const getTasksByStatus = (status: string) =>
    (data?.data || []).filter((t: any) => t.status === status);

  const handleDrop = (targetStatus: string) => {
    if (draggedTaskId) {
      updateMutation.mutate({ id: draggedTaskId, status: targetStatus });
    }
    setDraggedTaskId(null);
    setDragOverCol(null);
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', marginTop: 100 }} />;

  return (
    <div>
      <style>{`
        .kb-board-col {
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        .kb-board-card {
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
          cursor: pointer;
          position: relative;
        }
        .kb-board-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
        }
        .kb-board-card:active {
          transform: scale(0.98);
        }
        .kb-board-card.dragging {
          opacity: 0.5;
          transform: rotate(2deg);
        }
        .kb-board-col.drag-over {
          background: #faf5ff !important;
          border-color: #c4b5fd !important;
          box-shadow: inset 0 0 0 2px rgba(124,58,237,0.1);
        }
        @keyframes kb-card-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .kb-board-card { animation: kb-card-in 0.3s ease forwards; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: isProjectTask
            ? 'linear-gradient(135deg, #f97316, #fb923c)'
            : 'linear-gradient(135deg, #7c3aed, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isProjectTask
            ? '0 4px 12px rgba(249,115,22,0.3)'
            : '0 4px 12px rgba(124,58,237,0.3)',
        }}>
          {isProjectTask
            ? <ApartmentOutlined style={{ fontSize: 18, color: '#fff' }} />
            : <UnorderedListOutlined style={{ fontSize: 18, color: '#fff' }} />
          }
        </div>
        <span style={{ fontSize: 18, fontWeight: 700 }}>
          {isProjectTask ? '项目制任务看板' : '常规任务看板'}
        </span>
      </div>

      {/* Board columns */}
      <div style={{
        display: 'flex', gap: 16, overflowX: 'auto', minHeight: 'calc(100vh - 260px)',
        paddingBottom: 8,
      }}>
        {columns.map((col) => {
          const tasks = getTasksByStatus(col.key);
          const totalTasks = tasks.length;
          const isDragOver = dragOverCol === col.key;

          return (
            <div
              key={col.key}
              className={`kb-board-col ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverCol(col.key);
              }}
              onDragLeave={(e) => {
                // Only set to null if leaving the column (not entering a child)
                if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
                setDragOverCol(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(col.key);
              }}
              style={{
                flex: 1, minWidth: 256, maxWidth: 320,
                background: isDragOver ? '#faf5ff' : col.gradient,
                borderRadius: 18, padding: 14,
                border: isDragOver ? `2px dashed ${col.accent}` : `1px solid ${col.accentBorder}`,
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 14, padding: '6px 8px',
                borderRadius: 10, background: col.accentBg,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: col.dotColor, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>
                    {col.label}
                  </span>
                </div>
                <Badge
                  count={totalTasks}
                  style={{
                    backgroundColor: col.accent,
                    boxShadow: `0 2px 6px ${col.accent}40`,
                  }}
                />
              </div>

              {/* Column body */}
              <div style={{
                flex: 1, overflowY: 'auto', overflowX: 'hidden',
                display: 'flex', flexDirection: 'column', gap: 10,
                minHeight: 60,
              }}>
                {tasks.length === 0 ? (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 100,
                  }}>
                    <Empty
                      description={<span style={{ fontSize: 12, color: '#d1d5db' }}>拖拽任务到此处</span>}
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ margin: 0 }}
                    />
                  </div>
                ) : (
                  tasks.map((task: any, idx: number) => {
                    const pCfg = priorityConfig[task.priority] || priorityConfig.MEDIUM;
                    const isDragging = draggedTaskId === task.id;
                    const diffDays = task.dueDate ? dayjs(task.dueDate).startOf('day').diff(dayjs().startOf('day'), 'day') : null;
                    const deadlineLabel = diffDays === null ? null : diffDays < 0 ? `已逾期${Math.abs(diffDays)}天` : diffDays === 0 ? '今天截止' : diffDays === 1 ? '明天截止' : `还有${diffDays}天`;
                    const deadlineColor = diffDays === null ? undefined : diffDays < 0 ? '#ef4444' : diffDays <= 1 ? '#f59e0b' : '#10b981';
                    const isOverdue = diffDays !== null && diffDays < 0;
                    const assignees = task.assignees || [];

                    return (
                      <div
                        key={task.id}
                        className={`kb-board-card ${isDragging ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('taskId', task.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedTaskId(task.id);
                        }}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDragOverCol(null);
                        }}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        style={{
                          background: '#fff',
                          borderRadius: 14,
                          border: `1px solid rgba(0,0,0,0.05)`,
                          borderLeft: `3px solid ${priorityBorder[task.priority] || '#d1d5db'}`,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          animationDelay: `${idx * 0.03}s`,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Card body */}
                        <div style={{ padding: '12px 14px' }}>
                          {/* Title */}
                          <div style={{
                            fontWeight: 600, fontSize: 13, lineHeight: 1.5,
                            color: '#1e1b4b', marginBottom: 10,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {task.title}
                          </div>

                          {/* Meta row */}
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            flexWrap: 'wrap', gap: 6,
                          }}>
                            {/* Priority + due date */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: '1px 8px',
                                borderRadius: 4, color: pCfg.color, background: pCfg.bg,
                                display: 'flex', alignItems: 'center', gap: 3,
                              }}>
                                {pCfg.label}
                              </span>
                              {task.dueDate && deadlineLabel && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  <span style={{ fontSize: 9, color: '#6b7280' }}>
                                    {dayjs(task.dueDate).format('YYYY/MM/DD HH:mm')}
                                  </span>
                                  <span style={{
                                    fontSize: 10, fontWeight: isOverdue ? 600 : 400,
                                    color: deadlineColor,
                                    display: 'flex', alignItems: 'center', gap: 3,
                                  }}>
                                    <ClockCircleOutlined style={{ fontSize: 10 }} />
                                    {deadlineLabel}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Assignee avatars */}
                            {assignees.length > 0 && (
                              <Avatar.Group
                                maxCount={3}
                                size={20}
                                maxStyle={{
                                  color: '#7c3aed',
                                  backgroundColor: '#f5f3ff',
                                  fontSize: 10,
                                  cursor: 'pointer',
                                }}
                              >
                                {assignees.map((a: any) => (
                                  <Tooltip key={a.id} title={a.user.name}>
                                    <Avatar
                                      src={a.user.avatar}
                                      style={{
                                        backgroundColor: '#7c3aed',
                                        fontSize: 10,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {a.user.name?.charAt(0)}
                                    </Avatar>
                                  </Tooltip>
                                ))}
                              </Avatar.Group>
                            )}
                          </div>

                          {/* Tags */}
                          {task.tags && (
                            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {task.tags.split(',').filter(Boolean).slice(0, 2).map((t: string) => (
                                <span key={t} style={{
                                  fontSize: 10, color: '#9ca3af',
                                  background: '#f9fafb', borderRadius: 4,
                                  padding: '1px 6px',
                                }}>
                                  {t.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
