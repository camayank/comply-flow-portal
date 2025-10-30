import { create } from 'zustand';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const useSocketStore = create((set, get) => ({
  // State
  socket: null,
  isConnected: false,
  notifications: [],
  subscribedRooms: new Set(),

  // Actions
  initializeSocket: () => {
    const { socket } = get();
    
    // Don't create multiple connections
    if (socket && socket.connected) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No auth token found for socket connection');
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      set({ socket: newSocket, isConnected: true });
      toast.success('Connected to real-time updates');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      set({ isConnected: false });
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        toast.error('Connection lost. Attempting to reconnect...');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('Failed to connect to real-time updates');
    });

    newSocket.on('reconnect', () => {
      console.log('Socket reconnected');
      toast.success('Reconnected to real-time updates');
    });

    // Real-time event handlers
    newSocket.on('service_request_updated', (data) => {
      console.log('Service request updated:', data);
      toast.success(`Service request ${data.requestNumber} updated`);
      
      // Add to notifications
      set((state) => ({
        notifications: [
          {
            id: Date.now(),
            type: 'service_request_update',
            title: 'Service Request Updated',
            message: `Request ${data.requestNumber} status changed to ${data.status}`,
            data,
            timestamp: new Date(),
            read: false,
          },
          ...state.notifications,
        ],
      }));
    });

    newSocket.on('file_uploaded', (data) => {
      console.log('File uploaded:', data);
      toast.success(`File "${data.originalName}" uploaded successfully`);
      
      set((state) => ({
        notifications: [
          {
            id: Date.now(),
            type: 'file_upload',
            title: 'File Uploaded',
            message: `${data.originalName} has been uploaded`,
            data,
            timestamp: new Date(),
            read: false,
          },
          ...state.notifications,
        ],
      }));
    });

    newSocket.on('assignment_notification', (data) => {
      console.log('Assignment notification:', data);
      toast.info(`You've been assigned to: ${data.title}`);
      
      set((state) => ({
        notifications: [
          {
            id: Date.now(),
            type: 'assignment',
            title: 'New Assignment',
            message: data.message,
            data,
            timestamp: new Date(),
            read: false,
          },
          ...state.notifications,
        ],
      }));
    });

    newSocket.on('system_notification', (data) => {
      console.log('System notification:', data);
      
      // Show toast based on notification type
      switch (data.type) {
        case 'info':
          toast(data.message);
          break;
        case 'success':
          toast.success(data.message);
          break;
        case 'warning':
          toast(data.message, { icon: '⚠️' });
          break;
        case 'error':
          toast.error(data.message);
          break;
        default:
          toast(data.message);
      }
      
      set((state) => ({
        notifications: [
          {
            id: Date.now(),
            type: 'system',
            title: data.title || 'System Notification',
            message: data.message,
            data,
            timestamp: new Date(),
            read: false,
          },
          ...state.notifications,
        ],
      }));
    });

    set({ socket: newSocket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({
        socket: null,
        isConnected: false,
        subscribedRooms: new Set(),
      });
    }
  },

  subscribeToServiceRequest: (requestId) => {
    const { socket, subscribedRooms } = get();
    if (socket && socket.connected) {
      const roomName = `service_request:${requestId}`;
      
      if (!subscribedRooms.has(roomName)) {
        socket.emit('subscribe:service_request', requestId);
        set((state) => ({
          subscribedRooms: new Set([...state.subscribedRooms, roomName]),
        }));
        console.log('Subscribed to service request updates:', requestId);
      }
    }
  },

  unsubscribeFromServiceRequest: (requestId) => {
    const { socket, subscribedRooms } = get();
    if (socket) {
      const roomName = `service_request:${requestId}`;
      
      if (subscribedRooms.has(roomName)) {
        socket.emit('unsubscribe:service_request', requestId);
        set((state) => {
          const newRooms = new Set(state.subscribedRooms);
          newRooms.delete(roomName);
          return { subscribedRooms: newRooms };
        });
        console.log('Unsubscribed from service request updates:', requestId);
      }
    }
  },

  markNotificationAsRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      ),
    }));
  },

  markAllNotificationsAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },

  clearNotification: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== notificationId
      ),
    }));
  },

  // Getters
  getUnreadCount: () => {
    const { notifications } = get();
    return notifications.filter((notification) => !notification.read).length;
  },

  getRecentNotifications: (limit = 10) => {
    const { notifications } = get();
    return notifications
      .slice(0, limit)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },
}));