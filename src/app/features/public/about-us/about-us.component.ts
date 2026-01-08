import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common'; // Added DecimalPipe for number formatting
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; // Needed for ngModel

@Component({
    selector: 'app-about-us', // Keeping original selector to match route mapping
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './about-us.component.html',
    styleUrls: ['./about-us.component.scss']
})
export class AboutUsComponent implements OnInit {

    // Navigation & State
    isScrolled = false;
    activeFaq = 0;
    isMobileMenuOpen = false;

    // ROI Calculator
    ordersPerDay = 50;
    avgOrderValue = 250;
    tastetownEarning = 0;
    zomatoEarning = 0;
    savings = 0;
    ordersPerMonth = 0;
    annualSavings = 0;

    // Newsletter
    newsletterEmail = '';

    constructor(private router: Router) { }

    ngOnInit() {
        this.checkLoggedInUser();
        // Initialize calculator with default values
        this.calculateROI();
    }

    // ========== GUEST GUARD LOGIC ==========
    // Note: GuestGuard already generally handles this, but valid to keep as backup
    checkLoggedInUser() {
        const token = localStorage.getItem('rms_token') || sessionStorage.getItem('rms_token');
        const userStr = localStorage.getItem('rms_user') || sessionStorage.getItem('rms_user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.role === 'CUSTOMER') {
                    this.router.navigate(['/home']);
                } else if (user.role === 'ADMIN') {
                    this.router.navigate(['/admin/dashboard']);
                } else if (user.role === 'STAFF') {
                    this.router.navigate(['/staff/pos']);
                }
            } catch (e) {
                // Invalid user data, ignore
            }
        }
    }

    // ========== SCROLL DETECTION ==========
    @HostListener('window:scroll', [])
    onWindowScroll() {
        this.isScrolled = window.scrollY > 50;
    }

    toggleMobileMenu() {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
        // Prevent body scroll when menu is open
        if (this.isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    closeMobileMenu() {
        this.isMobileMenuOpen = false;
        document.body.style.overflow = '';
    }

    // ========== ROI CALCULATOR ==========
    calculateROI(event?: any) {
        // If called from event, we might need to update values if they aren't bound yet (though ngModel handles it)
        // Angular signals/ngModel updates automatically, so we just re-run calculation

        // Calculate monthly orders
        this.ordersPerMonth = this.ordersPerDay * 30;

        // Calculate total revenue
        const totalRevenue = this.ordersPerMonth * this.avgOrderValue;

        // TasteTown: 90% of orders + ₹4,999 subscription (Professional plan)
        // Note: Revenue = (Total * 0.9) - Subs
        // Wait, the logic in proposal was: (Total * 0.9) + 4999? 
        // No, Earning = Revenue - Commission - Subs
        // Revenue - (Revenue * 0.1) - 4999
        // = Revenue * 0.9 - 4999
        this.tastetownEarning = Math.round((totalRevenue * 0.9) - 4999);

        // Zomato: 70% of orders (30% commission)
        // Earning = Revenue * 0.7
        this.zomatoEarning = Math.round(totalRevenue * 0.7);

        // Calculate savings
        this.savings = Math.round(this.tastetownEarning - this.zomatoEarning);
        this.annualSavings = this.savings * 12;
    }

    // ========== FAQ TOGGLE ==========
    toggleFaq(index: number) {
        if (this.activeFaq === index) {
            this.activeFaq = -1;
        } else {
            this.activeFaq = index;
        }
    }

    // ========== PRICING ACTIONS ==========
    selectPlan(plan: string) {
        console.log(`Selected plan: ${plan}`);
        // Navigate to contact form with query param
        this.router.navigate(['/partner-with-us'], {
            queryParams: { plan: plan }
        });
    }

    contactSales() {
        this.router.navigate(['/partner-with-us'], {
            queryParams: { plan: 'Enterprise' }
        });
    }

    // ========== NEWSLETTER ==========
    subscribeNewsletter(event: Event) {
        event.preventDefault();

        if (!this.newsletterEmail) {
            alert('Please enter your email');
            return;
        }

        // Simulate API
        console.log(`Newsletter subscription: ${this.newsletterEmail}`);

        alert('Thank you for subscribing! You will receive our restaurant growth guide shortly.');
        this.newsletterEmail = '';
    }
}
