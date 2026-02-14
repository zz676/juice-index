import prisma from "@/lib/prisma";
import { AuthProvider } from "@prisma/client";
import type { UserIdentity } from "@supabase/supabase-js";

const PROVIDER_MAP: Record<string, AuthProvider> = {
  google: AuthProvider.GOOGLE,
  github: AuthProvider.GITHUB,
  twitter: AuthProvider.X,
  x: AuthProvider.X,
};

/**
 * Syncs Supabase OAuth identities to the juice_accounts table.
 * Uses the @@unique([provider, providerAccountId]) constraint for upsert.
 */
export async function syncAccounts(
  userId: string,
  identities: UserIdentity[]
) {
  for (const identity of identities) {
    const provider = PROVIDER_MAP[identity.provider];
    if (!provider) continue;

    const providerAccountId = identity.id;
    const now = new Date();

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      update: {
        userId,
        accessToken: (identity.identity_data as Record<string, unknown>)?.access_token as string | undefined,
        updatedAt: now,
      },
      create: {
        id: globalThis.crypto?.randomUUID?.() ?? `${userId}-${identity.provider}-${Date.now()}`,
        userId,
        provider,
        providerAccountId,
        accessToken: (identity.identity_data as Record<string, unknown>)?.access_token as string | undefined,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
}
