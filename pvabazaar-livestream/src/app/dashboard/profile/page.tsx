'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { IUser } from '@/models/User';
import { User, Mail, Fingerprint, Copy, Check } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (session) {
      setLoading(true);
      fetch(`/api/users/${session.user.id}`)
        .then((res) => res.json())
        .then((data) => {
          setUser(data);
          setLoading(false);
        });
    }
  }, [session]);

  const handleCopy = () => {
    if (user?.did) {
      navigator.clipboard.writeText(user.did);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <div className="text-center text-red-500">Failed to load user profile.</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">My Profile</h1>
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-700">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
            {user.displayName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{user.displayName}</h2>
            <p className="text-gray-400">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <User className="text-gray-400 mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-gray-400">Display Name</h3>
              <p className="text-white">{user.displayName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="text-gray-400 mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-gray-400">Email</h3>
              <p className="text-white">{user.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Fingerprint className="text-gray-400 mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-gray-400">Decentralized ID (DID)</h3>
              <div className="flex items-center gap-2">
                <p className="text-indigo-300 break-all font-mono text-sm">{user.did}</p>
                <button
                  onClick={handleCopy}
                  className="p-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white"
                  aria-label="Copy DID"
                >
                  {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This is your unique, self-sovereign identifier on the platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
