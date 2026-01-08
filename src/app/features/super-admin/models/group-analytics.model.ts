export interface RestaurantPerformance {
    restaurantId: string;
    name: string;
    location?: string;
    revenue: number;
    orders: number;
    averageOrderValue: number;
}

export interface GroupAnalytics {
    totalRevenue: number;
    totalOrders: number;
    activeRestaurants: number;
    topPerformingRestaurant: string;
    revenueByMonth: { [key: string]: number };
    breakdown: RestaurantPerformance[];
}
