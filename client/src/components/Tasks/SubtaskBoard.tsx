import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Form, Input, Select, DatePicker, Row, Col, Spin, Alert, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { taskApi, userApi } from '../../api';
import { useKanbanBoard } from '../../hooks/useKanbanBoard';
import KanbanBoardView from './KanbanBoardView';

interface SubtaskBoardProps {
  parentId: string;
  projectId?: string;
  compact?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'TODO', label: '待处理' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'REVIEW', label: '审核中' },
  { value: 'DONE', label: '已完成' },
];

export default function SubtaskBoard({ parentId, projectId, compact = false }: SubtaskBoardProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['subtasks', parentId],
    queryFn: () => taskApi.list({ parentId, pageSize: '200' }).then((r: any) => r.data),
    enabled: !!parentId,
  });

  const { data: usersResp } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.list().then((r: any) => r.data),
  });

  const tasks: any[] = data?.data || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      taskApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentId] });
      queryClient.invalidateQueries({ queryKey: ['task', parentId] });
      if (projectId) queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      message.success('已更新');
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: any) =>
      taskApi.create({
        ...values,
        parentId,
        projectId: projectId || values.projectId,
        dueDate: values.dueDate?.toISOString?.() ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentId] });
      queryClient.invalidateQueries({ queryKey: ['task', parentId] });
      if (projectId) queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      message.success('子任务已创建');
      setModalOpen(false);
      form.resetFields();
    },
  });

  const { draggedTaskId, setDraggedTaskId, dragOverCol, setDragOverCol, getTasksByStatus, handleDrop } =
    useKanbanBoard({ tasks, onUpdateStatus: (id, st) => updateMutation.mutate({ id, status: st }) });

  return (
    <Spin spinning={isLoading}>
      {isError && (
        <Alert type="error" message="子任务加载失败" description={(error as any)?.message} style={{ marginBottom: 12 }} />
      )}

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
        onCardClick={(taskId) => window.open(`/tasks/${taskId}`, '_blank')}
        compact={compact}
        emptyText="暂无子任务，点击下方按钮创建"
        header={
          <div style={{ marginBottom: compact ? 8 : 16 }}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              size={compact ? 'small' : 'middle'}
              onClick={() => {
                form.resetFields();
                form.setFieldsValue({ status: 'TODO', priority: 'MEDIUM' });
                setModalOpen(true);
              }}
              style={{ borderRadius: 8 }}
            >
              添加子任务
            </Button>
          </div>
        }
      />

      <Modal
        title="创建子任务"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="子任务标题" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="状态">
                <Select options={STATUS_OPTIONS} style={{ borderRadius: 8 }} />
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
    </Spin>
  );
}
