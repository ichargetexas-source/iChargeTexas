export type ServiceType = "roadside" | "charging";

export interface Message {
  id: string;
  text: string;
  sender: "admin" | "user";
  timestamp: string;
}

export interface ServiceRequest {
  id: string;
  type: ServiceType;
  name: string;
  phone: string;
  email: string;
  title: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    currentLocationCoordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  vehicleInfo?: string;
  preferredDate?: string;
  preferredTime?: string;
  hasSpareTire: boolean;
  selectedServices?: {
    serviceId: string;
    serviceName: string;
    price: number;
    isAfterHours: boolean;
  }[];
  totalAmount?: number;
  status: "pending" | "scheduled" | "completed" | "canceled";
  createdAt: string;
  adminNote?: string;
  messages?: Message[];
  cancelReason?: string;
  deleteReason?: string;
  assignedStaff?: string[];
  photos?: string[];
}

export interface ArchivedRequest extends ServiceRequest {
  archivedAt: string;
  lastUpdatedAt: string;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface AppError {
  id: string;
  message: string;
  timestamp: string;
  count: number;
  lastOccurrence: string;
}

export type UserRole = "super_admin" | "admin" | "worker" | "user";

export interface SystemUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  createdBy: string;
  permissions?: {
    canManageUsers: boolean;
    canViewReports: boolean;
    canHandleRequests: boolean;
    canCreateInvoices: boolean;
    canViewCustomerInfo: boolean;
    canDeleteData: boolean;
  };
}

export interface StaffMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
  readBy: string[];
  images?: string[];
  mentions?: string[];
}

export interface StaffNotification {
  id: string;
  userId: string;
  type: 'task_assignment' | 'message';
  title: string;
  message: string;
  relatedId?: string;
  timestamp: string;
  read: boolean;
}
