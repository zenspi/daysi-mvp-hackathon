# Healthcare Voice Relay Service

External WebSocket relay service to bypass Replit networking limitations for OpenAI Realtime API.

## Quick Deploy

### Option 1: Fly.io (Recommended)
```bash
# Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
cd relay-service
flyctl apps create healthcare-voice-relay
flyctl secrets set OPENAI_API_KEY=your_openai_api_key_here
flyctl secrets set ALLOWED_ORIGINS=https://your-replit-domain.replit.app
flyctl deploy
```

### Option 2: Google Cloud Run
```bash
cd relay-service
gcloud run deploy healthcare-voice-relay \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars OPENAI_API_KEY=your_key_here,ALLOWED_ORIGINS=https://your-replit-domain.replit.app
```

### Option 3: Render
1. Connect your GitHub repo to Render
2. Create a new Web Service
3. Set Environment Variables:
   - `OPENAI_API_KEY=your_openai_api_key_here`
   - `ALLOWED_ORIGINS=https://your-replit-domain.replit.app`

## Environment Variables

- `OPENAI_API_KEY` (required): Your OpenAI API key with Realtime API access
- `ALLOWED_ORIGINS` (optional): Comma-separated list of allowed origins (default: *)
- `PORT` (optional): Server port (default: 8080)
- `MODEL_REALTIME` (optional): OpenAI model (default: gpt-4o-realtime-preview)

## Usage

Once deployed, update your frontend to connect to:
```
wss://your-relay-service.fly.dev/realtime
```

## Security

- CORS protection with origin restrictions
- Rate limiting built-in
- API key never exposed to browser
- Connection limits (50 concurrent)
- Session timeouts (5 minutes)