"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Brand, Frequency, Language, Topic } from "@prisma/client";
import crypto from "crypto";

export async function updateProfile(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { message: "Unauthorized", type: "error" };
    }

    const name = formData.get("name") as string;

    if (!name || name.length < 2) {
        return { message: "Name must be at least 2 characters", type: "error" };
    }

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: { name },
        });

        // Update Supabase user metadata as well to keep in sync
        await supabase.auth.updateUser({
            data: { full_name: name },
        });

        revalidatePath("/dashboard/settings");
        return { message: "Profile updated successfully!", type: "success" };
    } catch (error) {
        return { message: "Failed to update profile", type: "error" };
    }
}

export async function updatePreferences(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { message: "Unauthorized", type: "error" };
    }

    const language = formData.get("language") as string;
    const digestFrequency = formData.get("digestFrequency") as string;
    const alertsEnabled = formData.get("alertsEnabled") === "true";
    const alertThreshold = parseInt(formData.get("alertThreshold") as string) || 80;
    const brands = formData.getAll("brands") as string[];
    const topics = formData.getAll("topics") as string[];

    // Validate enums
    const validLanguages: string[] = Object.values(Language);
    const validFrequencies: string[] = Object.values(Frequency);
    const validBrands: string[] = Object.values(Brand);
    const validTopics: string[] = Object.values(Topic);

    if (!validLanguages.includes(language)) {
        return { message: "Invalid language", type: "error" };
    }
    if (!validFrequencies.includes(digestFrequency)) {
        return { message: "Invalid digest frequency", type: "error" };
    }

    const filteredBrands = brands.filter((b) => validBrands.includes(b)) as Brand[];
    const filteredTopics = topics.filter((t) => validTopics.includes(t)) as Topic[];

    try {
        await prisma.userPreference.upsert({
            where: { userId: user.id },
            update: {
                language: language as Language,
                digestFrequency: digestFrequency as Frequency,
                alertsEnabled,
                alertThreshold,
                brands: filteredBrands,
                topics: filteredTopics,
            },
            create: {
                id: crypto.randomUUID(),
                userId: user.id,
                language: language as Language,
                digestFrequency: digestFrequency as Frequency,
                alertsEnabled,
                alertThreshold,
                brands: filteredBrands,
                topics: filteredTopics,
                updatedAt: new Date(),
            },
        });

        revalidatePath("/dashboard/settings");
        return { message: "Preferences saved!", type: "success" };
    } catch (error) {
        return { message: "Failed to save preferences", type: "error" };
    }
}

export async function toggleXPremium() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { message: "Unauthorized", type: "error" };
    }

    try {
        const xAccount = await prisma.xAccount.findUnique({
            where: { userId: user.id },
            select: { id: true, isXPremium: true },
        });

        if (!xAccount) {
            return { message: "No X account connected", type: "error" };
        }

        await prisma.xAccount.update({
            where: { id: xAccount.id },
            data: { isXPremium: !xAccount.isXPremium },
        });

        revalidatePath("/dashboard/settings");
        return {
            message: `X Premium ${!xAccount.isXPremium ? "enabled" : "disabled"}`,
            type: "success",
            isXPremium: !xAccount.isXPremium,
        };
    } catch (error) {
        return { message: "Failed to update X Premium status", type: "error" };
    }
}

export async function deleteAccount(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { message: "Unauthorized", type: "error" };
    }

    const confirmEmail = formData.get("confirmEmail") as string;

    // Verify email matches
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser || confirmEmail !== dbUser.email) {
        return { message: "Email does not match. Please type your email to confirm.", type: "error" };
    }

    try {
        // 1. Cancel Stripe subscription if exists
        const subscription = await prisma.apiSubscription.findUnique({
            where: { userId: user.id },
        });

        if (subscription?.stripeSubscriptionId) {
            const stripe = getStripe();
            await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        }

        // 2. Delete related records that don't cascade
        await prisma.apiRequestLog.deleteMany({ where: { userId: user.id } });
        await prisma.apiKey.deleteMany({ where: { userId: user.id } });
        await prisma.apiSubscription.deleteMany({ where: { userId: user.id } });

        // 3. Delete user (cascades: Account, Session, SavedPost, EmailNotification, UserPreference, XAccount)
        await prisma.user.delete({ where: { id: user.id } });

        // 4. Delete from Supabase Auth
        const adminClient = createAdminClient();
        await adminClient.auth.admin.deleteUser(user.id);
    } catch (error) {
        return { message: "Failed to delete account. Please try again.", type: "error" };
    }

    redirect("/login");
}
