# Overview

This is a comprehensive hackathon-ready healthcare provider discovery platform that combines traditional search capabilities with AI-powered recommendations. The application features a React frontend with shadcn/ui components and a Node.js/Express backend with direct Supabase integration. The system enables users to find healthcare providers and social service resources through intelligent filtering, distance-based sorting, and AI-driven recommendations using OpenAI GPT-5.

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
- **API Design**: RESTful API with comprehensive healthcare and AI endpoints
- **AI Integration**: OpenAI GPT-5 for intelligent provider and resource recommendations
- **Location Services**: Haversine formula for distance-based sorting
- **Middleware**: CORS enabled, JSON parsing, request logging, error handling
- **Response Format**: Consistent `{ success: boolean, data/error: any }` structure

## Data Storage Solutions
- **Primary Database**: PostgreSQL via Supabase with direct client integration
- **Schema Design**: UUID primary keys, comprehensive healthcare data models
- **Tables**: Users (with location consent), Providers (with specialties/languages), Resources (social services)
- **Fallback Storage**: In-memory storage for server monitoring when database connection fails
- **Data Quality**: Verified providers and resources with source tracking

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

### Hackathon-Optimized Design
Built specifically for hackathon environments with rapid deployment, comprehensive features out-of-the-box, and graceful fallbacks when services are unavailable. All core functionality works immediately after setup.

### Direct Supabase Integration
Migrated from traditional ORM to direct Supabase client integration for better reliability and real-time capabilities. This provides instant database connectivity and built-in authentication features.

### AI-First Healthcare Features
Integrated OpenAI GPT-5 for intelligent provider recommendations based on symptoms, resource matching based on needs, urgency assessment, and personalized guidance - making the platform uniquely valuable.

### Location-Centric Architecture
Implements GPS-based distance sorting with Haversine formula calculations, location consent workflows, and fallback to borough/zip data when coordinates aren't available.

### Production-Ready API Design
Comprehensive RESTful API covering user management, provider/resource search, AI recommendations, and admin analytics with proper error handling, rate limiting, and response formatting.

### Hybrid Storage Strategy
Core features use Supabase for reliable data persistence while server monitoring falls back to in-memory storage, ensuring the application remains functional even during database connectivity issues.