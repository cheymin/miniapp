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
      sha256="35841cc2781821bb1d2b7ca935e3454d20057289bd0ec8d4fb1183a4735139c2"
    />
  );
}
