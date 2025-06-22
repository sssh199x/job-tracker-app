import { inject } from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

export const alreadyAuthGuard:CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    map(user => {
      if (user) {
        // User is already logged in, redirect to dashboard
        router.navigate(['/dashboard']);
        return false;
      } else {
        // User is not logged in, allow access to log in/register
        return true;
      }
    })
  );
};
