# Authentication & Session Management

This project uses a split-cookie architecture for managing SLAS authentication tokens. The implementation separates auth concerns between server and client, with automatic token refresh and session management.

## Architecture Overview

We maintain **separate authentication contexts** for server and client, plus a React context for components:

1. **Server-side middleware** (`auth.server.ts`): Manages auth tokens, writes cookies via `Set-Cookie` headers
2. **Client-side middleware** (`auth.client.ts`): Reads auth cookies, maintains in-memory cache, initializes router context
3. **React Context + root provider** (`AuthContext` + `AuthProvider`): Components consume auth via a React context that is always provided by the root `App` component. During hydration, the root uses a `bootstrapAuth` value derived from cookies; after hydration, it uses loader-based session data.

### Server and Client Flow

1. **Server middleware** detects or creates user session with SLAS tokens
2. Server writes auth data to **separate cookies** via `Set-Cookie` headers
3. **Browser receives and stores** cookies automatically
4. **Cookies are written** with the latest tokens and user metadata
5. On the client, a **bootstrap auth snapshot** (`bootstrapAuth`) is derived from cookies once at module load time and used by the root `App` as a fallback during hydration
6. **Client middleware** initializes router context during execution and maintains in-memory cache for further use of authData
7. On subsequent client-side navigations, **client middleware** reads cookies and validates tokens; server is only involved on full page refreshes

## Cookie Architecture

### Split Cookie Design

Authentication data is stored in **separate cookies**, each with specific purpose and expiry:

| Cookie Name  | Purpose                                                                                        | User Type       | Expiry                | HttpOnly |
| ------------ | ---------------------------------------------------------------------------------------------- | --------------- | --------------------- | -------- |
| `cc-nx-g`    | Guest refresh token                                                                            | Guest only      | 30 days (max)         | No       |
| `cc-nx`      | Registered refresh token                                                                       | Registered only | 90 days (max)         | No       |
| `cc-at`      | Access token                                                                                   | Both            | 30 minutes            | No       |
| `usid`       | User session ID                                                                                | Both            | Matches refresh token | No       |
| `customerId` | Customer ID                                                                                    | Registered only | Matches refresh token | No       |
| `cc-idp-at`  | IDP access token (social login)                                                                | Both            | Matches access token  | No       |
| `cc-cv`      | OAuth2 PKCE code verifier (Temporary cookie deleted after successful token call via PKCE flow) | Both            | 5 minutes             | **Yes**  |

**Key Design Decisions:**

- **Mutually Exclusive Refresh Tokens**: Only ONE refresh token cookie exists at a time (`cc-nx-g` OR `cc-nx`, never both)
- **User Type Derivation**: `userType` is **NEVER stored in cookies**. It's derived at runtime from which refresh token cookie exists
- **Cookie Namespacing**: All cookies are automatically namespaced with `siteId` (e.g., `cc-nx_RefArch`)
- **HttpOnly Exception**: Only `cc-cv` (code verifier) uses `httpOnly: true` for security; others use `httpOnly: false` to allow client-side JavaScript to read auth data from cookies (required for AuthContext default value and client middleware).
- **Browser Auto-Cleanup**: Cookies include expiry dates, so browser automatically deletes expired cookies. Cookies are also deleted on shopper logout.

### User Type Detection

User type is determined by which refresh token cookie exists:

```typescript
// Server-side (auth.server.ts)
if (refreshTokenRegistered) {
    userType = 'registered';
    refreshToken = refreshTokenRegistered;
} else if (refreshTokenGuest) {
    userType = 'guest';
    refreshToken = refreshTokenGuest;
} else {
    userType = 'guest'; // Fallback - will trigger guest login
    refreshToken = null;
}
```

On user type transition (e.g., guest → registered), the old refresh token cookie is explicitly deleted by the server.(`Set-Cookie: cc-nx-g=""`)

### Token Expiry Management

**Access Token Expiry:**

- Extracted directly from JWT `exp` claim (source of truth)
- Decoded **once** during middleware initialization
- Fast numeric comparison at runtime: `accessTokenExpiry > Date.now()`
- No repeated JWT decoding needed

