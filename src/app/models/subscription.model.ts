export interface Subscription {
  id?: string;
  customerName: string;
  customerPhone?: string;
  startDate: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  durationMonths?: number;
  menuPlan: { menuItemId: number; name: string; qty: number; price: number }[];
  totalPerDelivery: number;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  createdBy?: string;
  createdAt?: string;
}
