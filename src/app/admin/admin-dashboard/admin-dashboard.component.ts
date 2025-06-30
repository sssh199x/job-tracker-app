import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { JobApplicationService, JobApplicationWithUser } from '../../services/job-application.service';
import { AdminService, UserProfile } from '../../services/admin.service';
import { LoadingService } from '../../services/loading.service';
import { StatusService } from '../../core/services/status.service';
import { DateUtilService } from '../../core/services/date-util.service';
import { PermissionService } from '../../services/permission.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';
import { Observable, combineLatest, Subject, BehaviorSubject } from 'rxjs';
import { map, startWith, tap, takeUntil, finalize, delay } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

// Material imports
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { ExportService } from '../../services/export.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserManagementComponent } from '../user-management/user-management.component';
import {ApplicationDetailsService} from '../../services/application-details.service';

interface AdminStats {
  totalApplications: number;
  totalUsers: number;
  applicationsByStatus: { [key: string]: number };
  recentApplications: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDividerModule,
    MatTabsModule,
    MatTooltipModule,
    MatSnackBarModule,
    UserManagementComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  applications$!: Observable<JobApplicationWithUser[]>;
  users$!: Observable<UserProfile[]>;
  loading$!: Observable<boolean>;
  stats$!: Observable<AdminStats>;

  currentApplications: JobApplicationWithUser[] = [];
  currentUsers: UserProfile[] = [];

  // Permission observables - initialized after constructor
  canExportData$!: Observable<boolean>;
  canViewAllApplications$!: Observable<boolean>;
  canManageUsers$!: Observable<boolean>;
  canEditApplications$!: Observable<boolean>;
  canDeleteApplications$!: Observable<boolean>;

  private userLookupMap = new Map<string, string>();

  //Add refresh loading state for admin operations
  private refreshLoading$ = new BehaviorSubject<boolean>(false);

  private destroy$ = new Subject<void>();

  // Define table columns - Updated to include actions
  displayedColumns: string[] = ['userEmail', 'jobTitle', 'company', 'dateApplied', 'location', 'status', 'salary', 'actions'];

  constructor(
    private jobService: JobApplicationService,
    private adminService: AdminService,
    private exportService: ExportService,
    private loadingService: LoadingService,
    private permissions: PermissionService,
    private router: Router,
    private confirmationDialog: ConfirmationDialogService,
    private applicationDetails: ApplicationDetailsService,
    private snackBar: MatSnackBar,
    public statusService: StatusService,
    public dateUtil: DateUtilService
  ) {
    // Initialize permission observables in constructor
    this.canExportData$ = this.permissions.canExportData$;
    this.canViewAllApplications$ = this.permissions.canViewAllApplications$;
    this.canManageUsers$ = this.permissions.canViewUserManagement$;

    //Admin can edit/delete any application
    this.canEditApplications$ = this.permissions.isAdmin$;
    this.canDeleteApplications$ = this.permissions.isAdmin$;
  }

  ngOnInit() {
    console.log('🔧 Admin dashboard component initializing...');

    // Signal that component is starting to load
    this.loadingService.setComponentLoading(true);

    // Get all applications and users with small delay for smooth transition
    this.applications$ = this.jobService.getAllApplications().pipe(
      delay(50), // Small delay to ensure smooth transition from app loading
      tap(applications => {
        this.currentApplications = applications;
        console.log('🔧 Admin: Applications loaded:', applications.length);
        // Stop refresh loading when data arrives
        this.refreshLoading$.next(false);
      }),
      takeUntil(this.destroy$)
    );

    this.users$ = this.adminService.getAllUsers().pipe(
      delay(50), // Small delay to ensure smooth transition from app loading
      tap(users => {
        this.currentUsers = users;
        // Build user lookup map for performance
        this.buildUserLookupMap(users);
        console.log('🔧 Admin: Users loaded:', users.length);
      }),
      takeUntil(this.destroy$)
    );

    //Create combined loading state (initial load OR refresh)
    this.loading$ = combineLatest([
      this.applications$.pipe(
        map(() => false),
        startWith(true)
      ),
      this.users$.pipe(
        map(() => false),
        startWith(true)
      ),
      this.refreshLoading$
    ]).pipe(
      map(([appsLoading, usersLoading, refreshLoading]) => appsLoading || usersLoading || refreshLoading),
      tap((isLoading) => {
        if (!isLoading) {
          console.log('🔧 Admin: All data loaded, turning off component loading');
          this.loadingService.setComponentLoading(false);
        }
      }),
      finalize(() => {
        // Ensure loading is turned off even if stream errors
        console.log('🔧 Admin: Data loading finalized');
        this.loadingService.setComponentLoading(false);
        this.refreshLoading$.next(false);
      })
    );

    // Calculate statistics
    this.stats$ = combineLatest([this.applications$, this.users$]).pipe(
      map(([applications, users]) => this.calculateStats(applications, users))
    );

    // Subscribe to loading to trigger the data fetching
    this.loading$.subscribe();
  }

