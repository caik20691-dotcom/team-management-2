import { useState, useMemo } from 'react';
import { Card, Button, Tag, Empty, Popconfirm, Typography, Tooltip, Switch, Input, Modal, Image, App } from 'antd';
import {
  ThunderboltOutlined, PlusOutlined, EditOutlined,
  EyeOutlined, DeleteOutlined,
  SettingOutlined, CheckCircleOutlined,
  ClockCircleOutlined, UserOutlined, SearchOutlined,
  FolderOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/auth';
import { formatSize, getFileTypeInfo } from '../../utils/format';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface ParsedStep {
  stepNumber: number;
  title: string;
  items: string[];
}

function parseStepsFromMarkdown(content: string): ParsedStep[] {
  if (!content) return [];

  const headingRegex = /(?:^|\n)(?:#{1,3}\s*)?(?:[Ss]tep\s*(\d+)|步骤\s*(\d+)|步骤\s*([一二三四五六七八九十]+))\s*[：:]\s*(.+?)(?:\n|$)/g;
  const boldHeadingRegex = /(?:^|\n)\*\*(?:[Ss]tep\s*(\d+)|步骤\s*(\d+))\s*[：:]\s*(.+?)\*\*(?:\n|$)/g;

  const chineseNumerals: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  };

  const headings: { index: number; stepNumber: number; title: string }[] = [];

  for (const regex of [headingRegex, boldHeadingRegex]) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const num = parseInt(match[1] || match[2]) || chineseNumerals[match[3]] || 0;
      const title = (match[4] || match[5] || '').trim();
      if (num > 0) headings.push({ index: match.index, stepNumber: num, title });
    }
  }

  headings.sort((a, b) => a.index - b.index);
  const unique: typeof headings = [];
  const seen = new Set<number>();
  for (const h of headings) {
    if (!seen.has(h.index)) { seen.add(h.index); unique.push(h); }
  }

  const steps: ParsedStep[] = [];
  for (let i = 0; i < unique.length; i++) {
    const start = unique[i].index;
    const end = i + 1 < unique.length ? unique[i + 1].index : content.length;
    const body = content.slice(start, end);

    const items: string[] = [];
    const itemRegex = /(?:^|\n)\s*(?:[-*]|\d+[\.\)、])\s+(.+)/g;
    let im;
    while ((im = itemRegex.exec(body)) !== null) {
      const t = im[1].trim();
      if (t && !t.startsWith('#')) items.push(t);
    }

    steps.push({ stepNumber: unique[i].stepNumber, title: unique[i].title, items });
  }

  if (steps.length > 0) return steps;

  const numItems = content.match(/(?:^|\n)\s*(\d+)[\.\)、]\s+(.+)/g);
  if (numItems) {
    return numItems.map((line, i) => {
      const m = line.match(/\d+[\.\)、]\s+(.+)/);
      return { stepNumber: i + 1, title: (m ? m[1] : line).trim(), items: [] };
    });
  }

  return [];
}

const scenarioColors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4', '#e11d48', '#a855f7'];
const stepAccentColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

function getStatusLabel(status: string): { label: string; color: string; icon: React.ReactNode } {
  switch (status) {
    case 'PUBLISHED': return { label: '已发布', color: 'green', icon: <CheckCircleOutlined /> };
    case 'DRAFT': return { label: '草稿', color: 'default', icon: <SettingOutlined /> };
    case 'ARCHIVED': return { label: '已归档', color: 'default', icon: <ClockCircleOutlined /> };
    default: return { label: status || '已发布', color: 'green', icon: <CheckCircleOutlined /> };
  }
}

