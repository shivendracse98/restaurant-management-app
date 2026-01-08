export interface TenantGroup {
    id: string;
    name: string;
    description?: string;
    ownerId: number;
    ownerName: string;
    ownerEmail: string;
    status: GroupStatus;
    billingModel: BillingModel;
    menuModel: MenuModel;
    packageType: PackageType;
    restaurantCount: number;
    activeSubscriptions: number;
    planId: string;
    featuresBitmask: number;
    createdAt: string;
    updatedAt: string;
}

export enum GroupStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    TRIAL = 'TRIAL',
    SUSPENDED = 'SUSPENDED'
}

export enum BillingModel {
    PER_RESTAURANT = 'PER_RESTAURANT',
    GROUP_LEVEL = 'GROUP_LEVEL',
    HYBRID = 'HYBRID'
}

export enum MenuModel {
    INDEPENDENT = 'INDEPENDENT',
    MASTER_MENU = 'MASTER_MENU',
    HYBRID = 'HYBRID'
}

export enum PackageType {
    STARTER = 'STARTER',
    PROFESSIONAL = 'PROFESSIONAL',
    ENTERPRISE = 'ENTERPRISE',
    CUSTOM = 'CUSTOM'
}
