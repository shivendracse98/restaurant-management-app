import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SuperAdminDashboardComponent } from './super-admin-dashboard/super-admin-dashboard.component';
import { PlanListComponent } from './components/plan-list/plan-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: SuperAdminDashboardComponent },
  { path: 'onboard', loadComponent: () => import('./super-admin-onboard/super-admin-onboard.component').then(m => m.SuperAdminOnboardComponent) },
  { path: 'settings', loadComponent: () => import('./global-settings/global-settings.component').then(m => m.GlobalSettingsComponent) },

  // Billing Routes
  { path: 'billing', loadComponent: () => import('./billing/billing-dashboard/billing-dashboard.component').then(m => m.BillingDashboardComponent) },
  { path: 'billing/invoices', loadComponent: () => import('./billing/invoices-list/invoices-list.component').then(m => m.InvoicesListComponent) },
  { path: 'billing/invoices/:id', loadComponent: () => import('./billing/invoice-detail/invoice-detail.component').then(m => m.InvoiceDetailComponent) },

  // Tenant Groups Routes
  { path: 'groups', loadComponent: () => import('./tenant-groups/tenant-groups-list/tenant-groups-list.component').then(m => m.TenantGroupsListComponent) },
  { path: 'groups/:id', loadComponent: () => import('./tenant-groups/tenant-group-detail/tenant-group-detail.component').then(m => m.TenantGroupDetailComponent) },

  // Platform Staff Routes
  { path: 'users', loadComponent: () => import('./users/platform-users/platform-users.component').then(m => m.PlatformUsersComponent) },

  // Subscription Plans
  { path: 'plans', component: PlanListComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SuperAdminRoutingModule { }
