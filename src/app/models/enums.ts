
export enum UserRole {
    ADMIN = 'ADMIN',
    STAFF = 'STAFF',
    CUSTOMER = 'CUSTOMER'
}

export enum OrderStatus {
    PENDING = 'PENDING',
    PREPARING = 'PREPARING',
    READY = 'READY',
    OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
    DELIVERED = 'DELIVERED',
    PAID = 'PAID',
    CONFIRMED = 'CONFIRMED',
    COMPLETED = 'COMPLETED',
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
    REFUNDED = 'REFUNDED',
    VERIFICATION_PENDING = 'VERIFICATION_PENDING',
    PAID = 'PAID',
    COMPLETED = 'COMPLETED'
}

export enum PaymentMethod {
    CASH = 'CASH',
    CARD = 'CARD',
    UPI = 'UPI',
    QR_CODE = 'QR_CODE',
    NET_BANKING = 'NET_BANKING'
}
