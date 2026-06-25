# Frankloo

Frankloo is a comprehensive, collaborative workspace and board productivity platform designed to coordinate tasks, documents, goals, and external integrations in a single unified interface.

## Overview

Frankloo is structured as a monorepo containing a decoupled frontend and backend. The application enables users to manage multiple workspaces, collaborate using Kanban-style boards, write documents in a Notion-like workspace, track project-wide goals and milestones, and sync external sources like Gmail, Slack, Discord, and GitHub. Real-time updates are powered by WebSockets to ensure updates propagate instantly across all active users in a workspace.

## Key Features

### Workspace Management and Customization
- Create and manage public or private workspaces.
- Invite members to join via robust workspace invitation flows.
- Track delivery status of invitations (Pending, Delivered, Failed) with detailed logs and an audit trail.
- Customize workspace-level email branding, custom SMTP settings, logos, and accent colors for invitation templates.

### Interactive Kanban Boards
- Organize tasks with custom lists/columns and drag-and-drop cards.
- Add advanced card details including priorities (Low, Medium, High, Urgent), due dates, estimated and logged time tracking, checklists, attachments, comments, and activity logs.
- Link tasks to milestones and sprints to track project phases.
- Configure automation rules to trigger actions (such as setting priorities, moving cards, or sending notifications) when specific events occur.
- Save custom search filters for quick queries.

### Notion-like Document Workspace
- Structure documents hierarchically using Spaces, Folders, and Documents.
- Tag and favorite documents for quick access.
- Support for collaborative editing features, revision history, and inline suggestions.
- Link cards, boards, and goals directly into documents.

### Goals and Key Results (OKRs)
- Set, track, and manage workspace-level goals and associated key results.
- Visualize progress through dynamic updates.
- Associate goals directly with cards, boards, and documents.

### Unified Inbox and Gmail Sync
- Consolidate incoming requests, quick items, and tasks into a unified inbox.
- Sync external accounts via Google OAuth 2.0 to import emails into the inbox.
- Convert inbox items directly into board cards.
- Configure automated email summaries, upcoming deadline notifications, and overdue task alerts.

### Integrations
- Connect and configure webhooks for Slack, Discord, GitHub, and Google Calendar.
- Monitor events and trigger workspace updates automatically.

## Technology Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand (State management)
- React Router DOM
- Socket.io-client (Real-time updates)
- Lucide React (Icons)
- Recharts (Analytics and charting)

### Backend
- Node.js (Express framework)
- SQLite (Database)
- Prisma (ORM)
- Socket.io (WebSocket server)
- Nodemailer (Email integration)
- Google APIs (OAuth 2.0 and Gmail integration)
- JSON Web Tokens (Authentication)
- bcryptjs (Password hashing)

## Getting Started

### Prerequisites
- Node.js (version 20 or higher recommended)
- npm (Node Package Manager)

### Installation
From the root directory, install all dependencies for both the frontend and backend using the root setup script:
```bash
npm run install:all
```

### Database Initialization
Initialize and seed the SQLite database:
```bash
# Run migrations to set up database schema
npm run db:migrate

# Generate the Prisma client
npm run db:generate

# Populate the database with default seed data
npm run db:seed
```

## Project Structure

```text
trel/
├── backend/
│   ├── prisma/             # Prisma schema and SQLite database
│   ├── src/
│   │   ├── middleware/     # Express route middlewares
│   │   ├── routes/         # Express API endpoints
│   │   ├── utils/          # Helper utilities
│   │   ├── db.js           # Database client initialization
│   │   ├── index.js        # Main server entry point
│   │   ├── seed.js         # Initial database seeder
│   │   └── socket.js       # WebSocket configuration
│   └── package.json
├── frontend/
│   ├── public/             # Static public assets
│   ├── src/
│   │   ├── assets/         # App assets (logos, images)
│   │   ├── components/     # Reusable React components
│   │   ├── store/          # Zustand global state store
│   │   └── index.html      # Application main HTML page
│   ├── tailwind.config.js  # Tailwind CSS configuration
│   ├── tsconfig.json       # TypeScript configuration
│   ├── vite.config.ts      # Vite configuration
│   └── package.json
├── package.json            # Root configuration and run scripts
└── README.md               # Main project documentation
```
