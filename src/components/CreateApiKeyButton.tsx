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
    <section style={{ marginTop: 12 }}>
      <button onClick={createKey} disabled={isLoading} style={{ padding: "10px 14px" }}>
        {isLoading ? "Creating..." : "Create API key"}
      </button>
      {newKey ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 600 }}>New key (shown once):</div>
          <pre style={{ padding: 12, background: "#f6f6f6", overflowX: "auto" }}>{newKey}</pre>
        </div>
      ) : null}
    </section>
  );
}
