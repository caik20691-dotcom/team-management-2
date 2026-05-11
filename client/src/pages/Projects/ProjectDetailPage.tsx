import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Typography, Tag, Empty, Spin, App, Row, Col,
  Avatar, Tooltip, Button, Modal, Form, Input, Select, DatePicker,
  Space, Popconfirm, Progress, Divider, Table, Breadcrumb,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined,
  UserOutlined, CalendarOutlined, TeamOutlined,
  ClockCircleOutlined, PlusOutlined, ApartmentOutlined,
  SettingOutlined, RightOutlined, DownOutlined,
} from '@ant-design/icons';
import { projectApi, taskApi, userApi } from '../../api';
import SubtaskBoard from '../../components/Tasks/SubtaskBoard';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  LOW:    { label: '低',   color: '#6b7280', bg: '#f9fafb' },
  MEDIUM: { label: '中',   color: '#3b82f6', bg: '#eff6ff' },
  HIGH:   { label: '高',   color: '#f59e0b', bg: '#fffbeb' },
  URGENT: { label: '紧急', color: '#ef4444', bg: '#fef2f2' },
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  TODO:        { label: '待处理',  color: '#6b7280', bg: '#f9fafb' },
  IN_PROGRESS: { label: '进行中',  color: '#7c3aed', bg: '#f5f3ff' },
  REVIEW:      { label: '审核中',  color: '#d97706', bg: '#fffbeb' },
  DONE:        { label: '已完成',  color: '#059669', bg: '#ecfdf5' },
  CANCELLED:   { label: '已取消',  color: '#9ca3af', bg: '#f9fafb' },
};

const projectStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:    { label: '进行中', color: '#7c3aed', bg: '#f5f3ff' },
  COMPLETED: { label: '已完成', color: '#059669', bg: '#ecfdf5' },
  ON_HOLD:   { label: '已暂停', color: '#f59e0b', bg: '#fffbeb' },
  CANCELLED: { label: '已取消', color: '#9ca3af', bg: '#f9fafb' },
};

