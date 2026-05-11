# Sunrise Sai Real Estate Platform

## Deploy to GitHub Pages

This project is configured for GitHub Pages deployment from the `main` branch using GitHub Actions.

### One-time repository setup

1. Go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

### How deployment works

- Workflow file: `.github/workflows/deploy-gh-pages.yml`
- Trigger: push to `main` (or manual run from Actions tab)
- Build command: `npm run build`
- Published artifact: `dist/`
