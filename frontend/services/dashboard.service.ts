import { api } from '@/lib/api';
import { DashboardStats } from '@/types';

export const dashboardService = {
  getStats: () => api.get<DashboardStats>('/admin/dashboard').then((r) => r.data),
};
