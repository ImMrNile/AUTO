// src/app/api/auth/telegram/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Lazy initialization of Supabase client to avoid build-time errors
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tgAuth = Object.fromEntries(searchParams.entries());
    
    // Verify the auth data
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const secretKey = crypto
      .createHash('sha256')
      .update(botToken)
      .digest();
    
    const checkString = Object.keys(tgAuth)
      .filter(key => key !== 'hash' && key !== 'state')
      .sort()
      .map(key => `${key}=${tgAuth[key]}`)
      .join('\n');
    
    const hash = crypto
      .createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex');
    
    if (hash !== tgAuth.hash) {
      return NextResponse.redirect(new URL('/auth/error?message=Invalid Telegram authentication', request.url));
    }
    
    // Check if auth is not too old (24 hours)
    const authDate = parseInt(tgAuth.auth_date);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      return NextResponse.redirect(new URL('/auth/error?message=Authentication expired', request.url));
    }
    
    const telegramId = tgAuth.id;
    const email = tgAuth.username 
      ? `${tgAuth.username}@telegram.local` 
      : `tg${telegramId}@telegram.local`;
    const name = [tgAuth.first_name, tgAuth.last_name]
      .filter(Boolean)
      .join(' ') || tgAuth.username || `tg-${telegramId}`;
    
    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { telegramId },
          { email }
        ]
      }
    });
    
    if (!user) {
      // Create new user
      const supabaseId = `telegram:${telegramId}`;
      user = await prisma.user.create({
        data: {
          email,
          name,
          supabaseId,
          role: 'USER',
          isActive: true,
          lastLoginAt: new Date(),
          telegramId,
          telegramUsername: tgAuth.username,
          telegramPhotoUrl: tgAuth.photo_url,
          telegramAuthDate: new Date(authDate * 1000)
        }
      });
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          telegramId,
          telegramUsername: tgAuth.username,
          telegramPhotoUrl: tgAuth.photo_url,
          telegramAuthDate: new Date(authDate * 1000)
        }
      });
    }
    
    // Create or get Supabase user
    const supabase = getSupabaseClient();
    let supabaseUser;
    const { data: existingUser } = await supabase.auth.admin.getUserById(user.supabaseId || '');
    
    if (!existingUser.user) {
      // Create new Supabase user
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          telegramId: user.telegramId
        }
      });
      
      if (createError) {
        console.error('Error creating Supabase user:', createError);
        return NextResponse.redirect(new URL('/auth/error?message=Failed to create session', request.url));
      }
      
      supabaseUser = newUser.user;
      
      // Update user with supabaseId
      await prisma.user.update({
        where: { id: user.id },
        data: { supabaseId: supabaseUser.id }
      });
    } else {
      supabaseUser = existingUser.user;
    }
    
    // Create session in our database
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });
    
    // Set session cookie
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('session-token', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });
    
    return response;
    
  } catch (error) {
    console.error('Error in Telegram OAuth callback:', error);
    return NextResponse.redirect(new URL('/auth/error?message=An error occurred', request.url));
  }
}
