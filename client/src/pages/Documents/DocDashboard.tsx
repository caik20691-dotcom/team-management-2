import { useMemo } from 'react';
import { Card, Statistic, Row, Col, Button, Tag, Space, Typography } from 'antd';
import {
  FileTextOutlined, EyeOutlined, PlusOutlined, FireOutlined,
  ClockCircleOutlined, UserOutlined, RightOutlined,
} from '@ant-design/icons';
import { templates } from './templates';
import dayjs from 'dayjs';

const { Text } = Typography;

interface DocDashboardProps {
  docs: any[];
  allTags: string[];
  onViewChange: (view: string, folder?: string) => void;
  onCreateFromTemplate: (template: any) => void;
  onDocClick: (doc: any) => void;
}

const typeColors: Record<string, string> = {
  SOP: 'orange', POLICY: 'cyan', FORMAL: 'blue', WIKI: 'purple',
};

const typeLabels: Record<string, string> = {
  SOP: 'SOP', POLICY: '制度', FORMAL: '正式', WIKI: 'Wiki',
};

export default function DocDashboard({ docs, allTags, onViewChange, onCreateFromTemplate, onDocClick }: DocDashboardProps) {
  const stats = useMemo(() => {
    const now = dayjs();
    const weekAgo = now.subtract(7, 'day');
    const total = docs.length;
    const thisWeek = docs.filter((d: any) => dayjs(d.createdAt).isAfter(weekAgo)).length;
    const sopCount = docs.filter((d: any) => d.type === 'SOP').length;
    const policyCount = docs.filter((d: any) => d.type === 'POLICY').length;
    const popular = [...docs].filter((d: any) => d.viewCount > 0).sort((a: any, b: any) => b.viewCount - a.viewCount).slice(0, 5);
    const recent = [...docs].sort((a: any, b: any) => dayjs(b.updatedAt).valueOf() - dayjs(a.updatedAt).valueOf()).slice(0, 6);
    return { total, thisWeek, sopCount, policyCount, popular, recent };
  }, [docs]);

  const featuredTemplates = templates.slice(0, 6);

  return (
    <div>
      {/* Stats */}
      <Row gutter={[14, 14]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #faf5ff, #f5f3ff)', border: '1px solid rgba(124,58,237,0.08)' }}>
            <Statistic title="文档总数" value={stats.total} prefix={<FileTextOutlined style={{ color: '#7c3aed' }} />} valueStyle={{ fontWeight: 700, fontSize: 26 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)', border: '1px solid rgba(16,185,129,0.08)' }}>
            <Statistic title="本周新增" value={stats.thisWeek} prefix={<ClockCircleOutlined style={{ color: '#10b981' }} />} valueStyle={{ fontWeight: 700, fontSize: 26 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #fff7ed, #fff1f2)', border: '1px solid rgba(249,115,22,0.08)' }}>
            <Statistic title="SOP 文档" value={stats.sopCount} prefix={<span style={{ color: '#f97316', fontSize: 16 }}>📋</span>} valueStyle={{ fontWeight: 700, fontSize: 26 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #ecfeff, #f0f9ff)', border: '1px solid rgba(8,145,178,0.08)' }}>
            <Statistic title="制度文档" value={stats.policyCount} prefix={<span style={{ color: '#0891b2', fontSize: 16 }}>📜</span>} valueStyle={{ fontWeight: 700, fontSize: 26 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[18, 18]}>
        {/* Featured templates */}
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title={<span style={{ fontWeight: 600, fontSize: 14 }}>📝 从模板快速创建</span>}
            extra={<Button type="link" size="small" onClick={() => onViewChange('templates')} style={{ fontWeight: 500 }}>全部模板 <RightOutlined /></Button>}
            style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,0.04)', height: '100%' }}
          >
            <Row gutter={[10, 10]}>
              {featuredTemplates.map((t) => (
                <Col span={8} key={t.id}>
                  <div
                    onClick={() => onCreateFromTemplate(t)}
                    style={{
                      padding: '12px 10px', borderRadius: 10, cursor: 'pointer',
                      border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center',
                      transition: 'all 0.2s', height: '100%',
                      background: '#fafbfc',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fafbfc'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 4 }}>{t.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1e1b4b', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* Recent docs */}
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title={<span style={{ fontWeight: 600, fontSize: 14 }}><ClockCircleOutlined style={{ marginRight: 6 }} />最近更新</span>}
            extra={<Button type="link" size="small" onClick={() => onViewChange('list')} style={{ fontWeight: 500 }}>全部文档 <RightOutlined /></Button>}
            style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,0.04)', height: '100%' }}
          >
            {stats.recent.length > 0 ? (
              <div>
                {stats.recent.map((d: any) => (
                  <div
                    key={d.id}
                    onClick={() => onDocClick(d)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', gap: 8 }}>
                        <span><UserOutlined style={{ marginRight: 2 }} />{d.author?.name}</span>
                        <span>{dayjs(d.updatedAt).format('MM-DD HH:mm')}</span>
                      </div>
                    </div>
                    <Tag color={typeColors[d.type]} style={{ borderRadius: 5, fontSize: 10, margin: 0 }}>{typeLabels[d.type]}</Tag>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>暂无文档</div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Popular docs */}
      {stats.popular.length > 0 && (
        <Card
          size="small"
          title={<span style={{ fontWeight: 600, fontSize: 14 }}><FireOutlined style={{ color: '#f59e0b', marginRight: 6 }} />热门文档</span>}
          style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,0.04)', marginTop: 18 }}
        >
          <Space wrap size={[8, 8]}>
            {stats.popular.map((d: any) => (
              <Tag
                key={d.id}
                color="purple"
                style={{ cursor: 'pointer', borderRadius: 8, padding: '5px 12px', fontSize: 12, border: '1px solid rgba(124,58,237,0.1)' }}
                onClick={() => onDocClick(d)}
              >
                📄 {d.title} <span style={{ opacity: 0.5, fontSize: 10 }}>({d.viewCount}次浏览)</span>
              </Tag>
            ))}
          </Space>
        </Card>
      )}
    </div>
  );
}
