import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobApplicationService, JobApplicationWithUser } from '../../services/job-application.service';
import { AdminService, UserProfile } from '../../services/admin.service';
import { Observable, combineLatest } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';

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
import {MatTooltipModule} from '@angular/material/tooltip';
import {UserManagementComponent} from '../user-management/user-management.component';

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
export class AdminDashboardComponent implements OnInit {
  applications$!: Observable<JobApplicationWithUser[]>;
  users$!: Observable<UserProfile[]>;
  loading$!: Observable<boolean>;
  stats$!: Observable<AdminStats>;

  currentApplications: JobApplicationWithUser[] = [];
  currentUsers: UserProfile[] = [];

  // Define table columns
  displayedColumns: string[] = ['userEmail', 'jobTitle', 'company', 'dateApplied', 'location', 'status', 'salary', 'actions'];

  constructor(
    private jobService: JobApplicationService,
    private adminService: AdminService,
    private exportService: ExportService
  ) {}

  ngOnInit() {
    // Get all applications and users
    this.applications$ = this.jobService.getAllApplications().pipe(
      tap(applications => {
        this.currentApplications = applications;
        console.log('Admin: Loaded applications:', applications.length);
      })
    );

    this.users$ = this.adminService.getAllUsers().pipe(
      tap(users => {
        this.currentUsers = users;
        console.log('Admin: Loaded users:', users.length);
      })
    );

    // Create loading state
    this.loading$ = combineLatest([this.applications$, this.users$]).pipe(
      map(() => false),
      startWith(true)
    );

    // Calculate statistics
    this.stats$ = combineLatest([this.applications$, this.users$]).pipe(
      map(([applications, users]) => this.calculateStats(applications, users))
    );
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

  getStatusClass(status: string): string {
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

  getUserEmail(userId: string): string {
    const user = this.currentUsers.find(u => u.uid === userId);
    return user?.email || 'Unknown User';
  }

  trackByAppId(index: number, app: JobApplicationWithUser): string {
    return app.id || index.toString();
  }

  // Export all applications (admin function)
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
