import { useState } from 'react';
import {
  Input, Card, Row, Col, Tag, Typography, Empty, Button,
  Modal, Form, Upload, App, Select,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, DownloadOutlined,
  DeleteOutlined, UploadOutlined, EditOutlined,
} from '@ant-design/icons';
import { templates, templateCategories, uploadTemplateCategory, downloadTemplate, DocTemplate, formatLabel, formatColor } from './templates';

const { Text, Title } = Typography;

interface TemplateCenterProps {
  onSelectTemplate: (template: any) => void;
  onCreateBlank: () => void;
  uploadedTemplates: DocTemplate[];
  onUploadTemplate: (file: File, name: string, description: string, category: string) => void;
  onDeleteUploadedTemplate: (id: string) => void;
  onEditTemplate: (template: DocTemplate) => void;
}

const allCategories = [...templateCategories, uploadTemplateCategory];

export default function TemplateCenter({
  onSelectTemplate, onCreateBlank, uploadedTemplates,
  onUploadTemplate, onDeleteUploadedTemplate, onEditTemplate,
}: TemplateCenterProps) {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string | undefined>();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadForm] = Form.useForm();
  const { message } = App.useApp();

  const allTemplates = [...templates, ...uploadedTemplates];

  const filtered = allTemplates.filter((t) => {
    if (activeCat && t.category !== activeCat) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.name.toLowerCase().includes(s) || t.description.toLowerCase().includes(s) || t.tags.some((tag: string) => tag.includes(s));
    }
    return true;
  });

  const grouped = allCategories.map((cat) => {
    const catTemplates = filtered.filter((t) => t.category === cat.key);
    return { ...cat, templates: catTemplates };
  }).filter((g) => g.templates.length > 0);

  const handleUpload = () => {
    uploadForm.validateFields().then((values: any) => {
      const file = values.file?.file;
      if (!file) return;
      onUploadTemplate(file, values.name, values.description || '', values.category || 'uploaded');
      setUploadModalOpen(false);
      uploadForm.resetFields();
      message.success('模板已上传，可在"我的模板"中查看');
    });
  };

  const isBuiltin = (t: DocTemplate) => t.source === 'builtin';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, marginBottom: 4, fontWeight: 700 }}>📝 模板中心</Title>
        <Text type="secondary">下载 Office 模板离线编辑，或上传自定义模板供团队使用</Text>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          placeholder="搜索模板..."
          style={{ width: 260, borderRadius: 10 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Tag
            style={{ cursor: 'pointer', borderRadius: 8, padding: '4px 14px', fontSize: 12 }}
            color={!activeCat ? 'purple' : undefined}
            onClick={() => setActiveCat(undefined)}
          >
            全部
          </Tag>
          {allCategories.map((cat) => (
            <Tag
              key={cat.key}
              style={{ cursor: 'pointer', borderRadius: 8, padding: '4px 14px', fontSize: 12 }}
              color={activeCat === cat.key ? 'purple' : undefined}
              onClick={() => setActiveCat(activeCat === cat.key ? undefined : cat.key)}
            >
              {cat.icon} {cat.label}
            </Tag>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<PlusOutlined />} onClick={onCreateBlank} style={{ borderRadius: 10 }}>
          空白文档
        </Button>
        <Button icon={<UploadOutlined />} type="primary" onClick={() => setUploadModalOpen(true)}
          style={{ borderRadius: 10, fontWeight: 500, boxShadow: '0 4px 14px rgba(124,58,237,0.2)' }}>
          上传模板
        </Button>
      </div>

      {/* Template list */}
      {grouped.length > 0 ? (
        <div>
          {grouped.map((group) => (
            <div key={group.key} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 18 }}>{group.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1e1b4b' }}>{group.label}</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>({group.templates.length} 个模板)</span>
              </div>
              <Row gutter={[14, 14]}>
                {group.templates.map((t) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={t.id}>
                    <Card
                      hoverable
                      onClick={() => onSelectTemplate(t)}
                      style={{
                        borderRadius: 14, height: '100%', border: '1px solid rgba(0,0,0,0.05)',
                        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                        borderTop: isBuiltin(t) ? `3px solid ${formatColor(t.outputFormat)}` : '3px solid #7c3aed',
                      }}
                      bodyStyle={{ padding: '18px 16px' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      actions={[
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => { e.stopPropagation(); onEditTemplate(t); }}
                          key="edit"
                          style={{ fontSize: 12, color: '#6b7280' }}
                        >
                          编辑
                        </Button>,
                        <Button
                          type="text"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={(e) => { e.stopPropagation(); downloadTemplate(t); }}
                          key="dl"
                          style={{ fontSize: 12, color: '#6b7280' }}
                        >
                          下载
                        </Button>,
                        ...(isBuiltin(t) ? [] : [
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => { e.stopPropagation(); onDeleteUploadedTemplate(t.id); }}
                            key="del"
                            style={{ fontSize: 12 }}
                          >
                            删除
                          </Button>,
                        ]),
                      ]}
                    >
                      <div style={{ fontSize: 36, marginBottom: 8 }}>{t.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#1e1b4b' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, lineHeight: 1.5 }}>{t.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Tag color={isBuiltin(t) ? formatColor(t.outputFormat) : 'blue'} style={{ borderRadius: 5, fontSize: 10, margin: 0, fontWeight: 600 }}>
                          {isBuiltin(t) ? formatLabel(t.outputFormat) : (t.fileType ? t.fileType.split('/').pop()?.toUpperCase() : '文件')}
                        </Tag>
                        {!isBuiltin(t) && t.fileSize && (
                          <Tag style={{ borderRadius: 5, fontSize: 10, margin: 0 }}>{formatSize(t.fileSize)}</Tag>
                        )}
                        {t.tags.slice(0, 2).map((tag: string) => (
                          <Tag key={tag} style={{ borderRadius: 5, fontSize: 10, margin: 0 }}>{tag}</Tag>
                        ))}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </div>
      ) : (
        <Empty description="没有找到匹配的模板" style={{ marginTop: 60 }} />
      )}

      {/* Upload Template Modal */}
      <Modal
        title="上传模板"
        open={uploadModalOpen}
        onCancel={() => { setUploadModalOpen(false); uploadForm.resetFields(); }}
        onOk={handleUpload}
        okText="上传"
        width={560}
      >
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 10,
          background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)',
          border: '1px solid rgba(59,130,246,0.1)',
          fontSize: 12, color: '#6b7280',
        }}>
          上传 Office 文件（Word/PPT/Excel）或 PDF/图片作为新模板。如需替换内置模板，下载内置模板编辑后在此上传为自定义模板。
        </div>
        <Form form={uploadForm} layout="vertical">
          <Form.Item name="file" label="模板文件" rules={[{ required: true, message: '请选择文件' }]} valuePropName="file">
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
                const isAllowed = allowed.includes(file.type) || isImage;
                if (!isAllowed) {
                  message.warning('仅支持 Word、PPT、Excel、PDF 和图片格式');
                  return Upload.LIST_IGNORE;
                }
                if (file.size > 200 * 1024 * 1024) {
                  message.warning('文件大小不能超过 200MB');
                  return Upload.LIST_IGNORE;
                }
                return false;
              }}
            >
              <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>选择文件</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input style={{ borderRadius: 8 }} placeholder="例：项目启动会议模板" />
          </Form.Item>
          <Form.Item name="description" label="模板描述">
            <Input.TextArea rows={2} style={{ borderRadius: 8 }} placeholder="简要描述模板用途..." />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input style={{ borderRadius: 8 }} placeholder="例：项目管理、设计评审（可自定义）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function formatSize(b: number) {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
