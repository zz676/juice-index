import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProfileForm from "./profile-form";
import { Key, CreditCard } from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: { id: authUser.id },
    });

    const subscription = await prisma.apiSubscription.findUnique({
        where: { userId: authUser.id },
    });

    if (!user) {
        // Should be synced by route handler, but handle edge case
        return <div>User not found. Please re-login.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Manage your profile and subscription preferences.
                </p>
            </div>

            <div className="space-y-6">
                {/* Profile Section */}
                <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
                    <div className="px-4 py-5 sm:px-6 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-lg leading-6 font-medium text-slate-900">Profile</h3>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <ProfileForm user={user} />
                    </div>
                </div>

                {/* Subscription & Keys Section */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {/* Subscription Tier */}
                    <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
                        <div className="px-4 py-5 sm:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg leading-6 font-medium text-slate-900">Subscription</h3>
                            <CreditCard className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="px-4 py-5 sm:p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Current Plan</p>
                                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                                        {subscription?.tier || "FREE"}
                                    </p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${subscription?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {subscription?.status?.toUpperCase() || "INACTIVE"}
                                </div>
                            </div>
                            <div className="mt-6">
                                <Link
                                    href="/pricing"
                                    className="text-sm font-medium text-primary hover:text-primary-dark"
                                >
                                    Upgrade Plan &rarr;
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* API Keys */}
                    <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
                        <div className="px-4 py-5 sm:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg leading-6 font-medium text-slate-900">API Keys</h3>
                            <Key className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="px-4 py-5 sm:p-6">
                            <p className="text-sm text-slate-500 mb-4">
                                Manage your API keys for accessing Juice Index data programmatically.
                            </p>
                            <Link
                                href="/dashboard/keys"
                                className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Manage Keys
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
