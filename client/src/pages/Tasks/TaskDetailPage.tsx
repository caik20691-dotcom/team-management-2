import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Space, Form, Input, List, Spin, App,
  Select, DatePicker, Divider, Typography, Row, Col, Upload, Popconfirm, Empty,
} from 'antd';
import {
  ArrowLeftOutlined, SendOutlined, ClockCircleOutlined, UserOutlined,
  FlagOutlined, UploadOutlined, DeleteOutlined, FileOutlined,
  FileImageOutlined, FilePdfOutlined, FileExcelOutlined, FileWordOutlined,
  FilePptOutlined, VideoCameraOutlined, AudioOutlined, PaperClipOutlined,
} from '@ant-design/icons';
import { taskApi, fileApi } from '../../api';
import SubtaskBoard from '../../components/Tasks/SubtaskBoard';
import { useAuthStore } from '../../stores/auth';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  TODO:        { label: '待处理',  color: '#6b7280', bg: '#f9fafb' },
  IN_PROGRESS: { label: '进行中',  color: '#7c3aed', bg: '#f5f3ff' },
  REVIEW:      { label: '审核中',  color: '#d97706', bg: '#fffbeb' },
  DONE:        { label: '已完成',  color: '#059669', bg: '#ecfdf5' },
  CANCELLED:   { label: '已取消',  color: '#9ca3af', bg: '#f9fafb' },
};

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  LOW:    { label: '低',   color: '#6b7280', bg: '#f9fafb' },
  MEDIUM: { label: '中',   color: '#3b82f6', bg: '#eff6ff' },
  HIGH:   { label: '高',   color: '#f59e0b', bg: '#fffbeb' },
  URGENT: { label: '紧急', color: '#ef4444', bg: '#fef2f2' },
};

const fileTypeIcon = (mime: string) => {
  if (!mime) return <FileOutlined style={{ color: '#9ca3af' }} />;
  if (mime.startsWith('image/')) return <FileImageOutlined style={{ color: '#f59e0b' }} />;
  if (mime.includes('pdf')) return <FilePdfOutlined style={{ color: '#ef4444' }} />;
  if (mime.includes('spreadsheet') || mime.includes('excel')) return <FileExcelOutlined style={{ color: '#10b981' }} />;
  if (mime.includes('document') || mime.includes('word')) return <FileWordOutlined style={{ color: '#3b82f6' }} />;
  if (mime.includes('presentation') || mime.includes('powerpoint')) return <FilePptOutlined style={{ color: '#f97316' }} />;
  if (mime.startsWith('video/')) return <VideoCameraOutlined style={{ color: '#8b5cf6' }} />;
  if (mime.startsWith('audio/')) return <AudioOutlined style={{ color: '#ec4899' }} />;
  return <FileOutlined style={{ color: '#9ca3af' }} />;
};

