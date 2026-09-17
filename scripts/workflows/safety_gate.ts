/**
 * Safety gate verification workflow before applying code modifications.
 * @module workflows/safety_gate
 */

import { request } from '../client/http';
import { loadSessions, saveSessions } from '../core/storage';
import { SafetyGateCheckResult } from '../core/types';

export { SafetyGateCheckResult };

/**
 * Validates the safety constraints before executing branch manipulations.
 * Prevents disruptive local branch switching operations if any registered cloud
 * sessions are still actively modifying or generating code.
 *
 * @param headers - HTTP headers containing the Google API authorization key.
 * @param targetDir - Optional root project directory to resolve local session storage.
 * @returns True if it's safe to proceed (no active sessions), false otherwise.
 */
export async function checkSafetyGate(
  headers: Record<string, string>,
  targetDir: string = process.cwd()
): Promise<boolean> {
  const sessions = loadSessions(targetDir);
  const activeSessions = sessions.filter(
    s => s.status !== 'completed' && s.status !== 'merged' && s.status !== 'error'
  );

  if (activeSessions.length === 0) return true;

  console.log(`Checking safety gate: ${activeSessions.length} active sessions found locally.`);
  let hasRunning = false;

  await Promise.all(
    activeSessions.map(async (s) => {
      try {
        const sessionData = await request(`https://jules.googleapis.com/v1alpha/sessions/${s.id}`, { headers });
        const state = sessionData.state || 'UNKNOWN';

        if (state !== 'COMPLETED' && state !== 'ERROR' && state !== 'CANCELLED') {
          console.log(`- Session ${s.id} (${s.agent}) is still ${state}`);
          hasRunning = true;
        } else if (state === 'COMPLETED' && s.status !== 'completed' && s.status !== 'inspected') {
          s.status = 'completed';
        }
      } catch (_e) {
        console.warn(`- Failed to fetch status for ${s.id}, assuming active for safety.`);
        hasRunning = true;
      }
    })
  );

  saveSessions(sessions, targetDir);
  return !hasRunning;
}
