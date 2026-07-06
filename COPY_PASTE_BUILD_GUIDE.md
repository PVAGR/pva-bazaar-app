# PVABazaar Livestream - Complete Setup & Copy-Paste Build Guide

**Status: Blueprint v1 - Ready to Deploy**  
**Build Time: 2-4 weeks | Complexity: Intermediate**  
**Last Updated: January 23, 2026**

---

## 🚀 STEP 1: Initial Project Setup

### 1.1 Create Next.js Project

```bash
npx create-next-app@latest pvabazaar-livestream --typescript --tailwind --app-router --eslint
cd pvabazaar-livestream
```

When prompted:

- ✅ TypeScript: Yes
- ✅ Tailwind CSS: Yes
- ✅ App Router: Yes
- ✅ ESLint: Yes
- ❌ src/ directory: No
- ✅ Git: Yes

### 1.2 Install Dependencies

```bash
npm install mongoose next-auth @pinata/sdk hls.js axios dotenv bcryptjs form-data
npm install --save-dev @types/bcryptjs
```

### 1.3 Initialize Git & Connect to GitHub

```bash
git init
git add .
git commit -m "Initial Next.js scaffold"
git remote add origin https://github.com/YOUR_USERNAME/pvabazaar-livestream.git
git push -u origin main
```

---

## 🔑 STEP 2: Environment Variables

### Create `.env.local` in project root

Copy and paste this entire block, then fill in your credentials:

```env
# ===== DATABASE =====
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/pvabazaar?retryWrites=true&w=majority

# ===== AUTHENTICATION =====
NEXTAUTH_SECRET=your_secret_here_generate_with_openssl_rand_hex_32
NEXTAUTH_URL=http://localhost:3000

# ===== PINATA (IPFS) =====
PINATA_API_KEY=your_pinata_key
PINATA_API_SECRET=your_pinata_secret
PINATA_API_JWT=your_jwt_from_pinata

# ===== STREAMING PLATFORMS (OPTIONAL FOR v1) =====
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_secret
LIVEPEER_API_KEY=your_livepeer_key

# ===== VERCEL PRODUCTION =====
# (Set these in Vercel dashboard, not here)
# NEXTAUTH_URL=https://your-domain.vercel.app
```

**To generate NEXTAUTH_SECRET:**

```bash
openssl rand -hex 32
# Copy output and paste into .env.local
```

---

## 📁 STEP 3: Create Folder Structure

```bash
mkdir -p lib models components/ui app/api/auth app/api/streams app/api/journals app/api/webhooks/twitch app/api/users/export app/dashboard/streams app/dashboard/journals app/dashboard/settings app/profile app/auth/signin app/auth/signup public
```

---

## 📦 STEP 4: Core Library Files

### `lib/mongodb.ts`

```typescript
import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const cached: MongooseCache = (global as any).mongoose || { conn: null, promise: null };

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
```

### `lib/ipfs.ts`

```typescript
import axios from 'axios';

export async function uploadToIPFS(file: File, metadata?: Record<string, any>) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    if (metadata) {
      formData.append('pinataMetadata', JSON.stringify(metadata));
    }

    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_API_SECRET,
      },
    });

    console.log(`Pinned to IPFS: ${response.data.IpfsHash}`);
    return response.data.IpfsHash;
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw error;
  }
}

export function getIPFSUrl(hash: string): string {
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
}
```

---

## 🗄️ STEP 5: MongoDB Models

### `models/User.ts`

```typescript
import { Schema, model, models, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  did?: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  privacySettings: {
    allowPublicProfile: boolean;
    allowPublicJournals: boolean;
    dataExportable: boolean;
  };
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: String,
    did: String,
    displayName: { type: String, required: true },
    bio: String,
    avatar: String,
    privacySettings: {
      allowPublicProfile: { type: Boolean, default: false },
      allowPublicJournals: { type: Boolean, default: false },
      dataExportable: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export const User = models.User || model<IUser>('User', userSchema);
```

