# CodeLens AI — Phase 2 Setup Guide

## Prerequisites
- Node.js (v16+)
- MongoDB running locally (default: `mongodb://localhost:27017`) — OR using MongoDB Atlas
- **Groq API Key** (free tier, no credit card required)

## Get Groq API Key (Free)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up with email (no credit card needed)
3. Click "API Keys" in the sidebar
4. Create a new API key
5. Copy the key and paste it in `backend/.env` as `GROQ_API_KEY`

## Quick Start

### Backend Setup
```bash
cd backend
npm install
# Edit .env and add your GROQ_API_KEY
node server.js
```

Server runs on `http://localhost:5000`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Environment Variables

**Backend** (`backend/.env`):
```
MONGO_URI=mongodb://localhost:27017/codelens-ai
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d
PORT=5000
NODE_ENV=development
GROQ_API_KEY=gsk_your_groq_api_key_here
APP_NAME=CodeLens AI
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM="CodeLens AI <no-reply@example.com>"
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:5000
```

## Architecture Overview

```
codelens-ai/
├── frontend/              (Vite + React)
│   └── src/
│       ├── api/          (API calls)
│       ├── components/   (Reusable components)
│       ├── pages/        (Page components)
│       └── utils/        (Utilities)
│
└── backend/              (Express + Node.js)
    ├── services/         (Microservices)
    │   ├── auth-service/ (MVC pattern)
    │   └── review-service/ (MVC pattern)
    ├── middleware/       (Auth, error handling)
    ├── config/           (Database config)
    └── server.js         (Entry point)
```

## API Endpoints

### Authentication Service `/api/auth`
- `POST /register` — Create new user
- `POST /login` — Login user
- `POST /forgot-password` — Request password reset link
- `POST /reset-password/:token` — Set a new password using reset token
- `POST /logout` — Logout user
- `GET /me` — Get current user (protected)

### Review Service `/api/review`
- `POST /` — Submit code for review (protected)
  - Body: `{ code, persona: "faang|startup|security" }`
  - Returns: review with suggestions + confidence scores
- `GET /` — Get user's reviews (protected)
- `GET /:reviewId` — Get specific review (protected)

## Review Personas

- **FAANG SWE**: Focuses on scalability, Big-O, SOLID principles, design patterns
- **Startup Founder**: Pragmatic review, MVP trade-offs, tech debt, shipping speed
- **Security Auditor**: OWASP vulnerabilities, severity levels, CVE references

## Testing Checklist

See [VERIFICATION_CHECKLIST_PHASE2.md](VERIFICATION_CHECKLIST_PHASE2.md) for detailed testing instructions.

