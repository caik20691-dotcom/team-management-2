import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Typography, Tag, Badge, Empty, Spin, App, Row, Col,
  Avatar, Tooltip, Button, Modal, Form, Input, Select, DatePicker,
  Space, Popconfirm,
} from 'antd';
import {
  ApartmentOutlined, RightOutlined, DownOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined,
  UserOutlined, CalendarOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { projectApi, taskApi, userApi } from '../../api';
import KanbanBoardView from '../../components/Tasks/KanbanBoardView';
import { useKanbanBoard } from '../../hooks/useKanbanBoard';
import dayjs from 'dayjs';

const { Text } = Typography;

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

function ProjectTaskKanban({ tasks, projectId }: { tasks: any[]; projectId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      taskApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('已更新');
    },
  });

  const { draggedTaskId, setDraggedTaskId, dragOverCol, setDragOverCol, getTasksByStatus, handleDrop } =
    useKanbanBoard({ tasks, onUpdateStatus: (id, st) => updateMutation.mutate({ id, status: st }) });

  if (tasks.length === 0) {
    return <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} />;
  }

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
      compact
      emptyText="暂无任务"
    />
  );
}

export default function ProjectBoardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [form] = Form.useForm();
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [creatingForProject, setCreatingForProject] = useState<string | null>(null);
  const [taskForm] = Form.useForm();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list().then((r) => r.data),
  });

  const { data: usersResp } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.list({ pageSize: '100' }).then((r) => r.data),
  });

  const { data: projectTasks } = useQuery({
    queryKey: ['tasks', 'project', expandedId],
    queryFn: () => taskApi.list({ projectId: expandedId, pageSize: '100' }).then((r) => r.data),
    enabled: !!expandedId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => projectApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('项目创建成功');
      setModalOpen(false);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => projectApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('项目已更新');
      setModalOpen(false);
      setEditingProject(null);
      form.resetFields();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('项目已删除');
      if (expandedId) setExpandedId(null);
    },
  });

  const taskCreateMutation = useMutation({
    mutationFn: (values: any) =>
      taskApi.create({
        ...values,
        projectId: creatingForProject,
        dueDate: values.dueDate?.toISOString?.() ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'project', expandedId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('任务已创建');
      setTaskModalOpen(false);
      taskForm.resetFields();
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const openCreateModal = () => {
    setEditingProject(null);
    form.resetFields();
    form.setFieldsValue({ status: 'ACTIVE' });
    setModalOpen(true);
  };

  const openEditModal = (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    form.setFieldsValue({
      name: project.name,
      description: project.description,
      status: project.status || 'ACTIVE',
      color: project.color,
      startDate: project.startDate ? dayjs(project.startDate) : null,
      endDate: project.endDate ? dayjs(project.endDate) : null,
      memberIds: project.members?.map((m: any) => m.userId) || [],
      ownerId: project.ownerId,
    });
    setModalOpen(true);
  };

  const handleSubmit = (values: any) => {
    const data: any = { ...values };
    // Handle dates: convert dayjs to ISO string, preserve null for clearing
    data.startDate = values.startDate?.toISOString?.() ?? null;
    data.endDate = values.endDate?.toISOString?.() ?? null;
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', marginTop: 100 }} />;

  const projectList = projects || [];

  return (
    <div>
      <style>{`
        .project-card {
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
          cursor: pointer;
          border: 1px solid rgba(0,0,0,0.04) !important;
        }
        .project-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important;
        }
        .project-card.expanded {
          border-color: rgba(124,58,237,0.2) !important;
          box-shadow: 0 4px 16px rgba(124,58,237,0.08) !important;
        }
        .task-row { cursor: pointer; transition: background 0.15s; }
        .task-row:hover { background: #faf5ff !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'linear-gradient(135deg, #f97316, #fb923c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
          }}>
            <ApartmentOutlined style={{ fontSize: 18, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700 }}>项目总览</span>
          <Badge count={projectList.length} style={{ backgroundColor: '#f97316' }} />
        </div>
        <Button icon={<PlusOutlined />} type="primary" onClick={openCreateModal}
          style={{ borderRadius: 10, height: 38, fontWeight: 500 }}>
          新建项目
        </Button>
      </div>

      {projectList.length === 0 ? (
        <Card style={{ borderRadius: 16, textAlign: 'center', padding: 48 }}>
          <Empty
            description="暂无项目，点击上方按钮创建第一个项目"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {projectList.map((project: any, idx: number) => {
            const isExpanded = expandedId === project.id;
            const tasks = projectTasks?.data || [];
            const color = project.color || projectColors[idx % projectColors.length];
            const psCfg = projectStatusConfig[project.status] || projectStatusConfig.ACTIVE;
            const memberCount = project._count?.members || project.members?.length || 0;

            return (
              <Col xs={24} key={project.id}>
                <Card
                  className={`project-card ${isExpanded ? 'expanded' : ''}`}
                  style={{ borderRadius: 16 }}
                  styles={{ body: { padding: 0 } }}
                >
                  {/* Project header */}
                  <div
                    onClick={() => toggleExpand(project.id)}
                    style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <ApartmentOutlined style={{ fontSize: 22, color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <a
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}`);
                          }}
                          style={{ fontWeight: 700, fontSize: 15, color: '#1e1b4b' }}
                        >
                          {project.name}
                        </a>
                        <Tag style={{
                          borderRadius: 6, fontWeight: 500, fontSize: 11,
                          color: psCfg.color, background: psCfg.bg, border: 'none', margin: 0,
                        }}>
                          {psCfg.label}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                        {project.description && (
                          <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: true }}>
                            {project.description}
                          </Text>
                        )}
                        <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <UserOutlined /> {project.owner?.name}
                        </span>
                        {project.startDate && (
                          <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CalendarOutlined />
                            {dayjs(project.startDate).format('YYYY/MM/DD')}
                            {project.endDate ? ` ~ ${dayjs(project.endDate).format('YYYY/MM/DD')}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <Space size={4} onClick={(e) => e.stopPropagation()}>
                      <Button size="small" type="text" icon={<EditOutlined />}
                        onClick={(e) => openEditModal(project, e)}
                        style={{ borderRadius: 8, color: '#7c3aed' }} />
                      <Popconfirm title="删除项目及所有任务？" onConfirm={() => deleteMutation.mutate(project.id)}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />}
                          style={{ borderRadius: 8 }} />
                      </Popconfirm>
                    </Space>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 18, color }}>
                          {project._count?.tasks || 0}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>任务</div>
                      </div>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: isExpanded ? '#f5f3ff' : '#f9fafb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}>
                        {isExpanded
                          ? <DownOutlined style={{ fontSize: 12, color: '#7c3aed' }} />
                          : <RightOutlined style={{ fontSize: 12, color: '#9ca3af' }} />
                        }
                      </div>
                    </div>
                  </div>

                  {/* Members row */}
                  {project.members?.length > 0 && (
                    <div style={{
                      padding: '0 20px 12px',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <TeamOutlined style={{ fontSize: 12, color: '#9ca3af' }} />
                      <Avatar.Group maxCount={5} size={22}>
                        {project.members.map((m: any) => (
                          <Tooltip key={m.userId} title={m.user?.name}>
                            <Avatar src={m.user?.avatar} style={{ backgroundColor: color, fontSize: 10 }}>
                              {m.user?.name?.charAt(0)}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </Avatar.Group>
                    </div>
                  )}

                  {/* Expanded tasks — Kanban Board */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px 16px' }}>
                      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>共 {tasks.length} 个任务</span>
                        <Button size="small" type="dashed" icon={<PlusOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            taskForm.resetFields();
                            taskForm.setFieldsValue({ status: 'TODO', priority: 'MEDIUM' });
                            setCreatingForProject(project.id);
                            setTaskModalOpen(true);
                          }}
                          style={{ borderRadius: 8 }}>
                          新建任务
                        </Button>
                      </div>
                      <ProjectTaskKanban tasks={tasks} projectId={project.id} />
                    </div>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Create / Edit project modal */}
      <Modal
        title={editingProject ? '编辑项目' : '新建项目'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingProject(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
                <Input placeholder="输入项目名称" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="项目状态" initialValue="ACTIVE">
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
                  {usersResp?.data?.map((u: any) => (
                    <Select.Option key={u.id} value={u.id}>{u.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="memberIds" label="项目成员">
                <Select mode="multiple" placeholder="选择项目成员" showSearch optionFilterProp="children" style={{ borderRadius: 8 }}>
                  {usersResp?.data?.map((u: any) => (
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
        onCancel={() => { setTaskModalOpen(false); taskForm.resetFields(); }}
        onOk={() => taskForm.submit()}
        confirmLoading={taskCreateMutation.isPending}
        destroyOnClose
      >
        <Form form={taskForm} layout="vertical" onFinish={(v) => taskCreateMutation.mutate(v)}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="任务标题" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="状态">
                <Select
                  options={[
                    { value: 'TODO', label: '待处理' },
                    { value: 'IN_PROGRESS', label: '进行中' },
                    { value: 'REVIEW', label: '审核中' },
                    { value: 'DONE', label: '已完成' },
                  ]}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="优先级">
                <Select
                  options={[
                    { value: 'LOW', label: '低优先级' },
                    { value: 'MEDIUM', label: '中优先级' },
                    { value: 'HIGH', label: '高优先级' },
                    { value: 'URGENT', label: '紧急' },
                  ]}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="dueDate" label="截止日期">
            <DatePicker showTime style={{ borderRadius: 8, width: '100%' }} />
          </Form.Item>
          <Form.Item name="assigneeIds" label="负责人">
            <Select
              mode="multiple"
              placeholder="选择负责人"
              options={(usersResp?.data || usersResp || []).map((u: any) => ({
                value: u.id,
                label: u.name,
              }))}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
