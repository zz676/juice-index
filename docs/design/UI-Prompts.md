# UI Design Prompts for Juice Index

Use these prompts with AI UI generation tools to create high-fidelity designs for the Juice Index platform.

## Global Aesthetic
> **Style**: Clean, Modern SaaS, Light Mode (Default).
> **Color Palette**: 
> - **Background**: Soft Slate White (#f8fafc) and pure White (#ffffff) cards.
> - **Primary Brand**: Electric Lime (#84cc16) for buttons, active states, and highlights.
> - **Text**: Deep Slate (#0f172a) for headings, Muted Slate (#64748b) for secondary text.
> **Elements**: 
> - **Structure**: "Bento Box" grid layout with rounded corners (2xl).
> - **Materials**: Subtle glassmorphism on white panels (frosted bg-white/80), thin borders (#e2e8f0).
> - **Shadows**: Soft, diffuse shadows (shadow-sm, shadow-md) for depth.
> **Typography**: Inter (UI) + JetBrains Mono (Data/Code). Clean, readable, professional.

---

## 1. Landing Page (Hero & Features)

**Prompt:**
> Design a high-conversion landing page for "Juice Index", a premium data intelligence platform for the Chinese EV market.
>
> **Hero Section**:
> - Centered layout on a clean white background with subtle Lime Green gradient orbs blurring in the corners.
> - **Headline**: "The Pulse of China's EV Market." (Large, bold Slate 900).
> - **Subheadline**: "Real-time tracking of Nio, XPeng, BYD, and Tesla. Production numbers, insurance registrations, and market share analysis." (Slate 600).
> - **Primary CTA**: "Start Free Trial" (Solid Electric Lime button, rounded-full, shadow-lg).
> - **Secondary CTA**: "Explore Data" (White button with Slate border).
> - **Visual**: A tilted, floating 3D mockup of the "AI-Powered Workflow" UI (clean white card with lime accents).
>
> **Feature Grid**:
> - 3-column grid of clean white cards with thin slate borders.
> - **Card 1**: "Real-time Production Data" with a lime green line chart icon.
> - **Card 2**: "Weekly Insurance Registrations" with a list icon.
> - **Card 3**: "Supply Chain Analytics" with a network icon.
> - **Hover Effect**: Cards lift slightly and border turns Lime Green.
>
> **Social Proof**:
> - "Trusted by analysts at:" section with grayscale logos of financial firms (Goldman, Morgan Stanley, etc.).

---

## 2. Main Dashboard (User View)

**Prompt:**
> Design a comprehensive analytics dashboard for a logged-in user.
>
> **Layout**: Sidebar navigation (left, white) + Main Content Area (soft slate background).
> **Sidebar**: Clean white vertical bar. Icons for: Overview, Tickers (NIO, TSLA, XPEV), News, Saved Reports, Settings. Active state uses a Lime Green tint background with darker green text.
>
> **Main Content**:
> - **Top Bar**: Search bar ("Search tickers or metrics...") with a soft shadow, User Profile dropdown.
> - **Summary Cards (Top Row)**: 4 white cards showing key indices (e.g., "NEV Penetration Rate: 42% (+2.1%)"). Use Green/Red text for % change. Lime green icon backgrounds.
> - **Main Chart Area**: Large white card with a "Weekly Deliveries Comparison" line chart. Clean grid lines, Lime and Blue series colors.
> - **Recent Intelligence (Bottom)**: A split view. Left side: "Latest News" list with source logos. Right side: "Upcoming Catalysts" list.

---

## 3. AI-Powered Workflow (Data Explorer)

**Prompt:**
> Design a specialized "AI-Powered Workflow" interface for generating charts from questions.
>
> **Layout**: 
> - **Left Column (Inputs)**: Stacked cards for "Ask" and "Logic".
> - **Right Column (Outputs)**: Larger area for "Visualization" and "Publishing".
>
> **Step 1: Ask a Question (Top Left)**
> - Clean white card.
> - Input field: "Tesla Shanghai exports 2024" (Large text).
> - "Generate" Button: Solid Lime Green, bottom right of the input area.
> - "Try" tags below: Pill-shaped buttons for example queries.
>
> **Step 2: Review Logic (Bottom Left)**
> - White card showing the "Thinking Process".
> - status indicator: "Ready to execute" (Green pulse).
> - **Code Block**: A structured JSON view of the query (Prisma syntax) in JetBrains Mono font.
> - **SQL Preview**: A secondary tab or box showing the generated SQL.
>
> **Step 3: Visualization & Data (Top Right)**
> - Large main canvas.
> - **Chart**: A beautiful Bar chart showing monthly data. Lime Green bars with gradient fill.
> - **Data Table (Collapsible)**: A clean table below the chart with alternating row colors (gray-50/white).
> - **Toolbar**: Toggle buttons for "Bar / Line", "Download".
>
> **Step 4: Compose & Publish (Bottom Right)**
> - A "Tweet Composer" style interface.
> - **Text Area**: Pre-filled analysis text ("Tesla exports show volatility...").
> - **Media Preview**: Small thumbnail of the generated chart attached.
> - **Post Settings**: Checkboxes for "Attach Chart", "Smart Hashtags", "Source Footer".
> - **Post Button**: Large Lime Green button "Post to X".

---

## 4. News Feed & Article View

**Prompt:**
> Design a news aggregation feed optimized for readability and speed.
>
> **Feed Layout**:
> - Masonry or List layout of white news cards on a slate background.
> - **Card Design**:
>   - **Source Label**: (e.g., "CnEVPost") in a small pill badge (Slate bg).
>   - **Headline**: Bold Slate 900 text.
>   - **Summary**: Slate 600 text, truncated.
>   - **Sentiment**: A small colored dot (Green/Gray/Red) for Positive/Neutral/Negative.
>
> **Article Modal / Slide-over**:
> - When a card is clicked, a white slide-over panel appears from the right with a shadow-xl.
> - **Content**: Full article text, "Key Takeaways" box (Lime Green background tint), and "Related Tickers" tags.

---

## 5. Pricing & Subscription

**Prompt:**
> Design a modern pricing page with 3 tiers.
>
> **Tiers**:
> 1.  **Analyst (Free)**: Basic access. simple white card.
> 2.  **Pro ($29/mo)**: "Most Popular". Highlighted with a **Lime Green border** and a "Recommended" badge.
> 3.  **Institutional (Custom)**: For teams.
>
> **UI Details**:
> - Comparison table below the cards (Checkmarks in Lime Green).
> - Toggle switch for "Monthly" vs "Yearly (Save 20%)".
