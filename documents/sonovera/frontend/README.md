# Sonovera Frontend

React + Vite + Tailwind UI for the image-forensics web app.

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Make sure the backend is running on port 8000
(Vite proxies `/api/*` to it).

## Build for production

```bash
npm run build
```

Static output goes to `dist/`.

## Deploy to Vercel

```bash
# from /frontend
npx vercel --prod
```

Set the env var `VITE_API_BASE` to your backend URL (e.g. `https://sonovera-api.up.railway.app`).
If left unset, requests go to `/api`, which only works with the dev proxy.

## Design notes

- Aesthetic: warm dark forensic terminal
- Display: Instrument Serif (Google Fonts)
- Body: Geist
- Mono: JetBrains Mono
- Palette in `tailwind.config.js` under `theme.extend.colors`
- All colors are CSS-driven through Tailwind tokens
