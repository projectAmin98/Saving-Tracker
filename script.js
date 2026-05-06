// Savings Tracker Application
class SavingsTracker {
    constructor() {
        this.data = {
            monthlySavings: {},
            bonusSavings: [],
            savingsGoal: 10000
        };
        this.currentEditItem = null;
        this.editType = null;
        this.currentUser = null;
        this.serverUrl = 'http://localhost:3000/api'; // Server endpoint
        this.initializeApp();
    }

    initializeApp() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.setupDarkMode();
    }

    checkAuthentication() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('currentUser');
        
        if (token && user) {
            this.currentUser = JSON.parse(user);
            this.showMainApp();
            this.loadData();
            this.populateYearSelects();
            this.updateAllDisplays();
        } else {
            this.showLoginModal();
        }
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'block';
        document.getElementById('registrationModal').style.display = 'none';
        document.getElementById('mainApp').style.display = 'none';
    }

    showRegistration() {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('registrationModal').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
    }

    closeRegistrationModal() {
        document.getElementById('registrationModal').style.display = 'none';
        this.showLoginModal();
    }

    showMainApp() {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('registrationModal').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
    }

    // Authentication Functions
    async login() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!username || !password) {
            this.showToast('Please enter username and password', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.serverUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, rememberMe })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                this.showToast(`Welcome back, ${data.user.username}!`, 'success');
                this.showMainApp();
                this.loadData();
                this.populateYearSelects();
                this.updateAllDisplays();
            } else {
                this.showToast(data.message || 'Login failed', 'error');
            }
        } catch (error) {
            this.showToast('Login error. Please try again.', 'error');
            console.error('Login error:', error);
        }
    }

    async register() {
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        if (!username || !email || !password || !confirmPassword) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.serverUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Account created successfully! Please login.', 'success');
                this.closeRegistrationModal();
                // Clear form
                document.getElementById('regUsername').value = '';
                document.getElementById('regEmail').value = '';
                document.getElementById('regPassword').value = '';
                document.getElementById('regConfirmPassword').value = '';
            } else {
                this.showToast(data.message || 'Registration failed', 'error');
            }
        } catch (error) {
            this.showToast('Registration error. Please try again.', 'error');
            console.error('Registration error:', error);
        }
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            this.currentUser = null;
            this.showToast('Logged out successfully', 'success');
            this.showLoginModal();
        }
    }

    // Data Management
    async loadData() {
        if (!this.currentUser) {
            // Fallback to localStorage for demo
            const savedData = localStorage.getItem('savingsTrackerData');
            if (savedData) {
                this.data = JSON.parse(savedData);
                this.migrateDataFormat();
            }
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${this.serverUrl}/data`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.data = data;
                this.migrateDataFormat();
            } else {
                // Fallback to localStorage if server fails
                const savedData = localStorage.getItem('savingsTrackerData');
                if (savedData) {
                    this.data = JSON.parse(savedData);
                    this.migrateDataFormat();
                }
            }
        } catch (error) {
            console.error('Error loading data from server:', error);
            // Fallback to localStorage
            const savedData = localStorage.getItem('savingsTrackerData');
            if (savedData) {
                this.data = JSON.parse(savedData);
                this.migrateDataFormat();
            }
        }
    }

    async saveData() {
        // Always save to localStorage as backup
        localStorage.setItem('savingsTrackerData', JSON.stringify(this.data));
        
        if (!this.currentUser) {
            return; // Only save to server if user is logged in
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${this.serverUrl}/data`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.data)
            });

            if (!response.ok) {
                console.error('Failed to save data to server');
                this.showToast('Failed to sync with server. Data saved locally.', 'error');
            }
        } catch (error) {
            console.error('Error saving data to server:', error);
            this.showToast('Server sync failed. Data saved locally.', 'error');
        }
    }

    migrateDataFormat() {
        // Migrate old monthly savings format to include year and achievement status
        if (this.data.monthlySavings) {
            const hasOldFormat = Object.keys(this.data.monthlySavings).some(key => 
                !key.includes('-') || typeof this.data.monthlySavings[key] === 'number'
            );
            
            if (hasOldFormat) {
                const oldMonthlySavings = { ...this.data.monthlySavings };
                this.data.monthlySavings = {};
                const currentYear = new Date().getFullYear();
                
                Object.keys(oldMonthlySavings).forEach(key => {
                    let year, month;
                    if (key.includes('-')) {
                        [year, month] = key.split('-');
                    } else {
                        year = currentYear;
                        month = key;
                    }
                    
                    const amount = typeof oldMonthlySavings[key] === 'number' 
                        ? oldMonthlySavings[key] 
                        : oldMonthlySavings[key].amount;
                    
                    this.data.monthlySavings[`${year}-${month}`] = {
                        amount: amount,
                        achieved: typeof oldMonthlySavings[key] === 'object' 
                            ? oldMonthlySavings[key].achieved || false 
                            : false
                    };
                });
            }
        }

        // Migrate old bonus savings format to include year and achievement status
        if (this.data.bonusSavings && this.data.bonusSavings.length > 0) {
            this.data.bonusSavings = this.data.bonusSavings.map(bonus => {
                const migratedBonus = { ...bonus };
                if (!migratedBonus.year) {
                    const currentYear = new Date().getFullYear();
                    migratedBonus.year = currentYear;
                }
                if (migratedBonus.achieved === undefined) {
                    migratedBonus.achieved = false;
                }
                return migratedBonus;
            });
        }
    }

    populateYearSelects() {
        const currentYear = new Date().getFullYear();
        const years = [];
        
        // Generate years from current year to 5 years back and 5 years forward
        for (let year = currentYear - 5; year <= currentYear + 5; year++) {
            years.push(year);
        }

        // Populate monthly savings year select
        const yearSelect = document.getElementById('yearSelect');
        yearSelect.innerHTML = '<option value="">Choose a year...</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        });

        // Populate bonus savings year select
        const bonusYearSelect = document.getElementById('bonusYearSelect');
        bonusYearSelect.innerHTML = '<option value="">Choose a year...</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            bonusYearSelect.appendChild(option);
        });
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
        document.getElementById('setGoal').addEventListener('click', () => this.setSavingsGoal());
        document.getElementById('savingsGoal').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.setSavingsGoal();
        });

        // Optional Features
        document.getElementById('darkModeToggle').addEventListener('click', () => this.toggleDarkMode());
        document.getElementById('resetData').addEventListener('click', () => this.resetData());
        document.getElementById('exportCSV').addEventListener('click', () => this.exportToCSV());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Modal event listeners
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('editModal');
            if (event.target === modal) {
                this.closeEditModal();
            }
        });
        
        document.getElementById('editAmount').addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.saveEdit();
            }
        });
        
        document.getElementById('editDescription').addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.saveEdit();
            }
        });

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
        const yearSelect = document.getElementById('yearSelect');
        const monthSelect = document.getElementById('monthSelect');
        const amountInput = document.getElementById('monthlyAmount');
        
        const year = yearSelect.value;
        const month = monthSelect.value;
        const amount = parseFloat(amountInput.value);

        if (!year) {
            this.showToast('Please select a year', 'error');
            return;
        }

        if (!month) {
            this.showToast('Please select a month', 'error');
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return;
        }

        const key = `${year}-${month}`;

        // Add or update monthly savings
        if (this.data.monthlySavings[key]) {
            this.data.monthlySavings[key] = {
                amount: this.data.monthlySavings[key].amount + amount,
                achieved: this.data.monthlySavings[key].achieved || false
            };
            this.showToast(`Updated ${month} ${year} savings: +RM${amount.toFixed(2)}`, 'success');
        } else {
            this.data.monthlySavings[key] = {
                amount: amount,
                achieved: false
            };
            this.showToast(`Added ${month} ${year} savings: RM${amount.toFixed(2)}`, 'success');
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

    markAsAchieved(key) {
        const [year, month] = key.split('-');
        if (this.data.monthlySavings[key]) {
            this.data.monthlySavings[key].achieved = true;
            this.saveData();
            this.updateMonthlySavingsDisplay();
            this.updateSummaryDisplay();
            this.updateProjectionDisplay();
            this.showToast(`Marked ${month} ${year} as achieved`, 'success');
        }
    }

    markAsPending(key) {
        const [year, month] = key.split('-');
        if (this.data.monthlySavings[key]) {
            this.data.monthlySavings[key].achieved = false;
            this.saveData();
            this.updateMonthlySavingsDisplay();
            this.updateSummaryDisplay();
            this.updateProjectionDisplay();
            this.showToast(`Marked ${month} ${year} as pending`, 'success');
        }
    }

    deleteMonthlySavings(key) {
        const [year, month] = key.split('-');
        if (confirm(`Delete savings for ${month} ${year}?`)) {
            delete this.data.monthlySavings[key];
            this.saveData();
            this.updateMonthlySavingsDisplay();
            this.updateSummaryDisplay();
            this.updateProjectionDisplay();
            this.showToast(`Deleted ${month} ${year} savings`, 'success');
        }
    }

    updateMonthlySavingsDisplay() {
        const tbody = document.getElementById('monthlySavingsBody');
        const totalElement = document.getElementById('totalMonthlySavings');
        
        tbody.innerHTML = '';
        let total = 0;

        // Sort months chronologically by year then month
        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
        
        const sortedKeys = Object.keys(this.data.monthlySavings).sort((a, b) => {
            const [yearA, monthA] = a.split('-');
            const [yearB, monthB] = b.split('-');
            
            // First sort by year
            if (yearA !== yearB) {
                return yearA.localeCompare(yearB);
            }
            
            // Then sort by month
            return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
        });

        sortedKeys.forEach(key => {
            const [year, month] = key.split('-');
            const savingsData = this.data.monthlySavings[key];
            const amount = savingsData.amount;
            const achieved = savingsData.achieved || false;
            total += amount;

            const row = tbody.insertRow();
            row.className = achieved ? 'status-achieved-row' : 'status-pending-row';
            row.innerHTML = `
                <td>${month} ${year}</td>
                <td>RM${amount.toFixed(2)}</td>
                <td>
                    <div class="tooltip">
                        <span class="status-badge ${achieved ? 'status-achieved' : 'status-pending'}">
                            ${achieved ? 'Achieved' : 'Pending'}
                        </span>
                        <span class="tooltiptext">${achieved 
                            ? 'This amount counts toward your savings goal and projections' 
                            : 'This amount is planned but not yet achieved - mark as Done to count toward goals'}</span>
                    </div>
                </td>
                <td>
                    <div class="tooltip">
                        <button class="btn btn-secondary btn-small" onclick="tracker.openEditModal('monthly', '${key}')">
                            Edit
                        </button>
                        <span class="tooltiptext">Edit the amount for ${month} ${year}</span>
                    </div>
                    ${achieved 
                        ? `<div class="tooltip">
                            <button class="btn btn-warning btn-small" onclick="tracker.markAsPending('${key}')">
                                Pending
                              </button>
                              <span class="tooltiptext">Mark as pending - amount won't count toward goals</span>
                          </div>`
                        : `<div class="tooltip">
                            <button class="btn btn-success btn-small" onclick="tracker.markAsAchieved('${key}')">
                                Done
                              </button>
                              <span class="tooltiptext">Mark as achieved - amount will count toward goals</span>
                          </div>`
                    }
                    <div class="tooltip">
                        <button class="btn btn-danger btn-small" onclick="tracker.deleteMonthlySavings('${key}')">
                            Delete
                        </button>
                        <span class="tooltiptext">Delete this savings entry</span>
                    </div>
                </td>
            `;
        });

        totalElement.textContent = `RM${total.toFixed(2)}`;
    }

    // Bonus Savings Functions
    addBonusSavings() {
        const yearSelect = document.getElementById('bonusYearSelect');
        const monthSelect = document.getElementById('bonusMonthSelect');
        const descriptionInput = document.getElementById('bonusDescription');
        const amountInput = document.getElementById('bonusAmount');
        
        const year = yearSelect.value;
        const month = monthSelect.value;
        const description = descriptionInput.value.trim();
        const amount = parseFloat(amountInput.value);

        if (!year) {
            this.showToast('Please select a year', 'error');
            return;
        }

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
            year,
            month,
            description,
            amount,
            achieved: false,
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
        this.showToast(`Added extra income: ${month} ${year} - ${description} - RM${amount.toFixed(2)}`, 'success');
    }

    markBonusAsAchieved(id) {
        const bonus = this.data.bonusSavings.find(b => b.id === id);
        if (bonus) {
            bonus.achieved = true;
            this.saveData();
            this.updateBonusSavingsDisplay();
            this.updateSummaryDisplay();
            this.updateProjectionDisplay();
            this.showToast(`Marked "${bonus.description}" as achieved`, 'success');
        }
    }

    markBonusAsPending(id) {
        const bonus = this.data.bonusSavings.find(b => b.id === id);
        if (bonus) {
            bonus.achieved = false;
            this.saveData();
            this.updateBonusSavingsDisplay();
            this.updateSummaryDisplay();
            this.updateProjectionDisplay();
            this.showToast(`Marked "${bonus.description}" as pending`, 'success');
        }
    }

    deleteBonusSavings(id) {
        if (confirm('Delete this extra income entry?')) {
            this.data.bonusSavings = this.data.bonusSavings.filter(bonus => bonus.id !== id);
            this.saveData();
            this.updateBonusSavingsDisplay();
            this.updateSummaryDisplay();
            this.updateProjectionDisplay();
            this.showToast('Extra income entry deleted', 'success');
        }
    }

    // Edit Modal Functions
    openEditModal(type, item) {
        this.editType = type;
        this.currentEditItem = item;
        
        const modal = document.getElementById('editModal');
        const modalTitle = document.getElementById('modalTitle');
        const amountInput = document.getElementById('editAmount');
        const descriptionInput = document.getElementById('editDescription');
        
        if (type === 'monthly') {
            const [year, month] = item.split('-');
            const savingsData = this.data.monthlySavings[item];
            modalTitle.textContent = `Edit ${month} ${year} Savings`;
            amountInput.value = savingsData.amount;
            descriptionInput.value = `${month} ${year} Savings`;
            descriptionInput.disabled = true;
        } else if (type === 'bonus') {
            const bonus = this.data.bonusSavings.find(b => b.id === item);
            modalTitle.textContent = 'Edit Extra Income';
            amountInput.value = bonus.amount;
            descriptionInput.value = bonus.description;
            descriptionInput.disabled = false;
        }
        
        modal.style.display = 'block';
        amountInput.focus();
    }

    closeEditModal() {
        const modal = document.getElementById('editModal');
        modal.style.display = 'none';
        this.currentEditItem = null;
        this.editType = null;
        
        // Clear form
        document.getElementById('editAmount').value = '';
        document.getElementById('editDescription').value = '';
        document.getElementById('editDescription').disabled = false;
    }

    saveEdit() {
        const amountInput = document.getElementById('editAmount');
        const descriptionInput = document.getElementById('editDescription');
        const newAmount = parseFloat(amountInput.value);
        
        if (isNaN(newAmount) || newAmount <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return;
        }
        
        if (this.editType === 'monthly') {
            const [year, month] = this.currentEditItem.split('-');
            this.data.monthlySavings[this.currentEditItem].amount = newAmount;
            this.showToast(`Updated ${month} ${year} savings: RM${newAmount.toFixed(2)}`, 'success');
        } else if (this.editType === 'bonus') {
            const bonus = this.data.bonusSavings.find(b => b.id === this.currentEditItem);
            bonus.amount = newAmount;
            bonus.description = descriptionInput.value.trim();
            this.showToast(`Updated extra income: ${bonus.description} - RM${newAmount.toFixed(2)}`, 'success');
        }
        
        this.saveData();
        this.updateAllDisplays();
        this.closeEditModal();
    }

    updateBonusSavingsDisplay() {
        const bonusList = document.getElementById('bonusList');
        const totalElement = document.getElementById('totalBonusSavings');
        
        bonusList.innerHTML = '';
        let total = 0;

        if (this.data.bonusSavings.length === 0) {
            bonusList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No extra income yet</p>';
        } else {
            // Sort bonus savings by year, month, and date
            const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                              'July', 'August', 'September', 'October', 'November', 'December'];
            
            const sortedBonus = [...this.data.bonusSavings].sort((a, b) => {
                // First sort by year
                if (a.year !== b.year) {
                    return a.year.localeCompare(b.year);
                }
                
                // Then sort by month
                const monthCompare = monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
                if (monthCompare !== 0) return monthCompare;
                
                // Finally sort by date
                return new Date(b.date) - new Date(a.date);
            });

            sortedBonus.forEach(bonus => {
                total += bonus.amount;
                const achieved = bonus.achieved || false;

                const bonusItem = document.createElement('div');
                bonusItem.className = `bonus-item ${achieved ? 'status-achieved-row' : 'status-pending-row'}`;
                bonusItem.innerHTML = `
                    <div class="bonus-info">
                        <div class="bonus-description">${bonus.month} ${bonus.year} - ${bonus.description}</div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                            <div class="tooltip">
                                <span class="status-badge ${achieved ? 'status-achieved' : 'status-pending'}">
                                    ${achieved ? 'Achieved' : 'Pending'}
                                </span>
                                <span class="tooltiptext">${achieved 
                                    ? 'This extra income counts toward your savings goal and projections' 
                                    : 'This extra income is planned but not yet achieved - mark as Done to count toward goals'}</span>
                            </div>
                            <small style="color: var(--text-secondary);">${bonus.date}</small>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                        <span class="bonus-amount">RM${bonus.amount.toFixed(2)}</span>
                        <div style="display: flex; gap: 5px;">
                            <div class="tooltip">
                                <button class="btn btn-secondary btn-small" onclick="tracker.openEditModal('bonus', ${bonus.id})">
                                    Edit
                                </button>
                                <span class="tooltiptext">Edit amount and description</span>
                            </div>
                            ${achieved 
                                ? `<div class="tooltip">
                                    <button class="btn btn-warning btn-small" onclick="tracker.markBonusAsPending(${bonus.id})">
                                        Pending
                                      </button>
                                      <span class="tooltiptext">Mark as pending - amount won't count toward goals</span>
                                  </div>`
                                : `<div class="tooltip">
                                    <button class="btn btn-success btn-small" onclick="tracker.markBonusAsAchieved(${bonus.id})">
                                        Done
                                      </button>
                                      <span class="tooltiptext">Mark as achieved - amount will count toward goals</span>
                                  </div>`
                            }
                            <div class="tooltip">
                                <button class="btn btn-danger btn-small" onclick="tracker.deleteBonusSavings(${bonus.id})">
                                    Delete
                                </button>
                                <span class="tooltiptext">Delete this extra income entry</span>
                            </div>
                        </div>
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
        const monthlyData = Object.values(this.data.monthlySavings);
        const monthlyTotal = monthlyData.reduce((sum, data) => sum + data.amount, 0);
        const achievedMonthlyTotal = monthlyData.filter(data => data.achieved).reduce((sum, data) => sum + data.amount, 0);
        const pendingMonthlyTotal = monthlyTotal - achievedMonthlyTotal;
        
        const bonusData = this.data.bonusSavings;
        const bonusTotal = bonusData.reduce((sum, bonus) => sum + bonus.amount, 0);
        const achievedBonusTotal = bonusData.filter(bonus => bonus.achieved).reduce((sum, bonus) => sum + bonus.amount, 0);
        const pendingBonusTotal = bonusTotal - achievedBonusTotal;
        
        const totalSavings = achievedMonthlyTotal + achievedBonusTotal;
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

        // Update summary breakdown if element exists
        this.updateSummaryBreakdown(achievedMonthlyTotal, pendingMonthlyTotal, achievedBonusTotal, pendingBonusTotal);
    }

    updateSummaryBreakdown(achievedMonthly, pendingMonthly, achievedBonus, pendingBonus) {
        // Create or update summary breakdown section
        let breakdownDiv = document.getElementById('summaryBreakdown');
        if (!breakdownDiv) {
            breakdownDiv = document.createElement('div');
            breakdownDiv.id = 'summaryBreakdown';
            breakdownDiv.className = 'summary-breakdown';
            
            // Insert after progress section
            const progressSection = document.querySelector('.progress-section');
            progressSection.parentNode.insertBefore(breakdownDiv, progressSection.nextSibling);
        }

        breakdownDiv.innerHTML = `
            <h4>Savings Breakdown</h4>
            <div class="breakdown-grid">
                <div class="breakdown-item">
                    <label>Achieved Monthly:</label>
                    <span class="breakdown-value achieved">RM${achievedMonthly.toFixed(2)}</span>
                </div>
                <div class="breakdown-item">
                    <label>Pending Monthly:</label>
                    <span class="breakdown-value pending">RM${pendingMonthly.toFixed(2)}</span>
                </div>
                <div class="breakdown-item">
                    <label>Achieved Extra Income:</label>
                    <span class="breakdown-value achieved">RM${achievedBonus.toFixed(2)}</span>
                </div>
                <div class="breakdown-item">
                    <label>Pending Extra Income:</label>
                    <span class="breakdown-value pending">RM${pendingBonus.toFixed(2)}</span>
                </div>
            </div>
        `;
    }

    // Projection Display
    updateProjectionDisplay() {
        const monthlyData = Object.values(this.data.monthlySavings);
        const achievedMonthlyData = monthlyData.filter(data => data.achieved);
        const achievedMonthlyTotal = achievedMonthlyData.reduce((sum, data) => sum + data.amount, 0);
        const achievedMonthlyCount = achievedMonthlyData.length;
        const averageMonthly = achievedMonthlyCount > 0 ? achievedMonthlyTotal / achievedMonthlyCount : 0;
        
        const bonusData = this.data.bonusSavings;
        const achievedBonusData = bonusData.filter(bonus => bonus.achieved);
        const achievedBonusTotal = achievedBonusData.reduce((sum, bonus) => sum + bonus.amount, 0);
        const totalSavings = achievedMonthlyTotal + achievedBonusTotal;
        const remaining = Math.max(0, this.data.savingsGoal - totalSavings);

        // Calculate projections based on achieved amounts only
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
        } else if (achievedMonthlyCount === 0) {
            monthsToGoal = 'No achieved savings';
            estimatedCompletion = 'Mark savings as achieved';
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
        csvContent += 'Year,Month,Amount,Status\n';
        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
        const sortedKeys = Object.keys(this.data.monthlySavings).sort((a, b) => {
            const [yearA, monthA] = a.split('-');
            const [yearB, monthB] = b.split('-');
            
            if (yearA !== yearB) {
                return yearA.localeCompare(yearB);
            }
            return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
        });
        
        sortedKeys.forEach(key => {
            const [year, month] = key.split('-');
            const savingsData = this.data.monthlySavings[key];
            csvContent += `${year},${month},RM${savingsData.amount.toFixed(2)},${savingsData.achieved ? 'Achieved' : 'Pending'}\n`;
        });
        
        const monthlyTotal = Object.values(this.data.monthlySavings).reduce((sum, data) => sum + data.amount, 0);
        csvContent += `Total Monthly Savings,RM${monthlyTotal.toFixed(2)}\n\n`;
        
        // Extra Income
        csvContent += 'Extra Income\n';
        csvContent += 'Year,Month,Description,Amount,Status,Date\n';
        this.data.bonusSavings.forEach(bonus => {
            csvContent += `${bonus.year},${bonus.month},"${bonus.description}",RM${bonus.amount.toFixed(2)},${bonus.achieved ? 'Achieved' : 'Pending'},${bonus.date}\n`;
        });
        
        const bonusTotal = this.data.bonusSavings.reduce((sum, bonus) => sum + bonus.amount, 0);
        csvContent += `Total Extra Income,RM${bonusTotal.toFixed(2)}\n\n`;
        
        // Summary with achieved amounts
        const achievedMonthlyTotal = Object.values(this.data.monthlySavings).filter(data => data.achieved).reduce((sum, data) => sum + data.amount, 0);
        const achievedBonusTotal = this.data.bonusSavings.filter(bonus => bonus.achieved).reduce((sum, bonus) => sum + bonus.amount, 0);
        const achievedTotal = achievedMonthlyTotal + achievedBonusTotal;
        
        csvContent += 'Summary\n';
        csvContent += `Savings Goal,RM${this.data.savingsGoal.toFixed(2)}\n`;
        csvContent += `Achieved Monthly Total,RM${achievedMonthlyTotal.toFixed(2)}\n`;
        csvContent += `Achieved Extra Income Total,RM${achievedBonusTotal.toFixed(2)}\n`;
        csvContent += `Total Achieved Savings,RM${achievedTotal.toFixed(2)}\n`;
        csvContent += `Remaining to Goal,RM${Math.max(0, this.data.savingsGoal - achievedTotal).toFixed(2)}\n`;
        csvContent += `Progress Percentage,${((achievedTotal / this.data.savingsGoal) * 100).toFixed(1)}%\n`;

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
