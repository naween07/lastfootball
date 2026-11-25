/**
 * The website's client for the app backend's auth.
 *
 * Phase 1 of account convergence: the website authenticates against Supabase
 * Auth while the app authenticates against the backend's own `User` table, so
 * the same person signing up on each surface ends up as two unrelated accounts
 * in two databases. This module speaks the backend's half.
 *
 * NOTHING IMPORTS THIS YET. It is deployed inert on purpose -- the cutover
 * (rewiring `useAuth`) is a separate, deliberate step, and a half-finished
 * auth switch is the one thing worth never shipping by accident.
 *
 * WHAT DIFFERS FROM SUPABASE AUTH, and will show in the UI at cutover:
 *
 *  - Signup needs an OTP step. The backend emails a 6-digit code and
 *    `activate` exchanges it for a session; Supabase used a confirmation link.
 *  - Password reset is OTP-based too: `sendOtp` then `resetPassword`, not a
 *    link.
 *  - Google sign-in runs client-side. `googleLogin` takes a Google access
 *    token, so the page must run the Google flow itself; Supabase did that.
 *  - Sessions do not refresh. A 7-day JWT with no refresh token means a weekly
 *    re-login. Accepted deliberately: adding refresh tokens later is additive
 *    and does not invalidate any of this.
 *
 * Every mutation's input and return shape here was verified against the live
 * API on 24 November 2026, not read off the resolvers.
 */

const ENDPOINT =
  (import.meta.env.VITE_BACKEND_GRAPHQL as string | undefined) ||
  "https://api.lastfootball.com/graphql/";

/** CORS on the backend is `origin: "*"`, and the token travels in a header
 *  rather than a cookie, so the browser can call it directly. */
const TOKEN_KEY = "lf_auth_token";

export interface BackendUser {
  id: number;
  email: string;
  username: string | null;
  avatar: string | null;
  isActive: boolean;
  isOAuthUser: boolean;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  permissions: string[];
}

export interface AuthSession {
  token: string;
  user: BackendUser;
}

const USER_FIELDS = `id email username avatar isActive isOAuthUser role permissions`;

// ---------------------------------------------------------------------------
// Token storage
//
// localStorage throws in a private window and can come back empty with site
// data cleared, so every access is guarded. A dead token is worse than none:
// it renders a signed-in shell that fails on first use.
// ---------------------------------------------------------------------------

export function currentToken(): string | null {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    return t && !tokenExpired(t) ? t : null;
  } catch {
    return null;
  }
}

function storeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private window -- the session simply does not persist */
  }
}

/**
 * Reads `exp` out of the JWT without verifying it.
 *
 * This is a UX check, never a security one: the server verifies the signature
 * on every request. The point is to avoid showing a logged-in header for a
 * token that expired three days ago.
 */
function tokenExpired(token: string): boolean {
  try {
    const [, payload] = token.split(".");
    if (!payload) return true;
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    if (!json.exp) return false;
    return Date.now() >= json.exp * 1000;
  } catch {
    return true;
  }
}

export function signOut(): void {
  storeToken(null);
}

// ---------------------------------------------------------------------------
// Errors
//
// The backend throws plain Errors whose messages are already written for a
// person ("Invalid email or password", "Too many attempts. Request a new
// code."). Those are passed through. Anything else -- a schema error, a
// network failure, a stack -- becomes one generic line, because an auth screen
// must never show a reader an exception.
// ---------------------------------------------------------------------------

const PASS_THROUGH = [
  "Invalid email or password",
  "User not active",
  "Email already in use",
  "Invalid otp or otp expired",
  "Too many attempts. Request a new code.",
  "Too many requests. Try again later.",
  "User not found",
  "Unauthorized",
  "Could not send the code. Try again shortly.",
];

const GENERIC = "Something went wrong. Please try again.";

export function friendlyAuthError(raw: unknown): string {
  const msg =
    typeof raw === "string" ? raw : raw instanceof Error ? raw.message : "";
  if (!msg) return GENERIC;

  // Yup failures arrive prefixed; the remainder is already readable.
  if (msg.startsWith("Validation Error: ")) {
    return msg.slice("Validation Error: ".length).replace(/,\s*/g, ". ");
  }
  const hit = PASS_THROUGH.find((p) => msg.startsWith(p));
  return hit ? msg.replace(/!+$/, "") : GENERIC;
}

class AuthError extends Error {}

/**
 * A TokenType result is only a session if it actually carries one.
 *
 * `googleLogin` returns `{ token: null, user: null }` with NO error when the
 * Google token does not verify -- confirmed against the live API on
 * 24 Nov 2026. Storing that null would delete the existing token and hand the
 * caller a session object full of nothing, so the page would show a signed-in
 * state it does not have. Checked for all three session calls, not just the
 * one known to do it.
 */
