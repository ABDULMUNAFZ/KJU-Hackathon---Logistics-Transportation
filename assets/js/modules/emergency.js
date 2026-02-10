// Emergency Services Module - Ambulance & Emergency Response
class EmergencyModule {
    constructor() {
        this.emergencyMode = false;
        this.activeEmergencies = [];
        this.ambulances = [];
        this.hospitals = [];
        this.userLocation = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.initEventListeners();
        this.initMap();
        this.initGeolocation();
        this.loadHospitals();
        this.simulateAmbulances();
        this.initRealtimeUpdates();
    }

    loadData() {
        const savedData = localStorage.getItem('smartroads_emergency');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.activeEmergencies = data.emergencies || [];
            this.ambulances = data.ambulances || this.generateAmbulances();
        } else {
            this.activeEmergencies = this.generateSampleEmergencies();
            this.ambulances = this.generateAmbulances();
            this.saveData();
        }
    }

    generateSampleEmergencies() {
        return [
            {
                id: 'EMG-001',
                timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
                location: {
                    lat: 20.5937 + 0.005,
                    lng: 78.9629 + 0.005,
                    address: '123 Main Street, Downtown'
                },
                patient: {
                    name: 'Rajesh Kumar',
                    age: 45,
                    gender: 'male',
                    condition: 'Chest Pain',
                    severity: 'critical',
                    symptoms: ['Severe chest pain', 'Shortness of breath', 'Sweating'],
                    medicalHistory: ['Hypertension', 'Diabetes'],
                    allergies: 'None known'
                },
                caller: {
                    name: 'Priya Sharma',
                    phone: '+91 9876543210',
                    relationship: 'Wife'
                },
                hospitalPreference: 'private',
                status: 'dispatched',
                ambulanceId: 'AMB-001',
                eta: '8 minutes',
                distance: '3.2 km',
                trafficCondition: 'moderate',
                priorityRoute: true
            }
        ];
    }

    generateAmbulances() {
        return [
            {
                id: 'AMB-001',
                type: 'Advanced Life Support',
                status: 'available',
                location: {
                    lat: 20.5937 - 0.003,
                    lng: 78.9629 - 0.003
                },
                crew: ['Dr. Sharma (Paramedic)', 'Nurse Patel'],
                equipment: ['Defibrillator', 'Oxygen', 'Stretcher'],
                contact: '+91 9876543201'
            },
            {
                id: 'AMB-002',
                type: 'Basic Life Support',
                status: 'on_duty',
                location: {
                    lat: 20.5937 + 0.008,
                    lng: 78.9629 + 0.008
                },
                crew: ['Paramedic Singh', 'EMT Kumar'],
                equipment: ['First Aid', 'Oxygen'],
                contact: '+91 9876543202'
            },
            {
                id: 'AMB-003',
                type: 'Mobile ICU',
                status: 'available',
                location: {
                    lat: 20.5937 + 0.012,
                    lng: 78.9629 - 0.012
                },
                crew: ['Dr. Verma (Cardiologist)', 'Nurse Joshi', 'EMT Reddy'],
                equipment: ['Ventilator', 'ECG Monitor', 'Medications'],
                contact: '+91 9876543203'
            }
        ];
    }

    saveData() {
        const data = {
            emergencies: this.activeEmergencies,
            ambulances: this.ambulances,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('smartroads_emergency', JSON.stringify(data));
    }

    initEventListeners() {
        // Emergency button
        document.getElementById('oneTapEmergency')?.addEventListener('click', () => this.triggerEmergency());
        
        // Emergency alert button
        document.getElementById('emergencyAlert')?.addEventListener('click', () => this.showEmergencyOptions());
        
        // Case actions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.dispatch-ambulance')) {
                const caseId = e.target.closest('.case-card').dataset.caseId;
                this.dispatchAmbulance(caseId);
            }
            
            if (e.target.closest('.view-details')) {
                const caseId = e.target.closest('.case-card').dataset.caseId;
                this.showCaseDetails(caseId);
            }
            
            if (e.target.closest('.navigate-case')) {
                const caseId = e.target.closest('.case-card').dataset.caseId;
                this.navigateToCase(caseId);
            }
            
            if (e.target.closest('.update-status')) {
                const caseId = e.target.closest('.case-card').dataset.caseId;
                this.updateCaseStatus(caseId);
            }
            
            if (e.target.closest('.call-ambulance')) {
                const ambulanceId = e.target.closest('.ambulance-card').dataset.ambulanceId;
                this.callAmbulance(ambulanceId);
            }
            
            if (e.target.closest('.track-ambulance')) {
                const ambulanceId = e.target.closest('.ambulance-card').dataset.ambulanceId;
                this.trackAmbulance(ambulanceId);
            }
        });

        // Quick actions
        document.getElementById('findHospitals')?.addEventListener('click', () => this.findNearestHospitals());
        document.getElementById('firstAidGuide')?.addEventListener('click', () => this.showFirstAidGuide());
        document.getElementById('emergencyContacts')?.addEventListener('click', () => this.showEmergencyContacts());
        document.getElementById('reportTraffic')?.addEventListener('click', () => this.reportTrafficBlockage());

        // Hospital actions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.select-hospital')) {
                const hospitalId = e.target.closest('.hospital-card').dataset.hospitalId;
                this.selectHospital(hospitalId);
            }
        });
    }

    initMap() {
        const mapContainer = document.getElementById('emergencyMap');
        if (mapContainer) {
            this.map = new SmartRoadsMap('emergencyMap', {
                center: [20.5937, 78.9629],
                zoom: 13,
                trafficOverlay: true,
                markers: true,
                routes: false
            });
            
            // Add emergency markers
            this.addEmergencyMarkers();
            
            // Add ambulance markers
            this.addAmbulanceMarkers();
        }
    }

    initGeolocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    // Add user location marker
                    if (this.map && this.map.map) {
                        this.userMarker = this.map.addMarker(
                            [this.userLocation.lat, this.userLocation.lng],
                            'Your Location',
                            'user'
                        );
                        
                        // Center map on user
                        this.map.map.setView([this.userLocation.lat, this.userLocation.lng], 15);
                    }
                },
                error => {
                    console.log('Geolocation error:', error);
                    // Use default location
                    this.userLocation = { lat: 20.5937, lng: 78.9629 };
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            this.userLocation = { lat: 20.5937, lng: 78.9629 };
        }
    }

    loadHospitals() {
        this.hospitals = [
            {
                id: 'HOSP-001',
                name: 'City General Hospital',
                type: 'government',
                address: '456 Hospital Road, Medical District',
                phone: '+91 1234567890',
                emergencyPhone: '108',
                distance: '2.5 km',
                eta: '7 minutes',
                facilities: ['ICU', 'Emergency', 'Surgery', 'Cardiology'],
                bedsAvailable: 15,
                doctorsAvailable: 8,
                waitTime: '15 minutes',
                coordinates: [20.5937 + 0.01, 78.9629 + 0.01]
            },
            {
                id: 'HOSP-002',
                name: 'Private Medical Center',
                type: 'private',
                address: '789 Health Street, Business District',
                phone: '+91 9876543210',
                emergencyPhone: '+91 9876543211',
                distance: '3.8 km',
                eta: '10 minutes',
                facilities: ['24/7 Emergency', 'ICU', 'Trauma Center', 'Lab'],
                bedsAvailable: 8,
                doctorsAvailable: 5,
                waitTime: '10 minutes',
                coordinates: [20.5937 - 0.008, 78.9629 - 0.008]
            },
            {
                id: 'HOSP-003',
                name: 'Specialty Care Hospital',
                type: 'private',
                address: '234 Care Avenue, Residential Area',
                phone: '+91 8765432109',
                emergencyPhone: '+91 8765432110',
                distance: '5.2 km',
                eta: '14 minutes',
                facilities: ['Cardiac Care', 'Neurology', 'Orthopedics', 'ICU'],
                bedsAvailable: 12,
                doctorsAvailable: 6,
                waitTime: '20 minutes',
                coordinates: [20.5937 + 0.015, 78.9629 - 0.015]
            },
            {
                id: 'HOSP-004',
                name: 'Public Health Center',
                type: 'government',
                address: '567 Service Road, Downtown',
                phone: '+91 7654321098',
                emergencyPhone: '102',
                distance: '4.1 km',
                eta: '11 minutes',
                facilities: ['Emergency', 'OPD', 'Pharmacy', 'Basic Care'],
                bedsAvailable: 20,
                doctorsAvailable: 4,
                waitTime: '30 minutes',
                coordinates: [20.5937 - 0.012, 78.9629 + 0.012]
            }
        ];
        
        this.renderHospitals();
        this.addHospitalMarkers();
    }

    addEmergencyMarkers() {
        if (!this.map || !this.map.map) return;
        
        this.emergencyMarkers = [];
        
        this.activeEmergencies.forEach(emergency => {
            const icon = L.divIcon({
                html: `
                    <div class="emergency-marker" style="
                        background: ${this.getSeverityColor(emergency.patient.severity)};
                        width: 35px;
                        height: 35px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 0 15px ${this.getSeverityColor(emergency.patient.severity)};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 18px;
                        font-weight: bold;
                        position: relative;
                        animation: pulse-emergency 1s infinite;
                    ">
                        <i class="fas fa-plus"></i>
                    </div>
                `,
                className: 'emergency-marker-icon',
                iconSize: [35, 35],
                iconAnchor: [17.5, 17.5]
            });
            
            const marker = L.marker(
                [emergency.location.lat, emergency.location.lng],
                { icon }
            )
            .addTo(this.map.map)
            .bindTooltip(`
                <strong>Emergency: ${emergency.id}</strong><br>
                ${emergency.patient.condition}<br>
                Severity: ${emergency.patient.severity}<br>
                ETA: ${emergency.eta}
            `)
            .bindPopup(`
                <div class="emergency-popup">
                    <h4>${emergency.id}</h4>
                    <p><strong>Patient:</strong> ${emergency.patient.name}</p>
                    <p><strong>Condition:</strong> ${emergency.patient.condition}</p>
                    <p><strong>Severity:</strong> ${emergency.patient.severity}</p>
                    <p><strong>ETA:</strong> ${emergency.eta}</p>
                    <button class="btn-primary" onclick="emergencyModule.navigateToCase('${emergency.id}')">
                        Navigate
                    </button>
                </div>
            `);
            
            this.emergencyMarkers.push({
                emergencyId: emergency.id,
                marker: marker
            });
            
            // Add pulsing animation
            if (!document.querySelector('#emergency-animations')) {
                const style = document.createElement('style');
                style.id = 'emergency-animations';
                style.textContent = `
                    @keyframes pulse-emergency {
                        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
                        70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
                        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
                    }
                `;
                document.head.appendChild(style);
            }
        });
    }

    addAmbulanceMarkers() {
        if (!this.map || !this.map.map) return;
        
        this.ambulanceMarkers = [];
        
        this.ambulances.forEach(ambulance => {
            const icon = L.divIcon({
                html: `
                    <div class="ambulance-marker" style="
                        background: ${this.getAmbulanceStatusColor(ambulance.status)};
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 0 10px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 14px;
                    ">
                        <i class="fas fa-ambulance"></i>
                    </div>
                `,
                className: 'ambulance-marker-icon',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            
            const marker = L.marker(
                [ambulance.location.lat, ambulance.location.lng],
                { icon }
            )
            .addTo(this.map.map)
            .bindTooltip(`
                <strong>${ambulance.id}</strong><br>
                ${ambulance.type}<br>
                Status: ${ambulance.status}
            `);
            
            this.ambulanceMarkers.push({
                ambulanceId: ambulance.id,
                marker: marker
            });
        });
    }

    addHospitalMarkers() {
        if (!this.map || !this.map.map) return;
        
        this.hospitalMarkers = [];
        
        this.hospitals.forEach(hospital => {
            const icon = L.divIcon({
                html: `
                    <div class="hospital-marker" style="
                        background: ${hospital.type === 'government' ? '#DC3545' : '#0077FC'};
                        width: 28px;
                        height: 28px;
                        border-radius: 4px;
                        border: 2px solid white;
                        box-shadow: 0 0 8px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 12px;
                    ">
                        <i class="fas fa-hospital"></i>
                    </div>
                `,
                className: 'hospital-marker-icon',
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });
            
            const marker = L.marker(
                hospital.coordinates,
                { icon }
            )
            .addTo(this.map.map)
            .bindTooltip(`
                <strong>${hospital.name}</strong><br>
                ${hospital.type === 'government' ? 'Govt' : 'Private'}<br>
                ETA: ${hospital.eta}
            `);
            
            this.hospitalMarkers.push({
                hospitalId: hospital.id,
                marker: marker
            });
        });
    }

    getSeverityColor(severity) {
        switch(severity) {
            case 'critical': return '#DC3545'; // Red
            case 'serious': return '#FFC107'; // Yellow
            case 'moderate': return '#17A2B8'; // Cyan
            case 'minor': return '#28A745'; // Green
            default: return '#6C757D';
        }
    }

    getAmbulanceStatusColor(status) {
        switch(status) {
            case 'available': return '#28A745'; // Green
            case 'on_duty': return '#0077FC'; // Blue
            case 'dispatched': return '#FFC107'; // Yellow
            case 'busy': return '#DC3545'; // Red
            default: return '#6C757D';
        }
    }

    triggerEmergency() {
        if (!this.userLocation) {
            this.showNotification('Getting your location...', 'info');
            this.initGeolocation();
            setTimeout(() => this.showEmergencyForm(), 1000);
            return;
        }
        
        this.showEmergencyForm();
    }

    showEmergencyForm() {
        window.app.showModal('Emergency Alert', `
            <div style="padding: 1rem;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger);"></i>
                    <h4 style="margin-top: 1rem;">Emergency Alert</h4>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: var(--text-light); text-align: center;">
                        Please provide emergency details for faster response
                    </p>
                </div>
                
                <div class="input-group">
                    <label class="input-label">Patient Condition</label>
                    <select class="form-input" id="patientCondition">
                        <option value="">Select condition</option>
                        <option value="heart_attack">Heart Attack / Chest Pain</option>
                        <option value="stroke">Stroke / Paralysis</option>
                        <option value="accident">Accident / Injury</option>
                        <option value="breathing">Breathing Difficulty</option>
                        <option value="unconscious">Unconscious / Fainted</option>
                        <option value="bleeding">Severe Bleeding</option>
                        <option value="burn">Burn / Electric Shock</option>
                        <option value="poisoning">Poisoning / Overdose</option>
                        <option value="other">Other Emergency</option>
                    </select>
                </div>
                
                <div class="input-group">
                    <label class="input-label">Severity Level</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <label style="flex: 1; text-align: center;">
                            <input type="radio" name="severity" value="critical" style="margin-right: 0.5rem;">
                            <span style="color: var(--danger);">Critical</span>
                        </label>
                        <label style="flex: 1; text-align: center;">
                            <input type="radio" name="severity" value="serious" style="margin-right: 0.5rem;">
                            <span style="color: var(--warning);">Serious</span>
                        </label>
                        <label style="flex: 1; text-align: center;">
                            <input type="radio" name="severity" value="moderate" style="margin-right: 0.5rem;">
                            <span style="color: var(--info);">Moderate</span>
                        </label>
                    </div>
                </div>
                
                <div class="input-group">
                    <label class="input-label">Hospital Preference</label>
                    <select class="form-input" id="hospitalPreference">
                        <option value="nearest">Nearest Available</option>
                        <option value="government">Government Hospital</option>
                        <option value="private">Private Hospital</option>
                        <option value="specific">Specific Hospital</option>
                    </select>
                </div>
                
                <div class="input-group">
                    <label class="input-label">Additional Information</label>
                    <textarea class="form-input" id="emergencyNotes" 
                              placeholder="Any additional details, symptoms, or instructions..." 
                              style="height: 80px;"></textarea>
                </div>
                
                <div style="margin-top: 1.5rem;">
                    <p style="font-size: 0.9rem; color: var(--text-light); text-align: center;">
                        <i class="fas fa-info-circle"></i> 
                        Your location and these details will be sent to emergency services
                    </p>
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                    <button class="btn-primary" style="flex: 1; background: var(--danger);" 
                            onclick="emergencyModule.submitEmergency()">
                        <i class="fas fa-ambulance"></i> SEND EMERGENCY ALERT
                    </button>
                    <button class="btn-text" style="flex: 1;" 
                            onclick="emergencyModule.cancelEmergency()">
                        Cancel
                    </button>
                </div>
            </div>
        `);
        
        // Auto-select critical if not selected
        setTimeout(() => {
            if (!document.querySelector('input[name="severity"]:checked')) {
                document.querySelector('input[name="severity"][value="critical"]').checked = true;
            }
        }, 100);
    }

    submitEmergency() {
        const modal = document.querySelector('.modal-overlay');
        const condition = modal?.querySelector('#patientCondition')?.value;
        const severity = modal?.querySelector('input[name="severity"]:checked')?.value;
        const hospitalPreference = modal?.querySelector('#hospitalPreference')?.value;
        const notes = modal?.querySelector('#emergencyNotes')?.value;
        
        if (!condition || !severity) {
            this.showNotification('Please select condition and severity', 'error');
            return;
        }
        
        const conditionText = {
            'heart_attack': 'Heart Attack / Chest Pain',
            'stroke': 'Stroke / Paralysis',
            'accident': 'Accident / Injury',
            'breathing': 'Breathing Difficulty',
            'unconscious': 'Unconscious / Fainted',
            'bleeding': 'Severe Bleeding',
            'burn': 'Burn / Electric Shock',
            'poisoning': 'Poisoning / Overdose',
            'other': 'Other Emergency'
        }[condition] || condition;
        
        // Create emergency case
        const newEmergency = {
            id: `EMG-${Date.now().toString().slice(-6)}`,
            timestamp: new Date().toISOString(),
            location: this.userLocation || { lat: 20.5937, lng: 78.9629, address: 'Current Location' },
            patient: {
                name: 'Unknown',
                age: 'Unknown',
                gender: 'Unknown',
                condition: conditionText,
                severity: severity,
                symptoms: notes ? [notes] : [],
                medicalHistory: [],
                allergies: 'Unknown'
            },
            caller: {
                name: 'User',
                phone: 'Unknown',
                relationship: 'Self'
            },
            hospitalPreference: hospitalPreference,
            status: 'pending',
            ambulanceId: null,
            eta: 'Calculating...',
            distance: 'Calculating...',
            trafficCondition: 'unknown',
            priorityRoute: true
        };
        
        this.activeEmergencies.unshift(newEmergency);
        this.saveData();
        this.renderEmergencies();
        this.addEmergencyMarkers();
        
        modal?.remove();
        
        // Show emergency alert sent confirmation
        this.showEmergencyAlertSent(newEmergency);
        
        // Automatically find and dispatch nearest ambulance
        setTimeout(() => {
            this.findNearestAmbulance(newEmergency.id);
        }, 1000);
    }

    showEmergencyAlertSent(emergency) {
        window.app.showModal('Emergency Alert Sent!', `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success); margin-bottom: 1rem;"></i>
                <h4>Emergency Alert Sent Successfully</h4>
                
                <div style="
                    background: var(--background-alt);
                    border-radius: var(--radius-md);
                    padding: 1.5rem;
                    margin: 1.5rem 0;
                    text-align: left;
                ">
                    <div style="margin-bottom: 0.75rem;">
                        <div style="font-size: 0.9rem; color: var(--text-light);">Case ID</div>
                        <div style="font-weight: 600; font-size: 1.1rem;">${emergency.id}</div>
                    </div>
                    
                    <div style="margin-bottom: 0.75rem;">
                        <div style="font-size: 0.9rem; color: var(--text-light);">Condition</div>
                        <div style="font-weight: 600; color: ${this.getSeverityColor(emergency.patient.severity)}">
                            ${emergency.patient.condition}
                        </div>
                    </div>
                    
                    <div>
                        <div style="font-size: 0.9rem; color: var(--text-light);">Location</div>
                        <div style="font-weight: 600;">${emergency.location.address || 'Your location'}</div>
                    </div>
                </div>
                
                <p style="color: var(--text-light);">
                    <i class="fas fa-ambulance"></i> 
                    Nearest ambulance is being dispatched...
                </p>
                
                <div class="eta-display" style="
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--danger);
                    margin: 1.5rem 0;
                    font-family: monospace;
                ">--:--</div>
                
                <button class="btn-primary" style="width: 100%;" onclick="emergencyModule.trackAmbulanceDispatch('${emergency.id}')">
                    <i class="fas fa-map-marked-alt"></i> Track Ambulance
                </button>
            </div>
        `);
        
        // Start ETA countdown
        let etaSeconds = 30;
        const etaElement = document.querySelector('.eta-display');
        const etaInterval = setInterval(() => {
            etaSeconds--;
            if (etaElement) {
                const minutes = Math.floor(etaSeconds / 60);
                const seconds = etaSeconds % 60;
                etaElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            if (etaSeconds <= 0) {
                clearInterval(etaInterval);
                this.showAmbulanceArrived(emergency.id);
            }
        }, 1000);
    }

    cancelEmergency() {
        document.querySelector('.modal-overlay')?.remove();
        this.showNotification('Emergency alert cancelled', 'info');
    }

    findNearestAmbulance(emergencyId) {
        const emergency = this.activeEmergencies.find(e => e.id === emergencyId);
        if (!emergency) return;
        
        // Find nearest available ambulance
        const availableAmbulances = this.ambulances.filter(a => 
            a.status === 'available' || a.status === 'on_duty'
        );
        
        if (availableAmbulances.length === 0) {
            this.showNotification('No ambulances available. Trying nearby areas...', 'warning');
            return;
        }
        
        // Simple distance calculation
        let nearestAmbulance = null;
        let nearestDistance = Infinity;
        
        availableAmbulances.forEach(ambulance => {
            const distance = this.calculateDistance(
                emergency.location,
                ambulance.location
            );
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestAmbulance = ambulance;
            }
        });
        
        if (nearestAmbulance) {
            // Update ambulance status
            nearestAmbulance.status = 'dispatched';
            
            // Update emergency case
            emergency.ambulanceId = nearestAmbulance.id;
            emergency.status = 'dispatched';
            emergency.distance = `${nearestDistance.toFixed(1)} km`;
            emergency.eta = `${Math.ceil(nearestDistance * 3)} minutes`; // Rough estimate
            
            this.saveData();
            this.renderEmergencies();
            this.updateAmbulanceMarkers();
            
            // Show notification
            this.showNotification(`Ambulance ${nearestAmbulance.id} dispatched! ETA: ${emergency.eta}`, 'success');
            
            // Draw route on map
            this.drawAmbulanceRoute(emergency, nearestAmbulance);
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

    drawAmbulanceRoute(emergency, ambulance) {
        if (!this.map || !this.map.map) return;
        
        // Clear existing routes
        if (this.ambulanceRoute) {
            this.ambulanceRoute.remove();
        }
        
        // Draw route from ambulance to emergency location
        this.ambulanceRoute = L.polyline([
            [ambulance.location.lat, ambulance.location.lng],
            [emergency.location.lat, emergency.location.lng]
        ], {
            color: '#DC3545',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 10'
        }).addTo(this.map.map);
        
        // Fit map to show route
        const bounds = L.latLngBounds([
            [ambulance.location.lat, ambulance.location.lng],
            [emergency.location.lat, emergency.location.lng]
        ]);
        this.map.map.fitBounds(bounds.pad(0.1));
    }

    trackAmbulanceDispatch(emergencyId) {
        const emergency = this.activeEmergencies.find(e => e.id === emergencyId);
        if (!emergency) return;
        
        document.querySelector('.modal-overlay')?.remove();
        
        // Show ambulance tracking screen
        this.showAmbulanceTracking(emergency);
    }

    showAmbulanceTracking(emergency) {
        const ambulance = this.ambulances.find(a => a.id === emergency.ambulanceId);
        if (!ambulance) return;
        
        window.app.showModal(`Tracking Ambulance ${ambulance.id}`, `
            <div style="padding: 1rem;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <i class="fas fa-ambulance" style="font-size: 3rem; color: var(--danger);"></i>
                    <h4 style="margin-top: 1rem;">Ambulance En Route</h4>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div style="
                            width: 50px;
                            height: 50px;
                            background: var(--danger);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 1.5rem;
                        ">
                            <i class="fas fa-ambulance"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; font-size: 1.1rem;">${ambulance.id}</div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">
                                ${ambulance.type} • ${ambulance.crew.length} crew members
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                            <div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">Current ETA</div>
                                <div style="font-size: 1.5rem; font-weight: 700; color: var(--danger);">
                                    ${emergency.eta}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.9rem; color: var(--text-light);">Distance</div>
                                <div style="font-size: 1.5rem; font-weight: 700;">${emergency.distance}</div>
                            </div>
                        </div>
                        
                        <div style="background: var(--border); height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="width: 45%; height: 100%; background: var(--danger);"></div>
                        </div>
                    </div>
                </div>
                
                <div id="trackingMap" style="
                    height: 200px;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    margin-bottom: 1.5rem;
                "></div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h5 style="margin-bottom: 0.75rem; color: var(--text-light);">Ambulance Details</h5>
                    <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                        <div style="margin-bottom: 0.5rem;">
                            <div style="font-size: 0.9rem; color: var(--text-light);">Crew</div>
                            <div style="font-weight: 600;">${ambulance.crew.join(', ')}</div>
                        </div>
                        <div style="margin-bottom: 0.5rem;">
                            <div style="font-size: 0.9rem; color: var(--text-light);">Equipment</div>
                            <div style="font-weight: 600;">${ambulance.equipment.join(', ')}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">Contact</div>
                            <div style="font-weight: 600;">${ambulance.contact}</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="flex: 1;" onclick="emergencyModule.callAmbulance('${ambulance.id}')">
                        <i class="fas fa-phone"></i> Call Ambulance
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
                center: ambulance.location,
                zoom: 14,
                trafficOverlay: true,
                markers: true,
                routes: true
            });
            
            // Add markers
            trackingMap.addMarker(
                ambulance.location,
                'Ambulance Location',
                'user'
            );
            
            trackingMap.addMarker(
                emergency.location,
                'Emergency Location',
                'hospital'
            );
            
            // Draw route
            trackingMap.addRoute(
                ambulance.location,
                emergency.location
            );
        }, 100);
    }

    showAmbulanceArrived(emergencyId) {
        const emergency = this.activeEmergencies.find(e => e.id === emergencyId);
        if (!emergency) return;
        
        window.app.showModal('Ambulance Arrived!', `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success); margin-bottom: 1rem;"></i>
                <h4>Ambulance Has Arrived</h4>
                
                <div style="
                    background: var(--background-alt);
                    border-radius: var(--radius-md);
                    padding: 1.5rem;
                    margin: 1.5rem 0;
                ">
                    <p style="margin: 0 0 1rem 0;">
                        Ambulance <strong>${emergency.ambulanceId}</strong> has arrived at the emergency location.
                    </p>
                    
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">Response Time</div>
                            <div style="font-weight: 600;">8 minutes</div>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">Distance</div>
                            <div style="font-weight: 600;">${emergency.distance}</div>
                        </div>
                    </div>
                </div>
                
                <p style="color: var(--text-light); margin-bottom: 1.5rem;">
                    Medical team is now providing emergency care.
                </p>
                
                <button class="btn-primary" style="width: 100%;" 
                        onclick="emergencyModule.showHospitalSelection('${emergencyId}')">
                    <i class="fas fa-hospital"></i> Select Hospital for Transport
                </button>
            </div>
        `);
        
        // Update emergency status
        emergency.status = 'on_site';
        this.saveData();
        this.renderEmergencies();
    }

    showHospitalSelection(emergencyId) {
        const emergency = this.activeEmergencies.find(e => e.id === emergencyId);
        if (!emergency) return;
        
        document.querySelector('.modal-overlay')?.remove();
        
        // Filter hospitals based on preference
        let filteredHospitals = this.hospitals;
        
        if (emergency.hospitalPreference === 'government') {
            filteredHospitals = this.hospitals.filter(h => h.type === 'government');
        } else if (emergency.hospitalPreference === 'private') {
            filteredHospitals = this.hospitals.filter(h => h.type === 'private');
        } else if (emergency.hospitalPreference === 'specific') {
            // Show all for selection
            filteredHospitals = this.hospitals;
        } else {
            // Nearest available - sort by distance
            filteredHospitals = [...this.hospitals].sort((a, b) => 
                parseFloat(a.distance) - parseFloat(b.distance)
            );
        }
        
        window.app.showModal('Select Hospital', `
            <div style="padding: 1rem; max-height: 70vh; overflow-y: auto;">
                <h4 style="margin-bottom: 1rem;">Select Hospital for Transport</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: var(--text-light);">
                        Patient condition: <strong>${emergency.patient.condition}</strong><br>
                        Severity: <strong style="color: ${this.getSeverityColor(emergency.patient.severity)}">
                            ${emergency.patient.severity}
                        </strong>
                    </p>
                </div>
                
                <div class="hospital-selection">
                    ${filteredHospitals.map(hospital => `
                        <div class="hospital-card" data-hospital-id="${hospital.id}" 
                             style="
                                background: var(--background);
                                border: 1px solid var(--border);
                                border-radius: var(--radius-md);
                                padding: 1.25rem;
                                margin-bottom: 1rem;
                                cursor: pointer;
                                transition: var(--transition);
                             ">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                <div>
                                    <h5 style="margin: 0 0 0.5rem 0;">${hospital.name}</h5>
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="
                                            padding: 0.15rem 0.5rem;
                                            border-radius: 12px;
                                            font-size: 0.75rem;
                                            font-weight: 600;
                                            background: ${hospital.type === 'government' ? 'rgba(220, 53, 69, 0.1)' : 'rgba(0, 119, 252, 0.1)'};
                                            color: ${hospital.type === 'government' ? 'var(--danger)' : 'var(--primary-blue)'};
                                        ">
                                            ${hospital.type === 'government' ? 'Government' : 'Private'}
                                        </span>
                                        <span style="font-size: 0.85rem; color: var(--text-light);">
                                            <i class="fas fa-bed"></i> ${hospital.bedsAvailable} beds available
                                        </span>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary-blue);">
                                        ${hospital.eta}
                                    </div>
                                    <div style="font-size: 0.85rem; color: var(--text-light);">
                                        ${hospital.distance} away
                                    </div>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 1rem;">
                                <div style="font-size: 0.9rem; color: var(--text-light); margin-bottom: 0.5rem;">
                                    <i class="fas fa-phone"></i> ${hospital.emergencyPhone}
                                </div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">
                                    <i class="fas fa-map-marker-alt"></i> ${hospital.address}
                                </div>
                            </div>
                            
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
                                ${hospital.facilities.slice(0, 3).map(facility => `
                                    <span style="
                                        padding: 0.25rem 0.5rem;
                                        background: var(--background-alt);
                                        border-radius: 12px;
                                        font-size: 0.75rem;
                                        color: var(--text-light);
                                    ">
                                        ${facility}
                                    </span>
                                `).join('')}
                                ${hospital.facilities.length > 3 ? `
                                    <span style="
                                        padding: 0.25rem 0.5rem;
                                        background: var(--background-alt);
                                        border-radius: 12px;
                                        font-size: 0.75rem;
                                        color: var(--text-light);
                                    ">
                                        +${hospital.facilities.length - 3} more
                                    </span>
                                ` : ''}
                            </div>
                            
                            <button class="btn-primary select-hospital" style="width: 100%;">
                                <i class="fas fa-check"></i> Select This Hospital
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 1rem; text-align: center;">
                    <button class="btn-text" onclick="emergencyModule.showAllHospitals()">
                        <i class="fas fa-search"></i> Show All Hospitals
                    </button>
                </div>
            </div>
        `);
    }

    selectHospital(hospitalId) {
        const hospital = this.hospitals.find(h => h.id === hospitalId);
        if (!hospital) return;
        
        // Get current emergency from context (would need to track)
        const activeEmergency = this.activeEmergencies[0];
        if (activeEmergency) {
            activeEmergency.selectedHospital = hospital;
            activeEmergency.status = 'transporting';
            activeEmergency.hospitalEta = hospital.eta;
            
            this.saveData();
            this.renderEmergencies();
            
            document.querySelector('.modal-overlay')?.remove();
            
            this.showNotification(`Selected ${hospital.name} for transport`, 'success');
            
            // Show transport tracking
            this.showTransportTracking(activeEmergency, hospital);
        }
    }

    showTransportTracking(emergency, hospital) {
        window.app.showModal('Transport in Progress', `
            <div style="padding: 1rem;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <i class="fas fa-ambulance" style="font-size: 3rem; color: var(--primary-blue);"></i>
                    <h4 style="margin-top: 1rem;">Transport to Hospital</h4>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div style="
                            width: 50px;
                            height: 50px;
                            background: var(--success);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 1.5rem;
                        ">
                            <i class="fas fa-hospital"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; font-size: 1.1rem;">${hospital.name}</div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">
                                ${hospital.type === 'government' ? 'Government Hospital' : 'Private Hospital'}
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                            <div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">Hospital ETA</div>
                                <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-blue);">
                                    ${hospital.eta}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.9rem; color: var(--text-light);">Distance</div>
                                <div style="font-size: 1.5rem; font-weight: 700;">${hospital.distance}</div>
                            </div>
                        </div>
                        
                        <div style="background: var(--border); height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="width: 30%; height: 100%; background: var(--primary-blue);"></div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h5 style="margin-bottom: 0.75rem; color: var(--text-light);">Patient Status</h5>
                    <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                            <span style="color: var(--text-light);">Condition:</span>
                            <span style="font-weight: 600; color: ${this.getSeverityColor(emergency.patient.severity)}">
                                ${emergency.patient.condition}
                            </span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-light);">Stable:</span>
                            <span style="font-weight: 600; color: var(--success);">Yes, under care</span>
                        </div>
                    </div>
                </div>
                
                <div id="transportMap" style="
                    height: 200px;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    margin-bottom: 1.5rem;
                "></div>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="flex: 1;" onclick="emergencyModule.callHospital('${hospital.id}')">
                        <i class="fas fa-phone"></i> Call Hospital
                    </button>
                    <button class="btn-text" style="flex: 1;" 
                            onclick="document.querySelector('.modal-overlay').remove()">
                        Close
                    </button>
                </div>
            </div>
        `);
        
        // Initialize transport map
        setTimeout(() => {
            const transportMap = new SmartRoadsMap('transportMap', {
                center: emergency.location,
                zoom: 13,
                trafficOverlay: true,
                markers: true,
                routes: true
            });
            
            // Add markers
            transportMap.addMarker(
                emergency.location,
                'Pickup Location',
                'hospital'
            );
            
            transportMap.addMarker(
                hospital.coordinates,
                hospital.name,
                'hospital'
            );
            
            // Draw route
            transportMap.addRoute(
                emergency.location,
                hospital.coordinates
            );
        }, 100);
    }

    showAllHospitals() {
        document.querySelector('.modal-overlay')?.remove();
        
        window.app.showModal('All Hospitals', `
            <div style="padding: 1rem; max-height: 70vh; overflow-y: auto;">
                <h4 style="margin-bottom: 1rem;">All Nearby Hospitals</h4>
                
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
                    <button class="btn-text" onclick="emergencyModule.filterHospitals('all')" style="flex: 1;">
                        All
                    </button>
                    <button class="btn-text" onclick="emergencyModule.filterHospitals('government')" style="flex: 1;">
                        Government
                    </button>
                    <button class="btn-text" onclick="emergencyModule.filterHospitals('private')" style="flex: 1;">
                        Private
                    </button>
                </div>
                
                <div class="hospitals-list">
                    ${this.hospitals.map(hospital => `
                        <div class="hospital-card" data-hospital-id="${hospital.id}" 
                             style="
                                background: var(--background);
                                border: 1px solid var(--border);
                                border-radius: var(--radius-md);
                                padding: 1rem;
                                margin-bottom: 1rem;
                             ">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                                <h5 style="margin: 0;">${hospital.name}</h5>
                                <span style="
                                    padding: 0.15rem 0.5rem;
                                    border-radius: 12px;
                                    font-size: 0.75rem;
                                    font-weight: 600;
                                    background: ${hospital.type === 'government' ? 'rgba(220, 53, 69, 0.1)' : 'rgba(0, 119, 252, 0.1)'};
                                    color: ${hospital.type === 'government' ? 'var(--danger)' : 'var(--primary-blue)'};
                                ">
                                    ${hospital.type === 'government' ? 'Govt' : 'Private'}
                                </span>
                            </div>
                            
                            <div style="margin-bottom: 0.75rem;">
                                <div style="font-size: 0.9rem; color: var(--text-light);">
                                    <i class="fas fa-map-marker-alt"></i> ${hospital.address}
                                </div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">
                                    <i class="fas fa-phone"></i> ${hospital.phone}
                                </div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-size: 0.85rem; color: var(--text-light);">Distance</div>
                                    <div style="font-weight: 600;">${hospital.distance}</div>
                                </div>
                                <div>
                                    <div style="font-size: 0.85rem; color: var(--text-light);">ETA</div>
                                    <div style="font-weight: 600; color: var(--primary-blue);">${hospital.eta}</div>
                                </div>
                                <div>
                                    <div style="font-size: 0.85rem; color: var(--text-light);">Beds</div>
                                    <div style="font-weight: 600;">${hospital.bedsAvailable}</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="text-align: center; margin-top: 1rem;">
                    <p style="font-size: 0.9rem; color: var(--text-light);">
                        <i class="fas fa-info-circle"></i> 
                        Showing ${this.hospitals.length} hospitals within 10km radius
                    </p>
                </div>
            </div>
        `);
    }

    filterHospitals(type) {
        // This would filter hospitals based on type
        console.log(`Filtering hospitals by: ${type}`);
    }

    renderEmergencies() {
        const container = document.querySelector('.cases-list');
        if (!container) return;
        
        container.innerHTML = this.activeEmergencies.map(emergency => `
            <div class="case-card" data-case-id="${emergency.id}">
                <div class="case-header">
                    <div class="case-id">
                        <h4>${emergency.id}</h4>
                        <div class="case-meta">
                            <span class="timestamp">${new Date(emergency.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <span class="severity ${emergency.patient.severity}" 
                                  style="background: ${this.getSeverityColor(emergency.patient.severity)}">
                                ${emergency.patient.severity}
                            </span>
                        </div>
                    </div>
                    <div class="case-status">
                        <span class="status-badge ${emergency.status}">
                            ${emergency.status.charAt(0).toUpperCase() + emergency.status.slice(1)}
                        </span>
                    </div>
                </div>
                
                <div class="case-details">
                    <div class="detail-row">
                        <i class="fas fa-user-injured"></i>
                        <div>
                            <span class="label">Patient Condition</span>
                            <span class="value">${emergency.patient.condition}</span>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <div>
                            <span class="label">Location</span>
                            <span class="value">${emergency.location.address || 'Current Location'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <i class="fas fa-ambulance"></i>
                        <div>
                            <span class="label">Ambulance</span>
                            <span class="value">${emergency.ambulanceId || 'Not assigned'}</span>
                        </div>
                    </div>
                    
                    ${emergency.eta ? `
                        <div class="detail-row">
                            <i class="fas fa-clock"></i>
                            <div>
                                <span class="label">ETA</span>
                                <span class="value">${emergency.eta}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="case-actions">
                    ${emergency.status === 'pending' ? `
                        <button class="btn-primary dispatch-ambulance">
                            <i class="fas fa-ambulance"></i> Dispatch Ambulance
                        </button>
                    ` : ''}
                    
                    ${emergency.status === 'dispatched' || emergency.status === 'on_site' || emergency.status === 'transporting' ? `
                        <button class="btn-primary navigate-case">
                            <i class="fas fa-directions"></i> Navigate
                        </button>
                        <button class="btn-text update-status">
                            <i class="fas fa-edit"></i> Update
                        </button>
                    ` : ''}
                    
                    <button class="btn-text view-details">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add styles if not present
        this.addCaseCardStyles();
    }

    renderHospitals() {
        const container = document.querySelector('.hospitals-list');
        if (!container) return;
        
        // Show only nearest 3 hospitals
        const nearestHospitals = [...this.hospitals]
            .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
            .slice(0, 3);
        
        container.innerHTML = nearestHospitals.map(hospital => `
            <div class="hospital-card" data-hospital-id="${hospital.id}">
                <div class="hospital-header">
                    <div class="hospital-name">
                        <h4>${hospital.name}</h4>
                        <span class="hospital-type ${hospital.type}">
                            ${hospital.type === 'government' ? 'Government' : 'Private'}
                        </span>
                    </div>
                    <div class="hospital-distance">
                        <div class="distance-value">${hospital.distance}</div>
                        <div class="distance-label">away</div>
                    </div>
                </div>
                
                <div class="hospital-info">
                    <div class="info-row">
                        <i class="fas fa-clock"></i>
                        <span>ETA: ${hospital.eta}</span>
                    </div>
                    
                    <div class="info-row">
                        <i class="fas fa-phone"></i>
                        <span>${hospital.emergencyPhone}</span>
                    </div>
                    
                    <div class="info-row">
                        <i class="fas fa-bed"></i>
                        <span>${hospital.bedsAvailable} beds available</span>
                    </div>
                </div>
                
                <div class="hospital-facilities">
                    ${hospital.facilities.slice(0, 2).map(facility => `
                        <span class="facility-tag">${facility}</span>
                    `).join('')}
                    ${hospital.facilities.length > 2 ? `
                        <span class="facility-tag">+${hospital.facilities.length - 2} more</span>
                    ` : ''}
                </div>
                
                <div class="hospital-actions">
                    <button class="btn-primary select-hospital">
                        <i class="fas fa-check"></i> Select
                    </button>
                    <button class="btn-text" onclick="emergencyModule.callHospital('${hospital.id}')">
                        <i class="fas fa-phone"></i> Call
                    </button>
                    <button class="btn-text" onclick="emergencyModule.navigateToHospital('${hospital.id}')">
                        <i class="fas fa-directions"></i> Navigate
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add styles if not present
        this.addHospitalCardStyles();
    }

    addCaseCardStyles() {
        if (!document.querySelector('#case-card-styles')) {
            const style = document.createElement('style');
            style.id = 'case-card-styles';
            style.textContent = `
                .cases-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .case-card {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    padding: 1.25rem;
                }
                
                .case-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1rem;
                }
                
                .case-id h4 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                }
                
                .case-meta {
                    display: flex;
                    gap: 0.75rem;
                    align-items: center;
                }
                
                .timestamp {
                    font-size: 0.8rem;
                    color: var(--text-light);
                }
                
                .severity {
                    color: white;
                    padding: 0.15rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                
                .status-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    background: var(--background-alt);
                    color: var(--text-light);
                }
                
                .status-badge.pending {
                    background: rgba(255, 193, 7, 0.1);
                    color: var(--warning);
                }
                
                .status-badge.dispatched {
                    background: rgba(0, 119, 252, 0.1);
                    color: var(--primary-blue);
                }
                
                .status-badge.on_site {
                    background: rgba(23, 162, 184, 0.1);
                    color: var(--info);
                }
                
                .status-badge.transporting {
                    background: rgba(108, 117, 125, 0.1);
                    color: var(--text-light);
                }
                
                .case-details {
                    margin: 1rem 0;
                }
                
                .detail-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    margin-bottom: 0.75rem;
                }
                
                .detail-row i {
                    color: var(--primary-blue);
                    margin-top: 0.25rem;
                    width: 20px;
                }
                
                .detail-row .label {
                    display: block;
                    font-size: 0.8rem;
                    color: var(--text-light);
                }
                
                .detail-row .value {
                    display: block;
                    font-size: 0.95rem;
                    font-weight: 500;
                }
            `;
            document.head.appendChild(style);
        }
    }

    addHospitalCardStyles() {
        if (!document.querySelector('#hospital-card-styles')) {
            const style = document.createElement('style');
            style.id = 'hospital-card-styles';
            style.textContent = `
                .hospitals-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .hospital-card {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    padding: 1.25rem;
                }
                
                .hospital-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1rem;
                }
                
                .hospital-name h4 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }
                
                .hospital-type {
                    padding: 0.15rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                
                .hospital-type.government {
                    background: rgba(220, 53, 69, 0.1);
                    color: var(--danger);
                }
                
                .hospital-type.private {
                    background: rgba(0, 119, 252, 0.1);
                    color: var(--primary-blue);
                }
                
                .hospital-distance {
                    text-align: right;
                }
                
                .distance-value {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--primary-blue);
                }
                
                .distance-label {
                    font-size: 0.8rem;
                    color: var(--text-light);
                }
                
                .hospital-info {
                    margin: 1rem 0;
                }
                
                .info-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                }
                
                .info-row i {
                    color: var(--text-light);
                    width: 20px;
                }
                
                .hospital-facilities {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                
                .facility-tag {
                    padding: 0.25rem 0.5rem;
                    background: var(--background-alt);
                    border-radius: 12px;
                    font-size: 0.75rem;
                    color: var(--text-light);
                }
            `;
            document.head.appendChild(style);
        }
    }

    dispatchAmbulance(caseId) {
        this.findNearestAmbulance(caseId);
    }

    showCaseDetails(caseId) {
        const emergency = this.activeEmergencies.find(e => e.id === caseId);
        if (!emergency) return;
        
        const ambulance = emergency.ambulanceId ? 
            this.ambulances.find(a => a.id === emergency.ambulanceId) : null;
        
        window.app.showModal(`Emergency Case Details - ${emergency.id}`, `
            <div style="padding: 1rem; max-height: 70vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h4 style="margin: 0;">${emergency.id}</h4>
                    <span style="
                        padding: 0.25rem 0.75rem;
                        border-radius: 20px;
                        font-size: 0.85rem;
                        font-weight: 600;
                        background: ${this.getSeverityColor(emergency.patient.severity)};
                        color: white;
                    ">
                        ${emergency.patient.severity.toUpperCase()}
                    </span>
                </div>
                
                <div class="detail-section">
                    <h5 style="margin-bottom: 0.75rem; color: var(--text-light);">Patient Information</h5>
                    <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
                            <div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">Name</div>
                                <div style="font-weight: 600;">${emergency.patient.name}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">Age</div>
                                <div style="font-weight: 600;">${emergency.patient.age}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">Gender</div>
                                <div style="font-weight: 600;">${emergency.patient.gender}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">Condition</div>
                                <div style="font-weight: 600; color: ${this.getSeverityColor(emergency.patient.severity)}">
                                    ${emergency.patient.condition}
                                </div>
                            </div>
                        </div>
                        
                        ${emergency.patient.symptoms.length > 0 ? `
                            <div style="margin-bottom: 0.75rem;">
                                <div style="font-size: 0.9rem; color: var(--text-light);">Symptoms</div>
                                <div style="font-weight: 600;">${emergency.patient.symptoms.join(', ')}</div>
                            </div>
                        ` : ''}
                        
                        ${emergency.patient.medicalHistory.length > 0 ? `
                            <div style="margin-bottom: 0.75rem;">
                                <div style="font-size: 0.9rem; color: var(--text-light);">Medical History</div>
                                <div style="font-weight: 600;">${emergency.patient.medicalHistory.join(', ')}</div>
                            </div>
                        ` : ''}
                        
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-light);">Allergies</div>
                            <div style="font-weight: 600;">${emergency.patient.allergies}</div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section" style="margin: 1.5rem 0;">
                    <h5 style="margin-bottom: 0.75rem; color: var(--text-light);">Caller Information</h5>
                    <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                            <div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">Name</div>
                                <div style="font-weight: 600;">${emergency.caller.name}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">Phone</div>
                                <div style="font-weight: 600;">${emergency.caller.phone}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">Relationship</div>
                                <div style="font-weight: 600;">${emergency.caller.relationship}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h5 style="margin-bottom: 0.75rem; color: var(--text-light);">Emergency Response</h5>
                    <div style="background: var(--background-alt); border-radius: var(--radius-md); padding: 1rem;">
                        <div style="margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span style="color: var(--text-light);">Status:</span>
                                <span style="font-weight: 600; text-transform: capitalize;">${emergency.status}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span style="color: var(--text-light);">Time Reported:</span>
                                <span style="font-weight: 600;">${new Date(emergency.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span style="color: var(--text-light);">Location:</span>
                                <span style="font-weight: 600;">${emergency.location.address || 'Current Location'}</span>
                            </div>
                            ${emergency.eta ? `
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: var(--text-light);">Ambulance ETA:</span>
                                    <span style="font-weight: 600; color: var(--primary-blue);">${emergency.eta}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${ambulance ? `
                            <div style="border-top: 1px solid var(--border); padding-top: 1rem;">
                                <div style="font-weight: 600; margin-bottom: 0.75rem;">Assigned Ambulance: ${ambulance.id}</div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">
                                    Type: ${ambulance.type}<br>
                                    Crew: ${ambulance.crew.join(', ')}<br>
                                    Contact: ${ambulance.contact}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                    <button class="btn-primary" style="flex: 1;" 
                            onclick="emergencyModule.navigateToCase('${emergency.id}')">
                        <i class="fas fa-directions"></i> Navigate to Location
                    </button>
                    <button class="btn-text" style="flex: 1;" 
                            onclick="document.querySelector('.modal-overlay').remove()">
                        Close
                    </button>
                </div>
            </div>
        `);
    }

    navigateToCase(caseId) {
        const emergency = this.activeEmergencies.find(e => e.id === caseId);
        if (!emergency || !this.map || !this.map.map) return;
        
        // Center map on emergency location
        this.map.map.setView([emergency.location.lat, emergency.location.lng], 15);
        
        // Draw priority route if ambulance is assigned
        if (emergency.ambulanceId) {
            const ambulance = this.ambulances.find(a => a.id === emergency.ambulanceId);
            if (ambulance) {
                this.drawAmbulanceRoute(emergency, ambulance);
            }
        }
        
        this.showNotification(`Navigating to emergency location: ${emergency.id}`, 'info');
    }

    updateCaseStatus(caseId) {
        const emergency = this.activeEmergencies.find(e => e.id === caseId);
        if (!emergency) return;
        
        const statusOptions = [
            { value: 'pending', label: 'Pending', icon: 'fa-clock' },
            { value: 'dispatched', label: 'Dispatched', icon: 'fa-ambulance' },
            { value: 'on_site', label: 'On Site', icon: 'fa-map-marker-alt' },
            { value: 'transporting', label: 'Transporting', icon: 'fa-truck-medical' },
            { value: 'arrived', label: 'Arrived at Hospital', icon: 'fa-hospital' },
            { value: 'completed', label: 'Completed', icon: 'fa-check' },
            { value: 'cancelled', label: 'Cancelled', icon: 'fa-times' }
        ];
        
        window.app.showModal('Update Case Status', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">Update Status for ${caseId}</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: var(--text-light);">
                        Current status: <strong>${emergency.status}</strong>
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
                                   ${emergency.status === option.value ? 'checked' : ''}
                                   style="margin: 0;">
                            <i class="fas ${option.icon}" style="color: var(--primary-blue);"></i>
                            <span>${option.label}</span>
                        </label>
                    `).join('')}
                </div>
                
                <div class="input-group">
                    <label class="input-label">Status Notes</label>
                    <textarea class="form-input" placeholder="Add notes about status change..." 
                              style="height: 80px;"></textarea>
                </div>
                
                <button class="btn-primary" style="width: 100%; margin-top: 1rem;" 
                        onclick="emergencyModule.confirmStatusUpdate('${caseId}')">
                    <i class="fas fa-save"></i> Update Status
                </button>
            </div>
        `);
    }

    confirmStatusUpdate(caseId) {
        const modal = document.querySelector('.modal-overlay');
        const selectedStatus = modal?.querySelector('input[name="status"]:checked')?.value;
        const notes = modal?.querySelector('textarea')?.value;
        
        if (!selectedStatus) {
            this.showNotification('Please select a status', 'error');
            return;
        }
        
        const emergency = this.activeEmergencies.find(e => e.id === caseId);
        if (!emergency) return;
        
        emergency.status = selectedStatus;
        
        if (notes) {
            emergency.statusNotes = notes;
        }
        
        // If status is completed, remove from active emergencies
        if (selectedStatus === 'completed' || selectedStatus === 'cancelled') {
            this.activeEmergencies = this.activeEmergencies.filter(e => e.id !== caseId);
            
            // Free up ambulance if assigned
            if (emergency.ambulanceId) {
                const ambulance = this.ambulances.find(a => a.id === emergency.ambulanceId);
                if (ambulance) {
                    ambulance.status = 'available';
                }
            }
        }
        
        this.saveData();
        this.renderEmergencies();
        this.updateAmbulanceMarkers();
        
        modal?.remove();
        this.showNotification(`Status updated to: ${selectedStatus}`, 'success');
    }

    updateAmbulanceMarkers() {
        if (!this.map || !this.map.map) return;
        
        // Remove existing ambulance markers
        if (this.ambulanceMarkers) {
            this.ambulanceMarkers.forEach(marker => marker.marker.remove());
        }
        
        // Add updated ambulance markers
        this.addAmbulanceMarkers();
    }

    callAmbulance(ambulanceId) {
        const ambulance = this.ambulances.find(a => a.id === ambulanceId);
        if (!ambulance) return;
        
        window.app.showModal(`Call Ambulance ${ambulanceId}`, `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-phone" style="font-size: 3rem; color: var(--primary-blue); margin-bottom: 1rem;"></i>
                <h4>Calling Ambulance</h4>
                
                <div style="
                    background: var(--background-alt);
                    border-radius: var(--radius-md);
                    padding: 1.5rem;
                    margin: 1.5rem 0;
                ">
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-blue);">
                        ${ambulance.contact}
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-light); margin-top: 0.5rem;">
                        ${ambulance.id} • ${ambulance.type}
                    </div>
                </div>
                
                <p style="color: var(--text-light); margin-bottom: 1.5rem;">
                    Calling ambulance crew for communication...
                </p>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="flex: 1;" 
                            onclick="emergencyModule.simulateCall('${ambulance.contact}')">
                        <i class="fas fa-phone"></i> Place Call
                    </button>
                    <button class="btn-text" style="flex: 1;" 
                            onclick="document.querySelector('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `);
    }

    simulateCall(phoneNumber) {
        document.querySelector('.modal-overlay')?.remove();
        
        // In a real app, this would initiate a phone call
        window.location.href = `tel:${phoneNumber}`;
    }

    trackAmbulance(ambulanceId) {
        const ambulance = this.ambulances.find(a => a.id === ambulanceId);
        if (!ambulance) return;
        
        // Find associated emergency
        const emergency = this.activeEmergencies.find(e => e.ambulanceId === ambulanceId);
        
        if (emergency) {
            this.showAmbulanceTracking(emergency);
        } else {
            this.showNotification(`Ambulance ${ambulanceId} is not currently assigned to an emergency`, 'info');
        }
    }

    callHospital(hospitalId) {
        const hospital = this.hospitals.find(h => h.id === hospitalId);
        if (!hospital) return;
        
        window.app.showModal(`Call ${hospital.name}`, `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-phone" style="font-size: 3rem; color: var(--primary-blue); margin-bottom: 1rem;"></i>
                <h4>Calling Hospital</h4>
                
                <div style="margin: 1.5rem 0;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">${hospital.name}</div>
                    <div style="color: var(--text-light); margin-bottom: 1.5rem;">
                        ${hospital.type === 'government' ? 'Government Hospital' : 'Private Hospital'}
                    </div>
                    
                    <div style="
                        background: var(--background-alt);
                        border-radius: var(--radius-md);
                        padding: 1rem;
                    ">
                        <div style="font-size: 0.9rem; color: var(--text-light);">Emergency Phone</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary-blue); margin-top: 0.5rem;">
                            ${hospital.emergencyPhone}
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="flex: 1;" 
                            onclick="emergencyModule.simulateCall('${hospital.emergencyPhone}')">
                        <i class="fas fa-phone"></i> Call Emergency Line
                    </button>
                    <button class="btn-text" style="flex: 1;" 
                            onclick="document.querySelector('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `);
    }

    navigateToHospital(hospitalId) {
        const hospital = this.hospitals.find(h => h.id === hospitalId);
        if (!hospital || !this.map || !this.map.map) return;
        
        // Center map on hospital
        this.map.map.setView(hospital.coordinates, 15);
        
        // Draw route from user to hospital
        if (this.userLocation) {
            if (this.hospitalRoute) {
                this.hospitalRoute.remove();
            }
            
            this.hospitalRoute = L.polyline([
                [this.userLocation.lat, this.userLocation.lng],
                hospital.coordinates
            ], {
                color: '#28A745',
                weight: 4,
                opacity: 0.8
            }).addTo(this.map.map);
        }
        
        this.showNotification(`Navigating to ${hospital.name}`, 'info');
    }

    findNearestHospitals() {
        if (!this.userLocation) {
            this.showNotification('Getting your location...', 'info');
            this.initGeolocation();
            setTimeout(() => this.findNearestHospitals(), 1000);
            return;
        }
        
        // Sort hospitals by distance
        const sortedHospitals = [...this.hospitals].sort((a, b) => {
            const distA = this.calculateDistance(this.userLocation, { lat: a.coordinates[0], lng: a.coordinates[1] });
            const distB = this.calculateDistance(this.userLocation, { lat: b.coordinates[0], lng: b.coordinates[1] });
            return distA - distB;
        });
        
        window.app.showModal('Nearest Hospitals', `
            <div style="padding: 1rem; max-height: 70vh; overflow-y: auto;">
                <h4 style="margin-bottom: 1rem;">Hospitals Nearest to You</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: var(--text-light);">
                        Based on your current location
                    </p>
                </div>
                
                ${sortedHospitals.slice(0, 5).map((hospital, index) => {
                    const distance = this.calculateDistance(
                        this.userLocation, 
                        { lat: hospital.coordinates[0], lng: hospital.coordinates[1] }
                    ).toFixed(1);
                    
                    return `
                        <div style="
                            display: flex;
                            align-items: center;
                            gap: 1rem;
                            padding: 1rem;
                            border-bottom: 1px solid var(--border);
                        ">
                            <div style="
                                width: 40px;
                                height: 40px;
                                background: ${hospital.type === 'government' ? 'var(--danger)' : 'var(--primary-blue)'};
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-weight: 600;
                            ">
                                ${index + 1}
                            </div>
                            
                            <div style="flex: 1;">
                                <div style="font-weight: 600; margin-bottom: 0.25rem;">${hospital.name}</div>
                                <div style="font-size: 0.9rem; color: var(--text-light);">
                                    ${distance} km • ${hospital.eta}
                                </div>
                            </div>
                            
                            <button class="btn-text" onclick="emergencyModule.navigateToHospital('${hospital.id}')">
                                <i class="fas fa-directions"></i>
                            </button>
                        </div>
                    `;
                }).join('')}
                
                <div style="text-align: center; margin-top: 1rem;">
                    <button class="btn-primary" onclick="emergencyModule.showAllHospitals()">
                        <i class="fas fa-list"></i> View All Hospitals
                    </button>
                </div>
            </div>
        `);
    }

    showFirstAidGuide() {
        window.app.showModal('First Aid Guide', `
            <div style="padding: 1rem; max-height: 70vh; overflow-y: auto;">
                <h4 style="margin-bottom: 1rem;">Emergency First Aid Guide</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: var(--text-light);">
                        Basic first aid instructions for common emergencies
                    </p>
                </div>
                
                <div class="first-aid-sections">
                    <div class="first-aid-item" style="margin-bottom: 1.5rem;">
                        <h5 style="color: var(--danger); margin-bottom: 0.5rem;">
                            <i class="fas fa-heartbeat"></i> Heart Attack
                        </h5>
                        <ul style="padding-left: 1.5rem; color: var(--text-light);">
                            <li>Call emergency services immediately</li>
                            <li>Have patient sit or lie down</li>
                            <li>Loosen tight clothing</li>
                            <li>If conscious, give aspirin if available</li>
                            <li>Monitor breathing and be ready for CPR</li>
                        </ul>
                    </div>
                    
                    <div class="first-aid-item" style="margin-bottom: 1.5rem;">
                        <h5 style="color: var(--danger); margin-bottom: 0.5rem;">
                            <i class="fas fa-procedures"></i> Severe Bleeding
                        </h5>
                        <ul style="padding-left: 1.5rem; color: var(--text-light);">
                            <li>Apply direct pressure on the wound</li>
                            <li>Elevate the injured area if possible</li>
                            <li>Use clean cloth or bandage</li>
                            <li>Do not remove embedded objects</li>
                            <li>Apply tourniquet only as last resort</li>
                        </ul>
                    </div>
                    
                    <div class="first-aid-item" style="margin-bottom: 1.5rem;">
                        <h5 style="color: var(--danger); margin-bottom: 0.5rem;">
                            <i class="fas fa-lungs"></i> Choking
                        </h5>
                        <ul style="padding-left: 1.5rem; color: var(--text-light);">
                            <li>Ask "Are you choking?"</li>
                            <li>Perform abdominal thrusts (Heimlich maneuver)</li>
                            <li>For infants: back blows and chest thrusts</li>
                            <li>If unconscious, begin CPR</li>
                            <li>Call emergency if object doesn't dislodge</li>
                        </ul>
                    </div>
                    
                    <div class="first-aid-item">
                        <h5 style="color: var(--danger); margin-bottom: 0.5rem;">
                            <i class="fas fa-brain"></i> Stroke (FAST)
                        </h5>
                        <ul style="padding-left: 1.5rem; color: var(--text-light);">
                            <li><strong>F</strong>ace drooping</li>
                            <li><strong>A</strong>rm weakness</li>
                            <li><strong>S</strong>peech difficulty</li>
                            <li><strong>T</strong>ime to call emergency</li>
                            <li>Note time symptoms started</li>
                        </ul>
                    </div>
                </div>
                
                <div style="margin-top: 2rem; text-align: center;">
                    <p style="color: var(--text-light); font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> 
                        This is general advice. Always call emergency services first.
                    </p>
                </div>
            </div>
        `);
    }

    showEmergencyContacts() {
        const emergencyContacts = [
            { name: 'Police', number: '100', icon: 'fa-shield-alt' },
            { name: 'Fire Brigade', number: '101', icon: 'fa-fire-extinguisher' },
            { name: 'Ambulance', number: '102', icon: 'fa-ambulance' },
            { name: 'Disaster Management', number: '108', icon: 'fa-hands-helping' },
            { name: 'Women Helpline', number: '1091', icon: 'fa-female' },
            { name: 'Child Helpline', number: '1098', icon: 'fa-child' },
            { name: 'Senior Citizen Helpline', number: '1090', icon: 'fa-user-friends' },
            { name: 'Mental Health Helpline', number: '080-46110007', icon: 'fa-head-side-virus' }
        ];
        
        window.app.showModal('Emergency Contacts', `
            <div style="padding: 1rem; max-height: 70vh; overflow-y: auto;">
                <h4 style="margin-bottom: 1rem;">Emergency Contact Numbers</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: var(--text-light);">
                        Save these important emergency numbers
                    </p>
                </div>
                
                <div class="contact-list">
                    ${emergencyContacts.map(contact => `
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 1rem;
                            border-bottom: 1px solid var(--border);
                        ">
                            <div style="display: flex; align-items: center; gap: 1rem;">
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
                                    <i class="fas ${contact.icon}"></i>
                                </div>
                                <div>
                                    <div style="font-weight: 600;">${contact.name}</div>
                                    <div style="font-size: 0.9rem; color: var(--text-light);">
                                        Available 24/7
                                    </div>
                                </div>
                            </div>
                            
                            <div style="text-align: right;">
                                <div style="font-size: 1.1rem; font-weight: 700; color: var(--danger);">
                                    ${contact.number}
                                </div>
                                <button class="btn-text" onclick="emergencyModule.simulateCall('${contact.number}')" 
                                        style="font-size: 0.85rem;">
                                    <i class="fas fa-phone"></i> Call
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 1.5rem; text-align: center;">
                    <p style="color: var(--text-light); font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> 
                        These numbers may vary by location. Save local numbers.
                    </p>
                </div>
            </div>
        `);
    }

    reportTrafficBlockage() {
        window.app.showModal('Report Traffic Blockage', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">Report Road Blockage</h4>
                
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: var(--text-light);">
                        Report road closures or blockages affecting emergency routes
                    </p>
                </div>
                
                <div class="input-group">
                    <label class="input-label">Location of Blockage</label>
                    <input type="text" class="form-input" placeholder="Enter location or street name">
                </div>
                
                <div class="input-group">
                    <label class="input-label">Type of Blockage</label>
                    <select class="form-input">
                        <option value="">Select type</option>
                        <option value="accident">Accident</option>
                        <option value="construction">Road Construction</option>
                        <option value="protest">Protest/Demonstration</option>
                        <option value="flood">Flood/Waterlogging</option>
                        <option value="debris">Fallen Debris/Tree</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                
                <div class="input-group">
                    <label class="input-label">Severity</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <label style="flex: 1; text-align: center;">
                            <input type="radio" name="blockageSeverity" value="partial" style="margin-right: 0.5rem;">
                            <span>Partial</span>
                        </label>
                        <label style="flex: 1; text-align: center;">
                            <input type="radio" name="blockageSeverity" value="complete" checked style="margin-right: 0.5rem;">
                            <span>Complete</span>
                        </label>
                    </div>
                </div>
                
                <div class="input-group">
                    <label class="input-label">Additional Details</label>
                    <textarea class="form-input" placeholder="Describe the blockage..." 
                              style="height: 80px;"></textarea>
                </div>
                
                <div style="margin-top: 1.5rem;">
                    <button class="btn-primary" style="width: 100%;" onclick="emergencyModule.submitBlockageReport()">
                        <i class="fas fa-exclamation-triangle"></i> Submit Report
                    </button>
                </div>
            </div>
        `);
    }

    submitBlockageReport() {
        document.querySelector('.modal-overlay')?.remove();
        this.showNotification('Traffic blockage reported to emergency services', 'success');
    }

    showEmergencyOptions() {
        window.app.showModal('Emergency Options', `
            <div style="padding: 1rem;">
                <h4 style="margin-bottom: 1rem;">Emergency Services</h4>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                    <button class="btn-primary" style="background: var(--danger);" 
                            onclick="emergencyModule.triggerEmergency()">
                        <i class="fas fa-ambulance"></i> Medical Emergency
                    </button>
                    
                    <button class="btn-primary" style="background: var(--warning);" 
                            onclick="emergencyModule.simulateCall('100')">
                        <i class="fas fa-shield-alt"></i> Call Police
                    </button>
                    
                    <button class="btn-primary" style="background: var(--info);" 
                            onclick="emergencyModule.simulateCall('101')">
                        <i class="fas fa-fire-extinguisher"></i> Fire Brigade
                    </button>
                    
                    <button class="btn-primary" style="background: var(--success);" 
                            onclick="emergencyModule.findNearestHospitals()">
                        <i class="fas fa-hospital"></i> Find Hospitals
                    </button>
                </div>
                
                <div style="margin-top: 1.5rem;">
                    <h5 style="margin-bottom: 0.75rem; color: var(--text-light);">Quick Actions</h5>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <button class="btn-text" style="text-align: left; padding: 1rem;" 
                                onclick="emergencyModule.showFirstAidGuide()">
                            <i class="fas fa-first-aid"></i> First Aid Guide
                        </button>
                        <button class="btn-text" style="text-align: left; padding: 1rem;" 
                                onclick="emergencyModule.showEmergencyContacts()">
                            <i class="fas fa-address-book"></i> Emergency Contacts
                        </button>
                        <button class="btn-text" style="text-align: left; padding: 1rem;" 
                                onclick="emergencyModule.reportTrafficBlockage()">
                            <i class="fas fa-road"></i> Report Road Blockage
                        </button>
                    </div>
                </div>
            </div>
        `);
    }

    simulateAmbulances() {
        // Simulate ambulance movement
        setInterval(() => {
            this.ambulances.forEach(ambulance => {
                if (ambulance.status === 'dispatched' || ambulance.status === 'on_duty') {
                    // Move ambulance slightly
                    ambulance.location.lat += (Math.random() * 0.0003 - 0.00015);
                    ambulance.location.lng += (Math.random() * 0.0003 - 0.00015);
                }
            });
            
            // Update ambulance markers
            this.updateAmbulanceMarkers();
            
            // Save data periodically
            this.saveData();
        }, 5000); // Every 5 seconds
    }

    initRealtimeUpdates() {
        // Simulate real-time emergency updates
        setInterval(() => {
            this.simulateNewEmergencies();
            this.updateHospitalAvailability();
        }, 30000); // Every 30 seconds
    }

    simulateNewEmergencies() {
        // Randomly generate new emergencies
        if (Math.random() > 0.7 && this.activeEmergencies.length < 5) {
            const conditions = ['Accident', 'Heart Attack', 'Stroke', 'Breathing Difficulty', 'Unconscious'];
            const severities = ['critical', 'serious', 'moderate'];
            
            const newEmergency = {
                id: `EMG-${Date.now().toString().slice(-6)}`,
                timestamp: new Date().toISOString(),
                location: {
                    lat: 20.5937 + (Math.random() * 0.02 - 0.01),
                    lng: 78.9629 + (Math.random() * 0.02 - 0.01),
                    address: 'Simulated Emergency Location'
                },
                patient: {
                    name: 'Simulated Patient',
                    age: Math.floor(Math.random() * 50) + 20,
                    gender: Math.random() > 0.5 ? 'male' : 'female',
                    condition: conditions[Math.floor(Math.random() * conditions.length)],
                    severity: severities[Math.floor(Math.random() * severities.length)],
                    symptoms: ['Simulated symptoms'],
                    medicalHistory: [],
                    allergies: 'None'
                },
                caller: {
                    name: 'Simulated Caller',
                    phone: '+91 9876543210',
                    relationship: 'Bystander'
                },
                hospitalPreference: Math.random() > 0.5 ? 'government' : 'private',
                status: 'pending',
                ambulanceId: null,
                eta: 'Calculating...',
                distance: 'Calculating...',
                trafficCondition: 'unknown',
                priorityRoute: true
            };
            
            this.activeEmergencies.unshift(newEmergency);
            this.saveData();
            this.renderEmergencies();
            this.addEmergencyMarkers();
            
            this.showNotification(`New emergency reported: ${newEmergency.id}`, 'warning');
        }
    }

    updateHospitalAvailability() {
        // Randomly update hospital bed availability
        this.hospitals.forEach(hospital => {
            const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
            hospital.bedsAvailable = Math.max(0, hospital.bedsAvailable + change);
        });
        
        this.renderHospitals();
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
let emergencyModule;

document.addEventListener('DOMContentLoaded', () => {
    emergencyModule = new EmergencyModule();
    
    // Handle back button in PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.querySelector('.standalone-back')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }
    
    // Export for use in HTML onclick handlers
    window.emergencyModule = emergencyModule;
});