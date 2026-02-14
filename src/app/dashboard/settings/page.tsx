import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProfileForm from "./profile-form";
import ConnectedAccounts from "./connected-accounts";
import PasswordSection from "./password-section";
import NotificationPrefs from "./notification-prefs";
import DangerZone from "./danger-zone";
import { normalizeTier } from "@/lib/api/tier";

interface SettingsPageProps {
    searchParams: Promise<{ x_connected?: string; x_error?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
        redirect("/login");
    }

    const [user, preferences, xAccount, subscription] = await Promise.all([
        prisma.user.findUnique({
            where: { id: authUser.id },
        }),
        prisma.userPreference.findUnique({
            where: { userId: authUser.id },
        }),
        prisma.xAccount.findUnique({
            where: { userId: authUser.id },
            select: { username: true, displayName: true, avatarUrl: true },
        }),
        prisma.apiSubscription.findUnique({
            where: { userId: authUser.id },
            select: { tier: true },
        }),
    ]);

    const tier = normalizeTier(subscription?.tier);
    const hasXLoginIdentity = (authUser.identities ?? []).some(
        (i) => i.provider === "twitter" || i.provider === "x"
    );
    const params = await searchParams;

    if (!user) {
        return <div>User not found. Please re-login.</div>;
    }

    // Serialize identities for client component
    const identities = (authUser.identities ?? []).map((i) => ({
        provider: i.provider,
        identity_id: i.identity_id,
        email: (i.identity_data as Record<string, unknown>)?.email as string | undefined,
        name: (i.identity_data as Record<string, unknown>)?.name as string | undefined,
    }));

    const hasPassword = !!user.passwordHash;

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8 h-full overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-custom-900">Account Settings</h1>
                <p className="mt-1 text-sm text-slate-custom-500">
                    Manage your profile, security, and preferences.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                {/* Notification Preferences */}
                <section className="lg:row-span-2 bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
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

                {/* Connected Accounts */}
                <section className="bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                    <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
                        <span className="material-icons-round text-slate-custom-400">link</span>
                        <h3 className="text-base font-semibold text-slate-custom-900">Connected Accounts</h3>
                    </div>
                    <div className="p-6">
                        <ConnectedAccounts
                            identities={identities}
                            hasPassword={hasPassword}
                            xAccount={xAccount}
                            tier={tier}
                            hasXLoginIdentity={hasXLoginIdentity}
                            xConnected={params.x_connected === "true"}
                            xError={params.x_error}
                        />
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
