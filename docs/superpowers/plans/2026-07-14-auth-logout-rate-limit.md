# Authentication Logout and Rate-Limit Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make logout revoke the server refresh token and show an accurate static retry time when login is rate-limited.

**Architecture:** Separate bearer-token omission from automatic-refresh suppression in the Angular interceptor so logout is authorized without creating refresh recursion. Configure ASP.NET Core rate-limiter rejections to emit `Retry-After`, then let the login component translate HTTP 429 into a static, user-facing wait message with a 60-second fallback.

**Tech Stack:** Angular 17, RxJS 7, Jasmine/Karma, ASP.NET Core, `System.Threading.RateLimiting`

## Global Constraints

- The rate-limit message is static; there is no countdown or timer-based button behavior.
- Keep the authentication limit at 12 requests per one-minute window.
- Continue clearing the local frontend session when server logout fails.
- Do not redesign authentication cookies or token storage.

---

### Task 1: Authorize Logout Requests

**Files:**
- Create: `pakwaan-crm-frontend/src/app/core/interceptors/auth.interceptor.spec.ts`
- Modify: `pakwaan-crm-frontend/src/app/core/interceptors/auth.interceptor.ts:10-20`

**Interfaces:**
- Consumes: `AuthService.getAccessToken(): string | null` and the existing functional `authInterceptor`.
- Produces: logout requests with `Authorization: Bearer <token>`; login and refresh requests still omit the header; all three auth endpoints bypass automatic 401 refresh handling.

- [ ] **Step 1: Write failing interceptor tests**

Create `auth.interceptor.spec.ts` with an Angular HTTP testing setup and these cases:

```ts
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
    auth.refresh.and.returnValue(of({} as never));

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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `pakwaan-crm-frontend`:

```powershell
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/core/interceptors/auth.interceptor.spec.ts
```

Expected: the logout authorization assertion fails because logout is currently included in `shouldSkipToken`.

- [ ] **Step 3: Separate token omission from refresh suppression**

Replace the single auth-endpoint predicate with:

```ts
function shouldOmitAccessToken(url: string): boolean {
  return url.includes('/api/auth/login') || url.includes('/api/auth/refresh');
}

function shouldSkipAutomaticRefresh(url: string): boolean {
  return shouldOmitAccessToken(url) || url.includes('/api/auth/logout');
}
```

In the interceptor, calculate both flags, use `omitAccessToken` only when attaching the bearer token, and use `skipAutomaticRefresh` in the 401 `catchError` branch.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the same focused Karma command. Expected: all four interceptor cases pass.

- [ ] **Step 5: Commit the logout fix**

```powershell
git add pakwaan-crm-frontend/src/app/core/interceptors/auth.interceptor.ts pakwaan-crm-frontend/src/app/core/interceptors/auth.interceptor.spec.ts
git commit -m "fix: authorize logout requests"
```

---

### Task 2: Return an Accurate Retry-After Header

**Files:**
- Create: `PakwaanCrm.Backend/src/PakwaanCrm.API/RateLimiting/AuthRateLimitResponse.cs`
- Create: `PakwaanCrm.Backend/tests/PakwaanCrm.API.Tests/PakwaanCrm.API.Tests.csproj`
- Create: `PakwaanCrm.Backend/tests/PakwaanCrm.API.Tests/AuthRateLimitResponseTests.cs`
- Modify: `PakwaanCrm.Backend/src/PakwaanCrm.API/Program.cs:137-151`

**Interfaces:**
- Consumes: `TimeSpan?` retry metadata obtained from `RateLimitLease.TryGetMetadata(MetadataName.RetryAfter, ...)`.
- Produces: `AuthRateLimitResponse.GetRetryAfterSeconds(TimeSpan?): int`, plus HTTP 429 responses with numeric `Retry-After` seconds and a JSON `error` property.

- [ ] **Step 1: Create the backend test project and failing tests**

Create `PakwaanCrm.API.Tests.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.14.1" />
    <PackageReference Include="xunit" Version="2.9.3" />
    <PackageReference Include="xunit.runner.visualstudio" Version="3.1.5">
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="../../src/PakwaanCrm.API/PakwaanCrm.API.csproj" />
  </ItemGroup>
