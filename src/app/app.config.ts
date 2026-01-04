import { ApplicationConfig, provideZoneChangeDetection, ErrorHandler, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideToastr } from 'ngx-toastr';
import { coreInterceptor } from './core/interceptors/core.interceptor';
import { GlobalErrorHandler } from './core/handlers/global-error.handler';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
        provideRouter(routes),
        provideAnimations(),
        provideHttpClient(withInterceptors([coreInterceptor])),
        provideToastr({
            timeOut: 3000,
            positionClass: 'toast-top-right',
            preventDuplicates: true,
            progressBar: true,
            closeButton: true,
            newestOnTop: true
        }),
        provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
        })
    ]
};
