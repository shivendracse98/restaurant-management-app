export interface TenantDetail {
  tenantId: string;
  restaurantName: string;
  ownerName: string;
  ownerEmail: string;
  planType: 'MONTHLY' | 'YEARLY' | 'LIFETIME';
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
}
