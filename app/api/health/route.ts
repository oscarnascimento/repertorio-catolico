import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Tenta fazer uma query simples
    const songCount = await prisma.song.count();

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      songCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Health check database error:', error);
    
    let diagnosis = 'Erro desconhecido de conexão com o banco de dados.';
    
    if (error?.code === 'P2021') {
      diagnosis = 'A tabela "Song" não existe no banco. Execute "npx prisma db push" para criar as tabelas.';
    } else if (error?.code === 'P1001') {
      diagnosis = 'Não foi possível alcançar o servidor de banco de dados. Verifique o host/porta no DATABASE_URL.';
    } else if (error?.code === 'P1000') {
      diagnosis = 'Falha de autenticação. Verifique o usuário e senha no DATABASE_URL.';
    }

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        code: error?.code || null,
        message: error?.message || String(error),
        diagnosis,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
