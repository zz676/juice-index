# Visual Data Studio (Create Charts & Social Posts from Data)

Last updated: {% current_date %}

This document outlines the **Visual Data Studio**, a tool designed for **content creators, analysts, and social media managers** who need to turn trusted EV data into shareable, high-quality assets without writing SQL or wrestling with Excel.

## The Goal: "From Question to Shareable Asset in Seconds"

### The Problem

1. **Non-technical users can't query raw data.**
   - Marketing managers and journalists don't know SQL or Prisma.
   - They rely on engineers or data analysts to pull numbers, creating a bottleneck.
2. **Generic AI tools hallucinate.**
   - Asking ChatGPT "What are Tesla's Shanghai exports?" often yields outdated or fabricated numbers.
3. **Creating charts is tedious.**
   - Even with data, users have to export to CSV, import to Excel/Canva, style it to match their brand, and then export as an image. This takes 15-30 minutes per chart.

### The Solution: Visual Data Studio

A guided, safe, and branded workflow that acts as a **force multiplier for content creation**:

1. **Ask** in plain English.
2. **Verify** with real data (no hallucinations).
3. **Visualize** with one click (auto-styled 16:9 charts).
4. **Publish** with AI-drafted narrative.

---

## User Flow (The "Studio" Workflow)

The interface is designed not as a database tool, but as a **creative studio**.

**Current Implementation**: `src/app/dashboard/studio/page.tsx`

### 1. The Prompt (Creative Intent)
- **User Action**: "Show me Tesla's export trend from Shanghai for 2024."
- **System**: Translates intent into a precise database query.
- **Value**: Zero technical barrier.

### 2. The Verification (Trust)
- **User Action**: Sees a preview of the data.
- **System**: Runs a read-only query against the live database.
- **Value**: "Trust but verify." The user sees the actual numbers before committing to a chart.

### 3. The Canvas (Visual Asset)
- **User Action**: Clicks "View Chart" and tweaks the design.
- **System**:
  - **WYSIWYG Customization**: Change chart type (Bar/Line/Horizontal), colors, title size/text, padding, and axis settings in real-time.
  - Generates a branded, high-resolution (16:9) image.
  - Applies consistent color palettes (e.g., EV Juice branding).
  - Adds watermarks ("Source: EV Juice") automatically.
- **Value**: Instant professional-grade assets ready for Twitter/LinkedIn. No Canva required.

### 4. The Narrative (Distribution)
- **User Action**: Clicks "Compose Post".
- **System**: Reads the data trends (e.g., "up 20% YoY") and drafts a punchy social media caption.
- **Value**: Solves "writer's block" and speeds up distribution.

---

## Why This is a Product (SaaS Strategy)

You are not selling "database access." You are selling **Content Velocity**.

### Target Audience
- **EV Analysts / substack writers**: Need charts for newsletters.
- **Social Media Managers**: Need daily content for X/LinkedIn.
- **Investors/Consultants**: Need quick slides for decks.

### Monetization Model: "Studio Access"

| Feature | Free Tier (Viewer) | Creator Tier (Pro) | Publisher Tier (Enterprise) |
| :--- | :--- | :--- | :--- |
| **Data Access** | View pre-made charts | Query any dataset | Full API Access |
| **Output** | Web-view only | Download PNGs (Watermarked) | Vector (SVG/PDF), PPT Slide, High-Res |
| **Branding** | - | "Source: EV Juice" | Custom / Whitelabel |
| **AI Features** | - | Basic LLM (Fast) | Pro LLM (Deep Reasoning), Auto-Post Writer |

> **Note**: Pricing tiers and exact costs are managed dynamically via Stripe and can be adjusted without code changes.

### Differentiator
- **Competitors**: Excel (too manual), Tableau (too complex), ChatGPT (too inaccurate).
- **Visual Data Studio**: The speed of AI + the trust of real Database + the polish of a Design Agency.

---

## Technical Architecture (Simplified)

While the user sees a "Studio," the backend ensures safety and performance.

### 1. Intelligent Query Generation
- **LLM Layer**: Translates vague questions into specific Prisma queries.
- **Context Awareness**: Knows the schema (Brands, Models, Regions) so it doesn't invent fake cars.

### 2. Safe Execution Engine
- **Read-Only**: Restricted to `findMany` operations.
- **Guarded**: Row limits, rigorous timeouts, and column allowlists prevent abuse.

### 3. Chart Rendering Engine (`chartjs-node-canvas`)
- **Server-Side Rendering**: Generates identical PNGs regardless of the user's device.
- **Brand Consistency**: Fonts, colors, and margins are hardcoded to brand guidelines.

### 4. Chart Customizer
The Customize panel (`/src/components/explorer/ChartCustomizer.tsx`) provides real-time control over chart appearance, organized into four tabs:

- **Type tab**: Chart type selector (Bar/Line/H-Bar), Show Values toggle, Show Grid toggle, Bar Width, X/Y-Axis thickness, and Padding (top/bottom/left/right, default 20px each).
- **Colors tab**: Preset palettes (Lime/Dark/Blue/Gold), Background, Bar/Line color, Font color, and Axis Line colors (X-Axis, Y-Axis).
- **Text tab**: Title text and font family, Title color and size, Axis font family, X/Y-Axis font sizes and colors.
- **Source tab**: Source text, font family, color, and font size.

Available fonts: Inter, Arial, Helvetica, Georgia, Times New Roman, Courier New, Verdana, Trebuchet MS.

### 5. Export Options
- **Copy Image**: Copies the generated chart image to clipboard.
- **PNG Download**: Downloads the chart as a PNG file.
- **PDF Download**: Converts the chart image to a PDF using `jspdf` (dynamically imported). The PDF is sized to match the image dimensions and orientation.

### 6. Post Composer (Step 4)
- **Copy Post**: Copies the AI-generated post draft text.
- **Attach Image checkbox**: Lets users choose whether to include the chart image when publishing to X.
- **Publish**: Disabled until a draft is generated.

### 7. Rate Limiting & Quotas
- Rate limit checks fail open — if Upstash Redis is unreachable, requests are allowed through with a console warning.
- When the daily query quota is exhausted, the Generate Query button is replaced with an info message and the Run Query button is disabled.
- Toasts are displayed as fixed-position centered overlays.

### 8. Mobile Responsiveness
- **Collapsible Sidebar**: On screens below the `lg` breakpoint, a toggle button shows/hides the left input panel.
- **Auto-collapse**: After generating a query on mobile, the sidebar collapses automatically to maximize chart/data visibility.
- **Desktop Unaffected**: The 450px sidebar remains always visible on `lg+` screens.

---

## Future Roadmap: "The Bloomberg Terminal for EV Content"

1. **Scheduled Reports**: "Email me this chart every Monday morning."
2. **Team Library**: Save queries as "Templates" for the whole team to use.
3. **Embeds**: "Copy code" to embed the live chart on a 3rd party blog.
