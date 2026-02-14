import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProfileForm from "./profile-form";
import ConnectedAccounts from "./connected-accounts";
import PasswordSection from "./password-section";
import SubscriptionSection from "./subscription-section";
import NotificationPrefs from "./notification-prefs";
import DangerZone from "./danger-zone";

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: { id: authUser.id },
    });

    if (!user) {
        return <div>User not found. Please re-login.</div>;
    }

    // ApiSubscription query uses raw SQL because some environments are missing
    // newer columns (currentPeriodStart, cancelAtPeriodEnd, etc.) which causes
    // Prisma model queries to fail with P2022. See auth/callback/route.ts:65-67.
    // First query only guaranteed columns, then try optional ones separately.
    type SubRow = { tier: string; status: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean };

    const [baseRows, preferences] = await Promise.all([
        prisma.$queryRaw<Array<{ tier: string; status: string }>>`
            SELECT "tier", "status"
            FROM "public"."juice_api_subscriptions"
            WHERE "userId" = ${authUser.id}
            LIMIT 1
        `.catch(() => [] as Array<{ tier: string; status: string }>),
        prisma.userPreference.findUnique({
            where: { userId: authUser.id },
        }),
    ]);

    let subscription: SubRow | null = null;
    if (baseRows[0]) {
        // Try to read optional billing columns; fall back to defaults if missing
        const extra = await prisma.$queryRaw<Array<{ currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean }>>`
            SELECT "currentPeriodEnd", "cancelAtPeriodEnd"
            FROM "public"."juice_api_subscriptions"
            WHERE "userId" = ${authUser.id}
            LIMIT 1
        `.catch(() => [{ currentPeriodEnd: null, cancelAtPeriodEnd: false }]);

        subscription = {
            ...baseRows[0],
            currentPeriodEnd: extra[0]?.currentPeriodEnd ?? null,
            cancelAtPeriodEnd: extra[0]?.cancelAtPeriodEnd ?? false,
        };
    }

    const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Table may not exist in partially migrated environments
    const usageCount = await prisma.apiRequestLog.count({
        where: {
            userId: authUser.id,
            createdAt: { gte: periodStart },
        },
    }).catch(() => 0);

    const tierLimits: Record<string, number> = {
        FREE: 100,
        STARTER: 5000,
        PRO: 50000,
        ENTERPRISE: Infinity,
    };

    const tier = subscription?.tier ?? "FREE";
    const tierLimit = tierLimits[tier] ?? 100;

    // Serialize identities for client component
    const identities = (authUser.identities ?? []).map((i) => ({
        provider: i.provider,
        identity_id: i.identity_id,
        email: (i.identity_data as Record<string, unknown>)?.email as string | undefined,
        name: (i.identity_data as Record<string, unknown>)?.name as string | undefined,
    }));

    const hasPassword = !!user.passwordHash;

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-custom-900">Account Settings</h1>
                <p className="mt-1 text-sm text-slate-custom-500">
                    Manage your profile, security, and preferences.
                </p>
            </div>

            <div className="space-y-6">
                {/* Profile */}
                <section className="bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                    <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
                        <span className="material-icons-round text-slate-custom-400">person</span>
                        <h3 className="text-base font-semibold text-slate-custom-900">Profile</h3>
                    </div>
                    <div className="p-6">
                        <ProfileForm
                            name={user.name ?? ""}
                            email={user.email}
                            avatarUrl={user.avatarUrl ?? null}
                        />
                    </div>
                </section>

                {/* Connected Accounts */}
                <section className="bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                    <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
                        <span className="material-icons-round text-slate-custom-400">link</span>
                        <h3 className="text-base font-semibold text-slate-custom-900">Connected Accounts</h3>
                    </div>
                    <div className="p-6">
                        <ConnectedAccounts identities={identities} hasPassword={hasPassword} />
                    </div>
                </section>

                {/* Password & Security */}
                <section className="bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                    <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
                        <span className="material-icons-round text-slate-custom-400">lock</span>
                        <h3 className="text-base font-semibold text-slate-custom-900">Password & Security</h3>
                    </div>
                    <div className="p-6">
                        <PasswordSection hasPassword={hasPassword} email={user.email} />
                    </div>
                </section>

                {/* Subscription & Billing */}
                <section className="bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                    <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
                        <span className="material-icons-round text-slate-custom-400">credit_card</span>
                        <h3 className="text-base font-semibold text-slate-custom-900">Subscription & Billing</h3>
                    </div>
                    <div className="p-6">
                        <SubscriptionSection
                            tier={tier}
                            status={subscription?.status ?? "active"}
                            currentPeriodEnd={subscription?.currentPeriodEnd?.toISOString() ?? null}
                            cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
                            usageCount={usageCount}
                            tierLimit={tierLimit}
                        />
                    </div>
                </section>

                {/* Notification Preferences */}
                <section className="bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                    <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
                        <span className="material-icons-round text-slate-custom-400">notifications</span>
                        <h3 className="text-base font-semibold text-slate-custom-900">Notification Preferences</h3>
                    </div>
                    <div className="p-6">
                        <NotificationPrefs
                            preferences={preferences ? {
                                language: preferences.language,
                                digestFrequency: preferences.digestFrequency,
                                alertsEnabled: preferences.alertsEnabled,
                                alertThreshold: preferences.alertThreshold,
                                brands: preferences.brands,
                                topics: preferences.topics,
                            } : null}
                        />
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="bg-white rounded-lg border border-red-200 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                    <div className="px-6 py-4 border-b border-red-200 flex items-center gap-3">
                        <span className="material-icons-round text-red-400">warning</span>
                        <h3 className="text-base font-semibold text-red-600">Danger Zone</h3>
                    </div>
                    <div className="p-6">
                        <DangerZone userEmail={user.email} />
                    </div>
                </section>
            </div>
        </div>
    );
}
