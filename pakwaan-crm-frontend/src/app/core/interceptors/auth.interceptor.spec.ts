import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthResponse } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'getAccessToken',
      'refresh',
      'forceLogoutToLogin'
    ]);
    auth.getAccessToken.and.returnValue('access-token');
    auth.refresh.and.returnValue(of({
      accessToken: 'refreshed-token',
      accessTokenExpiresAt: '2026-07-14T17:00:00Z',
      user: {
        id: 1,
        username: 'client',
        displayName: 'Client',
        role: 'Staff',
        isActive: true
      }
    } satisfies AuthResponse));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('attaches the access token to logout', () => {
    http.post('/api/auth/logout', {}).subscribe();

    const request = httpTesting.expectOne('/api/auth/logout');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush({});
  });

  for (const endpoint of ['/api/auth/login', '/api/auth/refresh']) {
    it(`does not attach the access token to ${endpoint}`, () => {
      http.post(endpoint, {}).subscribe();

      const request = httpTesting.expectOne(endpoint);
      expect(request.request.headers.has('Authorization')).toBeFalse();
      request.flush({});
    });
  }

  it('does not refresh when logout itself returns 401', () => {
    http.post('/api/auth/logout', {}).subscribe({ error: () => undefined });

    httpTesting.expectOne('/api/auth/logout').flush(
      { error: 'Unauthorized.' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(auth.refresh).not.toHaveBeenCalled();
  });
});
