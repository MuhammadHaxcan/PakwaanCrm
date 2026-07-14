import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, NoopAnimationsModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } }
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj<Router>('Router', ['navigateByUrl'])
        },
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('shows the server retry time for a rate-limited login', () => {
    auth.login.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 429,
      headers: new HttpHeaders({ 'Retry-After': '47' })
    })));

    component.form.setValue({ username: 'client', password: 'secret' });
    component.submit();

    expect(component.errorMessage).toBe(
      'Too many sign-in attempts. Please try again after 47 seconds.'
    );
    expect(toast.error).toHaveBeenCalledWith(component.errorMessage!);
  });

  it('uses 60 seconds when Retry-After is missing or invalid', () => {
    auth.login.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 429,
      headers: new HttpHeaders({ 'Retry-After': 'invalid' })
    })));

    component.form.setValue({ username: 'client', password: 'secret' });
    component.submit();

    expect(component.errorMessage).toBe(
      'Too many sign-in attempts. Please try again after 60 seconds.'
    );
  });
});
