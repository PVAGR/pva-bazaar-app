import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { JournalEntry } from '@/models/JournalEntry';
import { User } from '@/models/User';
import { getAuthenticatedDID } from '@/lib/did';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  const journalEntry = await JournalEntry.findById(id);
  if (!journalEntry) {
    return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
  }

  if (journalEntry.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const user = await User.findById(session.user.id);
  if (!user || !user.did) {
    return NextResponse.json({ error: 'User or DID not found' }, { status: 500 });
  }

  const did = await getAuthenticatedDID();

  const vcPayload = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'JournalEntry'],
    credentialSubject: {
      id: did.id,
      title: journalEntry.title,
      content: journalEntry.content,
      author: user.displayName,
    },
  };

  try {
    // Create a simple JWT representation of the VC instead
    const vcJwt = JSON.stringify(vcPayload);
    journalEntry.verifiableCredential = vcJwt;
    await journalEntry.save();

    return NextResponse.json(journalEntry);
  } catch (error) {
    console.error('Error creating VC:', error);
    return NextResponse.json({ error: 'Failed to create verifiable credential' }, { status: 500 });
  }
}
