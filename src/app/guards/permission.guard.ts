import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { AuthService } from '../services/auth.service';
import { map, switchMap, take, catchError } from 'rxjs/operators';
import { of, Observable } from 'rxjs';

/**
 * Flexible permission guard that can check any permission from PermissionService
 * Usage examples:
 * - permissionGuard('isAdmin')
 * - permissionGuard('canManageUsers')
 * - permissionGuard('canExportData')
 */
export const permissionGuard = (permissionName: keyof PermissionService, redirectPath: string = '/dashboard') => {
  return () => {
    const permissionService = inject(PermissionService);
    const authService = inject(AuthService);
    const router = inject(Router);

    console.log(`🛡️ Permission guard activated for: ${permissionName}`);

    return authService.user$.pipe(
      take(1), // Important: Only take the first emission to prevent loops
      switchMap(user => {
        console.log('🛡️ Guard checking user:', user?.uid || 'No user');

        if (!user) {
          console.log('🛡️ No user, redirecting to login');
          router.navigate(['/login']);
          return of(false);
        }

        console.log(`🛡️ User found, checking permission: ${permissionName}...`);

        // Get the permission observable from the service
        const permission$ = permissionService[permissionName] as Observable<boolean>;

        if (!permission$) {
          console.error(`🛡️ Permission '${permissionName}' not found in PermissionService`);
          router.navigate([redirectPath]);
          return of(false);
        }

        return permission$.pipe(
          take(1), // Important: Only take the first emission
          map(hasPermission => {
            console.log(`🛡️ Permission '${permissionName}' check result:`, hasPermission);

            if (hasPermission) {
              console.log(`🛡️ User has '${permissionName}' permission, allowing access`);
              return true;
            } else {
              console.log(`🛡️ User lacks '${permissionName}' permission, redirecting to ${redirectPath}`);
              router.navigate([redirectPath]);
              return false;
            }
          }),
          catchError(error => {
            console.error(`🛡️ Error in '${permissionName}' permission check:`, error);
            router.navigate([redirectPath]);
            return of(false);
          })
        );
      }),
      catchError(error => {
        console.error('🛡️ Error in auth check:', error);
        router.navigate(['/login']);
        return of(false);
      })
    );
  };
};

// Convenience guards for common permissions
export const adminPermissionGuard = () => permissionGuard('isAdmin$')();
export const userManagementGuard = () => permissionGuard('canManageUsers$')();
export const exportDataGuard = () => permissionGuard('canExportData$')();
