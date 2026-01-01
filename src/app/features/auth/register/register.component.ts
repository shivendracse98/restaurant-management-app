import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  phoneNumber = '';

  constructor(private auth: AuthService, private router: Router) { }

  submit() {
    this.auth.register(this.name, this.email, this.password, this.phoneNumber).subscribe({
      next: (user) => {
        alert(`🎉 Welcome ${user.name}! A welcome email has been sent to ${user.email}.`);
        // Auto-login is handled by AuthService, so just go home
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('Registration failed', err);
        alert('Registration failed: ' + (err.error?.message || err.message));
      }
    });
  }
}
