import { Component, input, output, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-restaurant-card',
    standalone: true,
    imports: [CommonModule, RouterModule, NgOptimizedImage],
    templateUrl: './restaurant-card.component.html',
    styleUrls: ['./restaurant-card.component.scss']
})
export class RestaurantCardComponent {
    // ✅ Angular 17 Signals implementation
    data = input.required<any>(); // We accept 'any' for now since backend TenantConfig is dynamic

    // Interaction Output
    cardClick = output<string>();

    // Computed Values (Mocking Missing Backend Data for UI Polish)
    rating = computed(() => {
        // Deterministic "Mock" Rating based on name length to keep it consistent
        const len = this.data().name?.length || 5;
        return (4.0 + (len % 10) / 10).toFixed(1);
    });

    deliveryTime = computed(() => {
        return '30-40 min'; // Static for MVP phase
    });

    costForTwo = computed(() => {
        return '₹250 for two'; // Static for MVP phase
    });

    cuisines = computed(() => {
        // If description has commas, assume it's cuisines. Else default.
        const desc = this.data().description || '';
        if (desc.includes(',')) return desc.split(',').slice(0, 2).join(', ');
        return 'North Indian, Fast Food';
    });

    imageUrl = computed(() => {
        return this.data().imageUrl || this.data().logoUrl || 'assets/default-restaurant.jpg';
    });

    onCardClick() {
        this.cardClick.emit(this.data().tenantId || this.data().id);
    }
}
