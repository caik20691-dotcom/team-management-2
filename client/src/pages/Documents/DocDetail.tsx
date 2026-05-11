import { useState } from 'react';
import { Modal, Tag, Space, Typography, Button, List, Empty, Popconfirm, Upload, App, Image, Spin, Timeline } from 'antd';
import { EditOutlined, DeleteOutlined, UploadOutlined, ClockCircleOutlined, UserOutlined, EyeOutlined, HistoryOutlined, DownloadOutlined } from '@ant-design/icons';
import { fileApi, documentApi } from '../../api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const typeMetaMap: Record<string, any> = {
  SOP:    { label: '工作 SOP', icon: '⚡', color: 'orange', gradient: ['#fff7ed','#ffedd5'], accent: '#f97316' },
  POLICY: { label: '制度文档', icon: '📜', color: 'cyan',   gradient: ['#ecfeff','#cffafe'], accent: '#0891b2' },
  FORMAL: { label: '正式文档', icon: '📄', color: 'blue',   gradient: ['#eff6ff','#dbeafe'], accent: '#3b82f6' },
  WIKI:   { label: 'Wiki 知识', icon: '📖', color: 'purple', gradient: ['#faf5ff','#f3e8ff'], accent: '#7c3aed' },
};

const fileTypeIcon = (mime: string) => {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼';
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return '📊';
  if (mime.includes('document') || mime.includes('word')) return '📝';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📽';
  if (mime.startsWith('video/')) return '🎬';
  return '📄';
};

