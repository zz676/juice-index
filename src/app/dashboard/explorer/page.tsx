"use client";

import { useState, useRef, useEffect } from "react";
import QueryInput from "@/components/explorer/QueryInput";
import QueryEditor from "@/components/explorer/QueryEditor";
import ResultsViewer from "@/components/explorer/ResultsViewer";
import PostComposer from "@/components/explorer/PostComposer";

export default function DataExplorerPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data State
    const [generatedQuery, setGeneratedQuery] = useState(null);
    const [results, setResults] = useState<any[]>([]);
    const [chartUrl, setChartUrl] = useState<string | null>(null);
    const [postContent, setPostContent] = useState<string | null>(null);

    // Scroll Refs
    const step2Ref = useRef<HTMLDivElement>(null);
    const step3Ref = useRef<HTMLDivElement>(null);
    const step4Ref = useRef<HTMLDivElement>(null);

    const scrollToStep = (stepRef: React.RefObject<HTMLDivElement>) => {
        setTimeout(() => {
            stepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    // Handlers
    const handleGenerateQuery = async (prompt: string) => {
        setLoading(true);
        try {
            const res = await fetch("/api/data/generate-query", {
                method: "POST",
                body: JSON.stringify({ prompt }),
            });
            const data = await res.json();
            setGeneratedQuery(data.query); // We assume data.query is the Prisma JSON
            setStep(2);
            scrollToStep(step2Ref);
        } catch (e) {
            alert("Failed to generate query");
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteQuery = async (query: any) => {
        setLoading(true);
        try {
            const res = await fetch("/api/data/execute-query", {
                method: "POST",
                body: JSON.stringify({ table: "eVMetric", query }), // Hardcoded table for MVP
            });
            const { data } = await res.json();
            setResults(data);
            setStep(3);
            scrollToStep(step3Ref);
        } catch (e) {
            alert("Execution failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateChart = async (config: any) => {
        setLoading(true);
        try {
            // Prepare chart data from results
            // Simple logic: X-axis = period/year, Y-axis = value
            // This logic should be more robust in production (using LLM or strict mapping)
            const labels = results.map(r => `${r.year}-${r.period}`);
            const values = results.map(r => r.value);

            const chartData = {
                labels,
                datasets: [{
                    label: "Value",
                    data: values,
                    backgroundColor: "#32CD32",
                    borderColor: "#32CD32",
                }]
            };

            const res = await fetch("/api/data/generate-chart", {
                method: "POST",
                body: JSON.stringify({
                    type: config.type, // 'bar', 'line'
                    data: chartData,
                    title: config.title,
                    caption: config.caption
                }),
            });

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setChartUrl(url);

            // Auto-advance to next step if chart is ready? 
            // Maybe wait for user to be happy with chart.
            setStep(4);
            scrollToStep(step4Ref);

        } catch (e) {
            alert("Chart generation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePost = async (instruction: string) => {
        setLoading(true);
        try {
            // Summarize data for the prompt (first 5 rows + count)
            const summary = {
                count: results.length,
                sample: results.slice(0, 5)
            };

            const res = await fetch("/api/data/generate-post", {
                method: "POST",
                body: JSON.stringify({ dataSummary: summary, userInstruction: instruction }),
            });
            const { content } = await res.json();
            setPostContent(content);
        } catch (e) {
            alert("Post drafting failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl pb-32">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Data Explorer</h1>
                <p className="text-gray-500">Ask questions, visualize data, and share insights.</p>
            </div>

            <QueryInput onGenerate={handleGenerateQuery} isGenerating={loading && step === 1} />

            <div ref={step2Ref}>
                {step >= 2 && generatedQuery && (
                    <QueryEditor
                        initialQuery={generatedQuery}
                        onExecute={handleExecuteQuery}
                        isExecuting={loading && step === 2}
                    />
                )}
            </div>

            <div ref={step3Ref}>
                {step >= 3 && results.length > 0 && (
                    <ResultsViewer
                        results={results}
                        onGenerateChart={handleGenerateChart}
                        isGeneratingChart={loading && step === 3}
                        chartUrl={chartUrl}
                    />
                )}
            </div>

            <div ref={step4Ref}>
                {step >= 4 && (
                    <PostComposer
                        onGeneratePost={handleGeneratePost}
                        isGeneratingPost={loading && step === 4}
                        postContent={postContent}
                    />
                )}
            </div>
        </div>
    );
}
