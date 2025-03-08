/**
 * Service for Server-Sent Events (SSE) connections
 */

type SSECallback<T> = (data: T) => void;
type SSEErrorCallback = (error: Error) => void;

interface SSEOptions {
  onOpen?: () => void;
  onError?: SSEErrorCallback;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export class SSEConnection<T = any> {
  private eventSource: EventSource | null = null;
  private url: string;
  private callback: SSECallback<T>;
  private options: SSEOptions;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isClosedByUser = false;

  constructor(url: string, callback: SSECallback<T>, options: SSEOptions = {}) {
    this.url = url;
    this.callback = callback;
    this.options = {
      reconnectDelay: 3000,
      maxReconnectAttempts: 5,
      ...options,
    };
  }

  /**
   * Connect to the SSE endpoint
   */
  connect(): void {
    if (this.eventSource) {
      return;
    }

    this.isClosedByUser = false;
    this.eventSource = new EventSource(this.url);

    this.eventSource.onopen = () => {
      console.log(`SSE connection opened: ${this.url}`);
      this.reconnectAttempts = 0;
      this.options.onOpen?.();
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as T;
        this.callback(data);
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error(`SSE connection error: ${this.url}`, error);
      this.options.onError?.(new Error("SSE connection error"));
      this.close();

      // Attempt to reconnect if not closed by user
      if (
        !this.isClosedByUser &&
        this.reconnectAttempts < (this.options.maxReconnectAttempts || 5)
      ) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectAttempts++;
          console.log(
            `Reconnecting SSE (attempt ${this.reconnectAttempts})...`
          );
          this.connect();
        }, this.options.reconnectDelay);
      }
    };
  }

  /**
   * Close the SSE connection
   */
  close(): void {
    this.isClosedByUser = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Check if the connection is active
   */
  isConnected(): boolean {
    return (
      this.eventSource !== null &&
      this.eventSource.readyState === EventSource.OPEN
    );
  }
}
