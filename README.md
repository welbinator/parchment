# Parchment

A lightweight, fast note-taking and knowledge management app. Think Notion, but simpler and self-hosted.

**Live:** [theparchment.app](https://theparchment.app)

## Tech Stack

- **Frontend:** React + TypeScript + Vite + shadcn-ui + Tailwind CSS
- **Backend:** Supabase (self-hosted)
- **Hosting:** Hetzner VPS

## Local Development

Requires Node.js (v18+) and npm. Install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) if needed.

```sh
# Clone the repo
git clone https://github.com/welbinator/parchment.git
cd parchment

# Install dependencies
npm install

# Start dev server
npm run dev
```

The dev server runs at `http://localhost:5173` with hot-reloading.

## Building for Production

```sh
npm run build
```

Output goes to `dist/`. Deploy the contents to your web server or Hetzner VPS.

## Environment Variables

Create a `.env` file at the project root:

```env
VITE_SUPABASE_URL=https://your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## API

Parchment has a REST API for programmatic access to your notes. See the [API docs](https://theparchment.app/docs) or check the `supabase/functions/` directory.

**Base endpoint:** `POST https://[your-supabase-url]/functions/v1/api`  
**Auth:** `x-api-key` header with your API key

## Self-Hosting

Parchment runs on a standard VPS with Supabase in Docker. See [Supabase self-hosting docs](https://supabase.com/docs/guides/self-hosting) to get the backend running, then build the frontend and point it at your Supabase instance.

## License

MIT
