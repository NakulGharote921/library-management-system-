# Lumina Library — Frontend

React SPA for the Lumina Library Management System. Built with React 19, Vite, Redux Toolkit, Tailwind CSS, and Axios.

## Getting Started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000` and expects the backend API at `http://localhost:8081/api` (set `VITE_API_BASE_URL` in a `.env` file to override).

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build + SPA redirect file for Netlify |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | ESLint check |

## Structure

```
src/
├── components/     # Reusable UI (Modal, Button, FormInput, DataTable, skeletons...)
├── constants/      # Branding & app constants
├── layout/         # AppLayout, Navbar, Sidebar
├── pages/          # 25 routed page components
├── services/       # Axios API clients (auth, books, categories, subscriptions...)
└── store/          # Redux slices (auth, ui) + CategoryProvider context
```

## Highlights

- **Portal-based modals** — rendered into `document.body` via `ReactDOM.createPortal`, viewport-centered, focus-trapped, with body scroll-locking
- **Cached category store** — global context fetches categories once, refetches on mutations, powers every dropdown/filter
- **Role-aware UI** — `ProtectedRoute` + `RoleGuard` gate routes and conditionally render navigation based on the Redux auth state
- **Dark mode** — Tailwind `dark` class persisted to localStorage
- **Responsive** — mobile-first, collapsible sidebar, adaptive grids

## Related

Full setup instructions, API reference, and deployment guide live in the [root README](../README.md).
