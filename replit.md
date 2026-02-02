# Docker Android - Replit Configuration

## Overview

Docker Android is a React Native (Expo) mobile application that enables Docker container management directly on Android devices. The app runs Docker Engine inside an Alpine Linux VM powered by QEMU, allowing users to manage containers, view logs, access web apps running in containers via WebView, and control Docker resources from their mobile device.

The application follows a clean watercolor aesthetic with soft mauve purple accents and gentle spring animations. It uses a bottom tab navigation structure with four main sections: Home, Containers, Images, and Settings.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54+
- **Navigation**: React Navigation v7 with bottom tabs and native stack navigators
- **State Management**: Zustand for global state (Docker, QEMU, Settings stores)
- **Styling**: Custom theming system with light/dark mode support, defined in `client/constants/theme.ts`
- **Animations**: React Native Reanimated for smooth, spring-based animations
- **Data Fetching**: TanStack React Query for server state management

### Project Structure
```
client/           # React Native frontend
├── components/   # Reusable UI components
├── screens/      # Screen components for each route
├── navigation/   # Navigation configuration
├── store/        # Zustand state stores
├── services/     # API services (DockerAPI)
├── hooks/        # Custom React hooks
├── constants/    # Theme and configuration constants
server/           # Express.js backend
shared/           # Shared types and schemas (Drizzle)
```

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM (schema in `shared/schema.ts`)
- **API Pattern**: RESTful endpoints prefixed with `/api`

### Docker Integration
- Docker API client (`client/services/DockerAPI.ts`) communicates with Docker Engine via HTTP
- Default Docker API endpoint: `http://localhost:2375`
- Supports container lifecycle management, image operations, volumes, and networks

### QEMU/VM Architecture (Planned)
- Native Android module for QEMU integration
- Alpine Linux VM hosts Docker Engine
- VM state management via `useQemuStore`

### Design System
- Color palette with mauve, olive, terracotta, and mint accents
- Typography using Fraunces (headings) and Inter (body) fonts
- Consistent spacing, border radius, and shadow tokens
- State colors for success, warning, and error states

## Recent Updates

### UI Polish (Latest)
- Premium watercolor design with clean, modern aesthetic
- VMStatusCard with animated glow effect when running
- StatCards with colored icon containers
- ContainerCard and ImageCard with swipe-to-reveal actions
- Staggered FadeIn animations on all list items
- Refined empty states with gradient icon backgrounds
- Settings grouped in sections with elegant dividers
- LinearGradient effects for visual depth

### Component Improvements
- All cards have subtle border and shadow styling
- Press animations (scale 0.98) on interactive elements
- Haptic feedback on all interactions
- Consistent typography hierarchy (h1-h4, body, small, caption)

## External Dependencies

### Third-Party Services & APIs
- **Docker Engine API**: REST API for container management (localhost:2375)
- **Google Fonts**: Fraunces and Inter font families via `@expo-google-fonts`

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries and schema management

### Key NPM Packages
- `expo` - React Native framework
- `@react-navigation/*` - Navigation system
- `zustand` - State management
- `@tanstack/react-query` - Server state management
- `axios` - HTTP client for Docker API
- `react-native-webview` - Display container web apps
- `react-native-reanimated` - Animations
- `drizzle-orm` + `drizzle-zod` - Database ORM with validation

### Development Tools
- `drizzle-kit` - Database migrations and schema management
- `esbuild` - Server bundling for production
- `tsx` - TypeScript execution for development