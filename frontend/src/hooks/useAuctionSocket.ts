import { useEffect, useRef, useState, useCallback } from 'react';

interface ExtensionEvent {
  previous_close_at: string;
  new_close_at: string;
  extended_minutes: number;
  reason: string;
  was_clamped_to_forced_close: boolean;
}

interface SocketMessage {
  type: string;
  rfq_id?: string;
  bid?: any;
  leaderboard?: any[];
  current_close_at?: string;
  forced_close_at?: string;
  extension?: ExtensionEvent;
}

export function useAuctionSocket(rfqId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState<SocketMessage | null>(null);
  const [extensionNotice, setExtensionNotice] = useState<ExtensionEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!rfqId) return;

    const token = localStorage.getItem('token') || '';
    const envWsUrl = (import.meta as any).env?.VITE_WS_URL;
    let baseWs: string;
    if (envWsUrl) {
      baseWs = envWsUrl.replace(/\/$/, '');
    } else {
      const envApiUrl = (import.meta as any).env?.VITE_API_URL;
      if (envApiUrl) {
        baseWs = envApiUrl.replace(/^http/, 'ws').replace(/\/$/, '');
      } else {
        const apiPort = (import.meta as any).env?.VITE_API_PORT || '8001';
        baseWs = `ws://localhost:${apiPort}`;
      }
    }
    const wsUrl = `${baseWs}/ws/auctions/${rfqId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: SocketMessage = JSON.parse(event.data);
        setLatestEvent(data);

        if (data.extension && data.extension.extended_minutes > 0) {
          setExtensionNotice(data.extension);
          // Auto-clear notification after 8 seconds
          setTimeout(() => {
            setExtensionNotice(null);
          }, 8000);
        }
      } catch (err) {
        console.error('[WebSocket message parse error]', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.warn('[WebSocket error]', err);
      setIsConnected(false);
    };

    // Heartbeat ping every 25s
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [rfqId]);

  const dismissNotice = useCallback(() => {
    setExtensionNotice(null);
  }, []);

  return { isConnected, latestEvent, extensionNotice, dismissNotice };
}

