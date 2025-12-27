
export enum UserRole {
    ADMIN = 'ADMIN',
    STAFF = 'STAFF',
    CUSTOMER = 'CUSTOMER'
}

export enum OrderStatus {
    PENDING = 'PENDING',
    PREPARING = 'PREPARING',
    READY = 'READY',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED'
}

export enum OrderType {
    DINE_IN = 'DINE_IN',
    TAKEAWAY = 'TAKEAWAY',
    DELIVERY = 'DELIVERY'
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
    REFUNDED = 'REFUNDED'
}

export enum PaymentMethod {
    CASH = 'CASH',
    CARD = 'CARD',
    UPI = 'UPI',
    QR_CODE = 'QR_CODE',
    NET_BANKING = 'NET_BANKING'
}
