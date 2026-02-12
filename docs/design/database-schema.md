# Database Schema Design

**Date**: 2026-02-12
**Project**: Visual Data Studio (juice-index)

## Overview
This document outlines the database schema used for the Visual Data Studio features, specifically the Data Explorer and Dashboard components. **Crucially, the application connects to existing database tables shared with the `ev-platform` project.** We map our Prisma models to these specific table names (prefixed with `juice_`) to ensure data parity and access to the shared dataset without creating duplicate structures.

## Core Identity Tables
| Model | Table Name | Status | Description |
|-------|------------|--------|-------------|
| **User** | `juice_users` | **SHARED** | Core user identity and authentication profile. Shared with `ev-platform`. |

## Shared Data Tables (Active VDS Schema)
These tables are **shared with `ev-platform`** and contain the active dataset used by Visual Data Studio. 
- **Identity & API**: Uses `juice_*` prefixed tables (modern schema).
- **Market Data**: Uses original capitalization tables (legacy but active schema).

### Core Identity & API
| Model | Table Name | Description |
|-------|------------|-------------|
| **User** | `juice_users` | Shared user accounts. |
| **Account** | `juice_accounts` | OAuth connections. |
| **Session** | `juice_sessions` | Active sessions. |
| **ApiKey** | `juice_api_keys` | Developer API keys. |
| **ApiRequestLog** | `juice_api_request_logs` | API usage logs. |
| **ApiSubscription** | `juice_api_subscriptions` | Stripe subscriptions. |

### Market Data (Data Explorer)
| Model | Table Name | Description |
|-------|------------|-------------|
| **EVMetric** | `EVMetric` | Core EV market metrics. |
| **VehicleSpec** | `VehicleSpec` | Vehicle specifications. |
| **CpcaNevRetail** | `CpcaNevRetail` | Retail sales data. |
| **CpcaNevProduction** | `CpcaNevProduction` | Production data. |
| **BatteryMakerMonthly** | `BatteryMakerMonthly` | Battery maker stats. |
| **CaamNevSales** | `CaamNevSales` | CAAM sales statistics. |
| **NevSalesSummary** | `NevSalesSummary` | Weekly/Bi-weekly sales summaries. |
| **AutomakerRankings** | `AutomakerRankings` | Monthly rankings. |
| **PlantExports** | `PlantExports` | Plant-level export data. |
| **ChinaBatteryInstallation** | `ChinaBatteryInstallation` | Battery installation stats. |
| **BatteryMakerRankings** | `BatteryMakerRankings` | Battery maker rankings. |
| **ChinaPassengerInventory** | `ChinaPassengerInventory` | Passenger car inventory. |
| **ChinaDealerInventoryFactor** | `ChinaDealerInventoryFactor` | Dealer inventory factor. |
| **ChinaViaIndex** | `ChinaViaIndex` | Vehicle Inventory Alert Index. |
| **NioPowerSnapshot** | `NioPowerSnapshot` | NIO infrastructure metrics. |

## Separate / Legacy Tables (Inactive in VDS)
These tables exist in the database but are **NOT** used by the new Visual Data Studio features. They typically belong to the legacy `ev-platform` implementation or older versions of the app.

| Model (Prisma) | Table Name (DB) | Status |
|----------------|-----------------|--------|
| **LegacyUser** | `User` | **SEPARATE** (Legacy user table) |
| **LegacyPost** | `Post` | **SEPARATE** (Old news posts) |
| **LegacyAccount** | `Account` | **SEPARATE** (Old OAuth) |
| **LegacySession** | `Session` | **SEPARATE** (Old sessions) |
| **ScrapedArticle** | `ScrapedArticle` | **SEPARATE** (Raw content) |
| **Post** | `Post` | **SEPARATE** (Original post table) |

