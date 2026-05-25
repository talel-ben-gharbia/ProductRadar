# Chapter 7 - B2B Module

## 7.1 Introduction
Sprint 5 delivered the B2B module of Product Radar, a professional workspace designed for two business profiles: B2B Company and B2B Market. The objective of this chapter is to present the functional scope, the technical structure, and the main user journeys that define this module.

Unlike a simple product showcase, this chapter should demonstrate how the B2B space supports operational decisions. It brings together verification, role-based access, subscription control, alerts, reporting, analytics, and automated competitor discovery in a single workspace. The module was designed to help business users understand their catalog, their market position, and the competitive environment without leaving the platform.

## 7.2 Sprint Backlog Summary
The backlog below summarizes the main user stories delivered during this sprint. It is intentionally concise and focuses on outcomes rather than implementation details.

| Area | Main Goal | Delivered Features |
|---|---|---|
| B2B access | Secure onboarding and verification | Registration request, admin approval, account activation |
| Shared workspace | Provide a unified business dashboard | KPI cards, alerts, reports, watchlist, subscription control |
| B2B Company | Support catalog and pricing monitoring | My Listings, competitor pricing, stock monitoring, promotional requests |
| B2B Market | Support brand intelligence and market analysis | Brand Intelligence, Share of Shelf, Distribution Coverage, Sentiment Analysis, Demand Intelligence |
| Automation | Reduce manual competitive search | n8n-based competitor discovery with scoring and AI validation |

### Sprint priorities
- Secure access before workspace activation.
- Clear separation between Company and Market behaviors.
- Gold-only advanced analytics.
- Automated insights instead of manual competitor lookup.
- Fast visual summaries for quick decision-making.

## 7.3 Functional Scope
The B2B module is built around a shared workspace and two roles.

**B2B Company** users monitor their catalog performance, pricing position, stock status, trust score, and promotional campaigns. Their focus is operational: protecting margin, tracking availability, and reacting to competition.

**B2B Market** users analyze brand presence across sellers, category coverage, shelf share, review sentiment, and market demand. Their focus is strategic: understanding distribution strength, competitor pressure, and product gaps.

## 7.4 Access and Onboarding
B2B access is not immediate. A user first submits a partnership request, then the request remains pending until an administrator reviews it and approves or rejects it. This step is important because it guarantees that only verified business accounts reach the workspace.

The registration form collects the minimum information needed to identify the business and route it correctly:
- Company name
- Country and website
- Market sector
- Intended B2B role: Company or Market

This onboarding flow is a good place in the report to show one screenshot of the registration form and one screenshot of the admin approval screen. Together, they immediately explain the security model and the business logic behind the module.

**Figure 7.1**: B2B registration and approval flow

## 7.5 Subscription Plans
Two subscription tiers are available: Silver and Gold. The same interface is used for both, but Gold unlocks advanced analytics and larger usage quotas. This is a strong design choice to mention in the report because it shows that the product is simple to use while still allowing premium features.

| Feature | Silver | Gold |
|---|---:|---:|
| Workspace dashboard | Yes | Yes |
| My Listings and basic comparison | Yes | Yes |
| Alerts, watchlist, reports | Yes | Yes |
| Sponsored Products and Banner Ads | Yes | Yes |
| Brand Intelligence | No | Yes |
| Share of Shelf | No | Yes |
| Price Dispersion | No | Yes |
| Distribution Coverage | No | Yes |
| Sentiment and Demand Intelligence | No | Yes |
| AI competitor discovery | No | Yes |

**Table 7.1**: Silver versus Gold access

For the report, keep only the plan rules that matter to the reader:
- Gold is the analytics tier.
- Silver covers the core workspace.
- Access control is enforced both in the frontend and in the API.
- Quotas apply to reports, watchlists, and promotional requests.

## 7.6 Shared Workspace Features
Both B2B roles use the same workspace structure, but the displayed data adapts to the account type.

