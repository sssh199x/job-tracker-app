import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { JobApplicationService, JobApplication } from '../services/job-application.service';
import { AuthService } from '../services/auth.service';
import { ExportService } from '../services/export.service';
import { LoadingService } from '../services/loading.service';
import { StatusService } from '../core/services/status.service';
import { DateUtilService } from '../core/services/date-util.service';
import { Observable, switchMap, Subject, BehaviorSubject, combineLatest } from 'rxjs';
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
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatTooltipModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  applications$!: Observable<JobApplication[]>;
  loading$!: Observable<boolean>;
  lastUpdated: Date = new Date();
  currentApplications: JobApplication[] = [];

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
    public statusService: StatusService,
    public dateUtil: DateUtilService
  ) {}

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
        return [];
      }),
      tap((applications) => {
        // Update timestamp and store data when it changes
        this.lastUpdated = new Date();
        this.currentApplications = applications;
        console.log('📊 Dashboard data loaded:', applications.length, 'applications');

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

  // Export methods
  exportAsCSV() {
    const filename = `job-applications-${new Date().toISOString().split('T')[0]}`;
    this.exportService.exportAsCSV(this.currentApplications, filename);
  }

  exportAsJSON() {
    const filename = `job-applications-${new Date().toISOString().split('T')[0]}`;
    this.exportService.exportAsJSON(this.currentApplications, filename);
  }

  // Method to open job URL
  openJobUrl(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
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

  // Helper method to check if currently refreshing
  isRefreshing(): Observable<boolean> {
    return this.refreshLoading$.asObservable();
  }
}
