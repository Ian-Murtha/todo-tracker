# To-Do Tracker

A to-do list / tracker app. Create lists with a title, add checkbox entries,
check them off, and drag-and-drop to reorder entries. Data is stored in
Supabase (Postgres). No login required.

Everything below is done through the browser — Supabase's dashboard,
GitHub's website, and GitHub Pages. You don't need to install Node, npm, or
git on your computer. The one local step is unzipping the project folder so
you can upload it to GitHub.

## 1. Create the Supabase project

1. Go to https://supabase.com, sign in, and click **New Project**.
2. Once it's created, open the **SQL Editor** (left sidebar) → **New query**.
3. Open `supabase/schema.sql` from this project (any text editor, or view it
   on GitHub after you upload), copy its contents, paste into the SQL
   editor, and click **Run**. This creates the `lists` and `entries` tables.
4. Go to **Project Settings → API**. You'll need two values from this page
   in step 3 below:
   - **Project URL**
   - **anon public** key

Keep this tab open, you'll copy these in a moment.

## 2. Create the GitHub repository

1. Unzip the project folder on your computer if you haven't already.
2. Go to https://github.com/new. Name the repository **todo-tracker** (this
   name matters — see the note in step 4) and set it to Public or Private,
   your choice. Do **not** check "Add a README" — leave the repo empty.
3. Click **Create repository**. On the next page, click the
   **uploading an existing file** link.
4. Drag the *entire contents* of the unzipped `todo-tracker` folder into the
   browser upload area (including the `.github` and `supabase` folders —
   dragging the whole folder in one go, rather than picking files
   individually, makes sure hidden folders like `.github` come along too).
5. Scroll down and click **Commit changes**.

## 3. Add your Supabase credentials as GitHub secrets

The app needs your Supabase URL and key at build time. Since there's no
server, these are stored as encrypted GitHub Actions secrets rather than a
`.env` file.

1. In your new repo, go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret** and add:
   - Name: `VITE_SUPABASE_URL` — Value: your Supabase Project URL
   - Name: `VITE_SUPABASE_ANON_KEY` — Value: your Supabase anon public key
   (two separate secrets, added one at a time)

## 4. Enable GitHub Pages

1. Go to **Settings → Pages**.
2. Under "Build and deployment", set **Source** to **GitHub Actions**.
3. Check `vite.config.ts` in your repo — it has `base: '/todo-tracker/'`.
   This must match your repo name exactly. If you named your repo something
   other than `todo-tracker`, click the pencil/edit icon on that file in
   GitHub and change the path to match (e.g. `/my-repo-name/`). If your repo
   is named `your-username.github.io` (a personal site), set it to `base: '/'`
   instead.

## 5. Watch it deploy

1. Go to the **Actions** tab in your repo. You should see a "Deploy to
   GitHub Pages" workflow running (it triggers automatically once you push
   or upload files to `main`).
2. Wait for it to finish (a green checkmark, usually under a minute).
3. Your app is now live at:
   `https://your-username.github.io/todo-tracker/`

## Making changes later

Edit any file directly on github.com using the pencil (edit) icon, or
upload replacement files the same way as step 2. Every commit to the `main`
branch automatically re-triggers the Actions workflow and redeploys the
site — no extra steps needed.

## Notes on security

There's no login in this version, so anyone with your deployed URL can
read/write your lists (the Supabase anon key is meant to be public — it's
visible in the browser regardless). That's fine for a personal tool you
don't share widely. If you later want multiple users or stricter access,
add Supabase Auth and update the row-level security policies in
`supabase/schema.sql` to scope rows by `auth.uid()`.

## Project structure

```
src/
  components/
    ListSidebar.tsx   - list picker, create/rename/delete lists
    ListView.tsx       - entries for the selected list, drag-and-drop context
    SortableEntry.tsx  - a single draggable checkbox entry
  App.tsx              - top-level state + Supabase calls
  supabaseClient.ts    - Supabase client init
  types.ts             - shared TypeScript types
supabase/
  schema.sql           - table + RLS setup
.github/workflows/
  deploy.yml           - builds the app and deploys it to GitHub Pages
```