### Alerts and notifications
The alert system runs in the background and informs users about business events that matter. Company users are notified about pricing pressure, stock shortage, and trust score drops. Market users receive alerts related to shelf share loss, stock issues, sentiment shifts, and new resellers.

### Reports
Users can generate downloadable CSV reports from the workspace. Reports are useful because they turn the dashboard into a reusable decision document, which is much closer to an engineering deliverable than a simple UI page.

Suggested report categories to keep in the final text:
- Company reports: competitor pricing, stock availability, trust score ranking.
- Market reports: market barometer, share of shelf, dispersion, stock-out, sentiment.

### Background automation
The workspace is refreshed by scheduled background tasks. Instead of listing every low-level job in detail, keep only the meaningful automation blocks:
- Alert detection
- Trust score recalculation
- Shelf snapshot refresh
- Subscription expiry checks
- Internal event processing

## 7.7 B2B Company Features

### 7.7.1 Dashboard
The company dashboard gives an immediate view of catalog health and competitive pressure. The key idea is that the user should understand the state of the business in a few seconds.

Recommended elements to show with one dashboard screenshot:
- KPI cards for tracked products, listings, trust score, and active alerts
- A health score gauge
- Price gap chart
- Stock overview chart
- Trust score trend
- Latest alerts or intelligence feed

This section should stay visual and concise. It is better to explain what the dashboard helps the user understand than to describe every widget in a long paragraph.

**Figure 7.2**: B2B Company dashboard

### 7.7.2 My Listings
The My Listings page is the operational catalog view. Each row summarizes one product with the most relevant business indicators: price, rank, trust score, stock status, and last update.

Use bullets here to make the page easy to scan:
- Category, brand, stock, trust score, and price filters
- Expandable rows for price history and trust score breakdown
- Quick watchlist action without leaving the table
- CSV export for Gold users

### 7.7.3 Competitor Pricing and Stock Monitoring
These two views should be presented together because they serve the same operational goal: helping the company protect performance against competitors.

Competitor Pricing shows the price gap between the company’s product and the cheapest competitor. Stock Monitoring highlights availability risk and identifies opportunities where competitors are out of stock.

**Figure 7.3**: Competitor pricing and stock monitoring views

### 7.7.4 Sponsored Products and Banner Ads
These features represent the promotional side of the B2B Company module. The important part for the report is not the upload details, but the approval workflow.

Key points to keep:
- Requests go through a review process.
- The status changes from Pending to Approved or Rejected.
- Monthly quotas depend on the subscription plan.
- Editing an approved item resets it to Pending.

## 7.8 B2B Market Features

### 7.8.1 Brand Intelligence
Brand Intelligence is the entry point for the Market role. The system identifies the market’s brand footprint across sellers and groups products into meaningful categories.

A simple three-step explanation is enough:
1. Start from the brand’s own products.
2. Detect brand name variants.
3. Discover matching products across all sellers.

The report should show this as a process rather than a technical algorithm dump. That makes it easier for the jury to follow.

**Figure 7.4**: Brand Intelligence and brand discovery output

### 7.8.2 Share of Shelf
Share of Shelf shows how much of a category belongs to the brand. This is one of the strongest features to highlight because it directly expresses market presence.

Keep the explanation simple:
- Green indicates growth.
- Red indicates decline.
- Clicking a category reveals seller-level detail.
- The chart is updated weekly.

### 7.8.3 Price Dispersion
Price Dispersion measures how much prices vary across sellers. This section should remain short, because the reader only needs the purpose and the interpretation.

Suggested formula line:
- Price dispersion = (max price − min price) / min price × 100

### 7.8.4 Distribution Coverage
This view makes the market structure visible through a seller-by-product matrix. It is one of the best places to show that the B2B Market module is not only analytical, but also practical.

Use a small table in the report to explain the cell states:

| Symbol | Meaning |
|---|---|
| ✓ | Product is listed and in stock |
| ✗ | Product is listed but unavailable |
| — | Product is not listed by the seller |

