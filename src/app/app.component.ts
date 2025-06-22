import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { AdminService } from './services/admin.service';
import { ThemeService } from './services/theme.service';
import { Router } from '@angular/router';
import { Subject, Observable } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

// Material imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

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
    MatDividerModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Job Tracker';

  // Use a local observable for admin status to prevent template loops
  isAdmin$: Observable<boolean>;

  private destroy$ = new Subject<void>();

  constructor(
    public authService: AuthService,
    public adminService: AdminService,
    public themeService: ThemeService,
    private router: Router
  ) {
    // Initialize admin status observable
    this.isAdmin$ = this.adminService.isCurrentUserAdmin();
  }

  ngOnInit() {
    console.log('🚀 AppComponent initialized');

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
      } else {
        console.log('👤 No user logged in');
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async logout() {
    try {
      await this.authService.logout();
      console.log('Logged out successfully');
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
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
}
