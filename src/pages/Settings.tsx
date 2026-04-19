import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Copy, Check, Key, Shield, Download, Loader2, FlaskConical, Puzzle, Crown, Layers } from 'lucide-react';
import { toast } from 'sonner';

type KeyType = 'master' | 'workspace';

interface DbWorkspace {
  id: string;
  name: string;
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key_type: KeyType;
  workspace_ids: string[] | null;
  can_manage_workspaces: boolean;
  can_create_collections: boolean;
  can_delete_collections: boolean;
  can_create_pages: boolean;
  can_delete_pages: boolean;
  can_read_pages: boolean;
  can_write_blocks: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked: boolean;
}

const MASTER_KEY_PERMISSIONS = [
  { key: 'can_read_pages', label: 'Read pages & blocks' },
  { key: 'can_create_collections', label: 'Create collections' },
  { key: 'can_delete_collections', label: 'Delete collections' },
  { key: 'can_create_pages', label: 'Create pages' },
  { key: 'can_delete_pages', label: 'Delete pages' },
  { key: 'can_write_blocks', label: 'Write blocks' },
] as const;

const WORKSPACE_KEY_PERMISSIONS = [
  { key: 'can_read_pages', label: 'Read pages & blocks' },
  { key: 'can_create_collections', label: 'Create collections' },
  { key: 'can_delete_collections', label: 'Delete collections' },
  { key: 'can_create_pages', label: 'Create pages' },
  { key: 'can_delete_pages', label: 'Delete pages' },
  { key: 'can_write_blocks', label: 'Write blocks' },
] as const;

