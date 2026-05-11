import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Tag, Button, Modal, Form, Input, Select, InputNumber, Typography, App, Row, Col, Space, Progress, Popconfirm, Upload } from 'antd';
import { PlusOutlined, BookOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons';
import { trainingApi, fileApi, validateImageFile } from '../../api';

const categoryOptions = ['技术', '管理', '入职', '安全', '其他'];
const statusOptions: Record<string, string> = { NOT_STARTED: '待开始', IN_PROGRESS: '进行中', COMPLETED: '已结束', PAUSED: '已暂停' };
const statusColors: Record<string, string> = { NOT_STARTED: 'default', IN_PROGRESS: 'blue', COMPLETED: 'green', PAUSED: 'orange' };

export default function TrainingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState<any>(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<any>({ pageSize: '50' });

  const { data: coursesResp } = useQuery({
    queryKey: ['courses', filters],
    queryFn: () => trainingApi.courses(filters).then((r) => r.data),
  });
  const { data: progress } = useQuery({
    queryKey: ['training-progress'],
    queryFn: () => trainingApi.progress().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => trainingApi.createCourse(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['courses'] }); message.success('课程创建成功'); setModalOpen(null); form.resetFields(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => trainingApi.updateCourse(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['courses'] }); message.success('课程已更新'); setModalOpen(null); form.resetFields(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => trainingApi.deleteCourse(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['courses'] }); message.success('课程已删除'); },
  });

  const openEdit = (course: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalOpen({ mode: 'edit', course });
    form.setFieldsValue(course);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(124,58,237,0.3)' }}>
            <BookOutlined style={{ fontSize: 18, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700 }}>培训中心</span>
        </div>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => { setModalOpen({ mode: 'create' }); form.resetFields(); }} style={{ borderRadius: 10, height: 38, fontWeight: 500 }}>添加课程</Button>
      </div>

      {/* Search & Filter */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 12 }}>
        <Space wrap>
          <Input.Search placeholder="搜索课程" style={{ width: 220, borderRadius: 8 }} onSearch={(v) => setFilters((f: any) => ({ ...f, search: v }))} allowClear />
          <Select placeholder="分类" allowClear style={{ width: 120 }} onChange={(v) => setFilters((f: any) => ({ ...f, category: v }))}>
            {categoryOptions.map((c) => <Select.Option key={c} value={c}>{c}</Select.Option>)}
          </Select>
          <Select placeholder="状态" allowClear style={{ width: 130 }} onChange={(v) => setFilters((f: any) => ({ ...f, status: v }))}>
            {Object.entries(statusOptions).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
          </Select>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {coursesResp?.data?.map((course: any) => {
          const prog = progress?.find((p: any) => p.courseId === course.id);
          return (
            <Col xs={24} sm={12} lg={8} key={course.id}>
              <Card
                hoverable
                onClick={() => navigate(`/training/${course.id}`)}
                style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer' }}
                cover={
                  course.coverImage ? (
                    <div style={{ height: 140, overflow: 'hidden', position: 'relative' }}>
                      <img alt={course.title} src={course.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, rgba(0,0,0,0.4))' }} />
                    </div>
                  ) : (
                    <div style={{ height: 120, background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 50%, #a78bfa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                      <BookOutlined style={{ color: '#fff', opacity: 0.6 }} />
                    </div>
                  )
                }
                actions={[
                  <EditOutlined key="edit" onClick={(e) => openEdit(course, e)} />,
                  <Popconfirm key="del" title="确定删除？" onConfirm={(e) => { e?.stopPropagation(); deleteMutation.mutate(course.id); }} onCancel={(e) => e?.stopPropagation()}>
                    <DeleteOutlined onClick={(e) => e.stopPropagation()} style={{ color: '#ef4444' }} />
                  </Popconfirm>,
                ]}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#ddd6fe,#c4b5fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    <BookOutlined style={{ color: '#7c3aed' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</div>
                    <Space size={4} style={{ marginTop: 4 }}>
                      <Tag color={statusColors[course.status] || 'default'} style={{ borderRadius: 6, fontSize: 11 }}>{statusOptions[course.status] || course.status}</Tag>
                      <Tag style={{ borderRadius: 6, fontSize: 11 }}>{course.category}</Tag>
                    </Space>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <Space size={12} style={{ color: '#9ca3af', fontSize: 12 }}>
                    {course.duration && <span><ClockCircleOutlined /> {course.duration}分钟</span>}
                    <span>{course._count?.lessons || 0} 课时</span>
                  </Space>
                  {prog && <Progress percent={prog.progress} size="small" style={{ width: 80, marginBottom: 0 }} strokeColor={{ from: '#7c3aed', to: '#a78bfa' }} />}
                </div>
              </Card>
            </Col>
          );
        })}
        {(!coursesResp?.data || coursesResp.data.length === 0) && (
          <Col span={24}><Card style={{ borderRadius: 16, textAlign: 'center', padding: 40, color: '#9ca3af' }}>暂无课程，点击右上角添加</Card></Col>
        )}
      </Row>

      {/* Create / Edit Modal */}
      <Modal
        title={modalOpen?.mode === 'edit' ? '编辑课程' : '添加课程'}
        open={!!modalOpen}
        onCancel={() => setModalOpen(null)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={async (v) => {
          if (modalOpen?.mode === 'edit') updateMutation.mutate({ id: modalOpen.course.id, data: v });
          else createMutation.mutate(v);
        }}>
          <Form.Item name="title" label="课程名称" rules={[{ required: true }]}><Input style={{ borderRadius: 8 }} /></Form.Item>
          <Form.Item name="description" label="课程描述"><Input.TextArea rows={3} style={{ borderRadius: 8 }} /></Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}><Select style={{ borderRadius: 8 }}>{categoryOptions.map((c) => <Select.Option key={c} value={c}>{c}</Select.Option>)}</Select></Form.Item>
          <Form.Item name="duration" label="预计时长（分钟）"><InputNumber min={1} style={{ width: '100%', borderRadius: 8 }} /></Form.Item>
          <Form.Item name="status" label="状态" initialValue="NOT_STARTED">
            <Select style={{ borderRadius: 8 }}>{Object.entries(statusOptions).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}</Select>
          </Form.Item>
          <Form.Item name="coverImage" label="封面图">
            <Input style={{ borderRadius: 8 }} placeholder="输入图片 URL 或上传" />
          </Form.Item>
          <Upload
            customRequest={async ({ file, onSuccess, onError }: any) => {
              const validationError = validateImageFile(file as File);
              if (validationError) { message.warning(validationError); onError?.(new Error(validationError)); return; }
              try {
                const res = await fileApi.upload(file as File);
                form.setFieldsValue({ coverImage: res.data.url });
                message.success('封面上传成功');
                onSuccess?.(res.data, file);
              } catch { onError?.(new Error('上传失败')); }
            }}
            showUploadList={false}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>上传封面图片</Button>
          </Upload>
        </Form>
      </Modal>
    </div>
  );
}
