export type InsuranceType = 'third_party' | 'body' | 'health' | 'travel' | 'life' | 'fire';


export interface User {
  id: number;
  phone_number: string;
  email?: string;
  full_name: string;
  role?: 'USER' | 'ADMIN' | 'EXPERT';
  role_display?: string;
  assigned_company?: number | null;
  assigned_company_name?: string | null;
  is_approved_expert?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  created_at: string;
}

export interface InsuranceCompany {
  id: number;
  name: string;
  code: string;
  logo_url?: string;
  rating: number;
  wealth_level: number;
  complaint_satisfaction_rate: number;
  plans_count?: number;
}

export interface InsuranceCoverage {
  id: number;
  plan: number;
  plan_title?: string;
  name: string;
  description: string;
  coverage_type: 'BASE' | 'OPTIONAL';
  coverage_type_display?: string;
  additional_price: number;
  is_active: boolean;
  created_at?: string;
}

export interface InsurancePlan {
  id: number;
  company: InsuranceCompany;
  company_id?: number;
  company_name?: string;
  title: string;
  insurance_type: InsuranceType;
  insurance_type_display?: string;

  description: string;
  base_price: number;
  coverage_amount: number;
  coverage_details: string[];
  max_discount_percent: number;
  is_active: boolean;
  is_installment_enabled?: boolean;
  allow_3_months?: boolean;
  allow_6_months?: boolean;
  down_payment_percent?: number;
  coverages?: InsuranceCoverage[];
}

export interface Recommendation {
  id: number;
  plan: InsurancePlan;
  calculated_price: number;
  original_price: number;
  discount_amount: number;
  recommendation_reason: string;
  collected_data?: Record<string, any>;
  created_at: string;
}

export interface ChatMessage {
  id: string | number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  recommendation?: Recommendation;
  order?: Order;
  audioUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  insurance_type?: InsuranceType;
  collected_data: Record<string, any>;
  is_completed: boolean;
  messages?: ChatMessage[];
  messages_count?: number;
  paid_order?: Order;
}

export type OrderStatus = 'pending_payment' | 'paid' | 'cancelled' | 'failed';
export type PaymentType = 'cash' | 'installment_3' | 'installment_6';

export interface Order {
  id: string;
  order_number: string;
  plan: InsurancePlan;
  plan_title?: string;
  company_name?: string;
  user: User;
  user_phone?: string;
  user_name?: string;
  total_price: number;
  payment_type?: PaymentType;
  payment_type_display?: string;
  down_payment_amount?: number;
  installment_count?: number;
  installment_amount?: number;
  paid_installments_count?: number;
  initial_payable_amount?: number;
  status: OrderStatus;
  status_display?: string;
  selected_coverages?: string[];
  collected_info: Record<string, any>;
  created_at: string;
  updated_at?: string;
  payment_url?: string;
}

export interface Payment {
  id: string;
  order: Order;
  order_number?: string;
  user_phone?: string;
  user_name?: string;
  plan_title?: string;
  transaction_id: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  status_display?: string;
  payment_gateway: string;
  paid_at?: string;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Admin Interfaces
export interface AdminDashboardMetrics {
  total_users: number;
  total_products: number;
  active_products: number;
  total_orders: number;
  paid_orders: number;
  pending_orders: number;
  successful_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  total_revenue: number;
}

export interface AdminDashboardData {
  is_expert?: boolean;
  company_name?: string;
  metrics: AdminDashboardMetrics;
  recent_orders: Order[];
  recent_users: User[];
  recent_transactions: Payment[];
}

export interface AdminUserListItem {
  id: number;
  phone_number: string;
  full_name: string;
  role: 'USER' | 'ADMIN' | 'EXPERT';
  role_display: string;
  assigned_company?: number | null;
  assigned_company_name?: string | null;
  is_approved_expert?: boolean;
  is_active: boolean;
  created_at: string;
  orders_count: number;
}

export interface AdminUserDetail {
  id: number;
  phone_number: string;
  full_name: string;
  role: 'USER' | 'ADMIN' | 'EXPERT';
  role_display: string;
  assigned_company?: number | null;
  assigned_company_name?: string | null;
  is_approved_expert?: boolean;
  is_active: boolean;
  created_at: string;
  orders: Order[];
  chat_sessions: ChatSession[];
}

