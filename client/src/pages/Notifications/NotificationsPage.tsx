import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { List, Tag, Button, Typography, App, Space, Empty, Avatar, Badge, Segmented, Tooltip } from 'antd';
import { BellOutlined, CheckOutlined, CommentOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { notificationApi } from '../../api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
  TASK_ASSIGNED: { label: '任务指派', color: '#3b82f6', icon: '📋' },
  COMMENT_MENTION: { label: '@提及', color: '#8b5cf6', icon: '💬' },
  ANNOUNCEMENT: { label: '公告', color: '#f59e0b', icon: '📢' },
  TRAINING_REMINDER: { label: '培训', color: '#10b981', icon: '📚' },
  SYSTEM: { label: '系统', color: '#6b7280', icon: '⚙️' },
};

type TabKey = 'ALL' | 'UNREAD' | 'COMMENT_MENTION' | 'TASK_ASSIGNED' | 'SYSTEM';

interface TabItem {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  { key: 'ALL', label: '全部', icon: <BellOutlined /> },
  { key: 'UNREAD', label: '未读', icon: <Badge status="error" /> },
  { key: 'COMMENT_MENTION', label: '@我', icon: <span style={{ fontWeight: 700, fontSize: 14 }}>@</span> },
  { key: 'TASK_ASSIGNED', label: '任务', icon: <span style={{ fontSize: 12 }}>📋</span> },
  { key: 'SYSTEM', label: '系统', icon: <SettingOutlined /> },
];

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');

  const queryParams: any = { pageSize: '50' };
  if (activeTab === 'UNREAD') queryParams.unreadOnly = 'true';
  else if (activeTab !== 'ALL') queryParams.type = activeTab;

  const { data: resp, isFetching } = useQuery({
    queryKey: ['notifications', queryParams],
    queryFn: () => notificationApi.list(queryParams).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  // Fetch unread count for badge
  const { data: unreadResp } = useQuery({
    queryKey: ['notifications', { unreadOnly: 'true', pageSize: '1' }],
    queryFn: () => notificationApi.list({ unreadOnly: 'true', pageSize: '1' }).then((r) => r.data),
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      message.success('已全部标记为已读');
    },
  });

  const notifications = resp?.data || [];
  const unreadCount = unreadResp?.unreadCount ?? resp?.unreadCount ?? 0;

  return (
    <div style={{ maxWidth: 780 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
          }}>
            <BellOutlined style={{ fontSize: 18, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700 }}>消息中心</span>
          {unreadCount > 0 && (
            <Tag color="red" style={{ borderRadius: 8, fontWeight: 600, marginLeft: 4 }}>
              {unreadCount} 条未读
            </Tag>
          )}
        </div>
        <Button
          icon={<CheckOutlined />}
          onClick={() => readAllMutation.mutate()}
          loading={readAllMutation.isPending}
          disabled={unreadCount === 0}
          style={{ borderRadius: 10, fontWeight: 500 }}>
          全部已读
        </Button>
      </div>

      {/* ── Tab switcher ── */}
      <div style={{ marginBottom: 16 }}>
        <Segmented
          value={activeTab}
          onChange={(val) => setActiveTab(val as TabKey)}
          options={tabs.map((t) => ({
            value: t.key,
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {t.icon}
                <span>{t.label}</span>
              </span>
            ),
          }))}
          style={{
            background: 'rgba(124,58,237,0.04)',
            padding: 4,
            borderRadius: 12,
          }}
        />
      </div>

      {/* ── Notification list ── */}
      <List
        dataSource={notifications}
        loading={isFetching}
        locale={{ emptyText: <Empty description="暂无消息" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        renderItem={(item: any) => {
          const config = typeConfig[item.type] || typeConfig.SYSTEM;
          const timeStr = dayjs(item.createdAt).fromNow();

          return (
            <List.Item
              style={{
                background: item.isRead ? '#fff' : 'linear-gradient(135deg, #faf5ff 0%, #f0e6ff 100%)',
                padding: '16px 20px', borderRadius: 14, marginBottom: 10,
                border: item.isRead ? '1px solid rgba(124,58,237,0.04)' : '1px solid rgba(124,58,237,0.12)',
                cursor: 'pointer',
                transition: 'all 0.25s',
              }}
              onClick={() => {
                if (!item.isRead) {
                  readMutation.mutate(item.id);
                }
              }}
            >
              {/* Type icon box */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: item.isRead ? '#f3f4f6' : `${config.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, marginRight: 14,
              }}>
                {config.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Tag
                    color={config.color}
                    style={{ borderRadius: 6, margin: 0, fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>
                    {config.label}
                  </Tag>
                  <span style={{
                    fontWeight: item.isRead ? 400 : 600,
                    fontSize: 14, color: item.isRead ? '#374151' : '#1e1b4b',
                    flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.title}
                  </span>
                  {!item.isRead && (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#ef4444', flexShrink: 0,
                    }} />
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 4 }}>
                  {item.content}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{timeStr}</span>
                  {!item.isRead && (
                    <Button
                      size="small"
                      type="link"
                      onClick={(e) => { e.stopPropagation(); readMutation.mutate(item.id); }}
                      style={{ fontSize: 12, padding: 0, height: 'auto' }}>
                      标为已读
                    </Button>
                  )}
                </div>
              </div>

              {/* Sender avatar */}
              {item.sender && (
                <div style={{ flexShrink: 0, marginLeft: 12 }}>
                  <Tooltip title={item.sender.name}>
                    <Avatar
                      src={item.sender.avatar}
                      icon={<UserOutlined />}
                      size={32}
                      style={{
                        border: '2px solid #fff',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                      }}
                    />
                  </Tooltip>
                </div>
              )}
            </List.Item>
          );
        }}
      />
    </div>
  );
}
