import { auth } from "@/lib/auth/server";
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from "@/lib/demo-admin";
import { getSql } from "@/lib/db";

const previewOnly = import.meta.env.DEV && !process.env.DATABASE_URL;
let seedPromise: Promise<void> | undefined;

export function ensureDemoAdmin(): Promise<void> {
  if (!previewOnly) return Promise.resolve();
  seedPromise ??= (async () => {
    const sql = await getSql();
    const existing = await sql`select id from "user" where email = ${DEMO_ADMIN_EMAIL} limit 1`;
    if (existing.length) return;
    await auth.api.signUpEmail({
      body: {
        name: "Helix Demo Admin",
        email: DEMO_ADMIN_EMAIL,
        password: DEMO_ADMIN_PASSWORD,
      },
    });
  })().catch((error) => {
    seedPromise = undefined;
    throw error;
  });
  return seedPromise;
}
