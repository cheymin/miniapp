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
      sha256="114fa4f58a76be7c20ac61b3145b297981a1f3e22be36acadac96f670733f424"
    />
  );
}
