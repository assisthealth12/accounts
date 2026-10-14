// Payroll: employee master (single + bulk add) and monthly payslip generation (admin only)
(function () {
    const T = () => window.payslipTemplate;

    const EMPLOYEE_FIELDS = [
        { key: 'employeeId', label: 'Employee ID', section: 'details', placeholder: 'Auto' },
        { key: 'name', label: 'Employee Name', section: 'details', required: true },
        { key: 'designation', label: 'Designation', section: 'details' },
        { key: 'department', label: 'Department', section: 'details' },
        { key: 'dateOfJoining', label: 'Date of Joining', section: 'details', type: 'date' },
        { key: 'email', label: 'Email', section: 'details', type: 'email' },
        { key: 'pan', label: 'PAN', section: 'details', upper: true, placeholder: 'ABCDE1234F' },
        { key: 'bankAccount', label: 'Bank A/c No.', section: 'bank' },
        { key: 'bankName', label: 'Bank Name', section: 'bank' },
        { key: 'ifsc', label: 'IFSC', section: 'bank', upper: true, placeholder: 'UTIB0000094' },
        { key: 'uan', label: 'UAN', section: 'bank', placeholder: 'Only if PF applicable' },
        { key: 'basic', label: 'Basic Salary', section: 'salary', type: 'number', required: true },
        { key: 'hra', label: 'HRA', section: 'salary', type: 'number' },
        { key: 'specialAllowance', label: 'Special Allowance', section: 'salary', type: 'number' },
        { key: 'conveyance', label: 'Conveyance Allowance', section: 'salary', type: 'number' },
        { key: 'pfApplicable', label: 'PF Applicable', section: 'salary', type: 'bool' }
    ];

    const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const esc = (v) => escapeHtml(v === undefined || v === null ? '' : String(v));
    const inr = (v) => '₹' + Math.round(v || 0).toLocaleString('en-IN');

    function toIsoDate(value) {
        const s = String(value || '').trim();
        if (!s) return '';
        let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
        m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
        if (m) {
            const year = m[3].length === 2 ? `20${m[3]}` : m[3];
            const d = new Date(Number(year), Number(m[2]) - 1, Number(m[1]));
            if (d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1) {
                return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
            }
            return null;
        }
        if (/^\d{5}$/.test(s)) { // Excel serial date
            const d = new Date(Math.round((Number(s) - 25569) * 86400000));
            return d.toISOString().slice(0, 10);
        }
        return null;
    }

    function isoToDDMMYYYY(iso) {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    }

    function currentMonthMinus(n) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - n);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    function todayIso() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    /**
     * Normalise raw field values (from the form, the bulk grid or an Excel upload) and validate them.
     * @returns {{ data: object, errors: object }}
     */
    function normalizeEmployee(raw) {
        const data = {};
        const errors = {};

        EMPLOYEE_FIELDS.forEach(f => {
            let v = raw[f.key];
            if (typeof v === 'string') v = v.trim();

            if (f.type === 'number') {
                const cleaned = String(v ?? '').replace(/[₹,\s]/g, '');
                const n = cleaned === '' ? 0 : Number(cleaned);
                if (isNaN(n) || n < 0) errors[f.key] = 'Enter a valid amount';
                data[f.key] = isNaN(n) ? 0 : n;
            } else if (f.type === 'bool') {
                if (typeof v === 'boolean') data[f.key] = v;
                else if (/^(y|yes|true|1)$/i.test(v || '')) data[f.key] = true;
                else if (/^(n|no|false|0)?$/i.test(v || '')) data[f.key] = false;
                else { data[f.key] = false; errors[f.key] = 'Use Yes or No'; }
            } else if (f.type === 'date') {
                const iso = toIsoDate(v);
                if (iso === null) errors[f.key] = 'Use DD/MM/YYYY';
                data[f.key] = iso || '';
            } else {
                data[f.key] = f.upper ? String(v || '').toUpperCase() : String(v || '');
            }

            if (f.required && !data[f.key]) errors[f.key] = `${f.label} is required`;
        });

        if (data.pan && !PAN_RE.test(data.pan)) errors.pan = 'PAN format: ABCDE1234F';
        if (data.ifsc && !IFSC_RE.test(data.ifsc)) errors.ifsc = 'IFSC format: ABCD0123456';
        if (data.email && !EMAIL_RE.test(data.email)) errors.email = 'Invalid email';
        if (data.email) data.email = data.email.toLowerCase();

        return { data, errors };
    }

    class PayrollManager {
        constructor() {
            this.employees = [];
            this.settings = {};
            this.activeTab = 'employees';
            this.empStatus = 'active';
            this.month = currentMonthMinus(1);
            this.slips = new Map(); // employee doc id -> { inputs, status, dirty }
            this.selected = new Set();
            this.bulkRows = [];
            this.logoDataUrl = null;
            this.loaded = false;
            this.review = null;
        }

        // ---------------------------------------------------------------- shell
        async show() {
            if (!document.getElementById('payroll-screen')) this.createScreen();
            window.dashboardManager.switchToScreen('payroll');
            window.dashboardManager.updateActiveNav('payroll');

            if (!this.loaded) {
                await this.loadAll();
                if (this.activeTab === 'payslips') await this.loadMonth();
            } else {
                this.renderCurrentTab();
            }
        }

        createScreen() {
            const dashboardContent = document.querySelector('.dashboard-content');
            const screen = document.createElement('div');
            screen.id = 'payroll-screen';
            screen.className = 'dashboard-screen';
            screen.style.display = 'none';
            screen.innerHTML = `
                <div class="section-header">
                    <div>
                        <h1>Payroll</h1>
                        <p>Maintain employee salary details and generate monthly payslips.</p>
                    </div>
                </div>
                <div class="pr-tabs">
                    <button class="pr-tab active" data-tab="employees"><i class="fas fa-id-card"></i> Employees <span class="pr-count" id="pr-emp-count">0</span></button>
                    <button class="pr-tab" data-tab="payslips"><i class="fas fa-file-invoice"></i> Generate Payslips</button>
                </div>

                <div id="pr-tab-employees" class="section-panel">
                    <div class="pr-stats" id="pr-emp-stats">
                        <div class="pr-stat"><span>Active Employees</span><strong id="pr-emp-stat-active">0</strong></div>
                        <div class="pr-stat"><span>Inactive</span><strong id="pr-emp-stat-inactive">0</strong></div>
                        <div class="pr-stat"><span>PF Enrolled</span><strong id="pr-emp-stat-pf">0</strong></div>
                        <div class="pr-stat pr-stat-net"><span>Monthly Payroll (Gross)</span><strong id="pr-emp-stat-gross">₹0</strong></div>
                    </div>
                    <div class="pr-toolbar pr-toolbar-compact" id="pr-emp-toolbar">
                        <div class="pr-search pr-grow">
                            <i class="fas fa-search"></i>
                            <input type="text" id="pr-emp-search" placeholder="Search name, ID, designation, department, PAN" aria-label="Search employees">
                        </div>
                        <div class="pr-segment" id="pr-emp-status" role="group" aria-label="Status filter">
                            <button type="button" data-status="active" class="active">Active</button>
                            <button type="button" data-status="inactive">Inactive</button>
                            <button type="button" data-status="all">All</button>
                        </div>
                        <div class="pr-actions">
                            <button class="btn-secondary" data-action="bulk-add"><i class="fas fa-file-excel"></i> Bulk Add</button>
                            <button class="btn-primary" data-action="add-employee"><i class="fas fa-user-plus"></i> Add Employee</button>
                        </div>
                    </div>
                    <div id="pr-emp-loading" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading employees...</div>
                    <div id="pr-emp-empty" class="pr-empty" style="display:none;"></div>
                    <div class="table-container" id="pr-emp-table-wrap">
                        <table class="pr-table" id="pr-emp-table">
                            <thead>
                                <tr>
                                    <th>Emp ID</th><th>Name</th><th>Designation / Dept</th><th>Joined</th>
                                    <th>PAN</th><th>Bank</th><th class="pr-num">Monthly Gross</th><th>PF</th><th>Status</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="pr-emp-body"></tbody>
                        </table>
                    </div>
                </div>

                <div id="pr-tab-payslips" class="section-panel" style="display:none;">
                    <div class="pr-toolbar">
                        <div class="filter-group">
                            <label for="pr-month">Payslip Month</label>
                            <input type="month" id="pr-month">
                        </div>
                        <div class="filter-group">
                            <label for="pr-pay-date">Payment Date (all)</label>
                            <input type="date" id="pr-pay-date">
                        </div>
                        <div class="filter-group">
                            <label for="pr-pay-mode">Mode of Payment (all)</label>
                            <select id="pr-pay-mode"></select>
                        </div>
                        <div class="filter-group pr-grow">
                            <label for="pr-slip-search">Search</label>
                            <input type="text" id="pr-slip-search" placeholder="Filter employees">
                        </div>
                        <div class="pr-actions">
                            <button class="btn-secondary" data-action="settings" title="Establishment & PT registration numbers"><i class="fas fa-building"></i> Company Details</button>
                        </div>
                    </div>

                    <div class="pr-stats">
                        <div class="pr-stat"><span>Selected</span><strong id="pr-stat-count">0</strong></div>
                        <div class="pr-stat"><span>Gross Earnings</span><strong id="pr-stat-gross">₹0</strong></div>
                        <div class="pr-stat"><span>Deductions</span><strong id="pr-stat-ded">₹0</strong></div>
                        <div class="pr-stat pr-stat-net"><span>Net Payout</span><strong id="pr-stat-net">₹0</strong></div>
                    </div>

                    <div id="pr-slip-empty" class="pr-empty" style="display:none;"></div>
                    <div class="table-container" id="pr-slip-table-wrap">
                        <table class="pr-table" id="pr-slip-table">
                            <thead>
                                <tr>
                                    <th><input type="checkbox" id="pr-select-all" title="Select all"></th>
                                    <th>Employee</th>
                                    <th class="pr-num">Monthly Gross</th>
                                    <th class="pr-num">LOP Days</th>
                                    <th class="pr-num">Incentive</th>
                                    <th class="pr-num">Bonus / Arrears</th>
                                    <th class="pr-num">TDS</th>
                                    <th class="pr-num">Advance Rec.</th>
                                    <th class="pr-num">Net Pay</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="pr-slip-body"></tbody>
                        </table>
                    </div>
                    <p class="pr-hint"><i class="fas fa-info-circle"></i> Salary components are prorated by paid days. PT (Karnataka) and PF are calculated automatically; open <b>Review</b> on a row to override them, rename the custom earning/deduction rows or add other deductions. Press Enter to move down a column.</p>

                    <div class="pr-modal-footer">
                        <span class="pr-spacer"></span>
                        <select id="pr-output-mode" title="PDF output">
                            <option value="combined">One combined PDF</option>
                            <option value="separate">Separate PDF per employee</option>
                        </select>
                        <button class="btn-secondary" data-action="save-drafts"><i class="fas fa-save"></i> Save Changes</button>
                        <button class="btn-primary" data-action="generate" id="pr-generate-btn"><i class="fas fa-file-pdf"></i> Generate Payslips</button>
                    </div>
                </div>
            `;
            dashboardContent.appendChild(screen);

            screen.querySelector('#pr-pay-mode').innerHTML = T().PAYMENT_MODES
                .map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
            screen.querySelector('#pr-month').value = this.month;
            screen.querySelector('#pr-pay-date').value = todayIso();

            this.bindScreenEvents(screen);
        }

        bindScreenEvents(screen) {
            screen.querySelectorAll('.pr-tab').forEach(btn => {
                btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
            });

            screen.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const id = btn.dataset.id;
                switch (btn.dataset.action) {
                    case 'add-employee': this.openEmployeeModal(); break;
                    case 'bulk-add': this.openBulkModal(); break;
                    case 'edit-employee': this.openEmployeeModal(this.employees.find(x => x.id === id)); break;
                    case 'toggle-employee': this.toggleEmployeeActive(id); break;
                    case 'delete-employee': this.deleteEmployee(id); break;
                    case 'settings': this.openSettingsModal(); break;
                    case 'review': this.openReview(id); break;
                    case 'download-one': this.generate([id]); break;
                    case 'save-drafts': this.saveDrafts(); break;
                    case 'generate': this.generate([...this.selected]); break;
                    case 'goto-employees': this.switchTab('employees'); break;
                    case 'download-template': this.downloadBulkTemplate(); break;
                    case 'clear-filters':
                        screen.querySelector('#pr-emp-search').value = '';
                        screen.querySelector('#pr-emp-status [data-status="all"]').click();
                        break;
                }
            });

            const debouncedEmpRender = debounce(() => this.renderEmployees(), 150);
            screen.querySelector('#pr-emp-search').addEventListener('input', debouncedEmpRender);
            screen.querySelector('#pr-emp-status').addEventListener('click', (e) => {
                const btn = e.target.closest('[data-status]');
                if (!btn) return;
                this.empStatus = btn.dataset.status;
                screen.querySelectorAll('#pr-emp-status [data-status]').forEach(b => b.classList.toggle('active', b === btn));
                this.renderEmployees();
            });

            screen.querySelector('#pr-month').addEventListener('change', async (e) => {
                if (!e.target.value) return;
                if (this.hasDirty() && !confirm('You have unsaved payslip changes for this month. Switch month and discard them?')) {
                    e.target.value = this.month;
                    return;
                }
                this.month = e.target.value;
                await this.loadMonth();
            });

            screen.querySelector('#pr-pay-date').addEventListener('change', (e) => this.applyToAll('paymentDate', e.target.value));
            screen.querySelector('#pr-pay-mode').addEventListener('change', (e) => this.applyToAll('paymentMode', e.target.value));
            screen.querySelector('#pr-slip-search').addEventListener('input', debounce(() => this.renderSlips(), 150));

            screen.querySelector('#pr-select-all').addEventListener('change', (e) => {
                this.visibleSlipEmployees().forEach(emp => {
                    if (e.target.checked) this.selected.add(emp.id); else this.selected.delete(emp.id);
                });
                this.renderSlips();
            });

            const body = screen.querySelector('#pr-slip-body');
            body.addEventListener('change', (e) => {
                if (e.target.matches('.pr-row-check')) {
                    const id = e.target.dataset.id;
                    if (e.target.checked) this.selected.add(id); else this.selected.delete(id);
                    e.target.closest('tr').classList.toggle('pr-selected', e.target.checked);
                    this.updateStats();
                }
            });
            body.addEventListener('input', (e) => {
                if (!e.target.matches('.pr-cell')) return;
                const id = e.target.dataset.id;
                this.slips.get(id).inputs[e.target.dataset.field] = e.target.value;
                this.markDirty(id);
                this.refreshSlipRow(id);
            });
            body.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' || !e.target.matches('.pr-cell')) return;
                e.preventDefault();
                const cells = [...body.querySelectorAll(`.pr-cell[data-field="${e.target.dataset.field}"]`)];
                const next = cells[cells.indexOf(e.target) + (e.shiftKey ? -1 : 1)];
                if (next) { next.focus(); next.select(); }
            });

            window.addEventListener('beforeunload', (e) => {
                if (this.hasDirty()) { e.preventDefault(); e.returnValue = ''; }
            });
        }

        switchTab(tab) {
            this.activeTab = tab;
            document.querySelectorAll('#payroll-screen .pr-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
            document.getElementById('pr-tab-employees').style.display = tab === 'employees' ? '' : 'none';
            document.getElementById('pr-tab-payslips').style.display = tab === 'payslips' ? '' : 'none';
            if (tab === 'payslips') this.loadMonth(); else this.renderEmployees();
        }

        renderCurrentTab() {
            if (this.activeTab === 'payslips') this.renderSlips(); else this.renderEmployees();
        }

        // ---------------------------------------------------------------- data
        async loadAll() {
            try {
                const [empSnap, settingsDoc] = await Promise.all([
                    firestore.collection('payroll_employees').get(),
                    firestore.collection('payroll_settings').doc('company').get(),
                    this.loadLogo()
                ]);
                this.employees = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                this.settings = settingsDoc.exists ? settingsDoc.data() : {};
                if (this.settings.defaultPaymentMode) {
                    document.getElementById('pr-pay-mode').value = this.settings.defaultPaymentMode;
                }
                this.loaded = true;
                this.renderEmployees();
            } catch (error) {
                console.error('Error loading payroll data:', error);
                document.getElementById('pr-emp-loading').style.display = 'none';
                const empty = document.getElementById('pr-emp-empty');
                empty.innerHTML = `<i class="fas fa-exclamation-triangle"></i><h4>Could not load payroll data</h4><p>${esc(error.message)}</p>`;
                empty.style.display = 'block';
            }
        }

        async loadLogo() {
            if (this.logoDataUrl) return this.logoDataUrl;
            try {
                const blob = await (await fetch(T().COMPANY.logo)).blob();
                this.logoDataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.warn('Payslip logo could not be loaded:', error);
            }
            return this.logoDataUrl;
        }

        sortedEmployees(list) {
            return [...list].sort((a, b) =>
                (a.employeeId || '').localeCompare(b.employeeId || '', undefined, { numeric: true }) ||
                (a.name || '').localeCompare(b.name || ''));
        }

        nextEmployeeId(taken) {
            let max = 0;
            taken.forEach(id => {
                const m = String(id).match(/^AH-?(\d+)$/i);
                if (m) max = Math.max(max, Number(m[1]));
            });
            return `AH-${String(max + 1).padStart(3, '0')}`;
        }

        // ---------------------------------------------------------------- employees tab
        renderEmployees() {
            const body = document.getElementById('pr-emp-body');
            if (!body) return;
            document.getElementById('pr-emp-loading').style.display = this.loaded ? 'none' : 'block';
            const activeList = this.employees.filter(e => e.active !== false);
            document.getElementById('pr-emp-count').textContent = activeList.length;
            if (!this.loaded) return;

            const set = (id, v) => { document.getElementById(id).textContent = v; };
            set('pr-emp-stat-active', activeList.length);
            set('pr-emp-stat-inactive', this.employees.length - activeList.length);
            set('pr-emp-stat-pf', activeList.filter(e => e.pfApplicable).length);
            set('pr-emp-stat-gross', inr(activeList.reduce((sum, e) => sum + T().monthlyGross(e), 0)));

            // With no employees at all, filters are noise: show only the onboarding state.
            const hasAny = this.employees.length > 0;
            document.getElementById('pr-emp-stats').style.display = hasAny ? '' : 'none';
            document.getElementById('pr-emp-toolbar').style.display = hasAny ? '' : 'none';

            const term = document.getElementById('pr-emp-search').value.toLowerCase().trim();
            const status = this.empStatus;
            const list = this.sortedEmployees(this.employees).filter(emp => {
                const isActive = emp.active !== false;
                if (status === 'active' && !isActive) return false;
                if (status === 'inactive' && isActive) return false;
                if (!term) return true;
                return [emp.name, emp.employeeId, emp.designation, emp.department, emp.pan, emp.email]
                    .join(' ').toLowerCase().includes(term);
            });

            const empty = document.getElementById('pr-emp-empty');
            const tableWrap = document.getElementById('pr-emp-table-wrap');
            if (list.length === 0) {
                body.innerHTML = '';
                tableWrap.style.display = 'none';
                empty.innerHTML = hasAny
                    ? `<div class="pr-empty-icon"><i class="fas fa-search"></i></div>
                       <h4>No employees match your search</h4>
                       <p>Try a different name or ID, or show all employees.</p>
                       <button class="btn-secondary" data-action="clear-filters"><i class="fas fa-undo"></i> Clear filters</button>`
                    : `<div class="pr-empty-icon"><i class="fas fa-users"></i></div>
                       <h4>Add your team to start generating payslips</h4>
                       <p>Salary details are saved once and reused every month.</p>
                       <div class="pr-empty-options">
                         <button type="button" class="pr-option" data-action="add-employee">
                           <span class="pr-option-icon pr-blue"><i class="fas fa-user-plus"></i></span>
                           <span class="pr-option-text"><b>Add one employee</b><small>Fill in a short form</small></span>
                           <i class="fas fa-chevron-right pr-option-arrow"></i>
                         </button>
                         <button type="button" class="pr-option" data-action="bulk-add">
                           <span class="pr-option-icon pr-green"><i class="fas fa-file-excel"></i></span>
                           <span class="pr-option-text"><b>Add many at once</b><small>Upload Excel or paste rows</small></span>
                           <i class="fas fa-chevron-right pr-option-arrow"></i>
                         </button>
                       </div>
                       <button type="button" class="pr-link" data-action="download-template"><i class="fas fa-download"></i> Download the Excel template</button>`;
                empty.style.display = 'block';
                return;
            }
            empty.style.display = 'none';
            tableWrap.style.display = '';

            body.innerHTML = list.map(emp => {
                const isActive = emp.active !== false;
                const acct = emp.bankAccount ? `••${esc(String(emp.bankAccount).slice(-4))}` : '';
                return `
                <tr class="${isActive ? '' : 'pr-inactive'}">
                    <td><b>${esc(emp.employeeId)}</b></td>
                    <td><div class="pr-emp-name">${esc(emp.name)}</div><div class="pr-emp-meta">${esc(emp.email)}</div></td>
                    <td>${esc(emp.designation)}<div class="pr-emp-meta">${esc(emp.department)}</div></td>
                    <td>${esc(isoToDDMMYYYY(emp.dateOfJoining))}</td>
                    <td>${esc(emp.pan)}</td>
                    <td>${esc(emp.bankName)}<div class="pr-emp-meta">${acct}</div></td>
                    <td class="pr-num">${inr(T().monthlyGross(emp))}</td>
                    <td>${emp.pfApplicable ? 'Yes' : 'No'}</td>
                    <td><span class="status ${isActive ? 'status-active' : 'status-inactive'}">${isActive ? 'Active' : 'Inactive'}</span></td>
                    <td><div class="pr-actions-wrap">
                        <button class="btn-icon btn-edit" title="Edit" data-action="edit-employee" data-id="${emp.id}"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon btn-view" title="${isActive ? 'Deactivate' : 'Activate'}" data-action="toggle-employee" data-id="${emp.id}"><i class="fas ${isActive ? 'fa-user-slash' : 'fa-user-check'}"></i></button>
                        <button class="btn-icon btn-delete" title="Delete" data-action="delete-employee" data-id="${emp.id}"><i class="fas fa-trash-alt"></i></button>
                    </div></td>
                </tr>`;
            }).join('');
        }

        openEmployeeModal(emp = null) {
            const sections = [
                ['details', 'Employee Details'],
                ['bank', 'Bank & Statutory'],
                ['salary', 'Monthly Salary Structure (full month)']
            ];
            const fieldHtml = (f) => {
                const value = emp ? emp[f.key] : (f.key === 'employeeId'
                    ? this.nextEmployeeId(this.employees.map(e => e.employeeId)) : '');
                if (f.type === 'bool') {
                    return `<div class="form-group pr-check"><input type="checkbox" id="pr-f-${f.key}" ${value ? 'checked' : ''}><label for="pr-f-${f.key}" style="margin:0">${f.label}</label></div>`;
                }
                const type = f.type === 'number' ? 'number' : (f.type === 'date' ? 'date' : (f.type === 'email' ? 'email' : 'text'));
                return `<div class="form-group">
                    <label for="pr-f-${f.key}" class="${f.required ? 'required' : ''}">${f.label}</label>
                    <input type="${type}" id="pr-f-${f.key}" value="${esc(value ?? '')}" placeholder="${esc(f.placeholder || '')}" ${type === 'number' ? 'min="0" step="1"' : ''}>
                </div>`;
            };

            const modal = this.openModal('pr-employee-modal', emp ? 'Edit Employee' : 'Add Employee', `
                <form id="pr-employee-form" novalidate>
                    ${sections.map(([key, title]) => `
                        <div class="pr-form-section">
                            <h4>${title}</h4>
                            <div class="pr-form-grid">${EMPLOYEE_FIELDS.filter(f => f.section === key).map(fieldHtml).join('')}</div>
                        </div>`).join('')}
                    <div class="pr-gross-preview"><span>Monthly Gross</span><span id="pr-f-gross">₹0</span></div>
                    <div class="pr-modal-footer">
                        <button type="button" class="btn-secondary" data-close>Cancel</button>
                        <button type="submit" class="btn-primary"><i class="fas fa-save"></i> ${emp ? 'Save Changes' : 'Add Employee'}</button>
                    </div>
                </form>`);

            const readForm = () => {
                const raw = {};
                EMPLOYEE_FIELDS.forEach(f => {
                    const el = modal.querySelector(`#pr-f-${f.key}`);
                    raw[f.key] = f.type === 'bool' ? el.checked : el.value;
                });
                return raw;
            };
            const updateGross = () => {
                modal.querySelector('#pr-f-gross').textContent = inr(T().monthlyGross(normalizeEmployee(readForm()).data));
            };
            updateGross();
            modal.querySelector('form').addEventListener('input', updateGross);

            modal.querySelector('form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const { data, errors } = normalizeEmployee(readForm());
                const others = this.employees.filter(x => !emp || x.id !== emp.id);
                if (!data.employeeId) data.employeeId = this.nextEmployeeId(others.map(x => x.employeeId));
                if (others.some(x => (x.employeeId || '').toLowerCase() === data.employeeId.toLowerCase())) {
                    errors.employeeId = `Employee ID ${data.employeeId} already exists`;
                }

                modal.querySelectorAll('.form-group input').forEach(el => { el.style.borderColor = ''; el.title = ''; });
                const keys = Object.keys(errors);
                if (keys.length) {
                    keys.forEach(k => {
                        const el = modal.querySelector(`#pr-f-${k}`);
                        if (el) { el.style.borderColor = '#e74c3c'; el.title = errors[k]; }
                    });
                    modal.querySelector(`#pr-f-${keys[0]}`)?.focus();
                    this.toast(Object.values(errors).join(' · '), 'error');
                    return;
                }

                const submitBtn = modal.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                try {
                    const ts = firebase.firestore.FieldValue.serverTimestamp();
                    if (emp) {
                        await firestore.collection('payroll_employees').doc(emp.id).update({ ...data, updatedAt: ts });
                        Object.assign(emp, data);
                    } else {
                        const ref = await firestore.collection('payroll_employees').add({ ...data, active: true, createdAt: ts, updatedAt: ts });
                        this.employees.push({ id: ref.id, ...data, active: true });
                    }
                    this.closeModal(modal);
                    this.toast(`${data.name} ${emp ? 'updated' : 'added'}`, 'success');
                    this.renderEmployees();
                } catch (error) {
                    console.error('Error saving payroll employee:', error);
                    this.toast('Could not save employee: ' + error.message, 'error');
                    submitBtn.disabled = false;
                }
            });
        }

        async toggleEmployeeActive(id) {
            const emp = this.employees.find(x => x.id === id);
            if (!emp) return;
            const active = emp.active === false;
            try {
                await firestore.collection('payroll_employees').doc(id).update({
                    active,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                emp.active = active;
                this.toast(`${emp.name} ${active ? 'activated' : 'deactivated'}`, 'success');
                this.renderEmployees();
            } catch (error) {
                this.toast('Could not update employee: ' + error.message, 'error');
            }
        }

        async deleteEmployee(id) {
            const emp = this.employees.find(x => x.id === id);
            if (!emp) return;
            if (!confirm(`Delete ${emp.name} (${emp.employeeId}) permanently?\n\nPayslips already generated are kept. To stop generating payslips but keep the record, use Deactivate instead.`)) return;
            try {
                await firestore.collection('payroll_employees').doc(id).delete();
                this.employees = this.employees.filter(x => x.id !== id);
                this.selected.delete(id);
                this.toast(`${emp.name} deleted`, 'success');
                this.renderEmployees();
            } catch (error) {
                this.toast('Could not delete employee: ' + error.message, 'error');
            }
        }

        // ---------------------------------------------------------------- bulk add
        openBulkModal() {
            this.bulkRows = Array.from({ length: 5 }, () => ({}));
            const modal = this.openModal('pr-bulk-modal', 'Bulk Add Employees', `
                <div class="pr-bulk-steps">
                    <div class="pr-bulk-step">
                        <b>1. Get the template</b><br>Excel sheet with the right columns.
                        <br><button type="button" class="btn-secondary" id="pr-bulk-template"><i class="fas fa-download"></i> Download Template</button>
                    </div>
                    <div class="pr-bulk-step pr-dropzone" id="pr-bulk-drop">
                        <b>2. Upload the filled sheet</b><br>Drop an .xlsx / .csv here or
                        <br><button type="button" class="btn-success" id="pr-bulk-upload-btn"><i class="fas fa-file-upload"></i> Choose File</button>
                        <input type="file" id="pr-bulk-file" accept=".xlsx,.xls,.csv" hidden>
                    </div>
                    <div class="pr-bulk-step">
                        <b>Or paste from Excel</b><br>Copy rows in Excel / Google Sheets, click a cell below and press <b>Ctrl+V</b>. Leave Employee ID blank to auto-number.
                    </div>
                </div>
                <div class="pr-bulk-wrap"><table class="pr-bulk-table" id="pr-bulk-table"></table></div>
                <div class="pr-modal-footer">
                    <button type="button" class="btn-secondary" id="pr-bulk-add-rows"><i class="fas fa-plus"></i> Add 5 rows</button>
                    <span class="pr-bulk-summary" id="pr-bulk-summary"></span>
                    <span class="pr-spacer"></span>
                    <button type="button" class="btn-secondary" data-close>Cancel</button>
                    <button type="button" class="btn-primary" id="pr-bulk-save" disabled><i class="fas fa-save"></i> Save</button>
                </div>`, true);

            const table = modal.querySelector('#pr-bulk-table');
            const fileInput = modal.querySelector('#pr-bulk-file');
            const drop = modal.querySelector('#pr-bulk-drop');

            modal.querySelector('#pr-bulk-template').addEventListener('click', () => this.downloadBulkTemplate());
            modal.querySelector('#pr-bulk-upload-btn').addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', () => { if (fileInput.files[0]) this.importBulkFile(fileInput.files[0]); fileInput.value = ''; });
            ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('pr-drag'); }));
            ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('pr-drag'); }));
            drop.addEventListener('drop', (e) => { if (e.dataTransfer.files[0]) this.importBulkFile(e.dataTransfer.files[0]); });

            modal.querySelector('#pr-bulk-add-rows').addEventListener('click', () => {
                for (let i = 0; i < 5; i++) this.bulkRows.push({});
                this.renderBulkGrid();
            });
            modal.querySelector('#pr-bulk-save').addEventListener('click', () => this.saveBulk());

            const revalidate = debounce(() => this.validateBulk(), 200);
            table.addEventListener('input', (e) => {
                const { row, key } = e.target.dataset;
                if (row === undefined) return;
                this.bulkRows[row][key] = e.target.value;
                revalidate();
            });
            table.addEventListener('paste', (e) => this.handleBulkPaste(e));
            table.addEventListener('click', (e) => {
                const del = e.target.closest('.pr-row-del');
                if (!del) return;
                this.bulkRows.splice(Number(del.dataset.row), 1);
                if (this.bulkRows.length === 0) this.bulkRows.push({});
                this.renderBulkGrid();
            });

            this.renderBulkGrid();
        }

        renderBulkGrid() {
            const table = document.getElementById('pr-bulk-table');
            if (!table) return;
            const header = `<thead><tr><th>#</th>${EMPLOYEE_FIELDS.map(f =>
                `<th class="${f.required ? 'pr-req' : ''}">${f.label}${f.type === 'bool' ? ' (Yes/No)' : ''}</th>`).join('')}<th></th></tr></thead>`;
            const rows = this.bulkRows.map((r, i) => `
                <tr>
                    <td class="pr-rownum">${i + 1}</td>
                    ${EMPLOYEE_FIELDS.map(f => `<td data-cell="${i}-${f.key}"><input data-row="${i}" data-key="${f.key}" value="${esc(r[f.key] ?? '')}"
                        placeholder="${f.type === 'date' ? 'DD/MM/YYYY' : (f.type === 'bool' ? 'No' : (f.key === 'employeeId' ? 'Auto' : ''))}"
                        ${f.type === 'number' ? 'inputmode="decimal" style="width:95px;text-align:right"' : ''}></td>`).join('')}
                    <td><button type="button" class="pr-row-del" data-row="${i}" title="Remove row"><i class="fas fa-times"></i></button></td>
                </tr>`).join('');
            table.innerHTML = header + `<tbody>${rows}</tbody>`;
            this.validateBulk();
        }

        isBlankRow(r) {
            return EMPLOYEE_FIELDS.every(f => !String(r[f.key] ?? '').trim());
        }

        // Validates every non-blank row; returns the normalised rows ready to save.
        validateBulk() {
            const table = document.getElementById('pr-bulk-table');
            if (!table) return { valid: [], errorCount: 0 };

            const existingIds = new Set(this.employees.map(e => (e.employeeId || '').toLowerCase()));
            const takenIds = this.employees.map(e => e.employeeId);
            const batchIds = new Set();
            const valid = [];
            let errorRows = 0;

            table.querySelectorAll('td.pr-err').forEach(td => { td.classList.remove('pr-err'); td.title = ''; });

            this.bulkRows.forEach((r, i) => {
                if (this.isBlankRow(r)) return;
                const { data, errors } = normalizeEmployee(r);
                if (data.employeeId) {
                    const key = data.employeeId.toLowerCase();
                    if (existingIds.has(key)) errors.employeeId = 'ID already exists';
                    else if (batchIds.has(key)) errors.employeeId = 'Duplicate ID in this sheet';
                    batchIds.add(key);
                    takenIds.push(data.employeeId);
                }
                const keys = Object.keys(errors);
                keys.forEach(k => {
                    const td = table.querySelector(`td[data-cell="${i}-${k}"]`);
                    if (td) { td.classList.add('pr-err'); td.title = errors[k]; }
                });
                if (keys.length) errorRows++; else valid.push(data);
            });

            // Auto-number rows without an ID once everything else is known
            valid.forEach(d => {
                if (!d.employeeId) {
                    d.employeeId = this.nextEmployeeId(takenIds);
                    takenIds.push(d.employeeId);
                }
            });

            const summary = document.getElementById('pr-bulk-summary');
            const saveBtn = document.getElementById('pr-bulk-save');
            summary.innerHTML = `<span class="ok">${valid.length} ready</span>${errorRows ? ` · <span class="bad">${errorRows} row${errorRows > 1 ? 's' : ''} with errors (hover red cells)</span>` : ''}`;
            saveBtn.disabled = valid.length === 0 || errorRows > 0;
            saveBtn.innerHTML = `<i class="fas fa-save"></i> Save ${valid.length || ''} Employee${valid.length === 1 ? '' : 's'}`;
            return { valid, errorCount: errorRows };
        }

        handleBulkPaste(e) {
            const target = e.target.closest('input[data-row]');
            if (!target) return;
            const text = (e.clipboardData || window.clipboardData).getData('text');
            if (!/[\t\n]/.test(text.trim())) return; // single value: let the browser paste normally
            e.preventDefault();

            let lines = text.replace(/\r/g, '').split('\n');
            while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
            let grid = lines.map(l => l.split('\t'));

            const startCol = EMPLOYEE_FIELDS.findIndex(f => f.key === target.dataset.key);
            if (this.looksLikeHeader(grid[0])) {
                this.fillBulkFromSheet(grid);
                return;
            }

            const startRow = Number(target.dataset.row);
            grid.forEach((cells, ri) => {
                const rowIndex = startRow + ri;
                while (this.bulkRows.length <= rowIndex) this.bulkRows.push({});
                cells.forEach((val, ci) => {
                    const field = EMPLOYEE_FIELDS[startCol + ci];
                    if (field) this.bulkRows[rowIndex][field.key] = val.trim();
                });
            });
            this.renderBulkGrid();
            this.toast(`Pasted ${grid.length} row${grid.length > 1 ? 's' : ''}`, 'success');
        }

        normalizeHeader(h) {
            return String(h || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z]/g, '');
        }

        columnForHeader(h) {
            const n = this.normalizeHeader(h);
            if (!n) return null;
            return EMPLOYEE_FIELDS.find(f => this.normalizeHeader(f.label) === n || f.key.toLowerCase() === n
                || (n === 'name' && f.key === 'name') || (n === 'empid' && f.key === 'employeeId')
                || (n === 'doj' && f.key === 'dateOfJoining') || (n === 'pf' && f.key === 'pfApplicable')
                || (n === 'accountnumber' && f.key === 'bankAccount') || (n === 'bankacno' && f.key === 'bankAccount')) || null;
        }

        looksLikeHeader(cells) {
            return (cells || []).filter(c => this.columnForHeader(c)).length >= 2;
        }

        // grid[0] is a header row; maps columns by name so column order in the sheet doesn't matter.
        fillBulkFromSheet(grid) {
            const mapping = grid[0].map(h => this.columnForHeader(h));
            if (!mapping.some(Boolean)) {
                this.toast('Could not recognise the column headers. Please use the template.', 'error');
                return;
            }
            const rows = grid.slice(1).map(cells => {
                const r = {};
                mapping.forEach((f, i) => { if (f) r[f.key] = String(cells[i] ?? '').trim(); });
                return r;
            }).filter(r => !this.isBlankRow(r));

            this.bulkRows = this.bulkRows.filter(r => !this.isBlankRow(r)).concat(rows);
            if (this.bulkRows.length === 0) this.bulkRows.push({});
            this.renderBulkGrid();
            this.toast(`Loaded ${rows.length} employee${rows.length === 1 ? '' : 's'}. Review and save.`, 'success');
        }

        async importBulkFile(file) {
            if (typeof XLSX === 'undefined') {
                this.toast('Excel library not loaded', 'error');
                return;
            }
            try {
                const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'dd/mm/yyyy', defval: '' });
                // Formatted text turns long numbers (bank a/c, UAN) into 1.2E+11; take those from raw values.
                const rawGrid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
                rawGrid.forEach((cells, r) => cells.forEach((v, c) => {
                    if (typeof v === 'number' && Number.isInteger(v) && Math.abs(v) >= 1e6) grid[r][c] = String(v);
                }));
                if (grid.length < 2) {
                    this.toast('The sheet has no data rows', 'error');
                    return;
                }
                this.fillBulkFromSheet(grid);
            } catch (error) {
                console.error('Bulk import failed:', error);
                this.toast('Could not read the file: ' + error.message, 'error');
            }
        }

        downloadBulkTemplate() {
            const headers = EMPLOYEE_FIELDS.map(f => f.label + (f.type === 'bool' ? ' (Yes/No)' : ''));
            const ws = XLSX.utils.aoa_to_sheet([headers]);
            ws['!cols'] = headers.map(h => ({ wch: Math.max(14, h.length + 2) }));

            const notes = XLSX.utils.aoa_to_sheet([
                ['How to fill'],
                ['• One employee per row on the "Employees" sheet. Do not rename the header row.'],
                ['• Required: Employee Name, Basic Salary. Leave Employee ID blank to auto-number (AH-001, AH-002 ...).'],
                ['• Date of Joining: DD/MM/YYYY.  PAN: ABCDE1234F.  IFSC: 11 characters, e.g. UTIB0000094.'],
                ['• Salary amounts are the FULL-MONTH amounts; LOP is applied when generating payslips.'],
                ['• PF Applicable: Yes or No. When Yes, PF = 12% of Basic (capped at ₹15,000 basic).'],
                [],
                ['Example row'],
                headers,
                ['AH-001', 'Ravi Kumar', 'Health Navigator', 'Operations', '01/04/2025', 'ravi@assisthealth.in',
                    'ABCDE1234F', '123456789012', 'Axis Bank', 'UTIB0000094', '', 15000, 6000, 4000, 1600, 'No']
            ]);
            notes['!cols'] = [{ wch: 110 }];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Employees');
            XLSX.utils.book_append_sheet(wb, notes, 'Instructions');
            XLSX.writeFile(wb, 'AssistHealth_Employees_Template.xlsx');
        }

        async saveBulk() {
            const { valid, errorCount } = this.validateBulk();
            if (errorCount || valid.length === 0) return;

            const saveBtn = document.getElementById('pr-bulk-save');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                const ts = firebase.firestore.FieldValue.serverTimestamp();
                const added = [];
                for (let i = 0; i < valid.length; i += 400) {
                    const batch = firestore.batch();
                    valid.slice(i, i + 400).forEach(data => {
                        const ref = firestore.collection('payroll_employees').doc();
                        batch.set(ref, { ...data, active: true, createdAt: ts, updatedAt: ts });
                        added.push({ id: ref.id, ...data, active: true });
                    });
                    await batch.commit();
                }
                this.employees.push(...added);
                this.closeModal(document.getElementById('pr-bulk-modal'));
                this.toast(`${added.length} employee${added.length === 1 ? '' : 's'} added`, 'success');
                this.renderEmployees();
            } catch (error) {
                console.error('Bulk save failed:', error);
                this.toast('Could not save employees: ' + error.message, 'error');
                this.validateBulk();
            }
        }

        // ---------------------------------------------------------------- payslips tab
        monthEndIso() {
            const [y, m] = this.month.split('-').map(Number);
            return `${this.month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
        }

        async loadMonth() {
            const body = document.getElementById('pr-slip-body');
            if (!body) return;
            document.getElementById('pr-slip-empty').style.display = 'none';
            body.innerHTML = `<tr><td colspan="11" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading ${esc(T().monthLabel(this.month))}...</td></tr>`;
            if (!this.loaded) await this.loadAll();

            try {
                const snap = await firestore.collection('payslips').where('month', '==', this.month).get();
                const saved = new Map(snap.docs.map(d => [d.data().employeeDocId, d.data()]));
                const monthEnd = this.monthEndIso();
                const payDate = document.getElementById('pr-pay-date').value;
                const payMode = document.getElementById('pr-pay-mode').value;

                this.slips = new Map();
                this.selected = new Set();
                this.employees.forEach(emp => {
                    const existing = saved.get(emp.id);
                    const eligible = emp.active !== false && (!emp.dateOfJoining || emp.dateOfJoining <= monthEnd);
                    if (!existing && !eligible) return;

                    const inputs = existing
                        ? { ...T().defaultInputs(), ...existing.inputs }
                        : {
                            ...T().defaultInputs(),
                            lopDays: T().joiningLopDays(emp, this.month),
                            paymentDate: payDate,
                            paymentMode: payMode
                        };
                    this.slips.set(emp.id, { inputs, status: existing ? existing.status : 'new', dirty: false });
                    this.selected.add(emp.id);
                });
                this.renderSlips();
            } catch (error) {
                console.error('Error loading payslips:', error);
                body.innerHTML = `<tr><td colspan="11" class="empty-state"><i class="fas fa-exclamation-triangle"></i> Could not load payslips: ${esc(error.message)}</td></tr>`;
            }
        }

        slipEmployees() {
            return this.sortedEmployees(this.employees.filter(e => this.slips.has(e.id)));
        }

        visibleSlipEmployees() {
            const term = (document.getElementById('pr-slip-search')?.value || '').toLowerCase().trim();
            return this.slipEmployees().filter(emp => !term ||
                [emp.name, emp.employeeId, emp.designation, emp.department].join(' ').toLowerCase().includes(term));
        }

        statusBadge(slip) {
            if (slip.dirty) return '<span class="pr-badge pr-badge-dirty">Unsaved</span>';
            if (slip.status === 'generated') return '<span class="pr-badge pr-badge-generated"><i class="fas fa-check"></i> Generated</span>';
            if (slip.status === 'draft') return '<span class="pr-badge pr-badge-draft">Draft</span>';
            return '<span class="pr-badge pr-badge-new">Not generated</span>';
        }

        renderSlips() {
            const body = document.getElementById('pr-slip-body');
            if (!body) return;
            const list = this.visibleSlipEmployees();
            const empty = document.getElementById('pr-slip-empty');

            const tableWrap = document.getElementById('pr-slip-table-wrap');
            if (this.slips.size === 0) {
                body.innerHTML = '';
                tableWrap.style.display = 'none';
                empty.innerHTML = `<div class="pr-empty-icon"><i class="fas fa-file-invoice"></i></div>
                    <h4>No active employees for ${esc(T().monthLabel(this.month))}</h4>
                    <p>Add employees first, then come back here to generate their payslips.</p>
                    <button class="btn-primary" data-action="goto-employees"><i class="fas fa-users"></i> Go to Employees</button>`;
                empty.style.display = 'block';
                this.updateStats();
                return;
            }
            empty.style.display = 'none';
            tableWrap.style.display = '';

            const cell = (id, field, value, small) =>
                `<input class="pr-cell${small ? ' pr-small' : ''}" type="number" min="0" step="${small ? '0.5' : '1'}" inputmode="decimal"
                    data-id="${id}" data-field="${field}" value="${esc(value || '')}" placeholder="0">`;

            body.innerHTML = list.map(emp => {
                const slip = this.slips.get(emp.id);
                const c = T().compute(emp, slip.inputs, this.month);
                const checked = this.selected.has(emp.id);
                return `
                <tr data-id="${emp.id}" class="${checked ? 'pr-selected' : ''}">
                    <td><input type="checkbox" class="pr-row-check" data-id="${emp.id}" ${checked ? 'checked' : ''}></td>
                    <td class="pr-emp-cell"><div class="pr-emp-name">${esc(emp.name)}</div><div class="pr-emp-meta">${esc(emp.employeeId)} · ${esc(emp.designation || '—')}</div></td>
                    <td class="pr-num">${inr(T().monthlyGross(emp))}</td>
                    <td class="pr-num">${cell(emp.id, 'lopDays', slip.inputs.lopDays, true)}</td>
                    <td class="pr-num">${cell(emp.id, 'incentive', slip.inputs.incentive)}</td>
                    <td class="pr-num">${cell(emp.id, 'bonus', slip.inputs.bonus)}</td>
                    <td class="pr-num">${cell(emp.id, 'tds', slip.inputs.tds)}</td>
                    <td class="pr-num">${cell(emp.id, 'advance', slip.inputs.advance)}</td>
                    <td class="pr-num pr-net" data-net>${inr(c.net)}</td>
                    <td data-status>${this.statusBadge(slip)}</td>
                    <td><div class="pr-actions-wrap">
                        <button class="btn-icon btn-view" title="Review & preview" data-action="review" data-id="${emp.id}"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon btn-download" title="Download PDF" data-action="download-one" data-id="${emp.id}"><i class="fas fa-file-pdf"></i></button>
                    </div></td>
                </tr>`;
            }).join('');

            const selectAll = document.getElementById('pr-select-all');
            selectAll.checked = list.length > 0 && list.every(e => this.selected.has(e.id));
            selectAll.indeterminate = !selectAll.checked && list.some(e => this.selected.has(e.id));
            this.updateStats();
        }

        refreshSlipRow(id) {
            const row = document.querySelector(`#pr-slip-body tr[data-id="${id}"]`);
            const emp = this.employees.find(e => e.id === id);
            if (!row || !emp) return;
            const slip = this.slips.get(id);
            row.querySelector('[data-net]').textContent = inr(T().compute(emp, slip.inputs, this.month).net);
            row.querySelector('[data-status]').innerHTML = this.statusBadge(slip);
            this.updateStats();
        }

        updateStats() {
            let gross = 0, ded = 0, net = 0;
            this.selected.forEach(id => {
                const emp = this.employees.find(e => e.id === id);
                const slip = this.slips.get(id);
                if (!emp || !slip) return;
                const c = T().compute(emp, slip.inputs, this.month);
                gross += c.gross; ded += c.totalDeductions; net += c.net;
            });
            const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
            set('pr-stat-count', `${this.selected.size} / ${this.slips.size}`);
            set('pr-stat-gross', inr(gross));
            set('pr-stat-ded', inr(ded));
            set('pr-stat-net', inr(net));
            const btn = document.getElementById('pr-generate-btn');
            if (btn) {
                btn.innerHTML = `<i class="fas fa-file-pdf"></i> Generate ${this.selected.size || ''} Payslip${this.selected.size === 1 ? '' : 's'}`;
                btn.disabled = this.selected.size === 0;
            }
        }

        markDirty(id) {
            const slip = this.slips.get(id);
            if (slip) slip.dirty = true;
        }

        hasDirty() {
            return [...this.slips.values()].some(s => s.dirty);
        }

        applyToAll(field, value) {
            this.slips.forEach((slip, id) => {
                slip.inputs[field] = value;
                slip.dirty = true;
            });
            this.renderSlips();
        }

        // Persists payslip docs (id = <employeeDocId>_<YYYY-MM>, so regenerating overwrites).
        async persistSlips(ids, status) {
            const user = window.authService?.getCurrentUser();
            const ts = firebase.firestore.FieldValue.serverTimestamp();
            for (let i = 0; i < ids.length; i += 400) {
                const batch = firestore.batch();
                ids.slice(i, i + 400).forEach(id => {
                    const emp = this.employees.find(e => e.id === id);
                    const slip = this.slips.get(id);
                    const c = T().compute(emp, slip.inputs, this.month);
                    const snapshot = {};
                    EMPLOYEE_FIELDS.forEach(f => { snapshot[f.key] = emp[f.key] ?? ''; });
                    const nextStatus = status === 'generated' || slip.status === 'generated' ? 'generated' : 'draft';
                    batch.set(firestore.collection('payslips').doc(`${id}_${this.month}`), {
                        employeeDocId: id,
                        month: this.month,
                        employee: snapshot,
                        inputs: slip.inputs,
                        totals: { gross: c.gross, totalDeductions: c.totalDeductions, net: c.net, paidDays: c.paidDays },
                        status: nextStatus,
                        updatedAt: ts,
                        updatedBy: user ? user.uid : null,
                        ...(status === 'generated' ? { generatedAt: ts } : {})
                    });
                    slip.status = nextStatus;
                    slip.dirty = false;
                });
                await batch.commit();
            }
        }

        async saveDrafts() {
            const ids = [...this.slips.entries()].filter(([, s]) => s.dirty).map(([id]) => id);
            if (ids.length === 0) {
                this.toast('No unsaved changes');
                return;
            }
            try {
                await this.persistSlips(ids, 'draft');
                this.renderSlips();
                this.toast(`Saved ${ids.length} payslip${ids.length === 1 ? '' : 's'}`, 'success');
            } catch (error) {
                this.toast('Could not save: ' + error.message, 'error');
            }
        }

        async generate(ids) {
            ids = this.sortedEmployees(this.employees.filter(e => ids.includes(e.id) && this.slips.has(e.id))).map(e => e.id);
            if (ids.length === 0) {
                this.toast('Select at least one employee', 'error');
                return;
            }
            const negative = ids.filter(id => {
                const emp = this.employees.find(e => e.id === id);
                return T().compute(emp, this.slips.get(id).inputs, this.month).net < 0;
            });
            if (negative.length && !confirm(`${negative.length} payslip(s) have a negative net pay. Generate anyway?`)) return;

            const separate = ids.length > 1 && document.getElementById('pr-output-mode')?.value === 'separate';
            const busy = this.showBusy(`Generating ${ids.length} payslip${ids.length === 1 ? '' : 's'}...`);
            try {
                await this.persistSlips(ids, 'generated');
                const monthName = T().monthLabel(this.month).replace(' ', '_');

                if (ids.length === 1 || separate) {
                    for (let i = 0; i < ids.length; i++) {
                        const emp = this.employees.find(e => e.id === ids[i]);
                        busy.update(`Generating ${i + 1} of ${ids.length}: ${emp.name}`);
                        await this.renderPdf([ids[i]], `Payslip_${this.safeName(emp.employeeId || emp.name)}_${monthName}.pdf`);
                    }
                } else {
                    await this.renderPdf(ids, `Payslips_${monthName}.pdf`, (n) => busy.update(`Rendering payslip ${n} of ${ids.length}...`));
                }
                this.toast(`${ids.length} payslip${ids.length === 1 ? '' : 's'} generated`, 'success');
            } catch (error) {
                console.error('Payslip generation failed:', error);
                this.toast('Payslip generation failed: ' + error.message, 'error');
            } finally {
                busy.close();
                this.renderSlips();
            }
        }

        safeName(s) {
            return String(s).replace(/[^a-z0-9_-]+/gi, '_');
        }

        renderPage(id) {
            return T().render({
                employee: this.employees.find(e => e.id === id),
                inputs: this.slips.get(id).inputs,
                month: this.month,
                settings: this.settings,
                logoSrc: this.logoDataUrl
            });
        }

        // html2pdf's bundle doesn't expose html2canvas/jsPDF, and we need direct control of both.
        async loadPdfLibs() {
            const load = (src) => new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = () => reject(new Error('Could not load PDF library. Check your internet connection.'));
                document.head.appendChild(script);
            });
            if (!window.html2canvas) await load('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            if (!window.jspdf) await load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }

        /**
         * One canvas per payslip, placed on its own A4 page. Output is independent of the viewer's laptop:
         * layout is done at a fixed desktop width (no responsive CSS kicks in), scroll is reset before
         * capture, and each image is scaled to fit a single page so it can never spill onto a second one.
         */
        async renderPdf(ids, filename, onProgress) {
            await this.loadPdfLibs();
            if (document.fonts && document.fonts.ready) await document.fonts.ready;

            const stage = document.createElement('div');
            stage.className = 'pr-pdf-stage';
            stage.innerHTML = ids.map(id => this.renderPage(id)).join('');
            document.body.appendChild(stage);

            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            window.scrollTo(0, 0);

            try {
                await Promise.all([...stage.querySelectorAll('img')].map(img => img.decode().catch(() => null)));
                const pages = [...stage.querySelectorAll('.ps-page')];
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
                const PAGE_W = 210;
                const PAGE_H = 297;

                for (let i = 0; i < pages.length; i++) {
                    if (onProgress) onProgress(i + 1);
                    const canvas = await window.html2canvas(pages[i], {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff',
                        windowWidth: 1280,
                        windowHeight: 1800,
                        scrollX: 0,
                        scrollY: 0
                    });

                    const ratio = canvas.height / canvas.width;
                    let w = PAGE_W;
                    let h = PAGE_W * ratio;
                    if (h > PAGE_H) {
                        h = PAGE_H;
                        w = PAGE_H / ratio;
                    }
                    if (i > 0) pdf.addPage();
                    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (PAGE_W - w) / 2, 0, w, h);
                }
                pdf.save(filename);
            } finally {
                stage.remove();
                window.scrollTo(scrollX, scrollY);
            }
        }

        // ---------------------------------------------------------------- review modal (form + live preview)
        openReview(id) {
            const order = this.visibleSlipEmployees().map(e => e.id);
            this.review = { id, order };

            const modal = this.openModal('pr-review-modal', 'Review Payslip', `
                <div class="pr-review">
                    <form class="pr-review-form" id="pr-review-form" autocomplete="off"></form>
                    <div class="pr-review-preview" id="pr-review-preview"></div>
                </div>
                <div class="pr-modal-footer">
                    <button type="button" class="btn-secondary" id="pr-review-prev"><i class="fas fa-chevron-left"></i> Prev</button>
                    <span class="pr-review-nav" id="pr-review-pos"></span>
                    <button type="button" class="btn-secondary" id="pr-review-next">Next <i class="fas fa-chevron-right"></i></button>
                    <span class="pr-spacer"></span>
                    <button type="button" class="btn-success" id="pr-review-download"><i class="fas fa-file-pdf"></i> Download PDF</button>
                    <button type="button" class="btn-primary" data-close>Done</button>
                </div>`, true, () => {
                this.review = null;
                this.renderSlips();
            });

            const step = (delta) => {
                const { order } = this.review;
                const next = order[order.indexOf(this.review.id) + delta];
                if (next) { this.review.id = next; this.renderReview(); }
            };
            modal.querySelector('#pr-review-prev').addEventListener('click', () => step(-1));
            modal.querySelector('#pr-review-next').addEventListener('click', () => step(1));
            modal.querySelector('#pr-review-download').addEventListener('click', () => this.generate([this.review.id]));

            const form = modal.querySelector('#pr-review-form');
            form.addEventListener('input', (e) => {
                const field = e.target.dataset.field;
                if (!field) return;
                this.slips.get(this.review.id).inputs[field] = e.target.value;
                this.markDirty(this.review.id);
                this.renderReviewPreview();
                this.updateReviewPlaceholders();
            });
            form.addEventListener('submit', (e) => e.preventDefault());

            window.addEventListener('resize', this._reviewResize = debounce(() => this.scaleReviewPreview(), 100));
            this.renderReview();
        }

        renderReview() {
            const { id, order } = this.review;
            const emp = this.employees.find(e => e.id === id);
            const inputs = this.slips.get(id).inputs;
            const form = document.getElementById('pr-review-form');

            const field = (key, label, type = 'number', extra = '') => `
                <div class="form-group">
                    <label for="pr-r-${key}">${label}</label>
                    <input id="pr-r-${key}" type="${type}" data-field="${key}" value="${esc(inputs[key] ?? '')}" ${type === 'number' ? 'min="0" step="1"' : ''} ${extra}>
                </div>`;

            form.innerHTML = `
                <div class="pr-form-section">
                    <h4>${esc(emp.name)} · ${esc(emp.employeeId)}</h4>
                    <div class="pr-form-grid pr-cols-2">
                        ${field('lopDays', 'LOP Days', 'number', 'step="0.5"')}
                        ${field('leaveBalance', 'Leave Balance', 'text', 'placeholder="Optional"')}
                    </div>
                </div>
                <div class="pr-form-section">
                    <h4>Earnings</h4>
                    <div class="pr-form-grid pr-cols-2">
                        ${field('conveyanceLabel', 'Allowance row label', 'text')}
                        <div class="form-group"><label>Amount (from salary)</label><input type="text" readonly value="${esc(inr(emp.conveyance))} / month"></div>
                        ${field('incentiveLabel', 'Incentive row label', 'text')}
                        ${field('incentive', 'Incentive amount')}
                        ${field('bonus', 'Arrears / Bonus')}
                    </div>
                </div>
                <div class="pr-form-section">
                    <h4>Deductions</h4>
                    <div class="pr-form-grid pr-cols-2">
                        ${field('tds', 'TDS (Income Tax)')}
                        ${field('advance', 'Salary Advance Recovery')}
                        ${field('ptOverride', 'Professional Tax')}
                        ${field('pfOverride', 'PF - Employee share')}
                        ${field('otherDed1Label', 'Other deduction 1 label', 'text')}
                        ${field('otherDed1', 'Other deduction 1')}
                        ${field('otherDed2Label', 'Other deduction 2 label', 'text')}
                        ${field('otherDed2', 'Other deduction 2')}
                        ${field('employerPfOverride', 'Employer PF (info only)')}
                    </div>
                </div>
                <div class="pr-form-section">
                    <h4>Payment</h4>
                    <div class="pr-form-grid pr-cols-2">
                        <div class="form-group">
                            <label for="pr-r-paymentMode">Mode of Payment</label>
                            <select id="pr-r-paymentMode" data-field="paymentMode">
                                ${T().PAYMENT_MODES.map(m => `<option ${m === inputs.paymentMode ? 'selected' : ''}>${esc(m)}</option>`).join('')}
                            </select>
                        </div>
                        ${field('paymentDate', 'Payment Date', 'date')}
                    </div>
                </div>`;

            const pos = order.indexOf(id);
            document.getElementById('pr-review-pos').textContent = `${pos + 1} of ${order.length}`;
            document.getElementById('pr-review-prev').disabled = pos <= 0;
            document.getElementById('pr-review-next').disabled = pos >= order.length - 1;

            this.updateReviewPlaceholders();
            this.renderReviewPreview();
        }

        // Override fields stay blank (auto) and show the calculated value as placeholder.
        updateReviewPlaceholders() {
            const emp = this.employees.find(e => e.id === this.review.id);
            const c = T().compute(emp, this.slips.get(this.review.id).inputs, this.month);
            const set = (key, v) => { const el = document.getElementById(`pr-r-${key}`); if (el) el.placeholder = `Auto: ${v}`; };
            set('ptOverride', c.autoPt);
            set('pfOverride', c.autoPf);
            set('employerPfOverride', c.autoPf);
        }

        renderReviewPreview() {
            const preview = document.getElementById('pr-review-preview');
            if (!preview || !this.review) return;
            preview.innerHTML = `<div class="pr-preview-box"><div class="pr-preview-scale">${this.renderPage(this.review.id)}</div></div>`;
            this.scaleReviewPreview();
            // The modal may still be hidden on first open; measure again once it is laid out.
            requestAnimationFrame(() => requestAnimationFrame(() => this.scaleReviewPreview()));
        }

        scaleReviewPreview() {
            const preview = document.getElementById('pr-review-preview');
            const scaleEl = preview?.querySelector('.pr-preview-scale');
            if (!scaleEl) return;
            const page = scaleEl.firstElementChild;
            if (!page.offsetWidth || !preview.clientWidth) return;
            const scale = Math.min(1, (preview.clientWidth - 24) / page.offsetWidth);
            scaleEl.style.transform = `scale(${scale})`;
            scaleEl.parentElement.style.height = `${page.offsetHeight * scale}px`;
            scaleEl.parentElement.style.width = `${page.offsetWidth * scale}px`;
        }

        // ---------------------------------------------------------------- settings
        openSettingsModal() {
            const s = this.settings;
            const modal = this.openModal('pr-settings-modal', 'Company Details for Payslips', `
                <form id="pr-settings-form">
                    <div class="pr-form-grid pr-cols-2">
                        <div class="form-group"><label for="pr-s-est">Establishment Reg. No. (Karnataka S&amp;E Act)</label><input id="pr-s-est" value="${esc(s.establishmentRegNo || '')}"></div>
                        <div class="form-group"><label for="pr-s-pt">PT Registration No.</label><input id="pr-s-pt" value="${esc(s.ptRegNo || '')}"></div>
                        <div class="form-group"><label for="pr-s-mode">Default Mode of Payment</label>
                            <select id="pr-s-mode">${T().PAYMENT_MODES.map(m => `<option ${m === s.defaultPaymentMode ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
                        </div>
                    </div>
                    <div class="pr-modal-footer">
                        <button type="button" class="btn-secondary" data-close>Cancel</button>
                        <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Save</button>
                    </div>
                </form>`);

            modal.querySelector('form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = {
                    establishmentRegNo: modal.querySelector('#pr-s-est').value.trim(),
                    ptRegNo: modal.querySelector('#pr-s-pt').value.trim(),
                    defaultPaymentMode: modal.querySelector('#pr-s-mode').value
                };
                try {
                    await firestore.collection('payroll_settings').doc('company').set({
                        ...data,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    this.settings = { ...this.settings, ...data };
                    this.closeModal(modal);
                    this.toast('Company details saved', 'success');
                } catch (error) {
                    this.toast('Could not save: ' + error.message, 'error');
                }
            });
        }

        // ---------------------------------------------------------------- ui helpers
        openModal(id, title, bodyHtml, wide = false, onClose = null) {
            document.getElementById(id)?.remove();
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${id}" class="modal pr-modal${wide ? ' pr-wide' : ''}">
                    <div class="modal-content">
                        <div class="modal-header"><h3>${title}</h3><span class="close" data-close>&times;</span></div>
                        <div class="modal-body">${bodyHtml}</div>
                    </div>
                </div>`);
            const modal = document.getElementById(id);
            modal._onClose = onClose;
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.closest('[data-close]')) this.closeModal(modal);
            });
            modal._onKey = (e) => { if (e.key === 'Escape') this.closeModal(modal); };
            document.addEventListener('keydown', modal._onKey);
            requestAnimationFrame(() => modal.classList.add('show'));
            return modal;
        }

        closeModal(modal) {
            if (!modal) return;
            document.removeEventListener('keydown', modal._onKey);
            if (modal.id === 'pr-review-modal' && this._reviewResize) {
                window.removeEventListener('resize', this._reviewResize);
            }
            modal.classList.remove('show');
            if (modal._onClose) modal._onClose();
            setTimeout(() => modal.remove(), 300);
        }

        toast(message, type = '') {
            const el = document.createElement('div');
            el.className = `pr-toast ${type}`;
            el.textContent = message;
            document.body.appendChild(el);
            requestAnimationFrame(() => el.classList.add('show'));
            setTimeout(() => {
                el.classList.remove('show');
                setTimeout(() => el.remove(), 300);
            }, type === 'error' ? 5000 : 2500);
        }

        showBusy(message) {
            const el = document.createElement('div');
            el.className = 'pr-busy';
            el.innerHTML = `<i class="fas fa-spinner fa-spin"></i><div></div>`;
            el.lastChild.textContent = message;
            document.body.appendChild(el);
            return {
                update: (m) => { el.lastChild.textContent = m; },
                close: () => el.remove()
            };
        }
    }

    window.payrollManager = new PayrollManager();
})();
