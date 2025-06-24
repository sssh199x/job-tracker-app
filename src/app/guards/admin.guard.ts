import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { AuthService } from '../services/auth.service';
import { map, switchMap, take, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const adminGuard = () => {
  const permissionService = inject(PermissionService);
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🛡️ Admin guard activated (using PermissionService)');

  return authService.user$.pipe(
    take(1), // Important: Only take the first emission to prevent loops
    switchMap(user => {
      console.log('🛡️ Guard checking user:', user?.uid || 'No user');

      if (!user) {
        console.log('🛡️ No user, redirecting to login');
        router.navigate(['/login']);
        return of(false);
      }

      console.log('🛡️ User found, checking admin permissions...');
      return permissionService.isAdmin$.pipe(
        take(1), // Important: Only take the first emission
        map(isAdmin => {
          console.log('🛡️ Admin permission check result:', isAdmin);

          if (isAdmin) {
            console.log('🛡️ User has admin permissions, allowing access');
            return true;
          } else {
            console.log('🛡️ User lacks admin permissions, redirecting to dashboard');
            router.navigate(['/dashboard']);
            return false;
          }
        }),
        catchError(error => {
          console.error('🛡️ Error in admin permission check:', error);
          router.navigate(['/dashboard']);
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
