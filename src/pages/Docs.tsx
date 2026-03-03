import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, FolderOpen, FileText, Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code, Minus, Slash, Trash2, RotateCcw, Keyboard, Sparkles, Link2 } from 'lucide-react';

interface Section {
  id: string;
  title: string;
}

const sections: Section[] = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'collections', title: 'Collections' },
  { id: 'pages', title: 'Pages' },
  { id: 'blocks', title: 'Block Types' },
  { id: 'slash-commands', title: 'Slash Commands' },
  { id: 'formatting', title: 'Rich Text Formatting' },
  { id: 'trash', title: 'Trash & Recovery' },
  { id: 'keyboard', title: 'Keyboard Shortcuts' },
];

export default function Docs() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold font-display text-gradient-primary">
            Parchment
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <Link to="/docs/api" className="text-sm text-muted-foreground hover:text-foreground transition-colors">API</Link>
            <Link to="/changelog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Changelog</Link>
            <Link
              to="/auth"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 pt-28 pb-20 flex gap-12">
        {/* Sidebar TOC */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-28">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">On this page</p>
            <nav className="space-y-1">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  {s.title}
                </a>
              ))}
            </nav>
            <div className="mt-8 pt-6 border-t border-border space-y-2">
              <Link to="/docs/api" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">API Reference →</Link>
              <Link to="/changelog" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Changelog →</Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 max-w-2xl">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft size={14} />
            Back
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <BookOpen size={28} className="text-primary" />
            <h1 className="text-4xl font-bold font-display tracking-tight">Documentation</h1>
          </div>
          <p className="text-muted-foreground mb-12">Everything you need to know about using Parchment.</p>

          {/* Getting Started */}
          <section id="getting-started" className="mb-14 scroll-mt-28">
            <h2 className="text-2xl font-semibold font-display mb-4">Getting Started</h2>
            <p className="text-foreground/85 text-sm leading-relaxed mb-4">
              Parchment is a block-based note-taking app. Your content lives in <strong>pages</strong>, which are organised into <strong>collections</strong>. Sign in with your Google account to get started — your data syncs in real time across all your devices.
            </p>
            <p className="text-foreground/85 text-sm leading-relaxed">
              After signing in you'll land in the main workspace. The sidebar on the left lists your collections and pages. Use the <strong>+</strong> buttons to create new ones.
            </p>
          </section>

          {/* Collections */}
          <section id="collections" className="mb-14 scroll-mt-28">
            <h2 className="text-2xl font-semibold font-display mb-4 flex items-center gap-2">
              <FolderOpen size={20} className="text-primary" /> Collections
            </h2>
            <p className="text-foreground/85 text-sm leading-relaxed mb-4">
              Collections are folders that group related pages together. Think of them as notebooks or projects.
            </p>
            <ul className="space-y-3 text-sm text-foreground/85">
              <li className="flex gap-2"><span className="text-primary font-bold mt-0.5">→</span><span><strong>Create</strong> — click the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">+</code> icon next to "Collections" in the sidebar.</span></li>
              <li className="flex gap-2"><span className="text-primary font-bold mt-0.5">→</span><span><strong>Rename</strong> — double-click (or long-press on mobile) the collection name to edit it inline.</span></li>
              <li className="flex gap-2"><span className="text-primary font-bold mt-0.5">→</span><span><strong>Delete</strong> — hover the collection and click the trash icon. Deleting a collection moves all its pages to Trash.</span></li>
              <li className="flex gap-2"><span className="text-primary font-bold mt-0.5">→</span><span><strong>Expand / collapse</strong> — click the collection name to toggle the page list.</span></li>
            </ul>
          </section>

          {/* Pages */}
          <section id="pages" className="mb-14 scroll-mt-28">
            <h2 className="text-2xl font-semibold font-display mb-4 flex items-center gap-2">
              <FileText size={20} className="text-primary" /> Pages
            </h2>
            <p className="text-foreground/85 text-sm leading-relaxed mb-4">
              Pages are where your content lives. Each page is a stack of blocks that you can freely rearrange.
            </p>
            <ul className="space-y-3 text-sm text-foreground/85">
              <li className="flex gap-2"><span className="text-primary font-bold mt-0.5">→</span><span><strong>Create</strong> — click the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">+</code> icon next to a collection name.</span></li>
              <li className="flex gap-2"><span className="text-primary font-bold mt-0.5">→</span><span><strong>Rename</strong> — double-click (or long-press on mobile) the page name in the sidebar.</span></li>
              <li className="flex gap-2"><span className="text-primary font-bold mt-0.5">→</span><span><strong>Delete</strong> — hover the page in the sidebar and click the trash icon. Deleted pages go to Trash (recoverable).</span></li>
              <li className="flex gap-2"><span className="text-primary font-bold mt-0.5">→</span><span><strong>Auto-save</strong> — every change is saved automatically. No save button needed.</span></li>
              <li className="flex gap-2"><span className="text-primary font-bold mt-0.5">→</span><span><strong>Real-time sync</strong> — changes appear instantly on all your other open tabs/devices.</span></li>
            </ul>
          </section>

          {/* Block Types */}
          <section id="blocks" className="mb-14 scroll-mt-28">
            <h2 className="text-2xl font-semibold font-display mb-4 flex items-center gap-2">
              <Type size={20} className="text-primary" /> Block Types
            </h2>
            <p className="text-foreground/85 text-sm leading-relaxed mb-6">
              Every piece of content in a page is a block. Press <kbd className="bg-muted border border-border rounded px-1.5 py-0.5 text-xs font-mono">Enter</kbd> to create a new block below the current one.
            </p>

            <div className="space-y-3">
              {[
                { icon: <Type size={16} />, name: 'Text', desc: 'Plain paragraph. The default block type.' },
                { icon: <Heading1 size={16} />, name: 'Heading 1', desc: 'Large section heading.' },
                { icon: <Heading2 size={16} />, name: 'Heading 2', desc: 'Medium sub-heading.' },
                { icon: <Heading3 size={16} />, name: 'Heading 3', desc: 'Small sub-heading.' },
                { icon: <List size={16} />, name: 'Bullet List', desc: 'Unordered list with bullet points.' },
                { icon: <ListOrdered size={16} />, name: 'Numbered List', desc: 'Ordered list with auto-incrementing numbers.' },
                { icon: <CheckSquare size={16} />, name: 'To-do', desc: 'Checkbox item — click the checkbox to mark it done.' },
                { icon: <Quote size={16} />, name: 'Quote', desc: 'Indented block with a left border, great for callouts or citations.' },
                { icon: <Code size={16} />, name: 'Code', desc: 'Monospace code block. Formatting toolbar is hidden in code blocks.' },
                { icon: <Minus size={16} />, name: 'Divider', desc: 'A horizontal rule to visually separate sections.' },
              ].map(({ icon, name, desc }) => (
                <div key={name} className="flex gap-4 items-start border border-border rounded-lg px-4 py-3 bg-card">
                  <span className="text-primary mt-0.5 shrink-0">{icon}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Slash Commands */}
          <section id="slash-commands" className="mb-14 scroll-mt-28">
            <h2 className="text-2xl font-semibold font-display mb-4 flex items-center gap-2">
              <Slash size={20} className="text-primary" /> Slash Commands
            </h2>
            <p className="text-foreground/85 text-sm leading-relaxed mb-4">
              Type <kbd className="bg-muted border border-border rounded px-1.5 py-0.5 text-xs font-mono">/</kbd> anywhere in a block to open the command menu. Start typing to filter, then click or press <kbd className="bg-muted border border-border rounded px-1.5 py-0.5 text-xs font-mono">Enter</kbd> to convert the current block to that type.
            </p>
            <p className="text-foreground/85 text-sm leading-relaxed">
              This works on any block type — you can switch a paragraph to a heading, a bullet list to a to-do, or anything else without losing your content.
            </p>
          </section>

          {/* Rich Text Formatting */}
          <section id="formatting" className="mb-14 scroll-mt-28">
            <h2 className="text-2xl font-semibold font-display mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-primary" /> Rich Text Formatting
            </h2>
            <p className="text-foreground/85 text-sm leading-relaxed mb-4">
              Select any text inside a block to reveal the inline formatting toolbar.
            </p>
            <div className="space-y-2 mb-6">
              {[
                { label: 'Bold', hint: 'Ctrl+B / Cmd+B' },
                { label: 'Italic', hint: 'Ctrl+I / Cmd+I' },
                { label: 'Strikethrough', hint: 'Toolbar only' },
                { label: 'Text color', hint: 'Toolbar only — choose from preset colors' },
                { label: 'Link', hint: 'Wrap selected text in a hyperlink' },
              ].map(({ label, hint }) => (
                <div key={label} className="flex items-center justify-between border border-border rounded-lg px-4 py-2.5 bg-card text-sm">
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground font-mono">{hint}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 items-start bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
              <Link2 size={15} className="text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground/85 leading-relaxed">
                <strong>Auto-linkify</strong> — URLs typed directly into a block automatically become clickable links when you leave the block. Use <kbd className="bg-muted border border-border rounded px-1 py-0.5 text-xs font-mono">Ctrl+click</kbd> (or <kbd className="bg-muted border border-border rounded px-1 py-0.5 text-xs font-mono">Cmd+click</kbd> on Mac) to open a link — a regular click just places the cursor for editing.
              </p>
            </div>
          </section>

          {/* Trash */}
          <section id="trash" className="mb-14 scroll-mt-28">
            <h2 className="text-2xl font-semibold font-display mb-4 flex items-center gap-2">
              <Trash2 size={20} className="text-primary" /> Trash & Recovery
            </h2>
            <p className="text-foreground/85 text-sm leading-relaxed mb-4">
              Nothing in Parchment is deleted immediately. Deleted pages and collections are moved to Trash, where they stay until you choose what to do with them.
            </p>
            <ul className="space-y-3 text-sm text-foreground/85 mb-6">
              <li className="flex gap-2"><span className="text-primary font-bold mt-0.5">→</span><span><strong>View Trash</strong> — click "Trash" at the bottom of the sidebar.</span></li>
              <li className="flex gap-2"><span className="text-primary font-bold mt-0.5">→</span><span><strong>Restore</strong> — click the restore icon next to any item to bring it back.</span></li>
              <li className="flex gap-2"><span className="text-primary font-bold mt-0.5">→</span><span><strong>Permanently delete</strong> — click the delete icon in Trash to remove an item forever.</span></li>
            </ul>
            <div className="flex gap-3 items-start bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
              <RotateCcw size={15} className="text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground/85 leading-relaxed">
                <strong>Block-level undo</strong> — deleting a block (not a whole page) shows a brief toast notification with an Undo button. You can also press <kbd className="bg-muted border border-border rounded px-1 py-0.5 text-xs font-mono">Ctrl+Z</kbd> / <kbd className="bg-muted border border-border rounded px-1 py-0.5 text-xs font-mono">Cmd+Z</kbd> to instantly recover the last deleted block.
              </p>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section id="keyboard" className="mb-14 scroll-mt-28">
            <h2 className="text-2xl font-semibold font-display mb-4 flex items-center gap-2">
              <Keyboard size={20} className="text-primary" /> Keyboard Shortcuts
            </h2>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Shortcut</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { action: 'New block', shortcut: 'Enter' },
                    { action: 'Delete block (when empty)', shortcut: 'Backspace' },
                    { action: 'Undo last block deletion', shortcut: 'Ctrl+Z / Cmd+Z' },
                    { action: 'Open slash command menu', shortcut: '/' },
                    { action: 'Bold', shortcut: 'Ctrl+B / Cmd+B' },
                    { action: 'Italic', shortcut: 'Ctrl+I / Cmd+I' },
                    { action: 'Open link (in a linked block)', shortcut: 'Ctrl+click / Cmd+click' },
                  ].map(({ action, shortcut }, i, arr) => (
                    <tr key={action} className={i < arr.length - 1 ? 'border-b border-border' : ''}>
                      <td className="px-4 py-3 text-foreground/85">{action}</td>
                      <td className="px-4 py-3">
                        <kbd className="bg-muted border border-border rounded px-2 py-0.5 text-xs font-mono text-foreground">{shortcut}</kbd>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer CTA */}
          <div className="border border-border rounded-xl p-6 bg-card text-center">
            <p className="text-sm text-muted-foreground mb-3">Looking for the REST API reference?</p>
            <Link
              to="/docs/api"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              View API Docs →
            </Link>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} Parchment</span>
          <div className="flex gap-6">
            <Link to="/docs/api" className="text-sm text-muted-foreground hover:text-foreground transition-colors">API Docs</Link>
            <Link to="/changelog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Changelog</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
