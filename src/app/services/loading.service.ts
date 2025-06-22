// src/app/services/loading.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  // Loading states
  private authLoadingSubject = new BehaviorSubject<boolean>(true);
  private routeLoadingSubject = new BehaviorSubject<boolean>(false);
  private componentLoadingSubject = new BehaviorSubject<boolean>(false);

  // Public observables
  authLoading$ = this.authLoadingSubject.asObservable();
  routeLoading$ = this.routeLoadingSubject.asObservable();
  componentLoading$ = this.componentLoadingSubject.asObservable();

  // Main loading observable - true if ANY loading is happening
  loading$ = combineLatest([
    this.authLoading$,
    this.routeLoading$,
    this.componentLoading$
  ]).pipe(
    map(([authLoading, routeLoading, componentLoading]) => {
      const isLoading = authLoading || routeLoading || componentLoading;
      console.log('🔄 Loading states:', { authLoading, routeLoading, componentLoading, isLoading });
      return isLoading;
    }),
    distinctUntilChanged()
  );

  // App loading (shows until everything is ready)
  appLoading$ = combineLatest([
    this.authLoading$,
    this.routeLoading$
  ]).pipe(
    map(([authLoading, routeLoading]) => authLoading || routeLoading),
    distinctUntilChanged()
  );

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.initializeAuthLoading();
    this.initializeRouteLoading();
  }

  private initializeAuthLoading(): void {
    // Watch auth state and update loading
    this.authService.user$.subscribe(user => {
      if (user !== undefined) {
        // Auth has resolved (user is either logged in or not)
        console.log('🔐 Auth resolved, user:', user?.email || 'No user');
        this.setAuthLoading(false);
      } else {
        // Auth still loading
        console.log('🔐 Auth still loading...');
        this.setAuthLoading(true);
      }
    });
  }

  private initializeRouteLoading(): void {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        console.log('🧭 Navigation started to:', event.url);
        this.setRouteLoading(true);
      } else if (event instanceof NavigationEnd) {
        console.log('🧭 Navigation completed to:', event.url);
        // Small delay to ensure component starts loading
        setTimeout(() => {
          this.setRouteLoading(false);
        }, 100);
      }
    });
  }

  // Public methods to control loading states
  setAuthLoading(loading: boolean): void {
    console.log('🔐 Setting auth loading:', loading);
    this.authLoadingSubject.next(loading);
  }

  setRouteLoading(loading: boolean): void {
    console.log('🧭 Setting route loading:', loading);
    this.routeLoadingSubject.next(loading);
  }

  setComponentLoading(loading: boolean): void {
    console.log('📊 Setting component loading:', loading);
    this.componentLoadingSubject.next(loading);
  }

  // Get current loading state
  getCurrentLoadingState(): { auth: boolean; route: boolean; component: boolean; any: boolean } {
    const auth = this.authLoadingSubject.value;
    const route = this.routeLoadingSubject.value;
    const component = this.componentLoadingSubject.value;

    return {
      auth,
      route,
      component,
      any: auth || route || component
    };
  }

  // Helper to reset all loading states
  resetAllLoading(): void {
    console.log('🔄 Resetting all loading states');
    this.setAuthLoading(false);
    this.setRouteLoading(false);
    this.setComponentLoading(false);
  }
}
