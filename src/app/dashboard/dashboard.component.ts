import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { JobApplicationService, JobApplication } from '../services/job-application.service';
import { AuthService } from '../services/auth.service';
import { ExportService } from '../services/export.service';
import { LoadingService } from '../services/loading.service';
import { StatusService } from '../core/services/status.service';
import { DateUtilService } from '../core/services/date-util.service';
import { PermissionService } from '../services/permission.service';
import { ConfirmationDialogService } from '../services/confirmation-dialog.service';
import { Observable, switchMap, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith, tap, takeUntil, finalize, delay } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

// Material imports
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
// Removed MatDialogModule and MatDialog since we're using the service now

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule
    // Removed MatDialogModule since we're using the service
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  applications$!: Observable<JobApplication[]>;
  loading$!: Observable<boolean>;
  lastUpdated: Date = new Date();
  currentApplications: JobApplication[] = [];

  // Permission observables
  canExportOwnData$!: Observable<boolean>;
  isAuthenticated$!: Observable<boolean>;
  canEditOwnApplications$!: Observable<boolean>;
  canDeleteOwnApplications$!: Observable<boolean>;

  // Add refresh loading state
  private refreshLoading$ = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();

  // Define table columns
  displayedColumns: string[] = ['jobTitle', 'company', 'dateApplied', 'location', 'status', 'salary', 'actions'];

  constructor(
    private jobService: JobApplicationService,
    private authService: AuthService,
    private exportService: ExportService,
    private loadingService: LoadingService,
    private permissions: PermissionService,
    private snackBar: MatSnackBar,
    private router: Router,
    private confirmationDialog: ConfirmationDialogService,
    public statusService: StatusService,
    public dateUtil: DateUtilService
  ) {
    console.log('🚀 Dashboard constructor started');

    // Initialize permission observables
    this.isAuthenticated$ = this.permissions.isAuthenticated$;
    this.canExportOwnData$ = this.isAuthenticated$;
    this.canEditOwnApplications$ = this.isAuthenticated$;
    this.canDeleteOwnApplications$ = this.isAuthenticated$;

    // DEBUG: Log all permission states
    console.log('📋 Setting up permission logging...');

    this.isAuthenticated$.pipe(takeUntil(this.destroy$)).subscribe(isAuth => {
      console.log('🔐 Is authenticated:', isAuth);
    });

    this.canExportOwnData$.pipe(takeUntil(this.destroy$)).subscribe(canExport => {
      console.log('📤 Can export own data:', canExport);
    });

    this.canEditOwnApplications$.pipe(takeUntil(this.destroy$)).subscribe(canEdit => {
      console.log('✏️ Can edit own applications:', canEdit);
    });

    this.canDeleteOwnApplications$.pipe(takeUntil(this.destroy$)).subscribe(canDelete => {
      console.log('🗑️ Can delete own applications:', canDelete);
    });

    // Log current user
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      console.log('👤 Current user:', user?.email || 'No user');
    });
  }

  ngOnInit() {
    console.log('📊 Dashboard component initializing...');

    // Signal that component is starting to load
    this.loadingService.setComponentLoading(true);

    // Get applications for the current user with real-time updates
    this.applications$ = this.authService.user$.pipe(
      delay(50), // Small delay to ensure smooth transition from app loading
      switchMap(user => {
        if (user) {
          console.log('📊 Loading applications for user:', user.uid);
          return this.jobService.getApplicationsByUser(user.uid);
        }
        console.log('📊 No user logged in, returning empty array');
        return [];
      }),
      tap((applications) => {
        // Update timestamp and store data when it changes
        this.lastUpdated = new Date();
        this.currentApplications = applications;
        console.log('📊 Dashboard data loaded:', applications.length, 'applications');
        console.log('📊 Applications:', applications);

        // Signal that component loading is complete
        this.loadingService.setComponentLoading(false);
        // Also stop refresh loading if it was active
        this.refreshLoading$.next(false);
      }),
      finalize(() => {
        // Ensure loading is turned off even if stream errors
        console.log('📊 Dashboard data loading finalized');
        this.loadingService.setComponentLoading(false);
        this.refreshLoading$.next(false);
      }),
      takeUntil(this.destroy$)
    );

    // Create combined loading state (initial load OR refresh)
    this.loading$ = combineLatest([
      this.applications$.pipe(
        map(() => false),
        startWith(true)
      ),
      this.refreshLoading$
    ]).pipe(
      map(([initialLoading, refreshLoading]) => initialLoading || refreshLoading)
    );

    // Subscribe to applications to trigger the loading
    this.applications$.subscribe();
  }

  ngOnDestroy() {
    console.log('📊 Dashboard component destroying...');
    this.loadingService.setComponentLoading(false);
    this.refreshLoading$.next(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByAppId(index: number, app: JobApplication): string {
    return app.id || index.toString();
  }

  refresh() {
    console.log('🔄 Manual refresh triggered - refetching data from Firestore');

    // Show refresh loading state
    this.refreshLoading$.next(true);

    // Update timestamp
    this.lastUpdated = new Date();

    // Trigger actual data refresh from service
    this.jobService.refreshUserApplications();

    // Note: refreshLoading$ will be set to false when data arrives in the tap operator above
  }

  // Export methods - now with permission awareness
  async exportAsCSV() {
    console.log('📊 Export CSV clicked');
    try {
      // Check permission (though currently all users can export)
      const canExport = await firstValueFrom(this.canExportOwnData$);
      console.log('📊 Can export check:', canExport);

      if (!canExport) {
        this.snackBar.open('Please log in to export data', 'Close', { duration: 3000 });
        return;
      }

      const filename = `job-applications-${new Date().toISOString().split('T')[0]}`;
      this.exportService.exportAsCSV(this.currentApplications, filename);
      this.snackBar.open('Data exported successfully', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      this.snackBar.open('Error exporting data', 'Close', { duration: 3000 });
    }
  }

  async exportAsJSON() {
    console.log('📊 Export JSON clicked');
    try {
      // Check permission (though currently all users can export)
      const canExport = await firstValueFrom(this.canExportOwnData$);
      console.log('📊 Can export check:', canExport);

      if (!canExport) {
        this.snackBar.open('Please log in to export data', 'Close', { duration: 3000 });
        return;
      }

      const filename = `job-applications-${new Date().toISOString().split('T')[0]}`;
      this.exportService.exportAsJSON(this.currentApplications, filename);
      this.snackBar.open('Data exported successfully', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error exporting JSON:', error);
      this.snackBar.open('Error exporting data', 'Close', { duration: 3000 });
    }
  }

  // Method to open job URL
  openJobUrl(url: string) {
    console.log('🔗 Opening job URL:', url);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // COMPLETE EDIT APPLICATION METHOD
  async editApplication(app: JobApplication) {
    console.log('✏️ Edit application clicked:', app);
    console.log('✏️ Application details:', {
      id: app.id,
      jobTitle: app.jobTitle,
      company: app.company,
      userId: app.userId
    });

    try {
      const canEdit = await firstValueFrom(this.permissions.canModifyApplication(app.userId));
      console.log('✏️ Can edit check:', canEdit);
      console.log('✏️ Current user ID:', this.authService.getCurrentUserId());
      console.log('✏️ Application user ID:', app.userId);

      if (!canEdit) {
        this.snackBar.open('You cannot edit this application', 'Close', { duration: 3000 });
        return;
      }

      if (!app.id) {
        console.error('❌ Application ID is missing');
        this.snackBar.open('Error: Application ID not found', 'Close', { duration: 3000 });
        return;
      }

      // Navigate to edit form
      console.log('✏️ Navigating to edit form with application ID:', app.id);
      await this.router.navigate(['/job-form', app.id]);

    } catch (error) {
      console.error('❌ Error navigating to edit:', error);
      this.snackBar.open('Error opening edit form', 'Close', { duration: 3000 });
    }
  }

  // COMPLETE DELETE APPLICATION METHOD
  async deleteApplication(app: JobApplication) {
    console.log('🗑️ Delete application clicked:', app);
    console.log('🗑️ Application details:', {
      id: app.id,
      jobTitle: app.jobTitle,
      company: app.company,
      userId: app.userId
    });

    try {
      const canDelete = await firstValueFrom(this.permissions.canDeleteApplication(app.userId));
      console.log('🗑️ Can delete check:', canDelete);
      console.log('🗑️ Current user ID:', this.authService.getCurrentUserId());
      console.log('🗑️ Application user ID:', app.userId);

      if (!canDelete) {
        this.snackBar.open('You cannot delete this application', 'Close', { duration: 3000 });
        return;
      }

      if (!app.id) {
        console.error('❌ Application ID is missing');
        this.snackBar.open('Error: Application ID not found', 'Close', { duration: 3000 });
        return;
      }

      // Show Material Dialog confirmation
      const confirmed = await firstValueFrom(
        this.confirmationDialog.confirmApplicationDelete(app.jobTitle, app.company)
      );

      if (confirmed) {
        console.log('🗑️ User confirmed deletion, proceeding...');

        try {
          // Show loading state
          this.refreshLoading$.next(true);

          // Delete the application
          await this.jobService.deleteApplication(app.id);

          console.log('✅ Application deleted successfully');
          this.snackBar.open(
            `Application for ${app.jobTitle} at ${app.company} deleted successfully`,
            'Close',
            {
              duration: 4000,
              panelClass: ['success-snackbar']
            }
          );

        } catch (deleteError) {
          console.error('❌ Error deleting application:', deleteError);
          this.snackBar.open(
            'Error deleting application. Please try again.',
            'Close',
            {
              duration: 3000,
              panelClass: ['error-snackbar']
            }
          );
        } finally {
          this.refreshLoading$.next(false);
        }
      } else {
        console.log('🗑️ User cancelled deletion');
      }

    } catch (error) {
      console.error('❌ Error in delete process:', error);
      this.snackBar.open('Error processing delete request', 'Close', { duration: 3000 });
    }
  }

  // Duplicate application method
  async duplicateApplication(app: JobApplication) {
    console.log('📋 Duplicate application clicked:', app);

    try {
      const canEdit = await firstValueFrom(this.permissions.canModifyApplication(app.userId));

      if (!canEdit) {
        this.snackBar.open('You cannot duplicate this application', 'Close', { duration: 3000 });
        return;
      }

      // Navigate to new form with pre-filled data (you can implement this later)
      console.log('📋 TODO: Implement duplicate functionality');
      this.snackBar.open('Duplicate feature coming soon!', 'Close', { duration: 3000 });

    } catch (error) {
      console.error('❌ Error duplicating application:', error);
    }
  }

  // Get summary statistics
  getStatusCounts() {
    const counts = {
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0
    };

    this.currentApplications.forEach(app => {
      counts[app.status as keyof typeof counts]++;
    });

    return counts;
  }

  // Get success rate (offers / total applications)
  getSuccessRate(): number {
    if (this.currentApplications.length === 0) return 0;
    const offers = this.getStatusCounts().offer;
    return Math.round((offers / this.currentApplications.length) * 100);
  }

  // Helper method to check if currently refreshing
  isRefreshing(): Observable<boolean> {
    return this.refreshLoading$.asObservable();
  }
}
