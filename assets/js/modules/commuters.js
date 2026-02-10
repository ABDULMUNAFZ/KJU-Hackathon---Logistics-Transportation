// Daily Commuters Module
class CommutersModule {
    constructor() {
        this.groups = [];
        this.currentGroup = null;
        this.members = [];
        this.init();
    }

    init() {
        this.loadGroups();
        this.initEventListeners();
        this.initRealtimeUpdates();
    }

    loadGroups() {
        // Load from localStorage or API
        const savedGroups = localStorage.getItem('smartroads_groups');
        if (savedGroups) {
            this.groups = JSON.parse(savedGroups);
            this.renderGroups();
        } else {
            // Create sample groups
            this.groups = [
                {
                    id: 'group_1',
                    name: 'Office Commute',
                    destination: 'Downtown Office',
                    departureTime: '08:00',
                    travelMode: 'car',
                    members: ['sarah@email.com', 'john@email.com', 'mike@email.com'],
                    leader: 'sarah@email.com',
                    status: 'active',
                    eta: '08:45',
                    delay: 15,
                    updates: [
                        {
                            author: 'Sarah',
                            message: 'Taking alternate route via Maple Avenue',
                            time: '2 minutes ago',
                            type: 'route_change'
                        }
                    ]
                },
                {
                    id: 'group_2',
                    name: 'College Carpool',
                    destination: 'University Campus',
                    departureTime: '09:30',
                    travelMode: 'car',
                    members: ['alex@email.com', 'jane@email.com'],
                    leader: 'alex@email.com',
                    status: 'scheduled',
                    updates: []
                }
            ];
            this.saveGroups();
            this.renderGroups();
        }
    }

    saveGroups() {
        localStorage.setItem('smartroads_groups', JSON.stringify(this.groups));
    }

    renderGroups() {
        const groupsList = document.querySelector('.groups-list');
        if (!groupsList) return;

        groupsList.innerHTML = this.groups.map(group => `
            <div class="group-card" data-group-id="${group.id}">
                <div class="group-header">
                    <div class="group-info">
                        <h4>${group.name}</h4>
                        <div class="group-meta">
                            <span class="group-status ${group.status}">${group.status === 'active' ? 'Live' : 'Starting Soon'}</span>
                            <span class="group-members">
                                <i class="fas fa-user-friends"></i> ${group.members.length} members
                            </span>
                        </div>
                    </div>
                    <button class="icon-btn group-menu-btn">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
                <div class="group-details">
                    <div class="detail-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${group.destination}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <span>${group.status === 'active' ? 
                            `ETA: ${group.eta} (${group.delay} min delay)` : 
                            `Starts: ${group.departureTime}`}</span>
                    </div>
                </div>
                <div class="group-actions">
                    <button class="btn-primary join-btn">${group.status === 'active' ? 'Join Route' : 'Join Group'}</button>
                    <button class="btn-text details-btn">View Details</button>
                </div>
            </div>
        `).join('');

        this.attachGroupEventListeners();
    }

