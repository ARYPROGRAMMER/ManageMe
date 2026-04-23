<p align="center">
	<img src="./readme-logo.svg" alt="ManageMe Logo" />
</p>

<p align="center">
	A modern workspace, project, and member management dashboard built with Next.js, Appwrite, and Tailwind CSS.
</p>

<p align="center">
	<a href="#features">Features</a>
	·
	<a href="#tech-stack">Tech Stack</a>
	·
	<a href="#getting-started">Getting Started</a>
	·
	<a href="#environment-variables">Environment Variables</a>
	·
	<a href="#project-structure">Project Structure</a>
	·
	<a href="#license">License</a>
</p>

---

## Overview

ManageMe is a dashboard-style web application for organizing workspaces, projects, and members in a clean, responsive interface. It uses Appwrite as a backend for authentication, database, and storage, and leverages modern React tooling like TanStack Query and Zod for robust data-fetching and validation.

The app is built with the Next.js App Router, server components, and a set of reusable UI primitives to keep the UX fast, accessible, and consistent.

## Features

- **Authentication flows**: Sign in / sign up pages and auth layout in `src/app/(auth)`.
- **Dashboard experience**: Workspace-centric dashboard in `src/app/(dashboard)`.
- **Standalone workspaces**: Standalone workspace routes in `src/app/(standalone)`.
- **Workspace management**: Workspace switching and creation via `features/workspaces` and `components/workspace-switcher.tsx`.
- **Project management**: Create, edit, delete, and list projects in `features/projects`.
- **Member management**: Member listing, avatars, and role utilities in `features/members`.
- **Typed server routes**: API routes under `src/app/api` using Hono and Zod validation.
- **Reusable UI kit**: Collection of headless UI components under `src/components/ui` (buttons, dialogs, tables, etc.).
- **Responsive layout**: Mobile sidebar, navbar, and responsive modal components for smaller screens.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, custom components, `tailwindcss-animate`
- **State & Data**: React Query (`@tanstack/react-query`), React Hook Form
- **Backend**: Appwrite (database, authentication, storage)
- **Validation**: Zod + `@hono/zod-validator`
- **UI / Icons**: Radix UI primitives, `lucide-react`, `sonner` for toasts

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm, pnpm, yarn, or bun
- An Appwrite project (self-hosted or Appwrite Cloud)

### Install dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
# or
bun install
```

### Configure environment variables

Create a `.env.local` file in the project root and add the Appwrite configuration (see [Environment Variables](#environment-variables)).

### Run the development server

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
# or
bun dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
npm start
```

## Environment Variables

The Appwrite resources are configured via environment variables, consumed in `src/config.ts`.

Create a `.env.local` file with at least:

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=your-appwrite-endpoint
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-appwrite-project-id

NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_WORKSPACES_ID=your-workspaces-collection-id
NEXT_PUBLIC_APPWRITE_MEMBERS_ID=your-members-collection-id
NEXT_PUBLIC_APPWRITE_PROJECTS_ID=your-projects-collection-id

NEXT_PUBLIC_APPWRITE_IMAGES_BUCKET_ID=your-images-bucket-id
NEXT_PUBLIC_APPWRITE_FILES_BUCKET_ID=your-files-bucket-id
```

You may have additional secrets for auth or other Appwrite features depending on how the backend is configured.

## Project Structure

High-level overview of the main folders:

- `src/app` – Next.js App Router entrypoint, layouts, and routes
  - `(auth)` – authentication layouts and pages (`sign-in`, `sign-up`)
  - `(dashboard)` – authenticated dashboard layout and workspace overview
  - `(standalone)` – standalone workspace routes and creation flow
  - `api` – API routes (`[[...route]]/route.ts`) for server-side logic
- `src/features` – feature-based modules (auth, workspaces, projects, members)
  - `auth` – auth schemas, queries, hooks, and components
  - `workspaces` – workspace types, schemas, hooks, and server routes
  - `projects` – project CRUD logic, queries, and forms
  - `members` – member utilities, API hooks, and avatar components
- `src/components` – shared layout and UI components
  - `ui` – base UI primitives (button, dialog, table, tabs, etc.)
  - `navbar`, `sidebar`, `mobile-sidebar`, `workspace-switcher`, etc.
- `src/lib` – app-level utilities and integrations
  - `appwrite.ts` – Appwrite client setup
  - `rpc.ts` – RPC-style helpers
  - `session-middleware.ts` – session handling utilities
  - `utils.ts` – general-purpose helpers

## Development Notes

- This project uses the **App Router**; pages are server components by default.
- Data fetching is typically handled through feature-level hooks in `features/*/api` combined with `@tanstack/react-query`.
- Validation is handled via Zod schemas in `features/*/schemas.ts` and `features/*/schema.ts`.
- UI components are designed to be reusable and composable; prefer using the primitives under `src/components/ui` before adding new ones.

## Scripts

Useful `package.json` scripts:

- `dev` – start the Next.js development server
- `build` – build the production bundle
- `start` – start the production server
- `lint` – run ESLint

## Contributing

Contributions, bug reports, and feature requests are welcome. Feel free to open an issue or submit a pull request.

Before submitting a PR:

1. Run `npm run lint` and fix any linting errors.
2. Ensure the app builds and key flows still work.

## License

This project is licensed under the MIT License. See [`LICENSE`](./LICENSE) for details.
