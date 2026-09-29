import { NextResponse } from 'next/server';
import { verifyAdminPassword, createSessionToken, ADMIN_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Senha é obrigatória.' },
        { status: 400 }
      );
    }

    const isValid = await verifyAdminPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Senha incorreta. Tente novamente.' },
        { status: 401 }
      );
    }

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
