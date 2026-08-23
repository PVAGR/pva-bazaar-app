import { Schema, model, models, Document } from 'mongoose';

export interface IStream extends Document {
  userId: string;
  title: string;
  description?: string;
  platform: 'twitch' | 'kick' | 'livepeer' | 'custom'; // Where streaming to
  platformStreamId: string; // e.g., Twitch stream ID
  ingestUrl?: string; // OBS RTMP ingest URL (from Livepeer)
  playbackUrl?: string; // HLS playback URL
  recordingIpfsHash?: string; // IPFS hash of recording
  status: 'offline' | 'live' | 'ended';
  startTime?: Date;
  endTime?: Date;
  viewerCount?: number;
  duration?: number; // Seconds
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
  { timestamps: true }
);

export const Stream = models.Stream || model<IStream>('Stream', streamSchema);