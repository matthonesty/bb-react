# Bombers Bar - Next.js Migration

Modern React/Next.js application for Bombers Bar EVE Online fleet management and Ship Replacement Program (SRP).

## Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with custom dark theme
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query (React Query v5)
- **UI Components**: Custom component library
- **Icons**: Lucide React
- **Date Formatting**: date-fns
- **HTTP Client**: Axios
- **Deployment**: Vercel

## Project Structure

```
bb-react/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles & Tailwind config
│
├── components/
│   ├── ui/                # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Table.tsx
│   │   └── Modal.tsx
│   ├── layout/            # Layout components
│   │   ├── Header.tsx     # Navigation & user menu
│   │   └── Footer.tsx
│   ├── srp/               # SRP-specific components (to be created)
│   ├── fleet/             # Fleet management components (to be created)
│   └── admin/             # Admin components (to be created)
│
├── lib/
│   ├── api/               # API client & services
│   │   ├── client.ts      # Axios instance
│   │   ├── auth.ts        # Authentication API
│   │   └── srp.ts         # SRP API
│   ├── utils/             # Utility functions
│   │   ├── format.ts      # Formatting helpers
│   │   └── cn.ts          # Class name merger
│   └── constants/         # App constants & config
│       └── index.ts
│
├── types/
│   └── index.ts           # TypeScript type definitions
│
├── hooks/
│   └── useAuth.ts         # Authentication hook
│
├── stores/
│   └── useAuthStore.ts    # Zustand auth store
│
├── providers/
│   └── QueryProvider.tsx  # React Query provider
│
└── vercel.json            # Vercel deployment config
```

## Features Implemented

### ✅ Core Infrastructure
- [x] Next.js 14+ with App Router
- [x] TypeScript configuration
- [x] Tailwind CSS v4 with dark theme
- [x] Custom EVE Online-inspired color scheme
- [x] Responsive design foundation

### ✅ State Management & Data Fetching
- [x] Zustand store for authentication
- [x] React Query setup for server state
- [x] API client with interceptors
- [x] Authentication hook

### ✅ UI Component Library
- [x] Button (multiple variants & sizes)
- [x] Card (with header, content, footer)
- [x] Input (with label, error, helper text)
- [x] Badge (auto-styling for SRP status & FC ranks)
- [x] Table (responsive with dark theme)
- [x] Modal (portal-based with overlay)

### ✅ Layout & Navigation
- [x] Header with responsive navigation
- [x] User dropdown menu
- [x] Mobile hamburger menu
- [x] Role-based navigation items
- [x] Footer

### ✅ Pages
- [x] Home/Landing page with login
- [ ] SRP page (to be migrated)
- [ ] Fleet Management pages (to be migrated)
- [ ] FC Management (to be migrated)
- [ ] Wallet (to be migrated)
- [ ] Ship Types (to be migrated)
- [ ] Ban Management (to be migrated)
- [ ] Bombing Intel (to be migrated)
- [ ] System Status (to be migrated)

### ✅ API Integration
- [x] API client with Axios
- [x] Authentication API service
- [x] SRP API service (interface ready)
- [ ] Backend API routes (existing Vercel functions to be integrated)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (can use existing bb database)
- EVE Online Developer Application

### Installation

1. **Clone the repository**
   ```bash
   cd /home/ubuntu/bb-react
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and fill in your values from the original bb project.

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `EVE_CLIENT_ID` - EVE Online SSO client ID
- `EVE_SECRET_KEY` - EVE Online SSO secret key
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing
- `ADMIN_CHARACTER_IDS` - Comma-separated list of admin character IDs

## Backend Integration

The existing backend API routes (`/api/*`) from the original bb project can be integrated by:

1. Copy `/api` directory from bb project
2. Copy `/lib` directory (server-side business logic)
3. Copy `/src/database` (database connection)
4. Update imports to work with Next.js App Router

## Design System

### Colors

Custom dark theme inspired by EVE Online:
- **Background**: Deep space blues (#0a0e1a, #12182b, #1a2338)
- **Primary**: EVE blue (#3b82f6)
- **Accent**: Purple (#8b5cf6)
- **Status Colors**: Green (success), Yellow (warning), Red (error)

### Typography

- **Font**: Geist Sans (primary), Geist Mono (code)
- **Scale**: Responsive typography with good contrast

## Migration Status

### Phase 1: Foundation ✅ (Completed)
- [x] Project setup
- [x] Core infrastructure
- [x] Component library
- [x] Authentication flow
- [x] Layout structure

### Phase 2: Core Pages (Next)
- [ ] Migrate SRP page
- [ ] Implement data tables
- [ ] Add SRP submission flow
- [ ] Build SRP admin interface

### Phase 3: Fleet Management
- [ ] Fleet management pages
- [ ] FC management
- [ ] Fleet composition editor

### Phase 4: Advanced Features
- [ ] Wallet reconciliation
- [ ] Ban management
- [ ] Ship type configuration
- [ ] Bombing intel tools

## Development

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Use functional components with hooks
- Prefer server components where possible

### State Management

- **Server state**: React Query (API data)
- **Client state**: Zustand (auth, UI state)
- **URL state**: Next.js routing

## Deployment

### Vercel

1. Connect repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

---

**EVE Online and the EVE logo are the registered trademarks of CCP hf.**
