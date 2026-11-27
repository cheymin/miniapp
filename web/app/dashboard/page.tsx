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
      version="3.0.0"
      fileName="cheymin-pen-3.0.0.amr"
      fileSize="1.5 MB"
      sha256="acee63fa02af2e653b0ff9415cb1440aa47dde9dc94bc17eb3be1e96d91a8a9f"
    />
  );
}
