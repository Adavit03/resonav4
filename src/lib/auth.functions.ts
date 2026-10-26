import { createServerFn } from "@tanstack/react-start";

export const getGoogleOAuthUrl = createServerFn({ method: "POST" })
  .validator((data: { redirectTo: string }) => data)
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL || "https://zvarqbhkudfvvgxmdgup.supabase.co";
    const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_CFWqbds73PyQ4D5jfxNpHA_9L6ITcry";

    try {
      const authorizeUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(data.redirectTo)}`;
      const res = await fetch(authorizeUrl, {
        method: "GET",
        headers: { apikey: SUPABASE_KEY },
        redirect: "manual",
      });

      // Status 400 means Supabase rejected OAuth request (e.g. missing OAuth secret or provider not enabled)
      if (res.status === 400) {
        const body = await res.json().catch(() => null);
        if (
          body?.msg?.includes("missing OAuth secret") ||
          body?.msg?.includes("provider is not enabled") ||
          body?.error_code === "validation_failed"
        ) {
          return {
            success: false,
            error:
              "Google Sign-In is not yet enabled in your Supabase project (Google provider is disabled or missing credentials in Supabase dashboard). Please sign in using your email and password above.",
          };
        }
      }

      // If Supabase returned a redirect to Google accounts (302/303) or valid URL
      return {
        success: true,
        url: authorizeUrl,
      };
    } catch (err) {
      return {
        success: false,
        error: "Could not connect to Google authentication service.",
      };
    }
  });