const projectColors = [
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#f97316',
  '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm] = Form.useForm();
  const [projectForm] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: usersResp } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.list({ pageSize: '100' }).then((r) => r.data),
  });
  const users: any[] = usersResp?.data || usersResp || [];

  const tasks: any[] = project?.tasks || [];
  const color = project?.color || '#7c3aed';

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.status === 'DONE').length;
    const inProgress = tasks.filter((t: any) => t.status === 'IN_PROGRESS').length;
    const overdue = tasks.filter((t: any) => {
      if (!t.dueDate) return false;
      if (['DONE', 'CANCELLED'].includes(t.status)) return false;
      return dayjs(t.dueDate).isBefore(dayjs(), 'day');
    }).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, overdue, rate };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t: any) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter]);

  const updateProjectMutation = useMutation({
    mutationFn: (data: any) => projectApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('项目已更新');
      setEditModalOpen(false);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => projectApi.remove(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('项目已删除');
      navigate('/projects/board', { replace: true });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => taskApi.create({ ...data, projectId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      message.success('任务已创建');
      setTaskModalOpen(false);
      taskForm.resetFields();
    },
  });

  const openEditModal = () => {
    projectForm.setFieldsValue({
      name: project.name,
      description: project.description,
      status: project.status || 'ACTIVE',
      color: project.color,
      startDate: project.startDate ? dayjs(project.startDate) : null,
      endDate: project.endDate ? dayjs(project.endDate) : null,
      memberIds: project.members?.map((m: any) => m.userId) || [],
      ownerId: project.ownerId,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = (values: any) => {
    const data: any = { ...values };
    data.startDate = values.startDate?.toISOString?.() ?? null;
    data.endDate = values.endDate?.toISOString?.() ?? null;
    updateProjectMutation.mutate(data);
  };

  const handleCreateTask = (values: any) => {
    createTaskMutation.mutate({
      title: values.title,
      status: values.status || 'TODO',
      priority: values.priority || 'MEDIUM',
      dueDate: values.dueDate?.toISOString?.() ?? null,
      assigneeIds: values.assigneeIds || [],
    });
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', marginTop: 100 }} />;
  if (!project) return <Empty description="项目不存在" style={{ marginTop: 100 }} />;

  const psCfg = projectStatusConfig[project.status] || projectStatusConfig.ACTIVE;

  const tableColumns = [
    {
      title: '标题', dataIndex: 'title', key: 'title',
      render: (text: string, record: any) => (
        <a onClick={() => navigate(`/tasks/${record.id}`)} style={{ fontWeight: 500, color: '#1e1b4b' }}>
          {text}
        </a>
      ),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => {
        const cfg = statusConfig[s] || statusConfig.TODO;
        return <Tag style={{ borderRadius: 6, color: cfg.color, background: cfg.bg, border: 'none' }}>{cfg.label}</Tag>;
      },
    },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority', width: 70,
      render: (p: string) => {
        const cfg = priorityConfig[p] || priorityConfig.MEDIUM;
        return <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 4 }}>{cfg.label}</span>;
      },
    },
    {
      title: '负责人', dataIndex: 'assignees', key: 'assignees', width: 100,
      render: (assignees: any[]) => {
        if (!assignees?.length) return <span style={{ color: '#d1d5db', fontSize: 12 }}>-</span>;
        return (
          <Avatar.Group maxCount={2} size={22}>
            {assignees.map((a: any) => (
              <Tooltip key={a.id} title={a.user?.name}>
                <Avatar src={a.user?.avatar} style={{ backgroundColor: '#7c3aed', fontSize: 10 }}>
                  {a.user?.name?.charAt(0)}
                </Avatar>
              </Tooltip>
            ))}
          </Avatar.Group>
        );
      },
    },
    {
      title: '截止日期', dataIndex: 'dueDate', key: 'dueDate', width: 120,
      render: (d: string, record: any) => {
        if (!d) return <span style={{ color: '#d1d5db', fontSize: 12 }}>-</span>;
        const diffDays = dayjs(d).startOf('day').diff(dayjs().startOf('day'), 'day');
        const dlColor = diffDays < 0 ? '#ef4444' : diffDays <= 1 ? '#f59e0b' : '#10b981';
        const dlText = diffDays < 0 ? `已逾期${Math.abs(diffDays)}天`
          : diffDays === 0 ? '今天截止'
          : diffDays === 1 ? '明天截止'
          : `还有${diffDays}天`;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 11, color: '#6b7280' }}>{dayjs(d).format('MM/DD HH:mm')}</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: dlColor }}>
              <ClockCircleOutlined style={{ fontSize: 9 }} /> {dlText}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <style>{`
        .pd-stat-card {
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.04);
          transition: all 0.2s;
        }
        .pd-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
        }
      `}</style>

      {/* Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/projects/board')}>项目管理</a> },
          { title: project.name },
        ]}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/projects/board')}
            style={{ borderRadius: 10 }} />
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ApartmentOutlined style={{ fontSize: 22, color }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={4} style={{ margin: 0 }}>{project.name}</Title>
              <Tag style={{
                borderRadius: 6, fontWeight: 500, fontSize: 11,
                color: psCfg.color, background: psCfg.bg, border: 'none',
              }}>
                {psCfg.label}
              </Tag>
            </div>
            {project.description && (
              <Text type="secondary" style={{ fontSize: 12 }}>{project.description}</Text>
            )}
          </div>
        </div>
        <Space>
          <Button icon={<CalendarOutlined />}
            onClick={() => navigate(`/calendar?projectId=${id}`)}
            style={{ borderRadius: 10 }}>
            查看日历
          </Button>
          <Button icon={<SettingOutlined />} onClick={openEditModal} style={{ borderRadius: 10 }}>
            编辑项目
          </Button>
          <Popconfirm title="删除项目及所有关联任务？此操作不可逆。" onConfirm={() => deleteProjectMutation.mutate()}>
            <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 10 }}>删除</Button>
          </Popconfirm>
        </Space>
      </div>

      {/* Stats cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={6}>
          <Card className="pd-stat-card" styles={{ body: { padding: '18px 20px' } }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>任务总数</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1e1b4b' }}>{stats.total}</div>
          </Card>
        </Col>
        <Col xs={6}>
          <Card className="pd-stat-card" styles={{ body: { padding: '18px 20px' } }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>完成率</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: stats.rate >= 70 ? '#059669' : stats.rate >= 30 ? '#f59e0b' : '#ef4444' }}>
              {stats.rate}%
            </div>
            <Progress percent={stats.rate} size="small" showInfo={false}
              strokeColor={stats.rate >= 70 ? '#10b981' : stats.rate >= 30 ? '#f59e0b' : '#ef4444'}
              style={{ marginTop: 4 }} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card className="pd-stat-card" styles={{ body: { padding: '18px 20px' } }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>进行中</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#7c3aed' }}>{stats.inProgress}</div>
          </Card>
        </Col>
        <Col xs={6}>
          <Card className="pd-stat-card" styles={{ body: { padding: '18px 20px' } }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>逾期任务</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: stats.overdue > 0 ? '#ef4444' : '#9ca3af' }}>
              {stats.overdue}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={20}>
        {/* Tasks table */}
        <Col xs={16}>
          <Card
            title={<span style={{ fontSize: 15, fontWeight: 600 }}>任务列表</span>}
            extra={
              <Button type="primary" icon={<PlusOutlined />} size="small"
                onClick={() => {
                  taskForm.resetFields();
                  taskForm.setFieldsValue({ status: 'TODO', priority: 'MEDIUM' });
                  setTaskModalOpen(true);
                }}
                style={{ borderRadius: 8 }}>
                新建任务
              </Button>
            }
            style={{ borderRadius: 14 }}
            styles={{ body: { padding: 0 } }}
          >
            {/* Filters */}
            <div style={{ padding: '12px 16px', display: 'flex', gap: 12, borderBottom: '1px solid #f3f4f6' }}>
              <Select
                allowClear placeholder="状态筛选" style={{ width: 120, borderRadius: 8 }}
                value={statusFilter} onChange={setStatusFilter}
              >
                {Object.entries(statusConfig).map(([k, v]) => (
                  <Select.Option key={k} value={k}>{v.label}</Select.Option>
                ))}
              </Select>
              <Select
                allowClear placeholder="优先级筛选" style={{ width: 120, borderRadius: 8 }}
                value={priorityFilter} onChange={setPriorityFilter}
              >
                {Object.entries(priorityConfig).map(([k, v]) => (
                  <Select.Option key={k} value={k}>{v.label}</Select.Option>
                ))}
              </Select>
              <Text type="secondary" style={{ fontSize: 12, lineHeight: '32px' }}>
                共 {filteredTasks.length} 个任务
              </Text>
            </div>

            <Table
              columns={tableColumns}
              dataSource={filteredTasks}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              expandable={{
                rowExpandable: (record: any) => (record._count?.children ?? 0) > 0,
                expandedRowRender: (record: any) => (
                  <div style={{ padding: '8px 0', background: '#fafafa', borderRadius: 8 }}>
                    <SubtaskBoard parentId={record.id} compact />
                  </div>
                ),
                expandIcon: ({ expanded, onExpand, record }: any) =>
                  (record._count?.children ?? 0) > 0 ? (
                    <Button
                      type="text"
                      size="small"
                      icon={expanded ? <DownOutlined /> : <RightOutlined />}
                      onClick={(e) => onExpand(record, e)}
                      style={{ color: '#7c3aed' }}
                    />
                  ) : (
                    <span style={{ width: 22, display: 'inline-block' }} />
                  ),
              }}
              onRow={(record: any) => ({
                style: { cursor: 'pointer' },
                onClick: (e: any) => {
                  if ((e.target as HTMLElement).closest('.ant-table-row-expand-icon, .ant-btn')) return;
                  navigate(`/tasks/${record.id}`);
                },
              })}
            />
          </Card>
        </Col>

        {/* Right sidebar */}
        <Col xs={8}>
          <Card title={<span style={{ fontSize: 14, fontWeight: 600 }}>项目信息</span>}
            style={{ borderRadius: 14, marginBottom: 16 }}
            styles={{ body: { padding: 16 } }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>负责人</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar src={project.owner?.avatar} size={24} style={{ backgroundColor: color, fontSize: 11 }}>
                    {project.owner?.name?.charAt(0)}
                  </Avatar>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{project.owner?.name}</span>
                </div>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                  成员 ({project.members?.length || 0})
                </Text>
                {project.members?.length > 0 ? (
                  <Avatar.Group maxCount={6} size={28}>
                    {project.members.map((m: any) => (
                      <Tooltip key={m.userId} title={m.user?.name}>
                        <Avatar src={m.user?.avatar} style={{ backgroundColor: color, fontSize: 10 }}>
                          {m.user?.name?.charAt(0)}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </Avatar.Group>
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>暂无成员</Text>
                )}
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>日期范围</Text>
                <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CalendarOutlined />
                  {project.startDate ? dayjs(project.startDate).format('YYYY/MM/DD') : '未设置'}
                  <span> ~ </span>
                  {project.endDate ? dayjs(project.endDate).format('YYYY/MM/DD') : '未设置'}
                </div>
              </div>

              {project.description && (
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>项目描述</Text>
                  <Paragraph style={{ fontSize: 12, margin: 0, color: '#4b5563' }} ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}>
                    {project.description}
                  </Paragraph>
                </div>
              )}

              <Divider style={{ margin: '4px 0' }} />

              <Button type="primary" icon={<CalendarOutlined />} block
                onClick={() => navigate(`/calendar?projectId=${id}`)}
                style={{ borderRadius: 10 }}>
                在日历中查看
              </Button>

              <Button icon={<ApartmentOutlined />} block
                onClick={() => navigate('/projects/board')}
                style={{ borderRadius: 10 }}>
                返回项目总览
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Edit project modal */}
      <Modal
        title="编辑项目"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => projectForm.submit()}
        confirmLoading={updateProjectMutation.isPending}
        width={640}
        destroyOnClose
      >
        <Form form={projectForm} layout="vertical" onFinish={handleEditSubmit}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
                <Input placeholder="输入项目名称" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="项目状态">
                <Select style={{ borderRadius: 8 }}>
                  {Object.entries(projectStatusConfig).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="项目介绍">
            <Input.TextArea rows={3} placeholder="描述项目的目标、范围等信息" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="color" label="项目颜色">
                <Select placeholder="选择颜色" style={{ borderRadius: 8 }} allowClear>
                  {projectColors.map((c) => (
                    <Select.Option key={c} value={c}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 14, height: 14, borderRadius: 4, background: c }} />
                        {c}
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="startDate" label="开始日期">
                <DatePicker style={{ width: '100%', borderRadius: 8 }} placeholder="选择开始日期" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="endDate" label="结束日期">
                <DatePicker style={{ width: '100%', borderRadius: 8 }} placeholder="选择结束日期" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ownerId" label="项目负责人">
                <Select placeholder="选择负责人" showSearch optionFilterProp="children" style={{ borderRadius: 8 }}>
                  {users.map((u: any) => (
                    <Select.Option key={u.id} value={u.id}>{u.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="memberIds" label="项目成员">
                <Select mode="multiple" placeholder="选择项目成员" showSearch optionFilterProp="children" style={{ borderRadius: 8 }}>
                  {users.map((u: any) => (
                    <Select.Option key={u.id} value={u.id}>{u.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Create task modal */}
      <Modal
        title="新建任务"
        open={taskModalOpen}
        onCancel={() => setTaskModalOpen(false)}
        onOk={() => taskForm.submit()}
        confirmLoading={createTaskMutation.isPending}
        width={480}
        destroyOnClose
      >
        <Form form={taskForm} layout="vertical" onFinish={handleCreateTask}>
          <Form.Item name="title" label="任务标题" rules={[{ required: true, message: '请输入任务标题' }]}>
            <Input placeholder="输入任务标题" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="状态" initialValue="TODO">
                <Select style={{ borderRadius: 8 }}>
                  {Object.entries(statusConfig).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="优先级" initialValue="MEDIUM">
                <Select style={{ borderRadius: 8 }}>
                  {Object.entries(priorityConfig).map(([k, v]) => (
                    <Select.Option key={k} value={k}>{v.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="dueDate" label="截止日期">
            <DatePicker showTime style={{ width: '100%', borderRadius: 8 }} placeholder="选择截止日期（可选）" />
          </Form.Item>
          <Form.Item name="assigneeIds" label="负责人">
            <Select mode="multiple" placeholder="选择负责人（可选）" showSearch optionFilterProp="children" style={{ borderRadius: 8 }}>
              {users.map((u: any) => (
                <Select.Option key={u.id} value={u.id}>{u.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
