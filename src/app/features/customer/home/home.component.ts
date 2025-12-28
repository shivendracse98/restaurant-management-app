import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ConfigService } from '../../../core/services/config.service';
import { TenantService } from '../../../core/services/tenant.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  tenants: any[] = [];
  loading = true;

  constructor(
    private configService: ConfigService,
    private tenantService: TenantService,
    private router: Router,
    private auth: AuthService // Injected AuthService
  ) { }

  ngOnInit(): void {
    this.configService.getAllTenants().subscribe(data => {
      this.tenants = data;
      this.loading = false;
    });
  }

  selectTenant(tenantId: string): void {
    this.tenantService.setTenantId(tenantId);
    // If user is logged in, go to Dashboard. Otherwise, go to Menu (Guest view).
    const target = this.auth.currentUser() ? '/customer/dashboard' : '/menu';
    this.router.navigate([target]);
  }
}
