import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  console.log('🛡️ Auth guard activated (using PermissionService)');

  return permissionService.isAuthenticated$.pipe(
    take(1), // Prevent multiple emissions
    map(isAuthenticated => {
      console.log('🛡️ Authentication check result:', isAuthenticated);

      if (isAuthenticated) {
        console.log('🛡️ User is authenticated, allowing access');
        return true; // User is authenticated
      } else {
        console.log('🛡️ User is not authenticated, redirecting to login');
        router.navigate(['/login']);
        return false; // User is not authenticated
      }
    })
  );
};
