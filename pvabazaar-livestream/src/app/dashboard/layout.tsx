import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="flex h-screen bg-charcoal-700">
      <Sidebar user={session.user} />
      <main className="flex-1 overflow-y-auto bg-charcoal-800 p-8">{children}</main>
    </div>
  );
}
