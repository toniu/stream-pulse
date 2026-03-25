# pyAux frontend (Next.js)

Run the Next.js frontend which proxies `/api/*` to the Flask backend on port 5001.

Install and run:

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:3000

Notes:
- The Next dev server rewrites `/api/*` to http://localhost:5001/api/* (see `next.config.js`).
- Ensure the Flask backend is running on port 5001 before calling API routes.
