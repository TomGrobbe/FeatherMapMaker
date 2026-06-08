import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE: `base` must match the GitHub Pages project path, i.e. the repository name.
// If you rename the repo, update this to '/<new-repo-name>/'.
export default defineConfig({
  base: '/FeatherMapMaker/',
  plugins: [react()],
})
