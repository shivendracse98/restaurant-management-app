export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  menuItemId: number;
  qty: number;
  price: number;
  name?: string;
}

export interface Order {
  id?: number;
  customerName: string;
  customerPhone: string;
  address: string;
  orderType: 'DINE_IN' | 'PARCEL' | 'DELIVERY' | 'TIFFIN' | string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt?: string;
  paymentId?: number;
}
