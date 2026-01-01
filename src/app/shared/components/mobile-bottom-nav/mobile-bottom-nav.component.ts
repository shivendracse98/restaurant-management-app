import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
    selector: 'app-mobile-bottom-nav',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './mobile-bottom-nav.component.html',
    styleUrls: ['./mobile-bottom-nav.component.scss']
})
export class MobileBottomNavComponent {

    constructor(
        public auth: AuthService,
        public cart: CartService
    ) { }

}
