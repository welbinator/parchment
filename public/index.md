# Parchment

**Your thoughts. Programmable.**

Parchment is a fast, minimal notebook with a full REST API. Write notes like a human, automate them like a developer. Built for the agentic web.

## What it is

- A self-hosted Notion alternative with a clean, simple interface
- A full REST API accessible with a single API key — no OAuth, no pagination nightmares
- Agent-ready out of the box: supports `llms.txt`, markdown content negotiation, and agent skill discovery
- Free forever with a Pro plan at $4.99/month for unlimited everything

## Key features

- **Full REST API** — every note, page, and collection accessible via one POST endpoint
- **Multiple workspaces** — Personal, Work, and more
- **Collections & Pages** — organize notes into collections with full CRUD via API
- **Chrome Extension** — save pages and clips from anywhere in your browser
- **Granular API Keys** — read-only, write-only, or full access with optional expiration dates
- **Realtime sync** — live updates across all devices and tabs
- **Privacy first** — IPs stored as SHA-256 hashes, API keys encrypted with AES-256-GCM
- **Agent-ready** — `llms.txt`, `Accept: text/markdown` content negotiation, agent skill discovery

## Pricing

| Plan | Price | Workspaces | Collections | Pages |
|------|-------|-----------|------------|-------|
| Free | $0/forever | 2 | 5 | 15 |
| Pro  | $4.99/month | Unlimited | Unlimited | Unlimited |

## Quick start

```bash
# Create a page via API
curl -X POST https://theparchment.app/functions/v1/api \
  -H "x-api-key: YOUR_KEY" \
  -d '{"action":"create_page","collection_id":"...","title":"My Note"}'

# Get clean markdown back
curl -X POST https://theparchment.app/functions/v1/api \
  -H "x-api-key: YOUR_KEY" \
  -H "Accept: text/markdown" \
  -d '{"action":"get_page","page_id":"..."}'
```

## Links

- **App**: https://theparchment.app/auth
- **API Documentation**: https://theparchment.app/docs/api
- **Changelog**: https://theparchment.app/changelog
- **llms.txt**: https://theparchment.app/llms.txt
- **API Catalog**: https://theparchment.app/.well-known/api-catalog
