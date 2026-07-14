# Login Error and Password Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show failed login messages in a global toast and an accessible inline alert, and add a password visibility toggle.

**Architecture:** Move the single `ToastService` renderer from the authenticated shell to `AppComponent`, which exists on every route. Keep login-specific error state and safe response parsing in `LoginComponent`, while preserving the existing authentication and navigation flow.

**Tech Stack:** Angular 17 standalone components, Angular Material, RxJS 7, Jasmine, Karma

## Global Constraints

- Display login failures both in an error toast and a persistent inline alert.
- Prefer non-empty API `error` or `message` strings and fall back to `Unable to sign in. Please check your username and password.`
- Preserve existing authentication, session, routing, toast duration, and toast styling behavior.
- The password visibility control must not submit the form and must expose an accurate accessible label and tooltip.
- Do not modify backend files or unrelated existing workspace changes.

---

## File Map

- Modify `pakwaan-crm-frontend/src/app/app.component.ts`: own the single global toast-to-snackbar subscription.
- Modify `pakwaan-crm-frontend/src/app/app.component.spec.ts`: replace obsolete starter tests with global toast tests.
- Modify `pakwaan-crm-frontend/src/app/layout/shell/shell.component.ts`: remove the shell-only toast renderer.
- Modify `pakwaan-crm-frontend/src/app/features/auth/login.component.ts`: add inline errors, safe message extraction, and password visibility.
- Create `pakwaan-crm-frontend/src/app/features/auth/login.component.spec.ts`: test failed-login and visibility behavior.

### Task 1: Global Toast Host

**Files:**
- Modify: `pakwaan-crm-frontend/src/app/app.component.spec.ts`
- Modify: `pakwaan-crm-frontend/src/app/app.component.ts`
- Modify: `pakwaan-crm-frontend/src/app/layout/shell/shell.component.ts`

**Interfaces:**
- Consumes: `ToastService.toasts$: Observable<Toast>` and `MatSnackBar.open(message, action, config)`.
- Produces: one application-wide toast renderer available on public and authenticated routes.

- [ ] **Step 1: Replace the starter app tests with failing global-toast tests**

Configure `AppComponent` with `provideRouter([])`, a `ToastService`, a `MatSnackBar` spy, and a `BreakpointObserver` spy. Emit an error toast and assert:

```typescript
expect(snackBar.open).toHaveBeenCalledWith(
  'Invalid username or password.',
  '×',
  jasmine.objectContaining({
    duration: 4000,
    panelClass: 'snack-error',
    horizontalPosition: 'right',
    verticalPosition: 'top'
  })
);
```

Use `of({ matches: true, breakpoints: {} })` in a second test and expect `horizontalPosition: 'center'`.

- [ ] **Step 2: Run the app component test and verify RED**

Run:

```powershell
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/app.component.spec.ts
```

Expected: FAIL because `AppComponent` does not open snackbars.

- [ ] **Step 3: Implement the root toast host**

Import `MatSnackBarModule`, inject `ToastService`, `MatSnackBar`, and `BreakpointObserver`, and subscribe in `ngOnInit`. Use `takeUntilDestroyed` with `DestroyRef`. Open each toast with:

```typescript
this.snackBar.open(toast.message, '×', {
  duration: 4000,
  panelClass: toast.type === 'error'
    ? 'snack-error'
    : toast.type === 'success'
      ? 'snack-success'
      : '',
  horizontalPosition: this.isMobile ? 'center' : 'right',
  verticalPosition: 'top'
});
```

Observe `(max-width: 900px)` first and keep the root template as `<router-outlet></router-outlet>`.

- [ ] **Step 4: Remove duplicate rendering from the shell**

