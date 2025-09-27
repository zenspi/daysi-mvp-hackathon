# 🏥 Healthcare Provider Discovery Platform

A comprehensive hackathon-ready healthcare discovery platform that combines provider/resource search with AI-powered recommendations. Built with Node.js, Express, Supabase, and OpenAI integration.

![Healthcare Platform](https://img.shields.io/badge/Status-Hackathon%20Ready-green) ![Node.js](https://img.shields.io/badge/Node.js-20+-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)

## 🌟 Key Features

### 🔍 **Smart Provider Search**
- **Advanced Filtering**: Search by borough, specialty, language, insurance
- **Distance-Based Sorting**: Automatic location-based results using Haversine formula
- **Real-Time Data**: Live provider information from Supabase database

### 🤖 **AI-Powered Recommendations**
- **Symptom Analysis**: Get provider recommendations based on symptoms/conditions
- **Resource Matching**: AI-driven social service resource suggestions  
- **Smart Guidance**: Urgency assessment and next-step recommendations
- **Powered by OpenAI GPT-5**: Latest AI model for accurate healthcare guidance

### 📍 **Location Services**
- **GPS Integration**: Optional location consent for distance sorting
- **Borough Fallback**: Works without GPS using zip/borough data
- **Multi-Language Support**: Resources available in multiple languages

### 📊 **Admin Dashboard**
- **Real-Time Analytics**: User, provider, and resource counts
- **System Health**: Database connectivity monitoring
- **Performance Metrics**: API response time tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Supabase account
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd healthcare-platform
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Add your credentials:
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE=your_service_role_key
   SUPABASE_ANON_KEY=your_anon_public_key
   OPENAI_API_KEY=your_openai_api_key  # Optional
   SESSION_SECRET=your_session_secret
   ```

3. **Database Setup**
   ```bash
   # Push schema to Supabase
   npm run db:push
   
   # Seed sample data (optional)
   npm run seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

   Server runs on `http://localhost:5000`

## 📚 API Usage Examples

### Basic Provider Search
```bash
# Search Brooklyn family doctors
curl "http://localhost:5000/api/providers?borough=Brooklyn&specialty=Family"

# Distance-sorted results
curl "http://localhost:5000/api/providers?lat=40.67&lng=-73.99"
```

### AI-Powered Recommendations
```bash
# Get provider recommendations for symptoms
curl -X POST http://localhost:5000/api/ai/recommend-providers \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": "persistent headaches and dizziness",
    "location": "Manhattan",
    "language": "English"
  }'

# Response includes urgency level and next steps
{
  "success": true,
  "recommendations": [...providers...],
  "analysis": {
    "urgency_level": "medium",
    "guidance": "Persistent headaches with dizziness may indicate...",
    "next_steps": "Schedule an appointment with a neurologist within 1-2 weeks"
  }
}
```

### Resource Discovery
```bash
# Find food assistance resources
curl "http://localhost:5000/api/resources?category=Food&borough=Bronx"

# AI-powered resource matching
curl -X POST http://localhost:5000/api/ai/recommend-resources \
  -H "Content-Type: application/json" \
  -d '{
    "need": "housing assistance for family",
    "location": "Queens",
    "language": "Spanish"
  }'
```

## 🏗️ Architecture

### Technology Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL via Supabase
- **AI**: OpenAI GPT-5 integration
- **Frontend**: React, Vite, Tailwind CSS
- **Authentication**: Session-based with Supabase

### Database Schema

#### Users Table
```typescript
{
  id: uuid (primary key)
  email?: string
  phone?: string
  name: string
  language?: string
  borough?: string
  zip?: string
  latitude?: number
  longitude?: number
  location_consent: boolean
  role: 'user' | 'admin'
  created_at: timestamp
}
```

#### Providers Table
```typescript
{
  id: uuid (primary key)
  name: string
  practice_name?: string
  specialty: string
  languages: string[]
  insurance: string[]
  phone: string
  website?: string
  address: string
  borough: string
  zip: string
  latitude?: number
  longitude?: number
  verified: boolean
  source: string
}
```

#### Resources Table
```typescript
{
  id: uuid (primary key)
  name: string
  category: string
  address: string
  borough: string
  languages: string[]
  phone: string
  website?: string
  latitude?: number
  longitude?: number
  verified: boolean
  source: string
}
```

## 🔧 Configuration

### Environment Variables
```bash
# Required for core functionality
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SESSION_SECRET=your-secret-key

# Optional for AI features
OPENAI_API_KEY=sk-proj-xxx...

# Development settings
NODE_ENV=development
PORT=5000
```

### Supabase Setup
1. Create new Supabase project
2. Run provided SQL migrations
3. Enable Row Level Security (RLS) policies
4. Configure API keys in environment

### OpenAI Integration
1. Create OpenAI account
2. Generate API key
3. Add to environment variables
4. AI features automatically activate

## 📈 Performance

### Response Times
- **Basic Queries**: ~200-500ms
- **Filtered Searches**: ~300-700ms  
- **Distance Sorting**: ~500-1000ms
- **AI Recommendations**: ~2-5 seconds

### Rate Limits
- **API Calls**: 100 requests per 15 minutes per IP
- **Database**: Supabase connection pooling
- **OpenAI**: Configurable limits in code

## 🧪 Testing

### Manual Testing
```bash
# Health check
curl http://localhost:5000/health

# Create user
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Admin overview
curl http://localhost:5000/api/admin/overview
```

### Load Testing
```bash
# Install wrk for load testing
# Test 100 concurrent users for 30 seconds
wrk -t12 -c100 -d30s http://localhost:5000/api/providers
```

## 🚀 Deployment

### Replit Deployment
1. Connect GitHub repository
2. Set environment variables in Replit Secrets
3. Run `npm install` and `npm run dev`
4. Replit automatically handles hosting

### Production Deployment
```bash
# Build for production
npm run build

# Start production server
npm start

# Or deploy to cloud platforms:
# - Heroku: git push heroku main
# - Railway: railway deploy
# - Vercel: vercel deploy
```

### Environment Setup for Deployment
- Set all environment variables in your platform
- Ensure Supabase allows connections from deployment IP
- Configure CORS origins for production domain

## 📝 API Documentation

Complete API documentation available in [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md)

### Quick Reference
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | System health check |
| `/api/users` | POST | Create/fetch user |
| `/api/providers` | GET | Search providers |
| `/api/resources` | GET | Search resources |
| `/api/ai/recommend-providers` | POST | AI provider recommendations |
| `/api/ai/recommend-resources` | POST | AI resource recommendations |
| `/api/admin/overview` | GET | Platform statistics |

## 🛠️ Development

### Project Structure
```
├── server/
│   ├── routes.ts          # API endpoints
│   ├── db.ts             # Database connection
│   ├── storage.ts        # Storage interface
│   └── index.ts          # Server entry point
├── shared/
│   └── schema.ts         # Database schemas
├── client/
│   └── src/              # Frontend React app
├── API_DOCUMENTATION.md   # Complete API docs
└── README.md             # This file
```

### Adding New Features
1. Update database schema in `shared/schema.ts`
2. Add API routes in `server/routes.ts`
3. Test endpoints manually
4. Update documentation

### Common Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Sync database schema
npm run db:generate  # Generate migrations
npm run lint         # Check code quality
npm run test         # Run tests
```

## 🤝 Contributing

This project is designed for hackathons and rapid development:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and test thoroughly
4. Update documentation
5. Submit pull request

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Consistent API response formats
- Comprehensive error handling

## 📄 License

MIT License - perfect for hackathons and open source projects.

## 🆘 Support

### Common Issues
- **Database Connection**: Check Supabase credentials
- **AI Features**: Verify OPENAI_API_KEY is set
- **CORS Errors**: Configure allowed origins
- **Rate Limits**: Implement request throttling

### Getting Help
- Check the API documentation
- Review server logs for detailed errors
- Test endpoints with curl
- Verify environment variables

### Hackathon Tips
- Use sample data for demos
- Set up health monitoring
- Test all endpoints before presenting
- Prepare backup deployment options

---

**Built with ❤️ for hackathons and rapid healthcare innovation**