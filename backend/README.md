Backend Service
===============

Environment Setup
-----------------
Create a local `.env` file based on `.env.example`:

```
cp backend/.env.example backend/.env
```

Fill in the required values:

```
MONGODB_URI=your-mongodb-uri
JWT_SECRET=change-me
```

Optional (development helpers):
```
USE_MEMORY_DB=true        # fallback to in-memory Mongo if no MONGODB_URI
DEV_AUTO_SEED=true        # seed sample data when using memory DB
ADMIN_SECRET_CODE=dev-secret
```

Running Locally
---------------
```
npm run dev:backend
```

API Base: `http://localhost:5000/api`

Security Notes
--------------
Never commit `.env`. The root `pva-bazaar-app.env` is a stub only.
# Backend setup

1) Environment

- Copy `.env.example` to `.env` and set real values.
- Required keys: `MONGODB_URI`, `JWT_SECRET`.
- Do NOT commit `.env`.

2) Start the API (local dev)

- With in-memory Mongo: `PORT=5000 NODE_ENV=development USE_MEMORY_DB=true DEV_AUTO_SEED=true npm run dev`

3) CORS

- Set `ALLOWED_ORIGIN` to your frontend dev URL (default Vite: `http://localhost:5173`).
- The API mounts under `/api/*` as configured in `backend/api/index.js`.
