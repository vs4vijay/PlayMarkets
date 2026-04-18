// Predictions API
//
// GET  /api/predictions?userId=X          — all predictions for a user
// GET  /api/predictions?matchId=X         — all predictions for a match (scorecard)
// POST /api/predictions                   — create or update a prediction

import type { NextRequest } from 'next/server';
import { getStore } from '@/lib/storage';
import { getProvider } from '@/lib/providers';
import type { Prediction } from '@/types';

export const dynamic = 'force-dynamic';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

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
    // Predictions can only be made / updated for UPCOMING matches.
    const provider = getProvider();
    const match = await provider.getMatchById(matchId);
    if (!match) {
      return Response.json({ error: 'Match not found' }, { status: 404, ...NO_STORE });
    }
    if (match.status !== 'UPCOMING') {
      return Response.json(
        { error: 'Predictions can only be made for upcoming matches' },
        { status: 422, ...NO_STORE },
      );
    }

    const store = getStore();
    const existing = await store.getPrediction(userId, matchId);

    let prediction: Prediction;
    let status: number;

    if (existing) {
      // Update — overwrite fields that may have changed, keep id + createdAt.
      await store.updatePrediction(existing.id, {
        userName,
        predictedWinner,
        predictedHomeRuns,
        predictedAwayRuns,
        isPublic,
        // Reset scoring if the prediction changes (shouldn't matter for UPCOMING but be safe).
        points: undefined,
        scored: false,
      });
      prediction = { ...existing, userName, predictedWinner, predictedHomeRuns, predictedAwayRuns, isPublic };
      status = 200;
    } else {
      // Create.
      prediction = {
        id: `pred-${matchId}-${userId}-${Date.now()}`,
        matchId,
        userId,
        userName,
        predictedWinner,
        predictedHomeRuns,
        predictedAwayRuns,
        isPublic,
        createdAt: new Date(),
        scored: false,
      };
      await store.savePrediction(prediction);
      status = 201;
    }

    return Response.json({ prediction: serializePrediction(prediction) }, { status, ...NO_STORE });
  } catch (err) {
    console.error('[/api/predictions POST]', err);
    return Response.json({ error: 'Failed to save prediction' }, { status: 500, ...NO_STORE });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function serializePrediction(p: Prediction) {
  return { ...p, createdAt: p.createdAt.toISOString() };
}
