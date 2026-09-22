import { api } from './api';
import type { User, AuthTokens } from '../types';

export const authService = {
  async register(
    phone_number: string,
    full_name: string,
    password: string,
    is_expert_applicant?: boolean,
    requested_company_id?: number | null
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await api.post('/auth/register/', {
      phone_number,
      full_name,
      password,
      is_expert_applicant,
      requested_company_id
    });
    return response.data;
  },

  async login(phone_number: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await api.post('/auth/login/', { phone_number, password });
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get('/auth/user/');
    return response.data;
  },

  async logout(refresh_token?: string): Promise<void> {
    await api.post('/auth/logout/', { refresh: refresh_token });
  }
};
