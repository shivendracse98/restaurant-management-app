export interface FoodItem {
    id: number;
    restaurantId?: string; // Multi-tenancy support
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string;
    isAvailable?: boolean;
    isVeg?: boolean;
    masterItemId?: string;
}
