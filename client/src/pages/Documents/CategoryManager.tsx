import { useState } from 'react';
import { Modal, Button, Input, App, Popconfirm, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface TagApi {
  list: () => Promise<any>;
  create: (data: { name: string }) => Promise<any>;
  update: (id: string, data: { name?: string }) => Promise<any>;
  remove: (id: string) => Promise<any>;
}

interface TagConfig {
  key: string;
  label: string;
  queryKey: string;
  itemLabel: string;
  emptyText: string;
  placeholder: string;
  deleteDescription: string;
  api: TagApi;
}

function TagList({ config }: { config: TagConfig }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { data: items, isLoading } = useQuery({
    queryKey: [config.queryKey],
    queryFn: () => config.api.list().then((r: any) => r.data),
  });

  const list: { id: string; name: string; sort: number }[] = Array.isArray(items) ? items : [];

  const createMutation = useMutation({
    mutationFn: (name: string) => config.api.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      setNewName('');
      message.success(`${config.itemLabel}已添加`);
    },
    onError: (e: any) => message.error(e?.response?.data?.message || '添加失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => config.api.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      setEditingId(null);
      setEditName('');
      message.success(`${config.itemLabel}已更新`);
    },
    onError: (e: any) => message.error(e?.response?.data?.message || '更新失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => config.api.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      message.success(`${config.itemLabel}已删除`);
    },
    onError: (e: any) => message.error(e?.response?.data?.message || '删除失败'),
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  };

  const handleStartEdit = (item: { id: string; name: string }) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({ id: editingId, name: editName.trim() });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>加载中...</div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13 }}>{config.emptyText}</div>
      ) : (
        list.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 10,
              background: editingId === item.id ? '#f5f3ff' : '#f9fafb',
              border: editingId === item.id ? '1px solid #c4b5fd' : '1px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {editingId === item.id ? (
              <>
                <Input
                  size="small" value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onPressEnter={handleSaveEdit}
                  style={{ flex: 1, borderRadius: 6 }}
                  autoFocus
                />
                <Button size="small" type="text" icon={<CheckOutlined />} onClick={handleSaveEdit} style={{ color: '#10b981' }} />
                <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => { setEditingId(null); setEditName(''); }} style={{ color: '#9ca3af' }} />
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#374151' }}>{item.name}</span>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleStartEdit(item)} style={{ color: '#9ca3af' }} />
                <Popconfirm title={`确定删除此${config.itemLabel}？`} description={config.deleteDescription} onConfirm={() => deleteMutation.mutate(item.id)}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </>
            )}
          </div>
        ))
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
        <Input
          placeholder={config.placeholder}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={handleCreate}
          style={{ borderRadius: 8, flex: 1 }}
        />
        <Button icon={<PlusOutlined />} onClick={handleCreate} disabled={!newName.trim()} style={{ borderRadius: 8 }}>
          添加
        </Button>
      </div>
    </div>
  );
}

interface TagManageModalProps {
  open: boolean;
  onClose: () => void;
  categoryApi: TagApi;
  scenarioApi: TagApi;
  folderApi: TagApi;
}

export function TagManageModal({ open, onClose, categoryApi, scenarioApi, folderApi }: TagManageModalProps) {
  const tabConfigs: TagConfig[] = [
    {
      key: 'category',
      label: '分类',
      queryKey: 'document-categories',
      itemLabel: '分类',
      emptyText: '暂无自定义分类',
      placeholder: '输入新分类名称',
      deleteDescription: '已有文档使用此分类不会受影响',
      api: categoryApi,
    },
    {
      key: 'scenario',
      label: '场景',
      queryKey: 'sop-scenarios',
      itemLabel: '场景',
      emptyText: '暂无自定义场景',
      placeholder: '输入新场景名称',
      deleteDescription: '已有 SOP 使用此场景不会受影响',
      api: scenarioApi,
    },
    {
      key: 'folder',
      label: '目录',
      queryKey: 'managed-document-folders',
      itemLabel: '目录',
      emptyText: '暂无自定义目录',
      placeholder: '输入新目录名称',
      deleteDescription: '已有文档使用此目录不会受影响',
      api: folderApi,
    },
  ];

  return (
    <Modal title="管理标签" open={open} onCancel={onClose} footer={null} width={520}>
      <Tabs
        items={tabConfigs.map((cfg) => ({
          key: cfg.key,
          label: cfg.label,
          children: <TagList config={cfg} />,
        }))}
      />
    </Modal>
  );
}

// Keep individual modals for potential direct use
interface SingleManagerProps {
  open: boolean;
  onClose: () => void;
  api: TagApi;
}

function SingleTagManager({ open, onClose, title, queryKey, itemLabel, emptyText, placeholder, deleteDescription, api }: {
  open: boolean; onClose: () => void; title: string; queryKey: string; itemLabel: string;
  emptyText: string; placeholder: string; deleteDescription: string; api: TagApi;
}) {
  return (
    <Modal title={title} open={open} onCancel={onClose} footer={null} width={480}>
      <TagList config={{ key: queryKey, label: itemLabel, queryKey, itemLabel, emptyText, placeholder, deleteDescription, api }} />
    </Modal>
  );
}

export function CategoryManager({ open, onClose, api }: SingleManagerProps) {
  return (
    <SingleTagManager open={open} onClose={onClose} api={api}
      title="管理文档分类" queryKey="document-categories" itemLabel="分类"
      emptyText="暂无自定义分类" placeholder="输入新分类名称"
      deleteDescription="已有文档使用此分类不会受影响"
    />
  );
}

export function ScenarioManager({ open, onClose, api }: SingleManagerProps) {
  return (
    <SingleTagManager open={open} onClose={onClose} api={api}
      title="管理应用场景" queryKey="sop-scenarios" itemLabel="场景"
      emptyText="暂无自定义场景" placeholder="输入新场景名称"
      deleteDescription="已有 SOP 使用此场景不会受影响"
    />
  );
}

export function FolderManager({ open, onClose, api }: SingleManagerProps) {
  return (
    <SingleTagManager open={open} onClose={onClose} api={api}
      title="管理文档目录" queryKey="managed-document-folders" itemLabel="目录"
      emptyText="暂无自定义目录" placeholder="输入新目录名称"
      deleteDescription="已有文档使用此目录不会受影响"
    />
  );
}
