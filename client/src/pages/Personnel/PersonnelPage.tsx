import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Space, Tag, Modal, Form, Input, Select, App,
  Avatar, Card, Popconfirm, Drawer, Descriptions, Badge, Tooltip,
  Switch, Dropdown, Upload,
} from 'antd';
import {
  UserOutlined, EditOutlined, TeamOutlined, PlusOutlined, DeleteOutlined,
  EyeOutlined, MailOutlined, PhoneOutlined, IdcardOutlined, ClockCircleOutlined,
  SafetyOutlined, ApartmentOutlined, DownloadOutlined, UploadOutlined,
  CheckOutlined, CloseOutlined, MoreOutlined, SwapOutlined, ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { userApi, departmentApi, validateImageFile, fileApi } from '../../api';
import { useAuthStore } from '../../stores/auth';
import dayjs from 'dayjs';

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN:   { label: '管理员', color: '#7c3aed', bg: '#f5f3ff' },
  MANAGER: { label: '主管',   color: '#3b82f6', bg: '#eff6ff' },
  MEMBER:  { label: '成员',   color: '#10b981', bg: '#ecfdf5' },
  VIEWER:  { label: '观察者', color: '#9ca3af', bg: '#f9fafb' },
};
const statusMap: Record<string, { label: string; color: string }> = {
  ACTIVE:    { label: '在职', color: '#10b981' },
  INACTIVE:  { label: '离职', color: '#9ca3af' },
  SUSPENDED: { label: '停用', color: '#ef4444' },
};