</Project>
```

Create `AuthRateLimitResponseTests.cs`:

```csharp
using PakwaanCrm.API.RateLimiting;

namespace PakwaanCrm.API.Tests;

public class AuthRateLimitResponseTests
{
    [Fact]
    public void GetRetryAfterSeconds_RoundsPartialSecondsUp()
    {
        Assert.Equal(48, AuthRateLimitResponse.GetRetryAfterSeconds(TimeSpan.FromSeconds(47.1)));
    }

    [Fact]
    public void GetRetryAfterSeconds_UsesOneMinuteFallbackWithoutMetadata()
    {
        Assert.Equal(60, AuthRateLimitResponse.GetRetryAfterSeconds(null));
    }

    [Fact]
    public void GetRetryAfterSeconds_NeverReturnsLessThanOne()
    {
        Assert.Equal(1, AuthRateLimitResponse.GetRetryAfterSeconds(TimeSpan.Zero));
    }
}
```

- [ ] **Step 2: Run the backend tests and verify RED**

Run:

```powershell
dotnet test PakwaanCrm.Backend/tests/PakwaanCrm.API.Tests/PakwaanCrm.API.Tests.csproj
```

Expected: compilation fails because `PakwaanCrm.API.RateLimiting.AuthRateLimitResponse` does not exist.

- [ ] **Step 3: Implement retry-delay calculation**

Create `AuthRateLimitResponse.cs`:

```csharp
namespace PakwaanCrm.API.RateLimiting;

public static class AuthRateLimitResponse
{
    public const int FallbackRetryAfterSeconds = 60;

