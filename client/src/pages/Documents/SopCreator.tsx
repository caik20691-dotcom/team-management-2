import { useState } from 'react';
import { Modal, Form, Input, Select, Button, Upload, App, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, ThunderboltOutlined } from '@ant-design/icons';

interface SopStep {
  key: string;
  content: string;
}

interface SopCreatorProps {
  open: boolean;
  availableScenarios: string[];
  availableCategories: string[];
  availableFolders: string[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

let stepCounter = 0;
function nextStepKey() {
  stepCounter += 1;
  return `step_${stepCounter}_${Date.now()}`;
}

function stepsToMarkdown(steps: SopStep[]): string {
  return steps
    .filter((s) => s.content.trim())
    .map((s, i) => {
      const lines = s.content.split('\n').filter((line) => line.trim());
      if (lines.length === 0) return '';
      const title = lines[0];
      let md = `## Step ${i + 1}: ${title}`;
      if (lines.length > 1) {
        md += '\n' + lines.slice(1).map((line) => `- ${line}`).join('\n');
      }
      return md;
    })
    .filter(Boolean)
    .join('\n\n');
}

export default function SopCreator({
  open,
  availableScenarios,
  availableCategories,
  availableFolders,
  onClose,
  onSubmit,
}: SopCreatorProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [steps, setSteps] = useState<SopStep[]>([
    { key: nextStepKey(), content: '' },
    { key: nextStepKey(), content: '' },
  ]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAddStep = () => {
    setSteps((prev) => [...prev, { key: nextStepKey(), content: '' }]);
  };

  const handleRemoveStep = (key: string) => {
    setSteps((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s.key !== key);
    });
  };

  const handleStepChange = (key: string, value: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, content: value } : s)),
    );
  };

  const handleFinish = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const content = stepsToMarkdown(steps);
      const norm = (v: any) => (Array.isArray(v) ? v[0] : v) || '';
      const data: any = {
        title: values.title,
        type: 'SOP',
        scenario: norm(values.scenario),
        category: norm(values.category),
        folder: norm(values.folder),
        tags: values.tags || '',
        summary: values.summary || '',
        content,
        sopFile: uploadFile || undefined,
      };

      await onSubmit(data);
      // Reset
      setSteps([
        { key: nextStepKey(), content: '' },
        { key: nextStepKey(), content: '' },
      ]);
      setUploadFile(null);
      form.resetFields();
    } catch (e: any) {
      if (e?.errorFields) return; // form validation error
      message.error(e?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSteps([
      { key: nextStepKey(), content: '' },
      { key: nextStepKey(), content: '' },
    ]);
    setUploadFile(null);
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThunderboltOutlined style={{ color: '#f97316', fontSize: 18 }} />
          <span>新建 SOP</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      onOk={handleFinish}
      confirmLoading={submitting}
      width={720}
      styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
      okText="创建 SOP"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="title"
              label="SOP 名称"
              rules={[{ required: true, message: '请输入 SOP 名称' }]}
            >
              <Input
                style={{ borderRadius: 8 }}
                placeholder="例：新员工入职流程、客户投诉处理SOP"
              />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              name="scenario"
              label="应用场景"
              rules={[{ required: true, message: '请选择或输入场景' }]}
            >
              <Select
                style={{ borderRadius: 8 }}
                placeholder="选择或输入场景"
                mode="tags"
                maxCount={1}
                options={availableScenarios.map((s: string) => ({
                  label: s,
                  value: s,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* File Upload — primary SOP content */}
        <Form.Item
          label="SOP 文件（推荐）"
          extra="上传 Word/PPT/Excel/PDF/图片等格式的 SOP 文件，便于团队预览和下载"
          style={{ marginBottom: 20 }}
        >
          <Upload
            maxCount={1}
            beforeUpload={(file) => {
              if (file.size > 200 * 1024 * 1024) {
                message.warning('文件大小不能超过 200MB');
                return Upload.LIST_IGNORE;
              }
              setUploadFile(file);
              return false;
            }}
            onRemove={() => setUploadFile(null)}
            fileList={uploadFile ? [{ uid: '-1', name: uploadFile.name, status: 'done' as const }] : []}
          >
            <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>
              {uploadFile ? '已选择：' + uploadFile.name : '选择文件'}
            </Button>
          </Upload>
        </Form.Item>

        {/* Steps Editor */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1e1b4b' }}>
              操作步骤
            </span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {steps.length} 个步骤
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((step, i) => (
              <div
                key={step.key}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.06)',
                  background: '#fafbfc',
                  transition: 'all 0.15s',
                }}
              >
                {/* Step number badge */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background:
                      i === 0
                        ? 'linear-gradient(135deg, #f97316, #fb923c)'
                        : i === steps.length - 1
                          ? 'linear-gradient(135deg, #10b981, #34d399)'
                          : 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <Input.TextArea
                    placeholder={`步骤 ${i + 1}：第一行为步骤标题，后续行为具体操作项&#10;例：&#10;准备入职材料&#10;收集身份证复印件&#10;开通企业邮箱和账号`}
                    value={step.content}
                    onChange={(e) =>
                      handleStepChange(step.key, e.target.value)
                    }
                    rows={4}
                    style={{ borderRadius: 8, fontSize: 13 }}
                  />
                </div>

                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveStep(step.key)}
                  disabled={steps.length <= 1}
                  style={{ flexShrink: 0, marginTop: 4 }}
                />
              </div>
            ))}
          </div>

          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={handleAddStep}
            style={{
              marginTop: 12,
              borderRadius: 10,
              height: 40,
              borderColor: 'rgba(249,115,22,0.3)',
              color: '#f97316',
            }}
          >
            添加步骤
          </Button>
        </div>

        {/* Secondary fields */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="category" label="分类（可选）">
              <Select
                style={{ borderRadius: 8 }}
                placeholder="输入自定义分类"
                mode="tags"
                maxCount={1}
                options={availableCategories.map((c: string) => ({
                  label: c,
                  value: c,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="folder" label="目录（可选）" extra="选择已有目录或输入自定义路径">
              <Select
                style={{ borderRadius: 8 }}
                placeholder="选择或输入目录路径"
                mode="tags"
                maxCount={1}
                options={availableFolders.map((f: string) => ({ label: f, value: f }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="tags" label="标签（可选）" extra="多个用英文逗号分隔">
          <Input style={{ borderRadius: 8 }} placeholder="入职, 人力资源" />
        </Form.Item>

        <Form.Item name="summary" label="摘要（可选）">
          <Input.TextArea
            rows={2}
            style={{ borderRadius: 8 }}
            placeholder="简要描述此 SOP 的适用范围和目的"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
