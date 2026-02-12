"use client";

import { useState } from "react";

export default function ResultsViewer({
    results,
    onGenerateChart,
    isGeneratingChart,
    chartUrl
}: {
    results: any[],
    onGenerateChart: (config: any) => void,
    isGeneratingChart: boolean,
    chartUrl: string | null
}) {
    const [chartConfig, setChartConfig] = useState({
        title: "Data Analysis",
        type: "bar",
        caption: "Source: evjuice.net"
    });

    if (!results || results.length === 0) return null;

    const columns = Object.keys(results[0]);

    return (
        <div className="card mt-6 space-y-8">
            {/* Table Section */}
            <div>
                <h2 className="text-xl font-bold mb-4">Step 3: Results ({results.length} rows)</h2>
                <div className="overflow-x-auto max-h-96 border rounded-lg">
                    <table className="table w-full">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                {columns.map(col => (
                                    <th key={col} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {results.slice(0, 50).map((row, i) => (
                                <tr key={i}>
                                    {columns.map(col => (
                                        <td key={col} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                            {typeof row[col] === 'object' ? JSON.stringify(row[col]) : row[col]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {results.length > 50 && (
                    <p className="text-xs text-gray-500 mt-2 text-center">Showing first 50 rows</p>
                )}
            </div>

            {/* Chart Configuration Section */}
            <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Chart Preview</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
                        <select
                            value={chartConfig.type}
                            onChange={(e) => setChartConfig({ ...chartConfig, type: e.target.value })}
                            className="input w-full"
                        >
                            <option value="bar">Bar Chart</option>
                            <option value="line">Line Chart</option>
                            <option value="pie">Pie Chart</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={chartConfig.title}
                            onChange={(e) => setChartConfig({ ...chartConfig, title: e.target.value })}
                            className="input w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                        <input
                            type="text"
                            value={chartConfig.caption}
                            onChange={(e) => setChartConfig({ ...chartConfig, caption: e.target.value })}
                            className="input w-full"
                        />
                    </div>
                </div>

                <button
                    onClick={() => onGenerateChart(chartConfig)}
                    className="btn btn-outline w-full md:w-auto"
                    disabled={isGeneratingChart}
                >
                    {isGeneratingChart ? "Rendering Chart..." : "Generate Chart Image"}
                </button>

                {chartUrl && (
                    <div className="mt-6 border rounded-lg p-2 bg-gray-50">
                        <img src={chartUrl} alt="Generated Chart" className="w-full h-auto rounded" />
                    </div>
                )}
            </div>
        </div>
    );
}
