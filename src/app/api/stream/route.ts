import { NextRequest, connection } from 'next/server';
import { realtimeHub } from '@/lib/realtime';
import { getPersistenceEngine } from '@/lib/storage';
import { RealtimeEvent } from '@/types/simora';

export async function GET(request: NextRequest) {
  await connection();
  const engine = await getPersistenceEngine();
  const encoder = new TextEncoder();

  let cleanupFn: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendEvent = (event: RealtimeEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Stream cerrado por el cliente
        }
      };

      const unsubscribe = realtimeHub.subscribe(sendEvent);

      sendEvent({
        type: 'connected',
        engine,
        clients: realtimeHub.getClientCount(),
        timestamp: new Date().toISOString(),
      });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      cleanupFn = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };

      request.signal.addEventListener('abort', () => {
        if (cleanupFn) {
          cleanupFn();
          cleanupFn = null;
        }
        try {
          controller.close();
        } catch {
          // Ya cerrado
        }
      });
    },
    cancel() {
      if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
