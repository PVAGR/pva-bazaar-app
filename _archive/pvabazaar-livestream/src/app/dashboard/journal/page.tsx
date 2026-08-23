'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function JournalPage() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [verificationResult, setVerificationResult] = useState<{ [key: string]: any }>({});

  const fetchEntries = () => {
    if (session) {
      fetch('/api/journals')
        .then((res) => res.json())
        .then(setEntries);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setLoading(prev => ({ ...prev, form: true }));

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('userId', session.user.id);
    if (file) {
      formData.append('file', file);
    }

    const res = await fetch('/api/journals', {
      method: 'POST',
      body: formData,
    });

    setLoading(prev => ({ ...prev, form: false }));

    if (res.ok) {
      fetchEntries();
      setTitle('');
      setContent('');
      setFile(null);
    }
  };

  const handleSign = async (entryId: string) => {
    setLoading(prev => ({ ...prev, [entryId]: true }));
    const res = await fetch(`/api/journals/${entryId}/sign`, {
      method: 'POST',
    });
    if (res.ok) {
      fetchEntries(); // Refetch to show the signed status
    }
    setLoading(prev => ({ ...prev, [entryId]: false }));
  };

  const handleVerify = async (entryId: string) => {
    const entry = entries.find(e => e._id === entryId);
    if (!entry || !entry.verifiableCredential) return;

    setLoading(prev => ({ ...prev, [entryId]: true }));
    const res = await fetch(`/api/journals/${entryId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vcJwt: entry.verifiableCredential }),
    });

    const result = await res.json();
    setVerificationResult(prev => ({ ...prev, [entryId]: result }));
    setLoading(prev => ({ ...prev, [entryId]: false }));
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">My Journal</h1>
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-800 rounded-lg">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Entry Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div className="mb-4">
          <textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            rows={5}
            required
          ></textarea>
        </div>
        <div className="mb-4">
          <label htmlFor="file" className="block text-sm font-medium text-gray-300">
            Attach File
          </label>
          <input
            type="file"
            id="file"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
          disabled={loading['form']}
        >
          {loading['form'] ? 'Submitting...' : 'Add Entry'}
        </button>
      </form>

      <div className="space-y-4">
        {entries.map((entry: any) => (
          <div key={entry._id} className="p-4 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-semibold text-white">{entry.title}</h2>
            <p className="text-gray-300">{entry.content}</p>
            {entry.attachmentIpfsHash && (
              <a
                href={`https://gateway.pinata.cloud/ipfs/${entry.attachmentIpfsHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline mt-2 inline-block"
              >
                View Attachment
              </a>
            )}
            <div className="mt-4">
              {!entry.verifiableCredential ? (
                <button
                  onClick={() => handleSign(entry._id)}
                  className="px-3 py-1 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400"
                  disabled={loading[entry._id]}
                >
                  {loading[entry._id] ? 'Signing...' : 'Sign Entry'}
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="text-green-400 font-semibold">Signed</span>
                  <button
                    onClick={() => handleVerify(entry._id)}
                    className="px-3 py-1 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                    disabled={loading[entry._id]}
                  >
                    {loading[entry._id] ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              )}
            </div>
            {verificationResult[entry._id] && (
              <div className="mt-2 p-2 bg-gray-700 rounded">
                <p className={`text-sm font-semibold ${verificationResult[entry._id]?.verified ? 'text-green-400' : 'text-red-400'}`}>
                  Verification Status: {verificationResult[entry._id]?.verified ? 'Success' : 'Failed'}
                </p>
                {verificationResult[entry._id] && (
                  <div className="mt-2 text-xs text-gray-300 bg-gray-900 p-2 rounded">
                    <h4 className="font-bold">Details:</h4>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(verificationResult[entry._id], null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {entries.length === 0 && !loading['form'] && (
          <div className="text-center text-gray-500 py-8">
            <p>No journal entries yet.</p>
            <p>Add one using the form above to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}