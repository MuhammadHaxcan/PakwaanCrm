# Login Error and Password Visibility Design

## Goal

Make failed login attempts clearly visible on the login page and let users reveal or hide their password before submitting the form.

## Root Cause

`LoginComponent` already publishes an error through `ToastService`, but the only subscriber that opens Angular Material snackbars is `ShellComponent`. The login route renders outside the authenticated shell, so its toast events have no active renderer.

## Design

### Global toast rendering

Move the `ToastService` subscription and `MatSnackBar` rendering responsibility from `ShellComponent` to the root `AppComponent`. This creates one toast host for both public routes, including `/login`, and authenticated routes inside the shell. Remove the shell subscription to prevent duplicate snackbars.

The root host will preserve the existing toast duration, position, and panel classes. Its horizontal position will be responsive: centered on narrow screens and right-aligned otherwise.

### Login error handling

`LoginComponent` will keep a nullable inline error message. When a login attempt begins, it will clear any previous error. If the request fails, it will derive a user-safe message from common API response shapes in this order:

1. A non-empty `error` string from the response body.
2. A non-empty `message` string from the response body.
3. A useful message from an `Error` object, excluding generic transport text where appropriate.
4. The fallback: `Unable to sign in. Please check your username and password.`

The selected message will be sent to `ToastService.error` and shown in a persistent inline alert beneath the fields. The inline alert will use an accessible alert role so assistive technology announces it.

### Password visibility

Add an icon button as the password field suffix. It will toggle the input type between `password` and `text`, switch between visibility icons, and expose an accurate `aria-label` and tooltip such as “Show password” or “Hide password.” The button will use `type="button"` so it never submits the login form.

## Components Changed

- `AppComponent`: becomes the single global toast renderer.
- `ShellComponent`: retains layout and navigation behavior but no longer renders toasts.
- `LoginComponent`: adds inline error state, robust error-message extraction, and password visibility control.
- Login and root component tests: cover the new behavior and guard against regression.

## Data Flow

1. The user submits valid form values.
2. The component clears the prior inline error and starts the request.
3. On success, existing session and return-URL navigation behavior remain unchanged.
4. On failure, the component extracts or creates a safe message.
5. The message is stored for inline display and emitted through `ToastService`.
6. The root app host receives the toast and opens a styled snackbar regardless of the active route.

## Testing

Tests will be written before production changes and observed failing for the missing behavior. They will verify:

- A toast emitted while the login route is active opens a snackbar through the root host.
- The shell does not create a second toast subscription.
- A failed login displays the API-provided message inline and emits the same error toast.
- An unrecognized or empty error response uses the fallback message.
- Starting a new login attempt clears the previous inline error.
- The password starts masked and the suffix button toggles masking, icon state, and accessible label.

The focused tests will run first, followed by the full frontend test suite and production build.

## Scope

This change does not modify backend authentication behavior, credentials, session storage, routing rules, or the visual structure of the login card beyond the inline alert and password suffix control.
