import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import MainLayout from './components/Layout/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import TaskBoardPage from './pages/Tasks/TaskBoardPage';
import TaskListPage from './pages/Tasks/TaskListPage';
import TaskDetailPage from './pages/Tasks/TaskDetailPage';
import ProjectBoardPage from './pages/Tasks/ProjectBoardPage';
import ProjectDetailPage from './pages/Projects/ProjectDetailPage';
import TrainingPage from './pages/Training/TrainingPage';
import CourseDetailPage from './pages/Training/CourseDetailPage';
import AnnouncementsPage from './pages/Announcements/AnnouncementsPage';
import DocumentsPage from './pages/Documents/DocumentsPage';
import PersonnelPage from './pages/Personnel/PersonnelPage';
import DepartmentsPage from './pages/Personnel/DepartmentsPage';

import NotificationsPage from './pages/Notifications/NotificationsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import CalendarPage from './pages/Calendar/CalendarPage';

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  if (!token) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="regular-tasks" element={<TaskListPage />} />
        <Route path="regular-tasks/board" element={<TaskBoardPage />} />
        <Route path="project-tasks" element={<TaskListPage />} />
        <Route path="project-tasks/board" element={<TaskBoardPage />} />
        <Route path="projects/board" element={<ProjectBoardPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="tasks/:id" element={<TaskDetailPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="training/:id" element={<CourseDetailPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="personnel" element={<PersonnelPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<PrivateRoute roles={['ADMIN']}><SettingsPage /></PrivateRoute>} />
        <Route path="calendar" element={<CalendarPage />} />
      </Route>
    </Routes>
  );
}
