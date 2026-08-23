import { connectToDatabase } from '@/lib/mongodb';
import { JournalEntry } from '@/models/JournalEntry';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const entries = await JournalEntry.find({ userId: session.user.id }).sort({ createdAt: -1 });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, content, userId } = await req.json();

  if (userId !== session.user.id) {
    return NextResponse.json({ error: 'Mismatched user' }, { status: 403 });
  }

  await connectToDatabase();
  const newEntry = await JournalEntry.create({
    title,
    content,
    userId,
  });

  return NextResponse.json(newEntry, { status: 201 });
}