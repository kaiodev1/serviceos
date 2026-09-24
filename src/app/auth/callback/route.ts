import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      await db.rpc('accept_invitation');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  return NextResponse.redirect(new URL('/login?error=confirmation', request.url));
}
