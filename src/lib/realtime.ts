import { RealtimeEvent } from '@/types/simora';

type Subscriber = (event: RealtimeEvent) => void;

class RealtimeHub {
  private subscribers = new Set<Subscriber>();

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  publish(event: RealtimeEvent): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(event);
      } catch {
        // Ignorar suscriptores desconectados
      }
    }
  }

  getClientCount(): number {
    return this.subscribers.size;
  }
}

const globalForRealtime = globalThis as unknown as {
  __simoraRealtimeHub?: RealtimeHub;
};

export const realtimeHub =
  globalForRealtime.__simoraRealtimeHub ?? new RealtimeHub();

if (process.env.NODE_ENV !== 'production') {
  globalForRealtime.__simoraRealtimeHub = realtimeHub;
}
