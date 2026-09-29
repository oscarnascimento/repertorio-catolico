import { NextResponse, NextRequest } from 'next/server';
import { verifySessionToken, ADMIN_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionToken(token);

  return NextResponse.json(
    { authenticated: isAuthenticated },
    { status: 200 }
  );
}
