import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { FeatureFlagService, FeatureFlagConfig } from './feature-flag.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

type FeatureFlagState = {
    flags: FeatureFlagConfig;
    loading: boolean;
    error: string | null;
};

const initialState: FeatureFlagState = {
    flags: {},
    loading: false,
    error: null,
};

export const FeatureFlagStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withMethods((store, featureFlagService = inject(FeatureFlagService)) => ({
        loadFlags: rxMethod<void>(
            pipe(
                tap(() => patchState(store, { loading: true })),
                switchMap(() => featureFlagService.getFlags().pipe(
                    tap((flags) => patchState(store, { flags, loading: false })),
                    catchError((err) => {
                        patchState(store, { error: 'Failed to load flags', loading: false });
                        return of({});
                    })
                ))
            )
        ),

        isFeatureEnabled(featureName: string): boolean {
            return !!store.flags()[featureName];
        }
    }))
);
