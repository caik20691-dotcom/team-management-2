import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN} theme={{
        token: {
          colorPrimary: '#7c3aed',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorInfo: '#6366f1',
          borderRadius: 12,
          borderRadiusLG: 16,
          borderRadiusSM: 8,
          colorBgLayout: '#f5f3ff',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
          fontSize: 14,
          colorTextBase: '#1e1b4b',
          boxShadow: '0 4px 24px rgba(124, 58, 237, 0.08)',
          boxShadowSecondary: '0 8px 32px rgba(124, 58, 237, 0.12)',
        },
        components: {
          Card: {
            borderRadiusLG: 16,
            paddingLG: 24,
          },
          Button: {
            borderRadius: 10,
            controlHeightLG: 44,
            controlHeight: 36,
            fontWeight: 500,
          },
          Input: {
            borderRadius: 10,
            controlHeightLG: 44,
            controlHeight: 36,
          },
          Select: {
            borderRadius: 10,
            controlHeight: 36,
          },
          Table: {
            borderRadius: 12,
            headerBg: '#faf5ff',
          },
          Tag: {
            borderRadiusSM: 6,
          },
          Menu: {
            itemBorderRadius: 10,
            subMenuItemBorderRadius: 10,
          },
          Modal: {
            borderRadiusLG: 16,
          },
        },
      }}>
        <AntApp>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
