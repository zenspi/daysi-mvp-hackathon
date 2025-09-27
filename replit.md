# Overview

This is a full-stack web application called "Daysi MVP" that provides a dashboard for monitoring Express.js server operations. The application features a React frontend with a modern UI built using shadcn/ui components and a Node.js/Express backend with PostgreSQL database integration via Drizzle ORM. The system allows users to monitor server status, view API logs, manage configurations, and access quick administrative actions through an intuitive dashboard interface.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Design System**: Uses a consistent color palette with support for light/dark themes

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Middleware**: CORS enabled for all origins, JSON body parsing, request logging
- **Error Handling**: Centralized error handling middleware with proper HTTP status codes
- **Development**: Hot reload with Vite integration in development mode

## Data Storage Solutions
- **Database**: PostgreSQL via Neon serverless database
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Fallback Storage**: In-memory storage implementation for development/testing
- **Data Models**: Users, server logs, and server configuration tables

## Authentication and Authorization
- **Session Management**: Session-based authentication using connect-pg-simple for PostgreSQL session storage
- **Security**: CORS configuration, secure session handling
- **User Management**: Basic user model with username/password authentication

## External Dependencies
- **Database Service**: Neon Database (PostgreSQL serverless)
- **UI Framework**: Radix UI for accessible component primitives
- **Development Tools**: Replit-specific plugins for development environment integration
- **Font Services**: Google Fonts (Inter, JetBrains Mono, and others)
- **Build Tools**: esbuild for production server bundling, PostCSS for CSS processing

## Key Architectural Decisions

### Monorepo Structure
The application uses a monorepo approach with shared schemas between frontend and backend, promoting type safety and code reuse. The `shared/` directory contains database schemas and type definitions accessible to both client and server.

### Component-Based UI
The frontend leverages a comprehensive component library (shadcn/ui) built on Radix UI primitives, ensuring accessibility and consistency across the application. Components are highly customizable through Tailwind CSS and CSS variables.

### Type-Safe Database Operations
Drizzle ORM provides compile-time type safety for database operations, with schema validation using Zod for runtime type checking of API requests and responses.

### Development Experience
The setup includes hot reload, error overlays, and development-specific tooling through Replit plugins, optimizing the developer experience while maintaining production readiness.

### Scalable Storage Strategy
The application implements an interface-based storage pattern with both PostgreSQL and in-memory implementations, allowing for easy testing and development while maintaining production database capabilities.