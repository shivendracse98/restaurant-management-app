import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-restaurant-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './restaurant-card.component.html',
    styleUrls: ['./restaurant-card.component.css']
})
export class RestaurantCardComponent {
    @Input() data: any;
    @Input() isPromoted: boolean = false;
    @Output() cardClick = new EventEmitter<any>();

    onCardClick() {
        this.cardClick.emit(this.data);
    }
}
