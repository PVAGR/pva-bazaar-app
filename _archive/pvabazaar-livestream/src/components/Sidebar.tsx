import { ReactNode } from 'react';
import Link from 'next/link';

export default function Sidebar({ user }: { user: { name?: string | null } }) {
  return (
    <aside className="w-64 bg-gray-800 text-white p-4">
      <h2 className="text-xl font-bold mb-4">{user?.name}'s Dashboard</h2>
      <nav>
        <ul>
          <li>
            <Link href="/dashboard" className="block py-2 px-4 rounded hover:bg-gray-700">
              Home
            </Link>
          </li>
          <li>
            <Link href="/dashboard/journal" className="block py-2 px-4 rounded hover:bg-gray-700">
              Journal
            </Link>
          </li>
          <li>
            <Link href="/dashboard/streams" className="block py-2 px-4 rounded hover:bg-gray-700">
              Streams
            </Link>
          </li>
          <li>
            <Link href="/dashboard/profile" className="block py-2 px-4 rounded hover:bg-gray-700">
              Profile
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}