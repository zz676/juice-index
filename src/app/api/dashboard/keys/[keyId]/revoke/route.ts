import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

async function getAuthedUserId(): Promise<string | null> {
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
  if (error || !data.user) return null;
  return data.user.id;
}

export async function POST(_: Request, { params }: { params: { keyId: string } }) {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED", code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
  }

  const keyId = params.keyId;

  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, userId },
    select: { id: true },
  });

  if (!key) {
    return NextResponse.json({ error: "NOT_FOUND", code: "NOT_FOUND", message: "Key not found" }, { status: 404 });
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: false, revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
