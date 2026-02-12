"use client";

import { useState } from "react";

export default function PostComposer({
    onGeneratePost,
    isGeneratingPost,
    postContent
}: {
    onGeneratePost: (instruction: string) => void,
    isGeneratingPost: boolean,
    postContent: string | null
}) {
    const [instruction, setInstruction] = useState("");

    return (
        <div className="card mt-6">
            <h2 className="text-xl font-bold mb-4">Step 4: Compose & Post</h2>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instructions for AI (Optional)
                </label>
                <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="e.g., Make it punchy and mention the 20% growth."
                    className="input w-full h-24"
                />
            </div>

            <button
                onClick={() => onGeneratePost(instruction)}
                className="btn btn-primary mb-6"
                disabled={isGeneratingPost}
            >
                {isGeneratingPost ? "Drafting..." : "Draft Post with AI"}
            </button>

            {postContent && (
                <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase">Draft Preview</h3>
                    <textarea
                        readOnly
                        value={postContent}
                        className="w-full h-32 bg-white p-3 rounded border text-gray-800"
                    />
                    <div className="flex justify-end mt-2">
                        <button
                            className="btn btn-outline text-sm"
                            onClick={() => navigator.clipboard.writeText(postContent)}
                        >
                            Copy to Clipboard
                        </button>
                        <a
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(postContent)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary ml-2 text-sm"
                        >
                            Post to X
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