Delete the `ToastService`, `MatSnackBar`, and `MatSnackBarModule` imports, injections, and toast subscription from `ShellComponent`. Preserve layout breakpoint and router behavior.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run the Step 2 command. Expected: both positioning tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- pakwaan-crm-frontend/src/app/app.component.ts pakwaan-crm-frontend/src/app/app.component.spec.ts pakwaan-crm-frontend/src/app/layout/shell/shell.component.ts
git commit -m "fix: render toasts on every route"
```

### Task 2: Login Error Feedback and Password Toggle

**Files:**
- Create: `pakwaan-crm-frontend/src/app/features/auth/login.component.spec.ts`
- Modify: `pakwaan-crm-frontend/src/app/features/auth/login.component.ts`

**Interfaces:**
- Consumes: `AuthService.login(payload): Observable<AuthResponse>` and `ToastService.error(message: string): void`.
- Produces: `errorMessage: string | null`, `hidePassword: boolean`, and `togglePasswordVisibility(): void`; private `getLoginErrorMessage(error: unknown): string`.

- [ ] **Step 1: Write failing login error tests**

Configure spies, `provideRouter([])`, and an `ActivatedRoute` stub. Fill the form and fail login with:

```typescript
auth.login.and.returnValue(throwError(() => new HttpErrorResponse({
  status: 401,
  error: { error: 'Invalid username or password.' }
})));
```

Assert `component.errorMessage`, `toast.error`, and `[role="alert"]` all contain the API message. Add a fallback test for `new HttpErrorResponse({ status: 500, error: {} })`. Add a retry test with `Subject<AuthResponse>` that expects a previous inline error to clear immediately.

- [ ] **Step 2: Write failing password visibility tests**

Assert the password input starts with `type="password"` and the `[data-testid="password-visibility"]` button says `Show password`. Click once and expect `type="text"`, `Hide password`, and `visibility_off`; click again and expect the initial state.

- [ ] **Step 3: Run the login component test and verify RED**

```powershell
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/features/auth/login.component.spec.ts
```

Expected: FAIL because inline state and the visibility button are missing.

- [ ] **Step 4: Implement safe failed-login feedback**

Import `HttpErrorResponse`, add the fallback constant and `errorMessage`, clear the message when a valid request starts, and use:

```typescript
error: (error: unknown) => {
  const message = this.getLoginErrorMessage(error);
  this.errorMessage = message;
  this.toast.error(message);
}
```

The private extractor checks an `HttpErrorResponse` body for trimmed `error`, then `message`, then a string body. It accepts a trimmed non-HTTP `Error.message`; otherwise it returns the fallback. Render:

```html
<div *ngIf="errorMessage" class="login-error" role="alert" aria-live="assertive">
  <mat-icon aria-hidden="true">error_outline</mat-icon>
  <span>{{ errorMessage }}</span>
</div>
```

Style it as a readable red flex alert with padding, border, rounded corners, and a pale red background.

- [ ] **Step 5: Implement password visibility**

Import `MatTooltipModule`, add `hidePassword = true`, and:

```typescript
togglePasswordVisibility(): void {
  this.hidePassword = !this.hidePassword;
}
```

Bind the input type and add a `matSuffix` icon button with `type="button"`, test id, click handler, dynamic aria-label and tooltip, and `visibility`/`visibility_off` icon.

- [ ] **Step 6: Run the focused login test and verify GREEN**

Run the Step 3 command. Expected: API error, fallback, clearing, and toggle tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- pakwaan-crm-frontend/src/app/features/auth/login.component.ts pakwaan-crm-frontend/src/app/features/auth/login.component.spec.ts
git commit -m "fix: show login errors and toggle password"
```

### Task 3: Regression Verification

**Files:**
- Verify only; no planned production modifications.

**Interfaces:**
- Consumes: Task 1 and Task 2.
- Produces: full frontend test and build evidence.

- [ ] **Step 1: Run all frontend tests**

```powershell
npm test -- --watch=false --browsers=ChromeHeadless
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run the production build**

```powershell
npm run build
```

Expected: build succeeds. Report existing non-fatal budget warnings separately; no compilation errors are allowed.

- [ ] **Step 3: Inspect the scoped diff**

```powershell
git diff --check HEAD~2..HEAD
git status --short
```

Expected: no whitespace errors; only pre-existing unrelated backend and solution-file changes remain uncommitted.

