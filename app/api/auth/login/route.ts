import { NextResponse } from 'next/server';
import { verifyAdminPassword, createSessionToken, ADMIN_COOKIE_NAME } from '@/lib/auth';

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; firstAttempt: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

function isLockedOut(ip: string): boolean {
  const now = Date.now();
  const entry = failedAttempts.get(ip);

  if (!entry) {
    return false;
  }

  if (now - entry.firstAttempt > LOGIN_WINDOW_MS) {
    failedAttempts.delete(ip);
    return false;
  }

  return entry.count >= MAX_LOGIN_ATTEMPTS;
}

function registerFailedAttempt(ip: string): void {
  const now = Date.now();
  const existing = failedAttempts.get(ip);

  if (!existing || now - existing.firstAttempt > LOGIN_WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, firstAttempt: now });
    return;
  }

  failedAttempts.set(ip, {
    count: existing.count + 1,
    firstAttempt: existing.firstAttempt,
  });
}

function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { password } = body;
    const clientIp = getClientIp(request);

    if (isLockedOut(clientIp)) {
      return NextResponse.json(
        { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
        { status: 429 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Senha é obrigatória.' },
        { status: 400 }
      );
    }

    const isValid = await verifyAdminPassword(password);
    if (!isValid) {
      registerFailedAttempt(clientIp);
      return NextResponse.json(
        { error: 'Senha incorreta. Tente novamente.' },
        { status: 401 }
      );
    }

    clearFailedAttempts(clientIp);

    const token = await createSessionToken();

    const response = NextResponse.json(
      { message: 'Autenticado com sucesso.', success: true },
      { status: 200 }
    );

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro interno ao processar o login.' },
      { status: 500 }
    );
  }
}
