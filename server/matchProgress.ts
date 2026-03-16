/**
 * matchProgress.ts
 * 
 * Global EventEmitter for Match All Sponsors live progress.
 * The matching algorithm emits events here; the SSE endpoint streams them to the client.
 * 
 * Late-join support: the last 'start' event is buffered so SSE clients that connect
 * after the job has already begun still receive the initial state (totalSponsors, etc.).
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
  private _lastStartEvent: MatchProgressEvent | null = null;

  get isRunning() { return this._isRunning; }
  get sessionId() { return this._sessionId; }
  /** Returns the buffered start event so late-joining SSE clients can replay it. */
  get lastStartEvent() { return this._lastStartEvent; }

  startSession(sessionId: string) {
    this._sessionId = sessionId;
    this._isRunning = true;
    this._lastStartEvent = null; // clear previous run's buffer
  }

  endSession() {
    this._isRunning = false;
    this._sessionId = null;
    this._lastStartEvent = null;
  }

  emitProgress(event: MatchProgressEvent) {
    if (event.type === 'start') {
      this._lastStartEvent = event; // buffer for late-joining clients
    }
    this.emit('progress', event);
  }
}

// Singleton — shared across the whole server process
export const matchProgress = new MatchProgressEmitter();
matchProgress.setMaxListeners(50); // Allow many SSE clients
