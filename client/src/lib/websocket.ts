import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  connect() {
    const token = useAuthStore.getState().token;
    if (!token) {
      console.log('No token available, skipping WebSocket connection');
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL ||
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

    try {
      this.ws = new WebSocket(`${wsUrl}?token=${token}`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.stopHeartbeat();
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  private handleMessage(message: any) {
    const { type, data } = message;

    switch (type) {
      case 'NOTIFICATION':
        useNotificationStore.getState().addNotification({
          type: data.type || 'info',
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
          metadata: data.metadata,
        });
        break;

      case 'SERVICE_UPDATE':
        // Handle service status updates
        console.log('Service update:', data);
        break;

      case 'TASK_UPDATE':
        // Handle task updates
        console.log('Task update:', data);
        break;

      case 'PAYMENT_UPDATE':
        // Handle payment updates
        console.log('Payment update:', data);
        break;

      case 'PONG':
        // Heartbeat response
        break;

      default:
        console.log('Unknown message type:', type);
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send('PING', {});
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }
}

export const wsClient = new WebSocketClient();

// Hook for WebSocket
export const useWebSocket = () => {
  const connect = () => wsClient.connect();
  const disconnect = () => wsClient.disconnect();
  const send = (type: string, data: any) => wsClient.send(type, data);

  return { connect, disconnect, send };
};