### `models/JournalEntry.ts`

```typescript
import { Schema, model, models, Document } from 'mongoose';

export interface IJournalEntry extends Document {
  userId: string;
  title: string;
  content: string;
  linkedStreamId?: string;
  tags: string[];
  mood?: 'vulnerable' | 'uplifting' | 'reflective' | 'chaotic' | 'peaceful';
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const journalSchema = new Schema<IJournalEntry>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    linkedStreamId: String,
    tags: { type: [String], default: [] },
    mood: {
      type: String,
      enum: ['vulnerable', 'uplifting', 'reflective', 'chaotic', 'peaceful'],
      default: 'reflective',
    },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const JournalEntry =
  models.JournalEntry || model<IJournalEntry>('JournalEntry', journalSchema);
```

### `models/Stream.ts`

```typescript
import { Schema, model, models, Document } from 'mongoose';

export interface IStream extends Document {
  userId: string;
  title: string;
  description?: string;
  platform: 'twitch' | 'kick' | 'livepeer' | 'custom';
  platformStreamId: string;
  ingestUrl?: string;
  playbackUrl?: string;
  recordingIpfsHash?: string;
  status: 'offline' | 'live' | 'ended';
  startTime?: Date;
  endTime?: Date;
  viewerCount?: number;
  duration?: number;
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const streamSchema = new Schema<IStream>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    platform: { type: String, enum: ['twitch', 'kick', 'livepeer', 'custom'], required: true },
    platformStreamId: { type: String, required: true },
    ingestUrl: String,
    playbackUrl: String,
    recordingIpfsHash: String,
    status: { type: String, enum: ['offline', 'live', 'ended'], default: 'offline' },
    startTime: Date,
    endTime: Date,
    viewerCount: Number,
    duration: Number,
    tags: { type: [String], default: [] },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Stream = models.Stream || model<IStream>('Stream', streamSchema);
```

---

## 🔐 STEP 6: Authentication

