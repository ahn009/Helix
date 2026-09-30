import { createServerFn } from "@tanstack/react-start";

/** Public sign-in screen capability check; it never returns credentials. */
export const getAuthMethods = createServerFn({ method: "GET" }).handler(async () => {
  const { authConfigured } = await import("@/lib/auth/server");
  return { oauthConfigured: authConfigured };
});
