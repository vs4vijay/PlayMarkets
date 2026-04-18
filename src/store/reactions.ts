// Reaction and comment state - in-memory for MVP
// Production would use a database

import type { Reaction, Comment, ReactionType } from '@/types';

// In-memory storage (reset on server restart)
const reactions: Map<string, Reaction[]> = new Map();
const comments: Map<string, Comment[]> = new Map();
const userReactions: Map<string, Set<string>> = new Map();

export function getReactions(matchId: string, eventId?: string): Reaction[] {
  const key = eventId ? `${matchId}:${eventId}` : matchId;
  return reactions.get(key) || [];
}

export function addReaction(
  matchId: string,
  eventId: string | undefined,
  type: ReactionType,
  userId: string,
  userName: string
): Reaction {
  const key = eventId ? `${matchId}:${eventId}` : matchId;
  const matchReactions = reactions.get(key) || [];
  
  const existingIndex = matchReactions.findIndex(
    r => r.userId === userId && r.type === type
  );
  
  if (existingIndex >= 0) {
    // Remove existing reaction of same type from user
    matchReactions.splice(existingIndex, 1);
  } else {
    // Add new reaction
    const reaction: Reaction = {
      id: `r-${Date.now()}`,
      type,
      matchId,
      eventId,
      userId,
      userName,
      createdAt: new Date(),
    };
    matchReactions.push(reaction);
    
    // Track user's reaction for this match
    const userKey = `${key}:${userId}`;
    userReactions.set(userKey, new Set([...Array.from(userReactions.get(userKey) || []), type]));
  }
  
  reactions.set(key, matchReactions);
  return { id: '', type, matchId, eventId, userId, userName, createdAt: new Date() };
}

export function getComments(matchId: string, eventId?: string): Comment[] {
  const key = eventId ? `${matchId}:${eventId}` : matchId;
  return comments.get(key) || [];
}

export function addComment(
  matchId: string,
  eventId: string | undefined,
  content: string,
  userId: string,
  userName: string
): Comment {
  const key = eventId ? `${matchId}:${eventId}` : matchId;
  const matchComments = comments.get(key) || [];
  
  const comment: Comment = {
    id: `c-${Date.now()}`,
    matchId,
    eventId,
    userId,
    userName,
    content,
    createdAt: new Date(),
    reactions: [],
    replies: [],
  };
  
  matchComments.unshift(comment);
  comments.set(key, matchComments);
  return comment;
}

export function getUserReactionTypes(
  matchId: string,
  eventId: string | undefined,
  userId: string
): ReactionType[] {
  const key = eventId ? `${matchId}:${eventId}` : matchId;
  const userKey = `${key}:${userId}`;
  return Array.from(userReactions.get(userKey) || []) as ReactionType[];
}