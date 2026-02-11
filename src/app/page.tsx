import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* ── Hero ── */}
      <section
        style={{
          padding: "100px 24px 80px",
          textAlign: "center",
          background:
            "radial-gradient(ellipse at 50% 0%, var(--green-50) 0%, var(--bg) 70%)",
        }}
      >
        <div className="container">
          <span className="badge badge-green" style={{ marginBottom: 20 }}>
            🚗 EV Market Intelligence
          </span>
          <h1
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: 20,
              letterSpacing: "-0.02em",
            }}
          >
            EV Market Data API
          </h1>
          <p
            style={{
              fontSize: "1.15rem",
              color: "var(--text-secondary)",
              maxWidth: 560,
              margin: "0 auto 36px",
              lineHeight: 1.6,
            }}
          >
            Real-time electric vehicle metrics, delivery data, and market
            analytics — built for developers.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/login" className="btn btn-primary">
              Get Started Free
            </Link>
            <Link href="/docs" className="btn btn-outline">
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* ── Code Preview ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div className="container" style={{ maxWidth: 680 }}>
          <div className="code-block">
            <span className="code-comment">
              {"# Fetch brand metrics with one API call"}
            </span>
            <br />
            <br />
            <span className="code-keyword">curl</span> -H{" "}
            <span className="code-string">
              {'"Authorization: Bearer YOUR_KEY"'}
            </span>{" "}
            \<br />
            {"  "}
            <span className="code-string">
              https://juice-index.vercel.app/api/v1/brands/TSLA/metrics
            </span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title">Why Juice Index?</h2>
          <p className="section-subtitle">
            Everything you need to track the EV market, in one simple API.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            <div className="card">
              <div
                style={{
                  fontSize: "2rem",
                  marginBottom: 12,
                }}
              >
                ⚡
              </div>
              <h3 style={{ marginBottom: 8, fontSize: "1.15rem" }}>
                Real-Time Metrics
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                Live data on deliveries, market share, and performance across
                all major EV brands.
              </p>
            </div>
            <div className="card">
              <div
                style={{
                  fontSize: "2rem",
                  marginBottom: 12,
                }}
              >
                📊
              </div>
              <h3 style={{ marginBottom: 8, fontSize: "1.15rem" }}>
                Brand Analytics
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                Compare performance across Tesla, Rivian, BYD, and more with
                historical trend data.
              </p>
            </div>
            <div className="card">
              <div
                style={{
                  fontSize: "2rem",
                  marginBottom: 12,
                }}
              >
                🔑
              </div>
              <h3 style={{ marginBottom: 8, fontSize: "1.15rem" }}>
                Developer Friendly
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                RESTful API with full OpenAPI spec, rate limiting, and API key
                management built in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Simple Pricing</h2>
          <p className="section-subtitle">
            Start for free, upgrade when you need more.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
              maxWidth: 920,
              margin: "0 auto",
            }}
          >
            {/* Free */}
            <div className="card" style={{ textAlign: "center" }}>
              <h3 style={{ marginBottom: 4 }}>Free</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 16 }}>
                For exploration
              </p>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: 4 }}>
                $0
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 24 }}>
                per month
              </p>
              <ul
                style={{
                  listStyle: "none",
                  textAlign: "left",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  marginBottom: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <li>✓ 100 API calls/day</li>
                <li>✓ Basic metrics</li>
                <li>✓ Community support</li>
              </ul>
              <Link href="/login" className="btn btn-outline" style={{ width: "100%" }}>
                Get Started
              </Link>
            </div>

            {/* Starter */}
            <div className="card card-accent" style={{ textAlign: "center", position: "relative" }}>
              <span
                className="badge badge-green"
                style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)" }}
              >
                Popular
              </span>
              <h3 style={{ marginBottom: 4 }}>Starter</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 16 }}>
                For builders
              </p>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: 4, color: "var(--accent)" }}>
                $9.99
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 24 }}>
                per month
              </p>
              <ul
                style={{
                  listStyle: "none",
                  textAlign: "left",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  marginBottom: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <li>✓ 1,000 API calls/day</li>
                <li>✓ Brand analytics</li>
                <li>✓ Email support</li>
              </ul>
              <Link href="/login" className="btn btn-primary" style={{ width: "100%" }}>
                Start Free Trial
              </Link>
            </div>

            {/* Pro */}
            <div className="card" style={{ textAlign: "center" }}>
              <h3 style={{ marginBottom: 4 }}>Pro</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 16 }}>
                For teams
              </p>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: 4 }}>
                $29.99
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 24 }}>
                per month
              </p>
              <ul
                style={{
                  listStyle: "none",
                  textAlign: "left",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  marginBottom: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <li>✓ Unlimited API calls</li>
                <li>✓ Full data access</li>
                <li>✓ Priority support</li>
                <li>✓ Dedicated account manager</li>
              </ul>
              <Link href="/login" className="btn btn-outline" style={{ width: "100%" }}>
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
