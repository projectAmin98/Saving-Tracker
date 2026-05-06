// Savings Tracker Application
class SavingsTracker {
    constructor() {
        this.data = {
            monthlySavings: {},
            bonusSavings: [],
            savingsGoal: 10000
        };
        this.initializeApp();
    }

    initializeApp() {
        this.loadData();
        this.setupEventListeners();
        this.setupDarkMode();
        this.updateAllDisplays();
    }

    // Data Management
    loadData() {
        const savedData = localStorage.getItem('savingsTrackerData');
        if (savedData) {
            this.data = JSON.parse(savedData);
        }
    }

    saveData() {
        localStorage.setItem('savingsTrackerData', JSON.stringify(this.data));
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Monthly Savings
        document.getElementById('addMonthlySavings').addEventListener('click', () => this.addMonthlySavings());
        document.getElementById('monthlyAmount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addMonthlySavings();
        });

        // Bonus Savings
        document.getElementById('addBonusSavings').addEventListener('click', () => this.addBonusSavings());
        document.getElementById('bonusAmount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addBonusSavings();
        });

        // Goal Management
        document.getElementById('updateGoal').addEventListener('click', () => this.updateGoal());
        document.getElementById('savingsGoal').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.updateGoal();
        });

        // Optional Features
        document.getElementById('darkModeToggle').addEventListener('click', () => this.toggleDarkMode());
        document.getElementById('resetData').addEventListener('click', () => this.resetAllData());
        document.getElementById('exportCSV').addEventListener('click', () => this.exportToCSV());

        // Input validation
        this.setupInputValidation();
    }

    setupInputValidation() {
        // Prevent negative values and handle input formatting
        const numberInputs = document.querySelectorAll('input[type="number"]');
        numberInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                if (e.target.value < 0) {
                    e.target.value = 0;
                }
            });
        });
    }

    
    // Monthly Savings Functions
    addMonthlySavings() {
        const monthSelect = document.getElementById('monthSelect');
        const amountInput = document.getElementById('monthlyAmount');
        
        const month = monthSelect.value;
        const amount = parseFloat(amountInput.value);

        if (!month) {
            this.showToast('Please select a month', 'error');
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return;
        }

        // Add or update monthly savings
        if (this.data.monthlySavings[month]) {
            this.data.monthlySavings[month] += amount;
            this.showToast(`Updated ${month} savings: +RM${amount.toFixed(2)}`, 'success');
        } else {
            this.data.monthlySavings[month] = amount;
            this.showToast(`Added ${month} savings: RM${amount.toFixed(2)}`, 'success');
        }

        // Clear inputs
        monthSelect.value = '';
        amountInput.value = '';

        // Save and update displays
        this.saveData();
        this.updateMonthlySavingsDisplay();
        this.updateSummaryDisplay();
        this.updateProjectionDisplay();
    }

    deleteMonthlySavings(month) {
        if (confirm(`Delete savings for ${month}?`)) {
            delete this.data.monthlySavings[month];
            this.saveData();
            this.updateMonthlySavingsDisplay();
            this.updateSummaryDisplay();
            this.updateProjectionDisplay();
            this.showToast(`Deleted ${month} savings`, 'success');
        }
    }

    updateMonthlySavingsDisplay() {
        const tbody = document.getElementById('monthlySavingsBody');
        const totalElement = document.getElementById('totalMonthlySavings');
        
        tbody.innerHTML = '';
        let total = 0;

        // Sort months chronologically
        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
        
        const sortedMonths = Object.keys(this.data.monthlySavings).sort((a, b) => 
            monthOrder.indexOf(a) - monthOrder.indexOf(b)
        );

        sortedMonths.forEach(month => {
            const amount = this.data.monthlySavings[month];
            total += amount;

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${month}</td>
                <td>RM${amount.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="tracker.deleteMonthlySavings('${month}')">
                        Delete
                    </button>
                </td>
            `;
        });

        totalElement.textContent = `RM${total.toFixed(2)}`;
    }

    // Bonus Savings Functions
    addBonusSavings() {
        const monthSelect = document.getElementById('bonusMonthSelect');
        const descriptionInput = document.getElementById('bonusDescription');
        const amountInput = document.getElementById('bonusAmount');
        
        const month = monthSelect.value;
        const description = descriptionInput.value.trim();
        const amount = parseFloat(amountInput.value);

        if (!month) {
            this.showToast('Please select a month', 'error');
            return;
        }

        if (!description) {
            this.showToast('Please enter a description', 'error');
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return;
        }

        const bonusEntry = {
            id: Date.now(),
            month,
            description,
            amount,
            date: new Date().toLocaleDateString()
        };

        this.data.bonusSavings.push(bonusEntry);

        // Clear inputs
        monthSelect.value = '';
        descriptionInput.value = '';
        amountInput.value = '';

        // Save and update displays
        this.saveData();
        this.updateBonusSavingsDisplay();
        this.updateSummaryDisplay();
        this.updateProjectionDisplay();
        this.showToast(`Added bonus: ${month} - ${description} - RM${amount.toFixed(2)}`, 'success');
    }

    deleteBonusSavings(id) {
        if (confirm('Delete this bonus entry?')) {
            this.data.bonusSavings = this.data.bonusSavings.filter(bonus => bonus.id !== id);
            this.saveData();
            this.updateBonusSavingsDisplay();
            this.updateSummaryDisplay();
            this.updateProjectionDisplay();
            this.showToast('Bonus entry deleted', 'success');
        }
    }

    updateBonusSavingsDisplay() {
        const bonusList = document.getElementById('bonusList');
        const totalElement = document.getElementById('totalBonusSavings');
        
        bonusList.innerHTML = '';
        let total = 0;

        if (this.data.bonusSavings.length === 0) {
            bonusList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No bonus savings yet</p>';
        } else {
            // Sort bonus savings by month and date
            const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                              'July', 'August', 'September', 'October', 'November', 'December'];
            
            const sortedBonus = [...this.data.bonusSavings].sort((a, b) => {
                const monthCompare = monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
                if (monthCompare !== 0) return monthCompare;
                return new Date(b.date) - new Date(a.date);
            });

            sortedBonus.forEach(bonus => {
                total += bonus.amount;

                const bonusItem = document.createElement('div');
                bonusItem.className = 'bonus-item';
                bonusItem.innerHTML = `
                    <div class="bonus-info">
                        <div class="bonus-description">${bonus.month} - ${bonus.description}</div>
                        <small style="color: var(--text-secondary);">${bonus.date}</small>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="bonus-amount">RM${bonus.amount.toFixed(2)}</span>
                        <button class="btn btn-danger btn-small" onclick="tracker.deleteBonusSavings(${bonus.id})">
                            Delete
                        </button>
                    </div>
                `;
                bonusList.appendChild(bonusItem);
            });
        }

        totalElement.textContent = `RM${total.toFixed(2)}`;
    }

    // Goal Management
    updateGoal() {
        const goalInput = document.getElementById('savingsGoal');
        const goal = parseFloat(goalInput.value);

        if (isNaN(goal) || goal <= 0) {
            this.showToast('Please enter a valid goal amount', 'error');
            return;
        }

        this.data.savingsGoal = goal;
        this.saveData();
        this.updateSummaryDisplay();
        this.updateProjectionDisplay();
        this.showToast(`Goal updated: RM${goal.toFixed(2)}`, 'success');
    }

    // Summary Display
    updateSummaryDisplay() {
        const monthlyTotal = Object.values(this.data.monthlySavings).reduce((sum, amount) => sum + amount, 0);
        const bonusTotal = this.data.bonusSavings.reduce((sum, bonus) => sum + bonus.amount, 0);
        const totalSavings = monthlyTotal + bonusTotal;
        const remaining = Math.max(0, this.data.savingsGoal - totalSavings);
        const percentage = Math.min(100, (totalSavings / this.data.savingsGoal) * 100);

        // Update display elements
        document.getElementById('totalSavings').textContent = `RM${totalSavings.toFixed(2)}`;
        document.getElementById('remainingAmount').textContent = `RM${remaining.toFixed(2)}`;
        document.getElementById('progressPercentage').textContent = `${percentage.toFixed(1)}%`;
        
        // Update progress bar
        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = `${percentage}%`;

        // Update goal input if different
        const goalInput = document.getElementById('savingsGoal');
        if (parseFloat(goalInput.value) !== this.data.savingsGoal) {
            goalInput.value = this.data.savingsGoal.toFixed(2);
        }
    }

    // Projection Display
    updateProjectionDisplay() {
        const monthlyTotal = Object.values(this.data.monthlySavings).reduce((sum, amount) => sum + amount, 0);
        const monthlyCount = Object.keys(this.data.monthlySavings).length;
        const averageMonthly = monthlyCount > 0 ? monthlyTotal / monthlyCount : 0;
        
        const bonusTotal = this.data.bonusSavings.reduce((sum, bonus) => sum + bonus.amount, 0);
        const totalSavings = monthlyTotal + bonusTotal;
        const remaining = Math.max(0, this.data.savingsGoal - totalSavings);

        // Calculate projections
        let monthsToGoal = '-';
        let estimatedCompletion = '-';

        if (averageMonthly > 0 && remaining > 0) {
            monthsToGoal = Math.ceil(remaining / averageMonthly);
            const currentDate = new Date();
            const completionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthsToGoal, 1);
            estimatedCompletion = completionDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long' 
            });
        } else if (remaining <= 0) {
            monthsToGoal = 'Goal Reached!';
            estimatedCompletion = 'Completed!';
        }

        // Update display
        document.getElementById('averageMonthly').textContent = `RM${averageMonthly.toFixed(2)}`;
        document.getElementById('monthsToGoal').textContent = monthsToGoal;
        document.getElementById('estimatedCompletion').textContent = estimatedCompletion;
    }

    // Update All Displays
    updateAllDisplays() {
        this.updateMonthlySavingsDisplay();
        this.updateBonusSavingsDisplay();
        this.updateSummaryDisplay();
        this.updateProjectionDisplay();
    }

    // Dark Mode
    setupDarkMode() {
        const darkModePreference = localStorage.getItem('darkMode');
        if (darkModePreference === 'true') {
            document.body.classList.add('dark-mode');
            document.getElementById('darkModeToggle').textContent = '☀️ Light Mode';
        }
    }

    toggleDarkMode() {
        const body = document.body;
        const toggleBtn = document.getElementById('darkModeToggle');
        
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        
        toggleBtn.textContent = isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
        localStorage.setItem('darkMode', isDarkMode);
        
        this.showToast(isDarkMode ? 'Dark mode enabled' : 'Light mode enabled', 'success');
    }

    // Reset Data
    resetAllData() {
        if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
            this.data = {
                monthlySavings: {},
                bonusSavings: [],
                savingsGoal: 10000
            };
            this.saveData();
            this.updateAllDisplays();
            this.showToast('All data has been reset', 'success');
        }
    }

    // Export to CSV
    exportToCSV() {
        let csvContent = 'data:text/csv;charset=utf-8,';
        
        // Headers
        csvContent += 'Savings Tracker Export\n';
        csvContent += `Generated on,${new Date().toLocaleDateString()}\n\n`;
        
        // Monthly Savings
        csvContent += 'Monthly Savings\n';
        csvContent += 'Month,Amount\n';
        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
        const sortedMonths = Object.keys(this.data.monthlySavings).sort((a, b) => 
            monthOrder.indexOf(a) - monthOrder.indexOf(b)
        );
        
        sortedMonths.forEach(month => {
            csvContent += `${month},RM${this.data.monthlySavings[month].toFixed(2)}\n`;
        });
        
        const monthlyTotal = Object.values(this.data.monthlySavings).reduce((sum, amount) => sum + amount, 0);
        csvContent += `Total Monthly Savings,RM${monthlyTotal.toFixed(2)}\n\n`;
        
        // Bonus Savings
        csvContent += 'Bonus Savings\n';
        csvContent += 'Month,Description,Amount,Date\n';
        this.data.bonusSavings.forEach(bonus => {
            csvContent += `"${bonus.month}","${bonus.description}",RM${bonus.amount.toFixed(2)},${bonus.date}\n`;
        });
        
        const bonusTotal = this.data.bonusSavings.reduce((sum, bonus) => sum + bonus.amount, 0);
        csvContent += `Total Bonus Savings,RM${bonusTotal.toFixed(2)}\n\n`;
        
        // Summary
        const totalSavings = monthlyTotal + bonusTotal;
        csvContent += 'Summary\n';
        csvContent += `Savings Goal,RM${this.data.savingsGoal.toFixed(2)}\n`;
        csvContent += `Total Savings,RM${totalSavings.toFixed(2)}\n`;
        csvContent += `Remaining,RM${Math.max(0, this.data.savingsGoal - totalSavings).toFixed(2)}\n`;
        csvContent += `Progress,${((totalSavings / this.data.savingsGoal) * 100).toFixed(1)}%\n`;

        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `savings_tracker_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Data exported to CSV successfully', 'success');
    }

    // Toast Notifications
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the application
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new SavingsTracker();
});