const formatSize = (b: number) => {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

interface DocDetailProps {
  detail: any;
  open: boolean;
  onClose: () => void;
  onEdit: (doc: any) => void;
  onDelete: (id: string) => void;
  isAdmin?: boolean;
  onViewVersion?: (docId: string) => void;
}

export default function DocDetail({ detail, open, onClose, onEdit, onDelete, isAdmin, onViewVersion }: DocDetailProps) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [showVersions, setShowVersions] = useState(false);

  const groupId = detail?.sopGroupId || detail?.id;
  const { data: versionHistory, isLoading: versionsLoading } = useQuery({
    queryKey: ['document-versions', groupId],
    queryFn: () => documentApi.getVersionHistory(groupId).then((r: any) => r.data),
    enabled: !!open && !!groupId && showVersions,
  });

  if (!detail) return null;
  const meta = typeMetaMap[detail.type] || typeMetaMap.WIKI;
  const isSOP = detail.type === 'SOP';

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      width={820}
      styles={{ body: { padding: 0 } }}
    >
      {/* Header */}
        <div style={{
          padding: '26px 26px 16px',
          background: `linear-gradient(135deg, ${meta.gradient[0]}, ${meta.gradient[1]})`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {meta.icon}
                </div>
                <Title level={4} style={{ margin: 0, fontWeight: 700 }}>{detail.title}</Title>
                {isSOP && <Tag color="blue" style={{ borderRadius: 6, marginLeft: 2 }}>v{detail.version || 1}</Tag>}
              </div>
              <Space size={4} wrap>
                <Tag color={meta.color} style={{ borderRadius: 6 }}>{meta.label}</Tag>
                {detail.scenario && <Tag color="orange" style={{ borderRadius: 6 }}>{detail.scenario}</Tag>}
                {detail.category && <Tag style={{ borderRadius: 6 }}>{detail.category}</Tag>}
                {detail.folder && <Tag color="purple" style={{ borderRadius: 6 }}>📂 {detail.folder}</Tag>}
                {detail.tags?.split(',').filter(Boolean).map((t: string) => <Tag key={t} style={{ borderRadius: 6 }}>{t.trim()}</Tag>)}
              </Space>
            </div>
            <Space>
              <Button icon={<EditOutlined />} onClick={() => onEdit(detail)} style={{ borderRadius: 8, background: 'rgba(255,255,255,0.8)' }}>编辑</Button>
              <Popconfirm title="确定删除？" onConfirm={() => onDelete(detail.id)}>
                <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }}>删除</Button>
              </Popconfirm>
            </Space>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', display: 'flex', gap: 16 }}>
            <span><UserOutlined style={{ marginRight: 4 }} />{detail.author?.name}</span>
            <span><ClockCircleOutlined style={{ marginRight: 4 }} />{dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm')}</span>
            <span><EyeOutlined style={{ marginRight: 4 }} />{detail.viewCount} 次浏览</span>
          </div>
          {detail.summary && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, fontSize: 13, color: '#4b5563', backdropFilter: 'blur(4px)' }}>
              {detail.summary}
            </div>
          )}
        </div>

        {/* SOP File Preview */}
        {isSOP && detail.attachments?.length > 0 && (
          <div style={{ padding: '16px 26px 0', borderBottom: '1px solid #f3f4f6' }}>
            {detail.attachments.map((att: any) => {
              const mime = att.mimeType || '';
              if (mime.startsWith('image/')) {
                return (
                  <div key={att.id} style={{ marginBottom: 16, textAlign: 'center' }}>
                    <Image src={att.url} alt={att.filename} style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: 8 }} />
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{att.filename}</Text>
                    </div>
                  </div>
                );
              }
              if (mime === 'application/pdf') {
                return (
                  <div key={att.id} style={{ marginBottom: 16 }}>
                    <iframe src={att.url} style={{ width: '100%', height: '50vh', border: 'none', borderRadius: 8 }} title={att.filename} />
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{att.filename}</Text>
                    </div>
                  </div>
                );
              }
              return (
                <div key={att.id} style={{
                  marginBottom: 16, padding: '16px 20px',
                  background: '#f9fafb', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>{att.filename}</Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>{formatSize(att.size)}</Text>
                  </div>
                  <Button
                    icon={<DownloadOutlined />}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    size="small"
                    style={{ borderRadius: 6 }}
                  >
                    下载查看
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '4px 26px 20px', borderBottom: '1px solid #f3f4f6', minHeight: 120 }}>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.9, fontSize: 14, color: '#374151' }}>
            {detail.content || <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>暂无内容</div>}
          </div>
        </div>

        {/* Version History (admin only for SOP) */}
        {isSOP && isAdmin && (
          <div style={{ padding: '12px 26px', borderBottom: '1px solid #f3f4f6' }}>
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => setShowVersions(!showVersions)}
              style={{ fontSize: 13, color: '#6b7280', padding: 0, fontWeight: 500 }}
            >
              版本历史
              {showVersions ? ' ▲' : ' ▼'}
            </Button>
            {showVersions && (
              <div style={{ marginTop: 12 }}>
                {versionsLoading ? (
                  <Spin size="small" />
                ) : (
                  <Timeline
                    items={(versionHistory || []).map((v: any) => ({
                      color: v.id === detail.id ? 'blue' : 'gray',
                      children: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Tag color={v.id === detail.id ? 'blue' : 'default'} style={{ borderRadius: 6, margin: 0, fontSize: 11 }}>
                            v{v.version}
                          </Tag>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Text style={{ fontSize: 13 }}>
                              {v.title}
                              {v.changelog && <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>— {v.changelog}</Text>}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {v.author?.name} · {dayjs(v.createdAt).format('YYYY-MM-DD HH:mm')}
                            </Text>
                          </div>
                          {v.id !== detail.id && onViewVersion && (
                            <Button
                              type="link"
                              size="small"
                              onClick={() => onViewVersion(v.id)}
                              style={{ fontSize: 11, padding: 0 }}
                            >
                              查看
                            </Button>
                          )}
                          {v.id === detail.id && (
                            <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>当前</Text>
                          )}
                        </div>
                      ),
                    }))}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Attachments */}
        <div style={{ padding: '18px 26px 26px' }}>
          <div style={{ fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>附件 ({detail.attachments?.length || 0})</span>
            <Upload customRequest={async ({ file, onSuccess, onError }: any) => {
              try {
                const f = file as File;
                const res = await fileApi.uploadAny(f);
                await documentApi.addAttachment(detail.id, { filename: f.name, url: res.data.url, size: f.size, mimeType: f.type });
                queryClient.invalidateQueries({ queryKey: ['document', detail.id] });
                queryClient.invalidateQueries({ queryKey: ['documents'] });
                message.success('上传成功');
                onSuccess?.(res.data, file);
              } catch (e: any) { message.warning(e?.message || '上传失败'); onError?.(new Error('上传失败')); }
            }} showUploadList={false}>
              <Button icon={<UploadOutlined />} size="small" style={{ borderRadius: 8 }}>上传附件</Button>
            </Upload>
          </div>
          {detail.attachments?.length > 0 ? (
            <List size="small" dataSource={detail.attachments}
              renderItem={(att: any) => (
                <List.Item style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.01)', marginBottom: 6 }}
                  actions={[
                    <a href={att.url} target="_blank" rel="noreferrer" key="dl" style={{ fontSize: 12 }}>下载</a>,
                    <Popconfirm key="del" title="删除？" onConfirm={() => documentApi.removeAttachment(detail.id, att.id).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['document', detail.id] });
                      queryClient.invalidateQueries({ queryKey: ['documents'] });
                      message.success('已删除');
                    })}>
                      <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
                    </Popconfirm>,
                  ]}>
                  <List.Item.Meta
                    avatar={<span style={{ fontSize: 20 }}>{fileTypeIcon(att.mimeType)}</span>}
                    title={att.filename}
                    description={`${formatSize(att.size)} · ${att.mimeType}`}
                  />
                </List.Item>
              )} />
          ) : <Empty description="暂无附件" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        </div>
    </Modal>
  );
}
