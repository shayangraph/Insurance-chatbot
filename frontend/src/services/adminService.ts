import { api } from './api';
import type {
  AdminDashboardData,
  AdminUserListItem,
  AdminUserDetail,
  InsurancePlan,
  InsuranceCoverage,
  InsuranceCompany,
  Payment,
  Order
} from '../types';

export const adminService = {
  // Dashboard
  getDashboardStats: async (): Promise<AdminDashboardData> => {
    const response = await api.get<AdminDashboardData>('/admin/dashboard/');
    return response.data;
  },

  // Users
  getUsers: async (search?: string, role?: string): Promise<AdminUserListItem[]> => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (role) params.role = role;
    const response = await api.get<AdminUserListItem[]>('/admin/users/', { params });
    return response.data;
  },

  getUserDetail: async (userId: number): Promise<AdminUserDetail> => {
    const response = await api.get<AdminUserDetail>(`/admin/users/${userId}/`);
    return response.data;
  },

  updateUserRoleOrStatus: async (
    userId: number,
    data: {
      role?: string;
      is_active?: boolean;
      assigned_company?: number | null;
      assigned_company_id?: number | null;
      is_approved_expert?: boolean;
    }
  ): Promise<AdminUserListItem> => {
    const response = await api.patch<AdminUserListItem>(`/admin/users/${userId}/`, data);
    return response.data;
  },

  // Products (Plans)
  getProducts: async (type?: string, is_active?: boolean): Promise<InsurancePlan[]> => {
    const params: Record<string, any> = {};
    if (type) params.type = type;
    if (is_active !== undefined) params.is_active = is_active;
    const response = await api.get<InsurancePlan[]>('/admin/products/', { params });
    return response.data;
  },

  getProductDetail: async (planId: number): Promise<InsurancePlan> => {
    const response = await api.get<InsurancePlan>(`/admin/products/${planId}/`);
    return response.data;
  },

  createProduct: async (data: Partial<InsurancePlan>): Promise<InsurancePlan> => {
    const response = await api.post<InsurancePlan>('/admin/products/', data);
    return response.data;
  },

  updateProduct: async (planId: number, data: Partial<InsurancePlan>): Promise<InsurancePlan> => {
    const response = await api.put<InsurancePlan>(`/admin/products/${planId}/`, data);
    return response.data;
  },

  deleteProduct: async (planId: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/admin/products/${planId}/`);
    return response.data;
  },

  // Coverages
  getCoverages: async (planId?: number): Promise<InsuranceCoverage[]> => {
    const params: Record<string, any> = {};
    if (planId) params.plan_id = planId;
    const response = await api.get<InsuranceCoverage[]>('/admin/coverages/', { params });
    return response.data;
  },

  createCoverage: async (data: Partial<InsuranceCoverage>): Promise<InsuranceCoverage> => {
    const response = await api.post<InsuranceCoverage>('/admin/coverages/', data);
    return response.data;
  },

  updateCoverage: async (coverageId: number, data: Partial<InsuranceCoverage>): Promise<InsuranceCoverage> => {
    const response = await api.put<InsuranceCoverage>(`/admin/coverages/${coverageId}/`, data);
    return response.data;
  },

  deleteCoverage: async (coverageId: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/admin/coverages/${coverageId}/`);
    return response.data;
  },

  // Companies
  getCompanies: async (): Promise<InsuranceCompany[]> => {
    const response = await api.get<InsuranceCompany[]>('/admin/companies/');
    return response.data;
  },

  createCompany: async (data: Partial<InsuranceCompany>): Promise<InsuranceCompany> => {
    const response = await api.post<InsuranceCompany>('/admin/companies/', data);
    return response.data;
  },

  // Transactions
  getTransactions: async (status?: string, search?: string): Promise<Payment[]> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (search) params.search = search;
    const response = await api.get<Payment[]>('/admin/transactions/', { params });
    return response.data;
  },

  // Orders
  getOrders: async (status?: string, search?: string): Promise<Order[]> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (search) params.search = search;
    const response = await api.get<Order[]>('/admin/orders/', { params });
    return response.data;
  },
};
