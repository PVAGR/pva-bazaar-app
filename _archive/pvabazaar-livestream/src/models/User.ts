import { Schema, model, models, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string; // Hashed if using credentials
  did?: string; // Decentralized ID (v1.2+)
  displayName: string;
  bio?: string;
  avatar?: string; // URL or IPFS hash
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
    password: String, // Bcrypt hashed in auth logic
    did: String, // e.g., "did:key:z6MkhaXgBZDvotDkL5257faWxcqV6K..."
    displayName: { type: String, required: true },
    bio: String,
    avatar: String, // URL or IPFS hash
    privacySettings: {
      allowPublicProfile: { type: Boolean, default: false },
      allowPublicJournals: { type: Boolean, default: false },
      dataExportable: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>('User', userSchema);