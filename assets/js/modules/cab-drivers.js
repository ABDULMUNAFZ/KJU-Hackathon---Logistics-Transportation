// Cab Drivers Module - Smart Wait Suggestions
class CabDriversModule {
    constructor() {
        this.driverStatus = 'offline';
        this.currentRide = null;
        this.ridesQueue = [];
        this.suggestions = [];
        this.driverStats = {};
        this.breakOptions = [
            { id: 'tea', label: 'Take Tea Break', duration: 15, icon: 'fa-coffee' },
            { id: 'lunch', label: 'Lunch Break', duration: 30, icon: 'fa-utensils' },
            { id: 'wait', label: 'Wait for Surge', duration: 20, icon: 'fa-clock' },
            { id: 'continue', label: 'Continue Driving', duration: 0, icon: 'fa-play' }
        ];
        
        this.init();
    }

    init() {
        this.loadDriverData();
        this.initEventListeners();
        this.initRealtimeUpdates();
        this.initMap();
        this.updateDriverStatus();
        this.generateSmartSuggestions();
    }

    loadDriverData() {
        // Load driver data from localStorage
        const savedData = localStorage.getItem('smartroads_driver');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.driverStatus = data.status || 'offline';
            this.ridesQueue = data.ridesQueue || [];
            this.driverStats = data.stats || this.getDefaultStats();
        } else {
            this.driverStats = this.getDefaultStats();
            this.saveDriverData();
        }
    }

    getDefaultStats() {
        return {
            today: {
                rides: 0,
                earnings: 0,
                distance: 0,
                onlineHours: 0,
                rating: 4.8
            },
            weekly: {
                rides: 24,
                earnings: 2450,
                distance: 320,
                rating: 4.7
            }
        };
    }

    saveDriverData() {
        const data = {
            status: this.driverStatus,
            ridesQueue: this.ridesQueue,
            stats: this.driverStats,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('smartroads_driver', JSON.stringify(data));
    }

    initEventListeners() {
        // Toggle online/offline status
        const toggleBtn = document.getElementById('toggleOnline');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleDriverStatus());
        }

        // Suggestion cards
        document.addEventListener('click', (e) => {
            if (e.target.closest('.suggestion-card')) {
                const card = e.target.closest('.suggestion-card');
                const suggestionId = card.dataset.suggestionId;
                this.selectSuggestion(suggestionId);
            }
        });

        // Ride actions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.accept-ride')) {
                const rideId = e.target.closest('.ride-card').dataset.rideId;
                this.acceptRide(rideId);
            }
            
            if (e.target.closest('.decline-ride')) {
                const rideId = e.target.closest('.ride-card').dataset.rideId;
                this.declineRide(rideId);
            }
            
            if (e.target.closest('.navigate-ride')) {
                const rideId = e.target.closest('.ride-card').dataset.rideId;
                this.navigateToRide(rideId);
            }
        });

        // Quick actions
        document.getElementById('startBreak')?.addEventListener('click', () => this.startBreak());
        document.getElementById('endDay')?.addEventListener('click', () => this.endDay());
        document.getElementById('viewEarnings')?.addEventListener('click', () => this.showEarnings());
        document.getElementById('support')?.addEventListener('click', () => this.showSupport());

        // Map navigation
        document.getElementById('showHeatmap')?.addEventListener('click', () => this.showHeatmap());
        document.getElementById('showSurge')?.addEventListener('click', () => this.showSurgeAreas());
    }

    initMap() {
        // Initialize map for cab drivers
        const mapContainer = document.getElementById('cabMap');
        if (mapContainer) {
            this.map = new SmartRoadsMap('cabMap', {
                center: [20.5937, 78.9629],
                zoom: 13,
                trafficOverlay: true,
                markers: true,
                routes: false
            });
            
            // Add driver location
            this.addDriverLocation();
            
            // Add surge zones
            this.addSurgeZones();
            
            // Add popular pickup points
            this.addPickupPoints();
        }
    }

    addDriverLocation() {
        if (!this.map || !this.map.map) return;
        
        // Simulate driver location (in real app, use GPS)
        const driverLocation = [
            20.5937 + (Math.random() * 0.02 - 0.01),
            78.9629 + (Math.random() * 0.02 - 0.01)
        ];
        
        this.driverMarker = this.map.addMarker(driverLocation, 'You are here', 'user');
        
        // Update location periodically
        setInterval(() => {
            if (this.driverMarker && this.driverStatus === 'online') {
                const newLocation = [
                    driverLocation[0] + (Math.random() * 0.001 - 0.0005),
                    driverLocation[1] + (Math.random() * 0.001 - 0.0005)
                ];
                this.driverMarker.setLatLng(newLocation);
            }
        }, 5000);
    }

    addSurgeZones() {
        if (!this.map || !this.map.map) return;
        
        // Define surge zones (areas with high demand)
        const surgeZones = [
            {
                coords: [[20.59, 78.96], [20.595, 78.96], [20.595, 78.965], [20.59, 78.965]],
                name: 'Downtown',
                surge: 1.8,
                demand: 'High'
            },
            {
                coords: [[20.585, 78.955], [20.59, 78.955], [20.59, 78.96], [20.585, 78.96]],
                name: 'Business District',
                surge: 2.1,
                demand: 'Very High'
            },
            {
                coords: [[20.6, 78.97], [20.605, 78.97], [20.605, 78.975], [20.6, 78.975]],
                name: 'Airport',
                surge: 1.5,
                demand: 'Medium'
            }
        ];

        surgeZones.forEach(zone => {
            const polygon = L.polygon(zone.coords, {
                color: this.getSurgeColor(zone.surge),
                weight: 2,
                opacity: 0.7,
                fillColor: this.getSurgeColor(zone.surge),
                fillOpacity: 0.2
            }).addTo(this.map.map);
            
            polygon.bindTooltip(`
                <strong>${zone.name}</strong><br>
                Surge: ${zone.surge}x<br>
                Demand: ${zone.demand}
            `);
            
            polygon.on('click', () => {
                this.showZoneDetails(zone);
            });
        });
    }

    getSurgeColor(surge) {
        if (surge < 1.5) return '#28A745'; // Green
        if (surge < 2.0) return '#FFC107'; // Yellow
        return '#DC3545'; // Red
    }

    addPickupPoints() {
        if (!this.map || !this.map.map) return;
        
        const pickupPoints = [
            { coords: [20.592, 78.962], name: 'Central Station', type: 'station', hot: true },
            { coords: [20.594, 78.964], name: 'Mall Entrance', type: 'shopping', hot: false },
            { coords: [20.596, 78.966], name: 'Hotel Lobby', type: 'hotel', hot: true },
            { coords: [20.59, 78.968], name: 'Hospital Gate', type: 'hospital', hot: false },
            { coords: [20.598, 78.97], name: 'University Gate', type: 'education', hot: true }
        ];

        pickupPoints.forEach(point => {
            const icon = L.divIcon({
                html: `<div style="
                    background: ${point.hot ? '#DC3545' : '#0077FC'};
                    width: ${point.hot ? '25px' : '20px'};
                    height: ${point.hot ? '25px' : '20px'};
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 0 8px ${point.hot ? 'rgba(220, 53, 69, 0.5)' : 'rgba(0, 119, 252, 0.5)'};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: ${point.hot ? '12px' : '10px'};
                "><i class="fas fa-${point.type === 'station' ? 'train' : point.type === 'hotel' ? 'hotel' : 'map-marker-alt'}"></i></div>`,
                className: 'pickup-marker',
                iconSize: point.hot ? [25, 25] : [20, 20],
                iconAnchor: point.hot ? [12.5, 12.5] : [10, 10]
            });

            const marker = L.marker(point.coords, { icon })
                .addTo(this.map.map)
                .bindTooltip(`
                    <strong>${point.name}</strong><br>
                    ${point.hot ? '🔥 Hot Spot' : 'Pickup Point'}
                `);
        });
    }

    toggleDriverStatus() {
        this.driverStatus = this.driverStatus === 'online' ? 'offline' : 'online';
        this.updateDriverStatus();
        this.saveDriverData();
        
        if (this.driverStatus === 'online') {
            this.startRideMatching();
            this.showNotification('You are now online! Rides will start appearing.', 'success');
        } else {
            this.stopRideMatching();
            this.showNotification('You are now offline.', 'info');
        }
    }

    updateDriverStatus() {
        const toggleBtn = document.getElementById('toggleOnline');
        if (!toggleBtn) return;
        
        const icon = toggleBtn.querySelector('i');
        const isOnline = this.driverStatus === 'online';
        
        if (isOnline) {
            icon.style.color = '#28A745';
            icon.className = 'fas fa-circle';
            toggleBtn.title = 'Go Offline';
            
            // Update status indicator
            document.querySelectorAll('.status-indicator').forEach(indicator => {
                indicator.textContent = 'Online';
                indicator.className = 'status-indicator online';
            });
        } else {
            icon.style.color = '#DC3545';
            icon.className = 'far fa-circle';
            toggleBtn.title = 'Go Online';
            
            document.querySelectorAll('.status-indicator').forEach(indicator => {
                indicator.textContent = 'Offline';
                indicator.className = 'status-indicator offline';
            });
        }
        
        // Update UI elements based on status
        this.updateUIForStatus();
    }

    updateUIForStatus() {
        const isOnline = this.driverStatus === 'online';
        
        // Show/hide ride queue
        const ridesSection = document.querySelector('.rides-section');
        if (ridesSection) {
            ridesSection.style.display = isOnline ? 'block' : 'none';
        }
        
        // Update suggestion cards
        this.generateSmartSuggestions();
        
        // Update driver stats visibility
        this.updateStatsDisplay();
    }

    generateSmartSuggestions() {
        const isOnline = this.driverStatus === 'online';
        const currentTime = new Date().getHours();
        const isPeakHour = (currentTime >= 7 && currentTime <= 10) || (currentTime >= 17 && currentTime <= 20);
        
        this.suggestions = [];
        
        if (!isOnline) {
            this.suggestions.push({
                id: 'go_online',
                title: 'Go Online',
                description: 'Start accepting rides and earning',
                icon: 'fa-play-circle',
                color: '#28A745',
                action: 'toggleOnline',
                priority: 'high'
            });
        } else {
            // Generate smart suggestions based on conditions
            if (isPeakHour) {
                this.suggestions.push({
                    id: 'continue_driving',
                    title: 'Continue Driving',
                    description: 'Peak hours - High demand expected',
                    icon: 'fa-car',
                    color: '#0077FC',
                    action: 'continue',
                    duration: 0,
                    earningsEstimate: '₹500-700/hour',
                    priority: 'high'
                });
            } else {
                this.suggestions.push({
                    id: 'wait_surge',
                    title: 'Wait for Surge Pricing',
                    description: 'Low demand now. Wait 20 mins for better rates',
                    icon: 'fa-clock',
                    color: '#FFC107',
                    action: 'wait',
                    duration: 20,
                    earningsEstimate: 'Surge 1.5x expected',
                    priority: 'medium'
                });
            }
            
            // Add break suggestions based on driver activity
            const onlineHours = this.driverStats.today.onlineHours || 0;
            if (onlineHours >= 4) {
                this.suggestions.push({
                    id: 'take_break',
                    title: 'Take a Break',
                    description: 'You\'ve been driving for 4+ hours. Rest recommended',
                    icon: 'fa-coffee',
                    color: '#17A2B8',
                    action: 'break',
                    duration: 30,
                    earningsEstimate: 'Safety first',
                    priority: 'high'
                });
            }
            
            // Add location-based suggestion
            this.suggestions.push({
                id: 'move_downtown',
                title: 'Move to Downtown',
                description: 'Higher demand area. 2.1x surge active',
                icon: 'fa-map-marker-alt',
                color: '#DC3545',
                action: 'navigate',
                duration: 10,
                earningsEstimate: '₹800+/hour possible',
                priority: 'medium'
            });
        }
        
        // Render suggestions
        this.renderSuggestions();
    }

    renderSuggestions() {
        const container = document.querySelector('.suggestion-cards');
        if (!container) return;
        
        container.innerHTML = this.suggestions.map(suggestion => `
            <div class="suggestion-card" data-suggestion-id="${suggestion.id}">
                <div class="suggestion-header">
                    <div class="suggestion-icon" style="background: ${suggestion.color}">
                        <i class="fas ${suggestion.icon}"></i>
                    </div>
                    <div class="suggestion-content">
                        <h4>${suggestion.title}</h4>
                        <p>${suggestion.description}</p>
                    </div>
                    ${suggestion.priority === 'high' ? 
                        '<span class="priority-badge">Recommended</span>' : ''}
                </div>
                
                ${suggestion.duration || suggestion.earningsEstimate ? `
                    <div class="suggestion-details">
                        ${suggestion.duration ? `
                            <div class="detail-item">
                                <i class="fas fa-clock"></i>
                                <span>${suggestion.duration} min</span>
                            </div>
                        ` : ''}
                        
                        ${suggestion.earningsEstimate ? `
                            <div class="detail-item">
                                <i class="fas fa-rupee-sign"></i>
                                <span>${suggestion.earningsEstimate}</span>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                <div class="suggestion-actions">
                    <button class="btn-primary select-suggestion">
                        Select
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add styles if not already present
        if (!document.querySelector('#suggestion-styles')) {
            const style = document.createElement('style');
            style.id = 'suggestion-styles';
            style.textContent = `
                .suggestion-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .suggestion-card {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    padding: 1.25rem;
                    transition: var(--transition);
                }
                
                .suggestion-card:hover {
                    border-color: var(--primary-blue);
                    box-shadow: var(--shadow-sm);
                    transform: translateY(-2px);
                }
                
                .suggestion-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                
                .suggestion-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                
                .suggestion-icon i {
                    color: white;
                    font-size: 1.5rem;
                }
                
                .suggestion-content {
                    flex: 1;
                }
                
                .suggestion-content h4 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }
                
                .suggestion-content p {
                    font-size: 0.9rem;
                    color: var(--text-light);
                    line-height: 1.4;
                }
                
                .priority-badge {
                    background: var(--warning);
                    color: var(--text-dark);
                    padding: 0.25rem 0.75rem;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                
                .suggestion-details {
                    display: flex;
                    gap: 1.5rem;
                    margin-bottom: 1rem;
                    padding: 0.75rem;
                    background: var(--background-alt);
                    border-radius: var(--radius-md);
                }
                
                .detail-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                    color: var(--text-light);
                }
                
                .detail-item i {
                    color: var(--primary-blue);
                }
                
                .suggestion-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .suggestion-actions .btn-primary {
                    flex: 1;
                }
            `;
            document.head.appendChild(style);
        }
    }

    selectSuggestion(suggestionId) {
        const suggestion = this.suggestions.find(s => s.id === suggestionId);
        if (!suggestion) return;
        
        switch (suggestion.action) {
            case 'toggleOnline':
                this.toggleDriverStatus();
                break;
                
            case 'continue':
                this.continueDriving();
                break;
                
            case 'wait':
                this.startWaiting(suggestion.duration);
                break;
                
            case 'break':
                this.startBreak(suggestion.duration);
                break;
                
            case 'navigate':
                this.navigateToHotspot();
                break;
        }
        
        this.showNotification(`Selected: ${suggestion.title}`, 'success');
    }

    continueDriving() {
        // Start accepting rides immediately
        this.showNotification('Continuing to drive. Rides will be matched...', 'info');
        
        // Generate sample rides
        this.generateSampleRides();
    }

    startWaiting(duration) {
        const modalContent = `
            <div style="text-align: center; padding: 1rem;">
                <i class="fas fa-clock" style="font-size: 3rem; color: var(--warning); margin-bottom: 1rem;"></i>
                <h4>Wait Mode Activated</h4>
                <p>Waiting for ${duration} minutes for better surge pricing.</p>
                
                <div class="wait-timer" style="
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--primary-blue);
                    margin: 1.5rem 0;
                ">${duration}:00</div>
                
                <p><small>You'll be notified when surge pricing activates.</small></p>
                
                <div class="wait-actions" style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                    <button class="btn-primary" onclick="cabModule.cancelWait()">
                        Cancel Wait
                    </button>
                    <button class="btn-text" onclick="cabModule.acceptEarlyRide()">
                        Accept Early Ride
                    </button>
                </div>
            </div>
        `;
        
        window.app.showModal('Smart Wait Mode', modalContent);
        
        // Start countdown
        this.waitTimer = setInterval(() => {
            duration--;
            const timerElement = document.querySelector('.wait-timer');
            if (timerElement) {
                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            if (duration <= 0) {
                this.endWait();
            }
        }, 1000);
        
        this.waitDuration = duration;
    }

    cancelWait() {
        if (this.waitTimer) {
            clearInterval(this.waitTimer);
            this.waitTimer = null;
        }
        
        document.querySelector('.modal-overlay')?.remove();
        this.showNotification('Wait mode cancelled', 'info');
    }

    acceptEarlyRide() {
        this.cancelWait();
        this.generateSampleRides();
        this.showNotification('Looking for available rides...', 'info');
    }

    endWait() {
        if (this.waitTimer) {
            clearInterval(this.waitTimer);
            this.waitTimer = null;
        }
        
        document.querySelector('.modal-overlay')?.remove();
        this.showNotification('Surge pricing should be active now!', 'success');
        this.generateSampleRides(true); // Generate rides with surge
    }

    startBreak(duration = 30) {
        const breakOptions = [
            { id: 'tea', label: 'Tea/Coffee Break', icon: 'fa-coffee' },
            { id: 'lunch', label: 'Lunch Break', icon: 'fa-utensils' },
            { id: 'rest', label: 'Short Rest', icon: 'fa-bed' },
            { id: 'personal', label: 'Personal Time', icon: 'fa-user' }
        ];
        
        const modalContent = `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">Start Break</h4>
                <p style="color: var(--text-light); margin-bottom: 1.5rem;">
                    Select break type and duration:
                </p>
                
                <div class="break-options" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1.5rem;">
                    ${breakOptions.map(option => `
                        <button class="break-option" data-break-id="${option.id}" style="
                            background: var(--background);
                            border: 1px solid var(--border);
                            border-radius: var(--radius-md);
                            padding: 1rem;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 0.5rem;
                            cursor: pointer;
                            transition: var(--transition);
                        ">
                            <i class="fas ${option.icon}" style="font-size: 1.5rem; color: var(--primary-blue);"></i>
                            <span style="font-size: 0.9rem;">${option.label}</span>
                        </button>
                    `).join('')}
                </div>
                
                <div class="duration-selector" style="margin-bottom: 1.5rem;">
                    <label class="input-label">Duration (minutes)</label>
                    <input type="range" min="5" max="60" value="${duration}" step="5" 
                           class="form-input" id="breakDuration">
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--text-light);">
                        <span>5 min</span>
                        <span id="durationValue">${duration} min</span>
                        <span>60 min</span>
                    </div>
                </div>
                
                <button class="btn-primary" style="width: 100%;" onclick="cabModule.confirmBreak()">
                    <i class="fas fa-play-circle"></i> Start Break
                </button>
                
                <style>
                    .break-option:hover {
                        border-color: var(--primary-blue);
                        background: var(--background-alt);
                    }
                    .break-option.selected {
                        border-color: var(--primary-blue);
                        background: rgba(0, 119, 252, 0.05);
                    }
                </style>
            </div>
        `;
        
        window.app.showModal('Take a Break', modalContent);
        
        // Add event listeners
        document.querySelectorAll('.break-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.break-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedBreakType = option.dataset.breakId;
            });
        });
        
        const durationSlider = document.getElementById('breakDuration');
        const durationValue = document.getElementById('durationValue');
        
        durationSlider.addEventListener('input', (e) => {
            durationValue.textContent = `${e.target.value} min`;
            this.breakDuration = parseInt(e.target.value);
        });
        
        // Select first option by default
        document.querySelector('.break-option').click();
        this.breakDuration = duration;
    }

    confirmBreak() {
        if (!this.selectedBreakType) {
            this.showNotification('Please select a break type', 'error');
            return;
        }
        
        document.querySelector('.modal-overlay')?.remove();
        
        // Set driver as on break
        this.driverStatus = 'break';
        this.updateDriverStatus();
        
        // Start break timer
        this.startBreakTimer(this.breakDuration);
        
        this.showNotification(`Enjoy your ${this.selectedBreakType} break!`, 'success');
    }

    startBreakTimer(duration) {
        const breakEnd = new Date(Date.now() + duration * 60000);
        localStorage.setItem('break_end', breakEnd.toISOString());
        
        // Show break overlay
        const breakOverlay = document.createElement('div');
        breakOverlay.id = 'breakOverlay';
        breakOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 119, 252, 0.95);
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            text-align: center;
            padding: 2rem;
        `;
        
        breakOverlay.innerHTML = `
            <i class="fas fa-coffee" style="font-size: 4rem; margin-bottom: 1rem;"></i>
            <h2 style="margin-bottom: 1rem;">On Break</h2>
            <p style="margin-bottom: 2rem; font-size: 1.1rem;">
                You're on a break. Rest and recharge!
            </p>
            
            <div class="break-timer" style="
                font-size: 2.5rem;
                font-weight: 700;
                margin-bottom: 2rem;
                font-family: monospace;
            ">${duration.toString().padStart(2, '0')}:00</div>
            
            <button class="btn-primary" onclick="cabModule.endBreakEarly()" style="
                background: white;
                color: var(--primary-blue);
                border: none;
                padding: 1rem 2rem;
                font-size: 1.1rem;
                font-weight: 600;
                border-radius: var(--radius-md);
                cursor: pointer;
            ">
                End Break Early
            </button>
        `;
        
        document.body.appendChild(breakOverlay);
        
        // Start countdown
        this.breakTimer = setInterval(() => {
            duration--;
            const timerElement = breakOverlay.querySelector('.break-timer');
            if (timerElement) {
                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            if (duration <= 0) {
                this.endBreak();
            }
        }, 1000);
        
        this.remainingBreakTime = duration;
    }

    endBreakEarly() {
        if (this.breakTimer) {
            clearInterval(this.breakTimer);
            this.breakTimer = null;
        }
        
        document.getElementById('breakOverlay')?.remove();
        localStorage.removeItem('break_end');
        
        this.driverStatus = 'online';
        this.updateDriverStatus();
        
        this.showNotification('Break ended early. Welcome back!', 'info');
    }

    endBreak() {
        if (this.breakTimer) {
            clearInterval(this.breakTimer);
            this.breakTimer = null;
        }
        
        document.getElementById('breakOverlay')?.remove();
        localStorage.removeItem('break_end');
        
        this.driverStatus = 'online';
        this.updateDriverStatus();
        
        // Play notification sound
        this.playNotificationSound();
        
        this.showNotification('Break time is over! Ready to drive?', 'success');
        
        // Show resume modal
        setTimeout(() => {
            window.app.showModal('Break Ended', `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-bell" style="font-size: 3rem; color: var(--primary-blue); margin-bottom: 1rem;"></i>
                    <h4>Ready to Drive?</h4>
                    <p>Your break has ended. Go back online to start accepting rides.</p>
                    
                    <button class="btn-primary" style="width: 100%; margin-top: 1.5rem;" 
                            onclick="cabModule.goOnlineAfterBreak()">
                        <i class="fas fa-play-circle"></i> Go Online Now
                    </button>
                </div>
            `);
        }, 500);
    }

    goOnlineAfterBreak() {
        document.querySelector('.modal-overlay')?.remove();
        this.toggleDriverStatus();
    }

    navigateToHotspot() {
        if (!this.map || !this.map.map) return;
        
        // Show navigation to hotspot
        const hotspot = {
            name: 'Downtown Surge Zone',
            coords: [20.5925, 78.9625],
            surge: 2.1,
            eta: '8 minutes'
        };
        
        // Add route to hotspot
        if (this.driverMarker) {
            const driverPos = this.driverMarker.getLatLng();
            this.map.addRoute([driverPos.lat, driverPos.lng], hotspot.coords);
            
            // Center map on route
            const bounds = L.latLngBounds([driverPos, hotspot.coords]);
            this.map.map.fitBounds(bounds.pad(0.1));
        }
        
        // Show hotspot details
        window.app.showModal('Navigate to Hotspot', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">${hotspot.name}</h4>
                
                <div class="hotspot-details">
                    <div class="detail-item" style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                        <span style="color: var(--text-light);">Surge Pricing:</span>
                        <span style="font-weight: 600; color: var(--danger);">${hotspot.surge}x</span>
                    </div>
                    
                    <div class="detail-item" style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                        <span style="color: var(--text-light);">ETA from current:</span>
                        <span style="font-weight: 600;">${hotspot.eta}</span>
                    </div>
                    
                    <div class="detail-item" style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
                        <span style="color: var(--text-light);">Expected Earnings:</span>
                        <span style="font-weight: 600; color: var(--success);">₹800+/hour</span>
                    </div>
                </div>
                
                <div class="navigation-actions" style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="flex: 2;" onclick="cabModule.startNavigation()">
                        <i class="fas fa-directions"></i> Start Navigation
                    </button>
                    <button class="btn-text" style="flex: 1;" onclick="document.querySelector('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `);
    }

    startNavigation() {
        document.querySelector('.modal-overlay')?.remove();
        this.showNotification('Navigation started to hotspot', 'info');
        
        // Simulate navigation
        setTimeout(() => {
            this.showNotification('Arrived at hotspot! Surge pricing active.', 'success');
            this.generateSampleRides(true);
        }, 5000);
    }

    generateSampleRides(withSurge = false) {
        if (this.driverStatus !== 'online') return;
        
        const sampleRides = [
            {
                id: 'ride_1',
                passenger: 'Alex Johnson',
                rating: 4.8,
                pickup: 'Central Station',
                dropoff: 'Airport Terminal 3',
                distance: '12.5 km',
                fare: withSurge ? '₹450 (2.1x surge)' : '₹350',
                eta: '8 min',
                surge: withSurge ? 2.1 : 1.0,
                type: 'standard'
            },
            {
                id: 'ride_2',
                passenger: 'Sarah Williams',
                rating: 4.9,
                pickup: 'Business District',
                dropoff: 'Residential Area',
                distance: '8.2 km',
                fare: withSurge ? '₹320 (1.8x surge)' : '₹280',
                eta: '5 min',
                surge: withSurge ? 1.8 : 1.0,
                type: 'premium'
            },
            {
                id: 'ride_3',
                passenger: 'Mike Chen',
                rating: 4.5,
                pickup: 'Shopping Mall',
                dropoff: 'University Campus',
                distance: '6.7 km',
                fare: withSurge ? '₹280 (1.5x surge)' : '₹220',
                eta: '4 min',
                surge: withSurge ? 1.5 : 1.0,
                type: 'pool'
            }
        ];
        
        this.ridesQueue = sampleRides;
        this.renderRides();
        
        // Show new ride notification
        if (sampleRides.length > 0) {
            this.showNotification(`New ride available: ${sampleRides[0].pickup} → ${sampleRides[0].dropoff}`, 'info');
            this.playNotificationSound();
        }
    }

    renderRides() {
        const container = document.querySelector('.rides-list');
        if (!container) return;
        
        container.innerHTML = this.ridesQueue.map(ride => `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-header">
                    <div class="passenger-info">
                        <div class="passenger-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <h4>${ride.passenger}</h4>
                            <div class="passenger-rating">
                                <i class="fas fa-star"></i>
                                <span>${ride.rating}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${ride.surge > 1 ? `
                        <div class="surge-badge" style="background: ${this.getSurgeColor(ride.surge)}">
                            ${ride.surge}x
                        </div>
                    ` : ''}
                </div>
                
                <div class="ride-details">
                    <div class="detail-row">
                        <i class="fas fa-map-marker-alt pickup-icon"></i>
                        <div class="location-info">
                            <span class="location-label">Pickup:</span>
                            <span class="location-value">${ride.pickup}</span>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <i class="fas fa-flag-checkered dropoff-icon"></i>
                        <div class="location-info">
                            <span class="location-label">Dropoff:</span>
                            <span class="location-value">${ride.dropoff}</span>
                        </div>
                    </div>
                    
                    <div class="ride-metrics">
                        <div class="metric">
                            <i class="fas fa-road"></i>
                            <span>${ride.distance}</span>
                        </div>
                        <div class="metric">
                            <i class="fas fa-rupee-sign"></i>
                            <span>${ride.fare}</span>
                        </div>
                        <div class="metric">
                            <i class="fas fa-clock"></i>
                            <span>${ride.eta}</span>
                        </div>
                    </div>
                </div>
                
                <div class="ride-actions">
                    <button class="btn-primary accept-ride">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="btn-text decline-ride">
                        <i class="fas fa-times"></i> Decline
                    </button>
                    <button class="btn-text navigate-ride">
                        <i class="fas fa-directions"></i> Navigate
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add styles if not already present
        if (!document.querySelector('#rides-styles')) {
            const style = document.createElement('style');
            style.id = 'rides-styles';
            style.textContent = `
                .rides-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .ride-card {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    padding: 1.25rem;
                    transition: var(--transition);
                }
                
                .ride-card:hover {
                    border-color: var(--primary-blue);
                    box-shadow: var(--shadow-sm);
                }
                
                .ride-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1rem;
                }
                
                .passenger-info {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .passenger-avatar {
                    width: 40px;
                    height: 40px;
                    background: var(--background-alt);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .passenger-avatar i {
                    color: var(--primary-blue);
                    font-size: 1.2rem;
                }
                
                .passenger-info h4 {
                    font-size: 1rem;
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }
                
                .passenger-rating {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-size: 0.85rem;
                    color: var(--warning);
                }
                
                .surge-badge {
                    color: white;
                    padding: 0.25rem 0.75rem;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 600;
                }
                
                .ride-details {
                    margin-bottom: 1rem;
                }
                
                .detail-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.75rem;
                }
                
                .detail-row i {
                    color: var(--text-light);
                    width: 20px;
                    text-align: center;
                }
                
                .pickup-icon {
                    color: var(--success) !important;
                }
                
                .dropoff-icon {
                    color: var(--primary-blue) !important;
                }
                
                .location-info {
                    flex: 1;
                }
                
                .location-label {
                    display: block;
                    font-size: 0.8rem;
                    color: var(--text-light);
                }
                
                .location-value {
                    display: block;
                    font-size: 0.95rem;
                    font-weight: 500;
                }
                
                .ride-metrics {
                    display: flex;
                    justify-content: space-between;
                    background: var(--background-alt);
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    margin-top: 1rem;
                }
                
                .metric {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.25rem;
                }
                
                .metric i {
                    color: var(--primary-blue);
                    font-size: 1.1rem;
                }
                
                .metric span {
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                
                .ride-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .ride-actions .btn-primary {
                    flex: 2;
                }
                
                .ride-actions .btn-text {
                    flex: 1;
                }
            `;
            document.head.appendChild(style);
        }
    }

    acceptRide(rideId) {
        const ride = this.ridesQueue.find(r => r.id === rideId);
        if (!ride) return;
        
        // Remove from queue
        this.ridesQueue = this.ridesQueue.filter(r => r.id !== rideId);
        this.renderRides();
        
        // Set as current ride
        this.currentRide = ride;
        this.driverStatus = 'on_trip';
        this.updateDriverStatus();
        
        // Update stats
        this.driverStats.today.rides += 1;
        const fareAmount = parseInt(ride.fare.replace(/[^0-9]/g, ''));
        this.driverStats.today.earnings += fareAmount;
        this.saveDriverData();
        this.updateStatsDisplay();
        
        // Show ride accepted modal
        this.showRideAcceptedModal(ride);
        
        this.showNotification(`Ride accepted! Heading to ${ride.pickup}`, 'success');
    }

    showRideAcceptedModal(ride) {
        const modalContent = `
            <div style="padding: 1rem;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success);"></i>
                    <h4 style="margin-top: 1rem;">Ride Accepted!</h4>
                </div>
                
                <div class="ride-summary">
                    <div class="summary-item" style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                        <span style="color: var(--text-light);">Passenger:</span>
                        <span style="font-weight: 600;">${ride.passenger}</span>
                    </div>
                    
                    <div class="summary-item" style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                        <span style="color: var(--text-light);">Pickup:</span>
                        <span style="font-weight: 600;">${ride.pickup}</span>
                    </div>
                    
                    <div class="summary-item" style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                        <span style="color: var(--text-light);">Destination:</span>
                        <span style="font-weight: 600;">${ride.dropoff}</span>
                    </div>
                    
                    <div class="summary-item" style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
                        <span style="color: var(--text-light);">Fare:</span>
                        <span style="font-weight: 600; color: var(--success);">${ride.fare}</span>
                    </div>
                </div>
                
                <div class="navigation-actions" style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="flex: 1;" onclick="cabModule.startRideNavigation()">
                        <i class="fas fa-directions"></i> Start Navigation
                    </button>
                    <button class="btn-text" style="flex: 1;" onclick="cabModule.cancelRide()">
                        Cancel Ride
                    </button>
                </div>
            </div>
        `;
        
        window.app.showModal('Ride Accepted', modalContent);
    }

    startRideNavigation() {
        document.querySelector('.modal-overlay')?.remove();
        
        // Show navigation screen
        const navScreen = document.createElement('div');
        navScreen.id = 'navigationScreen';
        navScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--background);
            z-index: 10000;
            display: flex;
            flex-direction: column;
        `;
        
        navScreen.innerHTML = `
            <div style="padding: 1rem; border-bottom: 1px solid var(--border);">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <button onclick="cabModule.closeNavigation()" style="
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        color: var(--text-light);
                        cursor: pointer;
                    ">&times;</button>
                    <h3 style="margin: 0;">Navigation</h3>
                </div>
            </div>
            
            <div style="flex: 1; padding: 1rem;">
                <div class="nav-info" style="margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: var(--success);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                        ">
                            <i class="fas fa-map-marker-alt"></i>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">Picking up</div>
                            <div style="font-weight: 600;">${this.currentRide?.pickup || 'Location'}</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: var(--primary-blue);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                        ">
                            <i class="fas fa-flag-checkered"></i>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">Destination</div>
                            <div style="font-weight: 600;">${this.currentRide?.dropoff || 'Location'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="nav-stats" style="
                    background: var(--background-alt);
                    border-radius: var(--radius-md);
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                ">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">ETA to Pickup</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">${this.currentRide?.eta || '5 min'}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.9rem; color: var(--text-light);">Distance</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">${this.currentRide?.distance || '8.2 km'}</div>
                        </div>
                    </div>
                </div>
                
                <div id="navMap" style="
                    height: 200px;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    margin-bottom: 1.5rem;
                "></div>
                
                <div class="nav-actions" style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="flex: 1;" onclick="cabModule.arrivedAtPickup()">
                        <i class="fas fa-check"></i> Arrived at Pickup
                    </button>
                    <button class="btn-text" style="flex: 1;" onclick="cabModule.cancelRide()">
                        Cancel Ride
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(navScreen);
        
        // Initialize mini map
        setTimeout(() => {
            const miniMap = new SmartRoadsMap('navMap', {
                center: [20.5937, 78.9629],
                zoom: 15,
                trafficOverlay: true,
                markers: true,
                routes: true
            });
            
            // Add route on mini map
            setTimeout(() => {
                miniMap.addRoute(
                    [20.5937, 78.9629],
                    [20.5937 + 0.02, 78.9629 + 0.02]
                );
            }, 1000);
        }, 100);
    }

    closeNavigation() {
        document.getElementById('navigationScreen')?.remove();
    }

    arrivedAtPickup() {
        this.closeNavigation();
        
        // Show pickup confirmation
        window.app.showModal('Passenger Pickup', `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-user-check" style="font-size: 3rem; color: var(--success); margin-bottom: 1rem;"></i>
                <h4>Passenger Pickup</h4>
                <p>Confirm that you've picked up the passenger:</p>
                
                <div style="margin: 1.5rem 0;">
                    <button class="btn-primary" style="width: 100%; margin-bottom: 0.5rem;" 
                            onclick="cabModule.confirmPickup()">
                        <i class="fas fa-check"></i> Confirm Pickup
                    </button>
                    <button class="btn-text" style="width: 100%;" 
                            onclick="cabModule.passengerNotHere()">
                        Passenger Not Here
                    </button>
                </div>
            </div>
        `);
    }

    confirmPickup() {
        document.querySelector('.modal-overlay')?.remove();
        
        // Start trip to destination
        this.showNavigationToDestination();
        
        this.showNotification('Pickup confirmed. Starting trip...', 'success');
    }

    passengerNotHere() {
        document.querySelector('.modal-overlay')?.remove();
        
        // Show waiting options
        window.app.showModal('Passenger Not Found', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">Passenger Not at Location</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: var(--text-light); margin-bottom: 1rem;">
                        What would you like to do?
                    </p>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <button class="btn-text" style="text-align: left; padding: 1rem;" 
                                onclick="cabModule.waitForPassenger()">
                            <i class="fas fa-clock"></i> Wait (5 min max)
                        </button>
                        <button class="btn-text" style="text-align: left; padding: 1rem;" 
                                onclick="cabModule.callPassenger()">
                            <i class="fas fa-phone"></i> Call Passenger
                        </button>
                        <button class="btn-text" style="text-align: left; padding: 1rem; color: var(--danger);" 
                                onclick="cabModule.cancelNoShow()">
                            <i class="fas fa-times"></i> Cancel (No Show)
                        </button>
                    </div>
                </div>
            </div>
        `);
    }

    waitForPassenger() {
        document.querySelector('.modal-overlay')?.remove();
        
        // Start waiting timer
        let waitTime = 300; // 5 minutes in seconds
        
        const waitModal = document.createElement('div');
        waitModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        waitModal.innerHTML = `
            <div style="
                background: var(--background);
                border-radius: var(--radius-lg);
                padding: 2rem;
                text-align: center;
                max-width: 300px;
                width: 90%;
            ">
                <i class="fas fa-clock" style="font-size: 3rem; color: var(--warning); margin-bottom: 1rem;"></i>
                <h4>Waiting for Passenger</h4>
                <p style="color: var(--text-light); margin: 1rem 0;">
                    Waiting at pickup location...
                </p>
                
                <div class="wait-timer" style="
                    font-size: 2rem;
                    font-weight: 700;
                    margin: 1.5rem 0;
                    font-family: monospace;
                ">05:00</div>
                
                <button class="btn-primary" onclick="cabModule.stopWaiting()" style="width: 100%;">
                    Stop Waiting
                </button>
            </div>
        `;
        
        document.body.appendChild(waitModal);
        
        // Start countdown
        const waitTimer = setInterval(() => {
            waitTime--;
            const timerElement = waitModal.querySelector('.wait-timer');
            if (timerElement) {
                const minutes = Math.floor(waitTime / 60);
                const seconds = waitTime % 60;
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            if (waitTime <= 0) {
                clearInterval(waitTimer);
                cabModule.cancelNoShow();
            }
        }, 1000);
        
        // Store reference for cleanup
        this.waitModal = waitModal;
        this.waitTimer = waitTimer;
    }

    stopWaiting() {
        if (this.waitTimer) {
            clearInterval(this.waitTimer);
            this.waitTimer = null;
        }
        
        if (this.waitModal) {
            this.waitModal.remove();
            this.waitModal = null;
        }
        
        this.cancelNoShow();
    }

    callPassenger() {
        document.querySelector('.modal-overlay')?.remove();
        
        // Simulate calling
        window.app.showModal('Calling Passenger', `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-phone" style="font-size: 3rem; color: var(--primary-blue); margin-bottom: 1rem;"></i>
                <h4>Calling Passenger</h4>
                <p style="color: var(--text-light); margin: 1.5rem 0;">
                    Calling ${this.currentRide?.passenger || 'passenger'}...
                </p>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="flex: 1;" onclick="cabModule.endCall()">
                        End Call
                    </button>
                    <button class="btn-text" style="flex: 1;" onclick="cabModule.sendMessage()">
                        Send Message
                    </button>
                </div>
            </div>
        `);
    }

    endCall() {
        document.querySelector('.modal-overlay')?.remove();
        this.showNotification('Call ended', 'info');
    }

    sendMessage() {
        document.querySelector('.modal-overlay')?.remove();
        
        window.app.showModal('Send Message', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">Message Passenger</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <textarea placeholder="Type your message here..." style="
                        width: 100%;
                        height: 100px;
                        padding: 0.75rem;
                        border: 1px solid var(--border);
                        border-radius: var(--radius-md);
                        font-family: inherit;
                        resize: vertical;
                    "></textarea>
                </div>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="flex: 1;" onclick="cabModule.sendQuickMessage()">
                        Send Message
                    </button>
                    <button class="btn-text" style="flex: 1;" onclick="document.querySelector('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `);
    }

    sendQuickMessage() {
        document.querySelector('.modal-overlay')?.remove();
        this.showNotification('Message sent to passenger', 'success');
    }

    cancelNoShow() {
        // Clean up waiting modal
        if (this.waitModal) {
            this.waitModal.remove();
            this.waitModal = null;
        }
        
        if (this.waitTimer) {
            clearInterval(this.waitTimer);
            this.waitTimer = null;
        }
        
        document.querySelector('.modal-overlay')?.remove();
        
        // Cancel ride due to no show
        this.currentRide = null;
        this.driverStatus = 'online';
        this.updateDriverStatus();
        
        // Charge cancellation fee
        this.driverStats.today.earnings += 50; // Cancellation fee
        this.saveDriverData();
        this.updateStatsDisplay();
        
        this.showNotification('Ride cancelled. ₹50 cancellation fee applied.', 'warning');
    }

    showNavigationToDestination() {
        // Similar to pickup navigation but for destination
        this.startRideNavigation();
        
        // Update navigation screen for destination
        setTimeout(() => {
            const navScreen = document.getElementById('navigationScreen');
            if (navScreen) {
                const pickupDiv = navScreen.querySelector('.nav-info > div:first-child');
                if (pickupDiv) {
                    pickupDiv.querySelector('div:first-child').textContent = 'Current location';
                    pickupDiv.querySelector('div:last-child').textContent = 'En route to destination';
                    pickupDiv.querySelector('.fa-map-marker-alt').parentElement.style.background = 'var(--warning)';
                }
                
                const actionBtn = navScreen.querySelector('.nav-actions .btn-primary');
                if (actionBtn) {
                    actionBtn.innerHTML = '<i class="fas fa-flag-checkered"></i> Arrived at Destination';
                    actionBtn.onclick = () => cabModule.completeRide();
                }
            }
        }, 100);
    }

    completeRide() {
        this.closeNavigation();
        
        // Show completion modal
        window.app.showModal('Ride Completed', `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-flag-checkered" style="font-size: 3rem; color: var(--success); margin-bottom: 1rem;"></i>
                <h4>Ride Completed!</h4>
                <p style="color: var(--text-light); margin: 1.5rem 0;">
                    Thank you for completing the ride.
                </p>
                
                <div style="
                    background: var(--background-alt);
                    border-radius: var(--radius-md);
                    padding: 1.5rem;
                    margin: 1.5rem 0;
                ">
                    <div style="font-size: 0.9rem; color: var(--text-light);">Earnings from this ride</div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--success);">
                        ${this.currentRide?.fare || '₹350'}
                    </div>
                </div>
                
                <button class="btn-primary" style="width: 100%;" onclick="cabModule.ratePassenger()">
                    <i class="fas fa-star"></i> Rate Passenger
                </button>
            </div>
        `);
        
        // Update driver status
        this.currentRide = null;
        this.driverStatus = 'online';
        this.updateDriverStatus();
        
        // Generate new rides
        setTimeout(() => this.generateSampleRides(), 2000);
    }

    ratePassenger() {
        document.querySelector('.modal-overlay')?.remove();
        
        window.app.showModal('Rate Passenger', `
            <div style="text-align: center; padding: 2rem;">
                <h4 style="margin-bottom: 1.5rem;">How was your passenger?</h4>
                
                <div class="rating-stars" style="font-size: 2rem; color: var(--warning); margin-bottom: 2rem;">
                    ${[1, 2, 3, 4, 5].map(star => `
                        <i class="far fa-star" data-rating="${star}" 
                           onclick="cabModule.setRating(${star})"
                           style="cursor: pointer; margin: 0 0.25rem;"></i>
                    `).join('')}
                </div>
                
                <textarea placeholder="Optional feedback..." style="
                    width: 100%;
                    height: 80px;
                    padding: 0.75rem;
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    margin-bottom: 1.5rem;
                    font-family: inherit;
                    resize: vertical;
                "></textarea>
                
                <button class="btn-primary" style="width: 100%;" onclick="cabModule.submitRating()">
                    <i class="fas fa-check"></i> Submit Rating
                </button>
            </div>
        `);
    }

    setRating(rating) {
        const stars = document.querySelectorAll('.rating-stars i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.className = 'fas fa-star';
            } else {
                star.className = 'far fa-star';
            }
        });
        
        this.passengerRating = rating;
    }

    submitRating() {
        document.querySelector('.modal-overlay')?.remove();
        this.showNotification(`Rated passenger ${this.passengerRating} stars`, 'success');
        this.passengerRating = null;
    }

    declineRide(rideId) {
        this.ridesQueue = this.ridesQueue.filter(r => r.id !== rideId);
        this.renderRides();
        this.showNotification('Ride declined', 'info');
    }

    navigateToRide(rideId) {
        const ride = this.ridesQueue.find(r => r.id === rideId);
        if (!ride) return;
        
        // Show navigation to pickup
        window.app.showModal('Navigate to Pickup', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">Navigate to Pickup</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <i class="fas fa-map-marker-alt" style="color: var(--success);"></i>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">Pickup Location</div>
                            <div style="font-weight: 600;">${ride.pickup}</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; background: var(--background-alt); padding: 1rem; border-radius: var(--radius-md);">
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">ETA</div>
                            <div style="font-size: 1.25rem; font-weight: 600;">${ride.eta}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">Distance</div>
                            <div style="font-size: 1.25rem; font-weight: 600;">${ride.distance}</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="flex: 1;" onclick="cabModule.startNavigationToRide('${rideId}')">
                        <i class="fas fa-directions"></i> Start Navigation
                    </button>
                    <button class="btn-text" style="flex: 1;" onclick="document.querySelector('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `);
    }

    startNavigationToRide(rideId) {
        document.querySelector('.modal-overlay')?.remove();
        this.showNotification('Navigation started to pickup location', 'info');
    }

    cancelRide() {
        this.closeNavigation();
        document.querySelector('.modal-overlay')?.remove();
        
        this.currentRide = null;
        this.driverStatus = 'online';
        this.updateDriverStatus();
        
        this.showNotification('Ride cancelled', 'warning');
    }

    updateStatsDisplay() {
        const statsGrid = document.querySelector('.stats-grid');
        if (!statsGrid) return;
        
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(0, 119, 252, 0.1);">
                    <i class="fas fa-car" style="color: var(--primary-blue);"></i>
                </div>
                <div class="stat-content">
                    <h4>${this.driverStats.today.rides}</h4>
                    <p>Rides Today</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(40, 167, 69, 0.1);">
                    <i class="fas fa-rupee-sign" style="color: var(--success);"></i>
                </div>
                <div class="stat-content">
                    <h4>₹${this.driverStats.today.earnings}</h4>
                    <p>Earnings Today</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(255, 193, 7, 0.1);">
                    <i class="fas fa-star" style="color: var(--warning);"></i>
                </div>
                <div class="stat-content">
                    <h4>${this.driverStats.today.rating}</h4>
                    <p>Rating</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(23, 162, 184, 0.1);">
                    <i class="fas fa-clock" style="color: var(--info);"></i>
                </div>
                <div class="stat-content">
                    <h4>${this.driverStats.today.onlineHours}h</h4>
                    <p>Online Today</p>
                </div>
            </div>
        `;
        
        // Add styles if needed
        if (!document.querySelector('#stats-styles')) {
            const style = document.createElement('style');
            style.id = 'stats-styles';
            style.textContent = `
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .stat-card {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .stat-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .stat-icon i {
                    font-size: 1.5rem;
                }
                
                .stat-content h4 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin-bottom: 0.25rem;
                }
                
                .stat-content p {
                    font-size: 0.85rem;
                    color: var(--text-light);
                }
            `;
            document.head.appendChild(style);
        }
    }

    startRideMatching() {
        // Start generating rides periodically when online
        this.rideMatchingInterval = setInterval(() => {
            if (this.driverStatus === 'online' && this.ridesQueue.length < 3) {
                this.generateSampleRides();
            }
        }, 15000); // Every 15 seconds
    }

    stopRideMatching() {
        if (this.rideMatchingInterval) {
            clearInterval(this.rideMatchingInterval);
            this.rideMatchingInterval = null;
        }
    }

    showHeatmap() {
        window.app.showModal('Demand Heatmap', `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-fire" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                <h4>Demand Heatmap</h4>
                <p style="color: var(--text-light); margin: 1.5rem 0;">
                    Shows areas with high ride demand in real-time.
                </p>
                
                <div style="
                    background: var(--background-alt);
                    border-radius: var(--radius-md);
                    padding: 1.5rem;
                    margin: 1.5rem 0;
                    text-align: left;
                ">
                    <h5 style="margin-bottom: 1rem;">Hot Zones (Now):</h5>
                    <ul style="padding-left: 1.5rem; color: var(--text-light);">
                        <li>Downtown - 2.1x surge</li>
                        <li>Business District - 1.8x surge</li>
                        <li>Airport - 1.5x surge</li>
                    </ul>
                </div>
                
                <button class="btn-primary" style="width: 100%;" onclick="cabModule.navigateToHotspot()">
                    <i class="fas fa-map-marker-alt"></i> Navigate to Hot Zone
                </button>
            </div>
        `);
    }

    showSurgeAreas() {
        // This would show surge areas on map
        if (this.map && this.map.map) {
            this.map.map.setView([20.5925, 78.9625], 14);
            this.showNotification('Showing surge areas on map', 'info');
        }
    }

    showEarnings() {
        window.app.showModal('Earnings Summary', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1.5rem;">Earnings Summary</h4>
                
                <div style="margin-bottom: 2rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                        <span style="color: var(--text-light);">Today's Earnings:</span>
                        <span style="font-weight: 600; color: var(--success);">₹${this.driverStats.today.earnings}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                        <span style="color: var(--text-light);">This Week:</span>
                        <span style="font-weight: 600;">₹${this.driverStats.weekly.earnings}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                        <span style="color: var(--text-light);">Total Rides:</span>
                        <span style="font-weight: 600;">${this.driverStats.weekly.rides}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-light);">Average Rating:</span>
                        <span style="font-weight: 600; color: var(--warning);">${this.driverStats.weekly.rating}</span>
                    </div>
                </div>
                
                <button class="btn-primary" style="width: 100%;" onclick="cabModule.withdrawEarnings()">
                    <i class="fas fa-wallet"></i> Withdraw Earnings
                </button>
            </div>
        `);
    }

    withdrawEarnings() {
        document.querySelector('.modal-overlay')?.remove();
        
        window.app.showModal('Withdraw Earnings', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">Withdraw to Bank Account</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <div style="
                        background: var(--background-alt);
                        border-radius: var(--radius-md);
                        padding: 1rem;
                        margin-bottom: 1rem;
                    ">
                        <div style="font-size: 0.9rem; color: var(--text-light);">Available Balance</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">
                            ₹${this.driverStats.today.earnings + this.driverStats.weekly.earnings}
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label class="input-label">Amount to Withdraw (₹)</label>
                        <input type="number" class="form-input" value="${this.driverStats.today.earnings}" 
                               min="100" max="${this.driverStats.today.earnings}">
                    </div>
                </div>
                
                <button class="btn-primary" style="width: 100%;" onclick="cabModule.confirmWithdrawal()">
                    <i class="fas fa-check"></i> Confirm Withdrawal
                </button>
            </div>
        `);
    }

    confirmWithdrawal() {
        document.querySelector('.modal-overlay')?.remove();
        this.showNotification('Withdrawal request submitted. Funds will arrive in 2-4 hours.', 'success');
    }

    endDay() {
        if (this.driverStatus === 'on_trip') {
            this.showNotification('Cannot end day while on a trip', 'error');
            return;
        }
        
        window.app.showModal('End Driving Day', `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-sun" style="font-size: 3rem; color: var(--warning); margin-bottom: 1rem;"></i>
                <h4>End Driving Day</h4>
                <p style="color: var(--text-light); margin: 1.5rem 0;">
                    Are you sure you want to end your driving day?
                </p>
                
                <div style="
                    background: var(--background-alt);
                    border-radius: var(--radius-md);
                    padding: 1.5rem;
                    margin: 1.5rem 0;
                ">
                    <div style="font-size: 0.9rem; color: var(--text-light);">Today's Summary</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--success); margin-top: 0.5rem;">
                        ₹${this.driverStats.today.earnings}
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-light); margin-top: 0.25rem;">
                        ${this.driverStats.today.rides} rides • ${this.driverStats.today.onlineHours} hours online
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="flex: 1;" onclick="cabModule.confirmEndDay()">
                        <i class="fas fa-check"></i> End Day
                    </button>
                    <button class="btn-text" style="flex: 1;" onclick="document.querySelector('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `);
    }

    confirmEndDay() {
        document.querySelector('.modal-overlay')?.remove();
        
        // Go offline
        this.driverStatus = 'offline';
        this.updateDriverStatus();
        
        // Reset today's stats
        this.driverStats.today = {
            rides: 0,
            earnings: 0,
            distance: 0,
            onlineHours: 0,
            rating: 4.8
        };
        
        this.saveDriverData();
        this.updateStatsDisplay();
        
        this.showNotification('Driving day ended. Great work today!', 'success');
    }

    showSupport() {
        window.app.showModal('Driver Support', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1.5rem;">Driver Support</h4>
                
                <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem;">
                    <button class="btn-text" style="text-align: left; padding: 1rem;" 
                            onclick="cabModule.contactSupport('safety')">
                        <i class="fas fa-shield-alt"></i> Safety Issues
                    </button>
                    
                    <button class="btn-text" style="text-align: left; padding: 1rem;" 
                            onclick="cabModule.contactSupport('payment')">
                        <i class="fas fa-rupee-sign"></i> Payment Issues
                    </button>
                    
                    <button class="btn-text" style="text-align: left; padding: 1rem;" 
                            onclick="cabModule.contactSupport('technical')">
                        <i class="fas fa-tools"></i> Technical Support
                    </button>
                    
                    <button class="btn-text" style="text-align: left; padding: 1rem;" 
                            onclick="cabModule.contactSupport('account')">
                        <i class="fas fa-user-cog"></i> Account Issues
                    </button>
                </div>
                
                <div style="text-align: center; color: var(--text-light); font-size: 0.9rem;">
                    <p>24/7 Support Available</p>
                    <p><strong>Call:</strong> 1800-123-4567</p>
                </div>
            </div>
        `);
    }

    contactSupport(issueType) {
        document.querySelector('.modal-overlay')?.remove();
        
        const issueLabels = {
            safety: 'Safety Issues',
            payment: 'Payment Issues',
            technical: 'Technical Support',
            account: 'Account Issues'
        };
        
        this.showNotification(`Connecting you to ${issueLabels[issueType]} support...`, 'info');
        
        // In a real app, this would initiate a call or chat
        setTimeout(() => {
            window.app.showModal('Support Connected', `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-headset" style="font-size: 3rem; color: var(--primary-blue); margin-bottom: 1rem;"></i>
                    <h4>Support Connected</h4>
                    <p style="color: var(--text-light); margin: 1.5rem 0;">
                        You are now connected to ${issueLabels[issueType]} support.
                    </p>
                    
                    <div style="
                        background: var(--background-alt);
                        border-radius: var(--radius-md);
                        padding: 1rem;
                        margin: 1.5rem 0;
                    ">
                        <p style="margin: 0;">Support Agent: <strong>Priya Sharma</strong></p>
                        <p style="margin: 0.5rem 0 0 0;">Estimated wait: <strong>2 minutes</strong></p>
                    </div>
                    
                    <button class="btn-primary" style="width: 100%;" 
                            onclick="document.querySelector('.modal-overlay').remove()">
                        <i class="fas fa-times"></i> End Support
                    </button>
                </div>
            `);
        }, 1000);
    }

    initRealtimeUpdates() {
        // Update driver stats periodically
        setInterval(() => {
            if (this.driverStatus === 'online') {
                this.driverStats.today.onlineHours += 0.0167; // Add 1 minute
                this.saveDriverData();
                this.updateStatsDisplay();
            }
        }, 60000); // Every minute
        
        // Update traffic and surge data
        setInterval(() => {
            this.generateSmartSuggestions();
        }, 300000); // Every 5 minutes
    }

    showZoneDetails(zone) {
        window.app.showModal(zone.name, `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">${zone.name}</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: ${this.getSurgeColor(zone.surge)};
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: 600;
                        ">
                            ${zone.surge}x
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">Surge Multiplier</div>
                            <div style="font-size: 1.25rem; font-weight: 600;">${zone.surge}x Active</div>
                        </div>
                    </div>
                    
                    <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                        <div style="font-size: 0.9rem; color: var(--text-light); margin-bottom: 0.5rem;">Demand Level</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: ${zone.demand === 'Very High' ? 'var(--danger)' : 'var(--warning)'}">
                            ${zone.demand}
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h5 style="margin-bottom: 0.75rem;">Why it's hot:</h5>
                    <ul style="padding-left: 1.5rem; color: var(--text-light);">
                        <li>Office rush hour (5-7 PM)</li>
                        <li>Multiple event venues</li>
                        <li>Limited cab availability</li>
                        <li>Public transport closure</li>
                    </ul>
                </div>
                
                <button class="btn-primary" style="width: 100%;" onclick="cabModule.navigateToZone()">
                    <i class="fas fa-directions"></i> Navigate to ${zone.name}
                </button>
            </div>
        `);
    }

    navigateToZone() {
        document.querySelector('.modal-overlay')?.remove();
        this.showNotification('Navigation started to surge zone', 'info');
    }

    playNotificationSound() {
        // Create and play notification sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Audio not supported or blocked');
        }
    }

    showNotification(message, type = 'info') {
        // Use the existing app notification system
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            // Fallback notification
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Initialize module
let cabModule;

document.addEventListener('DOMContentLoaded', () => {
    cabModule = new CabDriversModule();
    
    // Handle back button in PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.querySelector('.standalone-back')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }
    
    // Export for use in HTML onclick handlers
    window.cabModule = cabModule;
});