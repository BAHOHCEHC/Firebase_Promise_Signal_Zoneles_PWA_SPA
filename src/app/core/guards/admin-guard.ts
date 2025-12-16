import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminToken } from '../services/admin-token';

export const adminGuard: CanActivateFn = (route, state) => {
  const adminToken = inject(AdminToken);
  const router = inject(Router);

  if (!adminToken.hasToken()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
