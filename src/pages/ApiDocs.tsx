import { useEffect } from 'react';

export default function ApiDocs() {
  useEffect(() => {
    // Redirect to the static HTML version so there's one source of truth
    window.location.replace('/docs/api.html');
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Loading API docs...</p>
    </div>
  );
}
