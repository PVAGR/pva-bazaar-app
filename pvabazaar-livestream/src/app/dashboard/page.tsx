'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Video } from 'lucide-react';

export default function Dashboard() {
  const { data: session } = useSession();
  const [journals, setJournals] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      setLoading(true);
      Promise.all([
        fetch('/api/journals').then((res) => res.json()),
        fetch('/api/streams').then((res) => res.json()),
      ])
        .then(([journalData, streamData]) => {
          setJournals(journalData);
          setStreams(streamData);
        })
        .finally(() => setLoading(false));
    }
  }, [session]);

  const latestJournal = journals.length > 0 ? journals[0] : null;
  const liveStream = streams.find((s: any) => s.status === 'live');

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>

      {loading ? (
        <div className="text-center text-gray-400">Loading dashboard...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Journal Entries</p>
              <p className="text-2xl font-bold text-white">{journals.length}</p>
            </div>
            <FileText className="text-indigo-400" size={32} />
          </div>
          <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Streams</p>
              <p className="text-2xl font-bold text-white">{streams.length}</p>
            </div>
            <Video className="text-pink-400" size={32} />
          </div>

          {/* Live Stream Status */}
          <div className="bg-gray-800 p-4 rounded-lg col-span-1 md:col-span-2 lg:col-span-1">
            <h3 className="font-semibold text-white mb-2">Live Stream</h3>
            {liveStream ? (
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <p className="text-white">{(liveStream as any).title}</p>
              </div>
            ) : (
              <p className="text-gray-400">Not currently live.</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 p-4 rounded-lg col-span-1 md:col-span-2">
            <h3 className="font-semibold text-white mb-3">Quick Actions</h3>
            <div className="flex gap-4">
              <Link
                href="/dashboard/journal"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
              >
                <FileText size={18} /> New Journal Entry
              </Link>
              <Link
                href="/dashboard/streams"
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
              >
                <Video size={18} /> New Stream
              </Link>
            </div>
          </div>

          {/* Latest Journal Entry */}
          {latestJournal && (
            <div className="bg-gray-800 p-4 rounded-lg md:col-span-2 lg:col-span-3">
              <h3 className="font-semibold text-white mb-2">Most Recent Journal Entry</h3>
              <div className="border-l-4 border-indigo-500 pl-4">
                <h4 className="text-lg font-bold text-white">{(latestJournal as any).title}</h4>
                <p className="text-gray-400 truncate">{(latestJournal as any).content}</p>
                <Link
                  href="/dashboard/journal"
                  className="text-blue-400 hover:underline text-sm mt-2 inline-block"
                >
                  View all entries...
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
      <a href="https://pvabazaar.org" className="text-blue-400 hover:underline mt-8 inline-block">
        Link to Main Site
      </a>
    </div>
  );
}
