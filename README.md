# Tech Pilot Classes

Tech Pilot Classes is a scholarship application and student portal prototype for beginner friendly technology courses. The current onboarding experience is a frontend pilot; enrollment, sign in, and student records are not connected to a production backend yet.

## What is in the app

- A multi-step scholarship application for Data Analysis, Frontend Development, Backend Development, Cybersecurity, and Virtual Assistant courses.
- Applicant details and course-specific questions. Answers are kept in the browser's `sessionStorage` for the current session.
- Application confirmation and links to the Tech Pilot WhatsApp community.
- Student portal screens for course information, tests, assignments, attendance, and announcements. These screens use sample content and local interaction state.
- An admin screen directory at `/admin` for previewing the available screens.

The app currently uses a local course list. Sign in and sign up are placeholders, and the portal is not authenticated. The API server currently exposes only `GET /api/healthz`; the course and enrollment endpoints in the OpenAPI contract have not been implemented. Do not use the current app to collect or manage real applications.

## Requirements

- Node.js 24
- pnpm 10

This is a pnpm workspace. Run commands from the repository root.

## Run the onboarding app

The Vite configuration requires `PORT` and `BASE_PATH` in every mode. In PowerShell:

```powershell
$env:PORT = "4173"
$env:BASE_PATH = "/"
pnpm install
pnpm --filter @workspace/tech-pilot-onboarding dev
```

Open the local URL printed by Vite. To build the onboarding app locally, use the same environment variables and run:

```powershell
pnpm --filter @workspace/tech-pilot-onboarding build
```

The static site is written to `artifacts/tech-pilot-onboarding/dist/public`.

## Workspace commands

```powershell
pnpm run typecheck
pnpm run build
```

The root build typechecks the workspace and runs the build scripts in workspace packages. Vite packages still require `PORT` and `BASE_PATH` to be set.

## Deployment

Netlify settings are in `netlify.toml`. It builds `@workspace/tech-pilot-onboarding` with `PORT=4173` and `BASE_PATH=/`, then publishes `artifacts/tech-pilot-onboarding/dist/public`.

## Repository map

| Path | Purpose |
| --- | --- |
| `artifacts/tech-pilot-onboarding` | Main Tech Pilot onboarding and portal frontend (Vite + React) |
| `artifacts/mockup-sandbox` | Separate UI mockup sandbox |
| `artifacts/api-server` | Express API server; currently implements the health check only |
| `lib/api-spec/openapi.yaml` | API contract and source for generated API clients and schemas |
| `lib/api-client-react` | Generated React Query API hooks and shared fetch helper |
| `lib/api-zod` | Generated Zod API schemas and types |
| `lib/db` | Drizzle ORM schema and database package |
| `scripts` | Workspace utility scripts |
| `netlify.toml` | Netlify build and publish configuration |

## API and data status

The OpenAPI contract describes course and enrollment operations in addition to the health check. Those routes are not currently registered by `artifacts/api-server`, and the app's course picker uses hard-coded fallback data. The scholarship answers and several portal interactions are stored only in browser session state; they do not create persistent server records.

The database package expects `DATABASE_URL` when running Drizzle commands. No database connection is needed to build the static onboarding frontend.
