export interface Subscription {
  id?: string;
  customerName: string;
  customerPhone?: string;
  address?: string; // Delivery address

  // Date Logic
  startDate: string;        // ISO Date
  endDate: string;          // Calculated: Start + (30 * Months) + Total Paused Days
  maxEndDate: string;       // Strict Limit: Start + (30 * Months) + (5 * Months)

  // Plan Details
  frequency: 'DAILY';       // Logic assumes Daily for now
  durationMonths: number;
  menuItemId: number;       // Main item ID
  menuItemName: string;

  // Financials
  pricePerDay: number;
  billedDays: number;       // e.g. 28 * Months
  discountAmount: number;   // Saved amount
  finalAmount: number;      // Total to pay

  // Status Tracking
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED';
  pausedAt?: string;        // ISO Date when pause started
  totalPausedDays: number;  // Cumulative days paused

  createdBy?: string;
  createdAt?: string;
}