  ngOnDestroy() {
    console.log('🔧 Admin dashboard component destroying...');
    this.loadingService.setComponentLoading(false);
    this.refreshLoading$.next(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildUserLookupMap(users: UserProfile[]): void {
    this.userLookupMap.clear();
    users.forEach(user => {
      this.userLookupMap.set(user.uid, user.email);
    });
    console.log('🔧 Built user lookup map with', this.userLookupMap.size, 'users');
  }

  private calculateStats(applications: JobApplicationWithUser[], users: UserProfile[]): AdminStats {
    const applicationsByStatus = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const recentApplications = applications.filter(app => {
      return this.dateUtil.isWithinLastDays(app.dateApplied, 7);
    }).length;

    return {
      totalApplications: applications.length,
      totalUsers: users.length,
      applicationsByStatus,
      recentApplications
    };
  }

  getUserEmail(userId: string): string {
    return this.userLookupMap.get(userId) || 'Unknown User';
  }

  trackByAppId(index: number, app: JobApplicationWithUser): string {
    return app.id || index.toString();
  }

  //ADMIN EDIT APPLICATION METHOD
  async editApplication(app: JobApplicationWithUser) {
    console.log('✏️ Admin edit application clicked:', app);

    const userEmail = this.getUserEmail(app.userId);
    console.log('✏️ Application details:', {
      id: app.id,
      jobTitle: app.jobTitle,
      company: app.company,
      userId: app.userId,
      userEmail: userEmail
    });

    try {
      const canEdit = await firstValueFrom(this.canEditApplications$);
      console.log('✏️ Admin can edit check:', canEdit);

      if (!canEdit) {
        this.snackBar.open('You do not have permission to edit applications', 'Close', { duration: 3000 });
        return;
      }

      if (!app.id) {
        console.error('❌ Application ID is missing');
        this.snackBar.open('Error: Application ID not found', 'Close', { duration: 3000 });
        return;
      }

      // Navigate to admin edit route
      console.log('✏️ Admin navigating to edit application:', app.id, 'for user:', userEmail);
      await this.router.navigate(['/admin/edit-application', app.id]);

    } catch (error) {
      console.error('❌ Error navigating to admin edit:', error);
      this.snackBar.open('Error opening edit form', 'Close', { duration: 3000 });
    }
  }

  // ADMIN DELETE APPLICATION METHOD
  async deleteApplication(app: JobApplicationWithUser) {
    console.log('🗑️ Admin delete application clicked:', app);
    console.log('🗑️ Application details:', {
      id: app.id,
      jobTitle: app.jobTitle,
      company: app.company,
      userId: app.userId,
      userEmail: this.getUserEmail(app.userId)
    });

    try {
      const canDelete = await firstValueFrom(this.canDeleteApplications$);
      console.log('🗑️ Admin can delete check:', canDelete);

      if (!canDelete) {
        this.snackBar.open('You do not have permission to delete applications', 'Close', { duration: 3000 });
        return;
      }

      if (!app.id) {
        console.error('❌ Application ID is missing');
        this.snackBar.open('Error: Application ID not found', 'Close', { duration: 3000 });
        return;
      }

      // Show admin-specific confirmation dialog
      const userEmail = this.getUserEmail(app.userId);
      const confirmed = await firstValueFrom(
        this.confirmationDialog.confirm({
          title: 'Delete User Application',
          message: `Are you sure you want to delete this application?\n\n<strong>User:</strong> ${userEmail}\n<strong>Position:</strong> ${app.jobTitle}\n<strong>Company:</strong> ${app.company}\n\nThis action cannot be undone and will permanently remove all application data.`,
          confirmText: 'Delete Application',
          cancelText: 'Cancel',
          type: 'danger',
          icon: 'delete_forever'
        })
      );

      if (confirmed) {
        console.log('🗑️ Admin confirmed deletion, proceeding...');

        try {
          // Show loading state
          this.refreshLoading$.next(true);

          // Delete the application
          await this.jobService.deleteApplication(app.id);

          console.log('✅ Admin successfully deleted application');
          this.snackBar.open(
            `Application for ${app.jobTitle} at ${app.company} (${userEmail}) deleted successfully`,
            'Close',
            {
              duration: 5000,
              panelClass: ['success-snackbar']
            }
          );

          // Trigger refresh of applications data
          this.refreshApplications();

        } catch (deleteError) {
          console.error('❌ Admin error deleting application:', deleteError);
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
        console.log('🗑️ Admin cancelled deletion');
      }

    } catch (error) {
      console.error('❌ Error in admin delete process:', error);
      this.snackBar.open('Error processing delete request', 'Close', { duration: 3000 });
    }
  }

  // Refresh applications data
  private refreshApplications(): void {
    console.log('🔄 Admin refreshing applications data');
    this.jobService.refreshAllApplications();
  }

  // Check if currently refreshing
  isRefreshing(): Observable<boolean> {
    return this.refreshLoading$.asObservable();
  }

  async exportAllAsCSV() {
    try {
      // Double-check permission programmatically
      const canExport = await firstValueFrom(this.canExportData$);
      if (!canExport) {
        console.warn('User does not have export permission');
        return;
      }

      const enhancedData = this.currentApplications.map(app => ({
        ...app,
        userEmail: this.getUserEmail(app.userId), // O(1) lookup!
        dateAppliedFormatted: this.dateUtil.formatDateShort(app.dateApplied)
      }));

      const filename = `all-job-applications-${new Date().toISOString().split('T')[0]}`;
      this.exportService.exportAsCSV(enhancedData, filename);

      this.snackBar.open('Data exported successfully', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      this.snackBar.open('Error exporting data', 'Close', { duration: 3000 });
    }
  }

  async exportAllAsJSON() {
    try {
      // Double-check permission programmatically
      const canExport = await firstValueFrom(this.canExportData$);
      if (!canExport) {
        console.warn('User does not have export permission');
        return;
      }

      const enhancedData = this.currentApplications.map(app => ({
        ...app,
        userEmail: this.getUserEmail(app.userId), // O(1) lookup!
        dateAppliedFormatted: this.dateUtil.formatDateShort(app.dateApplied)
      }));

      const filename = `all-job-applications-${new Date().toISOString().split('T')[0]}`;
      this.exportService.exportAsJSON(enhancedData, filename);

      this.snackBar.open('Data exported successfully', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error exporting JSON:', error);
      this.snackBar.open('Error exporting data', 'Close', { duration: 3000 });
    }
  }

  // Open job URL
  openJobUrl(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * View application details in admin modal with user context
   * @param app - The application to view
   */
  async viewApplicationDetails(app: JobApplicationWithUser) {
    console.log('👁️ Admin view application details clicked:', app);
    console.log('👁️ Application details:', {
      id: app.id,
      jobTitle: app.jobTitle,
      company: app.company,
      userId: app.userId,
      userEmail: this.getUserEmail(app.userId)
    });

    try {
      if (!app.id) {
        console.error('❌ Application ID is missing');
        this.snackBar.open('Error: Application details not available', 'Close', { duration: 3000 });
        return;
      }

      // Get user email for admin context
      const userEmail = this.getUserEmail(app.userId);

      // Open details modal in admin context with user information
      console.log('👁️ Opening admin details modal for application:', app.id, 'user:', userEmail);
      const result$ = await this.applicationDetails.openAdminDetailsModal(app, userEmail);

      // Subscribe to modal close event
      result$.subscribe(result => {
        console.log('👁️ Admin details modal closed, result:', result);
      });

    } catch (error) {
      console.error('❌ Error opening admin application details:', error);
      this.snackBar.open('Error opening application details', 'Close', { duration: 3000 });
    }
  }
}
