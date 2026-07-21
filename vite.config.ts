import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/
// so the base path must match your repo name. Update this if you rename
// the repo, or set it to '/' if you deploy to a user/org root site
// (a repo literally named <user>.github.io).
export default defineConfig({
  plugins: [react()],
  base: '/todo-tracker/',
})
