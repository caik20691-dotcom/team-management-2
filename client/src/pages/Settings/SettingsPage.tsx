import { useState } from 'react';
import { Card, Form, Input, Button, Typography, App, Descriptions, Tag, Upload, Space, Divider, Avatar, Select } from 'antd';
import { SettingOutlined, UploadOutlined, TeamOutlined, UserOutlined, CameraOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/auth';
import { userApi, fileApi, systemConfigApi, validateImageFile } from '../../api';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

const { Title } = Typography;
const roleLabels: Record<string, string> = { ADMIN: '管理员', MANAGER: '主管', MEMBER: '成员', VIEWER: '观察者' };

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: sysConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => systemConfigApi.get().then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => userApi.update(user!.id, data),
    onSuccess: (_res, variables) => {
      updateUser({ name: variables.name });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success('更新成功');
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (avatar: string) => userApi.update(user!.id, { avatar }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success('头像已更新');
    },
  });

  const configMutation = useMutation({
    mutationFn: (data: any) => systemConfigApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      message.success('系统设置已更新');
    },
  });

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(124,58,237,0.3)' }}>
          <SettingOutlined style={{ fontSize: 18, color: '#fff' }} />
        </div>
        <span style={{ fontSize: 18, fontWeight: 700 }}>系统设置</span>
      </div>

      {/* Team Settings (Admin Only) */}
      {user?.role === 'ADMIN' && (
        <Card
          style={{ borderRadius: 16, marginBottom: 16, border: '1px solid rgba(124,58,237,0.08)' }}
          title={<span style={{ fontWeight: 600, color: '#7c3aed' }}><TeamOutlined style={{ marginRight: 8 }} />团队设置</span>}
        >
          <Form layout="vertical" onFinish={(v) => configMutation.mutate(v)} initialValues={{ systemName: sysConfig?.systemName }}>
            <Form.Item label={
              <span style={{ fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9ca3af' }}>团队 Logo</span>
            }>
              <Space direction="vertical" align="start">
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                  {sysConfig?.logoUrl ? (
                    <img src={sysConfig.logoUrl} alt="Team Logo" style={{ height: 64, borderRadius: 14, border: '2px solid rgba(124,58,237,0.1)' }} />
                  ) : (
                    <div style={{
                      width: 64, height: 64, borderRadius: 14,
                      background: 'linear-gradient(135deg, #ddd6fe, #c4b5fd)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <TeamOutlined style={{ fontSize: 24, color: '#7c3aed' }} />
                    </div>
                  )}
                  <Upload
                    customRequest={async ({ file, onSuccess, onError }: any) => {
                      const validationError = validateImageFile(file as File);
                      if (validationError) { message.warning(validationError); onError?.(new Error(validationError)); return; }
                      try {
                        const res = await fileApi.upload(file as File);
                        await systemConfigApi.update({ logoUrl: res.data.url });
                        queryClient.invalidateQueries({ queryKey: ['system-config'] });
                        message.success('Logo 上传成功');
                        onSuccess?.(res.data, file);
                      } catch { onError?.(new Error('上传失败')); }
                    }}
                    showUploadList={false}
                    accept="image/*"
                  >
                    <Button icon={<UploadOutlined />} size="small" style={{ borderRadius: 8 }}>
                      {sysConfig?.logoUrl ? '更换' : '上传'}
                    </Button>
                  </Upload>
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>支持 JPG/PNG/GIF/WebP/SVG，大小不超过 10MB</Typography.Text>
              </Space>
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <Form.Item name="systemName" label={
                <span style={{ fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9ca3af' }}>系统名称</span>
              }>
                <Input style={{ borderRadius: 8 }} placeholder="TeamHub" />
              </Form.Item>

              <Form.Item name="timezone" label={
                <span style={{ fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9ca3af' }}>时区</span>
              } initialValue={sysConfig?.timezone || 'Asia/Shanghai'}>
                <Select
                  style={{ borderRadius: 8 }}
                  options={[
                    { label: '上海 (UTC+8)', value: 'Asia/Shanghai' },
                    { label: '东京 (UTC+9)', value: 'Asia/Tokyo' },
                    { label: '新加坡 (UTC+8)', value: 'Asia/Singapore' },
                    { label: '纽约 (UTC-5)', value: 'America/New_York' },
                    { label: '伦敦 (UTC+0)', value: 'Europe/London' },
                  ]}
                />
              </Form.Item>
            </div>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={configMutation.isPending} style={{ borderRadius: 10, fontWeight: 500 }}>保存团队设置</Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      {/* Profile card */}
      <Card
        style={{ borderRadius: 16, marginBottom: 16, border: '1px solid rgba(0,0,0,0.04)' }}
        title={<span style={{ fontWeight: 600 }}><UserOutlined style={{ marginRight: 8 }} />个人信息</span>}
      >
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Avatar with upload */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{
                padding: 3, borderRadius: '50%',
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              }}>
                <Avatar
                  src={user?.avatar}
                  icon={<UserOutlined />}
                  size={72}
                  style={{ border: '3px solid #fff' }}
                />
              </div>
              <Upload
                customRequest={async ({ file, onSuccess, onError }: any) => {
                  const validationError = validateImageFile(file as File);
                  if (validationError) { message.warning(validationError); onError?.(new Error(validationError)); return; }
                  try {
                    const res = await fileApi.upload(file as File);
                    avatarMutation.mutate(res.data.url);
                    onSuccess?.(res.data, file);
                  } catch { onError?.(new Error('上传失败')); }
                }}
                showUploadList={false}
                accept="image/*"
              >
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#7c3aed', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 2px 6px rgba(124,58,237,0.3)',
                  border: '2px solid #fff',
                }}>
                  <CameraOutlined style={{ fontSize: 12 }} />
                </div>
              </Upload>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: '#9ca3af' }}>点击更换</div>
          </div>

          <div style={{ flex: 1 }}>
            <Descriptions column={1} size="small" colon={false} labelStyle={{ color: '#9ca3af', fontWeight: 500 }}>
              <Descriptions.Item label="邮箱">{user?.email}</Descriptions.Item>
              <Descriptions.Item label="角色">
                <Tag color="purple" style={{ borderRadius: 6 }}>{roleLabels[user?.role || 'MEMBER']}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="部门">{user?.department?.name || '-'}</Descriptions.Item>
            </Descriptions>
          </div>
        </div>
      </Card>

      {/* Edit profile */}
      <Card
        style={{ borderRadius: 16, marginBottom: 16, border: '1px solid rgba(0,0,0,0.04)' }}
        title={<span style={{ fontWeight: 600 }}>修改资料</span>}
      >
        <Form form={form} layout="vertical" initialValues={user || {}} onFinish={(v) => updateMutation.mutate(v)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
              <Input style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="phone" label="手机号">
              <Input style={{ borderRadius: 8 }} placeholder="绑定手机号" />
            </Form.Item>
          </div>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}
              style={{ borderRadius: 10, fontWeight: 500, boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}>
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Change password */}
      <Card
        style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,0.04)' }}
        title={<span style={{ fontWeight: 600 }}><LockOutlined style={{ marginRight: 8 }} />修改密码</span>}
      >
        <Form
          form={pwdForm}
          layout="vertical"
          onFinish={(v) => {
            if (v.newPassword !== v.confirmPassword) {
              message.warning('两次密码输入不一致');
              return;
            }
            updateMutation.mutate({ password: v.newPassword });
            pwdForm.resetFields();
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}>
              <Input.Password style={{ borderRadius: 8 }} placeholder="至少6位" />
            </Form.Item>
            <Form.Item name="confirmPassword" label="确认密码" rules={[{ required: true, message: '请确认密码' }]}>
              <Input.Password style={{ borderRadius: 8 }} placeholder="再次输入新密码" />
            </Form.Item>
          </div>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}
              style={{ borderRadius: 10, fontWeight: 500 }}>
              更新密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
