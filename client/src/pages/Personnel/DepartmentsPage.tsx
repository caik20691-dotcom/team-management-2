import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tree, Button, Modal, Form, Input, Select, Typography, App, Card, Space, Tag,
  Avatar, Tooltip, Popconfirm, Empty, Dropdown, Spin,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ApartmentOutlined,
  UserOutlined, TeamOutlined, CrownOutlined, CloseOutlined,
  CheckOutlined, MoreOutlined,
} from '@ant-design/icons';
import { departmentApi, userApi } from '../../api';
import { useAuthStore } from '../../stores/auth';

const { Text } = Typography;

// ── Inline editable component ──
function InlineEdit({ value, onSave, style }: { value: string; onSave: (v: string) => void; style?: React.CSSProperties }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  if (!editing) {
    return (
      <span
        onClick={(e) => { e.stopPropagation(); setEditing(true); setText(value); }}
        style={{ cursor: 'text', fontWeight: 600, fontSize: 13, color: '#1e1b4b', padding: '1px 4px', borderRadius: 4, ...style }}
        title="点击编辑名称"
      >
        {value}
      </span>
    );
  }

  return (
    <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Input
        size="small"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPressEnter={() => { if (text.trim()) { onSave(text.trim()); setEditing(false); } }}
        onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setText(value); } }}
        autoFocus
        style={{ width: 120, borderRadius: 6, fontSize: 12 }}
      />
      <Button size="small" type="text" icon={<CheckOutlined style={{ color: '#10b981' }} />}
        onClick={() => { if (text.trim()) { onSave(text.trim()); setEditing(false); } }}
        style={{ padding: 0, width: 22, height: 22 }} />
      <Button size="small" type="text" icon={<CloseOutlined style={{ color: '#ef4444' }} />}
        onClick={() => { setEditing(false); setText(value); }}
        style={{ padding: 0, width: 22, height: 22 }} />
    </span>
  );
}

