// src/app/services/loading.service.ts
import {Injectable} from '@angular/core';
import {BehaviorSubject, combineLatest} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';
import {AuthService} from './auth.service';
import {AdminService} from './admin.service';
import {NavigationEnd, NavigationStart, Router} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  // Loading states
  private authLoadingSubject = new BehaviorSubject<boolean>(true);
  private routeLoadingSubject = new BehaviorSubject<boolean>(false);
  private componentLoadingSubject = new BehaviorSubject<boolean>(false);
  private adminLoadingSubject = new BehaviorSubject<boolean>(true);

  // Public observables
  authLoading$ = this.authLoadingSubject.asObservable();
  routeLoading$ = this.routeLoadingSubject.asObservable();
  componentLoading$ = this.componentLoadingSubject.asObservable();
  adminLoading$ = this.adminLoadingSubject.asObservable();

  // Main loading observable - true if ANY loading is happening
  loading$ = combineLatest([
    this.authLoading$,
    this.routeLoading$,
    this.componentLoading$,
    this.adminLoading$
  ]).pipe(
    map(([authLoading, routeLoading, componentLoading, adminLoading]) => {
      const isLoading = authLoading || routeLoading || componentLoading || adminLoading;
      console.log('🔄 Loading states:', { authLoading, routeLoading, componentLoading, adminLoading, isLoading });
      return isLoading;
    }),
    distinctUntilChanged()
  );

  // App loading (shows until auth + admin status is ready)
  appLoading$ = combineLatest([
    this.authLoading$,
    this.routeLoading$,
    this.adminLoading$
  ]).pipe(
    map(([authLoading, routeLoading, adminLoading]) => {
      return authLoading || routeLoading || adminLoading;
    }),
    distinctUntilChanged()
  );

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
  ) {
    this.initializeAuthLoading();
    this.initializeAdminLoading();
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

  private initializeAdminLoading(): void {
    // Watch auth changes and check admin status
    this.authService.user$.pipe(
      switchMap(user => {
        if (user) {
          console.log('🛡️ Checking admin status for user:', user.email);
          this.setAdminLoading(true);
          return this.adminService.isCurrentUserAdmin();
        } else {
          // No user = no admin check needed
          console.log('🛡️ No user = no admin check needed');
          this.setAdminLoading(false);
          return [false];
        }
      })
    ).subscribe(isAdmin => {
      console.log('🛡️ Admin status resolved:', isAdmin);
      this.setAdminLoading(false);
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

  setAdminLoading(loading: boolean): void {
    console.log('🛡️ Setting admin loading:', loading);
    this.adminLoadingSubject.next(loading);
  }

  // Get current loading state
  getCurrentLoadingState(): { auth: boolean; route: boolean; component: boolean; admin: boolean; any: boolean } {
    const auth = this.authLoadingSubject.value;
    const route = this.routeLoadingSubject.value;
    const component = this.componentLoadingSubject.value;
    const admin = this.adminLoadingSubject.value;

    return {
      auth,
      route,
      component,
      admin,
      any: auth || route || component || admin
    };
  }

  // Helper to reset all loading states
  resetAllLoading(): void {
    console.log('🔄 Resetting all loading states');
    this.setAuthLoading(false);
    this.setRouteLoading(false);
    this.setComponentLoading(false);
    this.setAdminLoading(false);
  }
}
