import { OrderStatus, OrderType } from './enums';

export interface OrderItem {
  menuItemId: number;
  qty: number;
  price: number;
  name?: string;
}

export interface Order {
  id?: number;
  restaurantId?: string; // Multi-tenancy support
  customerId?: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address: string;
  orderType: OrderType;
  items: OrderItem[];
  total: number;
  totalAmount?: number; // Backend DTO field
  status: OrderStatus;
  createdAt?: string;
  paymentId?: number;
  updatedAt?: string;
  updatedBy?: string;
  tableNumber?: string;
  paymentMode?: string;
  paidAt?: string;
  paymentStatus?: string; // or PaymentStatus enum
  paymentProof?: string;
}
