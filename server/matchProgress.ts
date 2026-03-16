/**
 * matchProgress.ts
 * 
 * Global EventEmitter for Match All Sponsors live progress.
 * The matching algorithm emits events here; the SSE endpoint streams them to the client.
 */
import { EventEmitter } from 'events';

export interface MatchProgressEvent {
  type: 'start' | 'sponsor_complete' | 'sponsor_error' | 'done' | 'scoring_start' | 'scoring_complete';
  sponsorId?: number;
  sponsorName?: string;
  meetingCount?: number;
  totalSponsors?: number;
  completedSponsors?: number;
  error?: string;
  phase?: 'scoring' | 'saving';
}

class MatchProgressEmitter extends EventEmitter {
  private _sessionId: string | null = null;
  private _isRunning = false;

  get isRunning() { return this._isRunning; }
  get sessionId() { return this._sessionId; }

  startSession(sessionId: string) {
    this._sessionId = sessionId;
    this._isRunning = true;
  }

  endSession() {
    this._isRunning = false;
    this._sessionId = null;
  }

  emitProgress(event: MatchProgressEvent) {
    this.emit('progress', event);
  }
}

// Singleton — shared across the whole server process
export const matchProgress = new MatchProgressEmitter();
matchProgress.setMaxListeners(50); // Allow many SSE clients
