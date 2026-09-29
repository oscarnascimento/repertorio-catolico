import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import EventMobilePageClient from './EventMobilePageClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      title: true,
    },
  });

  if (!event) {
    return {
      title: 'Celebração não encontrada',
      description: 'Evento não encontrado no repertório católico.',
    };
  }

  const title = event.title;
  const description = `Repertório da celebração: ${title}. Veja as músicas, observações e comentários desta adoração.`;
  const url = `${getBaseUrl()}/evento/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function EventPage({ params }: PageProps) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      songs: {
        include: {
          song: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  return <EventMobilePageClient eventId={id} initialEvent={event} />;
}
