import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService, Review } from '../../../core/services/review.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-admin-reviews',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-reviews.component.html',
    styleUrls: ['./admin-reviews.component.scss']
})
export class AdminReviewsComponent implements OnInit {

    reviews: Review[] = [];
    loading = false;

    // Reply State
    activeReplyId: number | null = null;
    replyText: string = '';

    constructor(private reviewService: ReviewService, private toastr: ToastrService) { }

    ngOnInit(): void {
        this.loadReviews();
    }

    loadReviews(): void {
        this.loading = true;
        this.reviewService.getAllReviews().subscribe({
            next: (data) => {
                this.reviews = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load reviews', err);
                this.loading = false;
            }
        });
    }

    getStars(rating: number): number[] {
        return Array(rating).fill(0);
    }

    openReply(review: Review): void {
        this.activeReplyId = review.id!;
        this.replyText = review.adminReply || '';
    }

    cancelReply(): void {
        this.activeReplyId = null;
        this.replyText = '';
    }

    submitReply(id: number): void {
        if (!this.replyText.trim()) return;

        this.reviewService.replyToReview(id, this.replyText).subscribe({
            next: (updated) => {
                this.toastr.success('Reply submitted');
                const index = this.reviews.findIndex(r => r.id === id);
                if (index !== -1) this.reviews[index] = updated;
                this.cancelReply();
            },
            error: () => this.toastr.error('Failed to submit reply')
        });
    }

    toggleHide(review: Review): void {
        const newState = !review.isHidden;
        this.reviewService.toggleHide(review.id!, newState).subscribe({
            next: (updated) => {
                const index = this.reviews.findIndex(r => r.id === review.id);
                if (index !== -1) this.reviews[index] = updated;
                this.toastr.info(newState ? 'Review Hidden' : 'Review Visible');
            },
            error: () => this.toastr.error('Failed to update status')
        });
    }
}
