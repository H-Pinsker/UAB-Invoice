# UaB Invoice

Private invoicing web app. The source lives here only so it can be built and
deployed via GitHub Pages.

## Development

```bash
npm install
cp .env.example .env.local   # add your own backend credentials
npm run dev
npm test
npm run build
```

Configuration (backend URL, keys, deployment base path) is provided through
environment variables and CI secrets — see `.env.example`.
