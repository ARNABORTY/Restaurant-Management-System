import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rms_authenticated')) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