**Table 7.2**: Distribution coverage matrix legend

### 7.8.5 Reviews, Sentiment, and Demand Intelligence
These three views complete the market analysis story.

- Reviews and Sentiment measure customer perception using rating trends and keyword extraction.
- Compare Brands helps the user compare their brand against a competitor.
- Demand Intelligence shows trending searches and zero-result searches, which is useful for identifying unmet demand.

## 7.9 Competitor Discovery Workflow
This workflow is the most technical part of the chapter, so it should be presented with a diagram, a short paragraph, and a compact table.

The user selects a product, then the system sends it to an n8n automation pipeline. The pipeline scores the candidate products, filters obvious mismatches, and asks an AI model to validate the closest results. The objective is to remove manual search effort while still returning a reasoned comparison.

**Figure 7.5**: n8n competitor discovery workflow

| Step | Role | Output |
|---|---|---|
| Webhook | Receives the product and candidate pool | Validated input |
| Pre-processing | Filters and scores candidates | Ranked shortlist |
| AI validation | Confirms the closest matches | Labeled results |
| Guard and fallback | Ensures a result is always returned | Safe final output |
| Response | Sends results to frontend | Match list with explanations |

**Table 7.3**: Workflow node responsibilities

### Scoring logic
Instead of keeping a long criteria dump in the main body, summarize it as weighted matching across four groups:
- Core specifications
- Display and form factor
- Battery, camera, and build
- Software and price proximity

This is enough for a PFE chapter. The detailed criteria can move to an appendix if needed.

### Match types
The AI labels the result using one of four outcomes:
- Direct Match
- Step-Up Alternative
- Budget Alternative
- No Direct Match

## 7.10 Interfaces
This section should be image-driven. The text should only explain what the screenshots prove.

Suggested interface sequence:
- Dashboard
- My Listings
- Competitor Pricing and Stock Monitoring
- Sponsored Products and Banner Ads
- Brand Intelligence
- Competitor Discovery
- Share of Shelf and Distribution Coverage
- Reviews, Sentiment, and Demand Intelligence

For each screenshot, keep one short paragraph describing the purpose and one sentence explaining what the user sees.

## 7.11 Design and Engineering Value
This chapter should not read like a marketing page. It should read like proof that the module solves a real engineering problem.

What makes the chapter stronger:
- It explains the role separation clearly.
- It shows how access is controlled.
- It highlights automation instead of manual work.
- It links UI screens to business decisions.
- It shows that the module is structured, measurable, and extensible.

## 7.12 Conclusion
Sprint 5 completed the B2B workspace and turned it into a usable business module. Company users can monitor pricing, stock, trust, and promotions, while Market users can analyze brand presence, shelf share, distribution, sentiment, and demand gaps. The subscription model and the approval flow ensure controlled access, and the competitor discovery pipeline adds automation and analytical depth.

From a PFE perspective, this chapter should demonstrate three things: a clear functional scope, a coherent technical design, and a visible business impact. That is what makes the B2B module suitable as the face of the project.

## Suggested removals from the original version
- Remove repeated explanations of the same feature in multiple sections.
- Move long scoring criteria lists to an appendix.
- Remove low-value implementation noise such as every internal task detail.
- Avoid duplicating the same chart description in the feature section and the interface section.
- Keep formulas only when they help the jury understand the analysis.

## Suggested additions
- Add one architecture diagram for the B2B module.
- Add one table for role differences and one table for plan differences.
- Add one screenshot per major feature group, not per small variation.
- Add a short subsection on business value and engineering value.
- Add a short defense-preparation note for likely jury questions.

## Likely jury questions
- Why did you split the module into Company and Market roles?
- How is access controlled between Silver and Gold?
- Why is the competitor discovery workflow automated instead of manual?
- What do Share of Shelf and Distribution Coverage actually measure?
- How does the system ensure that users only see their approved B2B data?
- What is the value of the alerts and reports in decision-making?
- Why is the chapter structured around screenshots and tables instead of only text?
