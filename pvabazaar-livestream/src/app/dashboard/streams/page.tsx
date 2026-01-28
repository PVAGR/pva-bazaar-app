'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import { Twitch, Clapperboard, Trash2, Video, PlusCircle } from 'lucide-react';

const platformIcons = {
  twitch: <Twitch size={20} className="text-purple-500" />,
  kick: <Clapperboard size={20} className="text-green-500" />,
  livepeer: <Video size={20} className="text-green-400" />,
  custom: <Clapperboard size={20} className="text-gray-400" />,
};

export default function StreamsPage() {
  const { data: session } = useSession();
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    platform: 'twitch' as 'twitch' | 'kick' | 'livepeer' | 'custom',
    submitting: false,
  });
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchStreams = () => {
    if (session) {
      setLoading(true);
      fetch('/api/streams')
        .then((res) => res.json())
        .then(setStreams)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchStreams();
  }, [session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setFormState(prev => ({ ...prev, submitting: true }));

    const res = await fetch('/api/streams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formState.title,
        description: formState.description,
        platform: formState.platform,
        userId: session.user.id,
      }),
    });

    setFormState(prev => ({ ...prev, submitting: false }));

    if (res.ok) {
      fetchStreams(); // Refetch streams to show the new one
      setFormState({
        title: '',
        description: '',
        platform: 'twitch',
        submitting: false,
      });
    }
  };

  const handleDelete = async (streamId: string) => {
    if (!window.confirm('Are you sure you want to delete this stream? This action cannot be undone.')) {
      return;
    }
    setDeleting(streamId);
    const res = await fetch(`/api/streams/${streamId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      fetchStreams(); // Refetch to update the list
    } else {
      // Handle error, maybe show a toast notification
      alert('Failed to delete stream.');
    }
    setDeleting(null);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">My Streams</h1>

      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <PlusCircle size={22} />
          Add a New Stream
        </h2>
        <div className="mb-4">
          <input
            name="title"
            type="text"
            placeholder="Stream Title"
            value={formState.title}
            onChange={handleInputChange}
            className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div className="mb-4">
          <textarea
            name="description"
            placeholder="Description (optional)"
            value={formState.description}
            onChange={handleInputChange}
            className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
          ></textarea>
        </div>
        <div className="mb-4">
          <select
            name="platform"
            value={formState.platform}
            onChange={handleInputChange}
            className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="twitch">Twitch</option>
            <option value="kick">Kick</option>
            <option value="livepeer">Livepeer</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          disabled={formState.submitting}
        >
          {formState.submitting ? 'Adding...' : 'Add Stream'}
        </button>
      </form>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Loading streams...</div>
      ) : streams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {streams.map((stream: any) => (
            <div key={stream._id} className="bg-gray-800 rounded-lg overflow-hidden flex flex-col justify-between">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-white mb-1">{stream.title}</h3>
                  {stream.status === 'live' ? (
                    <div className="flex items-center gap-2 text-red-500">
                       <span className="relative flex h-3 w-3">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                       </span>
                      Live
                    </div>
                  ) : (
                     <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-600 text-gray-300">
                      {stream.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400 capitalize mb-2">
                  {platformIcons[stream.platform as keyof typeof platformIcons]}
                  {stream.platform}
                </div>
                <p className="text-sm text-gray-300 mt-2 h-12 overflow-y-auto">{stream.description || 'No description.'}</p>
              </div>
              <div className="bg-gray-700/50 p-3 flex justify-between items-center">
                {stream.recordingIpfsHash ? (
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${stream.recordingIpfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline text-sm flex items-center gap-1"
                  >
                    <Video size={16} />
                    View Recording
                  </a>
                ) : (
                  <span className="text-gray-500 text-sm">No recording</span>
                )}
                <button
                  onClick={() => handleDelete(stream._id)}
                  disabled={deleting === stream._id}
                  className="text-red-500 hover:text-red-400 disabled:text-gray-500 disabled:cursor-not-allowed"
                  aria-label="Delete stream"
                >
                  {deleting === stream._id ? (
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" role="status" aria-label="deleting"></span>
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-16">
          <Video size={48} className="mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white">No Streams Found</h3>
          <p>Add a new stream using the form above to get started.</p>
        </div>
      )}
    </div>
  );
}
