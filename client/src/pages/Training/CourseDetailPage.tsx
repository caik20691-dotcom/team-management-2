import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tabs, Card, Button, Tag, Typography, App, Space, List, Progress, Modal,
  Form, Input, Select, InputNumber, Upload, Empty, Row, Col, Statistic,
  Radio, Result, Breadcrumb, Popconfirm, Descriptions
} from 'antd';
import {
  ArrowLeftOutlined, BookOutlined, ClockCircleOutlined, PlayCircleOutlined,
  EditOutlined, DeleteOutlined, PlusOutlined, CheckCircleOutlined,
  UploadOutlined, FileOutlined, QuestionCircleOutlined, TrophyOutlined,
  ExperimentOutlined, EyeOutlined, UpOutlined, DownOutlined, FormOutlined,
  CheckSquareOutlined, BorderOutlined, FieldNumberOutlined
} from '@ant-design/icons';
import { trainingApi, fileApi, validateImageFile } from '../../api';
import dayjs from 'dayjs';

const { Paragraph } = Typography;

const contentTypeLabels: Record<string, string> = { RICH_TEXT: '图文', MARKDOWN: '文档', VIDEO: '视频' };
const contentTypeIcons: Record<string, string> = { RICH_TEXT: '📝', MARKDOWN: '📄', VIDEO: '🎬' };
const categoryOptions = ['技术', '管理', '入职', '安全', '其他'];
const statusOptions: Record<string, string> = { NOT_STARTED: '待开始', IN_PROGRESS: '进行中', COMPLETED: '已结束', PAUSED: '已暂停' };
const statusColors: Record<string, string> = { NOT_STARTED: 'default', IN_PROGRESS: 'blue', COMPLETED: 'green', PAUSED: 'orange' };

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const [lessonModal, setLessonModal] = useState<any>(null);
  const [courseModal, setCourseModal] = useState(false);
  const [quizEditModal, setQuizEditModal] = useState<any>(null);
  const [quizTaking, setQuizTaking] = useState<any>(null);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [viewLesson, setViewLesson] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('lessons');
  const [form] = Form.useForm();
  const [courseForm] = Form.useForm();
  const [quizForm] = Form.useForm();

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => trainingApi.course(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: lessonProgress } = useQuery({
    queryKey: ['lesson-progress', id],
    queryFn: () => trainingApi.getLessonProgress(id!).then((r) => r.data),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['course', id] });
    queryClient.invalidateQueries({ queryKey: ['lesson-progress', id] });
    queryClient.invalidateQueries({ queryKey: ['training-progress'] });
  };

  const courseUpdateMutation = useMutation({
    mutationFn: (data: any) => trainingApi.updateCourse(id!, data),
    onSuccess: () => { invalidate(); message.success('课程已更新'); setCourseModal(false); },
  });
  const lessonCreateMutation = useMutation({
    mutationFn: (data: any) => trainingApi.createLesson(id!, data),
    onSuccess: () => { invalidate(); message.success('课时已添加'); setLessonModal(null); form.resetFields(); },
  });
  const lessonUpdateMutation = useMutation({
    mutationFn: ({ lid, data }: { lid: string; data: any }) => trainingApi.updateLesson(lid, data),
    onSuccess: () => { invalidate(); message.success('课时已更新'); setLessonModal(null); form.resetFields(); },
  });
  const lessonDeleteMutation = useMutation({
    mutationFn: (lid: string) => trainingApi.deleteLesson(lid),
    onSuccess: () => { invalidate(); message.success('课时已删除'); },
  });
  const completeMutation = useMutation({
    mutationFn: (lid: string) => trainingApi.markLessonComplete(lid),
    onSuccess: () => { invalidate(); message.success('已标记完成'); },
  });
  const unmarkMutation = useMutation({
    mutationFn: (lid: string) => trainingApi.unmarkLessonComplete(lid),
    onSuccess: () => { invalidate(); message.success('已取消完成'); },
  });
  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => trainingApi.reorderLessons(id!, ids),
    onSuccess: () => { invalidate(); },
  });
  const quizUpsertMutation = useMutation({
    mutationFn: ({ lid, data }: { lid: string; data: any }) => trainingApi.upsertQuiz(lid, data),
    onSuccess: () => { invalidate(); message.success('测验已保存'); setQuizEditModal(null); quizForm.resetFields(); },
  });
  const quizSubmitMutation = useMutation({
    mutationFn: ({ lid, answers }: { lid: string; answers: number[] }) => trainingApi.submitQuiz(lid, { answers }),
    onSuccess: (res: any) => { setQuizResult(res.data); },
  });

  const completedLessonIds = new Set((lessonProgress || []).map((p: any) => p.lessonId));
  const lessons = course?.lessons || [];
  const progress = course?.progress;
  const totalLessons = lessons.length;
  const completedCount = lessons.filter((l: any) => completedLessonIds.has(l.id)).length;

  const moveLesson = (index: number, direction: 'up' | 'down') => {
    const newLessons = [...lessons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLessons.length) return;
    [newLessons[index], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[index]];
    const ids = newLessons.map((l: any) => l.id);
    reorderMutation.mutate(ids);
  };

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>加载中...</div>;
  if (!course) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>课程不存在</div>;

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[{ title: <a onClick={() => navigate('/training')}>培训中心</a> }, { title: course.title }]} />

      {/* Course Header */}
      <Card style={{ borderRadius: 16, marginBottom: 16 }}>
        {course.coverImage && (
          <div style={{ margin: -24, marginBottom: 16, height: 200, overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
            <img src={course.coverImage} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <Row gutter={[24, 16]} align="middle">
          <Col flex="auto">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                <BookOutlined style={{ color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{course.title}</div>
                <Space size={4} style={{ marginTop: 4 }}>
                  <Tag color={statusColors[course.status] || 'default'} style={{ borderRadius: 6 }}>{statusOptions[course.status] || course.status}</Tag>
                  <Tag style={{ borderRadius: 6 }}>{course.category}</Tag>
                  {course.duration && <Tag icon={<ClockCircleOutlined />} style={{ borderRadius: 6 }}>{course.duration}分钟</Tag>}
                </Space>
              </div>
            </div>
          </Col>
          <Col>
            <Space>
              <Button icon={<EditOutlined />} onClick={() => { courseForm.setFieldsValue(course); setCourseModal(true); }} style={{ borderRadius: 10 }}>编辑课程</Button>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/training')} style={{ borderRadius: 10 }}>返回列表</Button>
            </Space>
          </Col>
        </Row>
        {course.description && <Paragraph style={{ marginTop: 16, color: '#4b5563' }}>{course.description}</Paragraph>}
        {progress && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>学习进度</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>{progress.progress}%</span>
            </div>
            <Progress percent={progress.progress} strokeColor={{ from: '#7c3aed', to: '#a78bfa' }} />
          </div>
        )}
      </Card>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 14 }} className="stat-card stat-card-purple">
            <Statistic title="课时数" value={totalLessons} prefix={<PlayCircleOutlined style={{ color: '#7c3aed' }} />} valueStyle={{ fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 14 }} className="stat-card stat-card-emerald">
            <Statistic title="已完成" value={completedCount} suffix={`/ ${totalLessons}`} prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />} valueStyle={{ fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 14 }} className="stat-card stat-card-sky">
            <Statistic title="测验" value={lessons.filter((l: any) => l.quiz).length} prefix={<ExperimentOutlined style={{ color: '#3b82f6' }} />} valueStyle={{ fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 14 }} className="stat-card stat-card-amber">
            <Statistic title="附件" value={course.attachments?.length || 0} prefix={<FileOutlined style={{ color: '#f59e0b' }} />} valueStyle={{ fontWeight: 700 }} />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab={`课程目录 (${totalLessons})`} key="lessons">
          <Card style={{ borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, lineHeight: '32px' }}>课时列表</span>
              <Button icon={<PlusOutlined />} type="primary" onClick={() => { setLessonModal({ mode: 'create' }); form.resetFields(); }} style={{ borderRadius: 10 }}>添加课时</Button>
            </div>
            {lessons.length === 0 ? (
              <Empty description="暂无课时，点击上方按钮添加" />
            ) : (
              <List
                dataSource={lessons}
                renderItem={(lesson: any, idx: number) => {
                  const isCompleted = completedLessonIds.has(lesson.id);
                  return (
                    <List.Item
                      style={{
                        background: isCompleted ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' : '#fff',
                        padding: '12px 14px', borderRadius: 12, marginBottom: 8,
                        border: isCompleted ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(124,58,237,0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
                        <Button size="small" type="text" icon={<UpOutlined />} disabled={idx === 0} onClick={() => moveLesson(idx, 'up')} style={{ borderRadius: 6, minWidth: 28 }} />
                        <Button size="small" type="text" icon={<DownOutlined />} disabled={idx === lessons.length - 1} onClick={() => moveLesson(idx, 'down')} style={{ borderRadius: 6, minWidth: 28 }} />
                      </div>
                      <List.Item.Meta
                        avatar={
                          <div style={{
                            width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                            background: isCompleted ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)' : 'linear-gradient(135deg,#ddd6fe,#c4b5fd)',
                          }}>
                            {contentTypeIcons[lesson.contentType] || '📝'}
                          </div>
                        }
                        title={<Space><span style={{ fontWeight: 600 }}>{idx + 1}. {lesson.title}</span><Tag style={{ borderRadius: 6 }}>{contentTypeLabels[lesson.contentType] || '图文'}</Tag>{lesson.quiz && <Tag color="purple" style={{ borderRadius: 6 }}>含测验</Tag>}</Space>}
                        description={lesson.videoUrl ? <a href={lesson.videoUrl} target="_blank" rel="noreferrer">视频链接</a> : (lesson.content?.substring(0, 80) || '暂无内容')}
                      />
                      <Space style={{ flexShrink: 0, marginLeft: 8 }}>
                        {!isCompleted ? (
                          <Button size="small" type="primary" style={{ borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }} icon={<CheckCircleOutlined />} onClick={() => completeMutation.mutate(lesson.id)} loading={completeMutation.isPending}>标记完成</Button>
                        ) : (
                          <Button size="small" style={{ borderRadius: 8, color: '#f59e0b', borderColor: '#f59e0b' }} onClick={() => unmarkMutation.mutate(lesson.id)} loading={unmarkMutation.isPending}>取消完成</Button>
                        )}
                        <Button size="small" icon={<EyeOutlined />} style={{ borderRadius: 8 }} onClick={() => setViewLesson(lesson)}>查看</Button>
                        {lesson.quiz && <Button size="small" icon={<PlayCircleOutlined />} style={{ borderRadius: 8, color: '#10b981', borderColor: '#10b981' }} onClick={() => setQuizTaking(lesson)}>答题</Button>}
                        {!lesson.quiz && <Button size="small" icon={<ExperimentOutlined />} style={{ borderRadius: 8 }} onClick={() => { setQuizEditModal({ lessonId: lesson.id, quiz: null }); quizForm.resetFields(); quizForm.setFieldsValue({ passScore: 60, questions: '[]' }); }}>+测验</Button>}
                        {lesson.quiz && <Button size="small" icon={<FormOutlined />} style={{ borderRadius: 8, color: '#f59e0b', borderColor: '#f59e0b' }} onClick={() => { const q = lesson.quiz; setQuizEditModal({ lessonId: lesson.id, quiz: q }); quizForm.setFieldsValue({ passScore: q.passScore, questions: q.questions }); }} />}
                        <Button size="small" icon={<EditOutlined />} style={{ borderRadius: 8 }} onClick={() => { setLessonModal({ mode: 'edit', lesson }); form.setFieldsValue(lesson); }} />
                        <Popconfirm title="确定删除？" onConfirm={() => lessonDeleteMutation.mutate(lesson.id)}><Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }} /></Popconfirm>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane tab="课程附件" key="attachments">
          <Card style={{ borderRadius: 16 }}>
            <Upload customRequest={async ({ file, onSuccess, onError }: any) => {
              try {
                const res = await fileApi.upload(file as File);
                await trainingApi.addCourseAttachment(id!, { filename: (file as File).name, url: res.data.url, size: (file as File).size, mimeType: (file as File).type });
                invalidate(); message.success('上传成功');
                onSuccess?.(res.data, file);
              } catch (e: any) { message.warning(e?.message || '上传失败'); onError?.(new Error('上传失败')); }
            }} showUploadList={false}>
              <Button icon={<UploadOutlined />} style={{ borderRadius: 10 }}>上传附件</Button>
            </Upload>
            <List style={{ marginTop: 16 }}
              dataSource={course.attachments || []}
              locale={{ emptyText: <Empty description="暂无附件" /> }}
              renderItem={(att: any) => (
                <List.Item actions={[
                  <a href={att.url} target="_blank" rel="noreferrer" key="dl">下载</a>,
                  <Popconfirm key="del" title="删除？" onConfirm={() => trainingApi.removeAttachment(att.id).then(() => { invalidate(); message.success('已删除'); })}>
                    <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
                  </Popconfirm>,
                ]}>
                  <List.Item.Meta avatar={<FileOutlined style={{ fontSize: 20, color: '#7c3aed' }} />} title={att.filename} description={`${(att.size / 1024).toFixed(1)} KB · ${att.mimeType}`} />
                </List.Item>
              )} />
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane tab="学习进度" key="progress">
          <Card style={{ borderRadius: 16 }}>
            {progress ? (
              <div>
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Progress type="circle" percent={progress.progress} size={160} strokeColor={{ from: '#7c3aed', to: '#a78bfa' }} />
                  <div style={{ marginTop: 16, fontSize: 16, fontWeight: 600 }}>
                    {progress.completed ? '🎉 已完成全部学习' : `${progress.progress}% 完成`}
                  </div>
                  {progress.quizScore != null && <div style={{ marginTop: 8, color: '#6b7280' }}>测验最高分：{progress.quizScore} 分</div>}
                  <div style={{ marginTop: 4, color: '#9ca3af', fontSize: 13 }}>
                    {progress.startedAt && `开始于 ${dayjs(progress.startedAt).format('YYYY-MM-DD HH:mm')}`}
                    {progress.completedAt && ` · 完成于 ${dayjs(progress.completedAt).format('YYYY-MM-DD HH:mm')}`}
                  </div>
                </div>
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>课时完成情况</div>
                  {lessons.map((l: any, i: number) => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                      {completedLessonIds.has(l.id) ? <CheckCircleOutlined style={{ color: '#10b981', fontSize: 18 }} /> : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #d1d5db' }} />}
                      <span style={{ flex: 1, color: completedLessonIds.has(l.id) ? '#374151' : '#9ca3af' }}>{i + 1}. {l.title}</span>
                      {completedLessonIds.has(l.id) && <Tag color="green" style={{ borderRadius: 6 }}>已完成</Tag>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Empty description="尚未开始学习">
                <Button type="primary" style={{ borderRadius: 10 }} onClick={() => { if (lessons[0]) completeMutation.mutate(lessons[0].id); }}>开始学习</Button>
              </Empty>
            )}
          </Card>
        </Tabs.TabPane>
      </Tabs>

      {/* Edit Course Modal */}
      <Modal title="编辑课程" open={courseModal} onCancel={() => setCourseModal(false)} onOk={() => courseForm.submit()} confirmLoading={courseUpdateMutation.isPending} width={560}>
        <Form form={courseForm} layout="vertical" onFinish={(v) => courseUpdateMutation.mutate(v)}>
          <Form.Item name="title" label="课程名称" rules={[{ required: true }]}><Input style={{ borderRadius: 8 }} /></Form.Item>
          <Form.Item name="description" label="课程描述"><Input.TextArea rows={3} style={{ borderRadius: 8 }} /></Form.Item>
          <Form.Item name="category" label="分类"><Select style={{ borderRadius: 8 }}>{categoryOptions.map((c) => <Select.Option key={c} value={c}>{c}</Select.Option>)}</Select></Form.Item>
          <Form.Item name="duration" label="预计时长（分钟）"><InputNumber min={1} style={{ width: '100%', borderRadius: 8 }} /></Form.Item>
          <Form.Item name="status" label="状态"><Select style={{ borderRadius: 8 }}>{Object.entries(statusOptions).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}</Select></Form.Item>
          <Form.Item name="coverImage" label="封面图链接"><Input style={{ borderRadius: 8 }} placeholder="https://..." /></Form.Item>
          <Upload customRequest={async ({ file, onSuccess, onError }: any) => {
            const f = file as File;
            const validationError = validateImageFile(f);
            if (validationError) { message.warning(validationError); onError?.(new Error(validationError)); return; }
            try { const res = await fileApi.upload(f); courseForm.setFieldsValue({ coverImage: res.data.url }); message.success('封面上传成功'); onSuccess?.(res.data, file); } catch { onError?.(new Error('上传失败')); }
          }} showUploadList={false} accept="image/*">
            <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>上传 Banner 图片</Button>
          </Upload>
        </Form>
      </Modal>

      {/* Lesson Edit Modal */}
      <Modal
        title={lessonModal?.mode === 'edit' ? '编辑课时' : '添加课时'}
        open={!!lessonModal}
        onCancel={() => setLessonModal(null)}
        onOk={() => form.submit()}
        confirmLoading={lessonCreateMutation.isPending || lessonUpdateMutation.isPending}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={(v) => {
          if (lessonModal?.mode === 'edit') lessonUpdateMutation.mutate({ lid: lessonModal.lesson.id, data: v });
          else lessonCreateMutation.mutate(v);
        }}>
          <Form.Item name="title" label="课时标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input style={{ borderRadius: 8 }} placeholder="例如：第一课 - React 入门" />
          </Form.Item>
          <Form.Item name="contentType" label="内容类型" initialValue="RICH_TEXT">
            <Select style={{ borderRadius: 8 }}>
              <Select.Option value="RICH_TEXT">图文内容</Select.Option>
              <Select.Option value="MARKDOWN">Markdown 文档</Select.Option>
              <Select.Option value="VIDEO">视频课程</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="content" label="课程内容">
            <Input.TextArea id="lesson-content-textarea" rows={8} style={{ borderRadius: 8 }} placeholder="支持 Markdown 格式，可上传图片自动插入" />
          </Form.Item>
          <div style={{ marginTop: -8, marginBottom: 16 }}>
            <Upload
              customRequest={async ({ file, onSuccess, onError }: any) => {
                const f = file as File;
                const validationError = validateImageFile(f);
                if (validationError) { message.warning(validationError); onError?.(new Error(validationError)); return; }
                try {
                  const res = await fileApi.upload(f);
                  const md = `![${f.name}](${res.data.url})`;
                  const el = document.getElementById('lesson-content-textarea') as HTMLTextAreaElement;
                  if (el) {
                    const start = el.selectionStart ?? el.value.length;
                    const end = el.selectionEnd ?? el.value.length;
                    const current = form.getFieldValue('content') || '';
                    form.setFieldsValue({ content: current.slice(0, start) + md + current.slice(end) });
                    setTimeout(() => { el.focus(); el.selectionStart = el.selectionEnd = start + md.length; }, 0);
                  } else {
                    form.setFieldsValue({ content: (form.getFieldValue('content') || '') + '\n' + md });
                  }
                  message.success('图片已插入');
                  onSuccess?.(res.data, file);
                } catch { onError?.(new Error('上传失败')); }
              }}
              showUploadList={false}
              accept="image/*"
            >
              <Button size="small" icon={<UploadOutlined />} style={{ borderRadius: 6 }}>上传图片到内容</Button>
            </Upload>
          </div>
          <Form.Item name="videoUrl" label="视频链接">
            <Input style={{ borderRadius: 8 }} placeholder="B站/YouTube 视频嵌入链接" />
          </Form.Item>
          <Form.Item name="order" label="排序号">
            <InputNumber min={1} style={{ width: '100%', borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Lesson View Modal */}
      <Modal title={viewLesson?.title} open={!!viewLesson} onCancel={() => setViewLesson(null)} footer={null} width={800}>
        {viewLesson && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag style={{ borderRadius: 6 }}>{contentTypeLabels[viewLesson.contentType] || '图文'}</Tag>
              {viewLesson.videoUrl && <a href={viewLesson.videoUrl} target="_blank" rel="noreferrer"><Button icon={<PlayCircleOutlined />} style={{ borderRadius: 8 }}>在新窗口打开视频</Button></a>}
            </Space>
            {viewLesson.videoUrl && (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, marginBottom: 16, borderRadius: 12, overflow: 'hidden' }}>
                <iframe src={viewLesson.videoUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
              </div>
            )}
            <div style={{
              background: '#fafafa', padding: 20, borderRadius: 12, minHeight: 200,
              whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 15, color: '#374151',
            }}>
              {viewLesson.content || '暂无内容'}
            </div>
            {!completedLessonIds.has(viewLesson.id) && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={() => { completeMutation.mutate(viewLesson.id); setViewLesson(null); }}
                  style={{ borderRadius: 10, height: 44, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', boxShadow: '0 4px 12px rgba(16,185,129,0.35)' }}>
                  标记为已完成
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Quiz Taking Modal */}
      <Modal title={quizTaking ? `测验：${quizTaking.title}` : '测验'} open={!!quizTaking && !quizResult} onCancel={() => setQuizTaking(null)} footer={null} width={700}>
        {quizTaking?.quiz && (() => {
          let questions: any[];
          try { questions = JSON.parse(quizTaking.quiz.questions || '[]'); } catch { questions = []; }
          if (!questions.length) return <Empty description="暂无题目" />;
          return (
            <Form onFinish={(v) => {
              const answers = questions.map((_: any, i: number) => v[`q_${i}`]);
              quizSubmitMutation.mutate({ lid: quizTaking.id, answers });
            }}>
              {questions.map((q: any, i: number) => (
                <Card key={i} style={{ marginBottom: 12, borderRadius: 12, border: '1px solid rgba(124,58,237,0.08)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>{i + 1}. {q.question}</div>
                  <Form.Item name={`q_${i}`} rules={[{ required: true, message: '请选择答案' }]} style={{ marginBottom: 0 }}>
                    <Radio.Group>
                      <Space direction="vertical">
                        {q.options?.map((opt: string, oi: number) => (
                          <Radio key={oi} value={oi} style={{ padding: '6px 0' }}>{opt}</Radio>
                        ))}
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                </Card>
              ))}
              <Button type="primary" htmlType="submit" loading={quizSubmitMutation.isPending} block size="large"
                style={{ borderRadius: 10, height: 44, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', border: 'none', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}>
                提交答案
              </Button>
            </Form>
          );
        })()}
      </Modal>

      {/* Quiz Result Modal */}
      <Modal title="测验结果" open={!!quizResult} onCancel={() => { setQuizResult(null); setQuizTaking(null); }}
        footer={<Button type="primary" style={{ borderRadius: 10 }} onClick={() => { setQuizResult(null); setQuizTaking(null); }}>完成</Button>}
      >
        {quizResult && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            {quizResult.passed ? (
              <Result status="success" title="恭喜通过！" subTitle={`得分 ${quizResult.score} 分（正确 ${quizResult.correct}/${quizResult.total}）`} icon={<TrophyOutlined style={{ color: '#f59e0b' }} />} />
            ) : (
              <Result status="warning" title="未通过" subTitle={`得分 ${quizResult.score} 分（正确 ${quizResult.correct}/${quizResult.total}，需要 ${quizTaking?.quiz?.passScore || 60} 分）`} extra={<Button onClick={() => { setQuizResult(null); }} style={{ borderRadius: 10 }}>重新答题</Button>} />
            )}
          </div>
        )}
      </Modal>

      {/* Quiz Edit Modal */}
      <Modal title="编辑测验" open={!!quizEditModal} onCancel={() => setQuizEditModal(null)} onOk={() => quizForm.submit()} confirmLoading={quizUpsertMutation.isPending} width={700}>
        <Form form={quizForm} layout="vertical" onFinish={(v) => quizUpsertMutation.mutate({ lid: quizEditModal?.lessonId, data: v })}>
          <Form.Item name="passScore" label="通过分数" initialValue={60}>
            <InputNumber min={0} max={100} style={{ width: '100%', borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="questions" label="题目（JSON 格式）" rules={[{ required: true }]}
            extra='格式：[{"question":"题目","options":["A","B","C","D"],"correctIndex":0}]'>
            <Input.TextArea rows={10} style={{ borderRadius: 8, fontFamily: 'monospace' }} />
          </Form.Item>
          <div style={{ marginTop: -8, marginBottom: 16 }}>
            <Space wrap size={4}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>模板:</span>
              {[
                { label: '单选题', icon: <BorderOutlined />, json: JSON.stringify([{ question: '示例问题', options: ['选项 A', '选项 B', '选项 C', '选项 D'], correctIndex: 0 }], null, 2) },
                { label: '多选题', icon: <CheckSquareOutlined />, json: JSON.stringify([{ question: '示例问题（多选）', options: ['选项 A', '选项 B', '选项 C', '选项 D'], correctIndexes: [0, 2], type: 'multiple' }], null, 2) },
                { label: '判断题', icon: <QuestionCircleOutlined />, json: JSON.stringify([{ question: '这个说法正确吗？', options: ['正确', '错误'], correctIndex: 0 }], null, 2) },
                { label: '填空题', icon: <FieldNumberOutlined />, json: JSON.stringify([{ question: '填空：React 是一个______框架。', options: [], correctAnswer: '前端', type: 'fill' }], null, 2) },
              ].map((tpl) => (
                <Button key={tpl.label} size="small" icon={tpl.icon} style={{ borderRadius: 6, fontSize: 11 }}
                  onClick={() => quizForm.setFieldsValue({ questions: tpl.json })}>
                  {tpl.label}
                </Button>
              ))}
            </Space>
          </div>
        </Form>
        {quizEditModal && (() => {
          const lessonWithQuiz = lessons.find((l: any) => l.id === quizEditModal.lessonId);
          const quizData = lessonWithQuiz?.quiz;
          if (!quizData) return null;
          return (
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16, marginTop: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>测验附件</div>
              <Upload customRequest={async ({ file, onSuccess, onError }: any) => {
                try {
                  const res = await fileApi.upload(file as File);
                  await trainingApi.addQuizAttachment(quizData.id, { filename: (file as File).name, url: res.data.url, size: (file as File).size, mimeType: (file as File).type });
                  invalidate(); message.success('附件上传成功');
                  onSuccess?.(res.data, file);
                } catch (e: any) { message.warning(e?.message || '上传失败'); onError?.(new Error('上传失败')); }
              }} showUploadList={false}>
                <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>上传附件</Button>
              </Upload>
              {quizData.attachments?.length > 0 && (
                <List style={{ marginTop: 12 }} size="small"
                  dataSource={quizData.attachments}
                  renderItem={(att: any) => (
                    <List.Item actions={[
                      <a href={att.url} target="_blank" rel="noreferrer" key="dl">下载</a>,
                      <Popconfirm key="del" title="删除？" onConfirm={() => trainingApi.removeQuizAttachment(att.id).then(() => { invalidate(); message.success('已删除'); })}>
                        <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
                      </Popconfirm>,
                    ]}>
                      <List.Item.Meta avatar={<FileOutlined style={{ color: '#7c3aed' }} />} title={att.filename} description={`${(att.size / 1024).toFixed(1)} KB`} />
                    </List.Item>
                  )} />
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