**Refresh Token Expiry:**

- Configurable via environment variables (with Commerce Cloud maximum limits enforced)
- Guest tokens: 30 days maximum
- Registered tokens: 90 days maximum

## Configuration

### Environment Variables (Optional)

Configure refresh token expiry and cookie settings in your `.env` file:

```bash
# Optional: Override guest refresh token expiry (max 30 days)
PUBLIC_COMMERCE_API_GUEST_REFRESH_TOKEN_EXPIRY_SECONDS=2592000

# Optional: Override registered refresh token expiry (max 90 days)
PUBLIC_COMMERCE_API_REGISTERED_REFRESH_TOKEN_EXPIRY_SECONDS=7776000

# Optional: Set cookie domain for cross-subdomain sharing
PUBLIC_COOKIE_DOMAIN=.yourstore.com
```

### Cookie Configuration

Cookie settings are managed via `getCookieConfig()` with precedence:

1. **Environment variables** (highest priority)
2. **Provided options** (function arguments)
3. **Default values** (path, sameSite, secure)

```typescript
import { getCookieConfig } from '@/lib/cookie-utils';

// Uses environment config + defaults
const config = getCookieConfig({ httpOnly: false }, context);
```

## Usage Examples

### Accessing Auth Data on Server

Use the `getAuth()` helper in loaders and actions:

```typescript
import { getAuth } from '@/middlewares/auth.server';
import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ context }: LoaderFunctionArgs) {
    const auth = getAuth(context);

    // Access auth properties
    const accessToken = auth.access_token;
    const customerId = auth.customer_id;
    const userType = auth.userType; // 'guest' | 'registered'
    const usid = auth.usid;

    // Check if user is authenticated
    const isGuest = auth.userType === 'guest';
    const isRegistered = auth.userType === 'registered';

    return { customerId, isRegistered };
}
```

### Accessing Auth Data on Client

Use the same `getAuth()` helper in client loaders:

```typescript
import { getAuth } from '@/middlewares/auth.client';
import type { ClientLoaderFunctionArgs } from 'react-router';

export async function clientLoader({ context }: ClientLoaderFunctionArgs) {
    const auth = getAuth(context);

    // Same API as server-side
    const accessToken = auth.access_token;
    const isRegistered = auth.userType === 'registered';

    return { isRegistered };
}
```

### Updating Auth (Login)

Use `updateAuth()` to update auth state after login:

```typescript
import { updateAuth } from '@/middlewares/auth.server';
import { loginRegisteredUser } from '@/middlewares/auth.server';
import type { ActionFunctionArgs } from 'react-router';

export async function action({ request, context }: ActionFunctionArgs) {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
        // Call SLAS login endpoint
        const tokenResponse = await loginRegisteredUser(context, email, password);

        // Update auth storage and cookies
        updateAuth(context, tokenResponse);

        return redirect('/account');
    } catch (error) {
        return { error: 'Login failed' };
    }
}
```

### Destroying Auth (Logout)

Use `destroyAuth()` to clear all auth cookies:

```typescript
import { destroyAuth } from '@/middlewares/auth.server';
import type { ActionFunctionArgs } from 'react-router';

export async function action({ context }: ActionFunctionArgs) {
    // Clear all auth cookies and storage
    destroyAuth(context);

    return redirect('/');
}
```

### Social Login (OAuth2 PKCE Flow)

The auth system supports OAuth2 PKCE flow for social login providers (Google, Facebook, etc.):

