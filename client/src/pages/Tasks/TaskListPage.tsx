import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker,
  Card, Typography, App, Popover, Divider,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EyeOutlined, ProjectOutlined, DownOutlined,
  UnorderedListOutlined, ApartmentOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { taskApi, userApi, projectApi } from '../../api';
import dayjs from 'dayjs';

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  TODO:        { label: '待处理',  color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  IN_PROGRESS: { label: '进行中',  color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  REVIEW:      { label: '审核中',  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  DONE:        { label: '已完成',  color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  CANCELLED:   { label: '已取消',  color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
};

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  LOW:    { label: '低',   color: '#6b7280', bg: '#f9fafb' },
  MEDIUM: { label: '中',   color: '#3b82f6', bg: '#eff6ff' },
  HIGH:   { label: '高',   color: '#f59e0b', bg: '#fffbeb' },
  URGENT: { label: '紧急', color: '#ef4444', bg: '#fef2f2' },
};

function deadlineDays(dueDate: string) {
  const now = dayjs().startOf('day');
  const due = dayjs(dueDate).startOf('day');
  const diff = due.diff(now, 'day');
  if (diff < 0) return { text: `已逾期 ${Math.abs(diff)} 天`, color: '#ef4444', bg: '#fef2f2' };
  if (diff === 0) return { text: '今天截止', color: '#f59e0b', bg: '#fffbeb' };
  if (diff === 1) return { text: '明天截止', color: '#f59e0b', bg: '#fffbeb' };
  if (diff <= 3) return { text: `还有 ${diff} 天`, color: '#f59e0b', bg: '#fffbeb' };
  return { text: `还有 ${diff} 天`, color: '#10b981', bg: '#ecfdf5' };
}

export default function TaskListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const taskType = location.pathname.startsWith('/project-tasks') ? 'project' : 'regular';
  const [form] = Form.useForm();
  const [statusPopoverId, setStatusPopoverId] = useState<string | null>(null);
  const isProjectTask = taskType === 'project';

  const queryParams = { ...filters, taskType };

  const { data: tasksResp, isLoading } = useQuery({
    queryKey: ['tasks', queryParams],
    queryFn: () => taskApi.list(queryParams).then((r) => r.data),
  });

  const { data: usersResp } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.list({ pageSize: '100' }).then((r) => r.data),
  });

  const { data: projectsResp } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list().then((r) => r.data),
    enabled: isProjectTask,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => taskApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); message.success('任务创建成功'); setModalOpen(false); form.resetFields(); setNewProjectName(''); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => taskApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); message.success('已更新'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taskApi.remove(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); message.success('任务已删除'); },
  });

  const [newProjectName, setNewProjectName] = useState('');
  const createProjectMutation = useMutation({
    mutationFn: (name: string) => projectApi.create({ name }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      form.setFieldValue('projectId', res.data?.id || res.id);
      setNewProjectName('');
      message.success('项目已创建');
    },
  });

  const columns = useMemo(() => {
    const cols: any[] = [
      {
        title: '标题', dataIndex: 'title', key: 'title',
        render: (v: string, r: any) => (
        <a onClick={() => navigate(`/tasks/${r.id}`)} style={{ fontWeight: 500, color: '#1e1b4b' }}>
          {v}
        </a>
      ),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 120,
      render: (v: string, r: any) => {
        const cfg = statusConfig[v] || statusConfig.TODO;
        return (
          <Popover
            open={statusPopoverId === r.id}
            onOpenChange={(open) => setStatusPopoverId(open ? r.id : null)}
            trigger="click"
            placement="bottomLeft"
            overlayStyle={{ width: 160 }}
            content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {Object.entries(statusConfig).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => {
                      updateMutation.mutate({ id: r.id, data: { status: key } });
                      setStatusPopoverId(null);
                    }}
                    style={{
                      border: 'none', cursor: 'pointer', borderRadius: 8,
                      padding: '8px 12px', fontSize: 13, fontWeight: key === v ? 600 : 400,
                      textAlign: 'left', width: '100%',
                      background: key === v ? val.bg : 'transparent',
                      color: val.color, display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (key !== v) e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={(e) => { if (key !== v) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: val.color, flexShrink: 0 }} />
                    {val.label}
                    {key === v && <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>✓</span>}
                  </button>
                ))}
              </div>
            }
          >
            <Tag style={{
              cursor: 'pointer', borderRadius: 8, padding: '2px 10px',
              fontWeight: 500, fontSize: 12,
              background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              transition: 'all 0.15s',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
              {cfg.label}
              <DownOutlined style={{ fontSize: 9, opacity: 0.5 }} />
            </Tag>
          </Popover>
        );
      },
    },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority', width: 80,
      render: (v: string) => {
        const p = priorityConfig[v] || priorityConfig.MEDIUM;
        return (
          <Tag style={{
            borderRadius: 6, fontWeight: 500, fontSize: 11,
            color: p.color, background: p.bg, border: 'none',
          }}>
            {p.label}
          </Tag>
        );
      },
    },
    {
      title: '负责人', key: 'assignees', width: 130,
      render: (_: any, r: any) => {
        const names = r.assignees?.map((a: any) => a.user.name) || [];
        return names.length > 0 ? (
          <span style={{ fontSize: 12, color: '#4b5563' }}>{names.join(', ')}</span>
        ) : (
          <span style={{ fontSize: 12, color: '#d1d5db' }}>-</span>
        );
      },
    },
    {
      title: '截止日期', dataIndex: 'dueDate', key: 'dueDate', width: 170,
      render: (v: string) => {
        if (!v) return <span style={{ color: '#d1d5db', fontSize: 12 }}>-</span>;
        const d = deadlineDays(v);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 12, color: '#1e1b4b', whiteSpace: 'nowrap' }}>
              {dayjs(v).format('YYYY/MM/DD HH:mm')}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '1px 6px',
              borderRadius: 4, color: d.color, background: d.bg,
              whiteSpace: 'nowrap', width: 'fit-content',
            }}>
              {d.text}
            </span>
          </div>
        );
      },
    },
  ];
  if (isProjectTask) {
      cols.push({
        title: '项目', key: 'project', width: 100,
        render: (_: any, r: any) => (
          r.project ? (
            <Tag style={{ borderRadius: 6, fontSize: 11, margin: 0 }} color={r.project.color || 'blue'}>
              {r.project.name}
            </Tag>
          ) : <span style={{ fontSize: 12, color: '#d1d5db' }}>-</span>
        ),
      });
    }
    cols.push({
      title: '创建人', key: 'creator', width: 85,
      render: (_: any, r: any) => (
        <span style={{ fontSize: 12, color: '#6b7280' }}>{r.creator?.name}</span>
      ),
    });
    cols.push({
      title: '操作', key: 'actions', width: 100,
      render: (_: any, r: any) => (
        <Space size={2}>
          <Button size="small" type="text" icon={<EyeOutlined />}
            onClick={() => navigate(`/tasks/${r.id}`)}
            style={{ borderRadius: 8, color: '#7c3aed' }} />
          <Button size="small" type="text" danger icon={<DeleteOutlined />}
            onClick={() => deleteMutation.mutate(r.id)}
            style={{ borderRadius: 8 }} />
        </Space>
      ),
    });
    return cols;
  }, [isProjectTask, statusPopoverId, navigate]);

  return (
    <div>
      <style>{`
        .task-list-table .ant-table-thead > tr > th {
          background: #faf5ff !important; font-weight: 600 !important;
          font-size: 11px !important; text-transform: uppercase;
          letter-spacing: 0.3px; color: #6b7280 !important;
          padding: 10px 14px !important; border-bottom: 2px solid #f3f4f6 !important;
        }
        .task-list-table .ant-table-tbody > tr > td {
          padding: 12px 14px !important; border-bottom: 1px solid #f9fafb !important;
          transition: background 0.15s;
        }
        .task-list-table .ant-table-tbody > tr:hover > td {
          background: #faf5ff !important;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            {isProjectTask ? '项目制任务' : '常规任务'}
          </span>
        </div>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setModalOpen(true)}
          style={{ borderRadius: 10, height: 38, fontWeight: 500 }}>
          {isProjectTask ? '新建项目任务' : '新建常规任务'}
        </Button>
      </div>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 12, border: '1px solid rgba(0,0,0,0.04)' }}>
        <Space wrap>
          <Select placeholder="状态" allowClear style={{ width: 120 }} onChange={(v) => setFilters((f: any) => ({ ...f, status: v }))}>
            {Object.entries(statusConfig).map(([k, val]) => <Select.Option key={k} value={k}>{val.label}</Select.Option>)}
          </Select>
          <Select placeholder="优先级" allowClear style={{ width: 120 }} onChange={(v) => setFilters((f: any) => ({ ...f, priority: v }))}>
            {Object.entries(priorityConfig).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}
          </Select>
        </Space>
      </Card>

      <Table
        className="task-list-table"
        dataSource={tasksResp?.data}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        style={{ borderRadius: 12, overflow: 'hidden' }}
        pagination={{
          total: tasksResp?.total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
        }}
        onChange={(p) => setFilters((f: any) => ({ ...f, page: p.current, pageSize: p.pageSize }))}
      />

      <Modal title={isProjectTask ? '新建项目任务' : '新建常规任务'} open={modalOpen} onCancel={() => { setModalOpen(false); setNewProjectName(''); form.resetFields(); }} onOk={() => form.submit()} confirmLoading={createMutation.isPending} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={(v) => {
          if (!isProjectTask) delete v.projectId;
          createMutation.mutate(v);
        }}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input style={{ borderRadius: 8 }} /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} style={{ borderRadius: 8 }} /></Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="MEDIUM">
            <Select style={{ borderRadius: 8 }}>
              {Object.entries(priorityConfig).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="dueDate" label="截止日期"><DatePicker style={{ borderRadius: 8 }} /></Form.Item>
          <Form.Item name="assigneeIds" label="负责人">
            <Select mode="multiple" placeholder="选择负责人" style={{ borderRadius: 8 }}>
              {usersResp?.data?.map((u: any) => <Select.Option key={u.id} value={u.id}>{u.name}</Select.Option>)}
            </Select>
          </Form.Item>
          {isProjectTask && (
            <Form.Item name="projectId" label="所属项目" rules={[{ required: true, message: '请选择项目' }]}>
              <Select
                placeholder="选择或输入新项目名称"
                showSearch
                optionFilterProp="children"
                style={{ borderRadius: 8 }}
                notFoundContent={
                  <div style={{ padding: 8, textAlign: 'center' }}>
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>暂无项目，请在下方创建</span>
                  </div>
                }
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ padding: '4px 8px 8px', display: 'flex', gap: 8 }}>
                      <Input
                        size="small"
                        placeholder="输入新项目名称"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newProjectName.trim()) {
                            e.preventDefault();
                            createProjectMutation.mutate(newProjectName.trim());
                          }
                        }}
                        style={{ borderRadius: 6 }}
                      />
                      <Button
                        size="small"
                        type="primary"
                        loading={createProjectMutation.isPending}
                        disabled={!newProjectName.trim()}
                        onClick={() => createProjectMutation.mutate(newProjectName.trim())}
                        style={{ borderRadius: 6, flexShrink: 0 }}
                      >
                        创建
                      </Button>
                    </div>
                  </>
                )}
              >
                {projectsResp?.map((p: any) => (
                  <Select.Option key={p.id} value={p.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: 2,
                        background: p.color || '#7c3aed',
                        flexShrink: 0,
                      }} />
                      {p.name}
                      <span style={{ color: '#9ca3af', fontSize: 11 }}>
                        ({p._count?.tasks || 0} 个任务)
                      </span>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
