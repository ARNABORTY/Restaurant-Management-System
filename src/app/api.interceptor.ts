import { HttpInterceptorFn } from '@angular/common/http';

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return next(request.clone({
    withCredentials: true,
    setHeaders: {
      'X-Request-Id': requestId,
      'X-Client-Version': 'resident-console/1.0',
    },
  }));
};
