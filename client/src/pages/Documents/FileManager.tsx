import { useState } from 'react';
import { Input, Button, Upload, Card, Row, Col, Popconfirm, Image, App } from 'antd';
import { UploadOutlined, DeleteOutlined, SearchOutlined, InboxOutlined } from '@ant-design/icons';
import { fileApi } from '../../api';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

const fileTypeIcon = (mime: string) => {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return null; // use Image component
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return '📊';
  if (mime.includes('document') || mime.includes('word')) return '📝';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📽';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  return '📄';
};

const formatSize = (b: number) => {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

interface FileManagerProps {
  files: any[];
  fileSearch: string;
  onSearchChange: (v: string) => void;
}

export default function FileManager({ files, fileSearch, onSearchChange }: FileManagerProps) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const uploadFile = async (file: any, onSuccess: any, onError: any) => {
    try {
      const res = await fileApi.upload(file as File);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      message.success('上传成功');
      onSuccess?.(res.data, file);
    } catch (e: any) { message.warning(e?.message || '上传失败'); onError?.(new Error('上传失败')); }
  };

  const deleteFile = async (id: string) => {
    await fileApi.remove(id);
    queryClient.invalidateQueries({ queryKey: ['files'] });
    message.success('文件已删除');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          placeholder="搜索文件名..."
          style={{ width: 240, borderRadius: 10 }}
          value={fileSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
        />
        <Upload customRequest={async ({ file, onSuccess, onError }: any) => uploadFile(file, onSuccess, onError)} showUploadList={false}>
          <Button icon={<UploadOutlined />} type="primary"
            style={{ borderRadius: 10, height: 37, fontWeight: 500, background: '#059669', borderColor: '#059669', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
            上传文件
          </Button>
        </Upload>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{files.length} 个文件</span>
      </div>

      {files.length > 0 ? (
        <Row gutter={[14, 14]}>
          {files.map((f: any) => (
            <Col xs={12} sm={8} md={6} lg={4} key={f.id}>
              <Card
                hoverable
                size="small"
                style={{
                  borderRadius: 14, border: '1px solid rgba(0,0,0,0.04)', textAlign: 'center', overflow: 'hidden',
                  transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                }}
                bodyStyle={{ padding: '18px 14px 14px' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
                  e.currentTarget.style.borderColor = '#a7f3d0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.04)';
                }}
                actions={[
                  <a href={f.url} target="_blank" rel="noreferrer" key="dl" style={{ fontSize: 12 }}>下载</a>,
                  <Popconfirm key="del" title="删除？" onConfirm={() => deleteFile(f.id)}>
                    <DeleteOutlined style={{ color: '#ef4444', fontSize: 13 }} />
                  </Popconfirm>,
                ]}
              >
                {f.mimeType?.startsWith('image/') ? (
                  <Image src={f.url} alt={f.filename} style={{ maxHeight: 90, borderRadius: 8, objectFit: 'cover', width: '100%' }} preview={{ mask: '预览' }} />
                ) : (
                  <div style={{ fontSize: 42, marginBottom: 12, marginTop: 4 }}>{fileTypeIcon(f.mimeType)}</div>
                )}
                <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 4 }}>
                  {f.filename}
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                  {formatSize(f.size)} · {dayjs(f.createdAt).format('MM-DD HH:mm')}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Card style={{ borderRadius: 20, textAlign: 'center', padding: 48, background: 'linear-gradient(135deg, #fafafa, #f5f5f5)', border: '1px solid rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}><InboxOutlined style={{ color: '#d1d5db' }} /></div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1e1b4b', marginBottom: 4 }}>暂无文件</div>
          <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 8 }}>上传文件到团队共享空间</div>
          <Upload customRequest={async ({ file, onSuccess, onError }: any) => uploadFile(file, onSuccess, onError)} showUploadList={false}>
            <Button icon={<UploadOutlined />} type="primary" size="large" style={{ borderRadius: 10, marginTop: 8 }}>上传文件</Button>
          </Upload>
        </Card>
      )}
    </div>
  );
}