    public static int GetRetryAfterSeconds(TimeSpan? retryAfter)
    {
        return retryAfter.HasValue
            ? Math.Max(1, (int)Math.Ceiling(retryAfter.Value.TotalSeconds))
            : FallbackRetryAfterSeconds;
    }
}
```

- [ ] **Step 4: Run the backend tests and verify GREEN**

Run the same `dotnet test` command. Expected: all three tests pass.

- [ ] **Step 5: Wire the helper into the rejection response**

Add `using PakwaanCrm.API.RateLimiting;` to `Program.cs`. Inside `AddRateLimiter`, after `RejectionStatusCode`, add:

```csharp
options.OnRejected = async (context, cancellationToken) =>
{
    var retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var metadata)
        ? metadata
        : (TimeSpan?)null;
    var retryAfterSeconds = AuthRateLimitResponse.GetRetryAfterSeconds(retryAfter);

    context.HttpContext.Response.Headers["Retry-After"] = retryAfterSeconds.ToString();
    context.HttpContext.Response.ContentType = "application/json";
    await context.HttpContext.Response.WriteAsJsonAsync(
        new { error = $"Too many requests. Please retry after {retryAfterSeconds} seconds." },
        cancellationToken);
};
```

Keep `PermitLimit = 12` and `Window = TimeSpan.FromMinutes(1)` unchanged.

- [ ] **Step 6: Test and compile the backend**

Run:

```powershell
dotnet test PakwaanCrm.Backend/tests/PakwaanCrm.API.Tests/PakwaanCrm.API.Tests.csproj --no-restore
dotnet build PakwaanCrm.Backend/src/PakwaanCrm.API/PakwaanCrm.API.csproj --no-restore
```

Expected: all three tests pass and the API build exits 0 with no compiler errors.

- [ ] **Step 7: Inspect the diff for limiter invariants**

Run:

```powershell
git diff -- PakwaanCrm.Backend/src/PakwaanCrm.API/Program.cs
```

Expected: the diff adds only rejection response handling; the 12-request, one-minute policy remains unchanged.

- [ ] **Step 8: Commit the backend response**

```powershell
git add PakwaanCrm.Backend/src/PakwaanCrm.API/Program.cs PakwaanCrm.Backend/src/PakwaanCrm.API/RateLimiting/AuthRateLimitResponse.cs PakwaanCrm.Backend/tests/PakwaanCrm.API.Tests
git commit -m "fix: expose auth retry delay"
```

---

### Task 3: Display the Retry Time on Login

**Files:**
- Create: `pakwaan-crm-frontend/src/app/features/auth/login.component.spec.ts`
- Modify: `pakwaan-crm-frontend/src/app/features/auth/login.component.ts:187-212`

**Interfaces:**
- Consumes: `HttpErrorResponse.status`, `HttpErrorResponse.headers.get('Retry-After')`.
- Produces: `Too many sign-in attempts. Please try again after N seconds.` with `N >= 1`, defaulting to 60.

- [ ] **Step 1: Write failing login-component tests**

Create a standalone-component TestBed with mocked `AuthService`, `Router`, `ActivatedRoute`, and `ToastService`. Submit a valid form and assert these two cases:

```ts
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
```

Use these imports and providers around the cases:

```ts
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { LoginComponent } from './login.component';
```

Configure `ActivatedRoute` as `{ snapshot: { queryParamMap: { get: () => null } } }`, and create spies for `AuthService.login`, `Router.navigateByUrl`, and `ToastService.error`.

- [ ] **Step 2: Run the focused test and verify RED**

Run from `pakwaan-crm-frontend`:

```powershell
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/features/auth/login.component.spec.ts
```

Expected: both assertions fail because the existing handler returns the generic fallback message.

- [ ] **Step 3: Add rate-limit-specific message handling**

At the beginning of the `HttpErrorResponse` branch in `getLoginErrorMessage`, add:

```ts
if (error.status === 429) {
  const retryAfter = Number(error.headers.get('Retry-After'));
  const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0
    ? Math.ceil(retryAfter)
    : 60;

  return `Too many sign-in attempts. Please try again after ${retryAfterSeconds} seconds.`;
}
```

Keep all existing non-429 error handling unchanged.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the same focused Karma command. Expected: both rate-limit cases pass.

- [ ] **Step 5: Run both new frontend test files**

```powershell
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/core/interceptors/auth.interceptor.spec.ts --include=src/app/features/auth/login.component.spec.ts
```

Expected: six tests pass with zero failures.

- [ ] **Step 6: Commit the login feedback**

```powershell
git add pakwaan-crm-frontend/src/app/features/auth/login.component.ts pakwaan-crm-frontend/src/app/features/auth/login.component.spec.ts
git commit -m "fix: show login retry time"
```

---

### Task 4: Full Verification

**Files:**
- Verify only; no planned production changes.

**Interfaces:**
- Consumes: completed frontend and backend changes from Tasks 1-3.
- Produces: fresh test, build, and diff evidence for handoff.

- [ ] **Step 1: Run the full frontend test suite**

```powershell
cd pakwaan-crm-frontend
npm test -- --watch=false --browsers=ChromeHeadless
```

Expected: all Jasmine/Karma tests pass with zero failures.

- [ ] **Step 2: Build the production frontend**

```powershell
npm run build
```

Expected: Angular production build exits 0.

- [ ] **Step 3: Build the backend**

From the repository root:

```powershell
dotnet test PakwaanCrm.Backend/tests/PakwaanCrm.API.Tests/PakwaanCrm.API.Tests.csproj --no-restore
dotnet build PakwaanCrm.Backend/src/PakwaanCrm.API/PakwaanCrm.API.csproj --no-restore
```

Expected: all backend unit tests pass and the API build succeeds with zero errors.

- [ ] **Step 4: Check scope and formatting**

```powershell
git diff --check HEAD~3..HEAD
git status --short
```

Expected: no whitespace errors; only the user's pre-existing untracked files remain outside the committed work.

- [ ] **Step 5: Review requirements against the design**

Confirm from the final diff that logout carries the bearer token, auth endpoints cannot recursively refresh, 429 includes `Retry-After`, the UI shows a static retry time with a 60-second fallback, and no countdown was added.
