import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { generateDID } from '@/lib/did';

export async function POST(req: Request) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password || !displayName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const did = await generateDID();
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      displayName,
      did: did.id,
      privacySettings: {
        allowPublicProfile: false,
        allowPublicJournals: false,
        dataExportable: true,
      },
    });

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: newUser._id,
          email: newUser.email,
          displayName: newUser.displayName,
          did: newUser.did,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}