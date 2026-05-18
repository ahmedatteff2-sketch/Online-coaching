import { api, unwrap } from './client';
import type { AuthUser } from '@/store/auth';

export interface LoginPayload {
  phone: string;
  password: string;
}
export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export const authApi = {
  login: (body: LoginPayload) => unwrap<LoginResponse>(api.post('/auth/login', body)),
  logout: () => api.post('/auth/logout'),
  me: () => unwrap<{ user: AuthUser }>(api.get('/auth/me')),
  refresh: () => unwrap<LoginResponse>(api.post('/auth/refresh')),
};
