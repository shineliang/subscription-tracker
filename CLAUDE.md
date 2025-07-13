# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a subscription tracking web application with React frontend and Node.js/Express backend using SQLite database. The app helps users manage recurring subscriptions, track spending, and receive payment reminders.

## Common Development Commands

### Setup & Running
```bash
# First time setup - installs dependencies for both frontend and backend
./start.sh

# Frontend development (runs on port 3000)
cd frontend && npm start

# Backend development with hot reload (runs on port 5200)
cd backend && npm run dev

# Production build
cd frontend && npm run build
cd backend && npm start
```

### Testing
```bash
# Frontend tests
cd frontend && npm test

# Backend tests - NOT IMPLEMENTED YET
# When implementing tests, add appropriate test framework
```

## Architecture & Key Patterns

### Frontend Architecture
- **Single Page Application** using React Router v6
- **API Service Pattern**: All backend calls go through `src/services/api.js`
- **Protected Routes**: Authentication wrapper in `src/App.js`
- **State Management**: React hooks (useState, useEffect) - no Redux/Context API
- **Styling**: TailwindCSS with custom theme colors defined in `tailwind.config.js`

### Backend Architecture
- **RESTful API** with JWT authentication
- **Database Migrations**: Custom migration system in `db/migrations/`
- **Scheduled Tasks**: Daily cron job at 9 AM for reminder emails
- **Middleware Pattern**: Auth validation on protected routes

### Key API Endpoints
- `/api/auth/*` - Authentication (login, register, logout)
- `/api/subscriptions/*` - CRUD operations for subscriptions
- `/api/stats/*` - Analytics and statistics
- `/api/budgets/*` - Budget management
- `/api/intelligent-analysis/*` - AI-powered analysis features

## Database Schema

SQLite database with these main tables:
- `users` - User accounts
- `subscriptions` - Subscription records with billing cycles
- `budgets` - Monthly budget limits
- `reminders` - Notification preferences
- `payment_history` - Payment tracking
- `notification_settings` - User notification preferences

## Important Development Patterns

### Adding New Features
1. **Database Changes**: Create migration in `backend/db/migrations/` with timestamp prefix
2. **API Endpoints**: Add routes to `backend/routes/api.js`
3. **Frontend Service**: Add API calls to `frontend/src/services/api.js`
4. **React Components**: Follow existing component structure in `frontend/src/components/`

### Authentication Flow
- JWT tokens stored in localStorage
- Token included in Authorization header for API requests
- Backend middleware validates tokens on protected routes

### Error Handling
- Backend: Consistent error response format `{ error: 'message' }`
- Frontend: Toast notifications via react-toastify for user feedback

### Environment Variables
Backend requires `.env` file with:
- `EMAIL_USER` and `EMAIL_PASS` for email notifications
- `OPENAI_API_KEY` for AI features (optional)

## Code Conventions

### Language & Comments
- UI text and comments are primarily in Chinese
- Variable/function names in English
- Follow existing naming patterns

### Component Structure
```javascript
// Frontend components follow this pattern:
const ComponentName = () => {
  // State declarations
  // useEffect hooks
  // Handler functions
  // Return JSX
};
```

### API Response Format
```javascript
// Success: { data: {...} }
// Error: { error: 'error message' }
```

## Testing Approach

Currently no tests implemented. When adding tests:
- Frontend: Use React Testing Library (already included)
- Backend: Consider Jest + Supertest for API testing
- Database: Use test database file for isolation

## Deployment Considerations

- Frontend builds to `frontend/build/`
- Backend serves static files from build directory in production
- SQLite database file location configurable via environment
- Email functionality requires SMTP configuration