const formatSize = (b: number) => {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

function deadlineDisplay(dueDate: string, status?: string) {
  const isTerminal = status === 'DONE' || status === 'CANCELLED';
  const diff = dayjs(dueDate).startOf('day').diff(dayjs().startOf('day'), 'day');
  const dateStr = dayjs(dueDate).format('YYYY/MM/DD HH:mm');
  if (isTerminal) return { text: '', date: dateStr, color: '#10b981' };
  if (diff < 0) return { text: `已逾期 ${Math.abs(diff)} 天`, date: dateStr, color: '#ef4444' };
  if (diff === 0) return { text: '今天截止', date: dateStr, color: '#f59e0b' };
  if (diff === 1) return { text: '明天截止', date: dateStr, color: '#f59e0b' };
  return { text: `还有 ${diff} 天`, date: dateStr, color: '#10b981' };
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [commentForm] = Form.useForm();

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => taskApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => taskApi.update(id!, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['task', id] }); message.success('已更新'); },
  });

  const addComment = (values: { content: string }) => {
    updateMutation.mutate({ comments: { create: { content: values.content, authorId: user?.id } } });
    commentForm.resetFields();
  };

  const handleUpload = async (file: File) => {
    try {
      const res = await fileApi.upload(file);
      await taskApi.addAttachment(id!, {
        filename: file.name,
        url: res.data.url,
        size: file.size,
        mimeType: file.type,
      });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      message.success('附件上传成功');
    } catch (e: any) {
      message.warning(e?.message || '上传失败');
    }
    return false; // prevent default upload
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await taskApi.removeAttachment(attachmentId);
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      message.success('附件已删除');
    } catch (e: any) {
      message.warning('删除失败');
    }
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', marginTop: 100 }} />;
  if (!task) return <Card style={{ borderRadius: 16 }}>任务不存在</Card>;

  const pCfg = priorityConfig[task.priority] || priorityConfig.MEDIUM;
  const sCfg = statusConfig[task.status] || statusConfig.TODO;
  const deadline = task.dueDate ? deadlineDisplay(task.dueDate, task.status) : null;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ borderRadius: 8 }}>返回</Button>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card style={{ borderRadius: 16 }}>
            {/* Title + badges */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <Title level={4} style={{ margin: 0, flex: 1 }}>{task.title}</Title>
                <Space size={4}>
                  <Tag style={{
                    borderRadius: 6, fontWeight: 500, fontSize: 12,
                    color: sCfg.color, background: sCfg.bg, border: 'none',
                  }}>
                    {sCfg.label}
                  </Tag>
                  <Tag style={{
                    borderRadius: 6, fontWeight: 500, fontSize: 12,
                    color: pCfg.color, background: pCfg.bg, border: 'none',
                  }}>
                    {pCfg.label}优先级
                  </Tag>
                </Space>
              </div>
              {deadline && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ color: '#6b7280' }}>{deadline.date}</span>
                  {deadline.text && (
                    <span style={{ color: deadline.color, fontWeight: 600 }}>
                      <ClockCircleOutlined style={{ marginRight: 3 }} />{deadline.text}
                    </span>
                  )}
                </div>
              )}
            </div>

            <Text style={{ color: '#6b7280', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {task.description || '暂无描述'}
            </Text>

            <Divider />

            {/* Attachments */}
            <Card
              title={
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PaperClipOutlined /> 附件 ({task.attachments?.length || 0})
                </span>
              }
              style={{ borderRadius: 12, marginBottom: 16 }}
              size="small"
              extra={
                <Upload
                  customRequest={async ({ file, onSuccess, onError }: any) => {
                    try {
                      const res = await fileApi.upload(file as File);
                      await taskApi.addAttachment(id!, {
                        filename: (file as File).name,
                        url: res.data.url,
                        size: (file as File).size,
                        mimeType: (file as File).type,
                      });
                      queryClient.invalidateQueries({ queryKey: ['task', id] });
                      message.success('上传成功');
                      onSuccess?.(res.data, file);
                    } catch (e: any) { message.warning(e?.message || '上传失败'); onError?.(new Error('上传失败')); }
                  }}
                  showUploadList={false}
                >
                  <Button icon={<UploadOutlined />} size="small" style={{ borderRadius: 8 }}>上传附件</Button>
                </Upload>
              }
            >
              {task.attachments?.length > 0 ? (
                <List
                  size="small"
                  dataSource={task.attachments}
                  renderItem={(att: any) => (
                    <List.Item
                      style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.01)', marginBottom: 6 }}
                      actions={[
                        <a href={att.url} target="_blank" rel="noreferrer" key="dl" style={{ fontSize: 12 }}>下载</a>,
                        <Popconfirm key="del" title="删除附件？" onConfirm={() => handleDeleteAttachment(att.id)}>
                          <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
                        </Popconfirm>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={fileTypeIcon(att.mimeType)}
                        title={att.filename}
                        description={`${formatSize(att.size)} · ${att.mimeType} · ${dayjs(att.createdAt).format('MM-DD HH:mm')}`}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="暂无附件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>

            {/* Comments */}
            <Card
              title={<span style={{ fontWeight: 600 }}>评论</span>}
              style={{ borderRadius: 12 }}
              size="small"
            >
              <List
                dataSource={task.comments || []}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <div style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: 'linear-gradient(135deg,#a78bfa,#7c3aed)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 600, fontSize: 12,
                        }}>
                          {item.author?.name?.charAt(0)}
                        </div>
                      }
                      title={<span style={{ fontWeight: 600 }}>{item.author?.name}</span>}
                      description={<span style={{ color: '#4b5563' }}>{item.content}</span>}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(item.createdAt).format('MM-DD HH:mm')}
                    </Text>
                  </List.Item>
                )}
                locale={{ emptyText: '暂无评论' }}
              />
              <Form form={commentForm} onFinish={addComment} style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <Form.Item name="content" rules={[{ required: true, message: '输入评论' }]} style={{ flex: 1 }}>
                  <Input placeholder="发表评论..." style={{ borderRadius: 10 }} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SendOutlined />} style={{ borderRadius: 10 }}>发送</Button>
                </Form.Item>
              </Form>
            </Card>
          </Card>

          <Card
            title={<span style={{ fontWeight: 600 }}>子任务看板</span>}
            style={{ borderRadius: 12, marginTop: 16 }}
            size="small"
          >
            <SubtaskBoard parentId={task.id} projectId={task.projectId} />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FlagOutlined style={{ color: '#7c3aed' }} /> 任务属性
            </div>
            <Descriptions column={1} size="small" colon={false} labelStyle={{ color: '#9ca3af', fontWeight: 500 }}>
              <Descriptions.Item label={<><ClockCircleOutlined /> 状态</>}>
                <Select size="small" value={task.status} style={{ width: 120, borderRadius: 8 }}
                  onChange={(v) => updateMutation.mutate({ status: v })}>
                  {Object.entries(statusConfig).map(([k, c]) => (
                    <Select.Option key={k} value={k}>{c.label}</Select.Option>
                  ))}
                </Select>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Select size="small" value={task.priority} style={{ width: 120, borderRadius: 8 }}
                  onChange={(v) => updateMutation.mutate({ priority: v })}>
                  {Object.entries(priorityConfig).map(([k, c]) => (
                    <Select.Option key={k} value={k}>{c.label}</Select.Option>
                  ))}
                </Select>
              </Descriptions.Item>
              <Descriptions.Item label={<><UserOutlined /> 负责人</>}>
                {task.assignees?.map((a: any) => (
                  <Tag key={a.id} style={{ borderRadius: 6 }}>{a.user.name}</Tag>
                ))}
                {(!task.assignees || task.assignees.length === 0) && <span style={{ color: '#d1d5db' }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="截止日期">
                <DatePicker
                  size="small"
                  value={task.dueDate ? dayjs(task.dueDate) : null}
                  onChange={(v) => updateMutation.mutate({ dueDate: v?.toISOString() })}
                  style={{ borderRadius: 8 }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="创建人">{task.creator?.name}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(task.createdAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              {task.project && (
                <Descriptions.Item label="所属项目">
                  <Tag color={task.project.color || 'blue'} style={{ borderRadius: 6 }}>{task.project.name}</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
