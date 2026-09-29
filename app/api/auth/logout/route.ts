import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  const isSecureCookie = new URL(request.url).protocol === 'https:';

  const response = NextResponse.json(
    { message: 'Sessão encerrada com sucesso.', success: true },
    { status: 200 }
  );

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export async function GET(request: Request) {
  return POST(request);
}