```typescript
import { generateCodeVerifier, generateCodeChallenge } from '@/utils/pkce';
import { updateAuth } from '@/middlewares/auth.server';

// Step 1: Generate PKCE challenge and redirect to IDP
export async function loader({ context }: LoaderFunctionArgs) {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store code verifier in httpOnly cookie (server-only, 5 min expiry)
    const auth = getAuth(context);
    updateAuth(context, (data) => ({
        ...data,
        codeVerifier, // Automatically stored in cc-cv cookie
    }));

    // Redirect to IDP with code challenge
    const authUrl = `${idpUrl}?code_challenge=${codeChallenge}`;
    return redirect(authUrl);
}

// Step 2: Handle OAuth callback
export async function callbackAction({ request, context }: ActionFunctionArgs) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    // Retrieve code verifier from cookie
    const auth = getAuth(context);
    const codeVerifier = auth.codeVerifier;

    // Exchange code for tokens (using codeVerifier for PKCE verification)
    const tokenResponse = await exchangeCodeForTokens(code, codeVerifier);

    // Update auth with new tokens (code verifier cookie is auto-deleted)
    updateAuth(context, tokenResponse);

    return redirect('/account');
}
```

### Custom Auth Operations

For custom auth workflows, use the provided server-side helpers:

```typescript
import {
    loginGuestUser,
    loginRegisteredUser,
    refreshAccessToken,
    authorizePasswordless,
    getPasswordLessAccessToken,
    getPasswordResetToken,
    resetPasswordWithToken,
} from '@/middlewares/auth.server';

// Guest login
const guestTokens = await loginGuestUser(context, { usid: 'optional-usid' });

// Refresh access token
const newTokens = await refreshAccessToken(context, refreshToken);

// Passwordless login (magic link)
await authorizePasswordless(context, {
    userid: 'user@example.com',
    redirectPath: '/account',
});

// Get token from magic link
const tokens = await getPasswordLessAccessToken(context, magicLinkToken);

// Password reset flow
await getPasswordResetToken(context, { email: 'user@example.com' });
await resetPasswordWithToken(context, {
    email: 'user@example.com',
    token: 'reset-token',
    newPassword: 'newPassword123',
});
```

## Authentication Flows

### New Guest User

1. User visits site without cookies
2. Server middleware detects no auth cookies
3. Server calls SLAS guest login endpoint
4. Server writes `cc-nx-g`, `cc-at`, `usid` cookies via `Set-Cookie`
5. Browser stores cookies and renders page
6. On client hydration, `AuthContext` default value reads cookies at module load time
7. Client middleware reads cookies into in-memory cache and initializes router context

### Returning User (Token Valid)

1. User visits site with valid cookies
2. Server middleware reads cookies from `Cookie` header
3. Server validates access token expiry (fast JWT check)
4. If valid, server proceeds with existing tokens
5. If access token expired but refresh token valid, server refreshes
6. Updated tokens written back via `Set-Cookie` headers

### Guest → Registered User (Login)

1. Guest user submits login form
2. Server action calls `loginRegisteredUser()`
3. SLAS returns registered user tokens with `customer_id`
4. Server calls `updateAuth()` with token response
5. Server middleware writes `cc-nx`, `cc-at`, `usid`, `customerId` cookies
6. Server middleware **deletes** old `cc-nx-g` cookie (mutual exclusivity)
7. On next request, server detects `cc-nx` cookie → `userType = 'registered'`

### User Logout

1. User clicks logout button
2. Server action calls `destroyAuth(context)`
3. Server middleware deletes all auth cookies via `Set-Cookie` with `expires=Thu, 01 Jan 1970`
4. Browser receives response and deletes cookies
5. On next request, server detects no cookies → new guest login

### External Token Updates (Hybrid Storefronts)

1. External system (e.g., ECOM cartridge) updates auth cookies
2. User navigates to new page in React app
3. **Full page load**: Server middleware reads updated cookies from `Cookie` header and validates tokens
4. **Client-side navigation**: Client middleware reads updated cookies from `document.cookie` and syncs in-memory cache
5. AuthProvider in `root.tsx` updates React Context with latest auth state
6. App reflects new auth state automatically

## Token Validation Flow

The server and client use the same validation logic:

```
1. Check if access token exists and not expired (JWT exp claim)
   ✅ If valid → use it
   ❌ If expired → proceed to step 2

2. Check if refresh token exists
   ✅ If exists → call refresh endpoint for new access token
   ❌ If missing → proceed to step 3

3. Fallback to guest login
   → Get new guest tokens
   → Write cookies
```

## Hydration Strategy

