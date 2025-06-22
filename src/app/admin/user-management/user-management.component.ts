import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, UserProfile } from '../../services/admin.service';
import { Observable, combineLatest } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

// Material imports
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  newUsersThisWeek: number;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
  users$!: Observable<UserProfile[]>;
  filteredUsers$!: Observable<UserProfile[]>;
  stats$!: Observable<UserStats>;
  loading$!: Observable<boolean>;

  currentUsers: UserProfile[] = [];

  // Filter properties
  searchQuery: string = '';
  statusFilter: string = 'all'; // 'all', 'active', 'inactive'
  roleFilter: string = 'all'; // 'all', 'admin', 'user'

  // Table columns
  displayedColumns: string[] = ['email', 'status', 'role', 'createdAt', 'lastLoginAt', 'actions'];

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    console.log('👥 UserManagement component initialized');

    // Load all users
    this.users$ = this.adminService.getAllUsers().pipe(
      tap(users => {
        this.currentUsers = users;
        console.log('👥 Loaded users:', users.length);
      })
    );

    // Apply filters to users
    this.filteredUsers$ = combineLatest([
      this.users$,
      // We'll update filters through method calls
    ]).pipe(
      map(([users]) => this.applyFilters(users)),
      startWith([])
    );

    // Create loading state
    this.loading$ = this.users$.pipe(
      map(() => false),
      startWith(true)
    );

    // Calculate user statistics
    this.stats$ = this.users$.pipe(
      map(users => this.calculateUserStats(users))
    );
  }

  private calculateUserStats(users: UserProfile[]): UserStats {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeUsers = users.filter(user => user.isActive).length;
    const adminUsers = users.filter(user => user.isAdmin).length;

    const newUsersThisWeek = users.filter(user => {
      if (!user.createdAt) return false;

      try {
        // Type-safe date conversion
        let userCreatedDate: Date;

        if (user.createdAt instanceof Date) {
          userCreatedDate = user.createdAt;
        } else {
          // Handle any remaining edge cases
          userCreatedDate = new Date(user.createdAt as any);
        }

        return userCreatedDate >= oneWeekAgo;
      } catch (error) {
        console.error('Error comparing user creation date:', error);
        return false;
      }
    }).length;

    return {
      totalUsers: users.length,
      activeUsers,
      adminUsers,
      newUsersThisWeek
    };
  }

  private applyFilters(users: UserProfile[]): UserProfile[] {
    return users.filter(user => {
      // Search filter
      const matchesSearch = !this.searchQuery ||
        user.email.toLowerCase().includes(this.searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && user.isActive) ||
        (this.statusFilter === 'inactive' && !user.isActive);

      // Role filter
      const matchesRole = this.roleFilter === 'all' ||
        (this.roleFilter === 'admin' && user.isAdmin) ||
        (this.roleFilter === 'user' && !user.isAdmin);

      return matchesSearch && matchesStatus && matchesRole;
    });
  }

  // Update filters and refresh the filtered list
  onSearchChange() {
    this.refreshFilters();
  }

  onStatusFilterChange() {
    this.refreshFilters();
  }

  onRoleFilterChange() {
    this.refreshFilters();
  }

  private refreshFilters() {
    // Trigger filter update by re-subscribing
    this.filteredUsers$ = this.users$.pipe(
      map(users => this.applyFilters(users))
    );
  }

  // User action methods
  async toggleUserStatus(user: UserProfile) {
    const newStatus = !user.isActive;
    const action = newStatus ? 'activate' : 'deactivate';

    try {
      await this.adminService.toggleUserStatus(user.uid, newStatus);

      this.snackBar.open(
        `User ${user.email} has been ${action}d successfully`,
        'Close',
        { duration: 3000 }
      );

      // Refresh the user list
      this.refreshUserList();

    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      this.snackBar.open(
        `Failed to ${action} user. Please try again.`,
        'Close',
        { duration: 5000 }
      );
    }
  }

  async toggleAdminStatus(user: UserProfile) {
    const newAdminStatus = !user.isAdmin;
    const action = newAdminStatus ? 'grant admin access to' : 'remove admin access from';

    try {
      await this.adminService.toggleAdminStatus(user.uid, newAdminStatus);

      this.snackBar.open(
        `Successfully ${action} ${user.email}`,
        'Close',
        { duration: 3000 }
      );

      // Refresh the user list
      this.refreshUserList();

    } catch (error) {
      console.error('Error toggling admin status:', error);
      this.snackBar.open(
        `Failed to update admin status. Please try again.`,
        'Close',
        { duration: 5000 }
      );
    }
  }

  private refreshUserList() {
    // Force refresh of users list
    this.users$ = this.adminService.getAllUsers().pipe(
      tap(users => {
        this.currentUsers = users;
        console.log('👥 Refreshed users:', users.length);
      })
    );

    // Refresh filtered list
    this.refreshFilters();
  }

  // Utility methods
  getStatusClass(isActive: boolean): string {
    return isActive ? 'active' : 'inactive';
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? 'primary' : 'warn';
  }

  getRoleClass(isAdmin: boolean): string {
    return isAdmin ? 'admin' : 'user';
  }

  getRoleColor(isAdmin: boolean): string {
    return isAdmin ? 'accent' : '';
  }

  formatDate(date: any): string {
    if (!date) return 'Never';

    try {
      let jsDate: Date;

      // Handle different date formats
      if (date && typeof date.toDate === 'function') {
        // Firestore Timestamp
        jsDate = date.toDate();
      } else if (date instanceof Date) {
        // Already a Date object
        jsDate = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        // String or number timestamp
        jsDate = new Date(date);
      } else if (date.seconds) {
        // Firestore Timestamp-like object
        jsDate = new Date(date.seconds * 1000);
      } else {
        // Try to convert whatever it is
        jsDate = new Date(date);
      }

      // Validate the date
      if (isNaN(jsDate.getTime())) {
        console.warn('Invalid date encountered:', date);
        return 'Invalid Date';
      }

      // Format the date nicely
      return jsDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

    } catch (error) {
      console.error('Date formatting error:', error, 'Original value:', date);
      return 'Format Error';
    }
  }

  trackByUserId(index: number, user: UserProfile): string {
    return user.uid;
  }

  // Clear all filters
  clearFilters() {
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.roleFilter = 'all';
    this.refreshFilters();
  }
}
