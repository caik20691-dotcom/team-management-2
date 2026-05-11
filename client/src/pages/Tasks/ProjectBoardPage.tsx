import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Typography, Tag, Badge, Empty, Spin, App, Row, Col,
  Avatar, Tooltip, Button, Modal, Form, Input, Select, DatePicker,
  Space, Popconfirm,
} from 'antd';
import {
  ApartmentOutlined, RightOutlined, DownOutlined,
  ClockCircleOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  UserOutlined, CalendarOutlined, FlagOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { projectApi, taskApi, userApi } from '../../api';
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

export default function ProjectBoardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [form] = Form.useForm();

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

                  {/* Expanded tasks */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #f3f4f6', padding: '0 16px 16px' }}>
                      {tasks.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center' }}>
                          <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textAlign: 'left' }}>标题</th>
                              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textAlign: 'left', width: 90 }}>状态</th>
                              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textAlign: 'left', width: 70 }}>优先级</th>
                              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textAlign: 'left', width: 100 }}>负责人</th>
                              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textAlign: 'left', width: 120 }}>截止日期</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tasks.map((task: any) => {
                              const pCfg = priorityConfig[task.priority] || priorityConfig.MEDIUM;
                              const sCfg = statusConfig[task.status] || statusConfig.TODO;
                              const diffDays = task.dueDate
                                ? dayjs(task.dueDate).startOf('day').diff(dayjs().startOf('day'), 'day')
                                : null;
                              const dlColor = diffDays === null ? undefined
                                : diffDays < 0 ? '#ef4444' : diffDays <= 1 ? '#f59e0b' : '#10b981';
                              const dlText = diffDays === null ? null
                                : diffDays < 0 ? `已逾期${Math.abs(diffDays)}天`
                                : diffDays === 0 ? '今天截止'
                                : diffDays === 1 ? '明天截止'
                                : `还有${diffDays}天`;

                              return (
                                <tr key={task.id} className="task-row"
                                  onClick={() => navigate(`/tasks/${task.id}`)}
                                  style={{ borderBottom: '1px solid #f9fafb' }}>
                                  <td style={{ padding: '10px 12px' }}>
                                    <span style={{ fontWeight: 500, color: '#1e1b4b', fontSize: 13 }}>{task.title}</span>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <Tag style={{ borderRadius: 6, fontWeight: 500, fontSize: 11, color: sCfg.color, background: sCfg.bg, border: 'none', margin: 0 }}>
                                      {sCfg.label}
                                    </Tag>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: pCfg.color, background: pCfg.bg, padding: '2px 8px', borderRadius: 4 }}>
                                      {pCfg.label}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    {task.assignees?.length > 0 ? (
                                      <Avatar.Group maxCount={2} size={22}>
                                        {task.assignees.map((a: any) => (
                                          <Tooltip key={a.id} title={a.user.name}>
                                            <Avatar src={a.user.avatar} style={{ backgroundColor: '#7c3aed', fontSize: 10 }}>
                                              {a.user.name?.charAt(0)}
                                            </Avatar>
                                          </Tooltip>
                                        ))}
                                      </Avatar.Group>
                                    ) : <span style={{ fontSize: 12, color: '#d1d5db' }}>-</span>}
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    {task.dueDate ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <span style={{ fontSize: 11, color: '#6b7280' }}>{dayjs(task.dueDate).format('MM/DD HH:mm')}</span>
                                        {dlText && <span style={{ fontSize: 10, fontWeight: 500, color: dlColor }}><ClockCircleOutlined style={{ fontSize: 9 }} /> {dlText}</span>}
                                      </div>
                                    ) : <span style={{ fontSize: 12, color: '#d1d5db' }}>-</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
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
    </div>
  );
}
