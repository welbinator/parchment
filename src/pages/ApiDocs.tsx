const API_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/api`;

export default function ApiDocs() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-bold font-display mb-3">Parchment API</h1>
          <p className="text-muted-foreground">Programmatically manage your collections, pages, and blocks.</p>
        </header>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">Base URL</h2>
          <pre className="bg-muted border border-border rounded-lg p-3 text-sm overflow-x-auto"><code>{API_BASE}</code></pre>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">Authentication</h2>
          <p className="text-muted-foreground">All requests require an <code className="bg-muted px-1 py-0.5 rounded">x-api-key</code> header.</p>
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
              'list_pages',
              'create_page',
              'delete_page',
              'get_page',
              'update_blocks',
              'delete_block',
            ].map((action) => (
              <li key={action} className="border border-border rounded px-3 py-2 font-mono bg-card">{action}</li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold font-display mb-3">delete_block example</h2>
          <pre className="bg-muted border border-border rounded-lg p-3 text-sm overflow-x-auto"><code>{`curl -X POST ${API_BASE} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pmt_your_key" \\
  -d '{"action":"delete_block","page_id":"<page_id>","block_id":"<block_id>"}'`}</code></pre>
        </section>
      </div>
    </main>
  );
}
