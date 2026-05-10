export type Role = "OWNER" | "ADMIN" | "BARBER" | "RECEPTIONIST";

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

/** Generic paginated response returned by all list endpoints */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface SessionUser {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  role: Role;
  name: string;
  token: string;
  refreshToken?: string;
  permissions: string[];
  email?: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  barberId: string;
  serviceId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  finalPrice?: string;
  notes?: string;
  cancelReason?: string;
  customer?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  barber?: {
    id: string;
    specialty?: string;
    user?: {
      id: string;
      name: string;
      role: Role;
    };
  };
  service?: {
    id: string;
    name: string;
    durationMinutes: number;
    price?: string;
  };
}

export interface Barber {
  id: string;
  businessId: string;
  specialty?: string;
  commissionPercentage: string;
  active: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    active: boolean;
  };
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: string;
  active: boolean;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  birthDate?: string;
  preferredBarberId?: string;
  totalVisits: number;
  totalSpent: string;
  lastVisitAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface BusinessHour {
  id?: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string | null;
  currency: string;
  appointmentIntervalMinutes: number;
}
