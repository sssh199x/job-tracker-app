// src/app/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { JobApplicationService, JobApplication } from '../services/job-application.service';
import { AuthService } from '../services/auth.service';
import { ExportService } from '../services/export.service';
import { LoadingService } from '../services/loading.service';
import { Observable, switchMap, Subject } from 'rxjs';
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

  private destroy$ = new Subject<void>();

  // Define table columns
  displayedColumns: string[] = ['jobTitle', 'company', 'dateApplied', 'location', 'status', 'salary', 'actions'];

  constructor(
    private jobService: JobApplicationService,
    private authService: AuthService,
    private exportService: ExportService,
    private loadingService: LoadingService
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
      }),
      finalize(() => {
        // Ensure loading is turned off even if stream errors
        console.log('📊 Dashboard data loading finalized');
        this.loadingService.setComponentLoading(false);
      }),
      takeUntil(this.destroy$)
    );

    // Create component-level loading state for UI
    this.loading$ = this.applications$.pipe(
      map(() => false),
      startWith(true)
    );

    // Subscribe to applications to trigger the loading
    this.applications$.subscribe();
  }

  ngOnDestroy() {
    console.log('📊 Dashboard component destroying...');
    this.loadingService.setComponentLoading(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStatusClass(status: string): string {
    console.log(`status-${status}`,status);
    return `status-${status}`;
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'applied': return 'primary';
      case 'interview': return 'accent';
      case 'offer': return '';
      case 'rejected': return 'warn';
      default: return '';
    }
  }

  formatDate(date: any): Date {
    if (date?.toDate) {
      return date.toDate();
    }
    return new Date(date);
  }

  trackByAppId(index: number, app: JobApplication): string {
    return app.id || index.toString();
  }

  // Method to refresh data manually
  refresh() {
    this.lastUpdated = new Date();
    console.log('🔄 Manual refresh triggered');
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
}
