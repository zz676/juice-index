# Vercel Web Analytics

## Overview

Vercel Web Analytics tracks page views and visitor metrics for the application. It provides privacy-friendly, cookieless analytics directly in the Vercel dashboard.

## Setup

- **Package:** `@vercel/analytics`
- **Integration point:** `src/app/layout.tsx` — the `<Analytics />` component is rendered inside `<body>` so it applies to all pages.

## How It Works

The `<Analytics />` component from `@vercel/analytics/next` automatically collects page view data when the app is deployed on Vercel. No additional configuration or environment variables are required.

## Viewing Analytics

Go to the Vercel dashboard for the project and navigate to the **Analytics** tab to see page views, unique visitors, top pages, referrers, and more.
