import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  List, Card, Button, Modal, Form, Input, Select, Tag, Typography, App,
  Avatar, Tooltip, Checkbox, Input as SearchInput, Pagination, Badge, Space, Divider,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined, PushpinOutlined, NotificationOutlined, SearchOutlined,
  EyeOutlined, ClockCircleOutlined, TeamOutlined, UserOutlined,
  GlobalOutlined, ApartmentOutlined, CloseOutlined, SettingOutlined,
  DeleteOutlined, EditOutlined, PlusCircleOutlined, UpOutlined, DownOutlined,
} from '@ant-design/icons';
import { announcementApi, announcementCategoryApi } from '../../api';
import { useAuthStore } from '../../stores/auth';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Paragraph, Text } = Typography;

const PRESET_COLORS = [
  '#3b82f6', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#ec4899',
  '#06b6d4', '#f97316', '#8b5cf6', '#14b8a6', '#6366f1', '#84cc16',
];

const targetTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  ALL:        { label: '全员', icon: <GlobalOutlined /> },
  DEPARTMENT: { label: '按部门', icon: <ApartmentOutlined /> },
  ROLE:       { label: '按角色', icon: <TeamOutlined /> },
};

export default function AnnouncementsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<any>(null);
  const [catManageOpen, setCatManageOpen] = useState(false);
  const [catForm] = Form.useForm();
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // ── Fetch categories ──
  const { data: categories } = useQuery({
    queryKey: ['announcementCategories'],
    queryFn: () => announcementCategoryApi.list().then((r) => r.data),
    staleTime: 0,
  });

  const cats = categories || [];
  const categoryMap = useMemo(() => {
    const map: Record<string, any> = {};
    cats.forEach((c: any) => { map[c.name] = c; });
    return map;
  }, [cats]);

  const queryParams = {
    pageSize: '20',
    page: String(page),
    ...(search ? { search } : {}),
    ...(activeCategory ? { category: activeCategory } : {}),
  };

  const { data: resp, isLoading } = useQuery({
    queryKey: ['announcements', queryParams],
    queryFn: () => announcementApi.list(queryParams).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => announcementApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      message.success('公告发布成功');
      setModalOpen(false);
      form.resetFields();
    },
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => announcementApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });

  // ── Category mutations ──
  const createCatMutation = useMutation({
    mutationFn: (data: any) => announcementCategoryApi.create(data),
    onSuccess: (res: any) => {
      // Optimistic: use the returned array directly so the UI updates immediately
      queryClient.setQueryData(['announcementCategories'], res.data);
      message.success('分类已添加');
      setNewCatName('');
      setNewCatColor('#3b82f6');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '添加分类失败，请重试');
    },
  });

  const updateCatMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => announcementCategoryApi.update(id, data),
    onSuccess: (res: any) => {
      queryClient.setQueryData(['announcementCategories'], res.data);
      message.success('分类已更新');
      setEditCatId(null);
      setEditName('');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '更新分类失败');
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => announcementCategoryApi.remove(id),
    onSuccess: (res: any) => {
      queryClient.setQueryData(['announcementCategories'], res.data);
      message.success('分类已删除');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '删除分类失败');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => announcementCategoryApi.reorder(ids),
    onSuccess: (res: any) => {
      queryClient.setQueryData(['announcementCategories'], res.data);
    },
  });

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...cats];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCategories.length) return;
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    reorderMutation.mutate(newCategories.map((c: any) => c.id));
  };

  const announcements = resp?.data || [];
  const total = resp?.total || 0;

  const pinnedList = useMemo(() => announcements.filter((a: any) => a.isPinned), [announcements]);
  const regularList = useMemo(() => announcements.filter((a: any) => !a.isPinned), [announcements]);

  const openDetail = (item: any) => {
    readMutation.mutate(item.id);
    setDetailOpen(item);
  };

  const formatTime = (date: string) => {
    const d = dayjs(date);
    const now = dayjs();
    if (d.isSame(now, 'day')) return `今天 ${d.format('HH:mm')}`;
    if (d.isSame(now.subtract(1, 'day'), 'day')) return `昨天 ${d.format('HH:mm')}`;
    if (d.isSame(now, 'year')) return d.format('MM-DD HH:mm');
    return d.format('YYYY-MM-DD');
  };

  const getCatConfig = (catName: string) => {
    const cat = categoryMap[catName];
    if (cat) return cat;
    return { name: catName || '其他', color: '#6b7280', bg: '#f9fafb' };
  };

  const targetScopeLabel = (item: any) => {
    const cfg = targetTypeLabels[item.targetType];
    if (!cfg) return null;
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#9ca3af' }}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const bgColor = `${newCatColor}15`;
    createCatMutation.mutate({ name: newCatName.trim(), color: newCatColor, bg: bgColor });
  };

  const renderAnnouncementCard = (item: any, isPinned: boolean) => {
    const catCfg = getCatConfig(item.category);
    const reads = item.reads || [];
    const hasRead = reads.length > 0;

    return (
      <Card
        key={item.id}
        hoverable
        style={{
          marginBottom: 12,
          borderRadius: 14,
          border: isPinned ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(0,0,0,0.04)',
          background: isPinned ? 'linear-gradient(135deg, #fef2f2 0%, #fff 30%, #fff 100%)' : '#fff',
          cursor: 'pointer',
          transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        }}
        styles={{ body: { padding: '16px 20px' } }}
        onClick={() => openDetail(item)}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: catCfg.bg, color: catCfg.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17,
          }}>
            <NotificationOutlined />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              {isPinned && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  fontSize: 10, color: '#fff', background: '#ef4444',
                  padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                }}>
                  <PushpinOutlined style={{ fontSize: 9 }} /> 置顶
                </span>
              )}
              <span style={{ fontWeight: 600, fontSize: 15, color: '#1e1b4b', lineHeight: 1.3 }}>
                {item.title}
              </span>
              <Tag style={{
                borderRadius: 5, fontWeight: 500, fontSize: 11,
                color: catCfg.color, background: catCfg.bg, border: 'none',
                margin: 0, padding: '1px 8px',
              }}>
                {catCfg.name}
              </Tag>
              {targetScopeLabel(item)}
            </div>

            {item.content && (
              <Paragraph ellipsis={{ rows: 2 }} style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
                {item.content}
              </Paragraph>
            )}

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 10, flexWrap: 'wrap', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Tooltip title={item.author?.name}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Avatar src={item.author?.avatar} size={22} style={{ backgroundColor: '#7c3aed', fontSize: 11 }}>
                      {item.author?.name?.charAt(0)}
                    </Avatar>
                    <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>
                      {item.author?.name}
                    </span>
                  </div>
                </Tooltip>

                <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <ClockCircleOutlined />
                  {formatTime(item.createdAt)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {hasRead && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Avatar.Group maxCount={4} size={20} maxStyle={{ fontSize: 10, color: '#7c3aed', backgroundColor: '#f5f3ff' }}>
                      {reads.map((r: any) => (
                        <Tooltip key={r.userId} title={`${r.user.name} · ${dayjs(r.readAt).format('MM-DD HH:mm')}`}>
                          <Avatar src={r.user?.avatar} size={20} style={{ backgroundColor: '#7c3aed', fontSize: 10 }}>
                            {r.user?.name?.charAt(0)}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </Avatar.Group>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{item.readCount} 人已读</span>
                  </div>
                )}
                {!hasRead && item.readCount > 0 && (
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    <EyeOutlined style={{ marginRight: 3 }} />{item.readCount} 人已读
                  </span>
                )}
                <span style={{ fontSize: 11, color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                  查看详情 ›
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <style>{`
        .annc-cat-tab {
          padding: 6px 16px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          border: none;
          background: transparent;
          color: #6b7280;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .annc-cat-tab:hover { background: #f5f3ff; color: #7c3aed; }
        .annc-cat-tab.active { background: #7c3aed; color: #fff; box-shadow: 0 2px 8px rgba(124,58,237,0.25); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
          }}>
            <NotificationOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div>
            <span style={{ fontSize: 19, fontWeight: 700, color: '#1e1b4b' }}>公告通知</span>
            {total > 0 && (
              <Badge count={total} style={{ marginLeft: 8, backgroundColor: '#7c3aed' }} />
            )}
          </div>
        </div>

        <Space>
          {user?.role === 'ADMIN' && (
            <Button
              icon={<SettingOutlined />}
              onClick={() => setCatManageOpen(true)}
              style={{ borderRadius: 10, fontWeight: 500 }}>
              管理分类
            </Button>
          )}
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => { form.resetFields(); setModalOpen(true); }}
            style={{ borderRadius: 10, height: 38, fontWeight: 500 }}
          >
            发布公告
          </Button>
        </Space>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap',
      }}>
        <SearchInput
          placeholder="搜索公告标题或内容..."
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          allowClear
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 280, borderRadius: 10 }}
        />
        <div style={{ display: 'flex', gap: 4, background: '#f5f3ff', padding: 3, borderRadius: 22, flexWrap: 'wrap' }}>
          <button
            className={`annc-cat-tab${!activeCategory ? ' active' : ''}`}
            onClick={() => { setActiveCategory(null); setPage(1); }}
          >
            全部
          </button>
          {cats.map((cat: any) => (
            <button
              key={cat.id}
              className={`annc-cat-tab${activeCategory === cat.name ? ' active' : ''}`}
              style={activeCategory === cat.name ? { background: cat.color, boxShadow: `0 2px 8px ${cat.color}40` } : {}}
              onClick={() => { setActiveCategory(activeCategory === cat.name ? null : cat.name); setPage(1); }}
            >
              {cat.name}
            </button>
          ))}
        </div>
        {activeCategory && (
          <Button size="small" type="text" icon={<CloseOutlined />}
            onClick={() => setActiveCategory(null)}
            style={{ color: '#9ca3af', fontSize: 12 }}>
            清除筛选
          </Button>
        )}
      </div>

      {/* ── Announcement list ── */}
      {isLoading ? (
        <Card style={{ borderRadius: 14, textAlign: 'center', padding: 40 }}>
          <span style={{ color: '#9ca3af' }}>加载中...</span>
        </Card>
      ) : announcements.length === 0 ? (
        <Card style={{ borderRadius: 14, textAlign: 'center', padding: 60 }}>
          <NotificationOutlined style={{ fontSize: 48, color: '#d1d5db', marginBottom: 16 }} />
          <div style={{ color: '#9ca3af', fontSize: 14 }}>
            {search || activeCategory ? '没有找到匹配的公告' : '暂无公告'}
          </div>
          <div style={{ color: '#d1d5db', fontSize: 12, marginTop: 4 }}>
            {search || activeCategory ? '请尝试调整搜索条件' : '点击上方按钮发布第一条公告吧'}
          </div>
        </Card>
      ) : (
        <div>
          {pinnedList.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '0 4px' }}>
                <PushpinOutlined style={{ color: '#ef4444', fontSize: 13 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>置顶公告</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>({pinnedList.length})</span>
              </div>
              {pinnedList.map((item: any) => renderAnnouncementCard(item, true))}
            </div>
          )}

          {regularList.length > 0 && (
            <div>
              {pinnedList.length > 0 && <Divider style={{ margin: '16px 0', borderColor: '#f3f4f6' }} />}
              {regularList.map((item: any) => renderAnnouncementCard(item, false))}
            </div>
          )}

          {total > 20 && (
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Pagination
                current={page} total={total} pageSize={20}
                onChange={(p) => setPage(p)}
                showSizeChanger={false}
                showTotal={(t) => `共 ${t} 条公告`}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Category Management Modal ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SettingOutlined style={{ color: '#7c3aed' }} />
            <span>管理公告分类</span>
          </div>
        }
        open={catManageOpen}
        onCancel={() => { setCatManageOpen(false); setEditCatId(null); }}
        footer={null}
        width={540}
      >
        <div style={{ marginBottom: 20 }}>
          {/* Existing categories */}
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              已有分类 ({cats.length})
            </Text>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cats.map((cat: any, idx: number) => (
              <div key={cat.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 10,
                background: '#f9fafb', border: '1px solid rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                  background: cat.color,
                }} />

                {editCatId === cat.id ? (
                  <>
                    <Input
                      size="small"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onPressEnter={() => {
                        const val = editName.trim();
                        if (val) {
                          updateCatMutation.mutate({ id: cat.id, data: { name: val } });
                          setEditCatId(null);
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Escape') { setEditCatId(null); } }}
                      autoFocus
                      style={{ flex: 1, borderRadius: 6, fontSize: 13 }}
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      {PRESET_COLORS.slice(0, 8).map((c) => (
                        <button
                          key={c}
                          onClick={() => updateCatMutation.mutate({ id: cat.id, data: { color: c, bg: `${c}15` } })}
                          style={{
                            width: 18, height: 18, borderRadius: 4, border: cat.color === c ? '2px solid #1e1b4b' : '1px solid #e5e7eb',
                            background: c, cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                    <Button
                      size="small"
                      onClick={() => {
                        const val = editName.trim();
                        if (val) updateCatMutation.mutate({ id: cat.id, data: { name: val } });
                        setEditCatId(null);
                      }}
                      style={{ borderRadius: 6, fontSize: 11 }}>
                      完成
                    </Button>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      <button
                        onClick={() => moveCategory(idx, 'up')}
                        disabled={idx === 0}
                        style={{
                          width: 18, height: 14, border: 'none', background: 'transparent',
                          cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#d1d5db' : '#6b7280',
                          padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, lineHeight: 1,
                        }}>
                        <UpOutlined />
                      </button>
                      <button
                        onClick={() => moveCategory(idx, 'down')}
                        disabled={idx === cats.length - 1}
                        style={{
                          width: 18, height: 14, border: 'none', background: 'transparent',
                          cursor: idx === cats.length - 1 ? 'default' : 'pointer', color: idx === cats.length - 1 ? '#d1d5db' : '#6b7280',
                          padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, lineHeight: 1,
                        }}>
                        <DownOutlined />
                      </button>
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1e1b4b' }}>{cat.name}</span>
                    <Button
                      size="small" type="text" icon={<EditOutlined />}
                      onClick={() => { setEditCatId(cat.id); setEditName(cat.name); }}
                      style={{ color: '#3b82f6', fontSize: 12, borderRadius: 6 }}
                    />
                    <Popconfirm
                      title="删除此分类？已有公告的分类名不会被清除"
                      onConfirm={() => deleteCatMutation.mutate(cat.id)}
                    >
                      <Button size="small" type="text" danger icon={<DeleteOutlined />}
                        style={{ fontSize: 12, borderRadius: 6 }} />
                    </Popconfirm>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add new category */}
        <Divider style={{ margin: '12px 0', borderColor: '#f3f4f6' }} />
        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          添加新分类
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <Input
            placeholder="分类名称"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onPressEnter={handleAddCategory}
            style={{ borderRadius: 8, flex: 1 }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewCatColor(c)}
                style={{
                  width: 24, height: 24, borderRadius: 6,
                  border: newCatColor === c ? '2px solid #1e1b4b' : '1px solid #e5e7eb',
                  background: c, cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <Button
            icon={<PlusCircleOutlined />}
            type="primary"
            onClick={handleAddCategory}
            loading={createCatMutation.isPending}
            disabled={!newCatName.trim()}
            style={{ borderRadius: 8, fontWeight: 500 }}>
            添加
          </Button>
        </div>
      </Modal>

      {/* ── Create Announcement Modal ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotificationOutlined style={{ color: '#7c3aed' }} />
            <span>发布公告</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        destroyOnClose
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="title" label="公告标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入公告标题" style={{ borderRadius: 8 }} maxLength={100} showCount />
          </Form.Item>

          <Form.Item name="content" label="公告内容" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea
              rows={6}
              placeholder="请输入公告内容，支持换行..."
              style={{ borderRadius: 8 }}
              maxLength={5000}
              showCount
            />
          </Form.Item>

          <Space size={16} style={{ width: '100%' }} align="start">
            <Form.Item name="category" label="分类" initialValue={cats[0]?.name || '通知'} style={{ marginBottom: 0 }}>
              <Select style={{ width: 140, borderRadius: 8 }}>
                {cats.map((c: any) => (
                  <Select.Option key={c.id} value={c.name}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                      {c.name}
                    </span>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="targetType" label="可见范围" initialValue="ALL" style={{ marginBottom: 0 }}>
              <Select style={{ width: 130, borderRadius: 8 }}>
                <Select.Option value="ALL">全员可见</Select.Option>
                <Select.Option value="DEPARTMENT">按部门</Select.Option>
                <Select.Option value="ROLE">按角色</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item name="isPinned" valuePropName="checked" style={{ marginBottom: 0, marginTop: 16 }}>
            <Checkbox>置顶此公告</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Detail Modal ── */}
      <Modal
        title={null}
        open={!!detailOpen}
        onCancel={() => setDetailOpen(null)}
        footer={null}
        width={720}
        destroyOnClose
        style={{ top: 40 }}
      >
        {detailOpen && (() => {
          const catCfg = getCatConfig(detailOpen.category);
          const reads = detailOpen.reads || [];
          const scopeCfg = targetTypeLabels[detailOpen.targetType];

          return (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {detailOpen.isPinned && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 2,
                      fontSize: 10, color: '#fff', background: '#ef4444',
                      padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                    }}>
                      <PushpinOutlined style={{ fontSize: 9 }} /> 置顶
                    </span>
                  )}
                  <Tag style={{
                    borderRadius: 5, fontWeight: 500, fontSize: 12,
                    color: catCfg.color, background: catCfg.bg, border: 'none',
                    padding: '2px 10px',
                  }}>
                    <NotificationOutlined style={{ marginRight: 3 }} /> {catCfg.name}
                  </Tag>
                  {scopeCfg && (
                    <Tag style={{
                      borderRadius: 5, fontSize: 11, color: '#6b7280',
                      background: '#f9fafb', border: 'none', padding: '2px 10px',
                    }}>
                      {scopeCfg.icon} {scopeCfg.label}
                    </Tag>
                  )}
                </div>
                <Title level={3} style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e1b4b' }}>
                  {detailOpen.title}
                </Title>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                  <Avatar src={detailOpen.author?.avatar} size={28} style={{ backgroundColor: '#7c3aed', fontSize: 12 }}>
                    {detailOpen.author?.name?.charAt(0)}
                  </Avatar>
                  <span style={{ fontSize: 13, color: '#4b5563', fontWeight: 500 }}>{detailOpen.author?.name}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>
                    <ClockCircleOutlined style={{ marginRight: 3 }} />
                    {dayjs(detailOpen.createdAt).format('YYYY-MM-DD HH:mm')}
                  </span>
                </div>
              </div>

              <Divider style={{ margin: '16px 0', borderColor: '#f3f4f6' }} />

              <div style={{
                fontSize: 14, lineHeight: 1.9, color: '#374151',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 120,
              }}>
                {detailOpen.content}
              </div>

              <Divider style={{ margin: '20px 0', borderColor: '#f3f4f6' }} />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563' }}>
                    <EyeOutlined style={{ marginRight: 4 }} />已读 ({detailOpen.readCount || 0})
                  </span>
                </div>
                {reads.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {reads.map((r: any) => (
                      <Tooltip key={r.userId} title={`${r.user.name} · ${dayjs(r.readAt).format('MM-DD HH:mm')}`}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '4px 8px', borderRadius: 8, background: '#f9fafb',
                        }}>
                          <Avatar src={r.user?.avatar} size={24} style={{ backgroundColor: '#7c3aed', fontSize: 10 }}>
                            {r.user?.name?.charAt(0)}
                          </Avatar>
                          <span style={{ fontSize: 12, color: '#4b5563' }}>{r.user?.name}</span>
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 16, textAlign: 'center' }}>
                    <span style={{ color: '#d1d5db', fontSize: 13 }}>暂无已读记录</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
