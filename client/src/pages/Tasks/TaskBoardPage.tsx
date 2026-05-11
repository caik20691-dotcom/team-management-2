import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spin, App } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { UnorderedListOutlined, ApartmentOutlined } from '@ant-design/icons';
import { taskApi } from '../../api';
import { useKanbanBoard } from '../../hooks/useKanbanBoard';
import KanbanBoardView from '../../components/Tasks/KanbanBoardView';

export default function TaskBoardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const taskType = location.pathname.startsWith('/project-tasks') ? 'project' : 'regular';
  const isProjectTask = taskType === 'project';

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'board', taskType],
    queryFn: () => taskApi.list({ pageSize: '200', taskType }).then((r: any) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => taskApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      message.success('已更新');
    },
  });

  const tasks: any[] = data?.data || [];

  const { draggedTaskId, setDraggedTaskId, dragOverCol, setDragOverCol, getTasksByStatus, handleDrop } =
    useKanbanBoard({ tasks, onUpdateStatus: (id, st) => updateMutation.mutate({ id, status: st }) });

  if (isLoading) return <Spin size="large" style={{ display: 'block', marginTop: 100 }} />;

  return (
    <KanbanBoardView
      getTasksByStatus={getTasksByStatus}
      draggedTaskId={draggedTaskId}
      dragOverCol={dragOverCol}
      onDragStart={setDraggedTaskId}
      onDragOver={setDragOverCol}
      onDragLeave={(e) => {
        if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
        setDragOverCol(null);
      }}
      onDrop={handleDrop}
      onCardClick={(taskId) => navigate(`/tasks/${taskId}`)}
      header={
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
      }
    />
  );
}
