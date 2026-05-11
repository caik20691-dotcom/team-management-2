import apiClient from './client';

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  name: string;
  role?: string;
  departmentId?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  phone?: string;
  position?: string;
  departmentId?: string;
  department?: { id: string; name: string };
  joinedAt: string;
}

export const authApi = {
  login: (params: LoginParams) => apiClient.post('/auth/login', params),
  register: (params: RegisterParams) => apiClient.post('/auth/register', params),
  getProfile: () => apiClient.get<UserProfile>('/auth/me'),
};
