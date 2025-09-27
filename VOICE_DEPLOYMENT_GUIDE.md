# 🎤 Voice Functionality Deployment Guide

## Quick Summary

Your voice functionality isn't working because **Replit blocks outbound connections to OpenAI's servers**. The solution is to deploy a simple relay service on an external platform that can connect to OpenAI.

## 🚀 1-Click Deploy Options

### Option A: Fly.io (Recommended - Free Tier Available)

1. **Install Fly CLI**: Visit https://fly.io/docs/hands-on/install-flyctl/
2. **Deploy the relay**:
```bash
cd relay-service
fly auth login
fly apps create healthcare-voice-relay-[your-name]
fly secrets set OPENAI_API_KEY=your_openai_api_key_here
fly secrets set ALLOWED_ORIGINS=https://[your-replit-id].replit.app
fly deploy
```

3. **Get your relay URL**: `https://healthcare-voice-relay-[your-name].fly.dev`

### Option B: Google Cloud Run (Free Tier Available)

1. **Install gcloud CLI**: Visit https://cloud.google.com/sdk/docs/install
2. **Deploy the relay**:
```bash
cd relay-service
gcloud run deploy healthcare-voice-relay \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars OPENAI_API_KEY=your_key_here,ALLOWED_ORIGINS=https://[your-replit-id].replit.app
```

### Option C: Render (Free Tier Available)

1. **Connect to GitHub**: Push the `relay-service` folder to a GitHub repo
2. **Create Web Service** at https://render.com
3. **Environment Variables**:
   - `OPENAI_API_KEY` = your OpenAI API key
   - `ALLOWED_ORIGINS` = `https://[your-replit-id].replit.app`

## 🔧 2. Configure Your App

Once deployed, **enable voice functionality** by editing `public/realtime.html`:

```html
<!-- UNCOMMENT and UPDATE this line: -->
<meta name="voice-relay-url" content="wss://your-relay-service.fly.dev/realtime">
```

**Replace** `your-relay-service.fly.dev` with your actual deployed URL.

## ✅ 3. Test Voice Functionality

1. **Restart your Replit app**
2. **Navigate to `/realtime.html`**
3. **Click "🎤 Start Voice"**
4. **Allow microphone access**
5. **Speak** - you should see transcription and get AI responses!

## 🔐 Required: OpenAI API Key Setup

Your OpenAI API key needs **Realtime API access**:

1. **Check your OpenAI account**: Visit https://platform.openai.com/
2. **Billing required**: Realtime API requires a paid account
3. **API key format**: Should start with `sk-proj-` or `sk-`

## 🛠️ Troubleshooting

### Voice Still Not Working?

1. **Check browser console** for error messages
2. **Verify relay URL** in the meta tag (must be `wss://` not `ws://`)
3. **Test relay health**: Visit `https://your-relay-url/health`
4. **Check OpenAI billing**: Realtime API requires paid account

### Common Issues:

- **"Invalid relay URL"**: Make sure URL starts with `wss://`
- **"Voice features unavailable"**: Relay service might be down
- **No transcription**: Check microphone permissions
- **CORS errors**: Verify `ALLOWED_ORIGINS` environment variable

### Debug Commands:

```bash
# Test relay health
curl https://your-relay-service.fly.dev/health

# Check relay logs (Fly.io)
fly logs -a healthcare-voice-relay-[your-name]

# Check Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision"
```

## 💡 Why This Works

- **Your Replit app** handles the UI and text chat
- **External relay service** connects to OpenAI Realtime API  
- **Browser connects directly** to relay via WebSocket
- **No Replit networking limitations** affect the voice functionality

## 🎯 Expected Result

After deployment:
- ✅ **Voice input** works with real-time transcription
- ✅ **AI responses** come back as speech
- ✅ **Bilingual support** (English/Spanish) 
- ✅ **Text chat** still works as backup
- ✅ **All healthcare features** available via voice

## 📞 Need Help?

If you get stuck:
1. Check the relay service health endpoint
2. Look at browser console errors
3. Verify your OpenAI API key has Realtime access
4. Ensure the meta tag URL is exactly right

The voice functionality will work perfectly once the relay is deployed!