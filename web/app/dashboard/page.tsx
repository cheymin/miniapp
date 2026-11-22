import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { toAccountView } from '@/lib/account';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardClient
      account={toAccountView(user)}
      version="2.4.4"
      fileName="cheymin-pen-2.4.4.amr"
      fileSize="1.5 MB"
      sha256="b489f4ddcff392f5243bcf07755362849b6acc4076ea544ba22a830d024ed2c7"
    />
  );
}
