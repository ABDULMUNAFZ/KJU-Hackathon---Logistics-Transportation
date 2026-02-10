// Real-time Communication Module for Smart Roads
class RealtimeCommunicator {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.subscriptions = new Map();
        this.messageQueue = [];
        
        this.init();
    }

    init() {
        this.initWebSocket();
        this.initEventListeners();
        this.initServiceWorkerMessaging();
        this.startHeartbeat();
        this.startQueueProcessor();
    }

    initWebSocket() {
        // Check if WebSocket is supported
        if (!('WebSocket' in window)) {
            console.warn('WebSocket not supported, using polling instead');
            this.initPolling();
            return;
        }

        // Use wss for production, ws for development
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        try {
            this.socket = new WebSocket(wsUrl);
            this.setupWebSocketHandlers();
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.initPolling();
        }
    }

    setupWebSocketHandlers() {
        if (!this.socket) return;

        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.onConnectionStateChange(true);
            
            // Resubscribe to all topics
            this.resubscribeAll();
            
            // Send queued messages
            this.processMessageQueue();
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleIncomingMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.socket.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            this.connected = false;
            this.onConnectionStateChange(false);
            
            // Attempt to reconnect
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 10000);
                    console.log(`Reconnecting attempt ${this.reconnectAttempts}...`);
                    this.initWebSocket();
                }, this.reconnectDelay);
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    initPolling() {
        console.log('Initializing polling fallback');
        this.connected = true; // Simulate connection for polling
        
        // Start polling for updates
        this.pollingInterval = setInterval(() => {
            this.pollForUpdates();
        }, 5000); // Poll every 5 seconds
    }

    async pollForUpdates() {
        try {
            // Get last update timestamp
            const lastUpdate = localStorage.getItem('last_poll_update') || 0;
            
            // Poll server for updates
            const response = await fetch(`/api/poll?since=${lastUpdate}`);
            if (response.ok) {
                const updates = await response.json();
                
                // Process updates
                updates.forEach(update => {
                    this.handleIncomingMessage(update);
                });
                
                // Update timestamp
                if (updates.length > 0) {
                    localStorage.setItem('last_poll_update', Date.now());
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }

    initEventListeners() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('Device came online');
            this.onConnectionStateChange(true);
            
            if (!this.connected) {
                this.initWebSocket();
            }
        });

        window.addEventListener('offline', () => {
            console.log('Device went offline');
            this.onConnectionStateChange(false);
        });

        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onAppBackground();
            } else {
                this.onAppForeground();
            }
        });

        // Listen for beforeunload to clean up
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    initServiceWorkerMessaging() {
        // Set up communication with service worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event.data);
            });

            // Send initialization message
            navigator.serviceWorker.controller.postMessage({
                type: 'INIT_REALTIME',
                payload: { clientId: this.getClientId() }
            });
        }
    }

    getClientId() {
        let clientId = localStorage.getItem('smartroads_client_id');
        if (!clientId) {
            clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('smartroads_client_id', clientId);
        }
        return clientId;
    }

    onConnectionStateChange(connected) {
        // Update UI based on connection state
        const event = new CustomEvent('realtime-connection', {
            detail: { connected }
        });
        window.dispatchEvent(event);
        
        // Show/hide offline indicator
        this.updateOfflineIndicator(!connected);
        
        if (connected) {
            console.log('Real-time connection established');
        } else {
            console.log('Real-time connection lost');
        }
    }

    updateOfflineIndicator(offline) {
        let indicator = document.getElementById('offlineIndicator');
        
        if (offline) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'offlineIndicator';
                indicator.innerHTML = `
                    <div style="
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        background: var(--warning);
                        color: var(--text-dark);
                        padding: 0.5rem 1rem;
                        text-align: center;
                        font-weight: 500;
                        z-index: 9999;
                        animation: slideDown 0.3s ease;
                    ">
                        <i class="fas fa-wifi-slash"></i> You are offline. Some features may be limited.
                    </div>
                `;
                document.body.appendChild(indicator);
            }
        } else if (indicator) {
            indicator.remove();
        }
    }

    onAppBackground() {
        console.log('App moved to background');
        // Reduce update frequency when in background
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 60000); // 1 minute
        }
    }

    onAppForeground() {
        console.log('App moved to foreground');
        // Restore normal update frequency
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 30000); // 30 seconds
        }
        
        // Sync any pending updates
        this.syncPendingUpdates();
    }

    startHeartbeat() {
        // Send periodic heartbeat to keep connection alive
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000); // 30 seconds
    }

    sendHeartbeat() {
        if (this.connected && this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.send({
                type: 'heartbeat',
                timestamp: Date.now(),
                clientId: this.getClientId()
            });
        }
    }

    startQueueProcessor() {
        // Process queued messages periodically
        setInterval(() => {
            this.processMessageQueue();
        }, 1000); // Check queue every second
    }

    processMessageQueue() {
        if (!this.connected || this.messageQueue.length === 0) return;
        
        // Process messages in queue
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.sendRaw(message);
        }
    }

    sendRaw(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    send(message) {
        // Add message to queue if not connected
        if (!this.connected) {
            this.messageQueue.push(message);
            this.storeMessageOffline(message);
            return false;
        }
        
        // Try to send immediately
        const sent = this.sendRaw(message);
        
        if (!sent) {
            this.messageQueue.push(message);
            this.storeMessageOffline(message);
        }
        
        return sent;
    }

    storeMessageOffline(message) {
        // Store message in IndexedDB for offline persistence
        const pendingMessages = JSON.parse(localStorage.getItem('pending_messages') || '[]');
        pendingMessages.push({
            message: message,
            timestamp: Date.now(),
            attempts: 0
        });
        
        // Keep only last 100 messages
        if (pendingMessages.length > 100) {
            pendingMessages.splice(0, pendingMessages.length - 100);
        }
        
        localStorage.setItem('pending_messages', JSON.stringify(pendingMessages));
        
        // Notify service worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'MESSAGE_QUEUED',
                payload: { count: pendingMessages.length }
            });
        }
    }

    syncPendingUpdates() {
        // Sync any pending messages when coming back online
        const pendingMessages = JSON.parse(localStorage.getItem('pending_messages') || '[]');
        
        if (pendingMessages.length > 0 && this.connected) {
            console.log(`Syncing ${pendingMessages.length} pending messages`);
            
            // Resend pending messages
            pendingMessages.forEach((item, index) => {
                setTimeout(() => {
                    const sent = this.sendRaw(item.message);
                    
                    if (sent) {
                        // Remove from pending
                        pendingMessages.splice(index, 1);
                        localStorage.setItem('pending_messages', JSON.stringify(pendingMessages));
                    } else {
                        // Increment attempts
                        item.attempts++;
                        if (item.attempts > 3) {
                            pendingMessages.splice(index, 1); // Give up after 3 attempts
                        }
                    }
                }, index * 100); // Stagger sends
            });
        }
    }

    subscribe(topic, callback) {
        if (!this.subscriptions.has(topic)) {
            this.subscriptions.set(topic, new Set());
        }
        
        this.subscriptions.get(topic).add(callback);
        
        // Send subscription to server if connected
        if (this.connected) {
            this.send({
                type: 'subscribe',
                topic: topic,
                clientId: this.getClientId()
            });
        }
        
        return () => this.unsubscribe(topic, callback);
    }

    unsubscribe(topic, callback) {
        if (this.subscriptions.has(topic)) {
            const callbacks = this.subscriptions.get(topic);
            callbacks.delete(callback);
            
            if (callbacks.size === 0) {
                this.subscriptions.delete(topic);
                
                // Send unsubscribe to server if connected
                if (this.connected) {
                    this.send({
                        type: 'unsubscribe',
                        topic: topic,
                        clientId: this.getClientId()
                    });
                }
            }
        }
    }

    resubscribeAll() {
        // Resubscribe to all topics after reconnection
        this.subscriptions.forEach((callbacks, topic) => {
            this.send({
                type: 'subscribe',
                topic: topic,
                clientId: this.getClientId()
            });
        });
    }

    handleIncomingMessage(data) {
        // Route message to appropriate handlers
        const { type, topic, payload } = data;
        
        // Global message handlers
        switch (type) {
            case 'traffic_update':
                this.handleTrafficUpdate(payload);
                break;
            case 'emergency_alert':
                this.handleEmergencyAlert(payload);
                break;
            case 'delivery_update':
                this.handleDeliveryUpdate(payload);
                break;
            case 'group_update':
                this.handleGroupUpdate(payload);
                break;
            case 'system_notification':
                this.handleSystemNotification(payload);
                break;
            case 'pong':
                // Heartbeat response
                break;
        }
        
        // Topic-based subscriptions
        if (topic && this.subscriptions.has(topic)) {
            const callbacks = this.subscriptions.get(topic);
            callbacks.forEach(callback => {
                try {
                    callback(payload);
                } catch (error) {
                    console.error('Error in subscription callback:', error);
                }
            });
        }
        
        // Dispatch custom event for this message type
        const event = new CustomEvent(`realtime-${type}`, {
            detail: payload
        });
        window.dispatchEvent(event);
    }

    handleTrafficUpdate(data) {
        // Update traffic data
        const event = new CustomEvent('traffic-update', {
            detail: data
        });
        window.dispatchEvent(event);
        
        // Update local storage
        localStorage.setItem('last_traffic_update', JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
        
        // Show notification for significant updates
        if (data.severity === 'high' || data.type === 'accident') {
            this.showTrafficNotification(data);
        }
    }

    handleEmergencyAlert(data) {
        // Handle emergency alerts
        const event = new CustomEvent('emergency-alert', {
            detail: data
        });
        window.dispatchEvent(event);
        
        // Show emergency notification
        this.showEmergencyNotification(data);
    }

    handleDeliveryUpdate(data) {
        // Handle delivery updates
        const event = new CustomEvent('delivery-update', {
            detail: data
        });
        window.dispatchEvent(event);
        
        // Update delivery status in modules
        if (window.deliveryModule) {
            window.deliveryModule.handleRealtimeUpdate(data);
        }
    }

    handleGroupUpdate(data) {
        // Handle group updates
        const event = new CustomEvent('group-update', {
            detail: data
        });
        window.dispatchEvent(event);
        
        // Update group status in modules
        if (window.app && window.app.user && window.app.user.groups) {
            // Update group data
        }
    }

    handleSystemNotification(data) {
        // Handle system notifications
        this.showSystemNotification(data);
    }

    handleServiceWorkerMessage(data) {
        // Handle messages from service worker
        switch (data.type) {
            case 'SYNC_COMPLETE':
                console.log('Background sync completed');
                break;
            case 'PUSH_NOTIFICATION':
                this.handlePushNotification(data.payload);
                break;
            case 'MESSAGE_SENT':
                // Message was sent from service worker
                break;
        }
    }

    showTrafficNotification(data) {
        const notification = {
            title: 'Traffic Update',
            body: `${data.location}: ${data.description}`,
            icon: '/assets/icons/icon-192.png',
            tag: 'traffic-update',
            data: {
                url: '/',
                type: 'traffic'
            }
        };
        
        this.showNotification(notification);
    }

    showEmergencyNotification(data) {
        const notification = {
            title: 'Emergency Alert',
            body: data.message || 'Emergency reported in your area',
            icon: '/assets/icons/icon-192.png',
            tag: 'emergency-alert',
            requireInteraction: true,
            data: {
                url: '/modules/emergency.html',
                type: 'emergency'
            }
        };
        
        this.showNotification(notification);
    }

    showSystemNotification(data) {
        const notification = {
            title: data.title || 'Smart Roads Notification',
            body: data.message,
            icon: '/assets/icons/icon-192.png',
            tag: 'system-notification',
            data: {
                url: data.url || '/',
                type: 'system'
            }
        };
        
        this.showNotification(notification);
    }

    showNotification(notification) {
        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            const notif = new Notification(notification.title, notification);
            
            notif.onclick = () => {
                if (notification.data && notification.data.url) {
                    window.focus();
                    window.location.href = notification.data.url;
                }
                notif.close();
            };
        }
        
        // Also show in-app notification
        this.showInAppNotification(notification);
    }

    showInAppNotification(notification) {
        // Create in-app notification element
        const notifElement = document.createElement('div');
        notifElement.className = 'in-app-notification';
        notifElement.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas fa-${notification.data?.type === 'emergency' ? 'exclamation-triangle' : 
                                      notification.data?.type === 'traffic' ? 'traffic-light' : 'bell'}"></i>
                </div>
                <div class="notification-text">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-body">${notification.body}</div>
                </div>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        notifElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--background);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            z-index: 9998;
            max-width: 350px;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notifElement);
        
        // Add close functionality
        notifElement.querySelector('.notification-close').addEventListener('click', () => {
            notifElement.remove();
        });
        
        // Add click functionality
        notifElement.addEventListener('click', () => {
            if (notification.data && notification.data.url) {
                window.location.href = notification.data.url;
            }
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notifElement.parentNode) {
                notifElement.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => notifElement.remove(), 300);
            }
        }, 5000);
        
        // Add styles if not present
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                
                .in-app-notification .notification-content {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    padding: 1rem;
                }
                
                .in-app-notification .notification-icon {
                    width: 40px;
                    height: 40px;
                    background: var(--primary-blue);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    flex-shrink: 0;
                }
                
                .in-app-notification .notification-icon.emergency {
                    background: var(--danger);
                }
                
                .in-app-notification .notification-icon.traffic {
                    background: var(--warning);
                }
                
                .in-app-notification .notification-text {
                    flex: 1;
                }
                
                .in-app-notification .notification-title {
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }
                
                .in-app-notification .notification-body {
                    font-size: 0.9rem;
                    color: var(--text-light);
                }
                
                .in-app-notification .notification-close {
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    color: var(--text-light);
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            `;
            document.head.appendChild(style);
        }
    }

    handlePushNotification(payload) {
        // Handle push notifications from service worker
        const notification = {
            title: payload.title || 'Smart Roads',
            body: payload.body,
            icon: payload.icon || '/assets/icons/icon-192.png',
            data: payload.data
        };
        
        this.showNotification(notification);
    }

    // Public API methods
    sendTrafficReport(data) {
        return this.send({
            type: 'traffic_report',
            payload: data,
            clientId: this.getClientId(),
            timestamp: Date.now()
        });
    }

    sendDeliveryStatus(deliveryId, status, data = {}) {
        return this.send({
            type: 'delivery_status',
            payload: {
                deliveryId,
                status,
                ...data
            },
            clientId: this.getClientId(),
            timestamp: Date.now()
        });
    }

    sendGroupMessage(groupId, message, sender) {
        return this.send({
            type: 'group_message',
            payload: {
                groupId,
                message,
                sender: sender || this.getClientId(),
                timestamp: Date.now()
            }
        });
    }

    sendEmergencyReport(data) {
        return this.send({
            type: 'emergency_report',
            payload: data,
            clientId: this.getClientId(),
            timestamp: Date.now(),
            priority: 'high'
        });
    }

    getConnectionStatus() {
        return {
            connected: this.connected,
            websocket: this.socket ? this.socket.readyState : null,
            pendingMessages: this.messageQueue.length
        };
    }

    cleanup() {
        // Clean up resources
        if (this.socket) {
            this.socket.close();
        }
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        console.log('Realtime communicator cleaned up');
    }
}

// Initialize realtime communicator
let realtime;

document.addEventListener('DOMContentLoaded', () => {
    realtime = new RealtimeCommunicator();
    window.realtime = realtime;
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});

// Export for use in modules
window.RealtimeCommunicator = RealtimeCommunicator;