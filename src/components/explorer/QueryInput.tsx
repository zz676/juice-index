"use client";

import { useState } from "react";

export default function QueryInput({ onGenerate, isGenerating }: { onGenerate: (prompt: string) => void, isGenerating: boolean }) {
    const [prompt, setPrompt] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            onGenerate(prompt);
        }
    };

    return (
        <div className="card">
            <h2 className="text-xl font-bold mb-4">Step 1: Ask a Question</h2>
            <form onSubmit={handleSubmit} className="flex gap-4">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Show me monthly deliveries for NIO in 2025"
                    className="input flex-1"
                    disabled={isGenerating}
                />
                <button type="submit" className="btn btn-primary" disabled={isGenerating || !prompt.trim()}>
                    {isGenerating ? "Generating..." : "Generate Query"}
                </button>
            </form>
            <div className="mt-4 text-sm text-gray-500">
                <p className="font-medium mb-2">Examples:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Compare BYD and Tesla deliveries in 2024</li>
                    <li>Top 5 brands by sales in Q4 2024</li>
                    <li>Show me weekly insurance registrations for Xiaomi</li>
                </ul>
            </div>
        </div>
    );
}
