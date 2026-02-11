import type { User as SupabaseUser } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";

export async function syncUserToPrisma(supabaseUser: SupabaseUser) {
  const email = supabaseUser.email;
  if (!email) {
    throw new Error("User email is required");
  }

  const name =
    supabaseUser.user_metadata?.full_name ||
    supabaseUser.user_metadata?.name ||
    email.split("@")[0];

  const avatarUrl =
    supabaseUser.user_metadata?.avatar_url ||
    supabaseUser.user_metadata?.picture;

  // Role is only set on create. Do not overwrite role on update.
  return prisma.user.upsert({
    where: { id: supabaseUser.id },
    update: {
      email,
      name,
      avatarUrl,
      emailVerified: supabaseUser.email_confirmed_at != null,
      updatedAt: new Date(),
    },
    create: {
      id: supabaseUser.id,
      email,
      name,
      avatarUrl,
      emailVerified: supabaseUser.email_confirmed_at != null,
      role: "USER",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}
