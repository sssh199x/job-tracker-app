// src/app/app.component.ts
import { Component, OnInit, OnDestroy, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from './services/auth.service';
import { AdminService } from './services/admin.service';
import { ThemeService } from './services/theme.service';
import { LoadingService } from './services/loading.service';
import { Subject, Observable } from 'rxjs';
import { takeUntil, map, filter } from 'rxjs/operators';

// Material imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterModule,
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Job Tracker';

  // Scroll state for navigation
  isScrolled = false;
  scrollOffset = 0;

  // Control when to show hero section
  shouldShowHero = true;

  // Control when to show navigation
  shouldShowNavigation = true;

  // Use a local observable for admin status to prevent template loops
  isAdmin$: Observable<boolean>;

  // Loading observables from loading service
  appLoading$: Observable<boolean>;

  private destroy$ = new Subject<void>();

  constructor(
    public authService: AuthService,
    public adminService: AdminService,
    public themeService: ThemeService,
    public loadingService: LoadingService,
    public router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    console.log('🚀 AppComponent constructor');

    // Initialize admin status observable
    this.isAdmin$ = this.adminService.isCurrentUserAdmin();

    // Get app loading state from loading service
    this.appLoading$ = this.loadingService.appLoading$;
  }

  ngOnInit() {
    console.log('🚀 AppComponent initialized');

    // Subscribe to loading state for debugging
    this.appLoading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      console.log('🔄 App loading state:', loading);
    });

    // Subscribe to user changes and log admin status
    this.authService.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        console.log('👤 User logged in:', user.email);

        // Check admin status when user logs in
        this.isAdmin$.pipe(
          takeUntil(this.destroy$)
        ).subscribe(isAdmin => {
          console.log('🛡️ Admin status for', user.email, ':', isAdmin);
        });
      } else if (user === null) {
        console.log('👤 No user logged in');
      }
      // user === undefined means still loading auth state
    });

    // Initialize scroll effects only in browser
    if (isPlatformBrowser(this.platformId)) {
      this.setupScrollEffects();
    }

    // Listen to route changes to control hero visibility
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      // Show hero only on dashboard/home routes
      this.shouldShowHero = event.url === '/dashboard' || event.url === '/' || event.url === '';

      // Hide navigation on auth pages
      this.shouldShowNavigation = event.url !== '/login' && event.url !== '/register';

      console.log('🎯 Route changed to:', event.url, 'Show hero:', this.shouldShowHero, 'Show nav:', this.shouldShowNavigation);
    });
  }

  ngOnDestroy() {
    console.log('🚀 AppComponent destroying');
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    if (!isPlatformBrowser(this.platformId)) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const heroHeight = 600; // Match hero height from CSS
    const navHeight = 75;

    // Update scroll state for navigation
    this.isScrolled = scrollTop > navHeight;

    // Calculate parallax offset for hero content
    if (scrollTop < heroHeight) {
      this.scrollOffset = scrollTop * 0.4;
      this.updateHeroParallax();
    }

    // Update hero opacity based on scroll
    this.updateHeroOpacity(scrollTop, heroHeight);
  }

  private setupScrollEffects() {
    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
  }

  private updateHeroParallax() {
    if (!isPlatformBrowser(this.platformId)) return;

    const heroContent = document.querySelector('.hero-content') as HTMLElement;
    if (heroContent) {
      heroContent.style.transform = `translateY(${this.scrollOffset}px)`;
    }
  }

  private updateHeroOpacity(scrollTop: number, heroHeight: number) {
    if (!isPlatformBrowser(this.platformId)) return;

    const hero = document.querySelector('.headline') as HTMLElement;
    if (hero && scrollTop < heroHeight) {
      const opacity = Math.max(0, 1 - (scrollTop / (heroHeight - 75)));
      hero.style.opacity = opacity.toString();
    }
  }

  async logout() {
    try {
      console.log('👋 Logging out...');
      await this.authService.logout();
      console.log('👋 Logged out successfully');
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  navigateToJobForm() {
    this.router.navigate(['/job-form']);
  }

  navigateToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  navigateToAdmin() {
    console.log('🎯 Navigating to admin dashboard');
    this.router.navigate(['/admin']);
  }

  // Smooth scroll to section (for future use)
  scrollToSection(sectionId: string) {
    if (!isPlatformBrowser(this.platformId)) return;

    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 75;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }
}
