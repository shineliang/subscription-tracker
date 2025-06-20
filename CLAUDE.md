# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
```bash
# Start both frontend and backend with tmux (recommended)
./start.sh

# Or run separately:
# Backend (in /backend directory)
npm run dev    # Development with hot-reload
npm start      # Production mode

# Frontend (in /frontend directory)
npm start      # Development server on port 3000
npm run build  # Production build
```

### Database Setup
```bash
# Backend automatically creates SQLite database on first run
# Database migrations run automatically on server startup
# Default admin account: username: admin, password: admin123
# To seed with sample data:
cd backend && node seedDB.js
```

## Architecture Overview

This is a full-stack subscription tracking application with:

- **Backend**: Node.js/Express API server on port 5200
  - SQLite database with users, subscriptions, reminders, and notification_settings tables
  - JWT authentication with Bearer token support
  - Multi-user support with data isolation
  - Daily cron job for checking upcoming renewals
  - Email notifications via nodemailer
  - CSV import/export functionality

- **Frontend**: React SPA with TailwindCSS
  - React Router v6 for client-side routing
  - Chart.js for spending analytics
  - Dark mode support
  - Responsive design with mobile support

## Key API Patterns

All API endpoints are prefixed with `/api`:

- **Authentication**: `/api/auth/*` for login, register, token refresh
  - All other endpoints require `Authorization: Bearer <token>` header
- **CRUD Operations**: Standard REST patterns for `/api/subscriptions`
- **Statistics**: Aggregated data endpoints under `/api/statistics/*`
- **File Operations**: Import/export via `/api/import-data` and `/api/export-data`
- **AI Integration**: Subscription parsing at `/api/parse-subscription`

## Important Implementation Details

1. **State Management**: React hooks (useState, useEffect) - no Redux/Context API
2. **Authentication**: JWT-based auth with localStorage/sessionStorage for tokens
   - Axios interceptors handle token injection and 401 redirects
   - Protected routes using ProtectedRoute component
3. **Date Handling**: Uses moment.js throughout for consistency
4. **Error Handling**: Centralized error middleware returns consistent JSON errors
5. **File Uploads**: Handled by multer middleware for CSV imports
6. **Database Migrations**: Automatic migration system in db/migrations.js

## Testing and Linting

Currently no test suites or linting configured. When implementing:
- Frontend tests would use React Testing Library (already in package.json)
- Consider adding ESLint and Prettier for code consistency