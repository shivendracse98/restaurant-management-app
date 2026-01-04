import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';

@Component({
    selector: 'app-static-content',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="static-page-container">
      <nav class="simple-nav">
        <div class="logo" routerLink="/">TasteTown</div>
      </nav>
      
      <div class="content-wrapper">
        <header class="page-header">
          <h1>{{ activeContent().title }}</h1>
        </header>
        
        <div class="page-body">
          <p class="lead">{{ activeContent().content }}</p>
          
          <div *ngIf="activeContent().details" class="details-box">
             <p *ngFor="let line of activeContent().details">{{ line }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .static-page-container {
      min-height: 100vh;
      background: #f9f9f9;
      font-family: 'Inter', sans-serif;
    }
    .simple-nav {
      background: white;
      padding: 15px 40px;
      border-bottom: 1px solid #eee;
      .logo { font-size: 1.5rem; font-weight: 800; font-style: italic; color: #333; cursor: pointer; }
    }
    .content-wrapper {
      max-width: 800px;
      margin: 60px auto;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }
    h1 { font-size: 2.5rem; color: #1c1c1c; margin-bottom: 20px; }
    .lead { font-size: 1.1rem; line-height: 1.6; color: #444; margin-bottom: 30px; }
    .details-box {
      background: #f1f1f1;
      padding: 20px;
      border-radius: 8px;
      p { margin-bottom: 10px; color: #555; font-size: 0.95rem; }
    }
  `]
})
export class StaticContentComponent implements OnInit {
    pageType = signal<string>('');

    // 📖 Content Map from User Input
    contentMap: any = {
        'about': {
            title: 'About TasteTown',
            content: 'TasteTown is a modern restaurant technology platform designed to simplify daily operations for restaurants of all sizes — from order management and billing to staff and customer experiences.'
        },
        'careers': {
            title: 'Careers at TasteTown',
            content: 'We’re building practical technology for real businesses. Join us if you’re passionate about food-tech, SaaS, and solving real-world problems.'
        },
        'team': {
            title: 'Our Team',
            content: 'TasteTown is built by a small, focused team with experience in restaurant operations, software engineering, and product design.'
        },
        'contact': {
            title: 'Contact Us',
            content: 'Have a question or want to work with us?',
            details: ['📧 Email: support@tastetown.in', '📍 Location: India']
        },
        'help': {
            title: 'Help & Support',
            content: 'Need assistance? Our support team is here to help you with onboarding, setup, and daily usage.'
        },
        'terms': {
            title: 'Terms & Conditions',
            content: 'By using TasteTown, you agree to our terms governing platform usage, subscriptions, and services.'
        },
        'privacy': {
            title: 'Privacy Policy',
            content: 'Your data belongs to you. We are committed to protecting your privacy and using your information responsibly and transparently.'
        }
    };

    activeContent = computed(() => {
        return this.contentMap[this.pageType()] || { title: 'Page Not Found', content: 'The content you requested does not exist.' };
    });

    constructor(private route: ActivatedRoute) { }

    ngOnInit() {
        this.route.data.subscribe(data => {
            this.pageType.set(data['type']);
        });
    }
}