    initEventListeners() {
        // Create group button
        const createBtn = document.getElementById('createGroupBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.showCreateGroupModal());
        }

        // Group form submission
        const groupForm = document.getElementById('groupForm');
        if (groupForm) {
            groupForm.addEventListener('submit', (e) => this.handleGroupCreation(e));
        }

        // Add member button
        const addMemberBtn = document.getElementById('addMemberBtn');
        if (addMemberBtn) {
            addMemberBtn.addEventListener('click', () => this.addMember());
        }

        // Quick actions
        document.getElementById('startNewTrip')?.addEventListener('click', () => this.startNewTrip());
        document.getElementById('inviteFriends')?.addEventListener('click', () => this.inviteFriends());
        document.getElementById('viewMap')?.addEventListener('click', () => this.viewLiveMap());
        document.getElementById('scheduleTrip')?.addEventListener('click', () => this.scheduleTrip());

        // Modal close
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            document.getElementById('groupModal').style.display = 'none';
        });
    }

    attachGroupEventListeners() {
        // Join buttons
        document.querySelectorAll('.join-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const groupCard = e.target.closest('.group-card');
                const groupId = groupCard.dataset.groupId;
                this.joinGroup(groupId);
            });
        });

        // Details buttons
        document.querySelectorAll('.details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const groupCard = e.target.closest('.group-card');
                const groupId = groupCard.dataset.groupId;
                this.showGroupDetails(groupId);
            });
        });

        // Menu buttons
        document.querySelectorAll('.group-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const groupCard = e.target.closest('.group-card');
                const groupId = groupCard.dataset.groupId;
                this.showGroupMenu(groupId, e.target);
            });
        });
    }

    showCreateGroupModal() {
        const modal = document.getElementById('groupModal');
        modal.style.display = 'flex';
        
        // Clear form
        const form = document.getElementById('groupForm');
        form.reset();
        document.getElementById('membersList').innerHTML = '';
        this.members = [];
    }

    handleGroupCreation(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        const newGroup = {
            id: `group_${Date.now()}`,
            name: formData.get('groupName') || 'New Group',
            destination: formData.get('destination') || 'Unknown',
            departureTime: formData.get('departureTime') || '08:00',
            travelMode: formData.get('travelMode') || 'car',
            members: this.members,
            leader: window.app?.user?.email || 'user@example.com',
            status: 'scheduled',
            updates: [],
            createdAt: new Date().toISOString()
        };

        this.groups.push(newGroup);
        this.saveGroups();
        this.renderGroups();
        
        // Close modal
        document.getElementById('groupModal').style.display = 'none';
        
        // Show success message
        this.showNotification('Group created successfully!', 'success');
        
        // Send notifications to members
        this.notifyMembers(newGroup);
    }

    addMember() {
        const input = document.querySelector('.members-input input');
        const member = input.value.trim();
        
        if (member && !this.members.includes(member)) {
            this.members.push(member);
            this.updateMembersList();
            input.value = '';
        }
    }

    updateMembersList() {
        const list = document.getElementById('membersList');
        list.innerHTML = this.members.map(member => `
            <div class="member-tag">
                <span>${member}</span>
                <button type="button" class="remove-member" data-member="${member}">&times;</button>
            </div>
        `).join('');

        // Add remove functionality
        document.querySelectorAll('.remove-member').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const member = e.target.dataset.member;
                this.removeMember(member);
            });
        });
    }

    removeMember(member) {
        this.members = this.members.filter(m => m !== member);
        this.updateMembersList();
    }

    joinGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;

        const userEmail = window.app?.user?.email;
        if (userEmail && !group.members.includes(userEmail)) {
            group.members.push(userEmail);
            this.saveGroups();
            this.renderGroups();
            
            this.showNotification(`Joined ${group.name} successfully!`, 'success');
            
            // Send update to group
            this.addGroupUpdate(groupId, {
                type: 'member_joined',
                message: `${window.app?.user?.name || 'A member'} joined the group`
            });
        }
    }

    showGroupDetails(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;

        window.app.showModal(group.name, `
            <div class="group-details-modal">
                <div class="detail-section">
                    <h4>Destination</h4>
                    <p><i class="fas fa-map-marker-alt"></i> ${group.destination}</p>
                </div>
                
                <div class="detail-section">
                    <h4>Schedule</h4>
                    <p><i class="fas fa-clock"></i> Departure: ${group.departureTime}</p>
                    ${group.eta ? `<p><i class="fas fa-hourglass-half"></i> ETA: ${group.eta}</p>` : ''}
                    ${group.delay ? `<p><i class="fas fa-exclamation-triangle"></i> Delay: ${group.delay} minutes</p>` : ''}
                </div>
                
                <div class="detail-section">
                    <h4>Members (${group.members.length})</h4>
                    <div class="members-list">
                        ${group.members.map(member => `
                            <div class="member-item">
                                <i class="fas fa-user-circle"></i>
                                <span>${member}</span>
                                ${member === group.leader ? '<span class="leader-badge">Leader</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${group.updates.length > 0 ? `
                    <div class="detail-section">
                        <h4>Recent Updates</h4>
                        <div class="updates-list">
                            ${group.updates.slice(0, 3).map(update => `
                                <div class="update-item">
                                    <strong>${update.author}:</strong>
                                    <p>${update.message}</p>
                                    <small>${update.time}</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <style>
                    .group-details-modal .detail-section {
                        margin-bottom: 1.5rem;
                    }
                    .group-details-modal h4 {
                        margin-bottom: 0.5rem;
                        color: var(--text-light);
                    }
                    .group-details-modal p {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        margin-bottom: 0.25rem;
                    }
                    .members-list {
                        max-height: 200px;
                        overflow-y: auto;
                    }
                    .member-item {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        padding: 0.75rem;
                        border-bottom: 1px solid var(--border);
                    }
                    .member-item:last-child {
                        border-bottom: none;
                    }
                    .member-item i {
                        font-size: 1.5rem;
                        color: var(--primary-blue);
                    }
                    .leader-badge {
                        background: var(--primary-blue);
                        color: white;
                        padding: 0.25rem 0.5rem;
                        border-radius: 12px;
                        font-size: 0.75rem;
                        margin-left: auto;
                    }
                    .updates-list {
                        background: var(--background-alt);
                        border-radius: var(--radius-md);
                        padding: 1rem;
                    }
                    .update-item {
                        margin-bottom: 1rem;
                        padding-bottom: 1rem;
                        border-bottom: 1px solid var(--border);
                    }
                    .update-item:last-child {
                        margin-bottom: 0;
                        padding-bottom: 0;
                        border-bottom: none;
                    }
                    .update-item p {
                        margin: 0.5rem 0;
                    }
                    .update-item small {
                        color: var(--text-lighter);
                        font-size: 0.8rem;
                    }
                </style>
            </div>
        `);
    }

    showGroupMenu(groupId, target) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;

        const rect = target.getBoundingClientRect();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${rect.bottom}px;
            left: ${rect.left - 100}px;
            background: var(--background);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            min-width: 150px;
        `;
        
        menu.innerHTML = `
            <button class="menu-item" data-action="edit">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="menu-item" data-action="leave">
                <i class="fas fa-sign-out-alt"></i> Leave
            </button>
            <button class="menu-item" data-action="delete">
                <i class="fas fa-trash"></i> Delete
            </button>
            <button class="menu-item" data-action="share">
                <i class="fas fa-share"></i> Share
            </button>
            <style>
                .menu-item {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: none;
                    background: none;
                    text-align: left;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    cursor: pointer;
                    color: var(--text-dark);
                    transition: var(--transition);
                }
                .menu-item:hover {
                    background: var(--background-alt);
                }
                .menu-item i {
                    width: 20px;
                    color: var(--text-light);
                }
            </style>
        `;
        
        document.body.appendChild(menu);
        
        // Handle menu actions
        menu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.closest('.menu-item').dataset.action;
                this.handleMenuAction(groupId, action);
                menu.remove();
            });
        });
        
        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== target) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    handleMenuAction(groupId, action) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;

        switch (action) {
            case 'edit':
                this.editGroup(groupId);
                break;
            case 'leave':
                if (confirm('Are you sure you want to leave this group?')) {
                    this.leaveGroup(groupId);
                }
                break;
            case 'delete':
                if (confirm('Are you sure you want to delete this group?')) {
                    this.deleteGroup(groupId);
                }
                break;
            case 'share':
                this.shareGroup(groupId);
                break;
        }
    }

    editGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;

        this.showCreateGroupModal();
        
        // Pre-fill form
        const form = document.getElementById('groupForm');
        form.querySelector('[name="groupName"]').value = group.name;
        form.querySelector('[name="destination"]').value = group.destination;
        form.querySelector('[name="departureTime"]').value = group.departureTime;
        form.querySelector('[name="travelMode"]').value = group.travelMode;
        
        this.members = [...group.members];
        this.updateMembersList();
        
        // Update submit handler for edit
        form.onsubmit = (e) => {
            e.preventDefault();
            this.updateGroup(groupId);
        };
    }

    updateGroup(groupId) {
        const groupIndex = this.groups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;

        const form = document.getElementById('groupForm');
        const formData = new FormData(form);
        
        this.groups[groupIndex] = {
            ...this.groups[groupIndex],
            name: formData.get('groupName'),
            destination: formData.get('destination'),
            departureTime: formData.get('departureTime'),
            travelMode: formData.get('travelMode'),
            members: this.members
        };
        
        this.saveGroups();
        this.renderGroups();
        document.getElementById('groupModal').style.display = 'none';
        
        this.showNotification('Group updated successfully!', 'success');
    }

    leaveGroup(groupId) {
        const groupIndex = this.groups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;

        const userEmail = window.app?.user?.email;
        if (userEmail) {
            this.groups[groupIndex].members = this.groups[groupIndex].members.filter(
                member => member !== userEmail
            );
            
            if (this.groups[groupIndex].members.length === 0) {
                this.groups.splice(groupIndex, 1);
            }
            
            this.saveGroups();
            this.renderGroups();
            this.showNotification('Left group successfully', 'info');
        }
    }

    deleteGroup(groupId) {
        this.groups = this.groups.filter(g => g.id !== groupId);
        this.saveGroups();
        this.renderGroups();
        this.showNotification('Group deleted', 'info');
    }

    shareGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;

        const shareUrl = `${window.location.origin}/join-group?${groupId}`;
        
        if (navigator.share) {
            navigator.share({
                title: `Join ${group.name} on Smart Roads`,
                text: `Join my commute group "${group.name}" on Smart Roads`,
                url: shareUrl
            });
        } else {
            navigator.clipboard.writeText(shareUrl);
            this.showNotification('Group link copied to clipboard!', 'success');
        }
    }

    addGroupUpdate(groupId, update) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;

        const newUpdate = {
            ...update,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };

        group.updates.unshift(newUpdate);
        
        // Keep only last 10 updates
        if (group.updates.length > 10) {
            group.updates = group.updates.slice(0, 10);
        }
        
        this.saveGroups();
        this.renderGroupUpdates();
    }

    renderGroupUpdates() {
        const activeGroup = this.groups.find(g => g.status === 'active');
        if (!activeGroup) return;

        const updatesFeed = document.querySelector('.updates-feed');
        if (!updatesFeed) return;

        updatesFeed.innerHTML = activeGroup.updates.map(update => `
            <div class="update-post">
                <div class="update-header">
                    <div class="update-author">
                        <i class="fas fa-user-circle"></i>
                        <div>
                            <strong>${update.author || 'System'}</strong>
                            <span class="update-time">${update.time}</span>
                        </div>
                    </div>
                </div>
                <div class="update-content">
                    <p>${update.message}</p>
                </div>
                ${update.type !== 'system' ? `
                    <div class="update-actions">
                        <button class="btn-text">
                            <i class="fas fa-thumbs-up"></i> Acknowledge
                        </button>
                        <button class="btn-text">
                            <i class="fas fa-comment"></i> Comment
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    notifyMembers(group) {
        // In a real app, this would send push notifications or emails
        console.log('Notifying members:', group.members);
        
        // Store notification for offline sync
        const notification = {
            type: 'group_invitation',
            groupId: group.id,
            groupName: group.name,
            timestamp: Date.now(),
            recipients: group.members
        };
        
        const pendingNotifications = JSON.parse(localStorage.getItem('pending_notifications') || '[]');
        pendingNotifications.push(notification);
        localStorage.setItem('pending_notifications', JSON.stringify(pendingNotifications));
        
        // Try to sync if online
        if (navigator.onLine) {
            this.syncNotifications();
        }
    }

    async syncNotifications() {
        const pendingNotifications = JSON.parse(localStorage.getItem('pending_notifications') || '[]');
        
        for (const notification of pendingNotifications) {
            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 100));
                console.log('Notification sent:', notification);
            } catch (error) {
                console.error('Failed to send notification:', error);
                return; // Stop on first error
            }
        }
        
        // Clear sent notifications
        localStorage.setItem('pending_notifications', '[]');
    }

    initRealtimeUpdates() {
        // Simulate real-time traffic updates
        setInterval(() => {
            this.updateTrafficPredictions();
            this.simulateGroupUpdates();
        }, 60000); // Every minute
    }

    updateTrafficPredictions() {
        const predictions = [
            {
                bestTime: '7:45 AM',
                delay: '15-20 minutes',
                route: 'Via Highway 101',
                advice: 'Leaving before 7:45 AM reduces delay by 70%'
            },
            {
                bestTime: '8:15 AM',
                delay: '25-30 minutes',
                route: 'Via Main Street',
                advice: 'Consider taking public transport'
            },
            {
                bestTime: '9:00 AM',
                delay: '10-15 minutes',
                route: 'Via Park Avenue',
                advice: 'Light traffic expected'
            }
        ];

        const prediction = predictions[Math.floor(Math.random() * predictions.length)];
        
        const card = document.querySelector('.prediction-card');
        if (card) {
            card.querySelector('.prediction-value:nth-child(1)').textContent = prediction.bestTime;
            card.querySelector('.prediction-value:nth-child(2)').textContent = prediction.delay;
            card.querySelector('.prediction-value:nth-child(3)').textContent = prediction.route;
            card.querySelector('.prediction-advice p').textContent = prediction.advice;
        }
    }

    simulateGroupUpdates() {
        const activeGroup = this.groups.find(g => g.status === 'active');
        if (!activeGroup) return;

        const updates = [
            "Traffic conditions improving. ETA updated to 8:40 AM",
            "New member joined the group",
            "Accident cleared ahead. Resume normal route",
            "Weather alert: Light rain expected. Drive safely",
            "Road construction completed on alternate route"
        ];

        if (Math.random() > 0.7) { // 30% chance of update
            const update = updates[Math.floor(Math.random() * updates.length)];
            this.addGroupUpdate(activeGroup.id, {
                author: 'System',
                message: update,
                type: 'system'
            });
        }
    }

    startNewTrip() {
        this.showCreateGroupModal();
    }

    inviteFriends() {
        const shareData = {
            title: 'Smart Roads - Daily Commuters',
            text: 'Join me on Smart Roads for better commute planning!',
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData);
        } else {
            navigator.clipboard.writeText(shareData.url);
            this.showNotification('Invite link copied to clipboard!', 'success');
        }
    }

    viewLiveMap() {
        window.app.showModal('Live Group Map', `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-map-marked-alt" style="font-size: 3rem; color: var(--primary-blue); margin-bottom: 1rem;"></i>
                <h4>Live Map View</h4>
                <p>Real-time location tracking and route visualization.</p>
                <p><small>This feature requires location permissions.</small></p>
                <button class="btn-primary" onclick="this.textContent='Loading map...'">
                    <i class="fas fa-map"></i> Enable Live Map
                </button>
            </div>
        `);
    }

    scheduleTrip() {
        window.app.showModal('Schedule Trip', `
            <div>
                <p>Schedule your commute for optimal traffic conditions.</p>
                <div class="input-group">
                    <label class="input-label">Select Date</label>
                    <input type="date" class="form-input" min="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="input-group">
                    <label class="input-label">Preferred Time</label>
                    <input type="time" class="form-input">
                </div>
                <div class="input-group">
                    <label class="input-label">Repeat</label>
                    <select class="form-input">
                        <option value="once">Once</option>
                        <option value="daily">Daily</option>
                        <option value="weekdays">Weekdays</option>
                        <option value="weekly">Weekly</option>
                    </select>
                </div>
                <button class="btn-primary" style="width: 100%;">
                    <i class="fas fa-calendar-check"></i> Schedule
                </button>
            </div>
        `);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification-toast ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="close-notification">&times;</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--background);
            border: 1px solid var(--border);
            border-left: 4px solid ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary-blue)'};
            border-radius: var(--radius-md);
            padding: 1rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            max-width: 350px;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Close button
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}