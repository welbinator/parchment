const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const API_BASE = `https://${Deno.env.get('SUPABASE_URL')?.replace('https://', '')}/functions/v1/api`

const markdown = `# Parchment API Documentation

Programmatically manage your collections, pages, and blocks. Perfect for bots, CLI tools, and integrations.

## Authentication

All requests require an API key passed via the \`x-api-key\` header.
Generate keys from **Settings → API Keys** in your Parchment account.

Each key has granular permissions. A request will return \`403\` if the key lacks the required permission.

### Available permissions

- \`can_read_pages\` — Read collections, pages, and blocks
- \`can_create_collections\` — Create new collections
- \`can_delete_collections\` — Delete collections
- \`can_create_pages\` — Create new pages
- \`can_delete_pages\` — Delete pages
- \`can_write_blocks\` — Create, update, and delete blocks

## Base URL

All requests are \`POST\` to a single endpoint:

\`\`\`
${API_BASE}
\`\`\`

The \`action\` field in the JSON body determines the operation.

## Rate Limits

- **60 requests per minute** per API key
- **1,000 requests per day** per API key
- Exceeding limits returns \`429 Too Many Requests\` with a \`Retry-After\` header

## Endpoints

### list_collections

List all collections owned by the API key holder.

- **Permission:** \`can_read_pages\`
- **Body:** \`{ "action": "list_collections" }\`
- **Response:** \`{ "collections": [{ "id": "uuid", "name": "My Collection", "icon": null, "position": 0, "created_at": "..." }] }\`

### create_collection

Create a new collection.

- **Permission:** \`can_create_collections\`
- **Body:** \`{ "action": "create_collection", "name": "My Collection" }\`
  - \`name\` — string (optional, defaults to "Untitled")
- **Response:** \`{ "collection": { "id": "uuid", "name": "My Collection", ... } }\`

### delete_collection

Delete a collection and all its pages.

- **Permission:** \`can_delete_collections\`
- **Body:** \`{ "action": "delete_collection", "collection_id": "uuid" }\`
  - \`collection_id\` — uuid (required)
- **Response:** \`{ "success": true }\`

### list_pages

List pages, optionally filtered by collection.

- **Permission:** \`can_read_pages\`
- **Body:** \`{ "action": "list_pages", "collection_id": "uuid" }\`
  - \`collection_id\` — uuid (optional)
- **Response:** \`{ "pages": [{ "id": "uuid", "title": "My Page", "type": "blank", "collection_id": "uuid", ... }] }\`

### create_page

Create a new page in a collection.

- **Permission:** \`can_create_pages\`
- **Body:** \`{ "action": "create_page", "collection_id": "uuid", "title": "My Page", "type": "blank" }\`
  - \`collection_id\` — uuid (required)
  - \`title\` — string (optional)
  - \`type\` — "blank" | "notes" | "checklist" | "roadmap" (optional)
- **Response:** \`{ "page": { "id": "uuid", "title": "My Page", ... } }\`

### delete_page

Delete a page and all its blocks.

- **Permission:** \`can_delete_pages\`
- **Body:** \`{ "action": "delete_page", "page_id": "uuid" }\`
  - \`page_id\` — uuid (required)
- **Response:** \`{ "success": true }\`

### get_page

Get a page with all its blocks.

- **Permission:** \`can_read_pages\`
- **Body:** \`{ "action": "get_page", "page_id": "uuid" }\`
  - \`page_id\` — uuid (required)
- **Response:** \`{ "page": { ... }, "blocks": [{ "id": "uuid", "type": "text", "content": "...", "position": 0, ... }] }\`

### update_blocks

Create or update blocks on a page. Max 10KB per block.

- **Permission:** \`can_write_blocks\`
- **Body:** \`{ "action": "update_blocks", "page_id": "uuid", "blocks": [...] }\`
  - \`page_id\` — uuid (required)
  - \`blocks\` — array of \`{ id?, type, content, checked?, position }\`
- **Response:** \`{ "success": true }\`

### delete_block

Delete a single block from a page.

- **Permission:** \`can_write_blocks\`
- **Body:** \`{ "action": "delete_block", "page_id": "uuid", "block_id": "uuid" }\`
  - \`page_id\` — uuid (required)
  - \`block_id\` — uuid (required)
- **Response:** \`{ "success": true }\`

## Block Types

- \`text\` — Plain text paragraph
- \`heading1\` — Large heading
- \`heading2\` — Medium heading
- \`heading3\` — Small heading
- \`bullet_list\` — Bulleted list item
- \`numbered_list\` — Numbered list item
- \`todo\` — Checkbox item (use \`checked: true/false\`)
- \`quote\` — Block quote
- \`divider\` — Horizontal divider
- \`code\` — Code block

## Quick Start

\`\`\`bash
# 1. List collections
curl -s -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{"action": "list_collections"}'

# 2. Create a page in a collection
curl -s -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{"action": "create_page", "collection_id": "<id>", "title": "Bot Notes"}'

# 3. Write blocks to the page
curl -s -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{"action": "update_blocks", "page_id": "<id>", "blocks": [
    {"type": "heading1", "content": "Hello from the API", "position": 0},
    {"type": "text", "content": "This was created programmatically.", "position": 1}
  ]}'

# 4. Delete a block
curl -s -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{"action": "delete_block", "page_id": "<id>", "block_id": "<block_id>"}'
\`\`\`

## Error Codes

| Code | Meaning |
|------|---------|
| 401  | Missing or invalid API key |
| 403  | Key lacks required permission |
| 404  | Resource not found or not owned by key holder |
| 400  | Bad request or unknown action |
| 413  | Block content exceeds 10KB size limit |
| 429  | Rate limit exceeded (60/min or 1000/day) |
| 500  | Internal server error |
`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const accept = req.headers.get('accept') || ''
  const url = new URL(req.url)
  const format = url.searchParams.get('format')

  // Return markdown for bots/plain requests, or when explicitly requested
  if (format === 'markdown' || format === 'md' || !accept.includes('text/html')) {
    return new Response(markdown, {
      headers: { ...corsHeaders, 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  // For browser requests, redirect to the SPA docs page
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, 'Location': '/docs/api' },
  })
})
