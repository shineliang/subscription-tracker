# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A subscription tracking web application with React frontend and Node.js/Express backend using SQLite database. The app helps users manage recurring subscriptions, track spending, and receive payment reminders.

## Common Development Commands

### Setup & Running
```bash
# First time setup - installs dependencies for both frontend and backend
./start.sh

# Frontend development (runs on port 3000)
cd frontend && npm start

# Backend development with hot reload (runs on port 5200)
cd backend && npm run dev

# Production mode
cd backend && npm start
```

### Testing
```bash
# Frontend tests (React Testing Library)
cd frontend && npm test

# Backend tests (Jest + Supertest)
cd backend && npm test
cd backend && npm run test:watch    # Watch mode
cd backend && npm run test:coverage # Coverage report

# E2E tests (Playwright)
cd backend && npm run test:e2e
cd backend && npm run test:e2e:ui   # Interactive UI mode
```

### Building
```bash
# Frontend production build
cd frontend && npm run build
```

## Architecture & Key Patterns

### Frontend Architecture
- **Single Page Application** using React 18 with React Router v6
- **API Service Pattern**: All backend calls centralized in `src/services/api.js`
- **Protected Routes**: Authentication wrapper in `src/App.js`
- **State Management**: React hooks (useState, useEffect) - no Redux/Context API
- **Styling**: TailwindCSS with custom theme colors in `tailwind.config.js`
- **UI Components**: Headless UI, Heroicons, Framer Motion for animations
- **Data Visualization**: Chart.js with react-chartjs-2

### Backend Architecture
- **RESTful API** with JWT authentication (jsonwebtoken)
- **Database**: SQLite with custom database layer in `db/database.js`
- **Password Hashing**: bcrypt/bcryptjs for secure password storage
- **Scheduled Tasks**: node-cron for daily reminder emails (9 AM)
- **Email Service**: Nodemailer for notifications
- **File Uploads**: Multer for CSV import functionality
- **Middleware Pattern**: Auth validation (`middleware/auth.js`) and input validation (`middleware/validation.js`)

### Key API Endpoints
- `/api/auth/*` - Authentication (login, register, logout)
- `/api/subscriptions/*` - CRUD operations for subscriptions
- `/api/stats/*` - Analytics and statistics
- `/api/budgets/*` - Budget management
- `/api/reminders/*` - Reminder settings
- `/api/notifications/*` - Notification preferences
- `/api/intelligent-analysis/*` - AI-powered features (when configured)
- `/api/export/*` - Data export functionality
- `/api/import/*` - CSV import functionality

## Database Schema

SQLite database with main tables:
- `users` - User accounts with hashed passwords
- `subscriptions` - Subscription records with billing cycles
- `budgets` - Monthly budget limits
- `reminders` - Notification preferences
- `payment_history` - Payment tracking
- `notification_settings` - User notification preferences

Database models are in `backend/models/` directory.

## Important Development Patterns

### Adding New Features
1. **Database Changes**: Update relevant model in `backend/models/`
2. **API Endpoints**: Add routes to `backend/routes/api.js` or create new route file
3. **Frontend Service**: Add API calls to `frontend/src/services/api.js`
4. **React Components**: Follow existing component structure in `frontend/src/components/`
5. **Validation**: Add validation rules in `backend/middleware/validation.js`

### Authentication Flow
- JWT tokens stored in localStorage
- Token included in Authorization header: `Bearer ${token}`
- Backend middleware validates tokens on protected routes
- Token expiry handling in frontend API service

### Error Handling
- Backend: Consistent error response format `{ error: 'message' }`
- Frontend: Toast notifications via react-toastify for user feedback
- API service handles common errors (401, 403, 500) centrally

### Environment Variables
Backend `.env` file requirements:
```
EMAIL_USER=your-email@gmail.com  # For email notifications
EMAIL_PASS=your-app-password     # Gmail app password
OPENAI_API_KEY=your-api-key      # Optional, for AI features
```

## Code Conventions

### Language & Comments
- UI text and user-facing messages primarily in Chinese
- Variable/function names and code comments in English
- Follow existing naming patterns in codebase

### Component Structure
```javascript
// Frontend components pattern:
const ComponentName = () => {
  // State declarations
  // useEffect hooks
  // Handler functions
  // Return JSX
};
```

### API Response Format
```javascript
// Success: { data: {...} } or direct data
// Error: { error: 'error message' }
```

## Testing Approach

### Frontend Testing
- React Testing Library included but no tests implemented yet
- Test files should go in `src/__tests__/` or alongside components as `*.test.js`

### Backend Testing
- Jest configured with test files in `backend/tests/`
- Database and model tests exist in `tests/database.test.js` and `tests/models.test.js`
- Run single test: `npm test -- --testNamePattern="test name"`
- Mock database for isolated testing

### E2E Testing
- Playwright configured for end-to-end testing
- Test files location not yet established

## Deployment Considerations

- Frontend builds to `frontend/build/`
- Backend can serve static files from build directory in production
- SQLite database file (`subscription_tracker.db`) created in backend directory
- Ensure proper file permissions for database writes
- Configure CORS settings for production domain