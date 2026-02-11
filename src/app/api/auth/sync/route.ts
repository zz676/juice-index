import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { syncUserToPrisma } from "@/lib/auth/sync-user";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignore
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: "UNAUTHORIZED", code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await syncUserToPrisma(data.user);
  return NextResponse.json({
    success: true,
    user: { id: dbUser.id, email: dbUser.email, role: dbUser.role },
  });
}
