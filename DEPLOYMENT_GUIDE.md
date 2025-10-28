# Deployment Guide - WB Automation

## Prerequisites

Before deploying, ensure you have:
- ✅ `netlify.toml` configuration file (created)
- ✅ PostgreSQL database (Supabase or other provider)
- ✅ Redis instance (Upstash or other provider)
- ✅ All required API keys and tokens

## Option 1: Deploy via Netlify CLI (Recommended)

### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify
```bash
netlify login
```

### Step 3: Initialize and Deploy
```bash
# Navigate to project directory
cd c:\Users\Neal\Downloads\AUTO-cursor-bc-b522b817-cedb-455a-CURS

# Deploy to Netlify
netlify deploy --prod
```

### Step 4: Set Environment Variables
After deployment, set these environment variables in Netlify UI (Site settings → Environment variables):

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `GOOGLE_VERTEX_AI_PROJECT` - Google Cloud project ID
- `GOOGLE_VERTEX_AI_LOCATION` - us-central1
- `WB_API_KEY` - Wildberries API key
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `NEXT_PUBLIC_API_URL` - Your Netlify site URL (e.g., https://your-site.netlify.app)
- `NEXT_PUBLIC_SITE_URL` - Your Netlify site URL

**Optional:**
- `REDIS_URL` - Redis connection string (for caching)
- `OPENAI_API_KEY` - If using OpenAI instead of Vertex AI

## Option 2: Deploy via Netlify UI

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Connect to Netlify
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Netlify will auto-detect Next.js settings

### Step 3: Configure Build Settings
- Build command: `npx prisma generate && npm run build`
- Publish directory: `.next`
- Node version: 18

### Step 4: Add Environment Variables
Add all required environment variables (see list above) in:
Site settings → Environment variables

## Option 3: Deploy to Vercel (Alternative)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy
```bash
vercel --prod
```

### Step 3: Set Environment Variables
```bash
vercel env add DATABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL
# ... add all other variables
```

## Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] All environment variables are set
- [ ] Telegram bot webhook configured (if using)
- [ ] Test authentication flow
- [ ] Test product creation
- [ ] Test WB API integration
- [ ] Check analytics dashboard
- [ ] Verify image uploads work
- [ ] Test multi-cabinet support

## Database Setup

### Option 1: Supabase (Recommended)
1. Create project at https://supabase.com
2. Run migrations:
```bash
npx prisma migrate deploy
```

### Option 2: Railway/Render
1. Create PostgreSQL database
2. Copy connection string
3. Run migrations

## Redis Setup (Optional but Recommended)

### Upstash Redis
1. Create database at https://upstash.com
2. Copy Redis URL
3. Add to environment variables

## Troubleshooting

### Build Fails
- Check Node version (should be 18+)
- Ensure all dependencies are in `package.json`
- Run `npm install` locally first

### Database Connection Issues
- Verify `DATABASE_URL` format
- Check database allows external connections
- Run `npx prisma generate` before build

### API Errors
- Verify all API keys are set
- Check CORS settings
- Review Netlify function logs

## Monitoring

After deployment, monitor:
- Netlify function logs
- Database query performance
- Redis cache hit rate
- WB API rate limits

## Support

For issues, check:
- Netlify deploy logs
- Browser console errors
- Server-side logs in Netlify Functions

---

**Note:** This application requires external services (PostgreSQL, Redis, Supabase, Google Vertex AI, WB API). Ensure all are properly configured before deployment.
