import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken, ADMIN_COOKIE_NAME } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionToken(token);

  // 1. Admin Login Page
  if (pathname === '/admin/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // 2. Admin Panel Pages (/admin, /admin/...)
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Protected Mutation API Endpoints
  const isSongsMutation = pathname.startsWith('/api/songs') && request.method !== 'GET';
  const isEventsMutation =
    pathname.startsWith('/api/events') &&
    request.method !== 'GET' &&
    !pathname.endsWith('/songs');

  if (isSongsMutation || isEventsMutation) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Acesso não autorizado. Sessão de administrador necessária.' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/songs/:path*',
    '/api/events',
    '/api/events/:path*',
  ],
};
