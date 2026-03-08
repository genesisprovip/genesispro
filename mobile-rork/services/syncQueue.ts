/**
 * Offline Sync Queue
 *
 * Queues write operations (POST/PUT/DELETE) when offline.
 * Processes queue when connectivity returns.
 * Stored in AsyncStorage for persistence across app restarts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

const QUEUE_KEY = 'offline_sync_queue';
const MAX_RETRIES = 3;

export interface QueuedOperation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body?: any;
  createdAt: string;
  retries: number;
  description: string; // e.g. "Crear ave", "Actualizar combate"
}

type SyncListener = (queue: QueuedOperation[]) => void;

class SyncQueueService {
  private queue: QueuedOperation[] = [];
  private processing = false;
  private listeners: Set<SyncListener> = new Set();
  private initialized = false;

  async init() {
    if (this.initialized) return;
    try {
      const saved = await AsyncStorage.getItem(QUEUE_KEY);
      if (saved) {
        this.queue = JSON.parse(saved);
        console.log(`[SyncQueue] Loaded ${this.queue.length} pending operations`);
      }
    } catch (e) {
      console.error('[SyncQueue] Error loading queue:', e);
    }
    this.initialized = true;

    // Try to process on app foreground
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && this.queue.length > 0) {
        this.processQueue();
      }
    });
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn([...this.queue]));
  }

  private async save() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.error('[SyncQueue] Error saving queue:', e);
    }
    this.notify();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  async enqueue(op: Omit<QueuedOperation, 'id' | 'createdAt' | 'retries'>): Promise<string> {
    const item: QueuedOperation = {
      ...op,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      retries: 0,
    };
    this.queue.push(item);
    await this.save();
    console.log(`[SyncQueue] Enqueued: ${item.description} (${item.method} ${item.endpoint})`);
    return item.id;
  }

  async remove(id: string) {
    this.queue = this.queue.filter(op => op.id !== id);
    await this.save();
  }

  async clear() {
    this.queue = [];
    await this.save();
  }

  getQueue(): QueuedOperation[] {
    return [...this.queue];
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.processing || this.queue.length === 0) return { processed: 0, failed: 0 };

    // Check connectivity first
    const online = await this.isOnline();
    if (!online) {
      console.log('[SyncQueue] Still offline, skipping');
      return { processed: 0, failed: 0 };
    }

    this.processing = true;
    let processed = 0;
    let failed = 0;

    console.log(`[SyncQueue] Processing ${this.queue.length} operations...`);

    // Process in order (FIFO)
    const toProcess = [...this.queue];
    for (const op of toProcess) {
      try {
        const token = await AsyncStorage.getItem('access_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`https://api.genesispro.vip/api/v1${op.endpoint}`, {
          method: op.method,
          headers,
          body: op.body ? JSON.stringify(op.body) : undefined,
        });

        if (response.ok) {
          // Success — remove from queue
          this.queue = this.queue.filter(q => q.id !== op.id);
          processed++;
          console.log(`[SyncQueue] OK: ${op.description}`);
        } else if (response.status >= 400 && response.status < 500) {
          // Client error (validation, not found, etc.) — remove, won't succeed on retry
          this.queue = this.queue.filter(q => q.id !== op.id);
          failed++;
          const data = await response.json().catch(() => ({}));
          console.warn(`[SyncQueue] Dropped (${response.status}): ${op.description} - ${data.error?.message || ''}`);
        } else {
          // Server error — retry later
          op.retries++;
          if (op.retries >= MAX_RETRIES) {
            this.queue = this.queue.filter(q => q.id !== op.id);
            failed++;
            console.warn(`[SyncQueue] Max retries reached, dropped: ${op.description}`);
          }
        }
      } catch (e) {
        // Network error — stop processing, still offline
        console.log(`[SyncQueue] Network error, stopping: ${(e as Error).message}`);
        break;
      }
    }

    await this.save();
    this.processing = false;
    console.log(`[SyncQueue] Done: ${processed} processed, ${failed} failed, ${this.queue.length} remaining`);
    return { processed, failed };
  }

  private async isOnline(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('https://api.genesispro.vip/health', { signal: controller.signal });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const syncQueue = new SyncQueueService();
export default syncQueue;
