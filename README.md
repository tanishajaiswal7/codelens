# CodeLens AI

> AI-powered code review platform with intelligent feedback, Socratic debugging, GitHub integration, and team collaboration workflows.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-CodeLensAI-6366f1?style=for-the-badge)](https://codelens-flame.vercel.app)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge)](https://vercel.com)
[![Backend](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=for-the-badge)](https://railway.app)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

# Overview

CodeLens AI is a full-stack AI code review platform designed for developers and engineering teams.  
The platform analyzes code using multiple AI reviewer personas, provides intelligent feedback with confidence scores, and helps developers learn through an interactive Socratic debugging experience.

Beyond individual reviews, CodeLens AI also supports team workspaces, GitHub pull request analysis, release readiness reporting, and collaborative review workflows.

---

# Key Features

## AI Code Review Engine

- Multi-persona AI reviews:
  - FAANG Engineer
  - Startup CTO
  - Security Auditor
- AI-generated confidence scores for every suggestion
- Review verdict system:
  - Approved
  - Minor Issues
  - Needs Revision
- Live re-review after fixing issues
- Review history with filtering and tracking
- Real-time asynchronous review processing using RabbitMQ

---

## Socratic Debugging Mode

An interactive learning mode where the AI helps developers identify bugs themselves instead of directly revealing solutions.

### Capabilities

- Detects real bugs in submitted code
- Guides users using targeted debugging questions
- Tracks solved and unsolved bugs
- Maintains conversational debugging sessions
- Generates optimized corrected code after completion
- Persistent session state using MongoDB

---

## Team Collaboration & Workspace Management

- Workspace creation and management
- Role-based access control:
  - Owner
  - Admin
  - Member
- GitHub repository linking
- Pull request review workflows
- Release readiness reporting
- Review approval and rejection system
- Developer notification system

---

## GitHub Integration

- GitHub OAuth authentication
- Pull request import and review
- Repository file browsing
- Private repository support using Personal Access Tokens
- Automated PR review workflow support

---

# Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, Vite, Monaco Editor |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Messaging Queue | RabbitMQ |
| AI Integration | Anthropic Claude API |
| Authentication | JWT, GitHub OAuth |
| Email Service | Nodemailer |
| Deployment | Vercel, Railway |
| Containerization | Docker, Docker Compose |

---

# System Architecture

CodeLens AI follows a modular microservice-inspired architecture where services are separated by responsibility and communicate asynchronously using RabbitMQ queues.

```text
Frontend (React + Vite)
        │
        ▼
REST APIs (Express.js Backend)
        │
 ┌──────────────────────────────┐
 │         Service Layer         │
 │                               │
 │  Auth Service                 │
 │  Review Service               │
 │  Workspace Service            │
 │  Dashboard Service            │
 │  GitHub Integration Service   │
 │  Notification Service         │
 │  Socratic Service             │
 └──────────────────────────────┘
        │
        ▼
RabbitMQ Message Queues
        │
        ▼
MongoDB Database
```

---

# Why RabbitMQ?

AI review requests may take several seconds to complete.  
RabbitMQ enables asynchronous processing so the application remains responsive and scalable.

### Workflow

1. User submits code
2. Backend creates a review job
3. Job is pushed into RabbitMQ
4. Worker processes the review asynchronously
5. Frontend polls job status
6. Results are displayed once completed

This architecture prevents request timeout issues and improves overall user experience.

---

# Project Structure

```text
codelens-ai/
│
├── backend/
│   ├── services/
│   ├── middleware/
│   ├── rabbitmq/
│   ├── routes/
│   ├── controllers/
│   └── models/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── context/
│   └── api/
│
├── docker-compose.yml
└── README.md
```

---

# Local Setup

## Prerequisites

- Node.js
- MongoDB
- RabbitMQ
- Docker (optional)
- Anthropic API Key
- GitHub OAuth Credentials

---

## Installation

### Clone Repository

```bash
git clone https://github.com/your-username/codelens-ai.git
cd codelens-ai
```

---

### Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

---

### Configure Environment Variables

Create a `.env` file inside the backend directory.

```env
PORT=5000

MONGODB_URI=your_mongodb_uri

JWT_SECRET=your_jwt_secret

ANTHROPIC_API_KEY=your_anthropic_key

RABBITMQ_URL=your_rabbitmq_url

GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

FRONTEND_URL=http://localhost:5173
```

---

### Start Application

```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

---

# Docker Setup

```bash
docker-compose up --build
```

This starts:

- Frontend
- Backend
- MongoDB
- RabbitMQ

---

# API Modules

| Module | Description |
|---|---|
| Auth | Authentication & authorization |
| Review | AI code review workflows |
| Socratic | Interactive debugging sessions |
| Workspace | Team collaboration |
| Dashboard | Analytics and release reporting |
| GitHub | Repository & PR integration |

---

# Review Workflow

```text
User submits code
        │
        ▼
Review job created
        │
        ▼
RabbitMQ queue
        │
        ▼
AI processing worker
        │
        ▼
MongoDB stores results
        │
        ▼
Frontend displays review
```

---

# Unique Highlights

### Multi-Persona AI Review
Analyze code from multiple engineering perspectives simultaneously.

### Socratic Learning Experience
Encourages developers to reason through bugs instead of relying only on direct fixes.

### Asynchronous AI Processing
Scalable architecture using RabbitMQ queues.

### Team-Centric Workflow
Built for both individual developers and engineering teams.

### GitHub PR Analysis
Review pull requests directly from connected repositories.

---

# Deployment

## Frontend

Deploy using:

- Vercel

---

## Backend

Deploy using:

- Railway
- Docker

---

# Future Improvements

- Real-time collaborative review sessions
- AI-generated unit tests
- CI/CD integration
- Multi-language code review support
- Advanced analytics dashboard

---

# Contributing

Contributions are welcome.

1. Fork the repository
2. Create a new feature branch
3. Commit changes
4. Open a pull request

---

# License

This project is licensed under the MIT License.

---

# Author

### Tanisha Jaiswal

- GitHub: https://github.com/tanishajaiswal7
- LinkedIn: https://linkedin.com/in/tanishaa7

---

> “CodeLens AI is designed not only to review code, but to improve how developers think, debug, and collaborate.”
