import apiClient from './client';

export const userApi = {
  list: (params?: any) => apiClient.get('/users', { params }),
  get: (id: string) => apiClient.get(`/users/${id}`),
  create: (data: any) => apiClient.post('/users', data),
  update: (id: string, data: any) => apiClient.patch(`/users/${id}`, data),
  remove: (id: string) => apiClient.delete(`/users/${id}`),
  batchDelete: (ids: string[]) => apiClient.post('/users/batch-delete', { ids }),
};

export const departmentApi = {
  list: () => apiClient.get('/departments'),
  get: (id: string) => apiClient.get(`/departments/${id}`),
  create: (data: any) => apiClient.post('/departments', data),
  update: (id: string, data: any) => apiClient.patch(`/departments/${id}`, data),
  remove: (id: string) => apiClient.delete(`/departments/${id}`),
};

export const taskApi = {
  list: (params?: any) => apiClient.get('/tasks', { params }),
  get: (id: string) => apiClient.get(`/tasks/${id}`),
  create: (data: any) => apiClient.post('/tasks', data),
  update: (id: string, data: any) => apiClient.patch(`/tasks/${id}`, data),
  remove: (id: string) => apiClient.delete(`/tasks/${id}`),
  addAttachment: (taskId: string, file: any) => apiClient.post(`/tasks/${taskId}/attachments`, file),
  removeAttachment: (attachmentId: string) => apiClient.delete(`/tasks/attachments/${attachmentId}`),
};

export const trainingApi = {
  courses: (params?: any) => apiClient.get('/training/courses', { params }),
  course: (id: string) => apiClient.get(`/training/courses/${id}`),
  createCourse: (data: any) => apiClient.post('/training/courses', data),
  updateCourse: (id: string, data: any) => apiClient.patch(`/training/courses/${id}`, data),
  deleteCourse: (id: string) => apiClient.delete(`/training/courses/${id}`),
  progress: () => apiClient.get('/training/progress'),

  // Lessons
  createLesson: (courseId: string, data: any) => apiClient.post(`/training/courses/${courseId}/lessons`, data),
  updateLesson: (id: string, data: any) => apiClient.patch(`/training/lessons/${id}`, data),
  deleteLesson: (id: string) => apiClient.delete(`/training/lessons/${id}`),
  reorderLessons: (courseId: string, ids: string[]) => apiClient.post(`/training/courses/${courseId}/lessons/reorder`, { ids }),

  // Quiz
  getQuiz: (lessonId: string) => apiClient.get(`/training/lessons/${lessonId}/quiz`),
  upsertQuiz: (lessonId: string, data: any) => apiClient.post(`/training/lessons/${lessonId}/quiz`, data),
  submitQuiz: (lessonId: string, data: { answers: number[] }) => apiClient.post(`/training/lessons/${lessonId}/quiz/submit`, data),
  getQuizAttempts: (quizId: string) => apiClient.get(`/training/quiz/${quizId}/attempts`),
  addQuizAttachment: (quizId: string, file: any) => apiClient.post(`/training/quiz/${quizId}/attachments`, file),
  removeQuizAttachment: (id: string) => apiClient.delete(`/training/quiz-attachments/${id}`),

  // Progress
  markLessonComplete: (lessonId: string) => apiClient.post(`/training/lessons/${lessonId}/complete`),
  unmarkLessonComplete: (lessonId: string) => apiClient.post(`/training/lessons/${lessonId}/uncomplete`),
  getLessonProgress: (courseId: string) => apiClient.get(`/training/courses/${courseId}/lesson-progress`),

  // Attachments
  addCourseAttachment: (courseId: string, file: any) => apiClient.post(`/training/courses/${courseId}/attachments`, file),
  removeAttachment: (id: string) => apiClient.delete(`/training/attachments/${id}`),
  addLessonAttachment: (lessonId: string, file: any) => apiClient.post(`/training/lessons/${lessonId}/attachments`, file),
  removeLessonAttachment: (id: string) => apiClient.delete(`/training/lesson-attachments/${id}`),
};

export const announcementApi = {
  list: (params?: any) => apiClient.get('/announcements', { params }),
  get: (id: string) => apiClient.get(`/announcements/${id}`),
  create: (data: any) => apiClient.post('/announcements', data),
  markRead: (id: string) => apiClient.post(`/announcements/${id}/read`),
};

export const documentApi = {
  list: (params?: any) => apiClient.get('/documents', { params }),
  get: (id: string) => apiClient.get(`/documents/${id}`),
  create: (data: any) => apiClient.post('/documents', data),
  update: (id: string, data: any) => apiClient.patch(`/documents/${id}`, data),
  remove: (id: string) => apiClient.delete(`/documents/${id}`),
  getAllTags: () => apiClient.get('/documents/tags'),
  getScenarios: () => apiClient.get('/documents/scenarios'),
  getFolders: () => apiClient.get('/documents/folders'),
  addAttachment: (id: string, file: any) => apiClient.post(`/documents/${id}/attachments`, file),
  removeAttachment: (docId: string, attachmentId: string) => apiClient.delete(`/documents/${docId}/attachments/${attachmentId}`),
  createVersion: (id: string, data: any) => apiClient.post(`/documents/${id}/versions`, data),
  getVersionHistory: (id: string) => apiClient.get(`/documents/${id}/versions`),
};


