import { Routes } from '@angular/router';
import { MenuListComponent } from './features/customer/menu-list/menu-list.component';
import { CartComponent } from './features/customer/cart/cart.component';
import { CheckoutComponent } from './features/customer/checkout/checkout.component';
import { HomeComponent } from './features/customer/home/home.component';
import { FoodDetailComponent } from './features/customer/food-detail/food-detail.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { OrdersComponent } from './features/customer/orders/orders.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { customerGuard } from './core/guards/customer.guard';
import { StaffPosComponent } from './features/staff/staff-pos/staff-pos.component';
import { staffGuard } from './core/guards/staff.guard';
import { CustomerDashboardComponent } from './features/customer/customer-dashboard/customer-dashboard.component';
import { StaffTodayOrdersComponent } from './features/staff/staff-today-orders/staff-today-orders.component';
import { MenuManagementComponent } from './features/admin/menu-management/menu-management.component';
import { PendingPaymentsComponent } from './features/admin/payments/pending-payments.component';


export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'menu', component: MenuListComponent },
  { path: 'menu/:id', component: FoodDetailComponent },
  { path: 'cart', component: CartComponent, canActivate: [authGuard] },
  { path: 'checkout', component: CheckoutComponent, canActivate: [authGuard] },
  { path: 'orders', component: OrdersComponent, canActivate: [authGuard] },

  // ✅ NEW: Order Tracking (for post-payment)
  {
    path: 'order-tracking/:id',
    loadComponent: () => import('./features/customer/order-tracking/order-tracking.component').then(m => m.OrderTrackingComponent),
    canActivate: [authGuard, customerGuard]
  },

  // // ✅ NEW: Order History
  // {
  //   path: 'order-history',
  //   loadComponent: () =>
  //     import('./features/customer/order-history/order-history.component')
  //       .then(m => m.OrderHistoryComponent),
  //   canActivate: [authGuard, customerGuard]
  // },
  {
    path: 'customer/dashboard',
    loadComponent: () =>
      import('./features/customer/customer-dashboard/customer-dashboard.component')
        .then(m => m.CustomerDashboardComponent),
    canActivate: [authGuard, customerGuard],
  },

  {
    path: 'admin/dashboard',
    loadComponent: () =>
      import('./features/admin/admin-dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/menu',
    component: MenuManagementComponent,
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/payments',
    component: PendingPaymentsComponent,
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/orders',
    loadComponent: () =>
      import('./features/admin/admin-orders/admin-orders.component')
        .then(m => m.AdminOrdersComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'staff/pos',
    loadComponent: () =>
      import('./features/staff/staff-pos/staff-pos.component').then(m => m.StaffPosComponent),
    canActivate: [authGuard, staffGuard]
  },
  {
    path: 'staff/kitchen',
    loadComponent: () =>
      import('./features/staff/kitchen/kitchen.component').then(m => m.KitchenComponent),
    canActivate: [authGuard, staffGuard]
  },
  {
    path: 'staff/today-orders',
    loadComponent: () => import('./features/staff/staff-today-orders/staff-today-orders.component')
      .then(m => m.StaffTodayOrdersComponent),
    canActivate: [staffGuard], // keep authGuard + admin/staff checks if you have them
    data: { role: 'STAFF' }
  },
  { path: 'dashboard', component: CustomerDashboardComponent, canActivate: [authGuard, customerGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'register', component: RegisterComponent },
  // ✅ Catch-all wildcard route (must be last)
  { path: '**', redirectTo: 'home' }
];
