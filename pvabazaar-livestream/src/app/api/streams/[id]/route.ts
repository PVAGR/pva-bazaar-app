import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { Stream } from '@/models/Stream';
import { isValidObjectId } from 'mongoose';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: 'Invalid Stream ID' }, { status: 400 });
  }

  await connectToDatabase();

  try {
    const stream = await Stream.findOne({ _id: id, userId: session.user.id });

    if (!stream) {
      return NextResponse.json(
        { message: 'Stream not found or user not authorized' },
        { status: 404 },
      );
    }

    await Stream.deleteOne({ _id: id });

    return NextResponse.json({ message: 'Stream deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting stream:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
