# Quick Fix for 404 Error

## Problem
Getting "Page not found" on https://nealai.netlify.app

## Root Cause
The Next.js application requires environment variables to run. Without them, the app fails to start properly, resulting in 404 errors.

## Solution

### Step 1: Add Environment Variables in Netlify

1. Go to: https://app.netlify.com/sites/nealai/configuration/env

2. Click "Add a variable" and add these **minimum required** variables:

```
DATABASE_URL=postgresql://user:pass@host:5432/db
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_API_URL=https://nealai.netlify.app
NEXT_PUBLIC_SITE_URL=https://nealai.netlify.app
NODE_ENV=production
```

### Step 2: Get Database URL (if you don't have one)

**Option A: Supabase (Recommended)**
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings → Database
4. Copy the "Connection string" (URI format)
5. Use this as `DATABASE_URL`

**Option B: Neon (Free PostgreSQL)**
1. Go to https://neon.tech
2. Create a new project
3. Copy the connection string
4. Use this as `DATABASE_URL`

### Step 3: Redeploy

After adding environment variables:

1. Go to: https://app.netlify.com/sites/nealai/deploys
2. Click "Trigger deploy" button
3. Select "Clear cache and deploy site"
4. Wait 2-3 minutes for deployment

### Step 4: Run Database Migrations

After successful deployment, you need to run migrations:

**Option A: Using Netlify CLI**
```bash
# Set DATABASE_URL in your local .env
DATABASE_URL=your-production-database-url npx prisma migrate deploy
```

**Option B: Using Supabase SQL Editor**
1. Go to your Supabase project → SQL Editor
2. Copy contents from `prisma/migrations/*/migration.sql`
3. Run each migration file in order

## Verification

After redeployment:
1. Visit https://nealai.netlify.app
2. You should see the login page
3. If still 404, check Netlify function logs: https://app.netlify.com/sites/nealai/logs/functions

## Common Issues

### Issue: Still getting 404 after adding variables
**Solution**: Make sure you clicked "Trigger deploy" → "Clear cache and deploy site"

### Issue: Database connection error
**Solution**: Verify DATABASE_URL format:
```
postgresql://user:password@host:5432/database?sslmode=require
```

### Issue: Supabase keys not working
**Solution**: 
1. Go to Supabase project → Settings → API
2. Copy the correct keys:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (secret)

## Quick Test

Once deployed, test these URLs:
- https://nealai.netlify.app (should show login page)
- https://nealai.netlify.app/auth/login (should show login form)
- https://nealai.netlify.app/api/health (should return JSON)

## Need Help?

Check logs:
- Build logs: https://app.netlify.com/sites/nealai/deploys
- Function logs: https://app.netlify.com/sites/nealai/logs/functions
- Browser console: Press F12 and check Console tab
