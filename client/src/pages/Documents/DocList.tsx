import { useState, useMemo } from 'react';
import { Input, Select, Button, Tag, Space, Typography, Divider, Empty, Popconfirm } from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, DownOutlined, UpOutlined, ClockCircleOutlined, UserOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface DocListProps {
  docs: any[];
  allTags: string[];
  folders: string[];
  activeFolder: string;
  typeMetaMap: Record<string, any>;
  onCreateDoc: (type?: string) => void;
  onDocClick: (doc: any) => void;
  onEditDoc: (doc: any) => void;
  onDeleteDoc: (id: string) => void;
}

export default function DocList({ docs, allTags, folders, activeFolder, typeMetaMap, onCreateDoc, onDocClick, onEditDoc, onDeleteDoc }: DocListProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [tagFilter, setTagFilter] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = docs;
    if (activeFolder) {
      result = result.filter((d: any) => d.folder === activeFolder || d.folder?.startsWith(activeFolder + '/'));
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((d: any) =>
        d.title?.toLowerCase().includes(s) || d.summary?.toLowerCase().includes(s) || d.content?.toLowerCase().includes(s)
      );
    }
    if (typeFilter) result = result.filter((d: any) => d.type === typeFilter);
    if (tagFilter) result = result.filter((d: any) => d.tags?.includes(tagFilter));
    return result;
  }, [docs, activeFolder, search, typeFilter, tagFilter]);

  const availableTypes = useMemo(() => {
    const s = new Set<string>();
    docs.forEach((d: any) => s.add(d.type));
    return [...s];
  }, [docs]);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          placeholder="搜索标题、内容..."
          style={{ width: 240, borderRadius: 10 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
        <Select
          allowClear
          placeholder="类型筛选"
          style={{ width: 120, borderRadius: 10 }}
          value={typeFilter}
          onChange={setTypeFilter}
          options={availableTypes.map((t) => ({ label: typeMetaMap[t]?.label || t, value: t }))}
        />
        {activeFolder && (
          <Tag closable onClose={() => {}} color="purple" style={{ borderRadius: 6 }}>
            📂 {activeFolder}
          </Tag>
        )}
        <Space size={4} wrap>
          {(allTags || []).slice(0, 6).map((t: string) => (
            <Tag
              key={t}
              style={{ cursor: 'pointer', borderRadius: 8, padding: '2px 10px' }}
              color={tagFilter === t ? 'purple' : undefined}
              onClick={() => setTagFilter(tagFilter === t ? undefined : t)}
            >
              {t}
            </Tag>
          ))}
        </Space>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{filtered.length} 篇文档</span>
        <Button
          icon={<PlusOutlined />}
          type="primary"
          onClick={() => onCreateDoc()}
          style={{ borderRadius: 10, height: 37, fontWeight: 500, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}
        >
          新建文档
        </Button>
      </div>

      {/* Doc list */}
      {filtered.length > 0 ? (
        <div>
          {filtered.map((item: any) => {
            const meta = typeMetaMap[item.type] || typeMetaMap.WIKI;
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                style={{
                  background: isExpanded ? '#fff' : '#fafbfc',
                  borderRadius: 14, marginBottom: 10,
                  border: isExpanded ? `1px solid ${meta.accent}30` : '1px solid rgba(0,0,0,0.04)',
                  boxShadow: isExpanded ? '0 8px 24px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 18px', cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${meta.gradient[0]}, ${meta.gradient[1]})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                    color: meta.accent,
                  }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text strong style={{ fontSize: 14, color: '#1e1b4b' }} ellipsis={{ tooltip: item.title }}>
                        {item.title}
                      </Text>
                      <Tag color={meta.color} style={{ borderRadius: 5, fontSize: 10, lineHeight: '16px', margin: 0 }}>{meta.label}</Tag>
                      {item.folder && <Tag style={{ borderRadius: 5, fontSize: 10, lineHeight: '16px', margin: 0 }}>📂 {item.folder}</Tag>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}><UserOutlined style={{ fontSize: 11 }} />{item.author?.name || '-'}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}><ClockCircleOutlined style={{ fontSize: 11 }} />{dayjs(item.updatedAt).format('MM-DD')}</span>
                    {item.viewCount > 0 && (
                      <span style={{ fontSize: 12, color: '#9ca3af' }}><EyeOutlined style={{ fontSize: 11 }} />{item.viewCount}</span>
                    )}
                  </div>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, background: isExpanded ? `${meta.accent}15` : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0,
                    color: isExpanded ? meta.accent : '#9ca3af',
                  }}>
                    {isExpanded ? <UpOutlined style={{ fontSize: 12 }} /> : <DownOutlined style={{ fontSize: 12 }} />}
                  </div>
                </div>

                {/* Expanded body */}
                <div style={{
                  maxHeight: isExpanded ? 600 : 0, opacity: isExpanded ? 1 : 0,
                  overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease',
                }}>
                  <div style={{ padding: '0 18px 18px' }}>
                    <Divider style={{ margin: '0 0 14px', borderColor: '#f3f4f6' }} />
                    {item.summary && (
                      <div style={{
                        padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                        background: `linear-gradient(135deg, ${meta.gradient[0]}, ${meta.gradient[1]})`,
                        fontSize: 13, color: '#4b5563', lineHeight: 1.6,
                      }}>
                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>摘要</Text>
                        <div style={{ marginTop: 4 }}>{item.summary}</div>
                      </div>
                    )}
                    <div style={{ marginBottom: 14 }}>
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>内容</Text>
                      <div style={{
                        marginTop: 6, padding: '12px 16px', borderRadius: 10, background: '#f9fafb',
                        border: '1px solid #f3f4f6', fontSize: 13, lineHeight: 1.8, color: '#374151',
                        maxHeight: 160, overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {item.content ? (item.content.length > 400 ? `${item.content.slice(0, 400)}...` : item.content) : <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>暂无内容</span>}
                      </div>
                    </div>
                    {item.tags && (
                      <div style={{ marginBottom: 14 }}>
                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>标签</Text>
                        <div style={{ marginTop: 6 }}>
                          <Space size={4} wrap>
                            {item.tags.split(',').filter(Boolean).map((t: string) => (
                              <Tag key={t} style={{ borderRadius: 6, fontSize: 11 }}>{t.trim()}</Tag>
                            ))}
                          </Space>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button size="small" icon={<EyeOutlined />} style={{ borderRadius: 8 }} onClick={(e) => { e.stopPropagation(); onDocClick(item); }}>查看详情</Button>
                      <Button size="small" icon={<EditOutlined />} style={{ borderRadius: 8 }} onClick={(e) => { e.stopPropagation(); onEditDoc(item); }}>编辑</Button>
                      <Popconfirm title="确定删除？" onConfirm={() => onDeleteDoc(item.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }}>删除</Button>
                      </Popconfirm>
                      <div style={{ flex: 1 }} />
                      <Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center' }}>
                        {item._count?.attachments > 0 && <><UploadOutlined style={{ marginRight: 4 }} />{item._count.attachments} 个附件</>}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          description={activeFolder ? `目录 "${activeFolder}" 下暂无文档` : '暂无文档'}
          style={{ marginTop: 60 }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={() => onCreateDoc()} style={{ borderRadius: 10 }}>
            创建第一篇文档
          </Button>
        </Empty>
      )}
    </div>
  );
}