// ── Build tree from flat list ──
function buildTree(items: any[]): any[] {
  const map = new Map<string, any>();
  const roots: any[] = [];
  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }
  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function buildTreeData(
  items: any[],
  onRename: (id: string, name: string) => void,
  onEdit: (d: any) => void,
  onAddChild: (d: any) => void,
  onDelete: (d: any) => void,
  onSelectDept: (d: any) => void,
  canManage = true,
): any[] {
  return items.map((item: any) => ({
    title: (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0',
        width: '100%',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #ddd6fe, #c4b5fd)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }} onClick={() => onSelectDept(item)}>
          <ApartmentOutlined style={{ color: '#7c3aed', fontSize: 15 }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ cursor: 'pointer' }} onClick={() => onSelectDept(item)}>
            <InlineEdit value={item.name} onSave={(name) => onRename(item.id, name)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Tag style={{ borderRadius: 5, fontSize: 10, lineHeight: '16px', margin: 0 }}>
              <TeamOutlined style={{ marginRight: 2 }} />{item._count?.users || 0} 人
            </Tag>
            {item._count?.children > 0 && (
              <Tag style={{ borderRadius: 5, fontSize: 10, lineHeight: '16px', margin: 0 }}>
                <ApartmentOutlined style={{ marginRight: 2 }} />{item._count.children} 子部门
              </Tag>
            )}
          </div>
        </div>

        {item.head && (
          <Tooltip title={`负责人：${item.head.name}`}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
              padding: '2px 8px 2px 2px', borderRadius: 20,
              background: 'rgba(124,58,237,0.06)',
            }}>
              <div style={{
                padding: 1.5, borderRadius: '50%',
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              }}>
                <Avatar src={item.head.avatar} icon={<UserOutlined />} size={20}
                  style={{ border: '1.5px solid #fff' }} />
              </div>
              <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 500 }}>{item.head.name}</span>
            </div>
          </Tooltip>
        )}

        {canManage && (
          <Space size={1} className="dept-actions" onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
            <Tooltip title="添加子部门">
              <Button size="small" type="text" icon={<PlusOutlined />}
                onClick={() => onAddChild(item)}
                style={{ borderRadius: 8, color: '#7c3aed', fontSize: 13 }} />
            </Tooltip>
            <Tooltip title="编辑">
              <Button size="small" type="text" icon={<EditOutlined />}
                onClick={() => onEdit(item)}
                style={{ borderRadius: 8, color: '#3b82f6', fontSize: 13 }} />
            </Tooltip>
            <Tooltip title="删除">
              <Popconfirm title="确定删除该部门？子部门将移至顶层" onConfirm={() => onDelete(item)}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />}
                  style={{ borderRadius: 8, fontSize: 13 }} />
              </Popconfirm>
            </Tooltip>
          </Space>
        )}
      </div>
    ),
    key: item.id,
    children: item.children?.length > 0
      ? buildTreeData(item.children, onRename, onEdit, onAddChild, onDelete, onSelectDept, canManage)
      : undefined,
  }));
}

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const canManage = isAdmin || isManager;
  const [modalOpen, setModalOpen] = useState<{ type: 'create' | 'edit'; parentId?: string; id?: string } | null>(null);
  const [detailDept, setDetailDept] = useState<any>(null);
  const [form] = Form.useForm();
  const [editingDesc, setEditingDesc] = useState(false);
  const [descText, setDescText] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberUserId, setMemberUserId] = useState<string>('');

  const { data: depts, isFetching: deptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list().then((r) => r.data),
  });

  const { data: usersResp } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => userApi.list({ pageSize: '200' }).then((r) => r.data),
  });

  const { data: detail } = useQuery({
    queryKey: ['department', detailDept?.id],
    queryFn: () => departmentApi.get(detailDept.id).then((r) => r.data),
    enabled: !!detailDept?.id,
  });

  const allUsers = usersResp?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => departmentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      if (detailDept?.id) queryClient.invalidateQueries({ queryKey: ['department', detailDept.id] });
      message.success('创建成功');
      setModalOpen(null);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => departmentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      if (detailDept?.id) queryClient.invalidateQueries({ queryKey: ['department', detailDept.id] });
      message.success('更新成功');
      setModalOpen(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      if (detailDept?.id) queryClient.invalidateQueries({ queryKey: ['department', detailDept.id] });
      message.success('删除成功');
      if (detailDept?.id) setDetailDept(null);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => userApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department', detailDept?.id] });
      message.success('成员更新成功');
      setAddingMember(false);
      setMemberUserId('');
    },
  });

  const tree = useMemo(() => buildTree(depts || []), [depts]);

  const handleRename = (id: string, name: string) => {
    updateMutation.mutate({ id, data: { name } });
  };

  const handleHeadChange = (headId: string | undefined) => {
    if (!detailDept) return;
    updateMutation.mutate({ id: detailDept.id, data: { headId: headId || null } });
  };

  const handleDescSave = () => {
    if (!detailDept) return;
    updateMutation.mutate({ id: detailDept.id, data: { description: descText || null } });
    setEditingDesc(false);
  };

  const handleAddMember = () => {
    if (!memberUserId || !detailDept) return;
    updateUserMutation.mutate({ id: memberUserId, data: { departmentId: detailDept.id } });
  };

  const handleRemoveMember = (userId: string) => {
    updateUserMutation.mutate({ id: userId, data: { departmentId: null } });
  };

  const onEdit = (item: any) => {
    setModalOpen({ type: 'edit', id: item.id });
    form.setFieldsValue({
      name: item.name,
      description: item.description,
      headId: item.head?.id || undefined,
    });
  };

  const onAddChild = (item: any) => {
    setModalOpen({ type: 'create', parentId: item.id });
    form.resetFields();
  };

  const onDelete = (item: any) => {
    deleteMutation.mutate(item.id);
  };

  const openDetail = (keys: any[]) => {
    if (keys.length > 0) {
      const id = keys[0] as string;
      const dept = (depts || []).find((d: any) => d.id === id);
      if (dept) setDetailDept(dept);
    }
  };

  // Get users not in current department (for member add dropdown)
  const nonMemberUsers = allUsers.filter((u: any) => {
    if (!detail?.users) return true;
    return !detail.users.find((mu: any) => mu.id === u.id);
  });

  return (
    <div>
      <style>{`
        .dept-actions { opacity: 0; transition: opacity 0.15s; }
        .ant-tree-treenode:hover .dept-actions { opacity: 1; }
        .dept-detail-avatar { transition: transform 0.2s; cursor: pointer; }
        .dept-detail-avatar:hover { transform: scale(1.02); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
          }}>
            <ApartmentOutlined style={{ fontSize: 18, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700 }}>组织架构</span>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            ({depts?.length || 0} 个部门)
          </span>
        </div>
        {canManage && (
          <Button
            icon={<PlusOutlined />} type="primary"
            onClick={() => { setModalOpen({ type: 'create' }); form.resetFields(); }}
            style={{ borderRadius: 10, height: 38, fontWeight: 500 }}>
            添加部门
          </Button>
        )}
      </div>

      {/* ── Tree + Detail side by side ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Tree card */}
        <Card
          style={{
            flex: 1, borderRadius: 16, border: '1px solid rgba(0,0,0,0.04)',
            minHeight: 300,
          }}
          styles={{ body: { padding: '16px 20px' } }}
        >
          {deptsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : tree.length > 0 ? (
            <Tree
              showLine={{ showLeafIcon: false }}
              defaultExpandAll
              blockNode
              treeData={buildTreeData(tree, handleRename, onEdit, onAddChild, onDelete, openDetail, canManage)}
              onSelect={(keys) => openDetail(keys)}
              style={{ background: 'transparent' }}
            />
          ) : (
            <Empty description="暂无部门，点击右上角创建" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>

        {/* Detail card */}
        {detailDept && detail && (
          <Card
            style={{
              width: 340, borderRadius: 16, flexShrink: 0,
              border: '1px solid rgba(0,0,0,0.04)',
              position: 'sticky', top: 84,
            }}
            styles={{ body: { padding: 0 } }}
          >
            {/* Detail header */}
            <div style={{
              padding: '18px 20px 14px',
              background: 'linear-gradient(135deg, #faf5ff, #f0f9ff)',
              borderRadius: '16px 16px 0 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(124,58,237,0.25)',
                }}>
                  <ApartmentOutlined style={{ fontSize: 20, color: '#fff' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {canManage ? (
                    <InlineEdit
                      value={detail.name}
                      onSave={(name) => handleRename(detail.id, name)}
                      style={{ fontSize: 15 }}
                    />
                  ) : (
                    <span style={{ fontWeight: 600, fontSize: 15, color: '#1e1b4b' }}>{detail.name}</span>
                  )}
                  {detail.parent && (
                    <Text style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>
                      上级：{detail.parent.name}
                    </Text>
                  )}
                </div>
              </div>
              <Space size={4}>
                <Tag style={{ borderRadius: 6 }}>
                  <TeamOutlined style={{ marginRight: 3 }} />{detail.users?.length || 0} 名成员
                </Tag>
                {detail.children?.length > 0 && (
                  <Tag style={{ borderRadius: 6 }}>
                    <ApartmentOutlined style={{ marginRight: 3 }} />{detail.children.length} 个子部门
                  </Tag>
                )}
              </Space>
            </div>

            <div style={{ padding: '14px 20px' }}>
              {/* Description — inline editable */}
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  部门简介
                </Text>
                {canManage && editingDesc ? (
                  <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <Input.TextArea
                      rows={2}
                      value={descText}
                      onChange={(e) => setDescText(e.target.value)}
                      style={{ borderRadius: 8, fontSize: 13, flex: 1 }}
                      autoSize
                    />
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <Button size="small" type="text" icon={<CheckOutlined style={{ color: '#10b981' }} />}
                        onClick={handleDescSave} loading={updateMutation.isPending}
                        style={{ padding: '0 4px', height: 28 }} />
                      <Button size="small" type="text" icon={<CloseOutlined style={{ color: '#ef4444' }} />}
                        onClick={() => setEditingDesc(false)}
                        style={{ padding: '0 4px', height: 28 }} />
                    </div>
                  </div>
                ) : canManage ? (
                  <div
                    onClick={() => { setEditingDesc(true); setDescText(detail.description || ''); }}
                    style={{
                      marginTop: 4, fontSize: 13, color: detail.description ? '#4b5563' : '#d1d5db',
                      lineHeight: 1.6, cursor: 'pointer', padding: '2px 4px', borderRadius: 4,
                      border: '1px dashed transparent',
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = '#d1d5db'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = 'transparent'; }}
                    title="点击编辑简介"
                  >
                    {detail.description || '暂无简介'}
                  </div>
                ) : (
                  <div style={{ marginTop: 4, fontSize: 13, color: detail.description ? '#4b5563' : '#d1d5db', lineHeight: 1.6 }}>
                    {detail.description || '暂无简介'}
                  </div>
                )}
              </div>

              {/* Department Head */}
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  部门负责人
                </Text>
                <div style={{ marginTop: 6 }}>
                  {canManage ? (
                    <Select
                      allowClear
                      value={detail.head?.id || undefined}
                      onChange={handleHeadChange}
                      placeholder="选择负责人"
                      style={{ width: '100%', borderRadius: 8 }}
                      size="small"
                      loading={updateMutation.isPending}
                      options={allUsers.map((u: any) => ({
                        label: `${u.name}${u.position ? ` (${u.position})` : ''}`,
                        value: u.id,
                      }))}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: detail.head ? '#1e1b4b' : '#d1d5db' }}>
                      {detail.head ? `${detail.head.name}${detail.head.position ? ` (${detail.head.position})` : ''}` : '未设置'}
                    </span>
                  )}
                </div>
              </div>

              {/* Members */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    部门成员 ({detail.users?.length || 0})
                  </Text>
                  {canManage && (
                    <Button
                      size="small" type="link"
                      icon={<PlusOutlined />}
                      onClick={() => setAddingMember(true)}
                      style={{ fontSize: 11, padding: 0, height: 'auto' }}>
                      添加
                    </Button>
                  )}
                </div>

                {/* Add member inline */}
                {addingMember && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Select
                      showSearch
                      value={memberUserId || undefined}
                      onChange={(v) => setMemberUserId(v)}
                      placeholder="搜索并选择成员"
                      style={{ flex: 1, borderRadius: 8 }}
                      size="small"
                      autoFocus
                      filterOption={(input, option) =>
                        (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={nonMemberUsers.map((u: any) => ({
                        label: `${u.name}${u.position ? ` (${u.position})` : ''}`,
                        value: u.id,
                      }))}
                    />
                    <Button size="small" icon={<CheckOutlined />}
                      onClick={handleAddMember}
                      loading={updateUserMutation.isPending}
                      disabled={!memberUserId}
                      style={{ borderRadius: 6, color: '#10b981' }} />
                    <Button size="small" icon={<CloseOutlined />}
                      onClick={() => { setAddingMember(false); setMemberUserId(''); }}
                      style={{ borderRadius: 6, color: '#ef4444' }} />
                  </div>
                )}

                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                  {detail.users?.map((u: any) => (
                    <div key={u.id} className="dept-detail-avatar"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '4px 8px', borderRadius: 8,
                        background: 'rgba(0,0,0,0.01)',
                      }}>
                      <Avatar src={u.avatar} icon={<UserOutlined />} size={26}
                        style={{ backgroundColor: '#7c3aed', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#1e1b4b' }}>{u.name}</div>
                        {u.position && (
                          <div style={{ fontSize: 10, color: '#9ca3af' }}>{u.position}</div>
                        )}
                      </div>
                      {canManage && (
                        <Tooltip title="移出部门">
                          <Button
                            size="small" type="text" danger
                            icon={<CloseOutlined style={{ fontSize: 10 }} />}
                            onClick={() => handleRemoveMember(u.id)}
                            style={{ borderRadius: 4, padding: '0 4px', height: 22, opacity: 0 }}
                            className="remove-member-btn"
                          />
                        </Tooltip>
                      )}
                    </div>
                  ))}
                  {detail.users?.length === 0 && !addingMember && (
                    <span style={{ fontSize: 12, color: '#d1d5db' }}>暂无成员</span>
                  )}
                </div>
              </div>

              {/* Sub-departments */}
              {detail.children?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    子部门
                  </Text>
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {detail.children.map((c: any) => (
                      <Tag key={c.id} style={{
                        borderRadius: 8, cursor: 'pointer', padding: '4px 10px',
                        fontSize: 12, fontWeight: 500,
                      }}
                        onClick={() => {
                          const found = (depts || []).find((d: any) => d.id === c.id);
                          if (found) setDetailDept(found);
                        }}>
                        <ApartmentOutlined style={{ marginRight: 4, fontSize: 11 }} />
                        {c.name} ({c._count?.users || 0}人)
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {canManage && (
                <Button icon={<EditOutlined />} block style={{ borderRadius: 10, marginTop: 8 }}
                  onClick={() => onEdit(detail)}>
                  编辑部门
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* ── Create/Edit Modal ── */}
      <Modal
        title={modalOpen?.type === 'edit' ? '编辑部门' : '添加部门'}
        open={!!modalOpen}
        onCancel={() => setModalOpen(null)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => {
            const data: any = {
              name: v.name,
              description: v.description || undefined,
              headId: v.headId || undefined,
            };
            if (modalOpen?.type === 'create') {
              if (modalOpen?.parentId) data.parentId = modalOpen.parentId;
              else if (v.parentId) data.parentId = v.parentId;
              createMutation.mutate(data);
            } else {
              updateMutation.mutate({ id: modalOpen!.id!, data });
            }
          }}
        >
          <Form.Item name="name" label="部门名称" rules={[{ required: true, message: '请输入部门名称' }]}>
            <Input style={{ borderRadius: 8 }} placeholder="如：技术研发部" />
          </Form.Item>

          <Form.Item name="description" label="部门简介">
            <Input.TextArea rows={3} style={{ borderRadius: 8 }} placeholder="部门职责与介绍（可选）" />
          </Form.Item>

          <Form.Item name="headId" label="部门负责人">
            <Select
              allowClear
              showSearch
              placeholder="选择负责人"
              style={{ borderRadius: 8 }}
              filterOption={(input, option) =>
                (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
              }
              options={allUsers.map((u: any) => ({
                label: `${u.name}${u.position ? ` (${u.position})` : ''}`,
                value: u.id,
              }))}
            />
          </Form.Item>

          {modalOpen?.type === 'create' && !modalOpen?.parentId && (
            <Form.Item name="parentId" label="上级部门">
              <Select allowClear placeholder="留空则为顶级部门" style={{ borderRadius: 8 }}>
                {(depts || []).map((d: any) => (
                  <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {modalOpen?.type === 'create' && modalOpen?.parentId && (
            <div style={{
              padding: '8px 12px', borderRadius: 8, marginBottom: 14,
              background: '#f5f3ff', fontSize: 12, color: '#7c3aed', fontWeight: 500,
            }}>
              将作为子部门创建
              {(() => {
                const parent = (depts || []).find((d: any) => d.id === modalOpen.parentId);
                return parent ? `，上级部门：${parent.name}` : '';
              })()}
            </div>
          )}
        </Form>
      </Modal>

      {/* Hover reveal for remove member button */}
      <style>{`
        .remove-member-btn { transition: opacity 0.15s; }
        .dept-detail-avatar:hover .remove-member-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
