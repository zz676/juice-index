import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { sanitizeNextPath } from '@/lib/auth/sanitize-next-path'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = sanitizeNextPath(searchParams.get('next'))
    const code = searchParams.get('code')

    if (token_hash && type) {
        const supabase = await createClient()

        const { data, error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })
        if (!error && data.session?.user) {
            await syncUser(data.session.user)
            return NextResponse.redirect(new URL(next, request.url))
        }
    } else if (code) {
        // Handle OAuth code exchange
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.session?.user) {
            await syncUser(data.session.user)
            return NextResponse.redirect(new URL(next, request.url))
        }
    }

    // return the user to an error page with some instructions
    return NextResponse.redirect(new URL('/login?error=auth', request.url))
}

import { prisma } from '@/lib/prisma'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { syncAccounts } from '@/lib/auth/sync-accounts'

async function syncUser(user: SupabaseUser) {
    if (!user.email) return

    // 1. Sync User
    await prisma.user.upsert({
        where: { id: user.id },
        update: {
            email: user.email,
            avatarUrl: user.user_metadata?.avatar_url,
            // Only update name if it's set in metadata, providing a fallback or keeping existing
            name: user.user_metadata?.full_name || user.user_metadata?.name,
            updatedAt: new Date(),
        },
        create: {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
            avatarUrl: user.user_metadata?.avatar_url,
            updatedAt: new Date(),
        },
    })

    // 2. Ensure ApiSubscription exists.
    // Use raw SQL with explicit columns to stay compatible with partially migrated DBs.
    // Some environments are missing newer columns (e.g. currentPeriodStart/cancelAtPeriodEnd),
    // which can cause Prisma model-based find/create calls to fail with P2022.
    const now = new Date()
    const subscriptionId = globalThis.crypto?.randomUUID?.() ?? `${user.id}-${Date.now()}`

    await prisma.$executeRaw`
      INSERT INTO "public"."juice_api_subscriptions" ("id", "userId", "tier", "status", "createdAt", "updatedAt")
      VALUES (${subscriptionId}, ${user.id}, 'FREE', 'active', ${now}, ${now})
      ON CONFLICT ("userId") DO NOTHING
    `

    // 3. Sync OAuth accounts (juice_accounts)
    await syncAccounts(user.id, user.identities ?? [])
}
