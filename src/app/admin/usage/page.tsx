import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

async function getAdminStats() {
    const totalRequests = await prisma.apiUsage.count();

    // Calculate cost (Mock logic: assume $0.001 per request for now)
    const estimatedCost = (totalRequests * 0.001).toFixed(2);

    const usageByEndpoint = await prisma.apiUsage.groupBy({
        by: ['endpoint'],
        _count: { endpoint: true },
        orderBy: { _count: { endpoint: 'desc' } }
    });

    const recentActivity = await prisma.apiUsage.findMany({
        take: 20,
        orderBy: { timestamp: 'desc' },
        include: { User: { select: { email: true } } }
    });

    return { totalRequests, estimatedCost, usageByEndpoint, recentActivity };
}

export default async function AdminUsagePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Check Admin Role
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
    if (dbUser?.role !== "ADMIN") {
        return (
            <div className="container py-20 text-center">
                <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
                <p>You must be an administrator to view this page.</p>
            </div>
        );
    }

    const stats = await getAdminStats();

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Admin Usage Dashboard</h1>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="card bg-white p-6 shadow rounded-lg border">
                    <h3 className="text-sm font-medium text-gray-500">Total API Requests</h3>
                    <p className="text-3xl font-bold mt-2">{stats.totalRequests.toLocaleString()}</p>
                </div>
                <div className="card bg-white p-6 shadow rounded-lg border">
                    <h3 className="text-sm font-medium text-gray-500">Est. LLM Cost (Week)</h3>
                    <p className="text-3xl font-bold mt-2 text-green-600">${stats.estimatedCost}</p>
                    <p className="text-xs text-gray-400 mt-1">*Estimate based on $0.001/req avg</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Endpoint Usage */}
                <div className="card">
                    <h2 className="text-xl font-bold mb-4">Usage by Endpoint</h2>
                    <div className="overflow-hidden border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stats.usageByEndpoint.map((stat) => (
                                    <tr key={stat.endpoint}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.endpoint}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{stat._count.endpoint}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="card">
                    <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                    <div className="overflow-hidden border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Time</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stats.recentActivity.map((log) => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.User.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.endpoint}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
