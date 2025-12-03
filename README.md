# GATE Exam Simulator
Deploy test update

This repository contains a React + Vite + Tailwind implementation of the GATE Exam Simulator.
It includes:
- Exam creation (MCQ / MSQ / NAT)
- JSON import/export for tests
- Timer, question palette, mark-for-review, and result evaluation
- On-screen calculator
- Responsive UI using TailwindCSS

## How to run locally

```bash
# install dependencies
npm install

# run dev server
npm run dev

# build
npm run build

# preview build
npm run preview
```

## Deployment

This repo includes a GitHub Actions workflow to build and deploy the `dist/` folder to the `gh-pages` branch automatically.
After you push this repository to GitHub (create a repository and push `main`), the action will run and publish the site on GitHub Pages.

If you prefer Vercel / Netlify, you can connect the repository to those services instead.
 # git add .
 #   git commit -m "Upgrade to PDF Simulator"
  #  git push -f origin main