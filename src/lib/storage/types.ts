// Storage abstraction — every backend implements PredictionStore.
// Keep this interface narrow: only what the API routes and scoring engine need.

import type { Prediction } from '@/types';

export interface PredictionStore {
  /** Persist a new prediction. Throws if id already exists. */
  savePrediction(p: Prediction): Promise<void>;

  /** Find the prediction a user made for a specific match, or null. */
  getPrediction(userId: string, matchId: string): Promise<Prediction | null>;

  /** All predictions by a user, newest first. */
  getPredictionsByUser(userId: string): Promise<Prediction[]>;

  /** All predictions for a match (useful for match scorecard). */
  getPredictionsByMatch(matchId: string): Promise<Prediction[]>;

  /** Every stored prediction — used by the leaderboard scorer. */
  getAllPredictions(): Promise<Prediction[]>;

  /** Partial update by id (e.g. set points + scored flag). No-op if id not found. */
  updatePrediction(id: string, patch: Partial<Omit<Prediction, 'id'>>): Promise<void>;
}
