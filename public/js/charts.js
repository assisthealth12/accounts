// Charts Management System
class ChartsManager {
    constructor() {
        this.lineChart = null;
        this.barChart = null;
        this.referralPieChart = null;
        this.paymentPieChart = null;
    }

    // Render line chart (Date vs Total Bill)
    renderLineChart(entries) {
        const ctx = document.getElementById('line-chart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.lineChart) {
            this.lineChart.destroy();
        }
        
        // Group entries by date
        const dateData = {};
        entries.forEach(entry => {
            const dateStr = entry.date ? new Date(entry.date).toISOString().split('T')[0] : 'Unknown';
            if (!dateData[dateStr]) {
                dateData[dateStr] = 0;
            }
            dateData[dateStr] += entry.totalBillAmount || 0;
        });
        
        const dates = Object.keys(dateData).sort();
        const amounts = dates.map(date => dateData[date]);
        
        this.lineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Total Bill Amount',
                    data: amounts,
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Date vs Total Bill Amount'
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

    // Render bar chart (Service Type vs Amount)
    renderBarChart(entries, services) {
        const ctx = document.getElementById('bar-chart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.barChart) {
            this.barChart.destroy();
        }
        
        // Group entries by service type
        const serviceData = {};
        entries.forEach(entry => {
            const serviceName = services.find(s => s.id === entry.serviceTypeId)?.name || 'Unknown';
            if (!serviceData[serviceName]) {
                serviceData[serviceName] = 0;
            }
            serviceData[serviceName] += entry.totalBillAmount || 0;
        });
        
        const serviceNames = Object.keys(serviceData);
        const amounts = Object.values(serviceData);
        
        this.barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: serviceNames,
                datasets: [{
                    label: 'Total Bill Amount',
                    data: amounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Service Type vs Total Bill Amount'
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

    // Render referral pie chart
    renderReferralPieChart(entries) {
        const ctx = document.getElementById('referral-pie-chart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.referralPieChart) {
            this.referralPieChart.destroy();
        }
        
        // Count referral statuses
        const referralCounts = { 'Pending': 0, 'Received': 0 };
        entries.forEach(entry => {
            const status = entry.referralStatus || 'Pending';
            if (referralCounts.hasOwnProperty(status)) {
                referralCounts[status]++;
            }
        });
        
        const labels = Object.keys(referralCounts);
        const counts = Object.values(referralCounts);
        
        this.referralPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        'rgba(255, 205, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 205, 86, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Referral Status Distribution'
                    }
                }
            }
        });
    }

    // Render payment pie chart
    renderPaymentPieChart(entries) {
        const ctx = document.getElementById('payment-pie-chart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.paymentPieChart) {
            this.paymentPieChart.destroy();
        }
        
        // Count payment statuses
        const paymentCounts = { 'Pending': 0, 'Completed': 0 };
        entries.forEach(entry => {
            if (entry.paymentByUs === 'Yes' && entry.paymentDetails) {
                const status = entry.paymentDetails.paymentStatus || 'Pending';
                if (paymentCounts.hasOwnProperty(status)) {
                    paymentCounts[status]++;
                }
            } else if (entry.paymentByUs === 'Yes') {
                // If paymentByUs is Yes but no payment details, count as Pending
                paymentCounts['Pending']++;
            }
        });
        
        const labels = Object.keys(paymentCounts);
        const counts = Object.values(paymentCounts);
        
        this.paymentPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Payment Status Distribution'
                    }
                }
            }
        });
    }

    // Update all charts with filtered data
    updateCharts(entries, services) {
        this.renderLineChart(entries);
        this.renderBarChart(entries, services);
        this.renderReferralPieChart(entries);
        this.renderPaymentPieChart(entries);
    }

    // Destroy all charts (for cleanup)
    destroyCharts() {
        if (this.lineChart) {
            this.lineChart.destroy();
            this.lineChart = null;
        }
        if (this.barChart) {
            this.barChart.destroy();
            this.barChart = null;
        }
        if (this.referralPieChart) {
            this.referralPieChart.destroy();
            this.referralPieChart = null;
        }
        if (this.paymentPieChart) {
            this.paymentPieChart.destroy();
            this.paymentPieChart = null;
        }
    }
}

// Initialize charts manager
window.chartsManager = new ChartsManager();