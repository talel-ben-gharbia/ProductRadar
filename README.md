# ProductRdar

## Admin Manual Scraping (n8n)

The admin UI now supports real manual scraping triggers.

Flow:
1. Open Admin > Data Management > Manual Scraping.
2. Select seller.
3. Select category.
4. URL is auto-resolved from `category_link` when available.
5. Override with a manual URL when needed.
6. Trigger the request, which calls backend endpoint `/admin/api/scraping/manual/trigger`.
7. Backend forwards the request to n8n webhook defined by `N8N_MANUAL_SCRAPE_WEBHOOK_URL`.

Backend env requirements:
- `ADMIN_API_KEY`
- `WEBHOOK_API_KEY`
- `N8N_MANUAL_SCRAPE_WEBHOOK_URL`

If `N8N_MANUAL_SCRAPE_WEBHOOK_URL` is not configured, manual trigger returns a clear error instead of silently failing.
