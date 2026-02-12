import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/dashboard'
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

    // 2. Ensure ApiSubscription exists
    // We use upsert to ensure it exists without overwriting existing data if we don't want to
    // But actually, we just want to create it if it doesn't exist.
    // upsert is easiest way to "create if not exists"
    const existingSub = await prisma.apiSubscription.findUnique({
        where: { userId: user.id },
    })

    if (!existingSub) {
        await prisma.apiSubscription.create({
            data: {
                userId: user.id,
                tier: 'FREE',
                status: 'active',
            },
        })
    }
}
