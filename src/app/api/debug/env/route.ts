import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'установлена' : 'НЕ установлена',
      DIRECT_URL: process.env.DIRECT_URL ? 'установлена' : 'НЕ установлена',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'установлена' : 'НЕ установлена',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'установлена' : 'НЕ установлена',
      // Безопасные URL (без паролей)
      DATABASE_URL_SAFE: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@') : null,
      DIRECT_URL_SAFE: process.env.DIRECT_URL ? 
        process.env.DIRECT_URL.replace(/:[^:@]*@/, ':****@') : null
    }
  });
}
