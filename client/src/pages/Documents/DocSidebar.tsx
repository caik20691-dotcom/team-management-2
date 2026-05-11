import {
  HomeOutlined, FileTextOutlined,
  ThunderboltOutlined, SettingOutlined,
} from '@ant-design/icons';

interface DocSidebarProps {
  activeView: string;
  onViewChange: (view: string, folder?: string) => void;
  onManageTags: () => void;
  collapsed: boolean;
}

export default function DocSidebar({ activeView, onViewChange, onManageTags, collapsed }: DocSidebarProps) {
  const navItems = [
    { key: 'dashboard', label: '知识库首页', icon: <HomeOutlined /> },
    { key: 'list', label: '全部文档', icon: <FileTextOutlined /> },
    { key: 'sop', label: '工作 SOP', icon: <ThunderboltOutlined /> },
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      <style>{`
        .kb-sidebar-item {
          display: flex; align-items: center; gap: 10px;
          width: calc(100% - 12px); margin: 2px 6px;
          padding: 9px 12px; border-radius: 9px; cursor: pointer;
          border: none; background: transparent;
          color: #374151; font-size: 13px; font-weight: 500;
          transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
          white-space: nowrap; text-align: left;
        }
        .kb-sidebar-item:hover { background: #f3f4f6; }
        .kb-sidebar-item.active {
          background: linear-gradient(135deg, #f5f3ff, #ede9fe);
          color: #7c3aed; font-weight: 600;
        }
        .kb-sidebar-divider {
          height: 1px; margin: 10px 12px;
          background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
        }
      `}</style>

      {navItems.map((item) => (
        <button
          key={item.key}
          className={`kb-sidebar-item${activeView === item.key ? ' active' : ''}`}
          onClick={() => onViewChange(item.key)}
        >
          <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>
            {item.icon}
          </span>
          {!collapsed && <span>{item.label}</span>}
        </button>
      ))}

      <div className="kb-sidebar-divider" />

      {!collapsed ? (
        <>
          <button
            className={`kb-sidebar-item${activeView === 'templates' ? ' active' : ''}`}
            onClick={() => onViewChange('templates')}
          >
            <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>📝</span>
            <span>模板中心</span>
          </button>
          <button
            className={`kb-sidebar-item${activeView === 'files' ? ' active' : ''}`}
            onClick={() => onViewChange('files')}
          >
            <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>📎</span>
            <span>文件管理</span>
          </button>
        </>
      ) : (
        <>
          <button
            className={`kb-sidebar-item${activeView === 'templates' ? ' active' : ''}`}
            onClick={() => onViewChange('templates')}
            title="模板中心"
          >
            <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>📝</span>
          </button>
          <button
            className={`kb-sidebar-item${activeView === 'files' ? ' active' : ''}`}
            onClick={() => onViewChange('files')}
            title="文件管理"
          >
            <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>📎</span>
          </button>
        </>
      )}

      <div className="kb-sidebar-divider" />

      <button
        className="kb-sidebar-item"
        onClick={onManageTags}
        title={collapsed ? '管理标签' : undefined}
      >
        <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>
          <SettingOutlined />
        </span>
        {!collapsed && <span>管理标签</span>}
      </button>
    </div>
  );
}
