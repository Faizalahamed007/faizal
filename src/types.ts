export type NavSection =
  | 'dashboard'
  | 'customers'
  | 'services'
  | 'plans'
  | 'subscriptions'
  | 'billing'
  | 'support'
  | 'reports';

export interface AdminUser {
  adminId: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
}

export interface Customer {
  customer_id: number;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  created_at: string;
  service_count?: number;
  unpaid_bills?: number;
}

export interface TelecomService {
  service_id: number;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  service_type: 'Mobile' | 'Broadband' | 'Landline';
  service_identifier: string;
  service_area: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  activated_at: string;
}

export interface Plan {
  plan_id: number;
  plan_name: string;
  service_type: 'Mobile' | 'Broadband' | 'Landline';
  data_limit_gb: number;
  call_limit_mins: number;
  validity_days: number;
  monthly_fee: number;
  description: string;
  is_active: number;
  created_at: string;
  active_subscribers?: number;
}

export interface Subscription {
  subscription_id: number;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  plan_id: number;
  plan_name?: string;
  service_type?: 'Mobile' | 'Broadband' | 'Landline';
  monthly_fee?: number;
  validity_days?: number;
  service_id: number | null;
  service_identifier?: string | null;
  start_date: string;
  expiry_date: string;
  status: 'Active' | 'Expired' | 'Cancelled' | 'Renewed';
  created_at: string;
}

export interface Bill {
  bill_id: number;
  bill_number: string;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  subscription_id: number | null;
  billing_period: string;
  amount: number;
  due_date: string;
  status: 'Paid' | 'Unpaid' | 'Overdue' | 'Partial';
  generated_at: string;
  total_paid?: number;
  latest_payment_mode?: string | null;
  latest_payment_date?: string | null;
}

export interface Payment {
  payment_id: number;
  bill_id: number;
  bill_number?: string;
  billing_period?: string;
  customer_id: number;
  customer_name?: string;
  amount_paid: number;
  payment_mode: 'UPI' | 'Card' | 'Cash';
  transaction_ref: string;
  payment_date: string;
  notes: string;
}

export interface SupportTicket {
  ticket_id: number;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  service_id: number | null;
  service_identifier?: string | null;
  service_type?: string | null;
  subject: string;
  issue_description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'Pending' | 'In Progress' | 'Resolved';
  created_at: string;
  updated_at: string;
}

export interface MonthlyRevenuePoint {
  month_key: string;
  payment_count: number;
  total_revenue: number;
}

export interface ServiceStatPoint {
  service_type: 'Mobile' | 'Broadband' | 'Landline';
  total_services: number;
  active_services: number;
}

export interface DashboardPayload {
  summary: {
    totalCustomers: number;
    activePlans: number;
    totalBills: number;
    pendingBills: number;
    totalBilledAmount: number;
    openTickets: number;
  };
  recentCustomers: Customer[];
  recentSubscriptions: Subscription[];
  recentPayments: Payment[];
  monthlyRevenue: MonthlyRevenuePoint[];
  serviceStats: ServiceStatPoint[];
}

export interface ReportsPayload {
  kpis: {
    totalCustomers: number;
    totalDataUsage: number;
    totalRevenue: number;
    openTickets: number;
  };
  monthlyRevenue: MonthlyRevenuePoint[];
  customerGrowth: { month_key: string; new_customers: number }[];
  serviceDistribution: ServiceStatPoint[];
  paymentByMode: { payment_mode: string; tx_count: number; total_amount: number }[];
  billStatusBreakdown: { status: string; bill_count: number; total_amount: number }[];
  dbmsAnalytics: {
    highValueCustomers: { customer_id: number; full_name: string; city: string; total_spent: number }[];
    planUtilization: {
      plan_id: number;
      plan_name: string;
      service_type: string;
      monthly_fee: number;
      subscription_count: number;
    }[];
    customerLedger: {
      customer_id: number;
      full_name: string;
      email: string;
      account_status: string;
      total_bills: number;
      total_billed: number;
      total_paid: number;
    }[];
  };
}