function generateSkillMd(keyName: string): string {
  return `---
name: parchment
description: Read, write, and organize notes in Parchment (theparchment.app). Use when creating collections, adding pages, writing blocks, or reading existing notes via the Parchment API.
---

# Parchment Skill

Parchment is a simple notes app with a REST-like API. Your API key is stored securely — never log or expose it.

## Base URL

\`\`\`
https://theparchment.app/functions/v1/api
\`\`\`

## Authentication

All requests require:
\`\`\`
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
\`\`\`

## API Key

This skill was generated for key: **${keyName}**

Store your API key as an environment variable or in your agent's secure config. Never hardcode it.

## Core Operations

### List all collections
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "list_collections"}'
\`\`\`

### Create a collection
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "create_collection", "name": "My Collection", "workspace_name": "Personal"}'
\`\`\`

### Rename a collection
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "rename_collection", "collection_id": "COLLECTION_ID", "name": "New Name"}'
\`\`\`

### Reorder collections
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "reorder_collections",
    "collection_ids": ["FIRST_ID", "SECOND_ID", "THIRD_ID"]
  }'
\`\`\`

Pass all collection IDs in the order you want them displayed.

### Move a page to a different collection
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "move_page", "page_id": "PAGE_ID", "collection_id": "TARGET_COLLECTION_ID"}'
\`\`\`

## Workspace Operations (Master Key + can_manage_workspaces)

Workspaces are top-level containers above collections. These actions require a Master Key with the \`can_manage_workspaces\` permission enabled. \`list_workspaces\` is available to any key.

### List all workspaces
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "x-api-key: YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "list_workspaces"}'
\`\`\`

### Create a workspace
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "x-api-key: YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "create_workspace", "name": "My Workspace"}'
\`\`\`

### Rename a workspace
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "x-api-key: YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "rename_workspace", "workspace_id": "WORKSPACE_ID", "name": "New Name"}'
\`\`\`

You can also use \`workspace_name\` instead of \`workspace_id\` for any workspace-targeting action (\`move_collection\`, \`rename_workspace\`, \`delete_workspace\`). \`workspace_name\` supports partial, case-insensitive matching:

\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "x-api-key: YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "rename_workspace", "workspace_name": "work", "name": "New Name"}'
\`\`\`

### Delete a workspace
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "x-api-key: YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "delete_workspace", "workspace_id": "WORKSPACE_ID"}'
\`\`\`

\`workspace_name\` is supported on \`create_collection\`, \`move_collection\`, \`rename_workspace\`, and \`delete_workspace\`. It does partial, case-insensitive matching — \`"work"\` will match \`"Work Stuff"\`. If multiple workspaces match, the API returns a 409 listing them so you can clarify. If omitted from \`create_collection\`, it defaults to the first workspace. Always call \`list_workspaces\` first if you are unsure of the name.

### Move a collection to a different workspace
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "x-api-key: YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "move_collection", "collection_id": "COLLECTION_ID", "workspace_name": "work"}'
\`\`\`

### List pages in a collection
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "list_pages", "collection_id": "COLLECTION_ID"}'
\`\`\`

### Create a page
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "create_page",
    "collection_id": "COLLECTION_ID",
    "title": "My Page",
    "type": "blank"
  }'
\`\`\`

Page types: \`blank\`, \`notes\`, \`checklist\`, \`roadmap\`

### Read a page (with blocks)
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "get_page", "page_id": "PAGE_ID"}'
\`\`\`

### Write blocks to a page (replaces all blocks)
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "replace_blocks",
    "page_id": "PAGE_ID",
    "blocks": [
      {"type": "heading1", "content": "My Heading"},
      {"type": "text", "content": "Some text here."},
      {"type": "todo", "content": "A task", "checked": false}
    ]
  }'
\`\`\`

### Append blocks to a page
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "append_blocks",
    "page_id": "PAGE_ID",
    "blocks": [
      {"type": "text", "content": "Appended content"}
    ]
  }'
\`\`\`

### Insert blocks at a specific position
Use \`insert_blocks\` to add blocks at a specific point in the page. Pass \`after_block_id\` to insert after a specific block, or \`position\` (0-based integer) to insert at that index. Existing blocks shift down automatically.
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "x-api-key: YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "insert_blocks",
    "page_id": "PAGE_ID",
    "after_block_id": "BLOCK_ID",
    "blocks": [
      {"type": "text", "content": "Inserted content"}
    ]
  }'
\`\`\`

### Update a single block in-place
Use \`update_block\` to patch a specific block&apos;s content, type, checked state, or indent level without changing its position.
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "x-api-key: YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "update_block",
    "page_id": "PAGE_ID",
    "block_id": "BLOCK_ID",
    "content": "Updated content",
    "type": "heading2"
  }'
\`\`\`

Fields you can update: \`content\`, \`type\`, \`checked\`, \`indent_level\`. Only pass the fields you want to change.

## Block Types

| Type | Description |
|------|-------------|
| \`heading1\` | Large heading |
| \`heading2\` | Medium heading |
| \`heading3\` | Small heading |
| \`text\` | Body text |
| \`todo\` | Checkbox item (add \`"checked": true/false\`) |
| \`bullet_list\` | Bullet list item |
| \`numbered_list\` | Numbered list item |
| \`quote\` | Blockquote |
| \`divider\` | Horizontal rule (content: "") |
| \`code\` | Code block |
| \`group\` | Container block — groups child blocks together. Use \`group_id\` on child blocks to associate them with this group. |

## Nested Lists (indent_level)

Bullet and numbered list blocks support an \`indent_level\` field (integer, 0–4) to create nested sub-lists.

- **Level 0** (default): top-level items — rendered as 1, 2, 3 for numbered lists
- **Level 1**: sub-items — rendered as a, b, c
- **Level 2+**: deep sub-items — rendered as i, ii, iii (roman numerals)

### Example: nested numbered list
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "x-api-key: YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "replace_blocks",
    "page_id": "PAGE_ID",
    "blocks": [
      { "type": "numbered_list", "content": "First item", "indent_level": 0 },
      { "type": "numbered_list", "content": "Sub-item A", "indent_level": 1 },
      { "type": "numbered_list", "content": "Sub-sub-item i", "indent_level": 2 },
      { "type": "numbered_list", "content": "Second item", "indent_level": 0 }
    ]
  }'
\`\`\`

## Group Blocks

A group block is a container (like a \`<div>\`) that logically groups child blocks. Deleting the group deletes all its children at once.

### Create a group with children
\`\`\`bash
# Step 1: create the group block
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "x-api-key: YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action":"append_blocks","page_id":"PAGE_ID","blocks":[{"type":"group","content":""}]}'
# → returns the group block id

# Step 2: add children using the returned group id
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "x-api-key: YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "append_blocks",
    "page_id": "PAGE_ID",
    "blocks": [
      { "type": "text", "content": "Email: user@example.com", "group_id": "GROUP_ID" },
      { "type": "text", "content": "Date: 2026-03-28", "group_id": "GROUP_ID" }
    ]
  }'
\`\`\`

### Delete a group (and all its children)
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "x-api-key: YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action":"delete_group","page_id":"PAGE_ID","group_block_id":"GROUP_ID"}'
\`\`\`

## Page Sharing

You can share a page publicly (anyone with the link) or privately (specific Parchment users by email) on your human's behalf.

### Enable public sharing
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "share_page",
    "page_id": "PAGE_ID",
    "enabled": true,
    "mode": "public"
  }'
\`\`\`

Response includes \`share_url\` — the link you can hand to someone.

### Share privately with specific people
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "share_page",
    "page_id": "PAGE_ID",
    "enabled": true,
    "mode": "private",
    "add_emails": ["friend@example.com", "colleague@example.com"]
  }'
\`\`\`

Private shares require the recipient to have a Parchment account.

### Remove someone from a private share
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "share_page",
    "page_id": "PAGE_ID",
    "remove_emails": ["friend@example.com"]
  }'
\`\`\`

### Disable sharing (revoke access)
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "share_page", "page_id": "PAGE_ID", "enabled": false}'
\`\`\`

### share_page response fields
| Field | Description |
|-------|-------------|
| \`share_enabled\` | Whether sharing is currently on |
| \`share_mode\` | \`"public"\` or \`"private"\` |
| \`share_token\` | The UUID token used in the share URL |
| \`shared_with_emails\` | Array of invited emails (private mode) |
| \`share_url\` | Full URL to share — null if never enabled |

## Full API Docs

Visit **https://theparchment.app/docs/api** for the complete API reference with all actions, parameters, and response formats.

## Tips for Agents

- Always \`list_collections\` first to get IDs before creating pages
- Use \`replace_blocks\` to fully overwrite a page
- Use \`append_blocks\` to add to the end of a page
- Use \`insert_blocks\` with \`after_block_id\` to insert at a specific spot
- Use \`update_block\` to patch a single block&apos;s content or type in-place
- Use \`move_page\` to reorganize pages between collections
- Use \`move_collection\` to move a collection to a different workspace
- Use \`reorder_collections\` to set the display order of collections
- Use \`workspace_name\` instead of \`workspace_id\` for human-readable workspace targeting
- IDs are UUIDs — store them if you need to reference the same page later
- The API is append-friendly: create a collection once, add pages over time
`;
}

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const ADMIN_EMAIL = 'james.welbes@gmail.com';
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Feature flags (admin only)
  interface FeatureFlag {
    id: string;
    flag: string;
    description: string | null;
    globally_enabled: boolean;
    enabled_for: string[];
  }
  const [flags, setFlags] = useState<FeatureFlag[]>([]);

  // skipcq: JS-0356
  const fetchFlags = async () => {
    const { data } = await supabase.from('feature_flags').select('*').order('created_at', { ascending: true });
    setFlags((data as FeatureFlag[]) ?? []);
  };

  useEffect(() => {
    if (isAdmin) fetchFlags();
  }, [isAdmin]);

  // Beta tester
  const [isBetaTester, setIsBetaTester] = useState(false);
  const [betaFlags, setBetaFlags] = useState<FeatureFlag[]>([]);
  const [betaSaving, setBetaSaving] = useState(false);
  const [enabledBetaFlags, setEnabledBetaFlags] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('beta_tester').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        const isBeta = data?.beta_tester ?? false;
        setIsBetaTester(isBeta);
        if (isBeta) loadBetaFlags();
      });
  }, [user]);

  // skipcq: JS-0357
  const loadBetaFlags = async () => {
    if (!user) return;
    // Fetch ALL non-globally-enabled flags — any logged-in user can read these now
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('globally_enabled', false)
      .order('created_at', { ascending: true });
    if (error) { toast.error('Failed to load beta features'); return; }
    const available = (data ?? []) as FeatureFlag[];
    setBetaFlags(available);
    // Pre-check whichever flags this user is already opted into
    setEnabledBetaFlags(new Set(
      available.filter(f => Array.isArray(f.enabled_for) && f.enabled_for.includes(user.id)).map(f => f.id)
    ));
  };

  const toggleBetaTester = async () => {
    if (!user) return;
    setBetaSaving(true);
    const newVal = !isBetaTester;
    await supabase.from('profiles').update({ beta_tester: newVal }).eq('user_id', user.id);
    setIsBetaTester(newVal);
    if (newVal) {
      await loadBetaFlags();
    } else {
      // Remove user from all flags when opting out — use edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: allFlags } = await supabase.from('feature_flags').select('flag, enabled_for').eq('globally_enabled', false);
        for (const flag of (allFlags ?? []) as FeatureFlag[]) {
          if (Array.isArray(flag.enabled_for) && flag.enabled_for.includes(user.id)) {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/beta-flag`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ flag: flag.flag, enabled: false }),
            });
          }
        }
      }
      setBetaFlags([]);
      setEnabledBetaFlags(new Set());
    }
    setBetaSaving(false);
  };

  const saveBetaFlagSelections = async () => {
    if (!user) return;
    setBetaSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('Not logged in'); setBetaSaving(false); return; }

    for (const flag of betaFlags) {
      const isEnabled = enabledBetaFlags.has(flag.id);
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/beta-flag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flag: flag.flag, enabled: isEnabled }),
      });
    }

    toast.success('Saved! Reloading to apply your beta features...');
    setBetaSaving(false);
    await loadBetaFlags();
    setTimeout(() => window.location.reload(), 1200);
  };

  const [newName, setNewName] = useState('');
  const [newKeyType, setNewKeyType] = useState<KeyType>('master');
  const [newCanCreateWorkspaces, setNewCanCreateWorkspaces] = useState(false);
  const [newCanDeleteWorkspaces, setNewCanDeleteWorkspaces] = useState(false);
  const [newPerms, setNewPerms] = useState<Record<string, boolean>>({
    can_read_pages: true,
    can_create_collections: false,
    can_delete_collections: false,
    can_create_pages: false,
    can_delete_pages: false,
    can_write_blocks: false,
  });
  const [newExpiry, setNewExpiry] = useState('');
  const [newWorkspaceIds, setNewWorkspaceIds] = useState<string[]>([]);

  const handleNewPermChange = (key: string, checked: boolean) => {
    setNewPerms(prev => ({ ...prev, [key]: checked }));
  };

  const handleWorkspaceToggle = (wsId: string, checked: boolean) => {
    setNewWorkspaceIds(prev =>
      checked ? [...prev, wsId] : prev.filter(id => id !== wsId)
    );
  };
  const [workspaces, setWorkspaces] = useState<DbWorkspace[]>([]);

  // skipcq: JS-0357
  const loadWorkspaces = async () => {
    const { data } = await supabase
      .from('workspaces')
      .select('id, name')
      .is('deleted_at', null)
      .order('created_at');
    setWorkspaces((data as DbWorkspace[]) ?? []);
  };

  useEffect(() => {
    loadKeys();
    loadWorkspaces();
    if (searchParams.get('new') === 'true') {
      setCreating(true);
      setNewName('My Agent');
      setNewKeyType('master');
    }
  }, []);

  const loadKeys = async () => {
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .eq('revoked', false)
      .order('created_at', { ascending: false });
    setKeys((data as ApiKey[]) ?? []);
    setLoading(false);
  };

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = crypto.getRandomValues(new Uint8Array(40));
    let key = 'pmt_';
    for (let i = 0; i < 40; i++) key += chars.charAt(randomValues[i] % chars.length);
    return key;
  };

  const hashKey = async (key: string) => {
    const encoded = new TextEncoder().encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const createKey = async () => {
    if (!user) return;

    // Validation
    if (newKeyType === 'workspace' && newWorkspaceIds.length === 0) {
      toast.error('Select at least one workspace for a Workspace Key');
      return;
    }

    const rawKey = generateKey();
    const keyHash = await hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 8);

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      name: newName || 'Untitled Key',
      key_hash: keyHash,
      key_prefix: keyPrefix,
      key_type: newKeyType,
      expires_at: newExpiry ? new Date(newExpiry).toISOString() : null,
    };

    if (newKeyType === 'master') {
      // Master keys: respect individually checked permissions
      insertPayload.can_manage_workspaces = newCanCreateWorkspaces || newCanDeleteWorkspaces;
      insertPayload.can_create_workspaces = newCanCreateWorkspaces;
      insertPayload.can_delete_workspaces = newCanDeleteWorkspaces;
      insertPayload.workspace_ids = null;
      Object.assign(insertPayload, newPerms);
    } else {
      // Workspace key — scoped permissions + workspace list
      insertPayload.can_manage_workspaces = false;
      insertPayload.workspace_ids = newWorkspaceIds;
      Object.assign(insertPayload, newPerms);
    }

    const { error } = await supabase.from('api_keys').insert(insertPayload);

    if (error) {
      toast.error('Failed to create key');
      return;
    }

    setNewKeyRevealed(rawKey);
    setCreating(false);
    setNewName('');
    setNewExpiry('');
    setNewKeyType('master');
    setNewCanCreateWorkspaces(false);
    setNewCanDeleteWorkspaces(false);
    setNewWorkspaceIds([]);
    setNewPerms({ can_read_pages: true, can_create_collections: false, can_delete_collections: false, can_create_pages: false, can_delete_pages: false, can_write_blocks: false });
    loadKeys();
    toast.success('API key created');
  };

  const revokeKey = async (id: string) => {
    await supabase.from('api_keys').update({ revoked: true }).eq('id', id);
    setKeys(keys.filter(k => k.id !== id));
    toast.success('Key revoked');
  };

  const copyKey = () => {
    if (newKeyRevealed) {
      navigator.clipboard.writeText(newKeyRevealed);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadSkillMd = (keyName: string) => {
    const content = generateSkillMd(keyName);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parchment-skill.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SKILL.md downloaded');
  };

  const exportDatabase = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('You must be logged in'); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-database`,
        { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Export failed'); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parchment-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Database exported successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to editor
        </button>

        <h1 className="text-3xl font-bold font-display text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground mb-10">Manage your API keys and account.</p>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Key size={18} className="text-primary" />
              <h2 className="text-lg font-semibold font-display text-foreground">API Keys</h2>
            </div>
            {!creating && (
              <button
                onClick={() => { setCreating(true); setNewKeyRevealed(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus size={14} />
                New Key
              </button>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Use API keys to access your Parchment data programmatically. Keys are shown once — store them securely.
          </p>

          {newKeyRevealed && (
            <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm font-medium text-foreground mb-2">
                🔑 Your new API key (copy it now — it won&apos;t be shown again):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-background/50 px-3 py-2 rounded border border-border break-all">
                  {newKeyRevealed}
                </code>
                <button onClick={copyKey} className="p-2 rounded hover:bg-accent transition-colors">
                  {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} className="text-muted-foreground" />}
                </button>
              </div>
            </div>
          )}

          {creating && (
            <div className="mb-6 p-4 rounded-lg border border-border bg-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Create API Key</h3>

              {/* Key name */}
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Key name (e.g. 'My Agent')"
                className="w-full px-3 py-2 text-sm rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground mb-4 outline-none focus:ring-1 focus:ring-ring"
              />

              {/* Key type selector */}
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Key Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewKeyType('master')}
                    className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                      newKeyType === 'master'
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:bg-accent/30'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Crown size={14} className={newKeyType === 'master' ? 'text-primary' : 'text-muted-foreground'} />
                      <span className={`text-sm font-semibold ${newKeyType === 'master' ? 'text-primary' : 'text-foreground'}`}>Master Key</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Full access to all collections, pages, and blocks. Optionally allow workspace management.</p>
                  </button>
                  <button
                    onClick={() => setNewKeyType('workspace')}
                    className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                      newKeyType === 'workspace'
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:bg-accent/30'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Layers size={14} className={newKeyType === 'workspace' ? 'text-primary' : 'text-muted-foreground'} />
                      <span className={`text-sm font-semibold ${newKeyType === 'workspace' ? 'text-primary' : 'text-foreground'}`}>Workspace Key</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Scoped to one or more workspaces. Choose specific permissions.</p>
                  </button>
                </div>
              </div>

              {/* Master key: permission checkboxes + workspace options */}
              {newKeyType === 'master' && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Permissions</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MASTER_KEY_PERMISSIONS.map((p) => (
                      <label key={p.key} htmlFor={`new-master-perm-${p.key}`} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          id={`new-master-perm-${p.key}`}
                          type="checkbox"
                          checked={newPerms[p.key] ?? false}
                          onChange={(e) => { handleNewPermChange(p.key, e.target.checked); }}
                          className="rounded border-border accent-primary"
                        />
                        {p.label}
                      </label>
                    ))}
                    <label htmlFor="new-can-create-workspaces" className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        id="new-can-create-workspaces"
                        type="checkbox"
                        checked={newCanCreateWorkspaces}
                        onChange={(e) => { setNewCanCreateWorkspaces(e.target.checked); }}
                        className="rounded border-border accent-primary"
                      />
                      Create workspaces
                    </label>
                    <label htmlFor="new-can-delete-workspaces" className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        id="new-can-delete-workspaces"
                        type="checkbox"
                        checked={newCanDeleteWorkspaces}
                        onChange={(e) => { setNewCanDeleteWorkspaces(e.target.checked); }}
                        className="rounded border-border accent-primary"
                      />
                      Delete workspaces
                    </label>
                  </div>
                </div>
              )}

              {/* Workspace key: workspace selector + permissions */}
              {newKeyType === 'workspace' && (
                <>
                  <div className="mb-4">
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Workspaces</label>
                    {workspaces.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No workspaces found.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {workspaces.map(ws => (
                          <label key={ws.id} htmlFor={`new-ws-${ws.id}`} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                            <input
                              id={`new-ws-${ws.id}`}
                              type="checkbox"
                              checked={newWorkspaceIds.includes(ws.id)}
                              onChange={e => { handleWorkspaceToggle(ws.id, e.target.checked); }}
                              className="rounded border-border accent-primary"
                            />
                            {ws.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Permissions</label>
                    <div className="grid grid-cols-2 gap-2">
                      {WORKSPACE_KEY_PERMISSIONS.map((p) => (
                        <label key={p.key} htmlFor={`new-ws-perm-${p.key}`} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                          <input
                            id={`new-ws-perm-${p.key}`}
                            type="checkbox"
                            checked={newPerms[p.key] ?? false}
                            onChange={(e) => { handleNewPermChange(p.key, e.target.checked); }}
                            className="rounded border-border accent-primary"
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Expiry */}
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Expiration (optional)</label>
                <input
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="px-3 py-2 text-sm rounded-md bg-background border border-border text-foreground outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex gap-2">
                <button onClick={createKey} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  Generate Key
                </button>
                <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => {
                const isMaster = (k.key_type ?? 'master') === 'master';
                const wsNames = isMaster ? [] : (k.workspace_ids ?? []).map(id => workspaces.find(w => w.id === id)?.name ?? id);
                return (
                  <div key={k.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card group">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isMaster
                          ? <Crown size={13} className="text-amber-500 shrink-0" />
                          : <Layers size={13} className="text-blue-500 shrink-0" />
                        }
                        <span className="text-sm font-medium text-foreground">{k.name}</span>
                        <code className="text-xs font-mono text-muted-foreground">{k.key_prefix}...</code>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          isMaster ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        }`}>
                          {isMaster ? 'Master' : 'Workspace'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
                        {k.last_used_at && <span>Last used {new Date(k.last_used_at).toLocaleDateString()}</span>}
                        {k.expires_at && <span>Expires {new Date(k.expires_at).toLocaleDateString()}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {isMaster ? (
                          <>
                            {MASTER_KEY_PERMISSIONS.filter(p => k[p.key as keyof ApiKey]).map(p => (
                              <span key={p.key} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{p.label}</span>
                            ))}
                            {k.can_manage_workspaces && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">Workspace management</span>
                            )}
                          </>
                        ) : (
                          <>
                            {WORKSPACE_KEY_PERMISSIONS.filter(p => k[p.key as keyof ApiKey]).map(p => (
                              <span key={p.key} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{p.label}</span>
                            ))}
                            {wsNames.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                {wsNames.join(', ')}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      <button
                        onClick={() => downloadSkillMd(k.name)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Download SKILL.md for this key"
                      >
                        <Download size={12} />
                        SKILL.md
                      </button>
                      <button
                        onClick={() => revokeKey(k.id)}
                        className="p-1.5 rounded hover:bg-destructive/20 hover:text-destructive transition-all"
                        title="Revoke key"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Chrome Extension */}
        <section className="mt-12 pt-8 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Puzzle size={18} className="text-primary" />
            <h2 className="text-lg font-semibold font-display text-foreground">Chrome Extension</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Save recipes and web content directly to Parchment with one click.
          </p>

          <div className="rounded-lg border border-border bg-card p-4 flex gap-4 items-start">
            <img
              src="/pwa-192x192.png"
              alt="Parchment extension icon"
              className="w-14 h-14 rounded-xl shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-0.5">Parchment for Chrome</p>
              <p className="text-xs text-muted-foreground mb-3">
                Clip recipes from any website. Ingredients become a checklist, instructions become numbered steps — all saved to your Recipes collection automatically. <span className="text-yellow-600 dark:text-yellow-400">Pending Chrome Web Store approval — install manually for now.</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    const res = await fetch('https://api.github.com/repos/welbinator/parchment-chrome-extension/releases/latest');
                    const data = await res.json();
                    const asset = data.assets?.find((a: { name: string }) => a.name.endsWith('.zip'));
                    if (asset) {
                      const a = document.createElement('a');
                      a.href = asset.browser_download_url;
                      a.download = asset.name;
                      a.click();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Download size={12} />
                  Download Extension
                </button>
                <a
                  href="https://github.com/welbinator/parchment-chrome-extension"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-accent/40 transition-colors text-foreground"
                >
                  View on GitHub
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                💡 After downloading, unzip the file, go to <strong>chrome://extensions</strong>, enable <strong>Developer mode</strong>, click <strong>Load unpacked</strong>, and select the unzipped folder. Then open the extension and paste an API key from above.
              </p>
            </div>
          </div>
        </section>

        {/* Beta Tester — visible to all users */}
        <section className="mt-12 pt-8 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical size={18} className="text-primary" />
            <h2 className="text-lg font-semibold font-display text-foreground">Beta Tester</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Get early access to features that are still being tested.
          </p>

          {/* Warning */}
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-5">
            <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium mb-0.5">⚠️ Beta features may be unstable</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500">Beta features are works in progress. They might have bugs, change significantly, or be removed entirely. Use them at your own risk.</p>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card mb-4">
            <div>
              <p className="text-sm font-medium text-foreground">{isBetaTester ? 'You are a beta tester' : 'Become a beta tester'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{isBetaTester ? 'You can try upcoming features below' : 'Opt in to try features before they launch'}</p>
            </div>
            <button
              onClick={toggleBetaTester}
              disabled={betaSaving}
              className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${isBetaTester ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              {betaSaving ? (
                <Loader2 size={10} className="absolute inset-0 m-auto animate-spin text-white" />
              ) : (
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isBetaTester ? 'left-[18px]' : 'left-0.5'}`} />
              )}
            </button>
          </div>

          {/* Flag checklist */}
          {isBetaTester && (
            betaFlags.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No beta features available right now. Check back soon!</p>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground mb-3">Select the features you&apos;d like to try:</p>
                <div className="space-y-2 mb-4">
                  {betaFlags.map(flag => (
                    <label key={flag.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={enabledBetaFlags.has(flag.id)}
                        onChange={e => {
                          const next = new Set(enabledBetaFlags);
                          e.target.checked ? next.add(flag.id) : next.delete(flag.id);
                          setEnabledBetaFlags(next);
                        }}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{flag.flag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                        {flag.description && <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>}
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={saveBetaFlagSelections}
                  disabled={betaSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {betaSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save preferences
                </button>
              </div>
            )
          )}
        </section>

        {isAdmin && (
          <section className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Download size={18} className="text-primary" />
              <h2 className="text-lg font-semibold font-display text-foreground">Export Database</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Download a full JSON export of all users, collections, pages, blocks, and API keys for migration.
            </p>
            <button
              onClick={exportDatabase}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {exporting ? 'Exporting...' : 'Export All Data'}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
