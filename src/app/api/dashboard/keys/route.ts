import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { syncUserToPrisma } from "@/lib/auth/sync-user";
import { generateApiKeySecret, keyPrefix, sha256Hex } from "@/lib/api/keys";

export const runtime = "nodejs";

async function getAuthedSupabaseUser() {
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
  return data.user;
}

export async function GET() {
  const user = await getAuthedSupabaseUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED", code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
  }

  await syncUserToPrisma(user);

  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      isActive: true,
      revokedAt: true,
      expiresAt: true,
      createdAt: true,
      rateLimitOverride: true,
      tierOverride: true,
    },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const user = await getAuthedSupabaseUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED", code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
  }

  await syncUserToPrisma(user);

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const secret = generateApiKeySecret();
  const prefix = keyPrefix(secret);
  const hash = sha256Hex(secret);

  const key = await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: body.name || null,
      keyPrefix: prefix,
      keyHash: hash,
      isActive: true,
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({
    id: key.id,
    createdAt: key.createdAt,
    key: secret,
  });
}
