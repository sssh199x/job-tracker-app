import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { map, switchMap, take, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const adminGuard = () => {
  const adminService = inject(AdminService);
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🛡️ Admin guard activated');

  return authService.user$.pipe(
    take(1), // Important: Only take the first emission to prevent loops
    switchMap(user => {
      console.log('🛡️ Guard checking user:', user?.uid || 'No user');

      if (!user) {
        console.log('🛡️ No user, redirecting to login');
        router.navigate(['/login']);
        return of(false);
      }

      console.log('🛡️ User found, checking admin status...');
      return adminService.isCurrentUserAdmin().pipe(
        take(1), // Important: Only take the first emission
        map(isAdmin => {
          console.log('🛡️ Admin check result:', isAdmin);

          if (isAdmin) {
            console.log('🛡️ User is admin, allowing access');
            return true;
          } else {
            console.log('🛡️ User is not admin, redirecting to dashboard');
            router.navigate(['/dashboard']);
            return false;
          }
        }),
        catchError(error => {
          console.error('🛡️ Error in admin guard:', error);
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
