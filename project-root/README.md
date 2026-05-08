# LeadFlow

LeadFlow is a modern fullstack lead management CRM for sales reps to manage leads, track discussions, schedule follow-ups, and update pipeline status from one focused dashboard.

## Tech Stack

- Frontend: React, Vite, TypeScript, TailwindCSS, shadcn-style UI primitives
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL, Prisma ORM
- State: React Query for server state, Zustand for UI state
- Forms: React Hook Form, Zod
- Dates and icons: date-fns, lucide-react

## Project Structure

```text
project-root/
  backend/
    prisma/
      schema.prisma
      seed.ts
    src/
      controllers/
      middleware/
      routes/
      services/
      utils/
  frontend/
    src/
      components/
      features/
      hooks/
      pages/
      services/
      store/
      types/
  docker-compose.yml
  .env.example
```

## Quick Start

Copy the environment example if you want local `.env` files:

```bash
cp .env.example .env
```

Start PostgreSQL with Docker:

```bash
docker-compose up db
```

Set up and run the backend:

```bash
cd backend
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

Set up and run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Database: `localhost:5432`

## Docker

Run the full stack:

```bash
docker-compose up --build
```

The backend container runs `prisma db push`, seeds demo leads, and starts the Express API. The frontend runs Vite on port `5173`.

## Environment Variables

```text
DATABASE_URL="postgresql://leadflow:leadflow@localhost:5432/leadflow?schema=public"
PORT=8000
CORS_ORIGIN=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8000/api
```

## API Overview

### Leads

- `GET /api/leads` returns all leads with discussions.
- `POST /api/leads` creates a lead with default status `NEW`.
- `PATCH /api/leads/:id` updates lead fields such as status or follow-up time.

### Discussions

- `POST /api/leads/:id/discussions` creates a timeline discussion and updates the lead follow-up.

## Seed Data

`backend/prisma/seed.ts` creates sample leads across all core statuses, including:

- Today's follow-up pinned at the top
- Overdue follow-up highlighted in red
- Multiple discussion history entries
- Won and lost pipeline examples

## UI Notes

The UI is a single responsive CRM workspace with:

- Search by lead name
- Status filter pills
- Today's follow-ups pinned above the main list
- Overdue highlighting
- Timeline dialog with status updates and discussion logging
- Add lead dialog with validation
- Dark mode toggle
- Loading skeletons and empty states
- Optimistic React Query updates

## Screenshots

### Lead List

![LeadFlow lead list](docs/screenshots/lead-list.png)

### Add New Lead

![LeadFlow add lead modal](docs/screenshots/add-lead.png)

### Lead Timeline

![LeadFlow lead timeline dialog](docs/screenshots/lead-timeline.png)

