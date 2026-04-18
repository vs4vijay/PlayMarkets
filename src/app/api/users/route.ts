// Users API
//
// POST /api/users  — create a new user (or return existing).
//                    New users receive STARTING_BALANCE points.
// GET  /api/users?userId=X — get user by id

import type { NextRequest } from 'next/server';
import { getUserStore } from '@/lib/storage';
import { STARTING_BALANCE } from '@/types';
import type { User } from '@/types';

export const dynamic = 'force-dynamic';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return Response.json({ error: 'userId is required' }, { status: 400, ...NO_STORE });
  }

  try {
    const userStore = getUserStore();
    const user = await userStore.getUser(userId);
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404, ...NO_STORE });
    }
    return Response.json({ user: serializeUser(user) }, NO_STORE);
  } catch (err) {
    console.error('[/api/users GET]', err);
    return Response.json({ error: 'Failed to fetch user' }, { status: 500, ...NO_STORE });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

interface UserBody {
  id: string;
  name: string;
}

export async function POST(request: NextRequest) {
  let body: UserBody;
  try {
    body = await request.json() as UserBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, ...NO_STORE });
  }

  const { id, name } = body;
  if (!id || !name) {
    return Response.json({ error: 'id and name are required' }, { status: 400, ...NO_STORE });
  }

  try {
    const userStore = getUserStore();

    // Return existing user if already registered (idempotent).
    const existing = await userStore.getUser(id);
    if (existing) {
      return Response.json({ user: serializeUser(existing), created: false }, NO_STORE);
    }

    // Create new user with starting balance.
    const newUser: User = {
      id,
      name,
      balance: STARTING_BALANCE,
      createdAt: new Date(),
    };
    await userStore.createUser(newUser);

    return Response.json(
      { user: serializeUser(newUser), created: true },
      { status: 201, ...NO_STORE },
    );
  } catch (err) {
    console.error('[/api/users POST]', err);
    return Response.json({ error: 'Failed to create user' }, { status: 500, ...NO_STORE });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function serializeUser(u: User) {
  return { ...u, createdAt: u.createdAt.toISOString() };
}