function requireSession(s: AuthSession | null | undefined, message: string): AuthSession {
  if (!s?.token || !s.user) throw new AuthError(message);
  return s;
}

async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  withAuth = false,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withAuth) {
    const token = currentToken();
    if (!token) throw new AuthError("Unauthorized");
    headers.Authorization = `Bearer ${token}`;
  }

  let body: any;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });
    body = await res.json();
  } catch {
    // A network failure is not something to show verbatim.
    throw new AuthError(GENERIC);
  }

  if (body?.errors?.length) {
    throw new AuthError(friendlyAuthError(body.errors[0]?.message));
  }
  if (!body?.data) throw new AuthError(GENERIC);
  return body.data as T;
}

// ---------------------------------------------------------------------------
// The calls
// ---------------------------------------------------------------------------

export async function login(email: string, password: string): Promise<AuthSession> {
  const d = await gql<{ login: AuthSession }>(
    `mutation Login($email: String!, $password: String!) {
       login(input: { email: $email, password: $password }) {
         token user { ${USER_FIELDS} }
       }
     }`,
    { email: email.trim(), password },
  );
  const session = requireSession(d.login, "Invalid email or password");
  storeToken(session.token);
  return session;
}

/** Creates the account and sends the activation code. No session yet. */
export async function register(
  email: string,
  username: string,
  password: string,
): Promise<BackendUser> {
  const d = await gql<{ normalRegister: BackendUser }>(
    `mutation Register($email: String!, $username: String!, $password: String!) {
       normalRegister(input: { email: $email, username: $username, password: $password }) {
         ${USER_FIELDS}
       }
     }`,
    { email: email.trim(), username: username.trim(), password },
  );
  return d.normalRegister;
}

/**
 * Exchanges the emailed code for a session.
 *
 * `email` is required: the resolver scopes the lookup to one account. It used
 * to search by OTP alone, which made a guessed code a takeover of whoever held
 * it -- fixed 24 Nov 2026.
 */
export async function activate(email: string, otp: string): Promise<AuthSession> {
  const d = await gql<{ userActivate: AuthSession }>(
    `mutation Activate($email: String!, $otp: String!) {
       userActivate(input: { email: $email, otp: $otp }) {
         token user { ${USER_FIELDS} }
       }
     }`,
    { email: email.trim(), otp: otp.trim() },
  );
  const session = requireSession(d.userActivate, "Invalid otp or otp expired");
  storeToken(session.token);
  return session;
}

/** Sends a fresh code. Throttled server-side; five in fifteen minutes. */
export async function sendOtp(email: string): Promise<void> {
  await gql(
    `mutation SendOtp($email: String!) {
       sendOtp(input: { email: $email }) { id email }
     }`,
    { email: email.trim() },
  );
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
): Promise<void> {
  await gql(
    `mutation Reset($email: String!, $otp: String!, $newPassword: String!) {
       forgotPassword(input: { email: $email, otp: $otp, newPassword: $newPassword }) { id }
     }`,
    { email: email.trim(), otp: otp.trim(), newPassword },
  );
}

/** For a signed-in person who knows their current password. */
export async function changePassword(newPassword: string): Promise<void> {
  await gql(
    `mutation ChangePassword($newPassword: String!) {
       changePassword(input: { newPassword: $newPassword }) { id }
     }`,
    { newPassword },
    true,
  );
}

/** Takes a Google access token obtained by the page's own Google flow. */
export async function googleLogin(accessToken: string): Promise<AuthSession> {
  const d = await gql<{ googleLogin: AuthSession }>(
    `mutation GoogleLogin($accessToken: String!) {
       googleLogin(input: { accessToken: $accessToken }) {
         token user { ${USER_FIELDS} }
       }
     }`,
    { accessToken },
  );
  const session = requireSession(
    d.googleLogin,
    "Google sign-in failed. Please try again.",
  );
  storeToken(session.token);
  return session;
}

/**
 * The signed-in user, or null.
 *
 * Clears a token the server rejects, so a stale one cannot leave the UI in a
 * signed-in state that fails on every action.
 */
export async function me(): Promise<BackendUser | null> {
  if (!currentToken()) return null;
  try {
    const d = await gql<{ me: BackendUser }>(
      `query Me { me { ${USER_FIELDS} } }`,
      {},
      true,
    );
    return d.me ?? null;
  } catch {
    storeToken(null);
    return null;
  }
}
