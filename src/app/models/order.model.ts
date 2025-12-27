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
  customerName: string;
  customerPhone: string;
  address: string;
  orderType: OrderType;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt?: string;
  paymentId?: number;
  updatedAt?: string;
  updatedBy?: string;
  tableNumber?: string;
}