function canPreviewInline(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

interface DocSopViewProps {
  docs: any[];
  isAdmin: boolean;
  availableFolders: string[];
  availableCategories: string[];
  onManageCategories: () => void;
  onCreateDoc: (docType?: string) => void;
  onCreateFromTemplate: (template: any) => void;
  onDocClick: (doc: any) => void;
  onEditDoc: (doc: any) => void;
  onDeleteDoc: (id: string) => void;
}

export default function DocSopView({
  docs,
  isAdmin,
  availableFolders,
  availableCategories,
  onManageCategories,
  onCreateDoc, onCreateFromTemplate,
  onDocClick, onEditDoc, onDeleteDoc,
}: DocSopViewProps) {
  const [activeScenario, setActiveScenario] = useState<string>('all');
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [onlyMine, setOnlyMine] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const currentUser = useAuthStore((s) => s.user);
  const { message } = App.useApp();

  const sopDocs = useMemo(() => docs.filter((d: any) => d.type === 'SOP'), [docs]);

  const latestSopDocs = useMemo(() => {
    const latestMap = new Map<string, any>();
    for (const doc of sopDocs) {
      const gid = doc.sopGroupId || doc.id;
      if (!latestMap.has(gid) || (doc.version || 1) > (latestMap.get(gid)!.version || 1)) {
        latestMap.set(gid, doc);
      }
    }
    return Array.from(latestMap.values());
  }, [sopDocs]);

  // Gather all distinct scenarios actually used by SOP docs
  const scenariosWithCounts = useMemo(() => {
    const map: Record<string, number> = {};
    latestSopDocs.forEach((d: any) => {
      const s = d.scenario || '未分类';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => ({ name, count, color: scenarioColors[i % scenarioColors.length] }));
  }, [latestSopDocs]);

  // Gather folders used by SOP docs, merged with managed folders
  const foldersWithCounts = useMemo(() => {
    const map: Record<string, number> = {};
    availableFolders.forEach((f) => { map[f] = 0; });
    latestSopDocs.forEach((d: any) => {
      const f = d.folder;
      if (f) map[f] = (map[f] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [latestSopDocs, availableFolders]);

  // Gather categories, merged with managed categories
  const categoriesWithCounts = useMemo(() => {
    const map: Record<string, number> = {};
    availableCategories.forEach((c) => { map[c] = 0; });
    latestSopDocs.forEach((d: any) => {
      const c = d.category;
      if (c) map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [latestSopDocs, availableCategories]);

  const filteredDocs = useMemo(() => {
    const base = (isAdmin && showAllVersions) ? sopDocs : latestSopDocs;
    let result = base;
    if (activeScenario !== 'all') {
      result = result.filter((d: any) => (d.scenario || '未分类') === activeScenario);
    }
    if (activeCategory !== 'all') {
      result = result.filter((d: any) => d.category === activeCategory);
    }
    if (activeFolder !== 'all') {
      result = result.filter((d: any) => d.folder === activeFolder);
    }
    if (onlyMine && currentUser) {
      result = result.filter((d: any) => d.authorId === currentUser.id || d.author?.id === currentUser.id);
    }
    if (searchText.trim()) {
      const s = searchText.trim().toLowerCase();
      result = result.filter((d: any) =>
        d.title?.toLowerCase().includes(s) || (d.scenario || '').toLowerCase().includes(s)
      );
    }
    return result;
  }, [sopDocs, latestSopDocs, activeScenario, activeCategory, activeFolder, onlyMine, currentUser, searchText, isAdmin, showAllVersions]);

  const sopStats = useMemo(() => {
    const total = latestSopDocs.length;
    const scenarioCount = scenariosWithCounts.filter((s) => s.name !== '未分类').length;
    const withSteps = latestSopDocs.filter((d: any) => parseStepsFromMarkdown(d.content || '').length > 0).length;
    return { total, scenarioCount, withSteps };
  }, [latestSopDocs, scenariosWithCounts]);

  if (sopDocs.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ThunderboltOutlined style={{ color: '#f97316' }} />
              团队 SOP
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              标准化操作流程，确保团队执行一致性和质量可控
            </Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => onCreateDoc('SOP')}
            style={{ borderRadius: 10, fontWeight: 500, boxShadow: '0 4px 14px rgba(249,115,22,0.3)', background: '#f97316', borderColor: '#f97316', height: 36 }}>
            新建 SOP
          </Button>
        </div>
        <Empty description="还没有 SOP 文档" style={{ padding: '40px 0' }} />
      </div>
    );
  }

  return (
    <div>
      <style>{`
        .sop-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .step-card:hover { background: #f5f3ff; border-color: rgba(124,58,237,0.15); }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThunderboltOutlined style={{ color: '#f97316' }} />
            团队 SOP
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            标准化操作流程，确保团队执行一致性和质量可控
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => onCreateDoc('SOP')}
          style={{ borderRadius: 10, fontWeight: 500, boxShadow: '0 4px 14px rgba(249,115,22,0.3)', background: '#f97316', borderColor: '#f97316', height: 36 }}>
          新建 SOP
        </Button>
      </div>

      {/* Search + Category Pills + Admin Toggle */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="搜索 SOP 名称或场景..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 260, borderRadius: 10 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Tag
              style={{ cursor: 'pointer', borderRadius: 8, padding: '3px 14px', fontSize: 12, margin: 0 }}
              color={activeCategory === 'all' ? 'purple' : undefined}
              onClick={() => setActiveCategory('all')}
            >
              全部 {latestSopDocs.length}
            </Tag>
            {categoriesWithCounts.map((cat) => (
              <Tag
                key={cat.name}
                style={{ cursor: 'pointer', borderRadius: 8, padding: '3px 14px', fontSize: 12, margin: 0 }}
                color={activeCategory === cat.name ? 'purple' : undefined}
                onClick={() => setActiveCategory(activeCategory === cat.name ? 'all' : cat.name)}
              >
                {cat.name} {cat.count}
              </Tag>
            ))}
          </div>
          <Button
            type="link"
            size="small"
            onClick={onManageCategories}
            style={{ fontSize: 12, color: '#7c3aed', padding: 0, whiteSpace: 'nowrap' }}
          >
            管理分类
          </Button>
          <div style={{ flex: 1 }} />
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>显示所有版本</Text>
              <Switch size="small" checked={showAllVersions} onChange={setShowAllVersions} />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Left Scenario Panel */}
        <div style={{
          width: 210, flexShrink: 0,
          background: '#fafbfc', borderRadius: 14, border: '1px solid #f0f0f0',
          padding: '16px 14px', alignSelf: 'flex-start',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e1b4b', marginBottom: 12 }}>
            操作场景
            <span style={{ fontWeight: 400, fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>{sopStats.total} 份 SOP</span>
          </div>

          <button
            onClick={() => setActiveScenario('all')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: 'none', cursor: 'pointer', background: activeScenario === 'all' ? '#fff' : 'transparent',
              boxShadow: activeScenario === 'all' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              fontWeight: activeScenario === 'all' ? 600 : 400,
              color: activeScenario === 'all' ? '#1e1b4b' : '#4b5563',
              fontSize: 13, marginBottom: 4,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6b7280', flexShrink: 0 }} />
            全部 SOP
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>{sopStats.total}</span>
          </button>

          {scenariosWithCounts.map((s) => (
            <button
              key={s.name}
              onClick={() => setActiveScenario(s.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: 'none', cursor: 'pointer', background: activeScenario === s.name ? '#fff' : 'transparent',
                boxShadow: activeScenario === s.name ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                fontWeight: activeScenario === s.name ? 600 : 400,
                fontSize: 13,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ color: activeScenario === s.name ? '#1e1b4b' : '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>{s.count}</span>
            </button>
          ))}

          {foldersWithCounts.length > 0 && (
            <>
              <div style={{
                marginTop: 14, paddingTop: 14,
                borderTop: '1px solid #f0f0f0',
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e1b4b', marginBottom: 10 }}>
                  目录
                </div>
                <button
                  onClick={() => setActiveFolder('all')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '7px 12px', borderRadius: 8,
                    border: 'none', cursor: 'pointer', background: activeFolder === 'all' ? '#fff' : 'transparent',
                    boxShadow: activeFolder === 'all' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    fontWeight: activeFolder === 'all' ? 600 : 400,
                    fontSize: 12.5, color: activeFolder === 'all' ? '#1e1b4b' : '#4b5563',
                    marginBottom: 2,
                    transition: 'all 0.15s',
                  }}
                >
                  <FolderOutlined style={{ fontSize: 12, color: '#9ca3af' }} />
                  全部目录
                </button>
                {foldersWithCounts.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setActiveFolder(f.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '7px 12px', borderRadius: 8,
                      border: 'none', cursor: 'pointer', background: activeFolder === f.name ? '#fff' : 'transparent',
                      boxShadow: activeFolder === f.name ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      fontWeight: activeFolder === f.name ? 600 : 400,
                      fontSize: 12.5,
                      transition: 'all 0.15s',
                    }}
                  >
                    <FolderOutlined style={{ fontSize: 12, color: activeFolder === f.name ? '#7c3aed' : '#d1d5db' }} />
                    <span style={{ color: activeFolder === f.name ? '#1e1b4b' : '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>{f.count}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div style={{
            marginTop: 14, paddingTop: 14,
            borderTop: '1px solid #f0f0f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>只看我的</Text>
            <Switch size="small" checked={onlyMine} onChange={setOnlyMine} />
          </div>
        </div>

        {/* Right: SOP Cards */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {filteredDocs.length === 0 ? (
            <Empty description={searchText ? '没有匹配的 SOP' : onlyMine ? '没有你的 SOP 文档' : '该场景下暂无 SOP 文档'} style={{ padding: '40px 0' }} />
          ) : (
            filteredDocs.map((doc: any) => {
              const steps = parseStepsFromMarkdown(doc.content || '');
              const statusInfo = getStatusLabel(doc.status || 'PUBLISHED');

              const isExpanded = expandedIds.has(doc.id);
              const stepPreview = steps.length > 0
                ? `共 ${steps.length} 步 · 第1步：${steps[0].title}`
                : doc.summary || '暂无步骤内容';

              return (
                <Card
                  key={doc.id}
                  className="sop-card"
                  style={{
                    borderRadius: 14, marginBottom: 16,
                    border: '1px solid rgba(0,0,0,0.04)',
                    transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                    cursor: 'pointer',
                  }}
                  styles={{ body: { padding: '16px 22px' } }}
                  onClick={() => {
                    setExpandedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(doc.id)) next.delete(doc.id);
                      else next.add(doc.id);
                      return next;
                    });
                  }}
                >
                  {/* Card Header — always visible */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: 'rgba(249,115,22,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, flexShrink: 0,
                    }}>
                      {doc.attachments?.[0] ? getFileTypeInfo(doc.attachments[0].mimeType).icon : <ThunderboltOutlined style={{ color: '#f97316' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text strong style={{ fontSize: 15, color: '#1e1b4b' }}>
                          {doc.title}
                        </Text>
                        <Tag color="blue" style={{ borderRadius: 6, fontSize: 10, margin: 0, padding: '1px 8px' }}>
                          v{doc.version || 1}
                        </Tag>
                        <Tag
                          icon={statusInfo.icon}
                          color={statusInfo.color}
                          style={{ borderRadius: 6, fontSize: 11, margin: 0, padding: '1px 10px' }}
                        >
                          {statusInfo.label}
                        </Tag>
                        {doc.scenario && (
                          <Tag style={{ borderRadius: 6, fontSize: 11, margin: 0, background: '#fff7ed', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>
                            {doc.scenario}
                          </Tag>
                        )}
                        {doc.attachments?.[0] && (
                          <Tag color={getFileTypeInfo(doc.attachments[0].mimeType).color} style={{ borderRadius: 6, fontSize: 10, margin: 0, padding: '1px 8px' }}>
                            {getFileTypeInfo(doc.attachments[0].mimeType).label}
                          </Tag>
                        )}
                      </div>

                      {/* Collapsed preview line */}
                      <div style={{
                        marginTop: 6, fontSize: 12, color: '#9ca3af',
                        display: 'flex', alignItems: 'center', gap: 16,
                      }}>
                        <span>{stepPreview}</span>
                        <span style={{ color: '#d1d5db' }}>
                          {doc.author?.name} · {dayjs(doc.updatedAt).format('MM-DD')}
                        </span>
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <div style={{
                      fontSize: 12, color: '#7c3aed', flexShrink: 0,
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                    }}>
                      <span style={{ fontSize: 11, color: '#9ca3af', marginRight: 4 }}>
                        {isExpanded ? '收起' : '展开'}
                      </span>
                      ▼
                    </div>
                  </div>

                  {/* Expanded: Step Flow */}
                  {isExpanded && steps.length > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 0,
                      overflowX: 'auto', paddingBottom: 4, paddingTop: 14,
                      scrollbarWidth: 'thin',
                    }}>
                      {steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
                          <div
                            className="step-card"
                            style={{
                              width: 120, padding: '10px 12px',
                              borderRadius: 10,
                              border: '1px solid rgba(0,0,0,0.06)',
                              borderLeft: `3px solid ${stepAccentColors[i % stepAccentColors.length]}`,
                              background: '#fafbfc',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{
                              fontSize: 10, fontWeight: 600,
                              color: stepAccentColors[i % stepAccentColors.length],
                              marginBottom: 4,
                            }}>
                              STEP {step.stepNumber}
                            </div>
                            <div style={{
                              fontSize: 12, fontWeight: 600, color: '#1e1b4b',
                              lineHeight: 1.4,
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical' as any,
                            }}>
                              {step.title}
                            </div>
                            {step.items.length > 0 && (
                              <div style={{ marginTop: 6, fontSize: 10, color: '#9ca3af' }}>
                                {step.items.length} 个子步骤
                              </div>
                            )}
                          </div>

                          {i < steps.length - 1 && (
                            <div style={{
                              display: 'flex', alignItems: 'center',
                              width: 28, flexShrink: 0,
                              justifyContent: 'center',
                            }}>
                              <svg width="28" height="14" viewBox="0 0 28 14">
                                <line x1="0" y1="7" x2="20" y2="7" stroke="#d1d5db" strokeWidth="1.5" />
                                <polygon points="20,2 26,7 20,12" fill="#d1d5db" />
                              </svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expanded: Card Footer */}
                  {isExpanded && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginTop: 14, paddingTop: 12,
                      borderTop: '1px solid #f5f5f5', flexWrap: 'wrap', gap: 8,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <StatBadge icon={<EyeOutlined />} label="查看" value={doc.viewCount || 0} />
                        {doc.author && (
                          <StatBadge icon={<UserOutlined />} label="作者" value={doc.author.name || doc.author.username || ''} />
                        )}
                        <StatBadge icon={<ClockCircleOutlined />} label="更新" value={dayjs(doc.updatedAt).format('MM-DD HH:mm')} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 0, fontSize: 12 }}>
                        <Button
                          type="link"
                          size="small"
                          style={{ fontSize: 12, padding: '0 6px', color: '#7c3aed' }}
                          onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }}
                        >
                          预览
                        </Button>
                        <span style={{ color: '#d1d5db' }}>·</span>
                        <Button
                          type="link"
                          size="small"
                          style={{ fontSize: 12, padding: '0 6px', color: '#6b7280' }}
                          onClick={(e) => { e.stopPropagation(); onEditDoc(doc); }}
                        >
                          编辑
                        </Button>
                        <span style={{ color: '#d1d5db' }}>·</span>
                        <Popconfirm title="删除此 SOP？" onConfirm={() => onDeleteDoc(doc.id)}>
                          <Button
                            type="link"
                            size="small"
                            danger
                            style={{ fontSize: 12, padding: '0 6px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            删除
                          </Button>
                        </Popconfirm>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        title={previewDoc?.title || '文件预览'}
        open={!!previewDoc}
        onCancel={() => setPreviewDoc(null)}
        footer={
          previewDoc?.attachments?.[0] ? (
            <Button
              icon={<DownloadOutlined />}
              href={previewDoc.attachments[0].url}
              target="_blank"
              rel="noreferrer"
              type="primary"
              style={{ borderRadius: 8 }}
            >
              下载文件
            </Button>
          ) : null
        }
        width={820}
        styles={{ body: { padding: previewDoc?.attachments?.[0] ? 0 : 20 } }}
      >
        {previewDoc && !previewDoc.attachments?.length && (
          <Empty description="该 SOP 暂无附件文件" style={{ padding: '40px 0' }} />
        )}
        {previewDoc?.attachments?.[0] && <FilePreviewContent att={previewDoc.attachments[0]} />}
      </Modal>
    </div>
  );
}

function FilePreviewContent({ att }: { att: any }) {
  const mime = att.mimeType || '';
  if (mime.startsWith('image/')) {
    return (
      <div style={{ textAlign: 'center', padding: 16 }}>
        <Image src={att.url} alt={att.filename} style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }} />
      </div>
    );
  }
  if (mime === 'application/pdf') {
    return (
      <iframe
        src={att.url}
        style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }}
        title={att.filename}
      />
    );
  }
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>
        {getFileTypeInfo(mime).icon}
      </div>
      <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>{att.filename}</Text>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
        {getFileTypeInfo(mime).label} · {formatSize(att.size)}
      </Text>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 20 }}>
        此格式暂不支持在线预览，请下载后查看
      </Text>
      <Button
        icon={<DownloadOutlined />}
        href={att.url}
        target="_blank"
        rel="noreferrer"
        type="primary"
        style={{ borderRadius: 8 }}
      >
        下载查看
      </Button>
    </div>
  );
}

function StatBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Tooltip title={`${label}: ${value}`}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 6, fontSize: 11,
        background: '#f9fafb', color: '#6b7280',
      }}>
        <span style={{ fontSize: 11 }}>{icon}</span>
        <span>{value}</span>
      </span>
    </Tooltip>
  );
}
