import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RoleService } from './role.service';

export const adminGuard: CanActivateFn = () => {
  const role = inject(RoleService);
  const router = inject(Router);

  if (role.isAdmin) {
    return true;
  }
  router.navigate(['/']);
  return false;
};