### `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        await connectToDatabase();
        const user = await User.findOne({ email: credentials.email });

        if (!user) {
          throw new Error('User not found');
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password || '');
        if (!passwordMatch) {
          throw new Error('Invalid password');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.displayName,
          image: user.avatar,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub || '';
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### `app/api/auth/signup/route.ts`

```typescript
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

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

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      displayName,
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
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## 📺 STEP 7: API Routes

### `app/api/streams/route.ts`

```typescript
import { connectToDatabase } from '@/lib/mongodb';
import { Stream } from '@/models/Stream';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, description, platform, platformStreamId, ingestUrl, playbackUrl } =
      await req.json();

    await connectToDatabase();

    const stream = await Stream.create({
      userId: (session.user as any).id,
      title,
      description,
      platform,
      platformStreamId,
      ingestUrl,
      playbackUrl,
      status: 'offline',
    });

    return NextResponse.json(stream, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create stream' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const userId = new URL(req.url).searchParams.get('userId');

    const streams = await Stream.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json(streams);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 });
  }
}
```

### `app/api/journals/route.ts`

```typescript
import { connectToDatabase } from '@/lib/mongodb';
import { JournalEntry } from '@/models/JournalEntry';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, content, mood, tags, linkedStreamId, isPublic } = await req.json();

    await connectToDatabase();

    const journal = await JournalEntry.create({
      userId: (session.user as any).id,
      title,
      content,
      mood,
      tags,
      linkedStreamId,
      isPublic: isPublic || false,
    });

    return NextResponse.json(journal, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const userId = new URL(req.url).searchParams.get('userId');

    const journals = await JournalEntry.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json(journals);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch journals' }, { status: 500 });
  }
}
```

### `app/api/users/export/route.ts`

```typescript
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Stream } from '@/models/Stream';
import { JournalEntry } from '@/models/JournalEntry';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const user = await User.findById((session.user as any).id);
    const streams = await Stream.find({ userId: (session.user as any).id });
    const journals = await JournalEntry.find({ userId: (session.user as any).id });

    const exportData = {
      user: {
        id: user?._id,
        email: user?.email,
        displayName: user?.displayName,
        bio: user?.bio,
        did: user?.did,
        createdAt: user?.createdAt,
      },
      streams: streams.map((s) => ({
        id: s._id,
        title: s.title,
        platform: s.platform,
        playbackUrl: s.playbackUrl,
        recordingIpfsHash: s.recordingIpfsHash,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      journals: journals.map((j) => ({
        id: j._id,
        title: j.title,
        content: j.content,
        mood: j.mood,
        tags: j.tags,
        createdAt: j.createdAt,
      })),
      exportedAt: new Date(),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    return new Response(blob, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="pvabazaar-export-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
```

### `app/api/webhooks/twitch/route.ts`

```typescript
import { connectToDatabase } from '@/lib/mongodb';
import { Stream } from '@/models/Stream';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const event = await req.json();

    if (event.subscription?.type === 'stream.online') {
      await connectToDatabase();

      const stream = await Stream.findOne({
        platformStreamId: event.data.id,
        platform: 'twitch',
      });

      if (stream) {
        stream.status = 'live';
        stream.startTime = new Date();
        await stream.save();
        console.log(`Stream ${stream._id} is now LIVE`);
      }
    } else if (event.subscription?.type === 'stream.offline') {
      await connectToDatabase();

      const stream = await Stream.findOne({
        platformStreamId: event.data.id,
        platform: 'twitch',
      });

      if (stream) {
        stream.status = 'ended';
        stream.endTime = new Date();
        await stream.save();
        console.log(`Stream ${stream._id} ended`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
```

---

## 🎨 STEP 8: Frontend Components

### `components/HLSPlayer.tsx`

```typescript
'use client';

import { useEffect, useRef } from 'react';
import HLS from 'hls.js';

interface HLSPlayerProps {
  src: string;
  autoPlay?: boolean;
}

export default function HLSPlayer({ src, autoPlay = true }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !src) return;

    if (HLS.isSupported()) {
      const hls = new HLS();
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        if (autoPlay) videoRef.current?.play();
      });

      return () => {
        hls.destroy();
      };
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = src;
    }
  }, [src, autoPlay]);

  return (
    <video
      ref={videoRef}
      controls
      className="w-full h-full bg-black"
      style={{ aspectRatio: '16 / 9' }}
    />
  );
}
```

### `components/StreamCard.tsx`

```typescript
'use client';

export interface StreamCardProps {
  stream: {
    _id: string;
    title: string;
    description?: string;
    platform: string;
    status: 'live' | 'offline' | 'ended';
    createdAt: string;
  };
}

export default function StreamCard({ stream }: StreamCardProps) {
  return (
    <div className="bg-charcoal-700 rounded-lg p-4 border border-gray-400 border-opacity-30 hover:border-opacity-50 transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-200">{stream.title}</h3>
          <p className="text-gray-400 text-sm mt-1">{stream.description || 'No description'}</p>
          <div className="flex gap-2 mt-3">
            <span className="text-xs px-2 py-1 bg-gray-400 bg-opacity-20 rounded text-gray-300">
              {stream.platform}
            </span>
            {stream.status === 'live' && (
              <span className="text-xs px-2 py-1 bg-red-600 rounded text-white font-semibold">
                LIVE
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="text-gray-500 text-xs mt-3">{new Date(stream.createdAt).toLocaleDateString()}</p>
    </div>
  );
}
```

### `components/JournalPreview.tsx`

```typescript
'use client';

export interface JournalPreviewProps {
  journal: {
    _id: string;
    title: string;
    content: string;
    mood?: string;
    createdAt: string;
  };
}

export default function JournalPreview({ journal }: JournalPreviewProps) {
  const contentPreview = journal.content.substring(0, 150) + (journal.content.length > 150 ? '...' : '');

  return (
    <div className="bg-charcoal-700 rounded-lg p-4 border border-gray-400 border-opacity-30 hover:border-opacity-50 transition">
      <h3 className="font-semibold text-gray-200">{journal.title}</h3>
      <p className="text-gray-400 text-sm mt-2">{contentPreview}</p>
      <div className="flex items-center justify-between mt-3">
        {journal.mood && (
          <span className="text-xs px-2 py-1 bg-teal-500 bg-opacity-20 rounded text-teal-300">
            {journal.mood}
          </span>
        )}
        <p className="text-gray-500 text-xs">{new Date(journal.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
```

### `components/Sidebar.tsx`

```typescript
'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  user: any;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-64 bg-charcoal-800 border-r border-gray-400 border-opacity-30 p-6 flex flex-col h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-teal-300">PVABazaar</h1>
        <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
      </div>

      <nav className="flex-1 space-y-2">
        <Link
          href="/dashboard"
          className={`block px-4 py-2 rounded transition ${
            isActive('/dashboard') ? 'bg-teal-500 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/dashboard/streams"
          className={`block px-4 py-2 rounded transition ${
            isActive('/dashboard/streams') ? 'bg-teal-500 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          Streams
        </Link>
        <Link
          href="/dashboard/journals"
          className={`block px-4 py-2 rounded transition ${
            isActive('/dashboard/journals') ? 'bg-teal-500 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          Journals
        </Link>
        <Link
          href="/dashboard/settings"
          className={`block px-4 py-2 rounded transition ${
            isActive('/dashboard/settings') ? 'bg-teal-500 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          Settings
        </Link>
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
      >
        Sign Out
      </button>
    </aside>
  );
}
```

---

## 📄 STEP 9: Pages

### `app/dashboard/layout.tsx`

```typescript
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="flex h-screen bg-charcoal-700">
      <Sidebar user={session.user} />
      <main className="flex-1 overflow-y-auto bg-charcoal-800 p-8">
        {children}
      </main>
    </div>
  );
}
```

### `app/dashboard/page.tsx`

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import StreamCard from '@/components/StreamCard';
import JournalPreview from '@/components/JournalPreview';

export default function DashboardHome() {
  const { data: session } = useSession();
  const [streams, setStreams] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    async function fetchData() {
      try {
        const [streamsRes, journalsRes] = await Promise.all([
          fetch(`/api/streams?userId=${(session.user as any).id}`),
          fetch(`/api/journals?userId=${(session.user as any).id}`),
        ]);

        if (streamsRes.ok) setStreams(await streamsRes.json());
        if (journalsRes.ok) setJournals(await journalsRes.json());
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [session?.user]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-300">Loading...</p>
      </div>
    );

  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-200 mb-8">Your Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <section>
          <h2 className="text-2xl font-semibold text-teal-300 mb-4">Recent Streams</h2>
          <div className="space-y-4">
            {streams.length > 0 ? (
              streams.slice(0, 5).map((stream) => <StreamCard key={stream._id} stream={stream} />)
            ) : (
              <p className="text-gray-400">No streams yet. Start your first broadcast!</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-teal-300 mb-4">Recent Journals</h2>
          <div className="space-y-4">
            {journals.length > 0 ? (
              journals.slice(0, 5).map((journal) => <JournalPreview key={journal._id} journal={journal} />)
            ) : (
              <p className="text-gray-400">No journal entries yet. Start reflecting!</p>
            )}
          </div>
        </section>
      </div>

      <section className="bg-charcoal-700 rounded-lg p-6 border border-gray-400 border-opacity-30">
        <h2 className="text-xl font-semibold text-teal-300 mb-4">Your Archive Links</h2>
        <ul className="space-y-2">
          <li>
            <a
              href="https://pvabazaar.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-300 hover:text-teal-200"
            >
              → PVABazaar.org (Personal Archive 2020-2026)
            </a>
          </li>
          <li>
            <a href="#" className="text-teal-300 hover:text-teal-200">
              → Your IPFS Profile (Decentralized Identity)
            </a>
          </li>
          <li>
            <a href="/api/users/export" className="text-teal-300 hover:text-teal-200">
              → Download Your Data (JSON Export)
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
```

### `app/auth/signin/page.tsx`

```typescript
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (!result?.ok) {
        setError('Invalid email or password');
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-charcoal-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-charcoal-700 rounded-lg border border-gray-400 border-opacity-30 p-8">
        <h1 className="text-3xl font-bold text-teal-300 mb-2">PVABazaar</h1>
        <p className="text-gray-400 mb-8">Reclaim Your Digital Autonomy</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-900 bg-opacity-20 p-3 rounded">{error}</p>}

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2 bg-charcoal-800 border border-gray-400 border-opacity-30 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 bg-charcoal-800 border border-gray-400 border-opacity-30 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-semibold rounded transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-teal-300 hover:text-teal-200">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### `app/auth/signup/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Signup failed');
        return;
      }

      // Auto sign in
      await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-charcoal-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-charcoal-700 rounded-lg border border-gray-400 border-opacity-30 p-8">
        <h1 className="text-3xl font-bold text-teal-300 mb-2">Create Account</h1>
        <p className="text-gray-400 mb-8">Join the decentralized movement</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-900 bg-opacity-20 p-3 rounded">{error}</p>}

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              required
              className="w-full px-4 py-2 bg-charcoal-800 border border-gray-400 border-opacity-30 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2 bg-charcoal-800 border border-gray-400 border-opacity-30 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 bg-charcoal-800 border border-gray-400 border-opacity-30 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 bg-charcoal-800 border border-gray-400 border-opacity-30 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-semibold rounded transition"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-teal-300 hover:text-teal-200">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

## 🎨 STEP 10: Global Styles

### Update `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --charcoal-700: #1f2121;
  --charcoal-800: #262828;
  --gray-200: #f5f5f5;
  --gray-300: #a7a9a9;
  --gray-400: #777c7c;
  --teal-300: #32b8c6;
  --teal-400: #2da6b2;
  --teal-500: #218085;
}

html {
  background-color: var(--charcoal-700);
  color: var(--gray-200);
}

body {
  background-color: var(--charcoal-700);
  color: var(--gray-200);
}

.bg-charcoal-700 {
  background-color: var(--charcoal-700);
}

.bg-charcoal-800 {
  background-color: var(--charcoal-800);
}

.text-teal-300 {
  color: var(--teal-300);
}

.text-teal-400 {
  color: var(--teal-400);
}

.text-teal-500 {
  color: var(--teal-500);
}

.text-gray-200 {
  color: var(--gray-200);
}

.text-gray-300 {
  color: var(--gray-300);
}

.text-gray-400 {
  color: var(--gray-400);
}

.text-gray-500 {
  color: rgba(107, 114, 128, 1);
}
```

---

## ⚙️ STEP 11: Update `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          700: '#1f2121',
          800: '#262828',
        },
        teal: {
          300: '#32b8c6',
          400: '#2da6b2',
          500: '#218085',
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

---

## 🏠 STEP 12: Create Landing Page

### `app/page.tsx`

```typescript
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-charcoal-700 flex flex-col">
      <header className="flex items-center justify-between p-6 bg-charcoal-800 border-b border-gray-400 border-opacity-30">
        <h1 className="text-3xl font-bold text-teal-300">PVABazaar</h1>
        <div className="space-x-4">
          <Link href="/auth/signin" className="px-4 py-2 text-teal-300 hover:text-teal-200">
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
          >
            Sign Up
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-5xl font-bold text-gray-200 mb-4">Reclaim Your Digital Autonomy</h2>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl">
          Stream to Twitch/Kick while auto-recording to your own database. Journal your thoughts. Control your data.
          Fork and customize. Built for the collective consciousness.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mb-12">
          <div className="bg-charcoal-800 rounded-lg p-6 border border-gray-400 border-opacity-30">
            <h3 className="text-xl font-semibold text-teal-300 mb-2">Stream Autonomously</h3>
            <p className="text-gray-400">
              Stream to your favorite platforms while recording everything to your own IPFS database.
            </p>
          </div>
          <div className="bg-charcoal-800 rounded-lg p-6 border border-gray-400 border-opacity-30">
            <h3 className="text-xl font-semibold text-teal-300 mb-2">Journal Freely</h3>
            <p className="text-gray-400">
              Reflect on your stream experience with mood-tagged journal entries that belong to you alone.
            </p>
          </div>
          <div className="bg-charcoal-800 rounded-lg p-6 border border-gray-400 border-opacity-30">
            <h3 className="text-xl font-semibold text-teal-300 mb-2">Own Your Data</h3>
            <p className="text-gray-400">
              Export your data anytime. No corporate lock-in. Complete control and sovereignty.
            </p>
          </div>
        </div>

        <Link
          href="/auth/signup"
          className="px-8 py-3 bg-teal-500 text-white font-semibold rounded hover:bg-teal-600 transition text-lg"
        >
          Start Your Journey
        </Link>
      </main>

      <footer className="text-center py-6 text-gray-500 border-t border-gray-400 border-opacity-30">
        <p>Blueprint v1 • Open Source • Decentralized • Community-Driven</p>
        <p className="text-sm mt-2">
          <a href="https://pvabazaar.org" className="text-teal-300 hover:text-teal-200">
            Visit PVABazaar.org
          </a>
        </p>
      </footer>
    </div>
  );
}
```

---

## 🧪 STEP 13: Test Locally

```bash
# Terminal 1: Run development server
npm run dev

# Terminal 2: Watch for TypeScript errors (optional)
npm run type-check

# Open browser
open http://localhost:3000
```

**Test flow:**

1. ✅ Visit http://localhost:3000 → See landing page
2. ✅ Click "Sign Up" → Create account
3. ✅ Auto-signs in → Redirects to dashboard
4. ✅ Dashboard shows "No streams yet"
5. ✅ Everything works = Ready to deploy!

---

## 🚀 STEP 14: Deploy to Vercel

### 14.1 Push to GitHub

```bash
git add .
git commit -m "Complete PVABazaar v1 blueprint"
git push origin main
```

### 14.2 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repo: `pvabazaar-livestream`
4. Under "Environment Variables," add ALL from `.env.local`:
   - `MONGODB_URI`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL=https://YOUR_VERCEL_DOMAIN.vercel.app`
   - `PINATA_API_KEY`
   - `PINATA_API_SECRET`
   - `PINATA_API_JWT`
5. Click "Deploy"
6. Once live, update `NEXTAUTH_URL` in Vercel to your production domain

---

## 📋 Checklist Before Going Live

- [ ] MongoDB Atlas cluster created and URI in `.env`
- [ ] Pinata account set up with API keys
- [ ] All files copied to correct locations
- [ ] Local `npm run dev` works without errors
- [ ] Can sign up and see dashboard
- [ ] GitHub repo created and connected to Vercel
- [ ] Environment variables set in Vercel
- [ ] Production URL updated in `NEXTAUTH_URL`
- [ ] Test sign up/sign in on live deployment

---

## 🔗 Next Steps (v1.1+)

Once v1.0 is live:

1. **Add Stream Management** (`app/dashboard/streams/page.tsx`)
2. **Add Journal Editor** (`app/dashboard/journals/page.tsx`)
3. **Add Settings Page** (`app/dashboard/settings/page.tsx`)
4. **Integrate Twitch API** for real stream creation
5. **Add Livepeer Integration** for decentralized streaming
6. **Implement DID (Spruce)** for self-sovereign identity
7. **Create GitHub Issues** for community contributions

---

**You now have a complete, deployable Blueprint v1. Copy-paste everything, deploy, and let the community build from here.** 🚀

_Complete guide prepared: January 23, 2026_  
_Ready for production deployment_
