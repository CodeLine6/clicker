// public/dashboard.js - Updated with session support
class ClickAnalyticsDashboard {
    constructor() {
        this.charts = {};
        this.currentFilters = {};
        this.sessions = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSessions();
        this.loadAnalytics();
        this.loadRecentActivity();
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.loadAnalytics();
            this.loadRecentActivity();
            this.loadSessions(); // Refresh sessions periodically
        }, 30000);
    }

    bindEvents() {
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetFilters();
        });

        // Add session filter change event
        document.getElementById('sessionFilter').addEventListener('change', (e) => {
            if (e.target.value) {
                this.currentFilters.sessionId = e.target.value;
                this.loadAnalytics();
                this.loadRecentActivity();
            }
        });
    }

    async loadSessions() {
        try {
            const response = await fetch('/api/analytics/sessions');
            this.sessions = await response.json();
            this.populateSessionDropdown();
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    }

    populateSessionDropdown() {
        const select = document.getElementById('sessionFilter');
        
        // Clear existing options except "All Sessions"
        const options = select.querySelectorAll('option');
        options.forEach((option, index) => {
            if (index > 0) option.remove();
        });

        // Add session options
        this.sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.session_id;
            option.textContent = session.display_name;
            select.appendChild(option);
        });
    }

    applyFilters() {
        this.currentFilters = {
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            keyword: document.getElementById('keyword').value,
            searchEngine: document.getElementById('searchEngine').value,
            sessionId: document.getElementById('sessionFilter').value
        };

        this.loadAnalytics();
        this.loadRecentActivity();
    }

    resetFilters() {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        document.getElementById('keyword').value = '';
        document.getElementById('searchEngine').value = '';
        document.getElementById('sessionFilter').value = '';
        this.currentFilters = {};
        this.loadAnalytics();
        this.loadRecentActivity();
    }

    async loadAnalytics() {
        try {
            const params = new URLSearchParams(this.currentFilters);
            const response = await fetch(`/api/analytics?${params}`);
            const data = await response.json();

            this.updateSummaryCards(data.summary);
            this.updateCharts(data);
            this.updateSessionsTable(data.sessionStats);
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const params = new URLSearchParams({
                sessionId: this.currentFilters.sessionId || ''
            });
            const response = await fetch(`/api/analytics/recent-activity?${params}`);
            const data = await response.json();
            this.updateRecentActivityTable(data);
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    updateCharts(data) {
        // Clicks by Hour Chart
        this.updateClicksByHourChart(data.timeAnalysis.clicksByHour);
        
        // Clicks by Day Chart
        this.updateClicksByDayChart(data.timeAnalysis.clicksByDay);
        
        // Search Engine Chart
        this.updateSearchEngineChart(data.searchEngineStats);
        
        // Top Keywords Chart
        this.updateTopKeywordsChart(data.topKeywords);

        // Add position chart if data exists
        if (data.positionStats && data.positionStats.length > 0) {
            this.updatePositionChart(data.positionStats);
        }
    }

    updatePositionChart(data) {
        const ctx = document.getElementById('positionChart');
        if (!ctx) return; // Chart element doesn't exist yet
        
        const context = ctx.getContext('2d');
        
        if (this.charts.position) {
            this.charts.position.destroy();
        }

        const labels = data.map(d => `Position ${d._id}`);
        const clicks = data.map(d => d.count);
        const avgTime = data.map(d => Math.round(d.avgTimeOnPage / 1000));

        this.charts.position = new Chart(context, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Clicks',
                    data: clicks,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                    yAxisID: 'y'
                }, {
                    label: 'Avg Time (seconds)',
                    data: avgTime,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Clicks'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Average Time (seconds)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    updateSessionsTable(sessions) {
        // Create sessions table if it doesn't exist
        const sessionsSection = document.getElementById('sessionsSection');
        if (!sessionsSection) {
            this.createSessionsSection(sessions);
            return;
        }

        const tbody = document.querySelector('#sessionsTable tbody');
        tbody.innerHTML = '';

        sessions.forEach(session => {
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-50 cursor-pointer';
            row.onclick = () => this.filterBySession(session._id);
            
            const duration = session.sessionDuration ? 
                `${Math.round(session.sessionDuration / 60000)}m` : 'N/A';
            
            row.innerHTML = `
                <td class="px-4 py-2 text-sm text-blue-600 hover:text-blue-800">${session._id.substring(0, 8)}...</td>
                <td class="px-4 py-2 text-sm text-gray-900">${session.clickCount}</td>
                <td class="px-4 py-2 text-sm text-gray-900">${Math.round(session.avgTimeOnPage / 1000)}s</td>
                <td class="px-4 py-2 text-sm text-gray-900">${Math.round(session.avgInteractions)}</td>
                <td class="px-4 py-2 text-sm text-gray-900">${Math.round(session.successRate * 100)}%</td>
                <td class="px-4 py-2 text-sm text-gray-900">${duration}</td>
                <td class="px-4 py-2 text-sm text-gray-900">${new Date(session.firstClick).toLocaleString()}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    createSessionsSection(sessions) {
        const container = document.querySelector('.container');
        const sessionsHtml = `
            <div id="sessionsSection" class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 class="text-lg font-semibold mb-4">Session Analysis</h3>
                <div class="overflow-x-auto">
                    <table id="sessionsTable" class="min-w-full table-auto">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Session ID</th>
                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Clicks</th>
                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Avg Time</th>
                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Avg Interactions</th>
                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Success Rate</th>
                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Duration</th>
                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Started</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        `;

        // Insert before recent activity section
        const recentActivitySection = document.querySelector('.bg-white.rounded-lg.shadow-md.p-6:last-child');
        recentActivitySection.insertAdjacentHTML('beforebegin', sessionsHtml);
        
        this.updateSessionsTable(sessions);
    }

     filterBySession(sessionId) {
        document.getElementById('sessionFilter').value = sessionId;
        this.currentFilters.sessionId = sessionId;
        this.loadAnalytics();
        this.loadRecentActivity();
    }

    updateSummaryCards(summary) {
        document.getElementById('totalClicks').textContent = summary.totalClicks.toLocaleString();
        document.getElementById('successfulClicks').textContent = summary.successfulClicks.toLocaleString();
        document.getElementById('successRate').textContent = `${summary.successRate}%`;
    }

    updateRecentActivityTable(data) {
        const tbody = document.getElementById('recentActivityTable');
        tbody.innerHTML = '';

        data.forEach(click => {
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-50';
            
            const statusBadge = click.success 
                ? '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Success</span>'
                : '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Failed</span>';

            const timeOnPage = click.time_on_page 
                ? `${Math.round(click.time_on_page / 1000)}s`
                : 'N/A';

            row.innerHTML = `
                <td class="px-4 py-2 text-sm text-gray-900">${new Date(click.timestamp).toLocaleString()}</td>
                <td class="px-4 py-2 text-sm text-gray-900">${click.keyword}</td>
                <td class="px-4 py-2 text-sm text-gray-900">${click.target}</td>
                <td class="px-4 py-2 text-sm text-gray-900">${click.search_engine}</td>
                <td class="px-4 py-2 text-sm text-gray-900">Position ${click.position || 'N/A'}</td>
                <td class="px-4 py-2 text-sm">${statusBadge}</td>
                <td class="px-4 py-2 text-sm text-gray-900">${timeOnPage}</td>
                <td class="px-4 py-2 text-sm text-gray-900">${click.interactions || 0}</td>
                <td class="px-4 py-2 text-sm text-gray-900 max-w-xs truncate" title="${click.error_message || ''}">${click.error_message || 'None'}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateClicksByHourChart(data) {
        const ctx = document.getElementById('clicksByHourChart').getContext('2d');
        
        if (this.charts.clicksByHour) {
            this.charts.clicksByHour.destroy();
        }

        const hours = Array.from({length: 24}, (_, i) => i);
        const clicks = hours.map(hour => {
            const found = data.find(d => d._id === hour);
            return found ? found.count : 0;
        });

        this.charts.clicksByHour = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours.map(h => `${h}:00`),
                datasets: [{
                    label: 'Clicks',
                    data: clicks,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateClicksByDayChart(data) {
        const ctx = document.getElementById('clicksByDayChart').getContext('2d');
        
        if (this.charts.clicksByDay) {
            this.charts.clicksByDay.destroy();
        }

        const labels = data.map(d => `${d._id.month}/${d._id.day}`);
        const clicks = data.map(d => d.count);

        this.charts.clicksByDay = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Clicks',
                    data: clicks,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateSearchEngineChart(data) {
        const ctx = document.getElementById('searchEngineChart').getContext('2d');
        
        if (this.charts.searchEngine) {
            this.charts.searchEngine.destroy();
        }

        const labels = data.map(d => d._id.charAt(0).toUpperCase() + d._id.slice(1));
        const clicks = data.map(d => d.count);

        this.charts.searchEngine = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: clicks,
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(168, 85, 247, 0.8)',
                        'rgba(249, 115, 22, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateTopKeywordsChart(data) {
        const ctx = document.getElementById('topKeywordsChart').getContext('2d');
        
        if (this.charts.topKeywords) {
            this.charts.topKeywords.destroy();
        }

        const labels = data.map(d => d._id);
        const clicks = data.map(d => d.count);

        this.charts.topKeywords = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Clicks',
                    data: clicks,
                    backgroundColor: 'rgba(168, 85, 247, 0.8)',
                    borderColor: 'rgb(168, 85, 247)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // In dashboard.js, update the updateRecentActivityTable function
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ClickAnalyticsDashboard();
});