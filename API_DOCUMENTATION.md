# Healthcare Provider Discovery Platform - API Documentation

## Overview

This is a comprehensive RESTful API for a healthcare provider discovery platform built for hackathons. The system provides user management, provider/resource search with intelligent filtering, distance-based sorting, and AI-powered recommendations.

## Base URL
```
http://localhost:5000/api
```

## Authentication
Currently uses service-level authentication via environment variables. All endpoints are publicly accessible for hackathon development.

## Response Format
All API responses follow this consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

## Core Endpoints

### Health Check

#### GET /health
Check system health and database connectivity.

**Response:**
```json
{
  "ok": true
}
```

---

## User Management

### Create/Fetch User

#### POST /api/users
Creates a new user or returns existing user if email/phone already exists.

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "555-123-4567",
  "name": "John Doe",
  "language": "English",
  "borough": "Manhattan",
  "zip": "10001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "location_consent": true
}
```

**Required Fields:** `email` OR `phone`, `name`
**Optional Fields:** `language`, `borough`, `zip`, `latitude`, `longitude`, `location_consent`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "created_at": "2025-09-27T20:30:00Z"
  }
}
```

### Get User Profile

#### GET /api/users/:id
Retrieves user profile by user ID.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "borough": "Manhattan",
    "language": "English"
  }
}
```

---

## Healthcare Providers

### Search Providers

#### GET /api/providers
Search healthcare providers with advanced filtering and distance sorting.

**Query Parameters:**
- `borough` (string): Filter by NYC borough (Bronx, Brooklyn, Manhattan, Queens, Staten Island)
- `specialty` (string): Filter by medical specialty (partial match)
- `lang` (string): Filter by language spoken
- `lat` (number): User latitude for distance sorting
- `lng` (number): User longitude for distance sorting

**Example Request:**
```
GET /api/providers?borough=Brooklyn&specialty=Family&lat=40.67&lng=-73.99
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Dr. Maria Rodriguez",
      "practice_name": "Brooklyn Family Health",
      "specialty": "Family Medicine",
      "languages": ["English", "Spanish"],
      "insurance": ["Medicaid", "Private"],
      "phone": "718-555-0200",
      "website": "www.brooklynhealth.com",
      "address": "123 Atlantic Ave",
      "borough": "Brooklyn",
      "zip": "11215",
      "latitude": 40.6700,
      "longitude": -73.9900,
      "distance": 0.5,
      "verified": true
    }
  ]
}
```

---

## Healthcare Resources

### Search Resources

#### GET /api/resources
Search healthcare and social service resources with filtering.

**Query Parameters:**
- `borough` (string): Filter by NYC borough
- `category` (string): Filter by resource category (partial match)
- `lang` (string): Filter by language supported
- `lat` (number): User latitude for distance sorting
- `lng` (number): User longitude for distance sorting

**Example Request:**
```
GET /api/resources?category=Food&borough=Bronx
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "NYC Food Pantry Network",
      "category": "Food Assistance",
      "address": "123 Community Ave",
      "borough": "Bronx",
      "zip": "10451",
      "phone": "718-555-1001",
      "website": "www.nycfood.org",
      "languages": ["English", "Spanish"],
      "latitude": 40.8200,
      "longitude": -73.9200,
      "verified": true
    }
  ]
}
```

---

## AI-Powered Recommendations

### AI Provider Recommendations

#### POST /api/ai/recommend-providers
Get AI-powered healthcare provider recommendations based on symptoms or conditions.

**Request Body:**
```json
{
  "symptoms": "chest pain and shortness of breath",
  "condition": "heart disease",
  "location": "Manhattan",
  "language": "English"
}
```

**Required:** `symptoms` OR `condition`
**Optional:** `location`, `language`

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "id": 3,
      "name": "Dr. Sarah Johnson",
      "specialty": "Cardiology",
      "phone": "212-555-0300"
    }
  ],
  "analysis": {
    "urgency_level": "high",
    "guidance": "Given your symptoms of chest pain and shortness of breath, you should seek immediate medical attention...",
    "specialties_to_consider": ["Cardiology", "Emergency Medicine"],
    "next_steps": "Call 911 if symptoms worsen, or visit the nearest emergency room immediately"
  }
}
```

### AI Resource Recommendations

#### POST /api/ai/recommend-resources
Get AI-powered social service resource recommendations based on needs.

**Request Body:**
```json
{
  "need": "food assistance for family of 4",
  "situation": "recently unemployed, need help with groceries",
  "location": "Brooklyn",
  "language": "Spanish"
}
```

**Required:** `need` OR `situation`
**Optional:** `location`, `language`

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "id": 2,
      "name": "Brooklyn Food Network",
      "category": "Food Assistance",
      "phone": "718-555-1002"
    }
  ],
  "analysis": {
    "priority_level": "high",
    "guidance": "Food assistance is available through multiple programs in Brooklyn...",
    "additional_categories": ["Employment Services", "Financial Assistance"],
    "next_steps": "Contact the food pantry directly and bring ID and proof of residence"
  }
}
```

---

## Admin Dashboard

### Admin Overview

#### GET /api/admin/overview
Get platform statistics and counts.

**Response:**
```json
{
  "success": true,
  "data": {
    "users": 156,
    "providers": 1250,
    "resources": 340
  }
}
```

---

## Error Codes

| HTTP Status | Error Type | Description |
|------------|------------|-------------|
| 400 | Bad Request | Missing required fields or invalid input |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | AI features not configured |
| 502 | Bad Gateway | Database connection issues |

---

## Distance Calculation

The API uses the Haversine formula to calculate distances when latitude and longitude coordinates are provided:

- **Distance Unit:** Miles
- **Accuracy:** Approximately ±0.1 miles
- **Max Range:** No artificial limit, but results are limited to 50 records per query

---

## Rate Limiting

- **Rate Limit:** 100 requests per 15 minutes per IP
- **Headers:** Rate limit information included in response headers

---

## Data Sources

- **Providers:** Curated database of NYC healthcare providers
- **Resources:** NYC government and community organization data
- **AI Analysis:** Powered by OpenAI GPT-5 for intelligent recommendations

---

## Development Notes

### Required Environment Variables
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE=your_service_role_key
SUPABASE_ANON_KEY=your_anon_public_key
OPENAI_API_KEY=your_openai_api_key  # Optional, for AI features
SESSION_SECRET=your_session_secret
```

### Testing
All endpoints can be tested with curl:

```bash
# Test provider search
curl "http://localhost:5000/api/providers?borough=Manhattan"

# Test AI recommendations (requires OPENAI_API_KEY)
curl -X POST http://localhost:5000/api/ai/recommend-providers \
  -H "Content-Type: application/json" \
  -d '{"symptoms":"headache","location":"Brooklyn"}'
```

### Performance
- **Database:** PostgreSQL with Supabase for scalability
- **Caching:** Built-in query caching via Supabase
- **Response Times:** ~200-500ms for standard queries, 2-5s for AI recommendations