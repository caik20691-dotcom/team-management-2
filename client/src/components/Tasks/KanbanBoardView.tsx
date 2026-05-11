import { Avatar, Badge, Empty, Tooltip } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { KANBAN_COLUMNS, PRIORITY_CONFIG, PRIORITY_BORDER } from '../../hooks/useKanbanBoard';

interface KanbanBoardViewProps {
  columns?: typeof KANBAN_COLUMNS;
  getTasksByStatus: (status: string) => any[];
  draggedTaskId: string | null;
  dragOverCol: string | null;
  onDragStart: (taskId: string) => void;
  onDragOver: (colKey: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (colKey: string) => void;
  onCardClick: (taskId: string) => void;
  loading?: boolean;
  emptyText?: string;
  compact?: boolean;
  header?: React.ReactNode;
}

export default function KanbanBoardView({
  columns = KANBAN_COLUMNS,
  getTasksByStatus,
  draggedTaskId, dragOverCol,
  onDragStart, onDragOver, onDragLeave, onDrop,
  onCardClick,
  emptyText = '暂无任务',
  compact = false,
  header,
}: KanbanBoardViewProps) {
  const cw = compact ? 220 : 256;
  const mw = compact ? 280 : 320;

  return (
    <div>
      <style>{`
        .kb-board-col { transition: all 0.2s cubic-bezier(0.4,0,0.2,1); }
        .kb-board-card { transition: all 0.22s cubic-bezier(0.4,0,0.2,1); cursor: pointer; position: relative; }
        .kb-board-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important; }
        .kb-board-card:active { transform: scale(0.98); }
        .kb-board-card.dragging { opacity: 0.5; transform: rotate(2deg); }
        .kb-board-col.drag-over { background: #faf5ff !important; border-color: #c4b5fd !important; box-shadow: inset 0 0 0 2px rgba(124,58,237,0.1); }
        @keyframes kb-card-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .kb-board-card { animation: kb-card-in 0.3s ease forwards; }
      `}</style>

      {header}

      <div style={{
        display: 'flex', gap: compact ? 10 : 16,
        overflowX: 'auto', overflowY: 'hidden',
        minHeight: compact ? 260 : 'calc(100vh - 260px)',
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
                onDragOver(col.key);
              }}
              onDragLeave={onDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(col.key);
              }}
              style={{
                flex: 1, minWidth: cw, maxWidth: mw,
                background: isDragOver ? '#faf5ff' : col.gradient,
                borderRadius: compact ? 14 : 18,
                padding: compact ? 10 : 14,
                border: isDragOver ? `2px dashed ${col.accent}` : `1px solid ${col.accentBorder}`,
                display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: compact ? 10 : 14,
                padding: compact ? '4px 6px' : '6px 8px',
                borderRadius: 10, background: col.accentBg,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: compact ? 8 : 10, height: compact ? 8 : 10,
                    borderRadius: '50%', background: col.dotColor, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: compact ? 12 : 14, fontWeight: 700, color: '#1e1b4b',
                  }}>
                    {col.label}
                  </span>
                </div>
                <Badge
                  count={totalTasks}
                  style={{
                    backgroundColor: col.accent,
                    boxShadow: `0 2px 6px ${col.accent}40`,
                    fontSize: compact ? 10 : 12,
                  }}
                />
              </div>

              <div style={{
                flex: 1, overflowY: 'auto', overflowX: 'hidden',
                display: 'flex', flexDirection: 'column', gap: compact ? 6 : 10,
                minHeight: 40,
              }}>
                {tasks.length === 0 ? (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: compact ? 60 : 100,
                  }}>
                    <Empty
                      description={<span style={{ fontSize: compact ? 10 : 12, color: '#d1d5db' }}>{emptyText}</span>}
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ margin: 0 }}
                    />
                  </div>
                ) : (
                  tasks.map((task: any, idx: number) => {
                    const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
                    const isDragging = draggedTaskId === task.id;
                    const isTerminal = task.status === 'DONE' || task.status === 'CANCELLED';
                    const diffDays = task.dueDate ? dayjs(task.dueDate).startOf('day').diff(dayjs().startOf('day'), 'day') : null;
                    const deadlineLabel = (diffDays === null || isTerminal) ? null
                      : diffDays < 0 ? `已逾期${Math.abs(diffDays)}天`
                      : diffDays === 0 ? '今天截止'
                      : diffDays === 1 ? '明天截止'
                      : `还有${diffDays}天`;
                    const deadlineColor = (diffDays === null || isTerminal) ? undefined
                      : diffDays < 0 ? '#ef4444'
                      : diffDays <= 1 ? '#f59e0b'
                      : '#10b981';
                    const isOverdue = !isTerminal && diffDays !== null && diffDays < 0;
                    const assignees = task.assignees || [];

                    return (
                      <div
                        key={task.id}
                        className={`kb-board-card ${isDragging ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('taskId', task.id);
                          e.dataTransfer.effectAllowed = 'move';
                          onDragStart(task.id);
                        }}
                        onDragEnd={() => {
                          onDragStart('');
                          onDragOver('');
                        }}
                        onClick={() => onCardClick(task.id)}
                        style={{
                          background: '#fff',
                          borderRadius: compact ? 10 : 14,
                          border: '1px solid rgba(0,0,0,0.05)',
                          borderLeft: `3px solid ${PRIORITY_BORDER[task.priority] || '#d1d5db'}`,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          animationDelay: `${idx * 0.03}s`,
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ padding: compact ? '8px 10px' : '12px 14px' }}>
                          <div style={{
                            fontWeight: 600, fontSize: compact ? 12 : 13, lineHeight: 1.5,
                            color: '#1e1b4b', marginBottom: compact ? 6 : 10,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {task.title}
                          </div>

                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            flexWrap: 'wrap', gap: compact ? 4 : 6,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 4 : 6 }}>
                              <span style={{
                                fontSize: compact ? 9 : 10, fontWeight: 600,
                                padding: compact ? '1px 6px' : '1px 8px',
                                borderRadius: 4, color: pCfg.color, background: pCfg.bg,
                              }}>
                                {pCfg.label}
                              </span>
                              {task.dueDate && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  {!compact && (
                                    <span style={{ fontSize: 9, color: '#6b7280' }}>
                                      {dayjs(task.dueDate).format('YYYY/MM/DD HH:mm')}
                                    </span>
                                  )}
                                  {deadlineLabel && (
                                    <span style={{
                                      fontSize: compact ? 9 : 10,
                                      fontWeight: isOverdue ? 600 : 400,
                                      color: deadlineColor,
                                      display: 'flex', alignItems: 'center', gap: 3,
                                    }}>
                                      <ClockCircleOutlined style={{ fontSize: compact ? 8 : 10 }} />
                                      {deadlineLabel}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {!compact && assignees.length > 0 && (
                              <Avatar.Group maxCount={3} size={20}
                                maxStyle={{ color: '#7c3aed', backgroundColor: '#f5f3ff', fontSize: 10, cursor: 'pointer' }}
                              >
                                {assignees.map((a: any) => (
                                  <Tooltip key={a.id} title={a.user.name}>
                                    <Avatar src={a.user.avatar} style={{ backgroundColor: '#7c3aed', fontSize: 10, cursor: 'pointer' }}>
                                      {a.user.name?.charAt(0)}
                                    </Avatar>
                                  </Tooltip>
                                ))}
                              </Avatar.Group>
                            )}
                          </div>

                          {!compact && task.tags && (
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
