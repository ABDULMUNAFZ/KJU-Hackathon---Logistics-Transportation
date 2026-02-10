// Smart Roads Main Application JavaScript

class SmartRoadsApp {
    constructor() {
        this.init();
    }

    init() {
        // Check if PWA is installed
        this.checkPWAInstall();
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Check network status
        this.initNetworkStatus();
        
        // Load user data
        this.loadUserData();
        
        // Initialize real-time updates
        this.initRealtimeUpdates();
        
        // Show install prompt if applicable
        this.showInstallPrompt();
    }

    checkPWAInstall() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            console.log('PWA install available');
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA installed successfully');
            this.deferredPrompt = null;
        });
    }

    showInstallPrompt() {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        // Show prompt after delay
        setTimeout(() => {
            const prompt = document.getElementById('installPrompt');
            if (prompt && this.deferredPrompt) {
                prompt.style.display = 'block';
            }
        }, 3000);
    }

    initEventListeners() {
        // Install button
        const installBtn = document.getElementById('installBtn');
        const dismissBtn = document.getElementById('dismissInstall');
        
        if (installBtn) {
            installBtn.addEventListener('click', () => this.installPWA());
        }
        
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                document.getElementById('installPrompt').style.display = 'none';
            });
        }

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!item.href || item.href === '#') {
                    e.preventDefault();
                    this.showComingSoon();
                }
            });
        });

        // Module cards
        document.querySelectorAll('.module-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Add click feedback
                card.classList.add('touch-feedback');
                setTimeout(() => {
                    card.classList.remove('touch-feedback');
                }, 300);
            });
        });

        // Notification button
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => this.showNotifications());
        }

        // Profile button
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => this.showProfile());
        }
    }

    async installPWA() {
        if (!this.deferredPrompt) {
            return;
        }

        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            
            this.deferredPrompt = null;
            document.getElementById('installPrompt').style.display = 'none';
        } catch (error) {
            console.error('Install error:', error);
        }
    }

    initNetworkStatus() {
        const offlineIndicator = document.createElement('div');
        offlineIndicator.className = 'offline-indicator';
        offlineIndicator.innerHTML = '<i class="fas fa-wifi"></i> You are currently offline';
        document.body.appendChild(offlineIndicator);

        const updateNetworkStatus = () => {
            if (navigator.onLine) {
                offlineIndicator.classList.remove('show');
                console.log('Online');
            } else {
                offlineIndicator.classList.add('show');
                console.log('Offline');
            }
        };

        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
        updateNetworkStatus();
    }

    async loadUserData() {
        try {
            // Load from localStorage first
            const userData = localStorage.getItem('smartroads_user');
            if (userData) {
                this.user = JSON.parse(userData);
                return;
            }

            // Create dummy user data
            this.user = {
                id: `user_${Date.now()}`,
                name: 'John Doe',
                email: 'john@example.com',
                role: 'commuter',
                preferences: {
                    trafficAlerts: true,
                    emailNotifications: true,
                    autoUpdate: true
                },
                recentTrips: [],
                createdAt: new Date().toISOString()
            };

            localStorage.setItem('smartroads_user', JSON.stringify(this.user));
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    initRealtimeUpdates() {
        // Simulate real-time updates
        setInterval(() => {
            this.updateTrafficStatus();
        }, 30000); // Every 30 seconds
    }

    updateTrafficStatus() {
        const trafficLevels = ['Light', 'Moderate', 'Heavy'];
        const currentLevel = trafficLevels[Math.floor(Math.random() * trafficLevels.length)];
        
        const statusElement = document.querySelector('.status-value');
        if (statusElement) {
            statusElement.textContent = currentLevel;
            statusElement.className = `status-value ${currentLevel.toLowerCase()}`;
        }

        // Update traffic updates
        this.addTrafficUpdate();
    }

    addTrafficUpdate() {
        const updates = [
            "Traffic building up on Main Street",
            "Accident cleared on Highway 101",
            "Road construction completed on Park Avenue",
            "New congestion detected near City Center",
            "Traffic flowing smoothly on all major routes"
        ];

        const updateText = updates[Math.floor(Math.random() * updates.length)];
        const updatesList = document.querySelector('.updates-list');
        
        if (updatesList) {
            const updateItem = document.createElement('div');
            updateItem.className = 'update-item';
            updateItem.innerHTML = `
                <div class="update-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="update-content">
                    <p>${updateText}</p>
                    <span class="update-time">Just now</span>
                </div>
            `;
            
            updatesList.insertBefore(updateItem, updatesList.firstChild);
            
            // Keep only last 5 updates
            while (updatesList.children.length > 5) {
                updatesList.removeChild(updatesList.lastChild);
            }
        }
    }

    showNotifications() {
        const notifications = [
            { id: 1, text: "Your trip to Downtown starts in 30 minutes", time: "10 min ago", read: false },
            { id: 2, text: "Traffic alert: Heavy congestion on your route", time: "25 min ago", read: true },
            { id: 3, text: "Delivery #DRV-4567 has been completed", time: "1 hour ago", read: true }
        ];

        this.showModal('Notifications', `
            <div class="notifications-list">
                ${notifications.map(notif => `
                    <div class="notification-item ${notif.read ? 'read' : 'unread'}">
                        <div class="notification-content">
                            <p>${notif.text}</p>
                            <span class="notification-time">${notif.time}</span>
                        </div>
                        ${!notif.read ? '<span class="unread-dot"></span>' : ''}
                    </div>
                `).join('')}
            </div>
            <style>
                .notifications-list { max-height: 400px; overflow-y: auto; }
                .notification-item {
                    padding: 1rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .notification-item:last-child { border-bottom: none; }
                .notification-item.unread { background: rgba(0, 119, 252, 0.05); }
                .notification-content p { margin-bottom: 0.25rem; }
                .notification-time { font-size: 0.8rem; color: var(--text-lighter); }
                .unread-dot {
                    width: 8px;
                    height: 8px;
                    background: var(--primary-blue);
                    border-radius: 50%;
                }
            </style>
        `);
    }

    showProfile() {
        this.showModal('Profile Settings', `
            <div class="profile-info">
                <div class="profile-header">
                    <div class="profile-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div>
                        <h4>${this.user.name}</h4>
                        <p>${this.user.email}</p>
                    </div>
                </div>
                
                <div class="profile-section">
                    <h5>Preferences</h5>
                    <div class="preference-item">
                        <label class="switch">
                            <input type="checkbox" ${this.user.preferences.trafficAlerts ? 'checked' : ''} 
                                   onchange="app.updatePreference('trafficAlerts', this.checked)">
                            <span class="slider"></span>
                        </label>
                        <span>Traffic Alerts</span>
                    </div>
                    <div class="preference-item">
                        <label class="switch">
                            <input type="checkbox" ${this.user.preferences.emailNotifications ? 'checked' : ''}
                                   onchange="app.updatePreference('emailNotifications', this.checked)">
                            <span class="slider"></span>
                        </label>
                        <span>Email Notifications</span>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button class="btn-primary" style="width: 100%; margin-bottom: 0.5rem;">
                        <i class="fas fa-cog"></i> Account Settings
                    </button>
                    <button class="btn-text" style="width: 100%;" onclick="app.logout()">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
            
            <style>
                .profile-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                .profile-avatar i {
                    font-size: 3rem;
                    color: var(--primary-blue);
                }
                .profile-section {
                    margin-bottom: 1.5rem;
                }
                .profile-section h5 {
                    margin-bottom: 1rem;
                    color: var(--text-light);
                }
                .preference-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid var(--border);
                }
                .preference-item:last-child {
                    border-bottom: none;
                }
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 24px;
                }
                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--border);
                    transition: .4s;
                    border-radius: 34px;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                input:checked + .slider {
                    background-color: var(--primary-blue);
                }
                input:checked + .slider:before {
                    transform: translateX(26px);
                }
            </style>
        `);
    }

    updatePreference(key, value) {
        this.user.preferences[key] = value;
        localStorage.setItem('smartroads_user', JSON.stringify(this.user));
        console.log(`Preference ${key} updated to ${value}`);
    }

    logout() {
        localStorage.removeItem('smartroads_user');
        window.location.reload();
    }

    showComingSoon() {
        this.showModal('Coming Soon', `
            <div style="text-align: center; padding: 2rem 0;">
                <i class="fas fa-tools" style="font-size: 3rem; color: var(--primary-blue); margin-bottom: 1rem;"></i>
                <h4>Feature Under Development</h4>
                <p>This feature is currently being developed and will be available soon.</p>
            </div>
        `);
    }

    showModal(title, content) {
        // Remove existing modal
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                ${content}
            </div>
        `;

        document.body.appendChild(modal);

        // Add close functionality
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => modal.remove());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SmartRoadsApp();
});

// Add to home screen functionality
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA install prompt triggered');
});

// Handle offline/online events
window.addEventListener('offline', () => {
    // Show offline UI
    console.log('App is offline');
});

window.addEventListener('online', () => {
    // Sync data when back online
    console.log('App is back online');
});