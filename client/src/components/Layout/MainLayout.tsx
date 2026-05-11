import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Button, Avatar, Dropdown, Badge, theme } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  NotificationOutlined,
  FileTextOutlined,
  TeamOutlined,
  BellOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
  ApartmentOutlined,
  CalendarOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/auth';
import { useQuery } from '@tanstack/react-query';
import { systemConfigApi } from '../../api';

const { Header, Sider, Content } = Layout;

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  section: string;
  children?: { key: string; label: string }[];
}

const menuItems: MenuItem[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘', section: '概览' },
  {
    key: '/regular-tasks',
    icon: <UnorderedListOutlined />,
    label: '常规任务',
    section: '任务',
    children: [
      { key: '/regular-tasks', label: '任务列表' },
      { key: '/regular-tasks/board', label: '看板视图' },
    ],
  },
  {
    key: '/projects/board',
    icon: <ProjectOutlined />,
    label: '项目管理',
    section: '项目',
  },
  { key: '/training', icon: <BookOutlined />, label: '培训管理', section: '学习' },
  { key: '/calendar', icon: <CalendarOutlined />, label: '团队日历', section: '协作' },
  { key: '/announcements', icon: <NotificationOutlined />, label: '公告中心', section: '协作' },
  { key: '/documents', icon: <FileTextOutlined />, label: '团队知识库', section: '协作' },
  {
    key: 'team',
    icon: <TeamOutlined />,
    label: '人员管理',
    section: '组织',
    children: [
      { key: '/personnel', label: '人员列表' },
      { key: '/departments', label: '组织架构' },
    ],
  },
  { key: '/notifications', icon: <BellOutlined />, label: '消息中心', section: '其他' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置', section: '其他' },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { token: { colorBgContainer } } = theme.useToken();

  const { data: sysConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => systemConfigApi.get().then((r) => r.data),
  });

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const isParentActive = (item: any) => {
    if (!item.children) return isActive(item.key);
    return item.children.some((c: any) => location.pathname.startsWith(c.key));
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <SettingOutlined />, label: '个人设置' },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') {
        logout();
        navigate('/login');
      } else if (key === 'profile') {
        navigate('/settings');
      }
    },
  };

  // Filter menu items by role
  const visibleMenuItems: MenuItem[] = menuItems.filter((item) => {
    if (item.key === '/settings' && user?.role !== 'ADMIN') return false;
    return true;
  });

  // Sidebar sections
  const sections = [
    {
      label: '概览',
      items: visibleMenuItems.filter((i) => i.section === '概览'),
    },
    {
      label: '项目管理',
      items: visibleMenuItems.filter((i) => i.section === '项目'),
    },
    {
      label: '任务管理',
      items: visibleMenuItems.filter((i) => i.section === '任务'),
    },
    {
      label: '学习与协作',
      items: visibleMenuItems.filter((i) => i.section === '学习' || i.section === '协作'),
    },
    {
      label: '组织管理',
      items: visibleMenuItems.filter((i) => i.section === '组织'),
    },
    {
      label: '系统',
      items: visibleMenuItems.filter((i) => i.section === '其他'),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={248}
        style={{
          background: 'linear-gradient(180deg, #0f0d1a 0%, #1a1744 25%, #1e1b4b 60%, #1a1744 100%)',
          borderRight: 'none',
        }}
      >
        <style>{`
          .sidebar-scroll { overflow-y: auto; overflow-x: hidden; height: 100%; }
          .sidebar-scroll::-webkit-scrollbar { width: 3px; }
          .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

          /* Section label */
          .sidebar-section-label {
            padding: ${collapsed ? '8px 0' : '18px 20px 6px'};
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: rgba(255,255,255,0.25);
            white-space: nowrap;
            overflow: hidden;
            text-align: ${collapsed ? 'center' : 'left'};
            transition: all 0.25s;
          }

          /* Nav items */
          .sidebar-nav-item {
            display: flex;
            align-items: center;
            gap: 12px;
            width: ${collapsed ? '44px' : 'calc(100% - 16px)'};
            margin: 2px 8px;
            padding: ${collapsed ? '10px 0' : '10px 14px'};
            border-radius: 10px;
            cursor: pointer;
            border: none;
            background: transparent;
            color: rgba(255,255,255,0.55);
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
            position: relative;
            white-space: nowrap;
            text-align: left;
            justify-content: ${collapsed ? 'center' : 'flex-start'};
          }
          .sidebar-nav-item:hover {
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.9);
          }
          .sidebar-nav-item:active {
            background: rgba(255,255,255,0.04);
            transform: scale(0.97);
          }
          .sidebar-nav-item.active {
            background: rgba(124,58,237,0.2);
            color: #fff;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(124,58,237,0.15);
          }
          .sidebar-nav-item.active::before {
            content: '';
            position: absolute;
            left: 0;
            top: 10px;
            bottom: 10px;
            width: 3px;
            border-radius: 0 3px 3px 0;
            background: linear-gradient(180deg, #818cf8, #c084fc);
          }

          /* Nav icon */
          .sidebar-nav-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 16px;
            transition: all 0.25s;
          }
          .sidebar-nav-item.active .sidebar-nav-icon {
            box-shadow: 0 4px 10px rgba(124,58,237,0.3);
          }

          /* Child nav items */
          .sidebar-nav-child {
            display: flex;
            align-items: center;
            gap: 10px;
            width: ${collapsed ? '44px' : 'calc(100% - 16px)'};
            margin: 1px 8px 1px ${collapsed ? '8px' : '28px'};
            padding: ${collapsed ? '8px 0' : '8px 14px'};
            border-radius: 8px;
            cursor: pointer;
            border: none;
            background: transparent;
            color: rgba(255,255,255,0.4);
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s;
            white-space: nowrap;
            text-align: left;
            justify-content: ${collapsed ? 'center' : 'flex-start'};
          }
          .sidebar-nav-child:hover {
            background: rgba(255,255,255,0.04);
            color: rgba(255,255,255,0.75);
          }
          .sidebar-nav-child.active {
            color: #c4b5fd;
            font-weight: 600;
            background: rgba(124,58,237,0.1);
          }
        `}</style>

        <div className="sidebar-scroll">
          {/* Logo */}
          <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer',
            gap: 10,
          }} onClick={() => navigate('/dashboard')}>
            {sysConfig?.logoUrl ? (
              <img
                src={sysConfig.logoUrl}
                alt="Logo"
                style={{
                  height: 36, width: 36, borderRadius: 10,
                  objectFit: 'cover', flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(129,140,248,0.35)',
              }}>
                <ThunderboltOutlined style={{ fontSize: 19, color: '#fff' }} />
              </div>
            )}
            {!collapsed && (
              <h1 style={{
                color: '#fff', fontSize: 17, fontWeight: 700, margin: 0,
                whiteSpace: 'nowrap', letterSpacing: -0.3,
                background: 'linear-gradient(135deg, #e0e7ff, #c4b5fd)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {sysConfig?.systemName || 'TeamHub'}
              </h1>
            )}
          </div>

          {/* Navigation */}
          <nav style={{ padding: '4px 0', flex: 1 }}>
            {sections.filter((s) => s.items.length > 0).map((section) => (
              <div key={section.label}>
                {!collapsed && (
                  <div className="sidebar-section-label" style={{ padding: '18px 20px 6px' }}>
                    {section.label}
                  </div>
                )}
                {collapsed && (
                  <div style={{ height: 8 }} />
                )}
                {section.items.map((item: any) => {
                  const active = isParentActive(item);
                  const exactActive = isActive(item.key);
                  const hasChildren = !!item.children;
                  const expanded = hasChildren && active;

                  // Icon color mapping
                  const iconColors: Record<string, string> = {
                    '/dashboard': 'rgba(129,140,248,0.18)',
                    '/regular-tasks': 'rgba(124,58,237,0.18)',
                    '/projects/board': 'rgba(249,115,22,0.18)',
                    '/training': 'rgba(16,185,129,0.18)',
                    '/calendar': 'rgba(14,165,233,0.18)',
                    '/announcements': 'rgba(59,130,246,0.18)',
                    '/documents': 'rgba(139,92,246,0.18)',
                    'team': 'rgba(236,72,153,0.18)',

                    '/notifications': 'rgba(239,68,68,0.18)',
                    '/settings': 'rgba(107,114,128,0.18)',
                  };
                  const iconActiveColors: Record<string, string> = {
                    '/dashboard': 'rgba(129,140,248,0.35)',
                    '/regular-tasks': 'rgba(124,58,237,0.35)',
                    '/projects/board': 'rgba(249,115,22,0.35)',
                    '/training': 'rgba(16,185,129,0.35)',
                    '/calendar': 'rgba(14,165,233,0.35)',
                    '/announcements': 'rgba(59,130,246,0.35)',
                    '/documents': 'rgba(139,92,246,0.35)',
                    'team': 'rgba(236,72,153,0.35)',

                    '/notifications': 'rgba(239,68,68,0.35)',
                    '/settings': 'rgba(107,114,128,0.35)',
                  };
                  const iconFgColors: Record<string, string> = {
                    '/dashboard': '#a5b4fc',
                    '/regular-tasks': '#a78bfa',
                    '/projects/board': '#fb923c',
                    '/training': '#34d399',
                    '/calendar': '#38bdf8',
                    '/announcements': '#60a5fa',
                    '/documents': '#a78bfa',
                    'team': '#f472b6',

                    '/notifications': '#f87171',
                    '/settings': '#9ca3af',
                  };

                  const bg = iconColors[item.key] || 'rgba(124,58,237,0.15)';
                  const bgActive = iconActiveColors[item.key] || 'rgba(124,58,237,0.35)';
                  const fg = iconFgColors[item.key] || '#a78bfa';

                  return (
                    <div key={item.key}>
                      <button
                        className={`sidebar-nav-item${exactActive || (active && !hasChildren) ? ' active' : ''}`}
                        onClick={() => {
                          if (hasChildren && !collapsed) {
                            // Toggle children: navigate to the first child
                            navigate(item.children[0].key);
                          } else {
                            navigate(item.key);
                          }
                        }}
                        title={collapsed ? item.label : undefined}
                      >
                        <span
                          className="sidebar-nav-icon"
                          style={{
                            background: (exactActive || (active && !hasChildren)) ? bgActive : bg,
                            color: fg,
                          }}
                        >
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <>
                            <span style={{ flex: 1 }}>{item.label}</span>
                            {hasChildren && (
                              <span style={{
                                fontSize: 10, opacity: 0.4,
                                transition: 'transform 0.2s',
                                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              }}>
                                ›
                              </span>
                            )}
                            {/* Task count badges */}
                            {item.key === '/notifications' && (
                              <Badge count={5} size="small" style={{ fontSize: 10 }} />
                            )}
                          </>
                        )}
                      </button>

                      {/* Children */}
                      {!collapsed && expanded && hasChildren && item.children.map((child: any) => {
                        const childActive = location.pathname === child.key;
                        return (
                          <button
                            key={child.key}
                            className={`sidebar-nav-child${childActive ? ' active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(child.key);
                            }}
                          >
                            <span style={{
                              width: 5, height: 5, borderRadius: '50%',
                              background: childActive ? '#c4b5fd' : 'rgba(255,255,255,0.2)',
                              flexShrink: 0,
                            }} />
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User mini profile */}
          {!collapsed && (
            <div style={{
              margin: '8px 12px 12px',
              padding: '10px 12px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              <Dropdown menu={userMenu} placement="topRight" trigger={['click']}>
                <div style={{
                  padding: 2, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                }}>
                  <Avatar src={user?.avatar} style={{ backgroundColor: '#7c3aed', border: '2px solid #1e1b4b' }} size={34}>
                    {user?.name?.charAt(0)}
                  </Avatar>
                </div>
              </Dropdown>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
                  {user?.name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                  {user?.role === 'ADMIN' ? '管理员' : '成员'}
                </div>
              </div>
              <Dropdown menu={userMenu} placement="topRight" trigger={['click']}>
                <SettingOutlined style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, cursor: 'pointer' }} />
              </Dropdown>
            </div>
          )}
          {collapsed && (
            <div style={{ padding: '8px 0 12px', display: 'flex', justifyContent: 'center' }}>
              <Dropdown menu={userMenu} placement="topRight" trigger={['click']}>
                <div style={{
                  padding: 2, borderRadius: '50%', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                }}>
                  <Avatar src={user?.avatar} style={{ backgroundColor: '#7c3aed', border: '2px solid #1e1b4b' }} size={32}>
                    {user?.name?.charAt(0)}
                  </Avatar>
                </div>
              </Dropdown>
            </div>
          )}
        </div>
      </Sider>

      <Layout>
        {/* Header with glass effect */}
        <Header style={{
          padding: '0 24px',
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(124, 58, 237, 0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined style={{ fontSize: 18 }} /> : <MenuFoldOutlined style={{ fontSize: 18 }} />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: 40, height: 40, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Badge count={5} size="small" offset={[-2, 4]}>
              <div
                onClick={() => navigate('/notifications')}
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'rgba(124,58,237,0.06)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.06)'; }}
              >
                <BellOutlined style={{ fontSize: 20, color: '#7c3aed' }} />
              </div>
            </Badge>

            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '4px 12px 4px 4px',
                borderRadius: 14,
                background: 'rgba(124,58,237,0.05)',
                transition: 'all 0.2s',
              }}>
                <div style={{
                  padding: 2,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
                }}>
                  <Avatar
                    src={user?.avatar}
                    style={{ backgroundColor: '#7c3aed', border: '2px solid #fff' }}
                    size={32}
                  >
                    {user?.name?.charAt(0)}
                  </Avatar>
                </div>
                <span style={{ fontWeight: 500, color: '#1e1b4b' }}>{user?.name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content style={{
          margin: '20px 24px',
          padding: 24,
          background: colorBgContainer,
          borderRadius: 16,
          minHeight: 280,
          overflow: 'auto',
          boxShadow: '0 2px 12px rgba(124,58,237,0.04)',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
