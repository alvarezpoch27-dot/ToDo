import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Logger } from '../utils/logger.util';
import { environment } from '../../../environments/environment';

/**
 * Interceptor HTTP para:
 * - Adjuntar token de autenticación Firebase
 * - Manejar errores de autenticación
 * - Log de requests/responses
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private logger = new Logger('AuthInterceptor', environment.debug);

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return from(this.authService.getIdToken()).pipe(
      switchMap((token) => {
        let clonedReq = req;

        if (token) {
          clonedReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          });
          this.logger.debug(`Token adjunto al request: ${req.url}`);
        }

        return next.handle(clonedReq).pipe(
          catchError((error: HttpErrorResponse) => {
            this.logger.error(`Error HTTP ${error.status}: ${error.url}`, error.message);

            if (error.status === 401 || error.status === 403) {
              this.authService.logout().catch(() => {});
            }

            return throwError(() => error);
          })
        );
      })
    );
  }
}
