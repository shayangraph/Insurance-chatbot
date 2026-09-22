import { api } from './api';
import type { InsurancePlan, Recommendation, Order, InsuranceCompany } from '../types';

export const insuranceService = {
  async getCompanies(): Promise<InsuranceCompany[]> {
    const response = await api.get('/recommendations/companies/');
    return response.data;
  },

  async getPlans(type?: string): Promise<InsurancePlan[]> {
    const response = await api.get('/recommendations/plans/', { params: { type } });
    return response.data;
  },

  async calculateRecommendation(insurance_type: string, collected_data: Record<string, any>, session_id: string): Promise<Recommendation> {
    const response = await api.post('/recommendations/calculate/', {
      insurance_type,
      collected_data,
      session_id
    });
    return response.data;
  },

  async createOrder(
    plan_id: number,
    total_price: number,
    session_id: string,
    collected_info?: Record<string, any>,
    payment_type: 'cash' | 'installment_3' | 'installment_6' = 'cash'
  ): Promise<Order> {
    const response = await api.post('/orders/create/', {
      plan_id,
      total_price,
      session_id,
      payment_type,
      collected_info: collected_info || {}
    });
    return response.data;
  },

  async getOrder(order_id: string): Promise<Order> {
    const response = await api.get(`/orders/${order_id}/`);
    return response.data;
  },

  async payInstallment(order_id: string): Promise<{ message: string; order: Order }> {
    const response = await api.post(`/orders/${order_id}/pay-installment/`);
    return response.data;
  }
};
