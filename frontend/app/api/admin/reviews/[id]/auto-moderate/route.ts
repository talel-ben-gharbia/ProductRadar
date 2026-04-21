import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/lib/admin-session';
import { BACKEND_URL } from '@/utils/admin/constants';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? 'dev-admin-api-key-change-me';

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  if (!['ROLE_SUPER_ADMIN', 'ROLE_SUB_ADMIN'].includes(session.role)) {
    return null;
  }

  return session;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const backendUrl = `${BACKEND_URL}/admin/api/reviews/${id}/auto-moderate`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'X-Admin-Api-Key': ADMIN_API_KEY,
        'X-Admin-Role': session.role || 'ADMIN',
        'X-Admin-Id': String(session.id),
      },
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Unable to connect to the backend.' }, { status: 502 });
  }
}
