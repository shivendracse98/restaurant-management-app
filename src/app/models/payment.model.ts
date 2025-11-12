export interface Payment {
  id?: number;
  orderId: number;
  amount: number;
  method: 'UPI' | 'CARD' | 'CASH';
  transactionId?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REJECTED';
  createdAt?: string;
}
