// Maps Integration for Smart Roads
class SmartRoadsMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            center: [20.5937, 78.9629], // India coordinates
            zoom: 12,
            minZoom: 10,
            maxZoom: 18,
            trafficOverlay: true,
            markers: true,
            routes: true,
            ...options
        };
        
        this.map = null;
        this.trafficLayer = null;
        this.markers = [];
        this.routes = [];
        this.trafficData = {};
        
        this.init();
    }

    async init() {
        await this.loadMap();
        await this.loadTrafficData();
        this.renderTraffic();
        
        if (this.options.markers) {
            this.addSampleMarkers();
        }
        
        if (this.options.routes) {
            this.addSampleRoutes();
        }
        
        this.addControls();
        this.startTrafficUpdates();
    }

    async loadMap() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container #${this.containerId} not found`);
            return;
        }

        // Initialize Leaflet map
        this.map = L.map(this.containerId).setView(
            this.options.center,
            this.options.zoom
        );

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: this.options.maxZoom,
            minZoom: this.options.minZoom
        }).addTo(this.map);

        // Add terrain layer
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            attribution: 'OpenTopoMap'
        }).addTo(this.map);

        // Fit bounds to container
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
    }

    async loadTrafficData() {
        // Load traffic data from localStorage or generate dummy data
        const savedData = localStorage.getItem('smartroads_traffic');
        if (savedData) {
            this.trafficData = JSON.parse(savedData);
        } else {
            this.trafficData = this.generateTrafficData();
            localStorage.setItem('smartroads_traffic', JSON.stringify(this.trafficData));
        }
    }

    generateTrafficData() {
        // Generate realistic traffic data based on time and day
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const isWeekday = day >= 1 && day <= 5;
        const isRushHour = (hour >= 7 && hour <= 10) || (hour >= 16 && hour <= 19);
        
        const baseLat = 20.5937;
        const baseLng = 78.9629;
        
        const roads = [
            {
                name: "Main Street",
                coordinates: [
                    [baseLat - 0.05, baseLng - 0.1],
                    [baseLat - 0.03, baseLng - 0.05],
                    [baseLat, baseLng],
                    [baseLat + 0.03, baseLng + 0.05],
                    [baseLat + 0.05, baseLng + 0.1]
                ],
                baseCongestion: isRushHour ? 0.7 : 0.3
            },
            {
                name: "Highway 101",
                coordinates: [
                    [baseLat + 0.1, baseLng - 0.15],
                    [baseLat + 0.05, baseLng - 0.05],
                    [baseLat, baseLng],
                    [baseLat - 0.05, baseLng + 0.05],
                    [baseLat - 0.1, baseLng + 0.15]
                ],
                baseCongestion: isWeekday ? 0.6 : 0.4
            },
            {
                name: "Park Avenue",
                coordinates: [
                    [baseLat - 0.1, baseLng],
                    [baseLat - 0.05, baseLng],
                    [baseLat, baseLng],
                    [baseLat + 0.05, baseLng],
                    [baseLat + 0.1, baseLng]
                ],
                baseCongestion: 0.2
            }
        ];

        // Add random variations
        return roads.map(road => ({
            ...road,
            congestion: Math.min(1, Math.max(0, road.baseCongestion + (Math.random() * 0.3 - 0.15))),
            speed: Math.floor(60 * (1 - road.congestion)),
            incidents: Math.random() > 0.8 ? ['accident', 'construction', 'event'][Math.floor(Math.random() * 3)] : null,
            updatedAt: now.toISOString()
        }));
    }

    renderTraffic() {
        if (!this.map || !this.options.trafficOverlay) return;

        // Clear existing traffic layer
        if (this.trafficLayer) {
            this.trafficLayer.clearLayers();
        }

        this.trafficLayer = L.layerGroup().addTo(this.map);

        this.trafficData.forEach(road => {
            const color = this.getTrafficColor(road.congestion);
            const weight = 5 + road.congestion * 5;
            const opacity = 0.7;
            
            // Draw road segment
            const polyline = L.polyline(road.coordinates, {
                color: color,
                weight: weight,
                opacity: opacity,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(this.trafficLayer);
            
            // Add tooltip with traffic info
            polyline.bindTooltip(`
                <strong>${road.name}</strong><br>
                Congestion: ${Math.round(road.congestion * 100)}%<br>
                Speed: ${road.speed} km/h<br>
                ${road.incidents ? `<i>Incident: ${road.incidents}</i><br>` : ''}
                <small>Updated: ${new Date(road.updatedAt).toLocaleTimeString()}</small>
            `);
            
            // Add click event
            polyline.on('click', () => {
                this.showRoadDetails(road);
            });
            
            // Add pulse animation for incidents
            if (road.incidents) {
                this.addIncidentMarker(road);
            }
        });

        // Add legend
        this.addTrafficLegend();
    }

    getTrafficColor(congestion) {
        if (congestion < 0.3) return '#28A745'; // Green
        if (congestion < 0.6) return '#FFC107'; // Yellow
        return '#DC3545'; // Red
    }

    addIncidentMarker(road) {
        // Add incident marker at midpoint of road
        const midIndex = Math.floor(road.coordinates.length / 2);
        const [lat, lng] = road.coordinates[midIndex];
        
        const icon = L.divIcon({
            html: `<div class="incident-marker" style="
                background: #DC3545;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 10px rgba(220, 53, 69, 0.5);
                animation: pulse 1.5s infinite;
            "></div>`,
            className: 'incident-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        const marker = L.marker([lat, lng], { icon })
            .addTo(this.trafficLayer)
            .bindTooltip(`<strong>${road.incidents.toUpperCase()}</strong><br>${road.name}`);
            
        this.markers.push(marker);
    }

    addTrafficLegend() {
        const legend = L.control({ position: 'bottomright' });
        
        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'traffic-legend');
            div.innerHTML = `
                <div style="
                    background: white;
                    padding: 10px;
                    border-radius: 5px;
                    box-shadow: 0 0 15px rgba(0,0,0,0.2);
                    font-size: 12px;
                ">
                    <h4 style="margin: 0 0 10px 0;">Traffic Legend</h4>
                    <div style="display: flex; align-items: center; margin-bottom: 5px;">
                        <div style="width: 20px; height: 5px; background: #28A745; margin-right: 10px;"></div>
                        <span>Light (&lt;30%)</span>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 5px;">
                        <div style="width: 20px; height: 5px; background: #FFC107; margin-right: 10px;"></div>
                        <span>Moderate (30-60%)</span>
                    </div>
                    <div style="display: flex; align-items; center; margin-bottom: 5px;">
                        <div style="width: 20px; height: 5px; background: #DC3545; margin-right: 10px;"></div>
                        <span>Heavy (&gt;60%)</span>
                    </div>
                    <hr style="margin: 10px 0;">
                    <div style="display: flex; align-items: center;">
                        <div style="width: 20px; height: 20px; background: #DC3545; border-radius: 50%; margin-right: 10px; animation: pulse 1.5s infinite;"></div>
                        <span>Incident/Alert</span>
                    </div>
                </div>
            `;
            
            // Add pulse animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `;
            div.appendChild(style);
            
            return div;
        };
        
        legend.addTo(this.map);
    }

    addSampleMarkers() {
        // Add user location marker
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    this.addMarker([latitude, longitude], 'Your Location', 'user');
                },
                () => {
                    // Default to map center if geolocation fails
                    this.addMarker(this.options.center, 'Your Location', 'user');
                }
            );
        }

        // Add sample destinations
        const destinations = [
            { coords: [20.5937 + 0.05, 78.9629 + 0.05], name: 'Downtown Office', type: 'office' },
            { coords: [20.5937 - 0.05, 78.9629 - 0.05], name: 'Shopping Mall', type: 'shopping' },
            { coords: [20.5937, 78.9629 + 0.1], name: 'Hospital', type: 'hospital' },
            { coords: [20.5937 + 0.1, 78.9629], name: 'University', type: 'education' }
        ];

        destinations.forEach(dest => {
            this.addMarker(dest.coords, dest.name, dest.type);
        });
    }

    addMarker(coords, title, type = 'default') {
        const icons = {
            user: {
                html: `<div style="
                    background: #0077FC;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 0 10px rgba(0, 119, 252, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                "><i class="fas fa-user"></i></div>`,
                size: [30, 30],
                anchor: [15, 15]
            },
            office: {
                html: `<div style="
                    background: #231F20;
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
                "><i class="fas fa-building"></i></div>`,
                size: [25, 25],
                anchor: [12.5, 12.5]
            },
            hospital: {
                html: `<div style="
                    background: #DC3545;
                    width: 25px;
                    height: 25px;
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 0 8px rgba(220, 53, 69, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 10px;
                "><i class="fas fa-hospital"></i></div>`,
                size: [25, 25],
                anchor: [12.5, 12.5]
            },
            default: {
                html: `<div style="
                    background: #28A745;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 0 6px rgba(0,0,0,0.2);
                "></div>`,
                size: [20, 20],
                anchor: [10, 10]
            }
        };

        const iconConfig = icons[type] || icons.default;
        const icon = L.divIcon({
            html: iconConfig.html,
            className: 'custom-marker',
            iconSize: iconConfig.size,
            iconAnchor: iconConfig.anchor
        });

        const marker = L.marker(coords, { icon })
            .addTo(this.map)
            .bindTooltip(title)
            .bindPopup(`<strong>${title}</strong><br>${type.toUpperCase()} location`);

        this.markers.push(marker);
        return marker;
    }

    addSampleRoutes() {
        // Sample route from user to office
        const routeCoordinates = [
            this.options.center,
            [20.5937 + 0.02, 78.9629 + 0.02],
            [20.5937 + 0.05, 78.9629 + 0.05] // Office location
        ];

        const route = L.polyline(routeCoordinates, {
            color: '#0077FC',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 10'
        }).addTo(this.map);

        this.routes.push(route);

        // Add start and end markers
        this.addMarker(routeCoordinates[0], 'Start Point', 'user');
        this.addMarker(routeCoordinates[routeCoordinates.length - 1], 'Destination', 'office');

        // Calculate and display route info
        const distance = this.calculateDistance(routeCoordinates);
        const duration = this.calculateDuration(distance, this.trafficData[0]?.congestion || 0.5);
        
        route.bindTooltip(`
            <strong>Route to Office</strong><br>
            Distance: ${distance.toFixed(1)} km<br>
            Duration: ${duration} minutes<br>
            Traffic: ${Math.round((this.trafficData[0]?.congestion || 0.5) * 100)}%
        `);
    }

    calculateDistance(coordinates) {
        // Simple distance calculation (Haversine formula simplified)
        let total = 0;
        for (let i = 1; i < coordinates.length; i++) {
            const [lat1, lng1] = coordinates[i - 1];
            const [lat2, lng2] = coordinates[i];
            const dLat = (lat2 - lat1) * 111.32; // km per degree latitude
            const dLng = (lng2 - lng1) * 111.32 * Math.cos(lat1 * Math.PI / 180);
            total += Math.sqrt(dLat * dLat + dLng * dLng);
        }
        return total;
    }

    calculateDuration(distanceKm, congestion) {
        const baseSpeed = 40; // km/h in normal traffic
        const effectiveSpeed = baseSpeed * (1 - congestion * 0.6);
        const durationHours = distanceKm / Math.max(effectiveSpeed, 10);
        return Math.round(durationHours * 60);
    }

    addControls() {
        // Add zoom controls
        L.control.zoom({
            position: 'topright'
        }).addTo(this.map);

        // Add geolocation control
        const locateControl = L.control({ position: 'topright' });
        
        locateControl.onAdd = () => {
            const div = L.DomUtil.create('div', 'locate-control');
            div.innerHTML = `
                <button style="
                    background: white;
                    border: none;
                    width: 36px;
                    height: 36px;
                    border-radius: 4px;
                    box-shadow: 0 1px 5px rgba(0,0,0,0.4);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #0077FC;
                    font-size: 18px;
                " title="Locate me">
                    <i class="fas fa-location-arrow"></i>
                </button>
            `;
            
            div.querySelector('button').addEventListener('click', () => {
                this.locateUser();
            });
            
            return div;
        };
        
        locateControl.addTo(this.map);

        // Add traffic toggle control
        const trafficControl = L.control({ position: 'topright' });
        
        trafficControl.onAdd = () => {
            const div = L.DomUtil.create('div', 'traffic-control');
            div.innerHTML = `
                <button style="
                    background: white;
                    border: none;
                    width: 36px;
                    height: 36px;
                    border-radius: 4px;
                    box-shadow: 0 1px 5px rgba(0,0,0,0.4);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: ${this.options.trafficOverlay ? '#0077FC' : '#666'};
                    font-size: 18px;
                " title="Toggle traffic">
                    <i class="fas fa-traffic-light"></i>
                </button>
            `;
            
            div.querySelector('button').addEventListener('click', () => {
                this.toggleTraffic();
                div.querySelector('button').style.color = this.options.trafficOverlay ? '#0077FC' : '#666';
            });
            
            return div;
        };
        
        trafficControl.addTo(this.map);
    }

    locateUser() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    this.map.setView([latitude, longitude], 15);
                    
                    // Add or update user marker
                    const existingUserMarker = this.markers.find(m => 
                        m.getTooltip()?.getContent() === 'Your Location'
                    );
                    
                    if (existingUserMarker) {
                        existingUserMarker.setLatLng([latitude, longitude]);
                    } else {
                        this.addMarker([latitude, longitude], 'Your Location', 'user');
                    }
                },
                error => {
                    alert('Unable to get your location. Please enable location services.');
                }
            );
        }
    }

    toggleTraffic() {
        this.options.trafficOverlay = !this.options.trafficOverlay;
        
        if (this.options.trafficOverlay) {
            this.renderTraffic();
        } else if (this.trafficLayer) {
            this.trafficLayer.clearLayers();
        }
    }

    showRoadDetails(road) {
        const modalContent = `
            <div class="road-details">
                <h4 style="margin-bottom: 1rem;">${road.name}</h4>
                
                <div class="road-metrics">
                    <div class="metric">
                        <span class="metric-label">Congestion</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${road.congestion * 100}%; background: ${this.getTrafficColor(road.congestion)};"></div>
                        </div>
                        <span class="metric-value">${Math.round(road.congestion * 100)}%</span>
                    </div>
                    
                    <div class="metric">
                        <span class="metric-label">Average Speed</span>
                        <span class="metric-value">${road.speed} km/h</span>
                    </div>
                    
                    <div class="metric">
                        <span class="metric-label">Travel Time</span>
                        <span class="metric-value">${Math.round(10 / road.speed * 60)} min per 10km</span>
                    </div>
                </div>
                
                ${road.incidents ? `
                    <div class="incident-alert">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>Incident Reported</strong>
                            <p>${road.incidents.charAt(0).toUpperCase() + road.incidents.slice(1)}</p>
                        </div>
                    </div>
                ` : ''}
                
                <div class="road-actions">
                    <button class="btn-primary" onclick="smartRoadsMap.avoidRoad('${road.name}')">
                        <i class="fas fa-route"></i> Avoid This Road
                    </button>
                    <button class="btn-text" onclick="smartRoadsMap.shareTrafficInfo('${road.name}')">
                        <i class="fas fa-share"></i> Share Info
                    </button>
                </div>
                
                <style>
                    .road-details { padding: 1rem; }
                    .road-metrics { margin: 1.5rem 0; }
                    .metric {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 1rem;
                        padding-bottom: 1rem;
                        border-bottom: 1px solid var(--border);
                    }
                    .metric:last-child {
                        border-bottom: none;
                        margin-bottom: 0;
                        padding-bottom: 0;
                    }
                    .metric-label {
                        flex: 1;
                        color: var(--text-light);
                    }
                    .progress-bar {
                        flex: 2;
                        height: 8px;
                        background: var(--border);
                        border-radius: 4px;
                        overflow: hidden;
                        margin: 0 1rem;
                    }
                    .progress-fill {
                        height: 100%;
                        border-radius: 4px;
                    }
                    .metric-value {
                        font-weight: 600;
                        min-width: 60px;
                        text-align: right;
                    }
                    .incident-alert {
                        background: rgba(220, 53, 69, 0.1);
                        border-left: 4px solid var(--danger);
                        padding: 1rem;
                        border-radius: var(--radius-md);
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        margin-bottom: 1.5rem;
                    }
                    .incident-alert i {
                        color: var(--danger);
                        font-size: 1.5rem;
                    }
                    .road-actions {
                        display: flex;
                        gap: 0.5rem;
                        margin-top: 1.5rem;
                    }
                    .road-actions button {
                        flex: 1;
                    }
                </style>
            </div>
        `;
        
        window.app.showModal('Road Details', modalContent);
    }

    avoidRoad(roadName) {
        console.log(`Avoiding road: ${roadName}`);
        // In a real app, this would update route planning
        window.app.showNotification(`Will avoid ${roadName} in future routes`, 'success');
    }

    shareTrafficInfo(roadName) {
        const road = this.trafficData.find(r => r.name === roadName);
        if (!road) return;

        const shareText = `Traffic on ${roadName}: ${Math.round(road.congestion * 100)}% congestion, ${road.speed} km/h average speed`;
        
        if (navigator.share) {
            navigator.share({
                title: `Traffic Info: ${roadName}`,
                text: shareText,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(shareText);
            window.app.showNotification('Traffic info copied to clipboard', 'success');
        }
    }

    startTrafficUpdates() {
        // Update traffic data every 30 seconds
        setInterval(async () => {
            await this.loadTrafficData();
            this.renderTraffic();
            console.log('Traffic data updated');
        }, 30000);

        // Simulate real-time traffic changes
        setInterval(() => {
            this.simulateTrafficChange();
        }, 10000);
    }

    simulateTrafficChange() {
        // Randomly update traffic conditions
        this.trafficData = this.trafficData.map(road => {
            const change = (Math.random() * 0.1 - 0.05); // -5% to +5% change
            const newCongestion = Math.min(1, Math.max(0, road.congestion + change));
            
            return {
                ...road,
                congestion: newCongestion,
                speed: Math.floor(60 * (1 - newCongestion)),
                incidents: road.incidents && Math.random() > 0.7 ? null : 
                         !road.incidents && Math.random() > 0.95 ? 
                         ['accident', 'construction', 'event'][Math.floor(Math.random() * 3)] : 
                         road.incidents,
                updatedAt: new Date().toISOString()
            };
        });

        // Save updated data
        localStorage.setItem('smartroads_traffic', JSON.stringify(this.trafficData));
        
        // Update display if traffic overlay is active
        if (this.options.trafficOverlay) {
            this.renderTraffic();
        }
    }

    addRoute(from, to, waypoints = []) {
        const coordinates = [from, ...waypoints, to];
        
        const route = L.polyline(coordinates, {
            color: '#0077FC',
            weight: 4,
            opacity: 0.8
        }).addTo(this.map);
        
        this.routes.push(route);
        return route;
    }

    clearRoutes() {
        this.routes.forEach(route => route.remove());
        this.routes = [];
    }

    clearMarkers() {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];
    }

    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        
        this.markers = [];
        this.routes = [];
        this.trafficData = {};
    }
}

// Export for use in other modules
window.SmartRoadsMap = SmartRoadsMap;