import { api } from '@/lib/api';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    api.post<TokenPair>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<TokenPair>('/auth/login', data).then((r) => r.data),

  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),

  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),

  resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),

  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};
