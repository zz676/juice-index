"use client";

import { useState } from "react";

export function CreateApiKeyButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function createKey() {
    setIsLoading(true);
    setNewKey(null);
    try {
      const res = await fetch("/api/dashboard/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "default" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || "Failed to create key");
      setNewKey(json.key);
    } catch (e) {
      setNewKey(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button onClick={createKey} disabled={isLoading} className="btn btn-primary btn-sm">
        {isLoading ? "Creating..." : "+ Create API Key"}
      </button>
      {newKey ? (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: "var(--green-50)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--green-200)",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 8, color: "var(--green-800)" }}>
            🔑 New key (shown once):
          </div>
          <code
            style={{
              display: "block",
              padding: 12,
              background: "var(--gray-900)",
              color: "var(--green-400)",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              overflowX: "auto",
            }}
          >
            {newKey}
          </code>
        </div>
      ) : null}
    </div>
  );
}
