import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SuperAdminRoutingModule } from './super-admin-routing.module';


import { SuperAdminDashboardComponent } from './super-admin-dashboard/super-admin-dashboard.component';

@NgModule({
  declarations: [
    SuperAdminDashboardComponent
  ],
  imports: [
    CommonModule,
    SuperAdminRoutingModule
  ]
})
export class SuperAdminModule { }
