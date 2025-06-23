import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobApplicationService, JobApplicationWithUser } from '../../services/job-application.service';
import { AdminService, UserProfile } from '../../services/admin.service';
import { LoadingService } from '../../services/loading.service';
import { StatusService } from '../../core/services/status.service'; // ✅ NEW IMPORT
import { Observable, combineLatest, Subject } from 'rxjs';
import { map, startWith, tap, takeUntil, finalize, delay } from 'rxjs/operators';

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
import { UserManagementComponent } from '../user-management/user-management.component';

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

  private userLookupMap = new Map<string, string>();

  private destroy$ = new Subject<void>();

  // Define table columns
  displayedColumns: string[] = ['userEmail', 'jobTitle', 'company', 'dateApplied', 'location', 'status', 'salary', 'actions'];

  constructor(
    private jobService: JobApplicationService,
    private adminService: AdminService,
    private exportService: ExportService,
    private loadingService: LoadingService,
    public statusService: StatusService
  ) {}

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

    // Create loading state - signal complete when both data sources are loaded
    this.loading$ = combineLatest([this.applications$, this.users$]).pipe(
      tap(() => {
        console.log('🔧 Admin: All data loaded, turning off component loading');
        // Signal that component loading is complete
        this.loadingService.setComponentLoading(false);
      }),
      map(() => false),
      startWith(true),
      finalize(() => {
        // Ensure loading is turned off even if stream errors
        console.log('🔧 Admin: Data loading finalized');
        this.loadingService.setComponentLoading(false);
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
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const applicationsByStatus = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const recentApplications = applications.filter(app => {
      const appDate = this.formatDate(app.dateApplied);
      return appDate >= sevenDaysAgo;
    }).length;

    return {
      totalApplications: applications.length,
      totalUsers: users.length,
      applicationsByStatus,
      recentApplications
    };
  }

  formatDate(date: any): Date {
    if (date?.toDate) {
      return date.toDate();
    }
    return new Date(date);
  }

  getUserEmail(userId: string): string {
    return this.userLookupMap.get(userId) || 'Unknown User';
  }

  trackByAppId(index: number, app: JobApplicationWithUser): string {
    return app.id || index.toString();
  }

  exportAllAsCSV() {
    const enhancedData = this.currentApplications.map(app => ({
      ...app,
      userEmail: this.getUserEmail(app.userId)
    }));

    const filename = `all-job-applications-${new Date().toISOString().split('T')[0]}`;
    this.exportService.exportAsCSV(enhancedData, filename);
  }

  exportAllAsJSON() {
    const enhancedData = this.currentApplications.map(app => ({
      ...app,
      userEmail: this.getUserEmail(app.userId)
    }));

    const filename = `all-job-applications-${new Date().toISOString().split('T')[0]}`;
    this.exportService.exportAsJSON(enhancedData, filename);
  }

  // Open job URL
  openJobUrl(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
