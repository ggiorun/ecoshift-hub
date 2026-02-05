import { Trip, User } from "./types";
import { db } from "./db";

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

/**
 * Fetches smart match reasoning from the backend to protect API keys.
 */
export async function getSmartMatchReasoning(user: User, trip: Trip): Promise<string> {
  // Check local cache first to avoid unnecessary requests
  const cached = db.getAICache(user.id, trip.id);
  if (cached) return cached;

  try {
    const response = await fetch(`${API_URL}/ai/match-reason`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, trip })
    });

    if (!response.ok) throw new Error('AI request failed');

    const data = await response.json();
    const reason = data.reason;
    
    // Save to cache for this session
    db.saveAICache(user.id, trip.id, reason);
    return reason;
  } catch (error: any) {
    console.warn("AI Backend Error:", error.message);
    
    // Final local fallback in case backend is down
    return `Ottima scelta per la Missione 3: riduci le emissioni di CO2 e accumuli crediti per la tua mobilità sostenibile universitaria.`;
  }
}