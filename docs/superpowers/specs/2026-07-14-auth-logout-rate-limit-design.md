# Authentication Logout and Rate-Limit Feedback Design

## Problem

The frontend classifies login, refresh, and logout as authentication endpoints that must not receive an access token. The backend logout endpoint is authorized, so logout receives a 401 response before it can revoke the refresh token or clear its cookie. The frontend suppresses that failure and clears only its in-memory session.

The authentication rate limiter returns HTTP 429 after its limit is reached, but the login page does not tell the user how long to wait before retrying.

## Design

### Logout

The authentication interceptor will distinguish endpoints that must omit a bearer token from endpoints that merely bypass automatic refresh handling. Login and refresh will continue to omit the bearer token. Logout will receive the current bearer token, while its own 401 response will not trigger refresh recursion.

The existing backend logout behavior remains responsible for revoking the refresh token and expiring the `pakwaan_refresh_token` cookie. The frontend will continue clearing its local session even if the logout request fails, so the user is not trapped in the application when the server is unavailable.

### Rate-limit response

When the authentication fixed-window limiter rejects a request, the backend will return a standards-based `Retry-After` response header. Its value will be the number of whole seconds until another request should be attempted. If the limiter cannot provide retry metadata, the configured one-minute window will be used as the fallback.

The login component will recognize HTTP 429 separately from credential failures. It will read `Retry-After`, validate it as a positive number of seconds, and display:

> Too many sign-in attempts. Please try again after N seconds.

If the header is absent or invalid, the UI will use 60 seconds. The message is static; there is no countdown or timer-based button behavior.

Other login errors retain their existing server-message and fallback handling.

## Testing

Focused frontend tests will verify that:

- logout receives the access-token authorization header;
- login and refresh still omit it;
- authentication endpoints do not enter the automatic refresh loop;
- a 429 response with `Retry-After` displays the supplied wait time;
- a missing or invalid header displays the 60-second fallback.

Backend verification will confirm compilation and the rate-limiter response configuration. The full frontend test suite and production build will be run after the focused tests pass.

## Out of Scope

- A live countdown or timer-based login button state.
- Changing the current limit of 12 authentication requests per minute.
- Redesigning authentication cookies or token storage.
