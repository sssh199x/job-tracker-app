import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AdminService } from './admin.service';
import { AuthService } from './auth.service';

/**
 * Simple permission service for cleaner code organization
 * Centralizes all permission checks in one place
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  // Core permission checks
  isAuthenticated$: Observable<boolean>;
  isAdmin$: Observable<boolean>;

  // Feature permissions (all based on isAdmin for now)
  canViewAllApplications$: Observable<boolean>;
  canExportData$: Observable<boolean>;
  canManageUsers$: Observable<boolean>;
  canToggleUserStatus$: Observable<boolean>;
  canAssignAdminRole$: Observable<boolean>;
  canViewUserManagement$: Observable<boolean>;

  constructor(
    private adminService: AdminService,
    private authService: AuthService
  ) {
    console.log('🔐 PermissionService initialized');

    // Basic authentication check
    this.isAuthenticated$ = this.authService.user$.pipe(
      map(user => !!user),
      shareReplay(1)
    );

    // Admin check - using your existing service
    this.isAdmin$ = this.adminService.isCurrentUserAdmin().pipe(
      shareReplay(1)
    );

    // Feature permissions - for now all tied to isAdmin
    // This makes it super easy to change individual permissions later
    this.canViewAllApplications$ = this.isAdmin$;
    this.canExportData$ = this.isAdmin$;
    this.canManageUsers$ = this.isAdmin$;
    this.canToggleUserStatus$ = this.isAdmin$;
    this.canAssignAdminRole$ = this.isAdmin$;
    this.canViewUserManagement$ = this.isAdmin$;
  }

  /**
   * Check if current user owns a resource
   */
  isResourceOwner(resourceUserId: string): Observable<boolean> {
    return this.authService.user$.pipe(
      map(user => user?.uid === resourceUserId)
    );
  }

  /**
   * Check if user can modify an application
   * For future use when you add edit/delete features
   */
  canModifyApplication(applicationUserId: string): Observable<boolean> {
    return this.authService.user$.pipe(
      map(user => {
        if (!user) return false;

        // User can modify their own applications
        return user.uid === applicationUserId;
      })
    );
  }

  /**
   * Check if user can delete an application
   * Admins can delete any, users can delete their own
   */
  canDeleteApplication(applicationUserId: string): Observable<boolean> {
    return this.authService.user$.pipe(
      map(user => {
        if (!user) return false;

        // Check if user owns the application
        if (user.uid === applicationUserId) return true;

        // Otherwise, check admin status
        return false; // Will check admin status below
      }),
      shareReplay(1)
    );

    // For admin check, we'd combine with isAdmin$
    // But keeping it simple for now
  }

  /**
   * Get current user's role as a string
   */
  getUserRole(): Observable<string> {
    return this.isAdmin$.pipe(
      map(isAdmin => isAdmin ? 'Administrator' : 'User')
    );
  }

  /**
   * Get all permissions state at once
   * Useful for debugging or complex UI logic
   */
  getAllPermissions() {
    return {
      isAuthenticated: this.isAuthenticated$,
      isAdmin: this.isAdmin$,
      canExportData: this.canExportData$,
      canManageUsers: this.canManageUsers$,
      canToggleUserStatus: this.canToggleUserStatus$,
      canAssignAdminRole: this.canAssignAdminRole$
    };
  }

  /**
   * Refresh permissions (delegates to AdminService)
   */
  refreshPermissions(): void {
    console.log('🔄 Refreshing permissions');
    this.adminService.refreshAdminStatus();
  }
}
