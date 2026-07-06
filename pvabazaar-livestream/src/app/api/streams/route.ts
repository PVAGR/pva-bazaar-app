import { connectToDatabase } from '@/lib/mongodb';
import { Stream } from '@/models/Stream';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const streams = await Stream.find({ userId: session.user.id }).sort({ startTime: -1 });
  return NextResponse.json(streams);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, description, platform, userId } = await req.json();

  if (userId !== session.user.id) {
    return NextResponse.json({ error: 'Mismatched user' }, { status: 403 });
  }

  await connectToDatabase();
  const newStream = await Stream.create({
    title,
    description,
    platform,
    userId,
    // platformStreamId is required, so we'll add a placeholder.
    // In a real scenario, this would come from the streaming service API.
    platformStreamId: `placeholder_${new Date().getTime()}`,
  });

  return NextResponse.json(newStream, { status: 201 });
}
