import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, AutoComplete, Row, Col, Button, Upload, App, Typography, Tag } from 'antd';
import { UploadOutlined, ThunderboltOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { validateImageFile, fileApi } from '../../api';
import { formatSize, getFileTypeInfo } from '../../utils/format';

interface DocEditorProps {
  open: boolean;
  mode: 'create' | 'edit' | 'template-edit';
  doc?: any;
  template?: any;
  availableCategories: string[];
  availableScenarios: string[];
  availableFolders: string[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
}

const typeOptions = [
  { label: '工作 SOP', value: 'SOP' },
  { label: '制度文档', value: 'POLICY' },
  { label: '正式文档', value: 'FORMAL' },
  { label: 'Wiki 知识', value: 'WIKI' },
];

export default function DocEditor({ open, mode, doc, template, availableCategories, availableScenarios, availableFolders, onClose, onSubmit, loading }: DocEditorProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const isTemplateMode = mode === 'template-edit';
  const isCreateMode = mode === 'create';
  const isSopEdit = mode === 'edit' && doc?.type === 'SOP';

  useEffect(() => {
    if (open) {
      if ((mode === 'edit' || mode === 'template-edit') && doc) {
        form.setFieldsValue({
          ...doc,
          tags: typeof doc.tags === 'string' ? doc.tags : (doc.tags || []).join(', '),
        });
        setReplaceFile(null);
        setCreateFile(null);
        setEditFile(null);
      } else if (template && mode === 'create') {
        form.setFieldsValue({
          title: '',
          type: template.type || 'WIKI',
          category: '',
          folder: template.folder || '',
          tags: template.tags?.join(', ') || '',
          summary: template.description || '',
          content: '',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ type: 'WIKI' });
        setReplaceFile(null);
        setCreateFile(null);
      }
    }
  }, [open, mode, doc, template]);

  const uploadContentImage = async (file: any, onSuccess: any, onError: any) => {
    const f = file as File;
    const err = validateImageFile(f);
    if (err) { message.warning(err); onError?.(new Error(err)); return; }
    try {
      const res = await fileApi.upload(f);
      const md = `![${f.name}](${res.data.url})`;
      const el = document.getElementById('doc-editor-textarea') as HTMLTextAreaElement;
      if (el) {
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const cur = form.getFieldValue('content') || '';
        form.setFieldsValue({ content: cur.slice(0, start) + md + cur.slice(end) });
        setTimeout(() => { el.focus(); el.selectionStart = el.selectionEnd = start + md.length; }, 0);
      } else {
        form.setFieldsValue({ content: (form.getFieldValue('content') || '') + '\n' + md });
      }
      message.success('图片已插入');
      onSuccess?.(res.data, file);
    } catch { onError?.(new Error('上传失败')); }
  };

  const getTitle = () => {
    if (isTemplateMode) return '编辑模板';
    if (mode === 'edit') return '编辑文档';
    return '新建文档';
  };

  const handleFinish = (v: any) => {
    const norm = (val: any) => (Array.isArray(val) ? val[0] : val) || '';
    onSubmit({
      ...v,
      category: norm(v.category),
      scenario: norm(v.scenario),
      folder: norm(v.folder),
      replaceFile: replaceFile || undefined,
      createFile: createFile || undefined,
      editFile: editFile || undefined,
    });
    if (mode === 'create') form.resetFields();
    setReplaceFile(null);
    setCreateFile(null);
    setEditFile(null);
  };

  return (
    <Modal
      title={getTitle()}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={680}
      styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
    >
      {/* Template info banner */}
      {template && mode === 'create' && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 10,
          background: 'linear-gradient(135deg, #faf5ff, #f0f9ff)',
          border: '1px solid rgba(124,58,237,0.08)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <ThunderboltOutlined style={{ color: '#7c3aed', fontSize: 16 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e1b4b' }}>基于模板：{template.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              {template.source === 'builtin'
                ? '可下载 .doc/.ppt/.xls 文件离线编辑，完成后上传为文档附件'
                : '模板文件将自动附加到新文档中'}
            </div>
          </div>
        </div>
      )}

      {/* Template edit banner */}
      {isTemplateMode && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 10,
          background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
          border: '1px solid rgba(249,115,22,0.12)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <ThunderboltOutlined style={{ color: '#f97316', fontSize: 16 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e1b4b' }}>编辑模板：{doc?.title || doc?.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>修改模板元数据或上传新文件替换当前模板。保存后将更新原模板。</div>
          </div>
        </div>
      )}

      <Form form={form} layout="vertical" initialValues={{ type: 'WIKI' }} onFinish={handleFinish}>
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input style={{ borderRadius: 8 }} placeholder={isTemplateMode ? '模板名称' : '输入文档标题'} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="type" label="类型">
              <AutoComplete
                style={{ width: '100%', borderRadius: 8 }}
                placeholder="输入或选择类型"
                options={typeOptions}
                filterOption={(inputValue, option) =>
                  option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1 ||
                  option!.label.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="category" label="分类">
              <Select
                style={{ borderRadius: 8 }} placeholder="输入自定义分类"
                mode="tags"
                maxCount={1}
                options={availableCategories.map((c: string) => ({ label: c, value: c }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.type !== cur.type}>
              {({ getFieldValue }) =>
                getFieldValue('type') === 'SOP' ? (
                  <Form.Item name="scenario" label="SOP 场景">
                    <Select style={{ borderRadius: 8 }} placeholder="输入场景名"
                      mode="tags"
                      maxCount={1}
                      options={availableScenarios.map((s: string) => ({ label: s, value: s }))}
                    />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="folder" label="目录" extra="选择已有目录或输入自定义路径（如：SOP/人力资源）">
              <Select
                style={{ borderRadius: 8 }}
                placeholder="选择或输入目录路径"
                mode="tags"
                maxCount={1}
                options={availableFolders.map((f: string) => ({ label: f, value: f }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="tags" label="标签" extra="多个用英文逗号分隔">
              <Input style={{ borderRadius: 8 }} placeholder="React, 性能优化" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="summary" label="摘要">
          <Input.TextArea rows={2} style={{ borderRadius: 8 }} placeholder="简短摘要（可选）" />
        </Form.Item>

        {/* Create mode: file upload replaces Markdown content */}
        {isCreateMode && (
          <Form.Item label="上传文件（可选）" extra="支持 Word、PPT、Excel、PDF 和图片格式，最大 200MB">
            <Upload
              maxCount={1}
              beforeUpload={(file) => {
                const allowed = [
                  'application/pdf',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  'application/vnd.ms-powerpoint',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  'application/vnd.ms-excel',
                ];
                const isImage = file.type.startsWith('image/');
                if (!allowed.includes(file.type) && !isImage) {
                  message.warning('仅支持 Word、PPT、Excel、PDF 和图片格式');
                  return Upload.LIST_IGNORE;
                }
                if (file.size > 200 * 1024 * 1024) {
                  message.warning('文件大小不能超过 200MB');
                  return Upload.LIST_IGNORE;
                }
                setCreateFile(file);
                return false;
              }}
              onRemove={() => setCreateFile(null)}
            >
              <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>
                {createFile ? '已选择：' + createFile.name : '选择文件'}
              </Button>
            </Upload>
          </Form.Item>
        )}

        {/* Edit mode: SOP → file management; others → Markdown */}
        {mode === 'edit' && !isSopEdit && (
          <>
            <Form.Item name="content" label="内容（Markdown）">
              <Input.TextArea id="doc-editor-textarea" rows={10} style={{ borderRadius: 8, fontFamily: 'monospace' }} placeholder="支持 Markdown 格式..." />
            </Form.Item>
            <div style={{ marginTop: -8 }}>
              <Upload customRequest={async ({ file, onSuccess, onError }: any) => uploadContentImage(file, onSuccess, onError)}
                showUploadList={false} accept="image/*">
                <Button size="small" icon={<UploadOutlined />} style={{ borderRadius: 6 }}>上传图片到内容</Button>
              </Upload>
            </div>
          </>
        )}

        {isSopEdit && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e1b4b', marginBottom: 12 }}>
              SOP 文件
            </div>
            {doc?.attachments?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>当前附件</div>
                {doc.attachments.map((att: any) => {
                  const ft = getFileTypeInfo(att.mimeType || '');
                  return (
                    <div key={att.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10,
                      background: '#f9fafb', border: '1px solid #f0f0f0',
                      marginBottom: 8,
                    }}>
                      <span style={{ fontSize: 24 }}>{ft.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.filename}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                          <Tag color={ft.color} style={{ borderRadius: 4, fontSize: 10, margin: 0, padding: '0 6px' }}>{ft.label}</Tag>
                          <span style={{ marginLeft: 8 }}>{formatSize(att.size)}</span>
                        </div>
                      </div>
                      <Button
                        type="link"
                        size="small"
                        icon={<DownloadOutlined />}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12 }}
                      >
                        下载
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            <Form.Item
              label="替换文件（可选）"
              extra="上传新文件将作为新版本的附件，支持所有文件格式，最大 200MB"
            >
              <Upload
                maxCount={1}
                beforeUpload={(file) => {
                  if (file.size > 200 * 1024 * 1024) {
                    message.warning('文件大小不能超过 200MB');
                    return Upload.LIST_IGNORE;
                  }
                  setEditFile(file);
                  return false;
                }}
                onRemove={() => setEditFile(null)}
                fileList={editFile ? [{ uid: '-1', name: editFile.name, status: 'done' as const }] : []}
              >
                <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>
                  {editFile ? '已选择：' + editFile.name : '选择新文件'}
                </Button>
              </Upload>
            </Form.Item>
            <Form.Item name="changelog" label="变更说明" extra="描述此次修改的内容，将展示在版本历史中">
              <Input.TextArea
                rows={2}
                style={{ borderRadius: 8 }}
                placeholder="例：更新了入职材料清单，增加了背景调查步骤"
              />
            </Form.Item>
          </div>
        )}

        {/* File replace for template edit mode */}
        {isTemplateMode && (
          <Form.Item label="替换模板文件（可选）" extra="上传新文件以替换当前模板文件。留空则仅更新模板信息。">
            <Upload
              maxCount={1}
              beforeUpload={(file) => {
                const allowed = [
                  'application/pdf',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  'application/vnd.ms-powerpoint',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  'application/vnd.ms-excel',
                ];
                const isImage = file.type.startsWith('image/');
                if (!allowed.includes(file.type) && !isImage) {
                  message.warning('仅支持 Word、PPT、Excel、PDF 和图片格式');
                  return Upload.LIST_IGNORE;
                }
                if (file.size > 200 * 1024 * 1024) {
                  message.warning('文件大小不能超过 200MB');
                  return Upload.LIST_IGNORE;
                }
                setReplaceFile(file);
                return false;
              }}
              onRemove={() => setReplaceFile(null)}
            >
              <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>
                {replaceFile ? '已选择：' + replaceFile.name : '选择新文件'}
              </Button>
            </Upload>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
