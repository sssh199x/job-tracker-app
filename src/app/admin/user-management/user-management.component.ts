import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, UserProfile } from '../../services/admin.service';
import { StatusService } from '../../core/services/status.service';
import { DateUtilService } from '../../core/services/date-util.service';
import { PermissionService } from '../../services/permission.service';
import { Observable, combineLatest, BehaviorSubject, Subject } from 'rxjs';
import { map, startWith, tap, debounceTime, takeUntil, switchMap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';  // ADD THIS - Modern RxJS way
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
import { MatDialogModule} from '@angular/material/dialog';

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
export class UserManagementComponent implements OnInit, OnDestroy {
  users$!: Observable<UserProfile[]>;
  filteredUsers$!: Observable<UserProfile[]>;
  stats$!: Observable<UserStats>;
  loading$!: Observable<boolean>;

  currentUsers: UserProfile[] = [];

  // Permission observables - initialized in constructor
  canManageUsers$!: Observable<boolean>;
  canToggleUserStatus$!: Observable<boolean>;
  canAssignAdminRole$!: Observable<boolean>;

  // Reactive filter management with BehaviorSubjects
  private searchQuery$ = new BehaviorSubject<string>('');
  private statusFilter$ = new BehaviorSubject<string>('all');
  private roleFilter$ = new BehaviorSubject<string>('all');
  private destroy$ = new Subject<void>();

  // ADD: Subject to trigger user refresh
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);

  // Filter properties for template binding
  searchQuery: string = '';
  statusFilter: string = 'all'; // 'all', 'active', 'inactive'
  roleFilter: string = 'all'; // 'all', 'admin', 'user'

  // Table columns
  displayedColumns: string[] = ['email', 'status', 'role', 'createdAt', 'lastLoginAt', 'actions'];

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private permissions: PermissionService,
    public statusService: StatusService,
    public dateUtil: DateUtilService,
  ) {
    // Initialize permission observables in constructor
    this.canManageUsers$ = this.permissions.canManageUsers$;
    this.canToggleUserStatus$ = this.permissions.canToggleUserStatus$;
    this.canAssignAdminRole$ = this.permissions.canAssignAdminRole$;
  }

  ngOnInit() {
    console.log('👥 UserManagement component initialized');

    // FIXED: Use switchMap with refresh trigger to reload users
    this.users$ = this.refreshTrigger$.pipe(
      switchMap(() => this.adminService.getAllUsers()),
      tap(users => {
        this.currentUsers = users;
        console.log('👥 Loaded users:', users.length);
      }),
      takeUntil(this.destroy$)
    );

    // Proper reactive filter management
    this.filteredUsers$ = combineLatest([
      this.users$,
      this.searchQuery$.pipe(debounceTime(300)), // Debounce search input
      this.statusFilter$,
      this.roleFilter$
    ]).pipe(
      map(([users, search, status, role]) => this.applyFilters(users, search, status, role)),
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private calculateUserStats(users: UserProfile[]): UserStats {
    const activeUsers = users.filter(user => user.isActive).length;
    const adminUsers = users.filter(user => user.isAdmin).length;

    const newUsersThisWeek = users.filter(user => {
      if (!user.createdAt) return false;
      return this.dateUtil.isWithinLastDays(user.createdAt, 7);
    }).length;

    return {
      totalUsers: users.length,
      activeUsers,
      adminUsers,
      newUsersThisWeek
    };
  }

  private applyFilters(users: UserProfile[], search: string, status: string, role: string): UserProfile[] {
    return users.filter(user => {
      // Search filter
      const matchesSearch = !search ||
        user.email.toLowerCase().includes(search.toLowerCase());

      // Status filter
      const matchesStatus = status === 'all' ||
        (status === 'active' && user.isActive) ||
        (status === 'inactive' && !user.isActive);

      // Role filter
      const matchesRole = role === 'all' ||
        (role === 'admin' && user.isAdmin) ||
        (role === 'user' && !user.isAdmin);

      return matchesSearch && matchesStatus && matchesRole;
    });
  }

  // Reactive filter methods
  onSearchChange() {
    this.searchQuery$.next(this.searchQuery);
  }

  onStatusFilterChange() {
    this.statusFilter$.next(this.statusFilter);
  }

  onRoleFilterChange() {
    this.roleFilter$.next(this.roleFilter);
  }

  // User action methods with permission checks
  async toggleUserStatus(user: UserProfile) {
    try {
      // FIXED: Use firstValueFrom instead of toPromise()
      const hasPermission = await firstValueFrom(this.canToggleUserStatus$);

      if (!hasPermission) {
        this.snackBar.open(
          'You do not have permission to change user status',
          'Close',
          { duration: 3000 }
        );
        return;
      }

      const newStatus = !user.isActive;
      const action = newStatus ? 'activate' : 'deactivate';

      await this.adminService.toggleUserStatus(user.uid, newStatus);

      this.snackBar.open(
        `User ${user.email} has been ${action}d successfully`,
        'Close',
        { duration: 3000 }
      );

      // FIXED: Trigger refresh properly
      this.refreshUserList();

    } catch (error) {
      console.error('Error toggling user status:', error);
      this.snackBar.open(
        'Failed to update user status. Please try again.',
        'Close',
        { duration: 5000 }
      );
    }
  }

  async toggleAdminStatus(user: UserProfile) {
    try {
      // FIXED: Use firstValueFrom instead of toPromise()
      const hasPermission = await firstValueFrom(this.canAssignAdminRole$);

      if (!hasPermission) {
        this.snackBar.open(
          'You do not have permission to change admin roles',
          'Close',
          { duration: 3000 }
        );
        return;
      }

      const newAdminStatus = !user.isAdmin;
      const action = newAdminStatus ? 'grant admin access to' : 'remove admin access from';

      await this.adminService.toggleAdminStatus(user.uid, newAdminStatus);

      this.snackBar.open(
        `Successfully ${action} ${user.email}`,
        'Close',
        { duration: 3000 }
      );

      // FIXED: Trigger refresh properly
      this.refreshUserList();

    } catch (error) {
      console.error('Error toggling admin status:', error);
      this.snackBar.open(
        'Failed to update admin status. Please try again.',
        'Close',
        { duration: 5000 }
      );
    }
  }

  private refreshUserList() {
    // FIXED: Trigger refresh by emitting on the subject
    console.log('👥 Refreshing user list...');
    this.refreshTrigger$.next();
  }

  trackByUserId(index: number, user: UserProfile): string {
    return user.uid;
  }

  // Clear all filters
  clearFilters() {
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.roleFilter = 'all';

    // Update reactive streams
    this.searchQuery$.next('');
    this.statusFilter$.next('all');
    this.roleFilter$.next('all');
  }
}
