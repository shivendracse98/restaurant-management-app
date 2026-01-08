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
import { superAdminGuard } from './core/guards/super-admin.guard';
import { guestGuard } from './core/guards/guest.guard';
import { financeGuard } from './core/guards/finance.guard';


export const routes: Routes = [
  // ✅ NEW: Main Landing / About Page (Cinematic)
  {
    path: '',
    loadComponent: () => import('./features/public/about-us/about-us.component').then(m => m.AboutUsComponent),
    canActivate: [guestGuard]
  },

  // Marketing Links (Aliases)
  { path: 'for-restaurants', redirectTo: 'partner-with-us', pathMatch: 'full' },
  { path: 'legal', redirectTo: 'terms', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'menu', component: MenuListComponent },
  { path: 'menu/:id', component: FoodDetailComponent },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent, canActivate: [authGuard] },
  {
    path: 'orders',
    loadComponent: () => import('./features/customer/order-history/order-history.component').then(m => m.OrderHistoryComponent),
    canActivate: [authGuard]
  },

  // ✅ NEW: Order Tracking (for post-payment)
  {
    path: 'order-tracking/:id',
    loadComponent: () => import('./features/customer/order-tracking/order-tracking.component').then(m => m.OrderTrackingComponent),
    canActivate: [authGuard, customerGuard]
  },


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
    path: 'admin/qr-codes',
    loadComponent: () =>
      import('./features/admin/qr-code-generator/qr-code-generator.component')
        .then(m => m.QrCodeGeneratorComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/analytics',
    loadComponent: () =>
      import('./features/admin/analytics/analytics.component')
        .then(m => m.AnalyticsComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/staff',
    loadComponent: () =>
      import('./features/admin/staff-management/staff-management.component')
        .then(m => m.StaffManagementComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/settings',
    loadComponent: () =>
      import('./features/admin/admin-settings/admin-settings.component')
        .then(m => m.AdminSettingsComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/reviews',
    loadComponent: () =>
      import('./features/admin/admin-reviews/admin-reviews.component')
        .then(m => m.AdminReviewsComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/offers',
    loadComponent: () =>
      import('./features/admin/admin-offers/admin-offers.component')
        .then(m => m.AdminOffersComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/billing',
    loadComponent: () =>
      import('./features/admin/billing/billing-dashboard/billing-dashboard.component')
        .then(m => m.BillingDashboardComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/billing/invoices',
    loadComponent: () =>
      import('./features/admin/billing/invoices-list/invoices-list.component')
        .then(m => m.InvoicesListComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/billing/payment-methods',
    loadComponent: () =>
      import('./features/admin/billing/payment-methods/payment-methods.component')
        .then(m => m.PaymentMethodsComponent),
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
  {
    path: 'super-admin',
    loadChildren: () => import('./features/super-admin/super-admin.module').then(m => m.SuperAdminModule),
    canActivate: [authGuard, superAdminGuard]
  },
  {
    path: 'finance',
    loadComponent: () => import('./features/finance/finance-dashboard/finance-dashboard.component').then(m => m.FinanceDashboardComponent),
    canActivate: [authGuard] // TODO: Add financeGuard
  },
  { path: 'dashboard', component: CustomerDashboardComponent, canActivate: [authGuard, customerGuard] },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  // ✅ NEW: Public Partner Onboarding
  {
    path: 'partner-with-us',
    loadComponent: () => import('./features/public/partner-with-us/partner-with-us.component').then(m => m.PartnerWithUsComponent)
  },

  // ✅ NEW: Premium About Us Page (Redirects to Root now)
  { path: 'about', redirectTo: '', pathMatch: 'full' },

  // ✅ NEW: Static Pages (SEO/Footer Links)
  { path: 'careers', loadComponent: () => import('./features/public/static-content/static-content.component').then(m => m.StaticContentComponent), data: { type: 'careers' } },
  { path: 'team', loadComponent: () => import('./features/public/static-content/static-content.component').then(m => m.StaticContentComponent), data: { type: 'team' } },
  { path: 'contact', loadComponent: () => import('./features/public/static-content/static-content.component').then(m => m.StaticContentComponent), data: { type: 'contact' } },
  { path: 'help', loadComponent: () => import('./features/public/static-content/static-content.component').then(m => m.StaticContentComponent), data: { type: 'help' } },
  { path: 'terms', loadComponent: () => import('./features/public/static-content/static-content.component').then(m => m.StaticContentComponent), data: { type: 'terms' } },
  { path: 'privacy', loadComponent: () => import('./features/public/static-content/static-content.component').then(m => m.StaticContentComponent), data: { type: 'privacy' } },
  // ✅ Catch-all wildcard route (must be last)
  { path: '**', redirectTo: 'home' }
];
