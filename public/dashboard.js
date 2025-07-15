// public/dashboard.js - Updated with session support
class ClickAnalyticsDashboard {
    constructor() {
        this.charts = {};
        this.currentFilters = {};
        this.sessions = [];
        this.init();
         this.currentPage = 1; // Add this
        this.itemsPerPage = 25; // Add this
        this.totalPages = 1; // Add this
    }

    init() {
    this.bindEvents();
    this.loadSessions();
    this.loadAnalytics();
    this.loadRecentActivity();
    this.checkClickerStatus(); // Add this line
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        this.loadAnalytics();
        this.loadRecentActivity();
        this.loadSessions();
        this.checkClickerStatus(); // Add this line
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

        document.getElementById('startClickerBtn').addEventListener('click', () => {
            this.startClicker();
        });

        document.getElementById('stopClickerBtn').addEventListener('click', () => {
            this.stopClicker();
        });

        // Add pagination event bindings
        document.getElementById('itemsPerPage').addEventListener('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            this.currentPage = 1; // Reset to first page
            this.loadRecentActivity();
        });

        document.getElementById('firstPageBtn').addEventListener('click', () => {
            this.currentPage = 1;
            this.loadRecentActivity();
        });

        document.getElementById('prevPageBtn').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadRecentActivity();
            }
        });

        document.getElementById('nextPageBtn').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadRecentActivity();
            }
        });

        document.getElementById('lastPageBtn').addEventListener('click', () => {
            this.currentPage = this.totalPages;
            this.loadRecentActivity();
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

        this.currentPage = 1; // Reset to first page when filters change
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
        this.currentPage = 1; // Reset to first page
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
            // Show loading state
            document.getElementById('activityLoading').classList.remove('hidden');
            document.getElementById('recentActivityTable').style.opacity = '0.5';

            const params = new URLSearchParams({
                sessionId: this.currentFilters.sessionId || '',
                page: this.currentPage,
                limit: this.itemsPerPage
            });

            const response = await fetch(`/api/analytics/recent-activity?${params}`);
            const result = await response.json();

            this.updateRecentActivityTable(result.data);
            this.updatePagination(result.pagination);
        } catch (error) {
            console.error('Error loading recent activity:', error);
        } finally {
            // Hide loading state
            document.getElementById('activityLoading').classList.add('hidden');
            document.getElementById('recentActivityTable').style.opacity = '1';
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
        this.currentPage = 1; // Reset to first page
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

        if (data.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="9" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-2xl mb-2"></i>
                    <p>No recent activity found</p>
                </td>
            `;
            tbody.appendChild(row);
            return;
        }

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

    updatePagination(pagination) {
        this.totalPages = pagination.totalPages;
        
        // Update pagination info
        const startItem = ((pagination.currentPage - 1) * pagination.itemsPerPage) + 1;
        const endItem = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalCount);
        
        document.getElementById('paginationInfo').textContent = 
            `Showing ${startItem} to ${endItem} of ${pagination.totalCount} results`;

        // Update button states
        document.getElementById('firstPageBtn').disabled = !pagination.hasPreviousPage;
        document.getElementById('prevPageBtn').disabled = !pagination.hasPreviousPage;
        document.getElementById('nextPageBtn').disabled = !pagination.hasNextPage;
        document.getElementById('lastPageBtn').disabled = !pagination.hasNextPage;

        // Update page numbers
        this.updatePageNumbers(pagination);
    }

    updatePageNumbers(pagination) {
        const pageNumbersContainer = document.getElementById('pageNumbers');
        pageNumbersContainer.innerHTML = '';

        const currentPage = pagination.currentPage;
        const totalPages = pagination.totalPages;
        
        // Calculate which page numbers to show
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        // Adjust if we're near the beginning or end
        if (currentPage <= 3) {
            endPage = Math.min(5, totalPages);
        }
        if (currentPage >= totalPages - 2) {
            startPage = Math.max(1, totalPages - 4);
        }

        // Add ellipsis at the start if needed
        if (startPage > 1) {
            this.addPageNumber(pageNumbersContainer, 1, currentPage);
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'px-2 py-1 text-sm text-gray-500';
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
        }

        // Add page numbers
        for (let i = startPage; i <= endPage; i++) {
            this.addPageNumber(pageNumbersContainer, i, currentPage);
        }

        // Add ellipsis at the end if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'px-2 py-1 text-sm text-gray-500';
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
            this.addPageNumber(pageNumbersContainer, totalPages, currentPage);
        }
    }

    addPageNumber(container, pageNumber, currentPage) {
        const button = document.createElement('button');
        button.className = `px-3 py-1 text-sm rounded ${
            pageNumber === currentPage 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }`;
        button.textContent = pageNumber;
        button.addEventListener('click', () => {
            this.currentPage = pageNumber;
            this.loadRecentActivity();
        });
        container.appendChild(button);
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

   async checkClickerStatus() {
    try {
        const response = await fetch('/clicker-status');
        const data = await response.json();
        this.updateClickerStatus(data.isClickerRunning);
    } catch (error) {
        console.error('Error checking clicker status:', error);
    }
}

updateClickerStatus(isRunning) {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const startBtn = document.getElementById('startClickerBtn');
    const stopBtn = document.getElementById('stopClickerBtn');

    if (isRunning) {
        statusIndicator.className = 'w-3 h-3 rounded-full bg-green-500 mr-2';
        statusText.textContent = 'Running';
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } else {
        statusIndicator.className = 'w-3 h-3 rounded-full bg-red-500 mr-2';
        statusText.textContent = 'Stopped';
        startBtn.disabled = false;
        stopBtn.disabled = true;
        document.getElementById('sessionInfo').classList.add('hidden');
    }
}

async startClicker() {
    const searchKeyword = document.getElementById('searchKeyword').value.trim();
    const searchEngine = document.getElementById('searchEngineSelect').value;
    const targetDomain = document.getElementById('targetDomain').value.trim();

    // Validation
    if (!searchKeyword) {
        alert('Please enter a search keyword');
        return;
    }

    if (!searchEngine) {
        alert('Please select a search engine');
        return;
    }

    try {
        const params = new URLSearchParams({
            searchTerm: searchKeyword,
            searchEngine: searchEngine,
            ...(targetDomain && { target: targetDomain })
        });

        const response = await fetch(`/start-clicker?${params}`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            this.updateClickerStatus(true);
            
            // Show session info
            document.getElementById('currentSessionId').textContent = data.sessionId;
            document.getElementById('sessionInfo').classList.remove('hidden');
            
            // Show success message
            this.showMessage('Clicker started successfully!', 'success');
            
            // Refresh data
            this.loadAnalytics();
            this.loadRecentActivity();
            this.loadSessions();
        } else {
            this.showMessage(data.message || 'Failed to start clicker', 'error');
        }
    } catch (error) {
        console.error('Error starting clicker:', error);
        this.showMessage('Error starting clicker', 'error');
    }
}

async stopClicker() {
    try {
        const response = await fetch('/stop-clicker', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            this.updateClickerStatus(false);
            this.showMessage('Clicker stopped successfully!', 'success');
            
            // Refresh data
            this.loadAnalytics();
            this.loadRecentActivity();
            this.loadSessions();
        } else {
            this.showMessage('Failed to stop clicker', 'error');
        }
    } catch (error) {
        console.error('Error stopping clicker:', error);
        this.showMessage('Error stopping clicker', 'error');
    }
}

showMessage(message, type) {
    // Create a temporary message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 px-4 py-2 rounded-md text-white z-50 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        if (document.body.contains(messageDiv)) {
            document.body.removeChild(messageDiv);
        }
    }, 3000);
} 
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ClickAnalyticsDashboard();
});