export const notificationApi = {
  list: (params?: any) => apiClient.get('/notifications', { params }),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
};

export const dashboardApi = {
  stats: () => apiClient.get('/dashboard/stats'),
  activity: (limit?: number) => apiClient.get('/dashboard/activity', { params: { limit } }),
  taskDistribution: () => apiClient.get('/dashboard/task-distribution'),
  trainingOverview: () => apiClient.get('/dashboard/training-overview'),
};

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const SIZE_LIMIT_MB = MAX_FILE_SIZE / 1024 / 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && file.type !== '') {
    return `不支持的图片格式: ${file.type || '未知'}，支持: JPG, PNG, GIF, WebP, SVG`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB)，限制 ${SIZE_LIMIT_MB}MB`;
  }
  return null;
}

export const fileApi = {
  list: (params?: any) => apiClient.get('/files', { params }),
  upload: (file: File) => {
    const error = validateImageFile(file);
    if (error) return Promise.reject(new Error(error));
    const form = new FormData();
    form.append('file', file);
    return apiClient.post('/files/upload', form);
  },
  uploadAny: (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      return Promise.reject(new Error(`文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB)，限制 ${SIZE_LIMIT_MB}MB`));
    }
    const form = new FormData();
    form.append('file', file);
    return apiClient.post('/files/upload', form);
  },
  remove: (id: string) => apiClient.delete(`/files/${id}`),
};

export const systemConfigApi = {
  get: () => apiClient.get('/system-config'),
  update: (data: any) => apiClient.patch('/system-config', data),
};

export const announcementCategoryApi = {
  list: () => apiClient.get('/system-config/announcement-categories'),
  create: (data: any) => apiClient.post('/system-config/announcement-categories', data),
  update: (id: string, data: any) => apiClient.patch(`/system-config/announcement-categories/${id}`, data),
  remove: (id: string) => apiClient.delete(`/system-config/announcement-categories/${id}`),
  reorder: (ids: string[]) => apiClient.patch('/system-config/announcement-categories/reorder', { ids }),
};

export const documentCategoryApi = {
  list: () => apiClient.get('/system-config/document-categories'),
  create: (data: { name: string }) => apiClient.post('/system-config/document-categories', data),
  update: (id: string, data: { name?: string }) => apiClient.patch(`/system-config/document-categories/${id}`, data),
  remove: (id: string) => apiClient.delete(`/system-config/document-categories/${id}`),
  reorder: (ids: string[]) => apiClient.patch('/system-config/document-categories/reorder', { ids }),
};

export const scenarioApi = {
  list: () => apiClient.get('/system-config/sop-scenarios'),
  create: (data: { name: string }) => apiClient.post('/system-config/sop-scenarios', data),
  update: (id: string, data: { name?: string }) => apiClient.patch(`/system-config/sop-scenarios/${id}`, data),
  remove: (id: string) => apiClient.delete(`/system-config/sop-scenarios/${id}`),
  reorder: (ids: string[]) => apiClient.patch('/system-config/sop-scenarios/reorder', { ids }),
};

export const folderApi = {
  list: () => apiClient.get('/system-config/document-folders'),
  create: (data: { name: string }) => apiClient.post('/system-config/document-folders', data),
  update: (id: string, data: { name?: string }) => apiClient.patch(`/system-config/document-folders/${id}`, data),
  remove: (id: string) => apiClient.delete(`/system-config/document-folders/${id}`),
  reorder: (ids: string[]) => apiClient.patch('/system-config/document-folders/reorder', { ids }),
};

export const projectApi = {
  list: () => apiClient.get('/projects'),
  get: (id: string) => apiClient.get(`/projects/${id}`),
  create: (data: any) => apiClient.post('/projects', data),
  update: (id: string, data: any) => apiClient.patch(`/projects/${id}`, data),
  remove: (id: string) => apiClient.delete(`/projects/${id}`),
};

export const calendarApi = {
  list: (params?: any) => apiClient.get('/calendar/events', { params }),
  get: (id: string) => apiClient.get(`/calendar/events/${id}`),
  create: (data: any) => apiClient.post('/calendar/events', data),
  update: (id: string, data: any) => apiClient.patch(`/calendar/events/${id}`, data),
  remove: (id: string) => apiClient.delete(`/calendar/events/${id}`),
  getTaskDeadlines: (params?: any) => apiClient.get('/calendar/task-deadlines', { params }),
};
