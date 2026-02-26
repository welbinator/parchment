import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

const API_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/api`;

interface EndpointProps {
  action: string;
  description: string;
  permissions: string[];
  body: Record<string, string>;
  response: string;
}

const ENDPOINTS: EndpointProps[] = [
  {
    action: 'list_collections',
    description: 'List all collections owned by the API key holder.',
    permissions: ['can_read_pages'],
    body: {},
    response: `{ "collections": [{ "id": "uuid", "name": "My Collection", "icon": null, "position": 0, "created_at": "..." }] }`,
  },
  {
    action: 'create_collection',
    description: 'Create a new collection.',
    permissions: ['can_create_collections'],
    body: { name: 'string (optional, defaults to "Untitled")' },
    response: `{ "collection": { "id": "uuid", "name": "My Collection", ... } }`,
  },
  {
    action: 'delete_collection',
    description: 'Delete a collection and all its pages.',
    permissions: ['can_delete_collections'],
    body: { collection_id: 'uuid (required)' },
    response: `{ "success": true }`,
  },
  {
    action: 'list_pages',
    description: 'List pages, optionally filtered by collection.',
    permissions: ['can_read_pages'],
    body: { collection_id: 'uuid (optional)' },
    response: `{ "pages": [{ "id": "uuid", "title": "My Page", "type": "blank", "collection_id": "uuid", ... }] }`,
  },
  {
    action: 'create_page',
    description: 'Create a new page in a collection.',
    permissions: ['can_create_pages'],
    body: { collection_id: 'uuid (required)', title: 'string (optional)', type: '"blank" | "notes" | "checklist" | "roadmap" (optional)' },
    response: `{ "page": { "id": "uuid", "title": "My Page", ... } }`,
  },
  {
    action: 'delete_page',
    description: 'Delete a page and all its blocks.',
    permissions: ['can_delete_pages'],
    body: { page_id: 'uuid (required)' },
    response: `{ "success": true }`,
  },
  {
    action: 'get_page',
    description: 'Get a page with all its blocks.',
    permissions: ['can_read_pages'],
    body: { page_id: 'uuid (required)' },
    response: `{ "page": { ... }, "blocks": [{ "id": "uuid", "type": "text", "content": "...", "position": 0, ... }] }`,
  },
  {
    action: 'update_blocks',
    description: 'Create or update blocks on a page. Max 10KB per block.',
    permissions: ['can_write_blocks'],
    body: { page_id: 'uuid (required)', blocks: 'array of { id?, type, content, checked?, position }' },
    response: `{ "success": true }`,
  },
  {
    action: 'delete_block',
    description: 'Delete a single block from a page.',
    permissions: ['can_write_blocks'],
    body: { page_id: 'uuid (required)', block_id: 'uuid (required)' },
    response: `{ "success": true }`,
  },
];

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-[hsl(225_14%_8%)] border border-border rounded-lg p-4 overflow-x-auto text-sm font-mono text-foreground leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded bg-accent/80 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} className="text-muted-foreground" />}
      </button>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointProps }) {
  const [open, setOpen] = useState(false);
  const curlExample = `curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key_here" \\
  -d '${JSON.stringify({ action: endpoint.action, ...Object.fromEntries(Object.keys(endpoint.body).map(k => [k, `<${k}>`])) })}'`;

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        {open ? <ChevronDown size={16} className="text-muted-foreground shrink-0" /> : <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
        <code className="text-sm font-mono font-semibold text-primary">{endpoint.action}</code>
        <span className="text-sm text-muted-foreground">{endpoint.description}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Required permissions</p>
            <div className="flex gap-1.5">
              {endpoint.permissions.map(p => (
                <span key={p} className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">{p}</span>
              ))}
            </div>
          </div>
          {Object.keys(endpoint.body).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Request body</p>
              <div className="text-sm font-mono space-y-0.5">
                {Object.entries(endpoint.body).map(([k, v]) => (
                  <div key={k}><span className="text-foreground">{k}</span><span className="text-muted-foreground">: {v}</span></div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Example</p>
            <CodeBlock code={curlExample} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Response</p>
            <CodeBlock code={endpoint.response} lang="json" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold font-display text-foreground mb-3">
            <span className="text-gradient-primary">Parchment</span> API
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Programmatically manage your collections, pages, and blocks. Perfect for bots, CLI tools, and integrations.
          </p>
        </div>

        {/* Auth section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold font-display text-foreground mb-4">Authentication</h2>
          <p className="text-sm text-muted-foreground mb-4">
            All requests require an API key passed via the <code className="px-1.5 py-0.5 rounded bg-accent font-mono text-xs text-foreground">x-api-key</code> header.
            Generate keys from <strong>Settings → API Keys</strong> in your Parchment account.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Each key has granular permissions. A request will return <code className="px-1.5 py-0.5 rounded bg-accent font-mono text-xs text-foreground">403</code> if the key lacks the required permission.
          </p>

          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Available permissions</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {['can_read_pages', 'can_create_collections', 'can_delete_collections', 'can_create_pages', 'can_delete_pages', 'can_write_blocks'].map(p => (
                <span key={p} className="text-[11px] px-2 py-1 rounded bg-accent font-mono text-foreground">{p}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Base URL */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold font-display text-foreground mb-4">Base URL</h2>
          <p className="text-sm text-muted-foreground mb-3">
            All requests are <code className="px-1.5 py-0.5 rounded bg-accent font-mono text-xs text-foreground">POST</code> to a single endpoint:
          </p>
          <CodeBlock code={API_BASE} />
          <p className="text-sm text-muted-foreground mt-3">
            The <code className="px-1.5 py-0.5 rounded bg-accent font-mono text-xs text-foreground">action</code> field in the JSON body determines the operation.
          </p>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold font-display text-foreground mb-4">Endpoints</h2>
          <div className="space-y-2">
            {ENDPOINTS.map(ep => (
              <EndpointCard key={ep.action} endpoint={ep} />
            ))}
          </div>
        </section>

        {/* Quick start */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold font-display text-foreground mb-4">Quick Start</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Here's a complete example — list your collections, create a page, and write content to it:
          </p>
          <CodeBlock code={`# 1. List collections
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
  ]}'`} />
        </section>

        {/* Errors */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold font-display text-foreground mb-4">Error Codes</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-accent/30 text-left">
                  <th className="px-4 py-2 font-medium text-muted-foreground">Code</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-2 font-mono text-foreground">401</td><td className="px-4 py-2 text-muted-foreground">Missing or invalid API key</td></tr>
                <tr><td className="px-4 py-2 font-mono text-foreground">403</td><td className="px-4 py-2 text-muted-foreground">Key lacks required permission</td></tr>
                <tr><td className="px-4 py-2 font-mono text-foreground">404</td><td className="px-4 py-2 text-muted-foreground">Resource not found or not owned by key holder</td></tr>
                <tr><td className="px-4 py-2 font-mono text-foreground">400</td><td className="px-4 py-2 text-muted-foreground">Bad request or unknown action</td></tr>
                <tr><td className="px-4 py-2 font-mono text-foreground">413</td><td className="px-4 py-2 text-muted-foreground">Block content exceeds 10KB size limit</td></tr>
                <tr><td className="px-4 py-2 font-mono text-foreground">429</td><td className="px-4 py-2 text-muted-foreground">Rate limit exceeded (60/min or 1000/day)</td></tr>
                <tr><td className="px-4 py-2 font-mono text-foreground">500</td><td className="px-4 py-2 text-muted-foreground">Internal server error</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground pb-8">
          <a href="https://theparchment.app" className="hover:text-primary transition-colors inline-flex items-center gap-1">
            ← Back to Parchment <ExternalLink size={10} />
          </a>
        </footer>
      </div>
    </div>
  );
}
