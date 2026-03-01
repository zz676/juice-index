# Stock Ticker — Design Doc

**Date:** 2026-02-28

## Overview

Add a horizontally scrolling live stock ticker to the Dashboard overview page. Shows real-time prices and % changes for 21 EV-related companies. Clicking any item opens the Yahoo Finance quote page in a new tab.

## Architecture

### API Route: `GET /api/stocks`
- Node runtime (not Edge)
- Uses `yahoo-finance2` npm package to batch-fetch `regularMarketPrice` and `regularMarketChangePercent` for all 21 symbols
- Returns JSON array: `[{ symbol, brand, price, change, currency }]`
- No API key required

### Component: `StockTicker.tsx`
- `"use client"` component in `src/components/dashboard/`
- Fetches `/api/stocks` on mount; re-fetches every 60 seconds
- CSS infinite marquee animation (items duplicated once for seamless loop)
- Scroll speed: ~40s per loop

### Integration
- Placed at the top of `src/app/dashboard/page.tsx`, above the upgrade banner

## Ticker Item Format

```
Tesla  TSLA  $248.50  ▲ 2.31%
```

- Brand name (short 1–2 words)
- Symbol in muted text
- Price (with currency symbol)
- % change: green + ▲ if positive, red + ▼ if negative
- Full item is a link to `https://finance.yahoo.com/quote/{SYMBOL}`

## Visual Style

- Full-width dark bar (`bg-slate-custom-900 text-white`), ~36px tall
- Small text (`text-xs` / `text-[11px]`), tabular numbers
- Pulsing green `LIVE` indicator on the left
- Thin `|` separator between items
- Loading: shimmer skeleton; error: hide the bar silently

## Stocks List

| Symbol | Display |
|---|---|
| TSLA | Tesla |
| NIO | NIO |
| XPEV | Xpeng |
| LI | Li Auto |
| 1810.HK | Xiaomi |
| LCID | Lucid |
| RIVN | Rivian |
| BYDDY | BYD |
| TM | Toyota |
| 005380.KS | Hyundai |
| GM | GM |
| BMW.DE | BMW |
| MBG.DE | Mercedes |
| VOW3.DE | VW |
| F | Ford |
| 000270.KS | Kia |
| HMC | Honda |
| P911.DE | Porsche |
| 7261.T | Mazda |
| 9863.HK | Leapmotor |
| 7201.T | Nissan |
