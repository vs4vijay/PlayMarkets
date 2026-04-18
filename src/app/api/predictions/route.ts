// Predictions API
//
// GET  /api/predictions?userId=X          — all predictions for a user
// GET  /api/predictions?matchId=X         — all predictions for a match (scorecard)
// POST /api/predictions                   — create or update a prediction
//
// Stake behaviour:
//   NEW prediction  → deduct PREDICTION_STAKE from user balance immediately.
//   UPDATE          → no additional deduction (stake already paid).
//   Scoring (async) → stake is returned plus net points at result time.

import type { NextRequest } from 'next/server';
import { getStore, getUserStore } from '@/lib/storage';
import { getProvider } from '@/lib/providers';
import { PREDICTION_STAKE, STARTING_BALANCE } from '@/types';
import type { Prediction, User } from '@/types';

export const dynamic = 'force-dynamic';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

const LOCKED_STATUSES = ['COMPLETED', 'ABANDONED', 'CANCELLED'];

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId  = searchParams.get('userId');
  const matchId = searchParams.get('matchId');

  try {
    const store = getStore();
    let predictions: Prediction[];

    if (userId) {
      predictions = await store.getPredictionsByUser(userId);
    } else if (matchId) {
      predictions = await store.getPredictionsByMatch(matchId);
    } else {
      return Response.json({ error: 'userId or matchId is required' }, { status: 400, ...NO_STORE });
    }

    return Response.json(
      { predictions: predictions.map(serializePrediction) },
      NO_STORE,
    );
  } catch (err) {
    console.error('[/api/predictions GET]', err);
    return Response.json({ error: 'Failed to fetch predictions' }, { status: 500, ...NO_STORE });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

interface PredictionBody {
  userId: string;
  userName: string;
  matchId: string;
  predictedWinner: string;
  predictedHomeRuns?: number;
  predictedAwayRuns?: number;
  isPublic?: boolean;
}

export async function POST(request: NextRequest) {
  let body: PredictionBody;
  try {
    body = await request.json() as PredictionBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, ...NO_STORE });
  }

  const { userId, userName, matchId, predictedWinner, predictedHomeRuns, predictedAwayRuns, isPublic = true } = body;

  if (!userId || !matchId || !predictedWinner) {
    return Response.json(
      { error: 'userId, matchId, and predictedWinner are required' },
      { status: 400, ...NO_STORE },
    );
  }

  try {
    // Predictions are locked once a match is COMPLETED, ABANDONED, or CANCELLED.
    const provider = getProvider();
    const match = await provider.getMatchById(matchId);
    if (!match) {
      return Response.json({ error: 'Match not found' }, { status: 404, ...NO_STORE });
    }
    if (LOCKED_STATUSES.includes(match.status)) {
      return Response.json(
        { error: 'Predictions are locked for this match' },
        { status: 422, ...NO_STORE },
      );
    }

    const store     = getStore();
    const userStore = getUserStore();
    const existing  = await store.getPrediction(userId, matchId);

    let prediction: Prediction;
    let status: number;
    let newBalance: number | null = null;

    if (existing) {
      // Update — no additional stake deduction.
      await store.updatePrediction(existing.id, {
        userName,
        predictedWinner,
        predictedHomeRuns,
        predictedAwayRuns,
        isPublic,
        points:  undefined,
        scored:  false,
      });
      prediction = { ...existing, userName, predictedWinner, predictedHomeRuns, predictedAwayRuns, isPublic };
      status = 200;
    } else {
      // New prediction — deduct stake from user balance.
      const user = await userStore.getUser(userId);

      if (!user) {
        // User hasn't registered via /api/users yet — create them on the fly.
        const newUser: User = {
          id:        userId,
          name:      userName,
          balance:   STARTING_BALANCE - PREDICTION_STAKE,
          createdAt: new Date(),
        };
        await userStore.createUser(newUser);
        newBalance = newUser.balance;
      } else {
        newBalance = user.balance - PREDICTION_STAKE;
        await userStore.updateUser(userId, { balance: newBalance });
      }

      prediction = {
        id:                `pred-${matchId}-${userId}-${Date.now()}`,
        matchId,
        userId,
        userName,
        predictedWinner,
        predictedHomeRuns,
        predictedAwayRuns,
        isPublic,
        createdAt:         new Date(),
        stake:             PREDICTION_STAKE,
        scored:            false,
      };
      await store.savePrediction(prediction);
      status = 201;
    }

    return Response.json(
      {
        prediction: serializePrediction(prediction),
        // Return the updated balance so the client can refresh immediately.
        ...(newBalance !== null ? { balance: newBalance } : {}),
      },
      { status, ...NO_STORE },
    );
  } catch (err) {
    console.error('[/api/predictions POST]', err);
    return Response.json({ error: 'Failed to save prediction' }, { status: 500, ...NO_STORE });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function serializePrediction(p: Prediction) {
  return { ...p, createdAt: p.createdAt.toISOString() };
}
