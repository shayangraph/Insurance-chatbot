import { api } from './api';
import type { Payment } from '../types';

export const paymentService = {
  async processSandboxPayment(order_id: string, status_action: 'success' | 'failed' = 'success'): Promise<{ message: string; payment: Payment; order_number: string; transaction_id: string; status: string }> {
    const response = await api.post('/payments/sandbox-pay/', {
      order_id,
      status_action
    });
    return response.data;
  }
};
