import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, App } from 'antd';
import { UserOutlined, LockOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/auth';
import { authApi, LoginParams } from '../../api/auth';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { message } = App.useApp();

  const onFinish = async (values: LoginParams) => {
    setLoading(true);
    try {
      const { data } = await authApi.login(values);
      setAuth(data.token, data.user);
      message.success(`欢迎回来，${data.user.name}！`);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      message.error(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(-45deg, #7c3aed, #6366f1, #a855f7, #3b82f6, #8b5cf6)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 12s ease infinite',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated floating orbs */}
      <div style={{
        position: 'absolute', width: 300, height: 300,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        top: '10%', left: '5%',
        animation: 'float 6s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 200, height: 200,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        bottom: '15%', right: '10%',
        animation: 'float 8s ease-in-out 1s infinite',
      }} />
      <div style={{
        position: 'absolute', width: 150, height: 150,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
        top: '60%', left: '60%',
        animation: 'float 7s ease-in-out 2s infinite',
      }} />

      <Card
        className="glass-card"
        style={{
          width: 420,
          boxShadow: '0 24px 80px rgba(124, 58, 237, 0.25)',
          position: 'relative',
          zIndex: 1,
        }}
        bodyStyle={{ padding: '40px 36px' }}
      >
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)',
          }}>
            <ThunderboltOutlined style={{ fontSize: 30, color: '#fff' }} />
          </div>
          <Title level={2} style={{ marginBottom: 4, fontWeight: 800, letterSpacing: -0.5 }}>
            Team<span style={{
              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Hub</span>
          </Title>
          <Text style={{ color: '#6b7280', fontSize: 15 }}>让团队协作更高效</Text>
        </div>

        <Form name="login" onFinish={onFinish} size="large">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
              placeholder="邮箱"
              style={{ height: 48, fontSize: 15 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
              placeholder="密码"
              style={{ height: 48, fontSize: 15 }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 48,
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                border: 'none',
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{
          marginTop: 24,
          padding: '12px 16px',
          borderRadius: 10,
          background: 'rgba(124, 58, 237, 0.06)',
          textAlign: 'center',
        }}>
          <Text style={{ fontSize: 12, color: '#9ca3af' }}>
            测试账户：admin@teamhub.com / admin123
          </Text>
        </div>
      </Card>
    </div>
  );
}
