// Delivery Drivers Module - Live Parcel Tracking
class DeliveryModule {
    constructor() {
        this.deliveries = [];
        this.activeDelivery = null;
        this.driverLocation = null;
        this.optimizedRoute = null;
        this.driverStats = {};
        this.customerView = false;
        
        this.init();
    }

    init() {
        this.loadDeliveries();
        this.initEventListeners();
        this.initMap();
        this.initRealtimeUpdates();
        this.updateStats();
        this.simulateLiveTracking();
    }

    loadDeliveries() {
        const savedData = localStorage.getItem('smartroads_deliveries');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.deliveries = data.deliveries || [];
            this.driverStats = data.stats || this.getDefaultStats();
        } else {
            this.deliveries = this.generateSampleDeliveries();
            this.driverStats = this.getDefaultStats();
            this.saveData();
        }
    }

    getDefaultStats() {
        return {
            today: {
                deliveries: 0,
                completed: 0,
                onTime: 0,
                distance: 0,
                earnings: 0
            },
            weekly: {
                deliveries: 45,
                completed: 43,
                onTime: 40,
                distance: 320,
                earnings: 5200
            }
        };
    }

    generateSampleDeliveries() {
        return [
            {
                id: 'DEL-001',
                trackingNumber: 'TRK789456123',
                customer: 'Rajesh Kumar',
                phone: '+91 9876543210',
                address: '123 Main Street, Downtown',
                destination: '456 Park Avenue, Business District',
                status: 'in_transit',
                priority: 'express',
                weight: '2.5 kg',
                dimensions: '30x20x15 cm',
                estimatedDelivery: '30 min',
                actualDelivery: null,
                pickupTime: new Date(Date.now() - 30 * 60000).toISOString(),
                notes: 'Fragile - Handle with care',
                payment: 'Cash on Delivery',
                amount: 350,
                location: {
                    lat: 20.5937 + 0.005,
                    lng: 78.9629 + 0.005,
                    accuracy: 50
                },
                routeProgress: 65,
                delay: 0
            },
            {
                id: 'DEL-002',
                trackingNumber: 'TRK123456789',
                customer: 'Priya Sharma',
                phone: '+91 9876543211',
                address: '789 Mall Road, Shopping District',
                destination: '101 Tech Park, IT Zone',
                status: 'pending',
                priority: 'standard',
                weight: '5.0 kg',
                dimensions: '40x30x25 cm',
                estimatedDelivery: '45 min',
                actualDelivery: null,
                pickupTime: null,
                notes: 'Leave at reception if no answer',
                payment: 'Prepaid',
                amount: 0,
                location: {
                    lat: 20.5937 - 0.005,
                    lng: 78.9629 - 0.005,
                    accuracy: 50
                },
                routeProgress: 0,
                delay: 0
            },
            {
                id: 'DEL-003',
                trackingNumber: 'TRK456789123',
                customer: 'Amit Patel',
                phone: '+91 9876543212',
                address: '234 Industrial Area',
                destination: '567 Residential Complex',
                status: 'delivered',
                priority: 'standard',
                weight: '1.2 kg',
                dimensions: '25x15x10 cm',
                estimatedDelivery: '20 min',
                actualDelivery: new Date(Date.now() - 60 * 60000).toISOString(),
                pickupTime: new Date(Date.now() - 80 * 60000).toISOString(),
                notes: 'Signed by neighbor',
                payment: 'Card on Delivery',
                amount: 150,
                location: null,
                routeProgress: 100,
                delay: 5
            }
        ];
    }

    saveData() {
        const data = {
            deliveries: this.deliveries,
            stats: this.driverStats,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('smartroads_deliveries', JSON.stringify(data));
    }

    initEventListeners() {
        // View toggle buttons
        document.getElementById('toggleView')?.addEventListener('click', () => this.toggleView());
        document.getElementById('customerViewBtn')?.addEventListener('click', () => this.setCustomerView(true));
        document.getElementById('driverViewBtn')?.addEventListener('click', () => this.setCustomerView(false));

        // Delivery actions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.start-delivery')) {
                const deliveryId = e.target.closest('.delivery-card').dataset.deliveryId;
                this.startDelivery(deliveryId);
            }
            
            if (e.target.closest('.update-status')) {
                const deliveryId = e.target.closest('.delivery-card').dataset.deliveryId;
                this.showStatusUpdateModal(deliveryId);
            }
            
            if (e.target.closest('.mark-delivered')) {
                const deliveryId = e.target.closest('.delivery-card').dataset.deliveryId;
                this.markAsDelivered(deliveryId);
            }
            
            if (e.target.closest('.report-delay')) {
                const deliveryId = e.target.closest('.delivery-card').dataset.deliveryId;
                this.reportDelay(deliveryId);
            }
            
            if (e.target.closest('.navigate-delivery')) {
                const deliveryId = e.target.closest('.delivery-card').dataset.deliveryId;
                this.navigateToDelivery(deliveryId);
            }
            
            if (e.target.closest('.view-details')) {
                const deliveryId = e.target.closest('.delivery-card').dataset.deliveryId;
                this.showDeliveryDetails(deliveryId);
            }
        });

        // Quick actions
        document.getElementById('scanParcel')?.addEventListener('click', () => this.scanParcel());
        document.getElementById('optimizeRoute')?.addEventListener('click', () => this.optimizeRoute());
        document.getElementById('newDelivery')?.addEventListener('click', () => this.addNewDelivery());
        document.getElementById('viewAll')?.addEventListener('click', () => this.showAllDeliveries());

        // Map controls
        document.getElementById('showAllParcels')?.addEventListener('click', () => this.showAllParcelsOnMap());
        document.getElementById('centerOnDriver')?.addEventListener('click', () => this.centerOnDriver());
        document.getElementById('toggleTraffic')?.addEventListener('click', () => this.toggleTrafficLayer());
    }

    initMap() {
        const mapContainer = document.getElementById('deliveryMap');
        if (mapContainer) {
            this.map = new SmartRoadsMap('deliveryMap', {
                center: [20.5937, 78.9629],
                zoom: 13,
                trafficOverlay: true,
                markers: true,
                routes: false
            });
            
            // Add driver location
            this.addDriverLocation();
            
            // Add delivery locations
            this.addDeliveryMarkers();
            
            // Add warehouses/pickup points
            this.addWarehouses();
        }
    }

    addDriverLocation() {
        if (!this.map || !this.map.map) return;
        
        // Get current location or use default
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    this.driverLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    this.driverMarker = this.map.addMarker(
                        [this.driverLocation.lat, this.driverLocation.lng],
                        'Your Location',
                        'user'
                    );
                    
                    // Center map on driver
                    this.map.map.setView([this.driverLocation.lat, this.driverLocation.lng], 15);
                },
                () => {
                    // Use default location
                    this.driverLocation = { lat: 20.5937, lng: 78.9629 };
                    this.driverMarker = this.map.addMarker(
                        [this.driverLocation.lat, this.driverLocation.lng],
                        'Your Location',
                        'user'
                    );
                }
            );
        } else {
            this.driverLocation = { lat: 20.5937, lng: 78.9629 };
            this.driverMarker = this.map.addMarker(
                [this.driverLocation.lat, this.driverLocation.lng],
                'Your Location',
                'user'
            );
        }
    }

    addDeliveryMarkers() {
        if (!this.map || !this.map.map) return;
        
        this.deliveryMarkers = [];
        
        this.deliveries.forEach(delivery => {
            if (delivery.location && delivery.status !== 'delivered') {
                const icon = L.divIcon({
                    html: `
                        <div class="delivery-marker" style="
                            background: ${this.getStatusColor(delivery.status)};
                            width: 30px;
                            height: 30px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 0 10px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 12px;
                            position: relative;
                        ">
                            ${delivery.priority === 'express' ? 'E' : 'S'}
                            ${delivery.status === 'in_transit' ? `
                                <div class="pulse-ring" style="
                                    position: absolute;
                                    top: -5px;
                                    left: -5px;
                                    right: -5px;
                                    bottom: -5px;
                                    border: 2px solid ${this.getStatusColor(delivery.status)};
                                    border-radius: 50%;
                                    animation: pulse 1.5s infinite;
                                "></div>
                            ` : ''}
                        </div>
                    `,
                    className: 'delivery-marker-icon',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                
                const marker = L.marker(
                    [delivery.location.lat, delivery.location.lng],
                    { icon }
                )
                .addTo(this.map.map)
                .bindTooltip(`
                    <strong>${delivery.id}</strong><br>
                    ${delivery.customer}<br>
                    Status: ${this.getStatusText(delivery.status)}<br>
                    ETA: ${delivery.estimatedDelivery}
                `)
                .bindPopup(`
                    <div class="delivery-popup">
                        <h4>${delivery.id}</h4>
                        <p><strong>Customer:</strong> ${delivery.customer}</p>
                        <p><strong>Status:</strong> ${this.getStatusText(delivery.status)}</p>
                        <p><strong>ETA:</strong> ${delivery.estimatedDelivery}</p>
                        <p><strong>Address:</strong> ${delivery.destination}</p>
                        <button class="btn-primary" onclick="deliveryModule.navigateToDelivery('${delivery.id}')">
                            Navigate
                        </button>
                    </div>
                `);
                
                this.deliveryMarkers.push({
                    deliveryId: delivery.id,
                    marker: marker
                });
                
                // Add pulsing animation
                if (!document.querySelector('#marker-animations')) {
                    const style = document.createElement('style');
                    style.id = 'marker-animations';
                    style.textContent = `
                        @keyframes pulse {
                            0% { transform: scale(1); opacity: 1; }
                            70% { transform: scale(1.5); opacity: 0; }
                            100% { transform: scale(1.5); opacity: 0; }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        });
    }

    addWarehouses() {
        if (!this.map || !this.map.map) return;
        
        const warehouses = [
            {
                name: 'Main Warehouse',
                location: [20.5937 + 0.01, 78.9629 + 0.01],
                type: 'warehouse'
            },
            {
                name: 'Express Hub',
                location: [20.5937 - 0.01, 78.9629 - 0.01],
                type: 'hub'
            },
            {
                name: 'Sorting Center',
                location: [20.5937, 78.9629 + 0.02],
                type: 'sorting'
            }
        ];
        
        warehouses.forEach(warehouse => {
            const icon = L.divIcon({
                html: `
                    <div style="
                        background: ${warehouse.type === 'warehouse' ? '#231F20' : 
                                    warehouse.type === 'hub' ? '#DC3545' : '#0077FC'};
                        width: 25px;
                        height: 25px;
                        border-radius: 4px;
                        border: 2px solid white;
                        box-shadow: 0 0 8px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 10px;
                    ">
                        <i class="fas fa-${warehouse.type === 'warehouse' ? 'warehouse' : 
                                         warehouse.type === 'hub' ? 'bolt' : 'boxes'}"></i>
                    </div>
                `,
                className: 'warehouse-marker',
                iconSize: [25, 25],
                iconAnchor: [12.5, 12.5]
            });
            
            L.marker(warehouse.location, { icon })
                .addTo(this.map.map)
                .bindTooltip(`<strong>${warehouse.name}</strong>`);
        });
    }

    getStatusColor(status) {
        switch(status) {
            case 'pending': return '#FFC107'; // Yellow
            case 'in_transit': return '#0077FC'; // Blue
            case 'out_for_delivery': return '#17A2B8'; // Cyan
            case 'delivered': return '#28A745'; // Green
            case 'delayed': return '#DC3545'; // Red
            case 'cancelled': return '#6C757D'; // Gray
            default: return '#6C757D';
        }
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Pending Pickup',
            'in_transit': 'In Transit',
            'out_for_delivery': 'Out for Delivery',
            'delivered': 'Delivered',
            'delayed': 'Delayed',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status;
    }

    toggleView() {
        this.customerView = !this.customerView;
        this.updateView();
    }

    setCustomerView(isCustomerView) {
        this.customerView = isCustomerView;
        this.updateView();
    }

    updateView() {
        // Update UI based on view mode
        const toggleBtn = document.getElementById('toggleView');
        const customerViewBtn = document.getElementById('customerViewBtn');
        const driverViewBtn = document.getElementById('driverViewBtn');
        
        if (toggleBtn) {
            toggleBtn.innerHTML = this.customerView ? 
                '<i class="fas fa-user-tie"></i> Switch to Driver View' :
                '<i class="fas fa-user"></i> Switch to Customer View';
        }
        
        if (customerViewBtn) {
            customerViewBtn.classList.toggle('active', this.customerView);
        }
        
        if (driverViewBtn) {
            driverViewBtn.classList.toggle('active', !this.customerView);
        }
        
        // Update delivery cards display
        this.renderDeliveries();
        
        // Update map markers
        this.updateMapForView();
        
        // Show appropriate notifications
        if (this.customerView) {
            this.showNotification('Now viewing as customer', 'info');
        } else {
            this.showNotification('Now viewing as delivery agent', 'info');
        }
    }

    updateMapForView() {
        if (!this.map || !this.map.map) return;
        
        // Clear existing markers
        if (this.deliveryMarkers) {
            this.deliveryMarkers.forEach(marker => marker.marker.remove());
        }
        
        // Add markers based on view
        if (this.customerView) {
            // Customer view shows all parcels
            this.addDeliveryMarkers();
        } else {
            // Driver view shows only active deliveries
            this.addActiveDeliveryMarkers();
        }
    }

    addActiveDeliveryMarkers() {
        if (!this.map || !this.map.map) return;
        
        this.deliveryMarkers = [];
        const activeDeliveries = this.deliveries.filter(d => 
            d.status === 'in_transit' || d.status === 'out_for_delivery'
        );
        
        activeDeliveries.forEach(delivery => {
            if (delivery.location) {
                const icon = L.divIcon({
                    html: `
                        <div style="
                            background: ${this.getStatusColor(delivery.status)};
                            width: 35px;
                            height: 35px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 0 10px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 14px;
                        ">
                            ${delivery.priority === 'express' ? '🚚' : '📦'}
                        </div>
                    `,
                    className: 'active-delivery-marker',
                    iconSize: [35, 35],
                    iconAnchor: [17.5, 17.5]
                });
                
                const marker = L.marker(
                    [delivery.location.lat, delivery.location.lng],
                    { icon }
                )
                .addTo(this.map.map)
                .bindTooltip(`
                    <strong>${delivery.id}</strong><br>
                    ${delivery.customer}<br>
                    ETA: ${delivery.estimatedDelivery}
                `);
                
                this.deliveryMarkers.push({
                    deliveryId: delivery.id,
                    marker: marker
                });
            }
        });
    }

    renderDeliveries() {
        const container = document.querySelector('.deliveries-list');
        if (!container) return;
        
        if (this.customerView) {
            this.renderCustomerView(container);
        } else {
            this.renderDriverView(container);
        }
    }

    renderCustomerView(container) {
        const activeDeliveries = this.deliveries.filter(d => 
            d.status !== 'delivered' && d.status !== 'cancelled'
        );
        
        container.innerHTML = activeDeliveries.map(delivery => `
            <div class="delivery-card customer-view" data-delivery-id="${delivery.id}">
                <div class="delivery-header">
                    <div class="delivery-id">
                        <h4>${delivery.id}</h4>
                        <span class="tracking-number">${delivery.trackingNumber}</span>
                    </div>
                    <div class="delivery-status">
                        <span class="status-badge ${delivery.status}" 
                              style="background: ${this.getStatusColor(delivery.status)}">
                            ${this.getStatusText(delivery.status)}
                        </span>
                    </div>
                </div>
                
                <div class="delivery-info">
                    <div class="info-row">
                        <i class="fas fa-user"></i>
                        <div>
                            <span class="label">Customer</span>
                            <span class="value">${delivery.customer}</span>
                        </div>
                    </div>
                    
                    <div class="info-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <div>
                            <span class="label">Delivery To</span>
                            <span class="value">${delivery.destination}</span>
                        </div>
                    </div>
                    
                    <div class="info-row">
                        <i class="fas fa-clock"></i>
                        <div>
                            <span class="label">Estimated Delivery</span>
                            <span class="value">${delivery.estimatedDelivery}</span>
                        </div>
                    </div>
                </div>
                
                <div class="progress-container">
                    <div class="progress-label">
                        <span>Route Progress</span>
                        <span>${delivery.routeProgress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${delivery.routeProgress}%"></div>
                    </div>
                </div>
                
                <div class="delivery-actions">
                    <button class="btn-text view-details">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                    <button class="btn-text" onclick="deliveryModule.trackParcel('${delivery.id}')">
                        <i class="fas fa-map-marked-alt"></i> Live Track
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add styles if not present
        this.addCustomerViewStyles();
    }

    renderDriverView(container) {
        container.innerHTML = this.deliveries.map(delivery => `
            <div class="delivery-card driver-view" data-delivery-id="${delivery.id}">
                <div class="delivery-header">
                    <div class="delivery-id">
                        <h4>${delivery.id}</h4>
                        <div class="delivery-meta">
                            <span class="priority ${delivery.priority}">${delivery.priority.toUpperCase()}</span>
                            <span class="weight">${delivery.weight}</span>
                        </div>
                    </div>
                    <div class="delivery-status">
                        <span class="status-badge ${delivery.status}" 
                              style="background: ${this.getStatusColor(delivery.status)}">
                            ${this.getStatusText(delivery.status)}
                        </span>
                    </div>
                </div>
                
                <div class="delivery-details">
                    <div class="detail-row">
                        <i class="fas fa-user"></i>
                        <span>${delivery.customer}</span>
                    </div>
                    
                    <div class="detail-row">
                        <i class="fas fa-phone"></i>
                        <span>${delivery.phone}</span>
                    </div>
                    
                    <div class="detail-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${delivery.destination}</span>
                    </div>
                    
                    <div class="detail-row">
                        <i class="fas fa-clock"></i>
                        <span>ETA: ${delivery.estimatedDelivery}</span>
                    </div>
                </div>
                
                ${delivery.notes ? `
                    <div class="delivery-notes">
                        <i class="fas fa-sticky-note"></i>
                        <span>${delivery.notes}</span>
                    </div>
                ` : ''}
                
                <div class="delivery-actions">
                    ${delivery.status === 'pending' ? `
                        <button class="btn-primary start-delivery">
                            <i class="fas fa-play"></i> Start Delivery
                        </button>
                    ` : ''}
                    
                    ${delivery.status === 'in_transit' || delivery.status === 'out_for_delivery' ? `
                        <button class="btn-primary mark-delivered">
                            <i class="fas fa-check"></i> Mark Delivered
                        </button>
                        <button class="btn-text report-delay">
                            <i class="fas fa-exclamation-triangle"></i> Delay
                        </button>
                    ` : ''}
                    
                    ${delivery.status === 'delivered' ? `
                        <button class="btn-text view-details">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                    ` : ''}
                    
                    <button class="btn-text navigate-delivery">
                        <i class="fas fa-directions"></i> Navigate
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add styles if not present
        this.addDriverViewStyles();
    }

    addCustomerViewStyles() {
        if (!document.querySelector('#customer-view-styles')) {
            const style = document.createElement('style');
            style.id = 'customer-view-styles';
            style.textContent = `
                .delivery-card.customer-view {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    padding: 1.25rem;
                    margin-bottom: 1rem;
                }
                
                .delivery-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1rem;
                }
                
                .delivery-id h4 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }
                
                .tracking-number {
                    font-size: 0.8rem;
                    color: var(--text-light);
                    font-family: monospace;
                }
                
                .status-badge {
                    color: white;
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                
                .delivery-info {
                    margin-bottom: 1rem;
                }
                
                .info-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.75rem;
                }
                
                .info-row i {
                    color: var(--primary-blue);
                    width: 20px;
                }
                
                .info-row .label {
                    display: block;
                    font-size: 0.8rem;
                    color: var(--text-light);
                }
                
                .info-row .value {
                    display: block;
                    font-size: 0.95rem;
                    font-weight: 500;
                }
                
                .progress-container {
                    margin-bottom: 1rem;
                }
                
                .progress-label {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                }
                
                .progress-bar {
                    height: 8px;
                    background: var(--border);
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                .progress-fill {
                    height: 100%;
                    background: var(--primary-blue);
                    border-radius: 4px;
                    transition: width 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }
    }

    addDriverViewStyles() {
        if (!document.querySelector('#driver-view-styles')) {
            const style = document.createElement('style');
            style.id = 'driver-view-styles';
            style.textContent = `
                .delivery-card.driver-view {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    padding: 1.25rem;
                    margin-bottom: 1rem;
                }
                
                .delivery-meta {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 0.25rem;
                }
                
                .delivery-meta span {
                    padding: 0.15rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                
                .priority.express {
                    background: rgba(220, 53, 69, 0.1);
                    color: var(--danger);
                }
                
                .priority.standard {
                    background: rgba(0, 119, 252, 0.1);
                    color: var(--primary-blue);
                }
                
                .weight {
                    background: rgba(108, 117, 125, 0.1);
                    color: var(--text-light);
                }
                
                .delivery-details {
                    margin: 1rem 0;
                }
                
                .detail-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                }
                
                .detail-row i {
                    color: var(--text-light);
                    width: 20px;
                }
                
                .delivery-notes {
                    background: rgba(255, 193, 7, 0.1);
                    border-left: 3px solid var(--warning);
                    padding: 0.75rem;
                    border-radius: 0 var(--radius-md) var(--radius-md) 0;
                    margin-bottom: 1rem;
                    display: flex;
                    gap: 0.75rem;
                }
                
                .delivery-notes i {
                    color: var(--warning);
                }
                
                .delivery-notes span {
                    font-size: 0.9rem;
                    color: var(--text-dark);
                }
            `;
            document.head.appendChild(style);
        }
    }

    startDelivery(deliveryId) {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery) return;
        
        delivery.status = 'out_for_delivery';
        delivery.pickupTime = new Date().toISOString();
        delivery.location = this.driverLocation || { lat: 20.5937, lng: 78.9629 };
        
        // Update stats
        this.driverStats.today.deliveries += 1;
        
        this.saveData();
        this.renderDeliveries();
        this.updateDeliveryMarkers();
        this.updateStats();
        
        this.showNotification(`Started delivery: ${deliveryId}`, 'success');
        
        // Show navigation to destination
        this.navigateToDelivery(deliveryId);
    }

    showStatusUpdateModal(deliveryId) {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery) return;
        
        const statusOptions = [
            { value: 'in_transit', label: 'In Transit', icon: 'fa-truck' },
            { value: 'out_for_delivery', label: 'Out for Delivery', icon: 'fa-shipping-fast' },
            { value: 'delayed', label: 'Delayed', icon: 'fa-clock' },
            { value: 'cancelled', label: 'Cancelled', icon: 'fa-times' }
        ];
        
        window.app.showModal('Update Delivery Status', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">Update ${deliveryId}</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: var(--text-light);">Current status: 
                        <strong style="color: ${this.getStatusColor(delivery.status)}">
                            ${this.getStatusText(delivery.status)}
                        </strong>
                    </p>
                </div>
                
                <div class="status-options" style="margin-bottom: 1.5rem;">
                    ${statusOptions.map(option => `
                        <label style="
                            display: flex;
                            align-items: center;
                            gap: 0.75rem;
                            padding: 0.75rem;
                            border: 1px solid var(--border);
                            border-radius: var(--radius-md);
                            margin-bottom: 0.5rem;
                            cursor: pointer;
                            transition: var(--transition);
                        ">
                            <input type="radio" name="status" value="${option.value}" 
                                   ${delivery.status === option.value ? 'checked' : ''}
                                   style="margin: 0;">
                            <i class="fas ${option.icon}" style="color: ${this.getStatusColor(option.value)}"></i>
                            <span>${option.label}</span>
                        </label>
                    `).join('')}
                </div>
                
                <div class="input-group">
                    <label class="input-label">Additional Notes</label>
                    <textarea class="form-input" placeholder="Add notes about status change..." 
                              style="height: 80px;"></textarea>
                </div>
                
                <button class="btn-primary" style="width: 100%; margin-top: 1rem;" 
                        onclick="deliveryModule.updateStatus('${deliveryId}')">
                    <i class="fas fa-save"></i> Update Status
                </button>
            </div>
        `);
    }

    updateStatus(deliveryId) {
        const modal = document.querySelector('.modal-overlay');
        const selectedStatus = modal?.querySelector('input[name="status"]:checked')?.value;
        const notes = modal?.querySelector('textarea')?.value;
        
        if (!selectedStatus) {
            this.showNotification('Please select a status', 'error');
            return;
        }
        
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery) return;
        
        delivery.status = selectedStatus;
        if (notes) {
            delivery.notes = notes;
        }
        
        if (selectedStatus === 'delayed') {
            delivery.delay = (delivery.delay || 0) + 15;
        }
        
        this.saveData();
        this.renderDeliveries();
        this.updateDeliveryMarkers();
        
        modal?.remove();
        this.showNotification(`Status updated to: ${this.getStatusText(selectedStatus)}`, 'success');
        
        // If marked as delayed, notify customer
        if (selectedStatus === 'delayed') {
            this.notifyCustomer(delivery, 'delay');
        }
    }

    markAsDelivered(deliveryId) {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery) return;
        
        delivery.status = 'delivered';
        delivery.actualDelivery = new Date().toISOString();
        delivery.routeProgress = 100;
        delivery.location = null;
        
        // Calculate if delivery was on time
        const estimated = parseInt(delivery.estimatedDelivery);
        const actualTime = new Date().getTime();
        const pickupTime = new Date(delivery.pickupTime).getTime();
        const actualMinutes = Math.floor((actualTime - pickupTime) / 60000);
        
        if (actualMinutes <= estimated) {
            this.driverStats.today.onTime += 1;
        }
        
        this.driverStats.today.completed += 1;
        this.driverStats.today.earnings += delivery.amount || 0;
        
        this.saveData();
        this.renderDeliveries();
        this.updateDeliveryMarkers();
        this.updateStats();
        
        this.showNotification(`Delivery ${deliveryId} marked as delivered!`, 'success');
        
        // Notify customer
        this.notifyCustomer(delivery, 'delivered');
        
        // Show delivery confirmation
        this.showDeliveryConfirmation(delivery);
    }

    showDeliveryConfirmation(delivery) {
        window.app.showModal('Delivery Confirmation', `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success); margin-bottom: 1rem;"></i>
                <h4>Delivery Confirmed!</h4>
                
                <div style="
                    background: var(--background-alt);
                    border-radius: var(--radius-md);
                    padding: 1.5rem;
                    margin: 1.5rem 0;
                    text-align: left;
                ">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                        <span style="color: var(--text-light);">Delivery ID:</span>
                        <span style="font-weight: 600;">${delivery.id}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                        <span style="color: var(--text-light);">Customer:</span>
                        <span style="font-weight: 600;">${delivery.customer}</span>
                    </div>
                    
                    <div style="display: flex; justify-content; space-between; margin-bottom: 0.75rem;">
                        <span style="color: var(--text-light);">Time:</span>
                        <span style="font-weight: 600;">${new Date().toLocaleTimeString()}</span>
                    </div>
                    
                    ${delivery.payment === 'Cash on Delivery' || delivery.payment === 'Card on Delivery' ? `
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-light);">Payment Collected:</span>
                            <span style="font-weight: 600; color: var(--success);">₹${delivery.amount}</span>
                        </div>
                    ` : ''}
                </div>
                
                <button class="btn-primary" style="width: 100%;" onclick="deliveryModule.nextDelivery()">
                    <i class="fas fa-arrow-right"></i> Next Delivery
                </button>
            </div>
        `);
    }

    nextDelivery() {
        document.querySelector('.modal-overlay')?.remove();
        
        // Find next pending delivery
        const nextDelivery = this.deliveries.find(d => d.status === 'pending');
        if (nextDelivery) {
            this.navigateToDelivery(nextDelivery.id);
        } else {
            this.showNotification('All deliveries completed for now!', 'info');
        }
    }

    reportDelay(deliveryId) {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery) return;
        
        window.app.showModal('Report Delay', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">Report Delay for ${deliveryId}</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: var(--text-light);">
                        Current ETA: <strong>${delivery.estimatedDelivery}</strong>
                    </p>
                </div>
                
                <div class="input-group">
                    <label class="input-label">Delay Reason</label>
                    <select class="form-input" id="delayReason">
                        <option value="traffic">Heavy Traffic</option>
                        <option value="weather">Bad Weather</option>
                        <option value="vehicle">Vehicle Issue</option>
                        <option value="customer">Customer Not Available</option>
                        <option value="address">Wrong Address</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                
                <div class="input-group">
                    <label class="input-label">Additional Delay (minutes)</label>
                    <input type="number" class="form-input" id="delayMinutes" value="15" min="5" max="120">
                </div>
                
                <div class="input-group">
                    <label class="input-label">Message to Customer</label>
                    <textarea class="form-input" id="delayMessage" 
                              placeholder="Auto-generated message will be sent..." 
                              style="height: 80px;"></textarea>
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                    <button class="btn-primary" style="flex: 1;" 
                            onclick="deliveryModule.confirmDelay('${deliveryId}')">
                        <i class="fas fa-exclamation-triangle"></i> Report Delay
                    </button>
                    <button class="btn-text" style="flex: 1;" 
                            onclick="document.querySelector('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `);
        
        // Auto-generate message
        setTimeout(() => {
            const reason = document.getElementById('delayReason')?.value;
            const minutes = document.getElementById('delayMinutes')?.value || 15;
            const message = `Your delivery ${deliveryId} is delayed by ${minutes} minutes due to ${reason}. We apologize for the inconvenience.`;
            document.getElementById('delayMessage').value = message;
        }, 100);
    }

    confirmDelay(deliveryId) {
        const modal = document.querySelector('.modal-overlay');
        const reason = modal?.querySelector('#delayReason')?.value;
        const minutes = parseInt(modal?.querySelector('#delayMinutes')?.value || 15);
        const message = modal?.querySelector('#delayMessage')?.value;
        
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery) return;
        
        delivery.status = 'delayed';
        delivery.delay = (delivery.delay || 0) + minutes;
        
        // Update estimated delivery time
        const currentETA = parseInt(delivery.estimatedDelivery);
        delivery.estimatedDelivery = `${currentETA + minutes} min`;
        
        this.saveData();
        this.renderDeliveries();
        
        modal?.remove();
        this.showNotification(`Delay reported: +${minutes} minutes`, 'warning');
        
        // Notify customer
        if (message) {
            this.notifyCustomer(delivery, 'delay', message);
        }
    }

    navigateToDelivery(deliveryId) {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery || !delivery.location) return;
        
        if (!this.map || !this.map.map) return;
        
        // Center map on delivery
        this.map.map.setView([delivery.location.lat, delivery.location.lng], 15);
        
        // Draw route from driver to delivery
        if (this.driverLocation) {
            this.map.clearRoutes();
            this.map.addRoute(
                [this.driverLocation.lat, this.driverLocation.lng],
                [delivery.location.lat, delivery.location.lng]
            );
            
            // Calculate and show route info
            const distance = this.calculateDistance(
                this.driverLocation,
                delivery.location
            );
            
            window.app.showModal('Navigation Started', `
                <div style="padding: 1rem;">
                    <h4 style="margin-bottom: 1rem;">Navigating to ${deliveryId}</h4>
                    
                    <div style="margin-bottom: 1.5rem;">
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
                                <div style="font-size: 0.9rem; color: var(--text-light);">Destination</div>
                                <div style="font-weight: 600;">${delivery.destination}</div>
                            </div>
                        </div>
                        
                        <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <div>
                                    <div style="font-size: 0.9rem; color: var(--text-light);">Distance</div>
                                    <div style="font-size: 1.25rem; font-weight: 600;">${distance.toFixed(1)} km</div>
                                </div>
                                <div>
                                    <div style="font-size: 0.9rem; color: var(--text-light);">ETA</div>
                                    <div style="font-size: 1.25rem; font-weight: 600;">${delivery.estimatedDelivery}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button class="btn-primary" style="width: 100%;" 
                            onclick="deliveryModule.startNavigation('${deliveryId}')">
                        <i class="fas fa-directions"></i> Start Turn-by-Turn Navigation
                    </button>
                </div>
            `);
        }
    }

    calculateDistance(point1, point2) {
        const R = 6371; // Earth's radius in km
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLng = (point2.lng - point1.lng) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    startNavigation(deliveryId) {
        document.querySelector('.modal-overlay')?.remove();
        
        // Show full-screen navigation
        const navScreen = document.createElement('div');
        navScreen.id = 'deliveryNavigation';
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
                    <button onclick="deliveryModule.closeNavigation()" style="
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        color: var(--text-light);
                        cursor: pointer;
                    ">&times;</button>
                    <h3 style="margin: 0;">Delivery Navigation</h3>
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
                            <i class="fas fa-flag-checkered"></i>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">Delivery To</div>
                            <div style="font-weight: 600;">${this.deliveries.find(d => d.id === deliveryId)?.destination || 'Destination'}</div>
                        </div>
                    </div>
                    
                    <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                            <div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">Remaining Distance</div>
                                <div style="font-size: 1.5rem; font-weight: 700;">8.2 km</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.9rem; color: var(--text-light);">ETA</div>
                                <div style="font-size: 1.5rem; font-weight: 700;">25 min</div>
                            </div>
                        </div>
                        
                        <div style="background: var(--border); height: 4px; border-radius: 2px; overflow: hidden;">
                            <div style="width: 65%; height: 100%; background: var(--primary-blue);"></div>
                        </div>
                    </div>
                </div>
                
                <div id="navMap" style="
                    height: 200px;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    margin-bottom: 1.5rem;
                "></div>
                
                <div class="next-turn" style="
                    background: var(--primary-blue);
                    color: white;
                    padding: 1rem;
                    border-radius: var(--radius-md);
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                ">
                    <i class="fas fa-arrow-right" style="font-size: 1.5rem;"></i>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Next Turn</div>
                        <div style="font-size: 1.1rem; font-weight: 600;">Right onto Main Street in 500m</div>
                    </div>
                </div>
                
                <div class="nav-actions" style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="flex: 1;" onclick="deliveryModule.arrivedAtDestination('${deliveryId}')">
                        <i class="fas fa-check"></i> Arrived
                    </button>
                    <button class="btn-text" style="flex: 1;" onclick="deliveryModule.reportIssue('${deliveryId}')">
                        <i class="fas fa-exclamation-triangle"></i> Issue
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(navScreen);
        
        // Initialize navigation map
        setTimeout(() => {
            const miniMap = new SmartRoadsMap('navMap', {
                center: [20.5937, 78.9629],
                zoom: 15,
                trafficOverlay: true,
                markers: true,
                routes: true
            });
        }, 100);
    }

    closeNavigation() {
        document.getElementById('deliveryNavigation')?.remove();
    }

    arrivedAtDestination(deliveryId) {
        this.closeNavigation();
        this.markAsDelivered(deliveryId);
    }

    reportIssue(deliveryId) {
        this.closeNavigation();
        this.reportDelay(deliveryId);
    }

    showDeliveryDetails(deliveryId) {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery) return;
        
        window.app.showModal(`Delivery Details - ${deliveryId}`, `
            <div style="padding: 1rem; max-height: 70vh; overflow-y: auto;">
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h4 style="margin: 0;">${delivery.id}</h4>
                        <span class="status-badge" style="
                            background: ${this.getStatusColor(delivery.status)};
                            color: white;
                            padding: 0.25rem 0.75rem;
                            border-radius: 20px;
                            font-size: 0.85rem;
                            font-weight: 600;
                        ">
                            ${this.getStatusText(delivery.status)}
                        </span>
                    </div>
                    
                    <p style="color: var(--text-light); font-size: 0.9rem;">
                        Tracking: <strong>${delivery.trackingNumber}</strong>
                    </p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: var(--background-alt); padding: 1rem; border-radius: var(--radius-md);">
                        <div style="font-size: 0.9rem; color: var(--text-light);">Weight</div>
                        <div style="font-size: 1.1rem; font-weight: 600;">${delivery.weight}</div>
                    </div>
                    
                    <div style="background: var(--background-alt); padding: 1rem; border-radius: var(--radius-md);">
                        <div style="font-size: 0.9rem; color: var(--text-light);">Dimensions</div>
                        <div style="font-size: 1.1rem; font-weight: 600;">${delivery.dimensions}</div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h5 style="margin-bottom: 0.75rem; color: var(--text-light);">Customer Information</h5>
                    <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                        <div style="margin-bottom: 0.75rem;">
                            <div style="font-size: 0.9rem; color: var(--text-light);">Name</div>
                            <div style="font-weight: 600;">${delivery.customer}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">Phone</div>
                            <div style="font-weight: 600;">${delivery.phone}</div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section" style="margin: 1.5rem 0;">
                    <h5 style="margin-bottom: 0.75rem; color: var(--text-light);">Delivery Address</h5>
                    <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                        <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                            <i class="fas fa-map-marker-alt" style="color: var(--primary-blue); margin-top: 0.25rem;"></i>
                            <div>
                                <div style="font-weight: 600;">${delivery.destination}</div>
                                <div style="font-size: 0.9rem; color: var(--text-light); margin-top: 0.25rem;">
                                    ${delivery.address}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h5 style="margin-bottom: 0.75rem; color: var(--text-light);">Delivery Timeline</h5>
                    <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                            <span style="color: var(--text-light);">Estimated Delivery:</span>
                            <span style="font-weight: 600;">${delivery.estimatedDelivery}</span>
                        </div>
                        ${delivery.pickupTime ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                                <span style="color: var(--text-light);">Pickup Time:</span>
                                <span style="font-weight: 600;">${new Date(delivery.pickupTime).toLocaleTimeString()}</span>
                            </div>
                        ` : ''}
                        ${delivery.actualDelivery ? `
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: var(--text-light);">Actual Delivery:</span>
                                <span style="font-weight: 600; color: var(--success);">
                                    ${new Date(delivery.actualDelivery).toLocaleTimeString()}
                                </span>
                            </div>
                        ` : ''}
                        ${delivery.delay ? `
                            <div style="display: flex; justify-content: space-between; margin-top: 0.75rem;">
                                <span style="color: var(--text-light);">Delay:</span>
                                <span style="font-weight: 600; color: var(--danger);">${delivery.delay} minutes</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${delivery.notes ? `
                    <div class="detail-section" style="margin: 1.5rem 0;">
                        <h5 style="margin-bottom: 0.75rem; color: var(--text-light);">Special Instructions</h5>
                        <div style="background: rgba(255, 193, 7, 0.1); border-left: 3px solid var(--warning); 
                             padding: 1rem; border-radius: 0 var(--radius-md) var(--radius-md) 0;">
                            <i class="fas fa-exclamation-circle" style="color: var(--warning); margin-right: 0.5rem;"></i>
                            ${delivery.notes}
                        </div>
                    </div>
                ` : ''}
                
                <div class="detail-section">
                    <h5 style="margin-bottom: 0.75rem; color: var(--text-light);">Payment Information</h5>
                    <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-light);">Type:</span>
                            <span style="font-weight: 600;">${delivery.payment}</span>
                        </div>
                        ${delivery.amount ? `
                            <div style="display: flex; justify-content: space-between; margin-top: 0.5rem;">
                                <span style="color: var(--text-light);">Amount:</span>
                                <span style="font-weight: 600; color: var(--success);">₹${delivery.amount}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `);
    }

    trackParcel(deliveryId) {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery) return;
        
        window.app.showModal(`Live Tracking - ${deliveryId}`, `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">Live Parcel Tracking</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                        <span style="color: var(--text-light);">Status:</span>
                        <span style="font-weight: 600; color: ${this.getStatusColor(delivery.status)}">
                            ${this.getStatusText(delivery.status)}
                        </span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                        <span style="color: var(--text-light);">Last Updated:</span>
                        <span style="font-weight: 600;">Just now</span>
                    </div>
                </div>
                
                <div id="trackingMap" style="
                    height: 200px;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    margin-bottom: 1.5rem;
                "></div>
                
                <div class="tracking-timeline" style="margin-bottom: 1.5rem;">
                    <h5 style="margin-bottom: 0.75rem; color: var(--text-light);">Tracking History</h5>
                    
                    <div style="position: relative; padding-left: 1.5rem;">
                        <div style="position: absolute; left: 6px; top: 0; bottom: 0; width: 2px; background: var(--primary-blue);"></div>
                        
                        <div style="position: relative; margin-bottom: 1.5rem;">
                            <div style="
                                position: absolute;
                                left: -1.5rem;
                                top: 0;
                                width: 14px;
                                height: 14px;
                                border-radius: 50%;
                                background: var(--primary-blue);
                                border: 3px solid white;
                                box-shadow: 0 0 0 2px var(--primary-blue);
                            "></div>
                            <div>
                                <div style="font-weight: 600;">Parcel Picked Up</div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">
                                    ${delivery.pickupTime ? new Date(delivery.pickupTime).toLocaleTimeString() : 'Pending'}
                                </div>
                            </div>
                        </div>
                        
                        <div style="position: relative; margin-bottom: 1.5rem;">
                            <div style="
                                position: absolute;
                                left: -1.5rem;
                                top: 0;
                                width: 14px;
                                height: 14px;
                                border-radius: 50%;
                                background: ${delivery.status === 'in_transit' || delivery.status === 'out_for_delivery' || delivery.status === 'delivered' ? 'var(--primary-blue)' : 'var(--border)'};
                                border: 3px solid white;
                                box-shadow: 0 0 0 2px ${delivery.status === 'in_transit' || delivery.status === 'out_for_delivery' || delivery.status === 'delivered' ? 'var(--primary-blue)' : 'var(--border)'};
                            "></div>
                            <div>
                                <div style="font-weight: 600;">In Transit</div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">
                                    ${delivery.status === 'in_transit' || delivery.status === 'out_for_delivery' || delivery.status === 'delivered' ? 'Active' : 'Pending'}
                                </div>
                            </div>
                        </div>
                        
                        <div style="position: relative;">
                            <div style="
                                position: absolute;
                                left: -1.5rem;
                                top: 0;
                                width: 14px;
                                height: 14px;
                                border-radius: 50%;
                                background: ${delivery.status === 'delivered' ? 'var(--success)' : 'var(--border)'};
                                border: 3px solid white;
                                box-shadow: 0 0 0 2px ${delivery.status === 'delivered' ? 'var(--success)' : 'var(--border)'};
                            "></div>
                            <div>
                                <div style="font-weight: 600;">Delivered</div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">
                                    ${delivery.actualDelivery ? new Date(delivery.actualDelivery).toLocaleTimeString() : 'Pending'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="flex: 1;" onclick="deliveryModule.shareTracking('${deliveryId}')">
                        <i class="fas fa-share"></i> Share Tracking
                    </button>
                    <button class="btn-text" style="flex: 1;" 
                            onclick="document.querySelector('.modal-overlay').remove()">
                        Close
                    </button>
                </div>
            </div>
        `);
        
        // Initialize tracking map
        setTimeout(() => {
            const trackingMap = new SmartRoadsMap('trackingMap', {
                center: delivery.location || [20.5937, 78.9629],
                zoom: 14,
                trafficOverlay: false,
                markers: true,
                routes: false
            });
            
            if (delivery.location) {
                trackingMap.addMarker(
                    [delivery.location.lat, delivery.location.lng],
                    'Parcel Location',
                    'default'
                );
            }
        }, 100);
    }

    shareTracking(deliveryId) {
        const delivery = this.deliveries.find(d => d.id === deliveryId);
        if (!delivery) return;
        
        const trackingUrl = `${window.location.origin}/track/${delivery.trackingNumber}`;
        const message = `Track your delivery ${deliveryId} here: ${trackingUrl}`;
        
        if (navigator.share) {
            navigator.share({
                title: `Track Delivery ${deliveryId}`,
                text: `Track your delivery ${deliveryId} from Smart Roads`,
                url: trackingUrl
            });
        } else {
            navigator.clipboard.writeText(message);
            this.showNotification('Tracking link copied to clipboard!', 'success');
        }
    }

    scanParcel() {
        // Simulate barcode/QR scanning
        window.app.showModal('Scan Parcel', `
            <div style="text-align: center; padding: 2rem;">
                <div style="
                    width: 250px;
                    height: 250px;
                    margin: 0 auto 2rem;
                    position: relative;
                    border: 2px dashed var(--border);
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div style="
                        width: 200px;
                        height: 200px;
                        border: 2px solid var(--primary-blue);
                        position: relative;
                    ">
                        <div style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            border: 2px solid var(--primary-blue);
                            animation: scan 2s linear infinite;
                        "></div>
                    </div>
                </div>
                
                <h4>Scan Parcel Barcode</h4>
                <p style="color: var(--text-light); margin: 1rem 0;">
                    Point your camera at the parcel's barcode or QR code
                </p>
                
                <div style="margin-top: 2rem;">
                    <button class="btn-text" onclick="deliveryModule.simulateScan()">
                        <i class="fas fa-camera"></i> Simulate Scan
                    </button>
                    <button class="btn-text" onclick="deliveryModule.manualEntry()">
                        <i class="fas fa-keyboard"></i> Manual Entry
                    </button>
                </div>
                
                <style>
                    @keyframes scan {
                        0% { top: 0; opacity: 1; }
                        50% { top: 100%; opacity: 0.5; }
                        100% { top: 0; opacity: 1; }
                    }
                </style>
            </div>
        `);
    }

    simulateScan() {
        document.querySelector('.modal-overlay')?.remove();
        
        // Simulate successful scan
        setTimeout(() => {
            const newDelivery = {
                id: `DEL-${Date.now().toString().slice(-6)}`,
                trackingNumber: `TRK${Date.now().toString().slice(-9)}`,
                customer: 'New Customer',
                phone: '+91 9876543210',
                address: 'Scan Address',
                destination: 'Scan Destination',
                status: 'pending',
                priority: 'standard',
                weight: '1.0 kg',
                dimensions: '20x15x10 cm',
                estimatedDelivery: '45 min',
                actualDelivery: null,
                pickupTime: null,
                notes: 'Scanned parcel',
                payment: 'Prepaid',
                amount: 0,
                location: null,
                routeProgress: 0,
                delay: 0
            };
            
            this.deliveries.push(newDelivery);
            this.saveData();
            this.renderDeliveries();
            
            this.showNotification('Parcel scanned successfully!', 'success');
            
            // Show details for scanned parcel
            this.showDeliveryDetails(newDelivery.id);
        }, 1000);
    }

    manualEntry() {
        document.querySelector('.modal-overlay')?.remove();
        
        window.app.showModal('Manual Parcel Entry', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">Enter Parcel Details</h4>
                
                <div class="input-group">
                    <label class="input-label">Tracking Number</label>
                    <input type="text" class="form-input" placeholder="Enter tracking number">
                </div>
                
                <div class="input-group">
                    <label class="input-label">Customer Name</label>
                    <input type="text" class="form-input" placeholder="Enter customer name">
                </div>
                
                <div class="input-group">
                    <label class="input-label">Delivery Address</label>
                    <input type="text" class="form-input" placeholder="Enter delivery address">
                </div>
                
                <div class="input-group">
                    <label class="input-label">Phone Number</label>
                    <input type="tel" class="form-input" placeholder="Enter phone number">
                </div>
                
                <div class="input-group">
                    <label class="input-label">Package Weight</label>
                    <input type="text" class="form-input" placeholder="e.g., 2.5 kg">
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                    <button class="btn-primary" style="flex: 1;" onclick="deliveryModule.saveManualEntry()">
                        <i class="fas fa-save"></i> Save Parcel
                    </button>
                    <button class="btn-text" style="flex: 1;" 
                            onclick="document.querySelector('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `);
    }

    saveManualEntry() {
        document.querySelector('.modal-overlay')?.remove();
        this.showNotification('Parcel added manually', 'success');
    }

    optimizeRoute() {
        if (this.deliveries.length === 0) {
            this.showNotification('No deliveries to optimize', 'info');
            return;
        }
        
        const pendingDeliveries = this.deliveries.filter(d => 
            d.status === 'pending' || d.status === 'in_transit' || d.status === 'out_for_delivery'
        );
        
        if (pendingDeliveries.length === 0) {
            this.showNotification('No active deliveries to optimize', 'info');
            return;
        }
        
        // Simulate route optimization
        this.showNotification('Optimizing delivery route...', 'info');
        
        setTimeout(() => {
            this.optimizedRoute = this.calculateOptimalRoute(pendingDeliveries);
            this.showOptimizedRoute();
        }, 1500);
    }

    calculateOptimalRoute(deliveries) {
        // Simple route optimization (nearest neighbor)
        const route = [];
        let currentLocation = this.driverLocation || { lat: 20.5937, lng: 78.9629 };
        let remainingDeliveries = [...deliveries];
        
        while (remainingDeliveries.length > 0) {
            // Find nearest delivery
            let nearestIndex = 0;
            let nearestDistance = Infinity;
            
            remainingDeliveries.forEach((delivery, index) => {
                if (delivery.location) {
                    const distance = this.calculateDistance(currentLocation, delivery.location);
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestIndex = index;
                    }
                }
            });
            
            const nearestDelivery = remainingDeliveries[nearestIndex];
            route.push(nearestDelivery);
            currentLocation = nearestDelivery.location || currentLocation;
            remainingDeliveries.splice(nearestIndex, 1);
        }
        
        return route;
    }

    showOptimizedRoute() {
        if (!this.optimizedRoute || this.optimizedRoute.length === 0) return;
        
        window.app.showModal('Optimized Delivery Route', `
            <div style="padding: 1rem; max-height: 70vh; overflow-y: auto;">
                <h4 style="margin-bottom: 1rem;">Optimized Delivery Sequence</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: var(--text-light);">
                        Total stops: <strong>${this.optimizedRoute.length}</strong>
                    </p>
                    <p style="color: var(--text-light);">
                        Estimated time saved: <strong style="color: var(--success);">25 minutes</strong>
                    </p>
                </div>
                
                <div class="route-steps" style="position: relative; padding-left: 1.5rem;">
                    <div style="position: absolute; left: 7px; top: 0; bottom: 0; width: 2px; background: var(--primary-blue);"></div>
                    
                    ${this.optimizedRoute.map((delivery, index) => `
                        <div style="position: relative; margin-bottom: 1.5rem;">
                            <div style="
                                position: absolute;
                                left: -1.5rem;
                                top: 0;
                                width: 16px;
                                height: 16px;
                                border-radius: 50%;
                                background: ${index === 0 ? 'var(--success)' : 'var(--primary-blue)'};
                                border: 3px solid white;
                                box-shadow: 0 0 0 2px ${index === 0 ? 'var(--success)' : 'var(--primary-blue)'};
                            "></div>
                            <div>
                                <div style="font-weight: 600; margin-bottom: 0.25rem;">
                                    ${index + 1}. ${delivery.id}
                                </div>
                                <div style="font-size: 0.9rem; color: var(--text-light); margin-bottom: 0.25rem;">
                                    ${delivery.customer}
                                </div>
                                <div style="font-size: 0.85rem; color: var(--text-light);">
                                    ${delivery.destination}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                    <button class="btn-primary" style="flex: 1;" onclick="deliveryModule.startOptimizedRoute()">
                        <i class="fas fa-play"></i> Start This Route
                    </button>
                    <button class="btn-text" style="flex: 1;" 
                            onclick="document.querySelector('.modal-overlay').remove()">
                        Close
                    </button>
                </div>
            </div>
        `);
    }

    startOptimizedRoute() {
        document.querySelector('.modal-overlay')?.remove();
        
        if (this.optimizedRoute.length > 0) {
            this.activeDelivery = this.optimizedRoute[0];
            this.navigateToDelivery(this.activeDelivery.id);
            this.showNotification('Starting optimized route...', 'success');
        }
    }

    addNewDelivery() {
        window.app.showModal('Add New Delivery', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">New Delivery Request</h4>
                
                <div class="input-group">
                    <label class="input-label">Pickup Address</label>
                    <input type="text" class="form-input" placeholder="Enter pickup address" id="pickupAddress">
                </div>
                
                <div class="input-group">
                    <label class="input-label">Delivery Address</label>
                    <input type="text" class="form-input" placeholder="Enter delivery address" id="deliveryAddress">
                </div>
                
                <div class="input-group">
                    <label class="input-label">Customer Name</label>
                    <input type="text" class="form-input" placeholder="Enter customer name" id="customerName">
                </div>
                
                <div class="input-group">
                    <label class="input-label">Customer Phone</label>
                    <input type="tel" class="form-input" placeholder="Enter phone number" id="customerPhone">
                </div>
                
                <div class="input-group">
                    <label class="input-label">Package Details</label>
                    <textarea class="form-input" placeholder="Describe the package" 
                              style="height: 80px;" id="packageDetails"></textarea>
                </div>
                
                <div class="input-group">
                    <label class="input-label">Priority</label>
                    <select class="form-input" id="deliveryPriority">
                        <option value="standard">Standard</option>
                        <option value="express">Express</option>
                        <option value="same_day">Same Day</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                    <button class="btn-primary" style="flex: 1;" onclick="deliveryModule.submitNewDelivery()">
                        <i class="fas fa-plus"></i> Add Delivery
                    </button>
                    <button class="btn-text" style="flex: 1;" 
                            onclick="document.querySelector('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `);
    }

    submitNewDelivery() {
        const modal = document.querySelector('.modal-overlay');
        const pickupAddress = modal?.querySelector('#pickupAddress')?.value;
        const deliveryAddress = modal?.querySelector('#deliveryAddress')?.value;
        const customerName = modal?.querySelector('#customerName')?.value;
        const customerPhone = modal?.querySelector('#customerPhone')?.value;
        const packageDetails = modal?.querySelector('#packageDetails')?.value;
        const priority = modal?.querySelector('#deliveryPriority')?.value;
        
        if (!pickupAddress || !deliveryAddress || !customerName) {
            this.showNotification('Please fill in required fields', 'error');
            return;
        }
        
        const newDelivery = {
            id: `DEL-${Date.now().toString().slice(-6)}`,
            trackingNumber: `TRK${Date.now().toString().slice(-9)}`,
            customer: customerName,
            phone: customerPhone || '+91 9876543210',
            address: pickupAddress,
            destination: deliveryAddress,
            status: 'pending',
            priority: priority,
            weight: 'Unknown',
            dimensions: 'Unknown',
            estimatedDelivery: priority === 'express' ? '30 min' : 
                              priority === 'same_day' ? '2 hours' : '45 min',
            actualDelivery: null,
            pickupTime: null,
            notes: packageDetails || 'New delivery request',
            payment: 'To be determined',
            amount: 0,
            location: null,
            routeProgress: 0,
            delay: 0
        };
        
        this.deliveries.push(newDelivery);
        this.saveData();
        this.renderDeliveries();
        
        modal?.remove();
        this.showNotification('New delivery added successfully!', 'success');
    }

    showAllDeliveries() {
        const allDeliveries = this.deliveries.length;
        const pending = this.deliveries.filter(d => d.status === 'pending').length;
        const inTransit = this.deliveries.filter(d => d.status === 'in_transit' || d.status === 'out_for_delivery').length;
        const delivered = this.deliveries.filter(d => d.status === 'delivered').length;
        
        window.app.showModal('All Deliveries', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">Delivery Summary</h4>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: rgba(0, 119, 252, 0.1); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-blue);">${allDeliveries}</div>
                        <div style="font-size: 0.9rem; color: var(--text-light);">Total</div>
                    </div>
                    
                    <div style="background: rgba(255, 193, 7, 0.1); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">${pending}</div>
                        <div style="font-size: 0.9rem; color: var(--text-light);">Pending</div>
                    </div>
                    
                    <div style="background: rgba(23, 162, 184, 0.1); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--info);">${inTransit}</div>
                        <div style="font-size: 0.9rem; color: var(--text-light);">In Transit</div>
                    </div>
                    
                    <div style="background: rgba(40, 167, 69, 0.1); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${delivered}</div>
                        <div style="font-size: 0.9rem; color: var(--text-light);">Delivered</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h5 style="margin-bottom: 0.75rem; color: var(--text-light);">Recent Deliveries</h5>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${this.deliveries.map(delivery => `
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                padding: 0.75rem;
                                border-bottom: 1px solid var(--border);
                            ">
                                <div>
                                    <div style="font-weight: 600;">${delivery.id}</div>
                                    <div style="font-size: 0.9rem; color: var(--text-light);">
                                        ${delivery.customer}
                                    </div>
                                </div>
                                <span style="
                                    padding: 0.25rem 0.75rem;
                                    border-radius: 20px;
                                    font-size: 0.8rem;
                                    font-weight: 600;
                                    background: ${this.getStatusColor(delivery.status)};
                                    color: white;
                                ">
                                    ${this.getStatusText(delivery.status).substring(0, 10)}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <button class="btn-primary" style="width: 100%;" 
                        onclick="deliveryModule.exportDeliveries()">
                    <i class="fas fa-download"></i> Export Data
                </button>
            </div>
        `);
    }

    exportDeliveries() {
        const data = JSON.stringify(this.deliveries, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `deliveries_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Delivery data exported', 'success');
    }

    showAllParcelsOnMap() {
        if (!this.map || !this.map.map) return;
        
        // Fit map to show all parcels
        const bounds = L.latLngBounds();
        this.deliveries.forEach(delivery => {
            if (delivery.location) {
                bounds.extend([delivery.location.lat, delivery.location.lng]);
            }
        });
        
        if (bounds.isValid()) {
            this.map.map.fitBounds(bounds.pad(0.1));
        }
        
        this.showNotification('Showing all parcels on map', 'info');
    }

    centerOnDriver() {
        if (!this.map || !this.map.map || !this.driverLocation) return;
        
        this.map.map.setView([this.driverLocation.lat, this.driverLocation.lng], 15);
        this.showNotification('Centered on your location', 'info');
    }

    toggleTrafficLayer() {
        if (!this.map) return;
        
        this.map.toggleTraffic();
        const toggleBtn = document.getElementById('toggleTraffic');
        if (toggleBtn) {
            toggleBtn.innerHTML = this.map.options.trafficOverlay ? 
                '<i class="fas fa-traffic-light"></i> Hide Traffic' :
                '<i class="fas fa-traffic-light"></i> Show Traffic';
        }
    }

    updateDeliveryMarkers() {
        if (!this.map || !this.map.map) return;
        
        // Remove existing markers
        if (this.deliveryMarkers) {
            this.deliveryMarkers.forEach(marker => marker.marker.remove());
        }
        
        // Add updated markers
        this.addDeliveryMarkers();
    }

    updateStats() {
        const statsContainer = document.querySelector('.stats-grid');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(0, 119, 252, 0.1);">
                    <i class="fas fa-box" style="color: var(--primary-blue);"></i>
                </div>
                <div class="stat-content">
                    <h4>${this.driverStats.today.deliveries}</h4>
                    <p>Today's Deliveries</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(40, 167, 69, 0.1);">
                    <i class="fas fa-check-circle" style="color: var(--success);"></i>
                </div>
                <div class="stat-content">
                    <h4>${this.driverStats.today.completed}</h4>
                    <p>Completed</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(255, 193, 7, 0.1);">
                    <i class="fas fa-clock" style="color: var(--warning);"></i>
                </div>
                <div class="stat-content">
                    <h4>${this.driverStats.today.onTime}</h4>
                    <p>On Time</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(108, 117, 125, 0.1);">
                    <i class="fas fa-rupee-sign" style="color: var(--text-light);"></i>
                </div>
                <div class="stat-content">
                    <h4>₹${this.driverStats.today.earnings}</h4>
                    <p>Today's Earnings</p>
                </div>
            </div>
        `;
    }

    simulateLiveTracking() {
        // Simulate parcel movement
        setInterval(() => {
            this.deliveries.forEach(delivery => {
                if (delivery.status === 'in_transit' || delivery.status === 'out_for_delivery') {
                    if (delivery.location) {
                        // Move parcel slightly
                        delivery.location.lat += (Math.random() * 0.0005 - 0.00025);
                        delivery.location.lng += (Math.random() * 0.0005 - 0.00025);
                        
                        // Update progress
                        if (delivery.routeProgress < 95) {
                            delivery.routeProgress += Math.random() * 2;
                        }
                    }
                }
            });
            
            // Update markers if map is active
            this.updateDeliveryMarkers();
            
            // Save data periodically
            this.saveData();
        }, 10000); // Every 10 seconds
    }

    notifyCustomer(delivery, type, customMessage = null) {
        let message = '';
        
        switch(type) {
            case 'delivered':
                message = `Your delivery ${delivery.id} has been successfully delivered. Thank you for choosing Smart Roads!`;
                break;
            case 'delay':
                message = customMessage || `Your delivery ${delivery.id} is delayed by ${delivery.delay} minutes. We apologize for the inconvenience.`;
                break;
            case 'out_for_delivery':
                message = `Your delivery ${delivery.id} is out for delivery. Estimated delivery time: ${delivery.estimatedDelivery}.`;
                break;
        }
        
        // In a real app, this would send SMS/email
        console.log(`Notifying ${delivery.customer}: ${message}`);
        
        // Store notification for offline sync
        const notification = {
            type: 'customer_notification',
            deliveryId: delivery.id,
            customer: delivery.customer,
            phone: delivery.phone,
            message: message,
            timestamp: new Date().toISOString()
        };
        
        const pendingNotifications = JSON.parse(localStorage.getItem('pending_notifications') || '[]');
        pendingNotifications.push(notification);
        localStorage.setItem('pending_notifications', JSON.stringify(pendingNotifications));
        
        // Show local notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Customer Notification', {
                body: message,
                icon: '/assets/icons/icon-192.png'
            });
        }
    }

    initRealtimeUpdates() {
        // Simulate real-time updates from server
        setInterval(() => {
            this.simulateTrafficUpdates();
            this.updateStatsDisplay();
        }, 30000); // Every 30 seconds
    }

    simulateTrafficUpdates() {
        // Update traffic conditions
        if (this.map) {
            this.map.simulateTrafficChange();
        }
        
        // Randomly update delivery statuses
        this.deliveries.forEach(delivery => {
            if (delivery.status === 'in_transit' && Math.random() > 0.8) {
                delivery.estimatedDelivery = `${parseInt(delivery.estimatedDelivery) + 5} min`;
                this.showNotification(`ETA updated for ${delivery.id}: ${delivery.estimatedDelivery}`, 'info');
            }
        });
        
        this.renderDeliveries();
    }

    updateStatsDisplay() {
        // Update any real-time stats displays
        const activeDeliveries = this.deliveries.filter(d => 
            d.status === 'in_transit' || d.status === 'out_for_delivery'
        ).length;
        
        const activeElement = document.getElementById('activeDeliveriesCount');
        if (activeElement) {
            activeElement.textContent = activeDeliveries;
        }
    }

    showNotification(message, type = 'info') {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Initialize module
let deliveryModule;

document.addEventListener('DOMContentLoaded', () => {
    deliveryModule = new DeliveryModule();
    
    // Handle back button in PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.querySelector('.standalone-back')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }
    
    // Export for use in HTML onclick handlers
    window.deliveryModule = deliveryModule;
});