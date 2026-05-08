# CodeLens AI

CodeLens AI is a code review platform for individual developers and teams. It combines AI-powered feedback, Socratic coaching, GitHub pull request review, team workspaces, and manager dashboards so code can be reviewed faster and shipped with more confidence.

## What The Website Does

CodeLens AI lets users:

- Paste code and get an AI review with suggestions, severity, and confidence scoring.
- Switch between review personas such as FAANG Engineer, Startup CTO, and Security Auditor.
- Use Socratic mode to be guided toward the fix through questions instead of just receiving an answer.
- Re-review code after changes to see which findings were resolved, which are new, and which remain.
- Connect GitHub and review pull requests directly from a repository.
- Browse repository files and review code in context.
- Create shared workspaces for teams and invite members with links or email invites.
- View workspace dashboards that summarize PR activity, reviewed PRs, release readiness, and quality signals.
- Generate release readiness reports for a sprint or selected PR set.
- Make approve / reject decisions on reviewed work and leave manager feedback.
- Receive and manage notifications for workspace activity.
- View review history and reopen past reviews.
- Customize the app through settings for theme, default persona, preferred language, and email notifications.
- Recover accounts with forgot-password and reset-password flows.

## Main User Flows

### 1. Landing And Sign In

New visitors land on the marketing page, where the app explains its review personas, team workflow, and AI coaching approach. Users can register, log in, or read the privacy and terms pages before starting.

### 2. Onboarding

The onboarding flow walks a new user through the product:

- A short introduction to the product.
- A first sample code review.
- A demonstration of Socratic mode.
- Optional GitHub connection to unlock repository and PR workflows.

### 3. Individual Code Review

Inside the dashboard, users can paste code into the editor, pick a persona, and submit it for review. The app returns:

- A verdict such as approved, needs revision, or minor issues.
- A summary of the main problem.
- Suggestion cards with severity and confidence.
- Re-review support after changes are made.

### 4. GitHub Pull Request Review

Users can connect GitHub, choose a repository, pick a pull request, and review the PR in context. The PR review flow includes repository selection, PR selection, file selection, and a file-organized review panel that can be copied into a GitHub comment.

### 5. Team Workspaces

Workspaces are the team layer of the product. Members can:

- Create or join workspaces.
- Invite teammates by email or invite link.
- Link a repository to the workspace.
- View team members and pending invites.
- See reviewed PRs and workspace-specific review activity.

### 6. Manager Dashboard

Workspace managers get a release-focused dashboard that summarizes team PRs, review quality, and status. From there they can:

- Filter PRs by review state or risk.
- Review findings across the team.
- Approve or request changes with feedback.
- Generate release reports for a sprint.
- Track readiness signals and blockers.

### 7. Settings And Account Management

Users can customize their account and review preferences from Settings. The app supports:

- Theme selection.
- Default review persona.
- Preferred language.
- Email notification preferences.
- GitHub connection status and disconnecting GitHub.
- Email updates for non-GitHub-managed accounts.

## Product Architecture

The repository is organized as a full-stack monorepo:

- `frontend/` contains the React + Vite client.
- `backend/` contains the Express API and service modules.
- `gateway/` contains the reverse proxy / gateway configuration.
- `uploads/` stores avatar and other uploaded files.

The backend is split into service-focused modules for authentication, reviews, workspaces, dashboards, history, settings, notifications, GitHub integration, file browsing, jobs, and Socratic sessions. The app uses MongoDB for persistence and RabbitMQ for background and event-driven workflows.

## Tech Stack

- Frontend: React, Vite, React Router, Axios, Monaco editor
- Backend: Node.js, Express, MongoDB, Mongoose
- Messaging: RabbitMQ
- Auth: JWT, cookies, GitHub OAuth / GitHub connection flows
- Uploads and static assets: Express static hosting

## Local Development

The quickest way to run the full stack locally is with Docker:

```bash
npm run docker:dev
```

Useful companion commands:

```bash
npm run docker:stop
npm run docker:logs
npm run docker:ps
```

If you want to run the frontend or backend separately:

```bash
cd frontend
npm run dev
```

```bash
cd backend
npm run dev
```

## Production Notes

The deployment docs in this repository describe the production setup in more detail. In particular, the frontend expects a `VITE_API_URL` value in production, and the backend uses `FRONTEND_URL` for CORS allow-listing.

## Key Routes

- `/` and `/landing` - marketing / entry experience
- `/login` and `/register` - authentication
- `/onboarding` - guided first-run setup
- `/dashboard` - main review workspace
- `/workspace` - team workspace list
- `/workspace/:id` - workspace details
- `/workspace/:id/dashboard` - manager dashboard
- `/join/:token` - workspace invite acceptance
- `/settings` - personal preferences and integrations
- `/forgot-password` and `/reset-password/:token` - account recovery

## In One Sentence

CodeLens AI is an AI code review platform that helps developers review code, helps teams manage pull requests and workspaces, and helps managers decide when software is ready to ship.