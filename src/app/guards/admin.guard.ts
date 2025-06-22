import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export const adminGuard = () => {
  const adminService = inject(AdminService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    switchMap(user => {
      if (!user) {
        router.navigate(['/login']);
        return of(false);
      }

      return adminService.isCurrentUserAdmin().pipe(
        map(isAdmin => {
          if (isAdmin) {
            return true;
          } else {
            router.navigate(['/dashboard']); // Redirect non-admins to regular dashboard
            return false;
          }
        })
      );
    })
  );
};
