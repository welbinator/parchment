import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import UserMenu from '@/components/UserMenu';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;

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
      {user && (
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
      )}
      <div className="max-w-3xl mx-auto px-6 py-12">
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
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">Actions</h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {[
              'list_collections',
              'create_collection',
              'delete_collection',
              'rename_collection',
              'list_pages',
              'create_page',
              'delete_page',
              'rename_page',
              'get_page',
              'update_blocks',
              'delete_block',
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
            <li><code className="bg-muted px-1 py-0.5 rounded">&lt;a href="url"&gt;link text&lt;/a&gt;</code></li>
            <li><code className="bg-muted px-1 py-0.5 rounded">&lt;span style="color: red"&gt;colored text&lt;/span&gt;</code></li>
          </ul>
          <h3 className="text-lg font-medium mb-2">Example: update_blocks with rich text</h3>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{
    "action": "update_blocks",
    "page_id": "<page_id>",
    "blocks": [
      {
        "id": "<block_id>",
        "type": "text",
        "content": "Here is some <b>bold</b> text, some <i>italic</i> text, and a <a href=\\"https://example.com\\">link</a>.",
        "position": 0
      }
    ]
  }'`}</CodeBlock>
        </section>

        {/* Rename examples */}
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
          <h2 className="text-2xl font-semibold font-display mb-3">delete_block</h2>
          <CodeBlock>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{"action":"delete_block","page_id":"<page_id>","block_id":"<block_id>"}'`}</CodeBlock>
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
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {['text', 'heading1', 'heading2', 'heading3', 'bullet_list', 'numbered_list', 'todo (checkbox)', 'quote', 'divider', 'code'].map((t) => (
              <li key={t} className="border border-border rounded px-3 py-2 font-mono bg-card">{t}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}