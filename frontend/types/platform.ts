export type PlatformRole = "SUPERADMIN" | "SUPPORT" | "FINANCE" | "ANALYST";
export type BusinessStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELLED";
export type PlatformUserStatus = "ACTIVE" | "INACTIVE";

export interface PlatformSessionUser {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  token: string;
}

export interface PlatformPlan {
  id: string;
  name: string;
  price: string;
  maxBarbers: number;
  maxAppointmentsPerMonth: number;
  features: Record<string, unknown>;
  active: boolean;
  createdAt: string;
  _count?: { businesses: number; subscriptions: number };
}

export interface PlatformBusiness {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  status: BusinessStatus;
  createdAt: string;
  trialEndsAt: string | null;
  plan: { id: string; name: string };
  _count: { users: number; barbers: number; appointments: number };
}

export interface PlatformBusinessDetail extends PlatformBusiness {
  subscriptions: Array<{
    id: string;
    status: SubscriptionStatus;
    startDate: string;
    endDate: string;
    amount: string | null;
    plan: { name: string };
  }>;
  _count: { users: number; barbers: number; services: number; appointments: number; customers: number };
  stats: {
    appointmentsThisMonth: number;
    lastActivity: string | null;
  };
}

export interface PlatformSubscription {
  id: string;
  businessId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  amount: string | null;
  paymentMethod: string | null;
  externalRef: string | null;
  createdAt: string;
  business: { id: string; name: string; slug: string; status: BusinessStatus };
  plan: { id: string; name: string; price: string };
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  status: PlatformUserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PlatformAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  performedBy: { id: string; name: string; email: string; role: PlatformRole };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  trialBusinesses: number;
  suspendedBusinesses: number;
  cancelledBusinesses: number;
  activeSubscriptions: number;
  totalAppointments: number;
  estimatedMRR: number;
  planDistribution: Array<{
    id: string;
    name: string;
    price: string;
    _count: { businesses: number; subscriptions: number };
  }>;
}

export interface GrowthDataPoint {
  month: string;
  businesses: number;
  appointments: number;
}
