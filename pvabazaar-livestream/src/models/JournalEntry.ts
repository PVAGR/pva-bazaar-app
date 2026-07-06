import { Schema, model, models, Document } from 'mongoose';

export interface IJournalEntry extends Document {
  userId: string; // Reference to User._id
  title: string;
  content: string;
  linkedStreamId?: string; // Optional: ID of associated stream
  attachmentIpfsHash?: string; // IPFS hash for any attachment
  verifiableCredential?: string; // Stores the signed VC as a JWT
  tags: string[];
  mood?: 'vulnerable' | 'uplifting' | 'reflective' | 'chaotic' | 'peaceful'; // Akashic vibe
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
    attachmentIpfsHash: String,
    verifiableCredential: String,
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
