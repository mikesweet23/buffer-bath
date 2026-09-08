# Buffer and Bath Heat Planner

Standalone export of version 4 of the calculator, prepared 8 September 2026.
Calculations and the interface are retained. Hosting is now a static Vite/React
build, without ChatGPT authentication, a server, API keys or a database.
Fonts are bundled locally. Paths work at a domain root or GitHub repository subpath.

## Easiest: GitHub Pages (no build required)

1. Extract this ZIP on your computer.
2. Create a GitHub repository and upload all the extracted contents, keeping the folders intact.
3. In the repository, open Settings > Pages.
4. Under Build and deployment, choose Deploy from a branch.
5. Choose the main branch and the /docs folder, then save.
6. GitHub will show your website address when publishing finishes.

The docs folder is the complete ready-built website. Keep its index.html,
assets folder, icons, manifest and service worker together. Upload the extracted
files, not the ZIP itself. GitHub Pages serves this calculator publicly.

## Other static hosting

Upload the contents of docs to your hosting provider's public website folder.
No build command or server is needed when using these ready-built files.

## Edit and rebuild

Install Node.js 22.13 or later and pnpm 11, then run from the extracted folder:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Edit src/App.tsx for the calculator and src/globals.css for its appearance.
To create a new production build:

```sh
pnpm build
pnpm preview
```

The fresh website is written to dist. Replace the contents of docs with the
contents of dist and upload/commit the updated docs folder to publish your changes.
For a hosting service that builds from your repository, use `pnpm build` as the
build command and `dist` as the output folder.

## Saved inputs and offline use

Inputs are stored locally in the browser on each website address. Existing saved
inputs on the old address do not automatically move to the new address; re-enter
the values you want to retain. No user input data is included in this export.
The app uses a service worker for offline caching after online use; use HTTPS
hosting (or localhost for development). Opening index.html by double-clicking
is not a supported way to run the app.

The export does not change or remove the original hosted site.

GitHub publishing reference: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

