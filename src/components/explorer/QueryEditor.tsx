"use client";

import { useState } from "react";

export default function QueryEditor({
    initialQuery,
    onExecute,
    isExecuting
}: {
    initialQuery: any,
    onExecute: (query: any) => void,
    isExecuting: boolean
}) {
    const [queryJson, setQueryJson] = useState(JSON.stringify(initialQuery, null, 2));
    const [error, setError] = useState<string | null>(null);

    const handleExecute = () => {
        try {
            const parsed = JSON.parse(queryJson);
            setError(null);
            onExecute(parsed);
        } catch (e) {
            setError("Invalid JSON format");
        }
    };

    return (
        <div className="card mt-6">
            <h2 className="text-xl font-bold mb-4">Step 2: Review Query</h2>
            <p className="text-sm text-gray-500 mb-4">
                The AI generated this Prisma query. You can edit it before executing.
            </p>

            <div className="relative">
                <textarea
                    value={queryJson}
                    onChange={(e) => setQueryJson(e.target.value)}
                    className="w-full h-64 font-mono text-sm p-4 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-lime-500 outline-none"
                />
                {error && (
                    <div className="absolute bottom-4 left-4 text-red-500 text-sm font-medium">
                        {error}
                    </div>
                )}
            </div>

            <div className="flex justify-end mt-4">
                <button
                    onClick={handleExecute}
                    className="btn btn-primary"
                    disabled={isExecuting}
                >
                    {isExecuting ? "Executing..." : "Run Query"}
                </button>
            </div>
        </div>
    );
}
