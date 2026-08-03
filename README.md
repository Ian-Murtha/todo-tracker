# To-Do Tracker

A to-do list / tracker app. Sign in with a magic link (no password), create
lists — checkbox lists or recurring lists that reset on a schedule — nest
lists inside each other for organization, add checkbox entries (which can
also be nested into collapsible folders), and drag-and-drop to reorder or
re-nest anything. Data is stored in Supabase (Postgres), scoped privately to
your account.

Everything below is done through the browser — Supabase's dashboard,
GitHub's website, and GitHub Pages. You don't need to install Node, npm, or
git on your computer. The one local step is unzipping the project folder so
you can upload it to GitHub.

---

## If you're setting this up fresh

### 1. Create the Supabase project

1. Go to https://supabase.com, sign in, and click **New Project**.
2. Open the **SQL Editor** → **New query**, paste the contents of
   `supabase/schema.sql`, and click **Run**. This creates all tables, the
   ownership/nesting/recurring columns, and the row-level security policies
   in one go.
3. Go to **Project Settings → API** and note down:
   - **Project URL**
   - **anon public** key

### 2. Configure Supabase Auth (magic link)

1. Go to **Authentication → Sign In / Providers** and make sure **Email**
   is enabled. Signup is open to anyone by default — no extra config needed
   for that.
2. Go to **Authentication → URL Configuration**. Once you know your GitHub
   Pages URL (step 5 below — you can come back and set this after), set:
   - **Site URL**: `https://your-username.github.io/todo-tracker/`
   - **Redirect URLs**: add the same URL
   This is what the magic link email uses to send people back to the right
   place instead of `localhost`.

### 3. Create the GitHub repository

1. Unzip the project folder on your computer.
2. Go to https://github.com/new. Name the repository **todo-tracker** (this
   name matters — see the note in step 5) and set it Public or Private.
   Do **not** check "Add a README" — leave the repo empty.
3. Click **Create repository**, then click **uploading an existing file**.
4. Drag the *entire contents* of the unzipped `todo-tracker` folder into the
   upload area (including the `.github` and `supabase` folders — dragging
   the whole folder in one go, rather than picking files individually,
   makes sure hidden folders like `.github` come along too).
5. Scroll down and click **Commit changes**.

### 4. Add your Supabase credentials as GitHub secrets

1. In your repo, go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret** and add, one at a time:
   - `VITE_SUPABASE_URL` — your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon public key

### 5. Enable GitHub Pages

1. Go to **Settings → Pages**. Under "Build and deployment", set **Source**
   to **GitHub Actions**.
2. Check `vite.config.ts` — it has `base: '/todo-tracker/'`, which must
   match your repo name exactly. If you renamed the repo, edit this line
   to match (or `base: '/'` if your repo is `your-username.github.io`).

### 6. Watch it deploy

Go to the **Actions** tab — a "Deploy to GitHub Pages" workflow should be
running. Once it finishes (green check), your app is live at
`https://your-username.github.io/todo-tracker/`. Sign in with your email to
get started.

---

## If you already have this app deployed (upgrading)

This update adds login, nested lists, and recurring lists — it touches the
database, so there's a specific order to follow:

1. **Run the migration in two steps.** In Supabase's SQL Editor:
   - First run `supabase/migration_003_auth_and_recurring_lists.sql`.
   - Then upload the updated app files to GitHub (below) and sign in once
     with your email to create your account.
   - Then come back and run `supabase/migration_004_claim_existing_lists.sql`
     (it has inline instructions for finding your user id and claiming your
     existing lists). Skipping this step means your old lists stay
     invisible — they aren't deleted, just hidden until claimed.
2. **Configure Auth URLs** — see step 2 above (Site URL / Redirect URLs
   pointing at your existing GitHub Pages URL).
3. **Upload the changed/new files** to your GitHub repo (same drag-and-drop
   upload flow), replacing existing ones, then commit to `main`:
   - `src/types.ts`, `src/App.tsx`, `src/tree.ts`, `src/entryTree.ts`,
     `src/listTree.ts` (new), `src/resetEngine.ts` (new), `src/index.css`
   - `src/components/ListSidebar.tsx`, `src/components/ListRow.tsx` (new),
     `src/components/ListView.tsx`, `src/components/AuthGate.tsx` (new),
     `src/components/HistoryGrid.tsx` (new)
   - `supabase/schema.sql`, `supabase/migration_003_auth_and_recurring_lists.sql`
     (new), `supabase/migration_004_claim_existing_lists.sql` (new)
4. Pushing to `main` auto-redeploys via the existing Actions workflow.

## Making changes later

Edit any file directly on github.com using the pencil (edit) icon, or
upload replacement files the same way as above. Every commit to `main`
automatically redeploys the site.

## How the features work

**Login** — magic link only, no password. Enter your email, click the link
it sends you, and you're in. Your browser stays signed in indefinitely
(via `localStorage`) until you sign out or clear browser data.

**Privacy** — row-level security means other users can never see your data
through the app. As the project owner, you can still see all data directly
in the Supabase dashboard (Table Editor / SQL Editor) — RLS only governs
what the app's API can access, not your own admin access.

**Nested lists** — any list can contain sub-lists (drag one onto the middle
of another to nest it, or use the **+** button), to any depth. A list can
hold both its own entries and sub-lists at once.

**Nested entries** — same pattern, one level down: entries within a list
can contain sub-entries, collapsible into folders. Checking a folder checks
everything inside it; checking every item inside auto-checks the folder.

**Recurring lists** — set a list's type to "Recurring" in its ⚙ Settings
panel and pick an interval (daily/weekly/monthly/custom N days). Since this
is a static site with no background server, the reset happens the next
time you open the app after the interval has elapsed — not at the exact
moment it ticks over. On reset, each entry's completion state is logged to
history, then all checkboxes clear for the new cycle. View that history via
the 📊 History button — a simple grid of entries × past cycles.

## Project structure

```
src/
  components/
    AuthGate.tsx       - magic-link login screen + session handling
    ListSidebar.tsx     - nested list tree (sidebar), drag-and-drop context
    ListRow.tsx         - a single draggable/nestable list row
    ListView.tsx        - entries for the selected list, settings, history
    EntryRow.tsx         - a single draggable/nestable checkbox entry
    HistoryGrid.tsx      - completion history table for recurring lists
  App.tsx               - top-level state + Supabase calls
  supabaseClient.ts     - Supabase client init
  tree.ts               - shared drag-and-drop drop-zone math
  entryTree.ts           - entry tree logic (flatten, cascade, move)
  listTree.ts            - list tree logic (flatten, move)
  resetEngine.ts          - recurring-list interval math + reset logic
  types.ts               - shared TypeScript types
supabase/
  schema.sql                                   - fresh-install schema
  migration_002_nested_entries.sql             - upgrade: nested entries
  migration_003_auth_and_recurring_lists.sql   - upgrade: auth, nested lists, recurring lists
  migration_004_claim_existing_lists.sql       - upgrade: claim old lists after first login
.github/workflows/
  deploy.yml            - builds the app and deploys it to GitHub Pages
```
