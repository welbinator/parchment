import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import UserMenu from '@/components/UserMenu';
import PublicNav from '@/components/PublicNav';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;

const CURL_REORDER_COLLECTIONS =
  `curl -X POST ${API_BASE} \
  -H "Content-Type: application/json" \
  -H "x-api-key: pmt_your_key" \
  -d '{
    "action": "reorder_collections",
    "collection_ids": ["<id_first>", "<id_second>", "<id_third>"]
  }'`;

const CURL_MOVE_PAGE =
  `curl -X POST ${API_BASE} \
  -H "Content-Type: application/json" \
  -H "x-api-key: pmt_your_key" \
  -d '{"action":"move_page","page_id":"<page_id>","collection_id":"<target_collection_id>"}'`;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-muted border border-border rounded-lg p-3 text-sm overflow-x-auto"><code>{children}</code></pre>
  );
}

export default function ApiDocs() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background text-foreground">
      {user ? (
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
          <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} />
              Back to workspace
            </button>
            <UserMenu />
          </div>
        </div>
      ) : (
        <PublicNav />
      )}
      <div className={`max-w-3xl mx-auto px-6 py-12 ${!user ? 'pt-28' : ''}`}>
        <header className="mb-10">
          <h1 className="text-4xl font-bold font-display mb-3">Parchment API</h1>
          <p className="text-muted-foreground">Programmatically manage your collections, pages, and blocks.</p>
        </header>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">Base URL</h2>
          <CodeBlock>{API_BASE}</CodeBlock>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">Authentication</h2>
          <p className="text-muted-foreground mb-2">All requests require an <code className="bg-muted px-1 py-0.5 rounded">x-api-key</code> header.</p>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{"action":"list_collections"}'`}</CodeBlock>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">Rate Limits</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>60 requests/minute per API key</li>
            <li>1000 requests/day per API key</li>
            <li>10KB max content per block</li>
            <li>Free plan accounts are limited to 5 collections. <code className="bg-muted px-1 py-0.5 rounded">create_collection</code> returns HTTP 402 when the limit is reached.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">Actions</h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {[
              'list_workspaces',
              'create_workspace',
              'rename_workspace',
              'delete_workspace',
              'list_collections',
              'create_collection',
              'delete_collection',
              'rename_collection',
              'reorder_collections',
              'list_pages',
              'create_page',
              'delete_page',
              'rename_page',
              'move_page',
              'get_page',
              'append_blocks',
              'insert_blocks',
              'update_block',
              'replace_blocks',
              'update_blocks (alias for append_blocks)',
              'delete_block',
              'delete_group',
              'share_page',
              'move_collection',
            ].map((action) => (
              <li key={action} className="border border-border rounded px-3 py-2 font-mono bg-card">{action}</li>
            ))}
          </ul>
        </section>

        {/* Rich text format */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">Block Content Format</h2>
          <p className="text-muted-foreground mb-3">
            Block content is stored as <strong>HTML strings</strong>, not JSON. Use standard HTML tags for formatting:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
            <li><code className="bg-muted px-1 py-0.5 rounded">&lt;b&gt;bold&lt;/b&gt;</code> or <code className="bg-muted px-1 py-0.5 rounded">&lt;strong&gt;bold&lt;/strong&gt;</code></li>
            <li><code className="bg-muted px-1 py-0.5 rounded">&lt;i&gt;italic&lt;/i&gt;</code> or <code className="bg-muted px-1 py-0.5 rounded">&lt;em&gt;italic&lt;/em&gt;</code></li>
            <li><code className="bg-muted px-1 py-0.5 rounded">&lt;s&gt;strikethrough&lt;/s&gt;</code> or <code className="bg-muted px-1 py-0.5 rounded">&lt;del&gt;strikethrough&lt;/del&gt;</code></li>
            <li><code className="bg-muted px-1 py-0.5 rounded">&lt;a href="url"&gt;link text&lt;/a&gt;</code></li>
            <li><code className="bg-muted px-1 py-0.5 rounded">&lt;span style="color: red"&gt;colored text&lt;/span&gt;</code></li>
          </ul>
          <h3 className="text-lg font-medium mb-2">Example: append_blocks (adds to end of page)</h3>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{
    "action": "append_blocks",
    "page_id": "<page_id>",
    "blocks": [
      {
        "type": "text",
        "content": "Here is some <b>bold</b> text, some <i>italic</i> text, and a <a href=\\"https://example.com\\">link</a>."
      }
    ]
  }'`}</CodeBlock>

          <h3 className="text-lg font-medium mt-4 mb-2">Example: replace_blocks (rewrites entire page)</h3>
          <p className="text-muted-foreground mb-3 text-sm">
            Use <code className="bg-muted px-1 py-0.5 rounded">replace_blocks</code> when you want to fully rewrite a page's content. It deletes all existing blocks first, then writes the new ones in array order. This is the safest way to avoid ordering issues.
          </p>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{
    "action": "replace_blocks",
    "page_id": "<page_id>",
    "blocks": [
      { "type": "heading1", "content": "My Page Title" },
      { "type": "text", "content": "First paragraph." },
      { "type": "divider" },
      { "type": "text", "content": "Second paragraph." }
    ]
  }'`}</CodeBlock>
          <p className="text-muted-foreground mt-2 text-sm">
            <strong>Note:</strong> <code className="bg-muted px-1 py-0.5 rounded">update_blocks</code> is kept as an alias for <code className="bg-muted px-1 py-0.5 rounded">append_blocks</code> for backwards compatibility.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            <strong>Response shape difference:</strong> <code className="bg-muted px-1 py-0.5 rounded">append_blocks</code> returns the full <code className="bg-muted px-1 py-0.5 rounded">blocks</code> array in its response. <code className="bg-muted px-1 py-0.5 rounded">replace_blocks</code> returns only <code className="bg-muted px-1 py-0.5 rounded">{`{success, mode, blocks_written}`}</code> — no block data echoed back. Use <code className="bg-muted px-1 py-0.5 rounded">get_page</code> after <code className="bg-muted px-1 py-0.5 rounded">replace_blocks</code> if you need the block IDs.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            <strong>New pages start with a blank block:</strong> Every newly created page automatically gets an empty <code className="bg-muted px-1 py-0.5 rounded">text</code> block at position 0. <code className="bg-muted px-1 py-0.5 rounded">replace_blocks</code> removes it; <code className="bg-muted px-1 py-0.5 rounded">append_blocks</code> leaves it in place.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">insert_blocks</h2>
          <p className="text-muted-foreground mb-3">
            Insert new blocks at a specific position in the page. Pass <code className="bg-muted px-1 py-0.5 rounded">after_block_id</code> to insert after a known block, or <code className="bg-muted px-1 py-0.5 rounded">position</code> (0-based integer) to insert at a specific index. All existing blocks at or after the insert point shift down automatically.
          </p>
          <CodeBlock>{`curl -X POST \${API_BASE} \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "insert_blocks",
    "page_id": "PAGE_ID",
    "after_block_id": "BLOCK_ID",
    "blocks": [
      {"type": "text", "content": "Inserted between existing blocks"}
    ]
  }'`}</CodeBlock>
          <p className="text-muted-foreground text-sm mt-2">Use <code className="bg-muted px-1 py-0.5 rounded">get_page</code> to retrieve block IDs, then pass the ID of the block you want to insert after.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">update_block</h2>
          <p className="text-muted-foreground mb-3">
            Update a single existing block in-place by its ID. Patches only the fields you provide — position is never changed. Useful for correcting content or changing a block&apos;s type without rewriting the whole page.
          </p>
          <CodeBlock>{`curl -X POST \${API_BASE} \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "update_block",
    "page_id": "PAGE_ID",
    "block_id": "BLOCK_ID",
    "content": "Updated content here",
    "type": "heading2"
  }'`}</CodeBlock>
          <p className="text-muted-foreground text-sm mt-2">Updatable fields: <code className="bg-muted px-1 py-0.5 rounded">content</code>, <code className="bg-muted px-1 py-0.5 rounded">type</code>, <code className="bg-muted px-1 py-0.5 rounded">checked</code>, <code className="bg-muted px-1 py-0.5 rounded">indent_level</code>. Only pass fields you want to change.</p>
        </section>

        {/* Rename examples */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">Workspaces</h2>
          <p className="text-muted-foreground mb-3">
            Workspaces are the top-level containers above collections. Workspace actions require a <strong>Master Key</strong> with <code className="bg-muted px-1 py-0.5 rounded">can_manage_workspaces</code> enabled (except <code className="bg-muted px-1 py-0.5 rounded">list_workspaces</code> which any key can use).
          </p>
          <CodeBlock>{`# List all workspaces
curl -X POST ${API_BASE} \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "list_workspaces"}'`}</CodeBlock>
          <CodeBlock>{`# Create a workspace (requires can_manage_workspaces)
curl -X POST ${API_BASE} \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "create_workspace", "name": "My Workspace"}'`}</CodeBlock>
          <CodeBlock>{`# Rename a workspace (requires can_manage_workspaces)
curl -X POST ${API_BASE} \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "rename_workspace", "workspace_id": "WORKSPACE_ID", "name": "New Name"}'`}</CodeBlock>
          <CodeBlock>{`# Delete a workspace (requires can_manage_workspaces)
curl -X POST ${API_BASE} \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "delete_workspace", "workspace_id": "WORKSPACE_ID"}'`}</CodeBlock>
          <p className="text-muted-foreground text-sm mt-2"><code className="bg-muted px-1 py-0.5 rounded">workspace_name</code> is supported on <code className="bg-muted px-1 py-0.5 rounded">create_collection</code>, <code className="bg-muted px-1 py-0.5 rounded">move_collection</code>, <code className="bg-muted px-1 py-0.5 rounded">rename_workspace</code>, and <code className="bg-muted px-1 py-0.5 rounded">delete_workspace</code>. It does partial, case-insensitive matching — &quot;work&quot; matches &quot;Work Stuff&quot;. Multiple matches return a 409 with the full list. Omitting it on <code className="bg-muted px-1 py-0.5 rounded">create_collection</code> defaults to the first workspace.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">move_collection</h2>
          <p className="text-muted-foreground mb-3">
            Move a collection to a different workspace. Requires a Master Key with <code className="bg-muted px-1 py-0.5 rounded">can_manage_workspaces</code>. Accepts <code className="bg-muted px-1 py-0.5 rounded">workspace_id</code> or <code className="bg-muted px-1 py-0.5 rounded">workspace_name</code> (partial match).
          </p>
          <CodeBlock>{`curl -X POST \${API_BASE} \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "move_collection", "collection_id": "COLLECTION_ID", "workspace_name": "work"}'`}</CodeBlock>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">rename_page</h2>
          <p className="text-muted-foreground mb-2">Rename an existing page. Requires <code className="bg-muted px-1 py-0.5 rounded">can_create_pages</code> permission.</p>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{"action":"rename_page","page_id":"<page_id>","title":"My New Title"}'`}</CodeBlock>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">rename_collection</h2>
          <p className="text-muted-foreground mb-2">Rename an existing collection. Requires <code className="bg-muted px-1 py-0.5 rounded">can_create_collections</code> permission.</p>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{"action":"rename_collection","collection_id":"<collection_id>","name":"My Collection"}'`}</CodeBlock>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">reorder_collections</h2>
          <p className="text-muted-foreground mb-2">Set the display order of collections by passing an ordered array of IDs. Requires <code className="bg-muted px-1 py-0.5 rounded">can_create_collections</code> permission.</p>
          <CodeBlock>{CURL_REORDER_COLLECTIONS}</CodeBlock>
          <p className="text-muted-foreground mt-2 text-sm">Collections are assigned positions 0, 1, 2... in the order you provide.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">move_page</h2>
          <p className="text-muted-foreground mb-2">Move a page to a different collection. Requires <code className="bg-muted px-1 py-0.5 rounded">can_create_pages</code> permission.</p>
          <CodeBlock>{CURL_MOVE_PAGE}</CodeBlock>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">delete_block</h2>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{"action":"delete_block","page_id":"<page_id>","block_id":"<block_id>"}'`}</CodeBlock>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">Group Blocks</h2>
          <p className="text-muted-foreground mb-3">
            A <code className="bg-muted px-1 py-0.5 rounded">group</code> block is a container — like a <code className="bg-muted px-1 py-0.5 rounded">&lt;div&gt;</code> in HTML — that holds child blocks together. Deleting a group deletes all its children in one operation.
          </p>
          <h3 className="text-lg font-medium mb-2">Create a group with child blocks</h3>
          <p className="text-muted-foreground mb-2 text-sm">First create the group block, then append child blocks with <code className="bg-muted px-1 py-0.5 rounded">group_id</code> set to the group's id.</p>
          <CodeBlock>{`# Step 1: create the group block
curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{
    "action": "append_blocks",
    "page_id": "<page_id>",
    "blocks": [{ "type": "group", "content": "" }]
  }'
# → returns { "blocks": [{ "id": "<group_id>", "type": "group", ... }] }

# Step 2: add children using the returned group id
curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{
    "action": "append_blocks",
    "page_id": "<page_id>",
    "blocks": [
      { "type": "text", "content": "Email: user@example.com", "group_id": "<group_id>" },
      { "type": "text", "content": "Date: 2026-03-28", "group_id": "<group_id>" },
      { "type": "text", "content": "Message: Great app!", "group_id": "<group_id>" }
    ]
  }'`}</CodeBlock>
          <h3 className="text-lg font-medium mt-4 mb-2">Delete a group (and all its children)</h3>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{"action":"delete_group","page_id":"<page_id>","group_block_id":"<group_id>"}'`}</CodeBlock>
        </section>

        {/* Data export */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">share_page</h2>
          <p className="text-muted-foreground mb-3">
            Share a page publicly (anyone with the link) or privately (specific Parchment users by email). All fields are optional — only the ones you pass are changed. Requires <code className="bg-muted px-1 py-0.5 rounded">can_create_pages</code> permission.
          </p>
          <h3 className="text-lg font-medium mb-2">Enable public sharing</h3>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{
    "action": "share_page",
    "page_id": "<page_id>",
    "enabled": true,
    "mode": "public"
  }'`}</CodeBlock>
          <p className="text-muted-foreground mt-2 text-sm">The response includes <code className="bg-muted px-1 py-0.5 rounded">share_url</code> — the link you can hand to someone.</p>

          <h3 className="text-lg font-medium mt-4 mb-2">Share privately with specific people</h3>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{
    "action": "share_page",
    "page_id": "<page_id>",
    "enabled": true,
    "mode": "private",
    "add_emails": ["friend@example.com", "colleague@example.com"]
  }'`}</CodeBlock>
          <p className="text-muted-foreground mt-2 text-sm">Private shares require the recipient to have a Parchment account. They'll be prompted to sign in when visiting the link.</p>

          <h3 className="text-lg font-medium mt-4 mb-2">Remove someone from a private share</h3>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{
    "action": "share_page",
    "page_id": "<page_id>",
    "remove_emails": ["friend@example.com"]
  }'`}</CodeBlock>

          <h3 className="text-lg font-medium mt-4 mb-2">Disable sharing (revoke access)</h3>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{"action":"share_page","page_id":"<page_id>","enabled":false}'`}</CodeBlock>

          <h3 className="text-lg font-medium mt-4 mb-2">Response fields</h3>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 text-sm">
            <li><code className="bg-muted px-1 py-0.5 rounded">share_enabled</code> — whether sharing is currently on</li>
            <li><code className="bg-muted px-1 py-0.5 rounded">share_mode</code> — <code className="bg-muted px-1 py-0.5 rounded">"public"</code> or <code className="bg-muted px-1 py-0.5 rounded">"private"</code></li>
            <li><code className="bg-muted px-1 py-0.5 rounded">share_token</code> — UUID token used in the share URL</li>
            <li><code className="bg-muted px-1 py-0.5 rounded">shared_with_emails</code> — array of invited emails (private mode)</li>
            <li><code className="bg-muted px-1 py-0.5 rounded">share_url</code> — full URL to share, or <code className="bg-muted px-1 py-0.5 rounded">null</code> if never enabled</li>
          </ul>
        </section>

        {/* Data export */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">Data Export</h2>
          <p className="text-muted-foreground mb-3">
            You can export all your data using the API. Use <code className="bg-muted px-1 py-0.5 rounded">list_collections</code> to get all collections, then <code className="bg-muted px-1 py-0.5 rounded">list_pages</code> for each collection, and <code className="bg-muted px-1 py-0.5 rounded">get_page</code> for each page (which includes all blocks). Here's an example script:
          </p>
          <CodeBlock>{`# Export all data
API="${API_BASE}"
KEY="pmt_your_key"

# 1. Get all collections
collections=$(curl -s -X POST $API \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $KEY" \\
  -d '{"action":"list_collections"}')

echo "$collections" > export_collections.json

# 2. For each collection, get pages
# Parse collection IDs and loop:
# curl ... -d '{"action":"list_pages","collection_id":"<id>"}'

# 3. For each page, get full content (includes blocks)
# curl ... -d '{"action":"get_page","page_id":"<id>"}'

# The get_page response includes:
# { "page": { ... }, "blocks": [ { "id", "type", "content", "position", ... } ] }`}</CodeBlock>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">Block Types</h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm mb-6">
            {['text', 'heading1', 'heading2', 'heading3', 'bullet_list', 'numbered_list', 'todo (checkbox)', 'quote', 'divider', 'code', 'group'].map((t) => (
              <li key={t} className="border border-border rounded px-3 py-2 font-mono bg-card">{t}</li>
            ))}
          </ul>

          <h3 className="text-lg font-medium mb-2">Block Fields</h3>
          <p className="text-muted-foreground text-sm mb-3">All blocks support these fields when using <code className="bg-muted px-1 py-0.5 rounded">append_blocks</code> or <code className="bg-muted px-1 py-0.5 rounded">replace_blocks</code>:</p>
          <ul className="space-y-2 text-sm text-muted-foreground mb-4">
            <li><code className="bg-muted px-1 py-0.5 rounded text-foreground">type</code> — block type (see list above)</li>
            <li><code className="bg-muted px-1 py-0.5 rounded text-foreground">content</code> — text content (plain string)</li>
            <li><code className="bg-muted px-1 py-0.5 rounded text-foreground">checked</code> — boolean, for <code className="bg-muted px-1 py-0.5 rounded">todo</code> blocks only</li>
            <li><code className="bg-muted px-1 py-0.5 rounded text-foreground">indent_level</code> — integer 0–4, for <code className="bg-muted px-1 py-0.5 rounded">numbered_list</code> and <code className="bg-muted px-1 py-0.5 rounded">bullet_list</code> blocks. Controls nesting depth. Level 0 = top-level (1, 2, 3), level 1 = letters (a, b, c), level 2+ = roman numerals (i, ii, iii). Defaults to 0.</li>
          </ul>
          <h3 className="text-lg font-medium mb-2">Nested list example</h3>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{
    "action": "replace_blocks",
    "page_id": "<page_id>",
    "blocks": [
      { "type": "numbered_list", "content": "Top level item", "indent_level": 0 },
      { "type": "numbered_list", "content": "Sub-item", "indent_level": 1 },
      { "type": "numbered_list", "content": "Sub-sub-item", "indent_level": 2 }
    ]
  }'`}</CodeBlock>
        </section>
      </div>
    </main>
  );
}