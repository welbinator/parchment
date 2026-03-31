#!/bin/bash
# Regenerate Supabase types from the live DB schema.
# Run this locally before deploying whenever you've added DB columns/tables.
# Usage: ./scripts/gen-types.sh

set -e

SSH_KEY="/home/james/.openclaw/workspace/parchment-hetzner"
SERVER="root@168.119.121.111"

echo "🔍 Fetching DB IP..."
DB_IP=$(ssh -i "$SSH_KEY" "$SERVER" \
  "docker inspect supabase-db --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'")

echo "📦 Generating types from $DB_IP..."
ssh -i "$SSH_KEY" "$SERVER" \
  "npx supabase gen types typescript \
    --db-url 'postgresql://supabase_admin:BXfEJe5sYzr4WyOSSxSUVSjXXk@${DB_IP}:5432/postgres' 2>/dev/null" \
  > src/integrations/supabase/types.ts

echo "✅ Types written to src/integrations/supabase/types.ts ($(wc -l < src/integrations/supabase/types.ts) lines)"
