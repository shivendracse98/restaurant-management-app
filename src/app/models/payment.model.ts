export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  paymentMethod: 'qr_code' | 'upi';
  qrCodeUrl?: string;
  upiId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  notes?: string;
}

export interface PaymentStats {
  totalRevenue: number;
  pendingApprovals: number;
  successfulTransactions: number;
  failedTransactions: number;
}