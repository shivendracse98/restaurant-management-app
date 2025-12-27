import { PaymentMethod, PaymentStatus } from './enums';

export interface Payment {
  id: string;
  restaurantId?: string; // Multi-tenancy support
  orderId: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  qrCodeUrl?: string;
  upiId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  notes?: string;
  transactionId?: string; // External Reference from Razorpay/Bank
}

export interface PaymentStats {
  totalRevenue: number;
  pendingApprovals: number;
  successfulTransactions: number;
  failedTransactions: number;
}