To prevent React hydration mismatches while keeping auth tokens out of serialized loader data, auth is made available **immediately** during hydration via a combination of:

- A **bootstrap snapshot** of auth data derived from cookies on the client (`bootstrapAuth`)
- A **root-level `AuthProvider`** that always wraps the app and chooses between loader-based session data and `bootstrapAuth`

```typescript
// providers/auth.tsx
export const bootstrapAuth: SessionData | undefined =
    typeof window === 'undefined'
        ? undefined
        : (getAuthDataFromCookies() as SessionData | undefined);

export const AuthContext = createContext<SessionData | undefined>(undefined);
```

```typescript
// root.tsx (simplified)
import AuthProvider, { bootstrapAuth } from '@/providers/auth';

export default function App({ loaderData: { auth, /* ... */ } }: { loaderData: LoaderData }) {
    const loaderSession = auth?.();
    const sessionData = loaderSession ?? bootstrapAuth;

    const providers = useMemo(
        () =>
            [
                [AuthProvider, { value: sessionData }],
                // other providers...
            ] as const,
        [sessionData]
    );

    return <ComposeProviders providers={providers}>{/* app */}</ComposeProviders>;
}
```

### How It Works

- On the **server**:
  - Middleware builds a `SessionData` object.
  - The root loader returns `auth: () => session` to avoid serializing `SessionData` into the HTML/data payload.
  - `bootstrapAuth` is always `undefined` on the server.
- On the **client during initial hydration**:
  - `bootstrapAuth` is computed once from cookies at module load time.
  - Before `clientLoader` runs, `auth?.()` returns `undefined`, so `sessionData = bootstrapAuth`.
  - The root always renders `<AuthProvider value={sessionData}>`, so components using `useAuth()` see cookie-derived auth that matches the SSR markup.
- **After `clientLoader` and on subsequent navigations**:
  - The client loader recomputes auth from the middleware/client context.
  - `auth?.()` now returns live `SessionData`, so `sessionData = loaderSession`.
  - `AuthProvider` stays mounted; only its `value` changes, and `useAuth()` consumers re-render with the updated auth.

This keeps:

- A **single source of truth** for live auth state in the middleware/client loader pipeline
- **Cookie-based bootstrap** only for the hydration gap
- A **stable provider tree** (no conditional `AuthProvider` mounting/unmounting)
- **No token serialization** into loader JSON or HTML

## Best Practices

1. **Server vs Client**: Use `getAuth()` in loaders/actions; same API works in both environments
2. **Cookie Management**: Never write cookies directly; use `updateAuth()` or `destroyAuth()`
3. **User Type Checks**: Always use `auth.userType` to determine guest vs registered
4. **Token Refresh**: Middleware handles automatic refresh; no manual intervention needed
5. **Security**: Never log or expose `access_token` or `refresh_token` values
6. **PKCE Flow**: Always use `httpOnly: true` for `code_verifier` in OAuth2 flows
7. **Error Handling**: Check for `auth.error` property to detect auth failures

## Type Safety

The project includes TypeScript types for all auth operations:

```typescript
import type { AuthData, AuthStorageData } from '@/middlewares/auth.utils';

// AuthData includes:
interface AuthData {
    access_token?: string;
    refresh_token?: string;
    access_token_expiry?: number;
    refresh_token_expiry?: number;
    usid?: string;
    customer_id?: string;
    userType?: 'guest' | 'registered';
    idp_access_token?: string;
    codeVerifier?: string;
}
```

## File Structure

```
src/
├── middlewares/
│   ├── auth.server.ts       # Server auth middleware & SLAS operations
│   ├── auth.client.ts       # Client auth middleware, token sync & router context init
│   └── auth.utils.ts        # Shared auth utilities & cookie names
├── providers/
│   └── auth.tsx             # AuthContext + AuthProvider with bootstrapAuth used at the root for hydration
└── lib/
    ├── cookies.server.ts    # Server cookie utilities (Node.js)
    ├── cookies.client.ts    # Client cookie utilities (browser)
    └── cookie-utils.ts      # Shared cookie config & namespacing
```
