# &lt;p.&gt; PlexCode

A lightweight browser-based VS Code alternative with cloud saving, Google OAuth, live preview, and multi-language support.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla HTML / CSS / ES Modules |
| Editor | Monaco Editor (CDN) |
| Backend | Supabase (Auth + Postgres + RLS) |
| Deployment | Vercel (static) |

---

## Project Structure

```
plexcode/
├── index.html                  # Single HTML entry point
├── vercel.json                 # Vercel deployment config
├── assets/
│   └── favicon.svg
├── css/
│   ├── global.css              # Design tokens, reset, utilities
│   ├── landing.css             # Landing page styles
│   └── app.css                 # Dashboard, editor, all views
├── js/
│   ├── app.js                  # Main orchestrator (boot, routing, bindings)
│   ├── supabase.js             # Supabase client (put your keys here)
│   ├── auth/
│   │   ├── auth.js             # Sign in, sign up, Google OAuth, guest
│   │   └── profile.js          # Profile load/update, settings UI
│   ├── editor/
│   │   ├── monaco.js           # Monaco editor wrapper
│   │   ├── tabs.js             # Tab manager
│   │   ├── preview.js          # Draggable live preview window
│   │   └── templates.js        # Starter templates per language
│   ├── dashboard/
│   │   ├── files.js            # Supabase CRUD for files
│   │   ├── dashboard.js        # Dashboard + files table renderer
│   │   └── folder.js           # File System Access API folder tree
│   └── utils/
│       ├── toast.js            # Toast notifications
│       ├── modal.js            # Modal open/close helpers
│       └── helpers.js          # Dates, lang maps, debounce, download
└── sql/
    └── schema.sql              # Run once in Supabase SQL editor
```

---

## Setup

### 1. Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. In the SQL Editor, paste and run the entire contents of `sql/schema.sql`
3. Go to **Settings → API** and copy:
   - Project URL
   - `anon` public key

### 2. Configure Keys

Open `js/supabase.js` and replace the two placeholders:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```

### 3. Enable Google OAuth (optional)

1. In Supabase → **Authentication → Providers → Google**, enable it
2. Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com)
   - Authorized redirect URI: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
3. Paste the Client ID and Secret into Supabase

### 4. Set Redirect URL

In Supabase → **Authentication → URL Configuration**:
- Site URL: `https://your-plexcode.vercel.app`
- Redirect URLs: add `https://your-plexcode.vercel.app`

For local dev add `http://localhost:5500` (or whatever port you use).

### 5. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# From the plexcode/ directory
vercel
```

Or drag-drop the folder into [vercel.com/new](https://vercel.com/new).

### 6. Local Development

Any static server works:

```bash
# Python
python3 -m http.server 5500

# Node
npx serve .

# VS Code Live Server
# Right-click index.html → Open with Live Server
```

---

## Features

### Authentication
- Email + password sign up / sign in
- Google OAuth (one-click)
- Guest mode (local editing, download to save)
- Auto-profile creation on first login via DB trigger
- Session persistence across refreshes

### Editor
- Monaco Editor (same engine as VS Code)
- Syntax highlighting for 11+ languages
- Autocomplete, bracket matching, indentation guides
- Custom PlexCode dark + light themes
- Undo / Redo / Find / Find & Replace
- Keyboard shortcuts (Ctrl+S, Ctrl+F, Ctrl+Z, etc.)

### Tabs
- Open multiple files simultaneously
- Dirty indicator (dot) for unsaved changes
- Close individual tabs

### Autosave
- Logged-in users: saves 1.5s after you stop typing
- Ctrl+S for immediate manual save
- Guest users: download button, warn on page leave

### Live Preview
- Draggable + resizable preview window
- HTML → full render in sandboxed iframe
- CSS → applied to a sample page
- JavaScript → console.log output shown
- Live-updates as you type

### My Files
- Full cloud file list (Supabase)
- Search by filename or language
- Open, Rename, Delete with confirmation
- Row Level Security — only you see your files

### Dashboard
- Time-aware greeting
- Quick action cards
- Recent files grid

### Folder Explorer
- File System Access API (Chrome/Edge)
- Full recursive folder tree
- Click any file to open in editor

### Settings
- Change username (display only, shown as `user@plexcode.com`)
- Dark / Light theme (saved to Supabase)
- Sign out

### Help
- Tutorial, HTML basics, CSS basics, JS basics
- Keyboard shortcuts reference
- FAQ

---

## Supported Languages

| Language | Extension | Highlighting | Autocomplete | Preview |
|---|---|---|---|---|
| HTML | .html | ✅ | ✅ | ✅ |
| CSS | .css | ✅ | ✅ | ✅ |
| JavaScript | .js | ✅ | ✅ | ✅ (console) |
| TypeScript | .ts | ✅ | ✅ | — |
| JSON | .json | ✅ | ✅ | — |
| Markdown | .md | ✅ | — | — |
| Python | .py | ✅ | ✅ | — |
| Java | .java | ✅ | ✅ | — |
| C++ | .cpp | ✅ | ✅ | — |
| PHP | .php | ✅ | ✅ | — |
| Plain Text | .txt | — | — | — |

---

## Security

- Supabase Row Level Security: users can only read/write their own files and profile
- Preview iframe uses `sandbox="allow-scripts"` — no access to parent page, cookies, or session
- Passwords handled entirely by Supabase Auth (never stored by PlexCode)
- No backend server — all auth tokens stay in the browser

---

## License

MIT