// Inline editable cell
function EditableCell({ value, onSave, type = 'text', options, record }: {
  value: any;
  onSave: (val: any) => void;
  type?: 'text' | 'select' | 'email';
  options?: { label: string; value: string }[];
  record?: any;
}) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value);
  const inputRef = useRef<any>(null);

  const startEdit = () => {
    setTemp(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus?.(), 50);
  };

  const commit = (val?: any) => {
    const final = val !== undefined ? val : temp;
    setEditing(false);
    if (final !== value) onSave(final);
  };

  const cancel = () => {
    setEditing(false);
    setTemp(value);
  };

  if (!editing) {
    return (
      <div
        onClick={startEdit}
        style={{
          cursor: 'pointer', padding: '4px 8px', margin: '-4px -8px',
          borderRadius: 6, transition: 'background 0.15s', minHeight: 22,
          display: 'flex', alignItems: 'center', gap: 4,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f5f3ff'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        title="点击编辑"
      >
        <span style={{ flex: 1 }}>
          {type === 'select' && options
            ? (options.find((o) => o.value === value)?.label || value || <span style={{ color: '#d1d5db' }}>-</span>)
            : (value || <span style={{ color: '#d1d5db' }}>-</span>)
          }
        </span>
        <EditOutlined style={{ fontSize: 10, color: '#c4b5fd', opacity: 0 }} className="edit-hint" />
      </div>
    );
  }

  if (type === 'select' && options) {
    return (
      <Select
        ref={inputRef}
        value={temp}
        style={{ width: '100%' }}
        size="small"
        onChange={(v) => { setTemp(v); commit(v); }}
        onBlur={cancel}
        open
        autoFocus
        options={options}
        dropdownStyle={{ minWidth: 120 }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <Input
        ref={inputRef}
        size="small"
        value={temp}
        type={type === 'email' ? 'email' : 'text'}
        onChange={(e) => setTemp(e.target.value)}
        onPressEnter={() => commit()}
        onBlur={cancel}
        style={{ borderRadius: 6, flex: 1 }}
        autoFocus
      />
      <Button size="small" type="text" icon={<CheckOutlined style={{ color: '#10b981' }} />}
        onClick={() => commit()}
        style={{ width: 24, height: 24, padding: 0 }} />
      <Button size="small" type="text" icon={<CloseOutlined style={{ color: '#ef4444' }} />}
        onClick={cancel}
        style={{ width: 24, height: 24, padding: 0 }} />
    </div>
  );
}

export default function PersonnelPage() {
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const [detailOpen, setDetailOpen] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [createForm] = Form.useForm();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const { data: resp, isLoading } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => userApi.list({ ...filters, pageSize: '50' }).then((r) => r.data),
  });

  const { data: depts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list().then((r) => r.data),
  });

  const { data: detail } = useQuery({
    queryKey: ['user', detailOpen?.id],
    queryFn: () => userApi.get(detailOpen.id).then((r) => r.data),
    enabled: !!detailOpen?.id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (avatarFile) {
        const uploadRes = await fileApi.upload(avatarFile);
        data.avatar = uploadRes.data.url;
      }
      return userApi.create(data);
    },
    onSuccess: () => { invalidate(); message.success('用户创建成功'); setCreateOpen(false); createForm.resetFields(); setAvatarFile(null); },
    onError: (err: any) => { message.error(err.response?.data?.message || '创建失败'); },
  });

  // Inline field update - optimistic
  const inlineUpdate = useCallback((id: string, field: string, value: any) => {
    userApi.update(id, { [field]: value }).then(() => {
      invalidate();
      message.success('已更新');
    }).catch(() => message.error('更新失败'));
  }, []);

  // Quick status toggle
  const toggleStatus = useCallback((id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const label = newStatus === 'ACTIVE' ? '启用' : '停用';
    modal.confirm({
      title: `确认${label}该用户？`,
      icon: <ExclamationCircleOutlined />,
      content: `确定要${label}此用户账号吗？`,
      okText: label,
      cancelText: '取消',
      onOk: () => userApi.update(id, { status: newStatus }).then(() => { invalidate(); message.success(`已${label}`); }),
    });
  }, []);

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => userApi.batchDelete(ids),
    onSuccess: (data: any) => {
      invalidate();
      setSelectedRowKeys([]);
      message.success(`已批量停用 ${data?.count || 0} 名用户`);
    },
  });

  // Export to CSV
  const exportCSV = () => {
    const users = resp?.data || [];
    const headers = ['姓名', '邮箱', '职位', '部门', '角色', '状态', '入职日期'];
    const rows = users.map((u: any) => [
      u.name, u.email, u.position || '', u.department?.name || '',
      roleConfig[u.role]?.label || u.role, statusMap[u.status]?.label || u.status,
      dayjs(u.joinedAt).format('YYYY-MM-DD'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `人员列表_${dayjs().format('YYYYMMDD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  const deptOptions = (depts || []).map((d: any) => ({ label: d.name, value: d.id }));
  const roleOptions = Object.entries(roleConfig).map(([k, c]) => ({ label: c.label, value: k }));

  const columns = [
    {
      title: '姓名', key: 'name', width: 180,
      render: (_: any, r: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            padding: 2, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${(roleConfig[r.role] || roleConfig.MEMBER).color}, ${(roleConfig[r.role] || roleConfig.MEMBER).color})`,
          }}>
            <Avatar src={r.avatar} icon={<UserOutlined />} size={32} style={{ border: '2px solid #fff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <EditableCell
              value={r.name}
              onSave={(val) => inlineUpdate(r.id, 'name', val)}
            />
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              <EditableCell
                value={r.position}
                onSave={(val) => inlineUpdate(r.id, 'position', val)}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '邮箱', dataIndex: 'email', key: 'email', width: 200,
      render: (v: string, r: any) => (
        <EditableCell
          value={v}
          type="email"
          onSave={(val) => inlineUpdate(r.id, 'email', val)}
        />
      ),
    },
    {
      title: '部门', key: 'dept', width: 130,
      render: (_: any, r: any) => (
        <EditableCell
          value={r.departmentId || r.department?.id}
          type="select"
          options={deptOptions}
          record={r}
          onSave={(val) => inlineUpdate(r.id, 'departmentId', val)}
        />
      ),
    },
    {
      title: '角色', dataIndex: 'role', key: 'role', width: 100,
      render: (v: string, r: any) => (
        <div onClick={(e) => e.stopPropagation()}>
          {isAdmin ? (
            <EditableCell
              value={v}
              type="select"
              options={roleOptions}
              record={r}
              onSave={(val) => inlineUpdate(r.id, 'role', val)}
            />
          ) : (
            <Tag style={{ borderRadius: 6, margin: 0, color: roleConfig[v]?.color, background: roleConfig[v]?.bg, border: 'none' }}>
              {roleConfig[v]?.label || v}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '状态', key: 'status', width: 90,
      render: (_: any, r: any) => (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isAdmin ? (
            <Switch
              size="small"
              checked={r.status === 'ACTIVE'}
              onChange={() => toggleStatus(r.id, r.status)}
              style={r.status === 'ACTIVE' ? undefined : { filter: 'grayscale(1)' }}
            />
          ) : (
            <Badge status={r.status === 'ACTIVE' ? 'success' : 'error'} />
          )}
          <span style={{
            fontSize: 11, fontWeight: 500,
            color: r.status === 'ACTIVE' ? '#10b981' : '#ef4444',
          }}>
            {statusMap[r.status]?.label || r.status}
          </span>
        </div>
      ),
    },
    {
      title: '入职', dataIndex: 'joinedAt', key: 'joinedAt', width: 95,
      render: (v: string) => (
        v ? <span style={{ fontSize: 12, color: '#6b7280' }}>{dayjs(v).format('YYYY-MM-DD')}</span> : <span style={{ color: '#d1d5db' }}>-</span>
      ),
    },
    {
      title: '操作', key: 'actions', width: 110, fixed: 'right' as any,
      render: (_: any, r: any) => (
        <Space size={2} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="查看详情">
            <Button size="small" type="text" icon={<EyeOutlined />}
              onClick={() => setDetailOpen(r)}
              style={{ borderRadius: 8, color: '#7c3aed' }} />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                { key: 'detail', icon: <EyeOutlined />, label: '查看详情', onClick: () => setDetailOpen(r) },
                ...(isAdmin ? [
                  { key: 'toggle', icon: <SwapOutlined />, label: r.status === 'ACTIVE' ? '停用账号' : '启用账号', onClick: () => toggleStatus(r.id, r.status) },
                  { type: 'divider' as const },
                  { key: 'delete', icon: <DeleteOutlined />, label: '删除用户', danger: true, onClick: () => {
                    modal.confirm({
                      title: '确认删除该用户？',
                      icon: <ExclamationCircleOutlined />,
                      content: '此操作不可撤销',
                      okText: '删除',
                      okType: 'danger',
                      cancelText: '取消',
                      onOk: () => userApi.remove(r.id).then(() => { invalidate(); message.success('已删除'); }),
                    });
                  }},
                ] : []),
              ],
            }}
            trigger={['click']}
          >
            <Button size="small" type="text" icon={<MoreOutlined />} style={{ borderRadius: 8 }} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const rowSelection = isAdmin ? {
    selectedRowKeys,
    onChange: (keys: any) => setSelectedRowKeys(keys as string[]),
  } : undefined;

  return (
    <div>
      <style>{`
        .personnel-table .ant-table-thead > tr > th {
          background: #faf5ff !important; font-weight: 600 !important;
          font-size: 11px !important; text-transform: uppercase;
          letter-spacing: 0.3px; color: #6b7280 !important;
          padding: 10px 14px !important; border-bottom: 2px solid #f3f4f6 !important;
        }
        .personnel-table .ant-table-tbody > tr > td {
          padding: 10px 14px !important; border-bottom: 1px solid #f9fafb !important;
          transition: background 0.15s;
        }
        .personnel-table .ant-table-tbody > tr:hover > td {
          background: #faf5ff !important;
        }
        .personnel-table .ant-table-tbody > tr:hover .edit-hint {
          opacity: 1 !important;
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
          }}>
            <TeamOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#1e1b4b' }}>人员管理</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              共 {resp?.total || 0} 人 · <span style={{ color: '#10b981' }}>{resp?.data?.filter((u: any) => u.status === 'ACTIVE').length || 0} 在职</span>
            </div>
          </div>
        </div>
        <Space>
          <Tooltip title="导出 CSV">
            <Button icon={<DownloadOutlined />} onClick={exportCSV}
              style={{ borderRadius: 10, fontWeight: 500 }}>导出</Button>
          </Tooltip>
          <Button icon={<ReloadOutlined />} onClick={() => invalidate()}
            style={{ borderRadius: 10, fontWeight: 500 }}>刷新</Button>
          {isAdmin && (
            <Button icon={<PlusOutlined />} type="primary" onClick={() => { setCreateOpen(true); setAvatarFile(null); }}
              style={{ borderRadius: 10, height: 38, fontWeight: 500 }}>
              添加人员
            </Button>
          )}
        </Space>
      </div>

      {/* ── Batch action bar ── */}
      {isAdmin && selectedRowKeys.length > 0 && (
        <Card size="small" style={{
          marginBottom: 14, borderRadius: 14,
          background: 'linear-gradient(135deg, #fef2f2, #fff7ed)',
          border: '1px solid #fecaca',
        }}
          styles={{ body: { padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }}
        >
          <span style={{ fontWeight: 600, fontSize: 13, color: '#991b1b' }}>
            已选择 {selectedRowKeys.length} 人
          </span>
          <Space>
            <Button size="small" onClick={() => setSelectedRowKeys([])} style={{ borderRadius: 8 }}>取消选择</Button>
            <Popconfirm
              title={`确定停用选中的 ${selectedRowKeys.length} 名用户？`}
              onConfirm={() => batchDeleteMutation.mutate(selectedRowKeys)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}
                loading={batchDeleteMutation.isPending}
                style={{ borderRadius: 8 }}>批量停用</Button>
            </Popconfirm>
          </Space>
        </Card>
      )}

      {/* ── Filter bar ── */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 14, border: '1px solid rgba(0,0,0,0.04)' }}
        styles={{ body: { padding: '12px 18px' } }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索姓名/邮箱..."
            style={{ width: 220, borderRadius: 8 }}
            onSearch={(v) => setFilters((f: any) => ({ ...f, search: v || undefined }))}
            allowClear
            prefix={<UserOutlined style={{ color: '#c4b5fd' }} />}
          />
          <Select placeholder="角色" allowClear style={{ width: 120, borderRadius: 8 }}
            onChange={(v) => setFilters((f: any) => ({ ...f, role: v }))}>
            {Object.entries(roleConfig).map(([k, c]) => (
              <Select.Option key={k} value={k}>{c.label}</Select.Option>
            ))}
          </Select>
          <Select placeholder="部门" allowClear style={{ width: 160, borderRadius: 8 }}
            onChange={(v) => setFilters((f: any) => ({ ...f, departmentId: v }))}>
            {depts?.map((d: any) => (
              <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
            ))}
          </Select>
          <Select placeholder="状态" allowClear style={{ width: 110, borderRadius: 8 }}
            onChange={(v) => setFilters((f: any) => ({ ...f, status: v }))}>
            {Object.entries(statusMap).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v.label}</Select.Option>
            ))}
          </Select>
          {Object.values(filters).some((v) => v) && (
            <Button size="small" type="text" onClick={() => setFilters({})}
              style={{ color: '#9ca3af' }}>清除筛选</Button>
          )}
        </Space>
      </Card>

      {/* ── Table ── */}
      <Table
        className="personnel-table"
        dataSource={resp?.data}
        columns={columns as any}
        rowKey="id"
        loading={isLoading}
        rowSelection={rowSelection}
        style={{ borderRadius: 14, overflow: 'hidden' }}
        scroll={{ x: 960 }}
        pagination={{
          total: resp?.total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 人`,
        }}
        onChange={(p) => setFilters((f: any) => ({ ...f, page: p.current, pageSize: p.pageSize }))}
        onRow={(r) => ({
          onClick: () => setDetailOpen(r),
          style: { cursor: 'pointer' },
        })}
      />

      {/* ── Create User Modal ── */}
      <Modal
        title={<span><PlusOutlined style={{ marginRight: 6, color: '#7c3aed' }} />添加人员</span>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); setAvatarFile(null); }}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        width={560}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => {
                const err = validateImageFile(file);
                if (err) { message.warning(err); return Upload.LIST_IGNORE; }
                setAvatarFile(file);
                return false;
              }}
            >
              <div style={{
                width: 72, height: 72, borderRadius: 14,
                background: avatarFile ? `url(${URL.createObjectURL(avatarFile)}) center/cover` : '#f5f3ff',
                border: '2px dashed #c4b5fd',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
              }}>
                {!avatarFile && <UploadOutlined style={{ fontSize: 20, color: '#7c3aed' }} />}
              </div>
            </Upload>
            <div style={{ flex: 1 }}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]} style={{ marginBottom: 8 }}>
                <Input style={{ borderRadius: 8 }} placeholder="输入姓名" />
              </Form.Item>
              <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]} style={{ marginBottom: 8 }}>
                <Input style={{ borderRadius: 8 }} placeholder="user@company.com" />
              </Form.Item>
            </div>
          </div>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 6, message: '至少 6 位密码' }]}>
            <Input.Password style={{ borderRadius: 8 }} placeholder="至少 6 位" />
          </Form.Item>
          <Space size={16} style={{ width: '100%' }} align="start">
            <Form.Item name="position" label="职位" style={{ marginBottom: 0 }}>
              <Input style={{ borderRadius: 8, width: 160 }} placeholder="如：前端工程师" />
            </Form.Item>
            <Form.Item name="phone" label="手机号" style={{ marginBottom: 0 }}>
              <Input style={{ borderRadius: 8, width: 170 }} placeholder="手机号（可选）" />
            </Form.Item>
          </Space>
          <Space size={16} style={{ width: '100%', marginTop: 16 }} align="start">
            <Form.Item name="departmentId" label="部门" style={{ marginBottom: 0 }}>
              <Select allowClear placeholder="选择部门" style={{ width: 160, borderRadius: 8 }}>
                {depts?.map((d: any) => (
                  <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="role" label="角色" initialValue="MEMBER" style={{ marginBottom: 0 }}>
              <Select style={{ width: 140, borderRadius: 8 }}>
                {Object.entries(roleConfig).map(([k, c]) => (
                  <Select.Option key={k} value={k}>{c.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* ── Detail Drawer ── */}
      <Drawer
        title={null}
        open={!!detailOpen}
        onClose={() => setDetailOpen(null)}
        width={440}
        styles={{ body: { padding: 0 } }}
      >
        {detailOpen && detail && (
          <div>
            <div style={{
              padding: '28px 24px 20px',
              background: 'linear-gradient(135deg, #faf5ff, #f0f9ff)',
              textAlign: 'center',
            }}>
              <div style={{
                padding: 3, borderRadius: '50%', display: 'inline-block',
                background: `linear-gradient(135deg, ${(roleConfig[detail.role] || roleConfig.MEMBER).color}, ${(roleConfig[detail.role] || roleConfig.MEMBER).color})`,
              }}>
                <Avatar src={detail.avatar} icon={<UserOutlined />} size={72} style={{ border: '3px solid #fff' }} />
              </div>
              <div style={{ marginTop: 14, fontWeight: 700, fontSize: 18, color: '#1e1b4b' }}>{detail.name}</div>
              <Space style={{ marginTop: 6 }}>
                <Tag style={{ borderRadius: 6, fontWeight: 500, color: (roleConfig[detail.role] || roleConfig.MEMBER).color, background: (roleConfig[detail.role] || roleConfig.MEMBER).bg, border: 'none' }}>
                  {(roleConfig[detail.role] || roleConfig.MEMBER).label}
                </Tag>
                <Badge status={detail.status === 'ACTIVE' ? 'success' : 'error'} text={statusMap[detail.status]?.label} />
              </Space>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <Descriptions column={1} size="small" colon={false}
                labelStyle={{ color: '#9ca3af', fontWeight: 500, fontSize: 12 }}
                contentStyle={{ fontSize: 13, color: '#1e1b4b' }}>
                <Descriptions.Item label={<><MailOutlined style={{ marginRight: 6 }} />邮箱</>}>{detail.email}</Descriptions.Item>
                {detail.phone && <Descriptions.Item label={<><PhoneOutlined style={{ marginRight: 6 }} />手机</>}>{detail.phone}</Descriptions.Item>}
                <Descriptions.Item label={<><IdcardOutlined style={{ marginRight: 6 }} />职位</>}>{detail.position || '-'}</Descriptions.Item>
                <Descriptions.Item label={<><ApartmentOutlined style={{ marginRight: 6 }} />部门</>}>{detail.department?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label={<><SafetyOutlined style={{ marginRight: 6 }} />角色</>}>{(roleConfig[detail.role] || roleConfig.MEMBER).label}</Descriptions.Item>
                <Descriptions.Item label={<><ClockCircleOutlined style={{ marginRight: 6 }} />入职日期</>}>{dayjs(detail.joinedAt).format('YYYY-MM-DD')}</Descriptions.Item>
                {detail.createdAt && <Descriptions.Item label={<><ClockCircleOutlined style={{ marginRight: 6 }} />创建时间</>}>{dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>}
              </Descriptions>
              {isAdmin && (
                <Space style={{ marginTop: 20 }}>
                  <Button icon={<SwapOutlined />}
                    onClick={() => { toggleStatus(detail.id, detail.status); setDetailOpen(null); }}
                    style={{ borderRadius: 8 }}>
                    {detail.status === 'ACTIVE' ? '停用账号' : '启用账号'}
                  </Button>
                  <Popconfirm title="确定删除该用户？" onConfirm={() => { userApi.remove(detail.id).then(() => { invalidate(); setDetailOpen(null); message.success('已删除'); }); }}>
                    <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }}>删除</Button>
                  </Popconfirm>
                </Space>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
