import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Spin, Typography, Tooltip } from 'antd';
import {
  UserOutlined, ProjectOutlined, CheckCircleOutlined, BookOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { PieChart, BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { dashboardApi } from '../../api';
import dayjs from 'dayjs';

echarts.use([PieChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer]);

const { Title } = Typography;

const pieColors = ['#818cf8', '#a78bfa', '#c4b5fd', '#e0e7ff', '#e9d5ff'];

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
  });

  const { data: activity } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => dashboardApi.activity(10).then((r) => r.data),
  });

  const { data: taskDist } = useQuery({
    queryKey: ['dashboard', 'task-distribution'],
    queryFn: () => dashboardApi.taskDistribution().then((r) => r.data),
  });

  const { data: trainingOverview } = useQuery({
    queryKey: ['dashboard', 'training-overview'],
    queryFn: () => dashboardApi.trainingOverview().then((r) => r.data),
  });

  const statusLabel: Record<string, string> = {
    TODO: '待处理', IN_PROGRESS: '进行中', REVIEW: '审核中', DONE: '已完成', CANCELLED: '已取消',
  };

  const statCards = [
    {
      title: '活跃用户', value: stats?.totalUsers || 0, icon: <UserOutlined />,
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', bg: 'rgba(124, 58, 237, 0.08)',
      className: 'stat-card-purple', link: '/personnel',
    },
    {
      title: '总任务数', value: stats?.totalTasks || 0, icon: <ProjectOutlined />,
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)', bg: 'rgba(6, 182, 212, 0.08)',
      className: 'stat-card-sky', link: '/tasks',
    },
    {
      title: '完成率', value: stats?.completionRate || 0, suffix: '%', icon: <CheckCircleOutlined />,
      gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', bg: 'rgba(16, 185, 129, 0.08)',
      className: 'stat-card-emerald', link: '/tasks',
    },
    {
      title: '培训课程', value: stats?.totalCourses || 0, icon: <BookOutlined />,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', bg: 'rgba(245, 158, 11, 0.08)',
      className: 'stat-card-amber', link: '/training',
    },
  ];

  const handleChartClick = (chartType: string) => {
    if (chartType === 'task') navigate('/tasks');
    if (chartType === 'training') navigate('/training');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
        }}>
          <ThunderboltOutlined style={{ fontSize: 20, color: '#fff' }} />
        </div>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>仪表盘</Title>
      </div>

      <Row gutter={[16, 16]}>
        {statCards.map((card, i) => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <Tooltip title={`点击查看${card.title}详情`}>
              <Card
                className={`stat-card ${card.className}`}
                loading={statsLoading}
                hoverable
                onClick={() => navigate(card.link)}
                style={{ borderRadius: 16, cursor: 'pointer' }}
                bodyStyle={{ padding: '20px 24px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>
                      {card.title}
                    </div>
                    <Statistic
                      value={card.value}
                      suffix={card.suffix}
                      valueStyle={{ fontSize: 32, fontWeight: 700, color: '#1e1b4b' }}
                    />
                  </div>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: card.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: '#7c3aed',
                  }}>
                    {card.icon}
                  </div>
                </div>
              </Card>
            </Tooltip>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/tasks')}>任务分布 <span style={{ fontSize: 12, color: '#9ca3af' }}>（点击查看）</span></span>}
            style={{ borderRadius: 16 }}
            bodyStyle={{ padding: '12px 16px' }}
          >
            <ReactEChartsCore
              echarts={echarts}
              option={{
                tooltip: {
                  trigger: 'item',
                  backgroundColor: '#fff',
                  borderColor: '#e9d5ff',
                  textStyle: { color: '#1e1b4b' },
                  formatter: '{b}: {c} ({d}%)',
                },
                series: [{
                  type: 'pie',
                  radius: ['55%', '82%'],
                  center: ['50%', '50%'],
                  avoidLabelOverlap: false,
                  itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 },
                  label: { show: true, position: 'outside', formatter: '{b}\n{d}%', fontSize: 12, color: '#6b7280' },
                  emphasis: { label: { fontSize: 16, fontWeight: 'bold' }, scaleSize: 12 },
                  data: (taskDist || []).map((d: any, i: number) => ({
                    name: statusLabel[d.status] || d.status,
                    value: d.count,
                    itemStyle: { color: pieColors[i % pieColors.length] },
                  })),
                }],
              }}
              onEvents={{ click: () => navigate('/tasks') }}
              style={{ height: 320, cursor: 'pointer' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/training')}>培训概览 <span style={{ fontSize: 12, color: '#9ca3af' }}>（点击查看）</span></span>}
            style={{ borderRadius: 16 }}
            bodyStyle={{ padding: '12px 16px' }}
          >
            <ReactEChartsCore
              echarts={echarts}
              option={{
                tooltip: {
                  trigger: 'axis',
                  backgroundColor: '#fff',
                  borderColor: '#e9d5ff',
                  textStyle: { color: '#1e1b4b' },
                },
                legend: { bottom: 0, textStyle: { color: '#6b7280', fontSize: 12 } },
                grid: { left: '3%', right: '4%', top: '8%', bottom: '14%', containLabel: true },
                xAxis: {
                  type: 'category',
                  data: (trainingOverview || []).map((d: any) => d.title),
                  axisLine: { lineStyle: { color: '#e5e7eb' } },
                  axisLabel: { color: '#6b7280', fontSize: 11 },
                },
                yAxis: {
                  type: 'value',
                  splitLine: { lineStyle: { color: '#f3f4f6' } },
                  axisLabel: { color: '#9ca3af' },
                },
                series: [
                  {
                    name: '总人数', type: 'bar', barWidth: 20,
                    itemStyle: { borderRadius: [8, 8, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#a78bfa' }, { offset: 1, color: '#7c3aed' }]) },
                    data: (trainingOverview || []).map((d: any) => d.total),
                  },
                  {
                    name: '已完成', type: 'bar', barWidth: 20,
                    itemStyle: { borderRadius: [8, 8, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#67e8f9' }, { offset: 1, color: '#06b6d4' }]) },
                    data: (trainingOverview || []).map((d: any) => d.completed),
                  },
                ],
              }}
              onEvents={{ click: () => navigate('/training') }}
              style={{ height: 320, cursor: 'pointer' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ fontWeight: 600 }}>最近动态</span>}
        style={{ marginTop: 16, borderRadius: 16 }}
        bodyStyle={{ padding: '8px 16px' }}
      >
        {activity ? (
          <Table
            dataSource={activity}
            rowKey="id"
            pagination={false}
            size="small"
            showHeader={true}
            onRow={(record: any) => ({
              onClick: () => { if (record.taskId) navigate(`/tasks/${record.taskId}`); },
              style: { cursor: record.taskId ? 'pointer' : 'default' },
            })}
            columns={[
              {
                title: '用户', dataIndex: ['user', 'name'], width: 120,
                render: (name: string) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 12, fontWeight: 600,
                    }}>
                      {name?.charAt(0)}
                    </div>
                    <span style={{ fontWeight: 500 }}>{name}</span>
                  </div>
                ),
              },
              { title: '操作', dataIndex: 'action', width: 200, render: (v: string) => <span style={{ color: '#6b7280' }}>{v}</span> },
              { title: '关联任务', dataIndex: ['task', 'title'], render: (v: string) => v ? <span style={{ color: '#7c3aed' }}>{v}</span> : '-' },
              { title: '时间', dataIndex: 'createdAt', width: 180, render: (v: string) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{dayjs(v).format('MM-DD HH:mm')}</span> },
            ]}
          />
        ) : <Spin />}
      </Card>
    </div>
  );
}
