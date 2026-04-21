// ─── MIGRATION: Loveable cloud auth → native Supabase OAuth ─────────────────
//
// WHAT CHANGED:
//   Before: @lovable.dev/cloud-auth-js intercepted OAuth and forwarded tokens
//           to Loveable's cloud platform. Useless outside Loveable hosting.
//   After:  We call supabase.auth.signInWithOAuth() directly. Supabase handles
//           the full OAuth flow (redirect → callback → session) natively.
//
// FILE LOCATION IN YOUR REPO:
//   src/integrations/lovable/index.ts
//
// NO OTHER FILES NEED CHANGING — Auth.tsx imports `lovable` from here unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "../supabase/client";

type OAuthProvider = "google" | "apple" | "microsoft";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: OAuthProvider, opts?: SignInOptions) => {
      // Map provider names to Supabase provider keys
      // "microsoft" → "azure" in Supabase's enum
      const supabaseProvider =
        provider === "microsoft" ? "azure" : provider;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider,
        options: {
          redirectTo: opts?.redirect_uri ?? window.location.origin,
          queryParams: opts?.extraParams,
        },
      });

      if (error) {
        return { error, redirected: false };
      }

      // Supabase OAuth opens the provider's login page.
      // data.url is the provider URL — the browser navigates there automatically
      // via supabase-js, so we just signal that a redirect is happening.
      if (data?.url) {
        return { redirected: true };
      }

      return { redirected: false };
    },
  },
};
