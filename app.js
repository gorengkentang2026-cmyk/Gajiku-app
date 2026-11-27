/**
 * GajiKu - Aplikasi Pendataan Gaji & Overtime (Lembur)
 * Fitur: Multi-User, Jam Kerja/Lembur Fleksibel, Riwayat Gaji Perbulan, Ekspor Excel & PDF
 */

const STORAGE_KEYS = {
  DATA: 'gajiku_multiusers_v4'
};

const DEFAULT_EMPLOYEE = {
  id: 'emp_1',
  name: 'Mr. Steven',
  position: 'Supervisor / Staff',
  company: 'PT. Maju Mandiri',
  baseSalary: 5000000,
  rateMethod: 'depnaker', // 'depnaker' or 'manual'
  manualRate: 35000,
  cutoffMode: 'calendar', // 'calendar' or 'custom'
  cutoffCloseDay: 25, // default closing date for custom cut-off (e.g. 25th)
  allowances: [], // Bersih tanpa default dummy (input manual bebas)
  deductions: [] // Bersih tanpa default dummy (input manual bebas)
};

// Application State
class AppState {
  constructor() {
    this.employees = [];
    this.activeEmployeeId = 'emp_1';
    this.entries = [];
    this.currentMonth = this.getInitialMonth();
    this.activeTab = 'dashboard';

    this.loadAllData();
  }

  getInitialMonth() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  loadAllData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DATA);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.employees = parsed.employees && parsed.employees.length > 0 ? parsed.employees : [{ ...DEFAULT_EMPLOYEE }];
        this.activeEmployeeId = parsed.activeEmployeeId || this.employees[0].id;
        
        // Bersihkan data dummy sample dari versi lama agar pengguna leluasa input bulan sendiri
        const rawEntries = parsed.entries || [];
        this.entries = rawEntries.filter(e => !String(e.id).startsWith('sample_'));
      } else {
        // Pengguna baru pertama kali buka aplikasi
        this.employees = [{ ...DEFAULT_EMPLOYEE }];
        this.activeEmployeeId = 'emp_1';
        this.entries = [];
      }
    } catch (e) {
      console.error('Error loading data:', e);
      this.employees = [{ ...DEFAULT_EMPLOYEE }];
      this.activeEmployeeId = 'emp_1';
      this.entries = [];
    }

    // Pastikan karyawan aktif ada
    if (!this.getActiveEmployee()) {
      this.activeEmployeeId = this.employees[0]?.id || 'emp_1';
    }

    // Bersihkan sample entries dan reset default tunjangan/potongan lama agar kosong & bersih
    try {
      const isCleaned = localStorage.getItem('gajiku_clean_defaults_v2');
      if (!isCleaned) {
        this.entries = (this.entries || []).filter(e => !String(e.id).startsWith('sample_'));
        this.employees.forEach(emp => {
          if (emp.allowances && emp.allowances.length === 2 && emp.allowances[0].name === 'Uang Makan & Transport' && emp.allowances[0].amount === 500000) {
            emp.allowances = [];
          }
          if (emp.deductions && emp.deductions.length === 2 && emp.deductions[0].name === 'BPJS Ketenagakerjaan (2%)' && emp.deductions[0].amount === 100000) {
            emp.deductions = [];
          }
        });
        localStorage.setItem('gajiku_clean_defaults_v2', 'true');
        this.saveAllData();
      }
    } catch (e) {}
  }

  migrateFromOldStorage() {
    try {
      const oldSettingsRaw = localStorage.getItem('gajiku_settings_v3') || localStorage.getItem('gajiku_settings_v1');
      const oldEntriesRaw = localStorage.getItem('gajiku_entries_v3') || localStorage.getItem('gajiku_entries_v1');

      let emp = { ...DEFAULT_EMPLOYEE };
      if (oldSettingsRaw) {
        const oldSettings = JSON.parse(oldSettingsRaw);
        emp = {
          ...DEFAULT_EMPLOYEE,
          name: oldSettings.employeeName && !/roli/i.test(oldSettings.employeeName) ? oldSettings.employeeName : 'Mr. Steven',
          company: oldSettings.company || 'PT. Maju Mandiri',
          baseSalary: Number(oldSettings.baseSalary) || 5000000,
          rateMethod: oldSettings.rateMethod || 'depnaker',
          manualRate: Number(oldSettings.manualRate) || 35000,
          allowances: [],
          deductions: []
        };
      }

      this.employees = [emp];
      this.activeEmployeeId = emp.id;

      if (oldEntriesRaw) {
        const oldEntries = JSON.parse(oldEntriesRaw);
        this.entries = oldEntries
          .filter(e => !String(e.id).startsWith('sample_'))
          .map(e => ({
            ...e,
            employeeId: emp.id,
            inputMode: e.inputMode || 'overtime_only'
          }));
      } else {
        this.entries = [];
      }

      this.saveAllData();
    } catch (err) {
      this.employees = [{ ...DEFAULT_EMPLOYEE }];
      this.activeEmployeeId = 'emp_1';
      this.entries = [];
      this.saveAllData();
    }
  }

  saveAllData() {
    const payload = {
      employees: this.employees,
      activeEmployeeId: this.activeEmployeeId,
      entries: this.entries
    };
    localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(payload));
  }

  getActiveEmployee() {
    return this.employees.find(e => e.id === this.activeEmployeeId) || this.employees[0];
  }

  getEmployeeById(id) {
    return this.employees.find(e => e.id === id) || this.getActiveEmployee();
  }

  // Base hourly rate calculation for given employee
  getBaseHourlyRate(emp) {
    const targetEmp = emp || this.getActiveEmployee();
    if (!targetEmp) return 0;
    if (targetEmp.rateMethod === 'manual') {
      return Number(targetEmp.manualRate) || 0;
    }
    const base = Number(targetEmp.baseSalary) || 0;
    return Math.round(base / 173);
  }

  // Overtime pay calculation according to Depnaker rules
  calculateOvertimePay(hours, dayType, emp) {
    const baseRate = this.getBaseHourlyRate(emp);
    let totalPay = 0;
    let multiplierText = '';

    if (hours <= 0) {
      return { baseRate, multiplierText: '-', totalPay: 0 };
    }

    if (dayType === 'workday') {
      if (hours <= 1) {
        totalPay = hours * 1.5 * baseRate;
        multiplierText = '1.5x';
      } else {
        const firstHour = 1 * 1.5 * baseRate;
        const remainingHours = (hours - 1) * 2.0 * baseRate;
        totalPay = firstHour + remainingHours;
        multiplierText = '1.5x + 2.0x';
      }
    } else {
      if (hours <= 8) {
        totalPay = hours * 2.0 * baseRate;
        multiplierText = '2.0x';
      } else if (hours <= 9) {
        totalPay = (8 * 2.0 * baseRate) + ((hours - 8) * 3.0 * baseRate);
        multiplierText = '2.0x + 3.0x';
      } else {
        totalPay = (8 * 2.0 * baseRate) + (1 * 3.0 * baseRate) + ((hours - 9) * 4.0 * baseRate);
        multiplierText = '2.0x + 3.0x + 4.0x';
      }
    }

    return {
      baseRate,
      multiplierText,
      totalPay: Math.round(totalPay)
    };
  }

  generateSampleEntries() {
    return []; // Bersih tanpa data dummy agar pengguna leluasa input bulan sendiri
  }
}

// Controller
class AppController {
  constructor() {
    this.state = new AppState();
    this.chartMode = 'monthly'; // 'monthly' strictly default as requested
    this.currentTheme = this.loadTheme();
    this.onboardStep = 1;
    this.cachedMonthlyData = [];
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.initUI();
    this.bindEvents();
    this.renderAll();
    this.registerServiceWorker();
    this.checkInitialOnboarding();
  }

  // THEME MANAGEMENT (DARK / LIGHT MODE)
  loadTheme() {
    try {
      return localStorage.getItem('gajiku_theme') || 'light';
    } catch (e) {
      return 'light';
    }
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    // Update header icons
    const sunIcon = document.getElementById('icon-theme-sun');
    const moonIcon = document.getElementById('icon-theme-moon');
    if (sunIcon && moonIcon) {
      if (theme === 'dark') {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      }
    }

    // Update Settings radio
    const radioLight = document.getElementById('theme-light');
    const radioDark = document.getElementById('theme-dark');
    if (radioLight && radioDark) {
      if (theme === 'dark') radioDark.checked = true;
      else radioLight.checked = true;
    }

    try {
      localStorage.setItem('gajiku_theme', theme);
    } catch (e) {}
  }

  toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    this.renderMonthlyChart();
    this.showToast(`Mode ${nextTheme === 'dark' ? 'Gelap 🌙' : 'Terang ☀️'} diaktifkan`);
  }

  setTheme(theme) {
    this.applyTheme(theme);
    this.renderMonthlyChart();
  }

  // ONBOARDING WALKTHROUGH TUTORIAL (CARA PEMAKAIAN SAAT BARU INSTALL)
  checkInitialOnboarding() {
    try {
      const alreadySeen = localStorage.getItem('gajiku_onboarded_v1');
      if (!alreadySeen) {
        setTimeout(() => {
          this.openOnboarding();
        }, 450);
      }
    } catch (e) {}
  }

  openOnboarding() {
    this.onboardStep = 1;
    this.updateOnboardUI();
    const modal = document.getElementById('onboarding-modal');
    if (modal) modal.style.display = 'flex';
  }

  closeOnboarding() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) modal.style.display = 'none';
    try {
      localStorage.setItem('gajiku_onboarded_v1', 'true');
    } catch (e) {}
  }

  closeOnboardingOnBackdrop(e) {
    if (e.target.id === 'onboarding-modal') {
      this.closeOnboarding();
    }
  }

  nextOnboardSlide() {
    if (this.onboardStep < 4) {
      this.onboardStep++;
      this.updateOnboardUI();
    } else {
      this.closeOnboarding();
      this.showToast('Selamat menggunakan GajiKu! 👍');
    }
  }

  prevOnboardSlide() {
    if (this.onboardStep > 1) {
      this.onboardStep--;
      this.updateOnboardUI();
    }
  }

  updateOnboardUI() {
    const totalSteps = 4;
    const titles = [
      'Selamat Datang di GajiKu!',
      '1. Atur Gaji Pokok & Profil',
      '2. Catat Jam Kerja & Lembur',
      '3. Pantau Riwayat & Unduh Laporan'
    ];

    const titleEl = document.getElementById('onboard-title');
    const badgeEl = document.getElementById('onboard-step-badge');
    if (titleEl) titleEl.innerText = titles[this.onboardStep - 1];
    if (badgeEl) badgeEl.innerText = `Langkah ${this.onboardStep} dari ${totalSteps}`;

    for (let i = 1; i <= totalSteps; i++) {
      const slide = document.getElementById(`onboard-slide-${i}`);
      if (slide) slide.style.display = i === this.onboardStep ? 'block' : 'none';
    }

    const dotsContainer = document.getElementById('onboard-dots');
    if (dotsContainer) {
      dotsContainer.innerHTML = Array.from({ length: totalSteps }, (_, idx) => `
        <span class="dot ${idx + 1 === this.onboardStep ? 'active' : ''}"></span>
      `).join('');
    }

    const btnPrev = document.getElementById('btn-onboard-prev');
    if (btnPrev) {
      btnPrev.style.display = this.onboardStep > 1 ? 'inline-flex' : 'none';
    }

    const btnNext = document.getElementById('btn-onboard-next');
    if (btnNext) {
      btnNext.innerHTML = this.onboardStep === totalSteps 
        ? 'Mulai Gunakan Aplikasi ✓' 
        : 'Lanjut &rarr;';
    }
  }

  initUI() {
    const dateInput = document.getElementById('entry-date');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
    const monthInput = document.getElementById('selected-month');
    if (monthInput) {
      monthInput.value = this.state.currentMonth;
    }
  }

  bindEvents() {
    const monthInput = document.getElementById('selected-month');
    if (monthInput) {
      monthInput.addEventListener('change', (e) => {
        this.state.currentMonth = e.target.value;
        this.renderAll();
      });
    }
  }

  switchTab(tabId) {
    this.state.activeTab = tabId;

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabId}`);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabId === 'settings') {
      this.populateSettingsForm();
    } else if (tabId === 'input') {
      this.populateEmployeeFormSelect();
      this.handleInputModeChange();
      this.calcOvertimePreview();
    } else if (tabId === 'monthly') {
      this.renderMonthlyHistory();
    }
  }

  // Live input handler with dots for thousands and comma for decimal
  handleCurrencyInput(inputEl) {
    if (!inputEl) return;
    let val = inputEl.value;
    
    // Allow digits and comma only
    let cleaned = val.replace(/[^0-9,]/g, '');
    let parts = cleaned.split(',');
    
    let integerPart = parts[0] || '';
    // Format integer part with dot every 3 digits
    let formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    let decimalPart = parts.length > 1 ? ',' + parts.slice(1).join('').slice(0, 2) : '';
    let result = formattedInteger + decimalPart;
    
    inputEl.value = result;
  }

  // Parse formatted string back to float/number
  parseCurrencyValue(valStr) {
    if (typeof valStr === 'number') return valStr;
    if (!valStr) return 0;
    let clean = valStr.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  }

  // Format a number into standard dot thousands + comma decimals string
  formatNominalOnly(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    let n = Number(num);
    let isDecimal = n % 1 !== 0;
    let fixed = isDecimal ? n.toFixed(2) : n.toString();
    let [intPart, decPart] = fixed.split('.');
    let formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decPart ? `${formattedInt},${decPart}` : formattedInt;
  }

  formatRupiah(amount) {
    return 'Rp ' + this.formatNominalOnly(amount);
  }

  formatShortJuta(amount) {
    const num = Number(amount || 0);
    if (num >= 1000000) {
      const jt = (num / 1000000).toFixed(1).replace('.', ',');
      return `${jt} Jt`;
    } else if (num >= 1000) {
      const rb = Math.round(num / 1000);
      return `${rb} Rb`;
    }
    return num.toString();
  }

  formatDateDisplay(dateStr) {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
  }

  formatMonthDisplay(monthStr) {
    if (!monthStr) return '-';
    const [y, m] = monthStr.split('-');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[parseInt(m) - 1]} ${y}`;
  }

  // Hitung periode siklus penggajian untuk suatu tanggal (Buka & Tutup Buku)
  getPayrollPeriodForDate(dateStr, emp) {
    const employee = emp || this.state.getActiveEmployee();
    const mode = employee?.cutoffMode || 'calendar';
    const closeDay = Number(employee?.cutoffCloseDay) || 25;

    if (mode !== 'custom' || closeDay >= 31 || closeDay <= 0) {
      return dateStr.substring(0, 7);
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    if (d > closeDay) {
      // Masuk ke periode penggajian bulan berikutnya
      let nextM = m + 1;
      let nextY = y;
      if (nextM > 12) {
        nextM = 1;
        nextY += 1;
      }
      return `${nextY}-${String(nextM).padStart(2, '0')}`;
    } else {
      // Masuk ke periode penggajian bulan berjalan
      return `${y}-${String(m).padStart(2, '0')}`;
    }
  }

  // Rincian rentang tanggal Buka Buku & Tutup Buku untuk suatu bulan
  getPayrollDateRange(monthStr, emp) {
    const employee = emp || this.state.getActiveEmployee();
    const mode = employee?.cutoffMode || 'calendar';
    const closeDay = Number(employee?.cutoffCloseDay) || 25;

    const [curY, curM] = monthStr.split('-').map(Number);
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    if (mode !== 'custom' || closeDay >= 31 || closeDay <= 0) {
      const lastDay = new Date(curY, curM, 0).getDate();
      return {
        mode: 'calendar',
        startDate: `${monthStr}-01`,
        endDate: `${monthStr}-${String(lastDay).padStart(2, '0')}`,
        openDayText: `1 ${monthNamesShort[curM - 1]}`,
        closeDayText: `${lastDay} ${monthNamesShort[curM - 1]} ${curY}`,
        displayRange: `1 - ${lastDay} ${monthNamesShort[curM - 1]} ${curY}`,
        summary: `Standar Kalender (1 - ${lastDay} ${monthNamesShort[curM - 1]})`
      };
    }

    // Custom Cut-off (contoh: Tutup Buku tgl 25 -> Buka Buku tgl 26 bulan sebelumnya)
    let prevM = curM - 1;
    let prevY = curY;
    if (prevM <= 0) {
      prevM = 12;
      prevY -= 1;
    }
    const openDay = closeDay + 1;
    const startDate = `${prevY}-${String(prevM).padStart(2, '0')}-${String(openDay).padStart(2, '0')}`;
    const endDate = `${curY}-${String(curM).padStart(2, '0')}-${String(closeDay).padStart(2, '0')}`;

    return {
      mode: 'custom',
      closeDay,
      openDay,
      startDate,
      endDate,
      openDayText: `${openDay} ${monthNamesShort[prevM - 1]} ${prevY}`,
      closeDayText: `${closeDay} ${monthNamesShort[curM - 1]} ${curY}`,
      displayRange: `${openDay} ${monthNamesShort[prevM - 1]} - ${closeDay} ${monthNamesShort[curM - 1]} ${curY}`,
      summary: `Tutup Buku Tgl ${closeDay} (${openDay} ${monthNamesShort[prevM - 1]} s/d ${closeDay} ${monthNamesShort[curM - 1]})`
    };
  }

  // Filter entries for active employee & selected month (sesuai cut-off buka & tutup buku)
  getActiveMonthEntries(month) {
    const targetMonth = month || this.state.currentMonth;
    const emp = this.state.getActiveEmployee();
    return this.state.entries
      .filter(item => item.employeeId === emp.id && this.getPayrollPeriodForDate(item.date, emp) === targetMonth)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Multi-User Switcher Logic
  switchActiveEmployee(empId) {
    this.state.activeEmployeeId = empId;
    this.state.saveAllData();
    this.renderAll();
    this.showToast(`Beralih ke karyawan: ${this.state.getActiveEmployee().name}`);
  }

  renderEmployeeSelectors() {
    const activeEmp = this.state.getActiveEmployee();
    
    // Header dropdown
    const hdrSelect = document.getElementById('hdr-user-select');
    if (hdrSelect) {
      hdrSelect.innerHTML = this.state.employees.map(e => `
        <option value="${e.id}" ${e.id === activeEmp.id ? 'selected' : ''}>${e.name}</option>
      `).join('');
    }

    // Form modal / entry select
    this.populateEmployeeFormSelect();

    // Settings list
    const listContainer = document.getElementById('employee-list-container');
    if (listContainer) {
      listContainer.innerHTML = this.state.employees.map(e => `
        <div class="employee-row-item ${e.id === activeEmp.id ? 'active' : ''}">
          <div class="emp-info-col">
            <h4>${e.name} ${e.id === activeEmp.id ? '<span class="badge-active-tag">Aktif</span>' : ''}</h4>
            <span>${e.position || 'Staff'} • Gaji: ${this.formatRupiah(e.baseSalary)}</span>
          </div>
          <div class="emp-btn-group">
            <button class="btn btn-sm ${e.id === activeEmp.id ? 'btn-outline' : 'btn-primary'}" onclick="app.switchActiveEmployee('${e.id}')">
              ${e.id === activeEmp.id ? 'Terpilih' : 'Pilih'}
            </button>
            ${this.state.employees.length > 1 ? `
              <button class="btn btn-sm btn-danger-outline" onclick="app.deleteEmployee('${e.id}')" title="Hapus Karyawan">
                &times;
              </button>
            ` : ''}
          </div>
        </div>
      `).join('');
    }
  }

  populateEmployeeFormSelect() {
    const formSelect = document.getElementById('form-emp-select');
    if (formSelect) {
      formSelect.innerHTML = this.state.employees.map(e => `
        <option value="${e.id}" ${e.id === this.state.activeEmployeeId ? 'selected' : ''}>${e.name}</option>
      `).join('');
    }
  }

  openEmployeeModal(empId) {
    const modal = document.getElementById('employee-modal');
    const title = document.getElementById('emp-modal-title');
    const idInput = document.getElementById('modal-emp-id');
    const nameInput = document.getElementById('modal-emp-name');
    const posInput = document.getElementById('modal-emp-position');
    const salInput = document.getElementById('modal-emp-salary');

    if (empId) {
      const emp = this.state.getEmployeeById(empId);
      title.innerText = 'Edit Karyawan';
      idInput.value = emp.id;
      nameInput.value = emp.name;
      posInput.value = emp.position || '';
      salInput.value = this.formatNominalOnly(emp.baseSalary || 5000000);
    } else {
      title.innerText = 'Tambah Karyawan Baru';
      idInput.value = '';
      nameInput.value = '';
      posInput.value = '';
      salInput.value = this.formatNominalOnly(5000000);
    }

    modal.style.display = 'flex';
  }

  closeEmployeeModal() {
    document.getElementById('employee-modal').style.display = 'none';
  }

  closeEmployeeModalOnBackdrop(e) {
    if (e.target.id === 'employee-modal') this.closeEmployeeModal();
  }

  handleSaveEmployeeModal(e) {
    e.preventDefault();
    const id = document.getElementById('modal-emp-id').value;
    const name = document.getElementById('modal-emp-name').value.trim();
    const position = document.getElementById('modal-emp-position').value.trim();
    const baseSalary = this.parseCurrencyValue(document.getElementById('modal-emp-salary').value) || 5000000;

    if (!name) {
      alert('Nama karyawan wajib diisi');
      return;
    }

    if (id) {
      // Edit
      const emp = this.state.getEmployeeById(id);
      if (emp) {
        emp.name = name;
        emp.position = position;
        emp.baseSalary = baseSalary;
      }
      this.showToast('Data karyawan diperbarui');
    } else {
      // Add new
      const newEmp = {
        ...DEFAULT_EMPLOYEE,
        id: 'emp_' + Date.now(),
        name,
        position,
        baseSalary
      };
      this.state.employees.push(newEmp);
      this.state.activeEmployeeId = newEmp.id;
      this.showToast(`Karyawan baru ${name} ditambahkan`);
    }

    this.state.saveAllData();
    this.closeEmployeeModal();
    this.renderAll();
  }

  deleteEmployee(id) {
    if (this.state.employees.length <= 1) {
      alert('Minimal harus ada 1 karyawan.');
      return;
    }
    const emp = this.state.getEmployeeById(id);
    if (confirm(`Yakin ingin menghapus karyawan "${emp.name}" beserta data lemburnya?`)) {
      this.state.employees = this.state.employees.filter(e => e.id !== id);
      this.state.entries = this.state.entries.filter(e => e.employeeId !== id);
      if (this.state.activeEmployeeId === id) {
        this.state.activeEmployeeId = this.state.employees[0].id;
      }
      this.state.saveAllData();
      this.renderAll();
      this.showToast('Karyawan telah dihapus.');
    }
  }

  // Input Mode Handling
  handleInputModeChange() {
    const selectedMode = document.querySelector('input[name="input-mode"]:checked')?.value || 'overtime_only';
    const regSection = document.getElementById('section-regular-hours');
    const otSection = document.getElementById('section-overtime-hours');

    if (selectedMode === 'overtime_only') {
      regSection.style.display = 'none';
      otSection.style.display = 'block';
    } else if (selectedMode === 'regular_and_overtime') {
      regSection.style.display = 'block';
      otSection.style.display = 'block';
    } else if (selectedMode === 'regular_only') {
      regSection.style.display = 'block';
      otSection.style.display = 'none';
      document.getElementById('entry-hours').value = 0;
    }

    this.calcOvertimePreview();
  }

  calcRegularHours() {
    const start = document.getElementById('reg-start').value;
    const end = document.getElementById('reg-end').value;
    if (!start || !end) return;

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;

    // Default istirahat 1 jam jika kerja lebih dari 5 jam
    let hours = diff / 60;
    if (hours >= 5) hours -= 1;
    document.getElementById('reg-hours').value = Math.max(0, Math.round(hours * 2) / 2);
  }

  toggleDailyAddons() {
    const box = document.getElementById('section-daily-addons') || document.getElementById('addon-expand-content');
    const icon = document.getElementById('chevron-addons') || document.getElementById('addon-chevron-icon');
    if (!box) return;
    const isOpen = box.style.display !== 'none';
    box.style.display = isOpen ? 'none' : 'block';
    if (icon) icon.classList.toggle('open', !isOpen);
  }

  calcOvertimePreview() {
    const mode = document.querySelector('input[name="input-mode"]:checked')?.value || 'overtime_only';
    let hours = 0;
    if (mode !== 'regular_only') {
      hours = parseFloat(document.getElementById('entry-hours')?.value) || 0;
    }
    const dayType = document.querySelector('input[name="day-type"]:checked')?.value || 'workday';

    const empId = document.getElementById('form-emp-select')?.value || this.state.activeEmployeeId;
    const emp = this.state.getEmployeeById(empId);
    const calc = this.state.calculateOvertimePay(hours, dayType, emp);

    const baseEl = document.getElementById('preview-base-rate');
    const mulEl = document.getElementById('preview-multiplier');
    const totalEl = document.getElementById('preview-total-pay');

    if (baseEl) baseEl.innerText = `${this.formatRupiah(calc.baseRate)} / jam`;
    if (mulEl) mulEl.innerText = calc.multiplierText;
    if (totalEl) totalEl.innerText = this.formatRupiah(calc.totalPay);

    const hint = document.getElementById('hint-day-type');
    if (hint) {
      hint.innerText = dayType === 'workday' 
        ? 'Hari kerja: 1 jam pertama x 1.5, jam selanjutnya x 2.0.'
        : 'Hari libur/weekend: 8 jam pertama x 2.0, jam ke-9 x 3.0, jam ke-10+ x 4.0.';
    }
  }

  autoCalculateHours() {
    const start = document.getElementById('entry-start').value;
    const end = document.getElementById('entry-end').value;

    if (!start || !end) {
      this.showToast('Harap tentukan Mulai dan Selesai Lembur');
      return;
    }

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMinutes < 0) diffMinutes += 24 * 60;

    const hours = Math.round((diffMinutes / 60) * 2) / 2;
    document.getElementById('entry-hours').value = hours;
    this.calcOvertimePreview();
    this.showToast(`Durasi lembur: ${hours} Jam`);
  }

  renderAll() {
    this.renderEmployeeSelectors();
    this.renderHeader();
    this.renderDashboard();
    this.renderHistory();
    this.renderMonthlyHistory();
    this.calcOvertimePreview();
  }

  renderHeader() {
    const emp = this.state.getActiveEmployee();
    const rangeInfo = this.getPayrollDateRange(this.state.currentMonth, emp);

    document.getElementById('hdr-company').innerText = emp.company || 'Perusahaan';
    document.getElementById('month-display-text').innerText = this.formatMonthDisplay(this.state.currentMonth);
    document.getElementById('dash-period-badge').innerText = this.formatMonthDisplay(this.state.currentMonth);
    
    const cutoffPill = document.getElementById('dash-cutoff-pill');
    if (cutoffPill) {
      cutoffPill.innerText = rangeInfo.displayRange;
      cutoffPill.title = rangeInfo.summary;
    }

    document.getElementById('dash-emp-display-name').innerText = emp.name;
    document.getElementById('hist-sub-title').innerText = `Daftar presensi dan lembur untuk ${emp.name} • Periode: ${rangeInfo.displayRange}.`;
    document.getElementById('monthly-emp-name').innerText = emp.name;
  }

  renderDashboard() {
    const emp = this.state.getActiveEmployee();
    const monthEntries = this.getActiveMonthEntries();

    const totalHours = monthEntries.reduce((acc, cur) => acc + (Number(cur.hours) || 0), 0);
    const totalOvertimePay = monthEntries.reduce((acc, cur) => acc + (Number(cur.totalPay) || 0), 0);
    const workDays = monthEntries.filter(e => e.inputMode !== 'overtime_only' || e.hours > 0).length;
    const otDays = monthEntries.filter(e => Number(e.hours) > 0).length;

    const dailyAllowancesSum = monthEntries.reduce((acc, cur) => acc + (Number(cur.dailyAllowance) || 0), 0);
    const dailyDeductionsSum = monthEntries.reduce((acc, cur) => acc + (Number(cur.dailyDeduction) || 0), 0);

    const fixedAllowances = (emp.allowances || []).reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
    const fixedDeductions = (emp.deductions || []).reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
    const totalAllowances = fixedAllowances + dailyAllowancesSum;
    const totalDeductions = fixedDeductions + dailyDeductionsSum;
    const baseSalary = Number(emp.baseSalary) || 0;

    const takeHomePay = baseSalary + totalOvertimePay + totalAllowances - totalDeductions;

    document.getElementById('dash-take-home').innerText = this.formatRupiah(takeHomePay);
    document.getElementById('dash-base-salary').innerText = this.formatRupiah(baseSalary);
    document.getElementById('dash-total-hours').innerText = totalHours.toFixed(1);
    document.getElementById('dash-overtime-pay').innerText = `+ ${this.formatRupiah(totalOvertimePay)}`;
    document.getElementById('dash-allowances').innerText = `+ ${this.formatRupiah(totalAllowances)}`;
    document.getElementById('dash-deductions').innerText = `- ${this.formatRupiah(totalDeductions)}`;
    document.getElementById('dash-work-days').innerText = `${workDays} Hari`;
    document.getElementById('dash-ot-days').innerText = `${otDays} Hari`;

    const recentList = document.getElementById('dash-recent-list');
    if (monthEntries.length === 0) {
      recentList.innerHTML = `<div class="recent-empty">Belum ada catatan di bulan ${this.formatMonthDisplay(this.state.currentMonth)} untuk ${emp.name}.</div>`;
    } else {
      recentList.innerHTML = monthEntries.slice(0, 3).map(entry => {
        let modeLabel = '⚡ Lembur Saja';
        let subText = `${entry.hours} Jam Lembur (${entry.startTime || '-'} - ${entry.endTime || '-'})`;
        if (entry.inputMode === 'regular_and_overtime') {
          modeLabel = '🏢 Kerja + Lembur';
          subText = `Kerja ${entry.regularHours || 8} Jam + Lembur ${entry.hours} Jam`;
        } else if (entry.inputMode === 'regular_only') {
          modeLabel = '📅 Hadir Kerja';
          subText = `Kerja Normal ${entry.regularHours || 8} Jam (Tanpa Lembur)`;
        }

        const hasAddon = (Number(entry.dailyAllowance) || 0) > 0 || (Number(entry.dailyDeduction) || 0) > 0;
        let addonText = '';
        if (hasAddon) {
          const parts = [];
          if ((Number(entry.dailyAllowance) || 0) > 0) parts.push(`+Tunj ${this.formatRupiah(entry.dailyAllowance)}`);
          if ((Number(entry.dailyDeduction) || 0) > 0) parts.push(`-Pot ${this.formatRupiah(entry.dailyDeduction)}`);
          addonText = ` • ${parts.join(', ')}`;
        }

        return `
          <div class="recent-item ${entry.dayType} ${entry.inputMode === 'regular_only' ? 'reg-only' : ''}">
            <div class="recent-info">
              <h4>${this.formatDateDisplay(entry.date)} <small style="font-size:0.7rem; color:var(--primary); font-weight:700;">[${modeLabel}]</small></h4>
              <span>${entry.dayType === 'holiday' ? 'Libur' : 'Kerja'} • ${subText}${addonText}</span>
            </div>
            <div class="recent-amount">
              <span class="val">${entry.totalPay > 0 ? '+ ' + this.formatRupiah(entry.totalPay) : 'Hadir'}</span>
              <span class="dur">${entry.notes ? entry.notes.substring(0, 22) + '...' : ''}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  renderHistory() {
    const monthEntries = this.getActiveMonthEntries();
    const totalHours = monthEntries.reduce((acc, cur) => acc + (Number(cur.hours) || 0), 0);
    const totalOvertimePay = monthEntries.reduce((acc, cur) => acc + (Number(cur.totalPay) || 0), 0);

    document.getElementById('hist-total-days').innerText = `${monthEntries.length} Hari`;
    document.getElementById('hist-total-hours').innerText = `${totalHours.toFixed(1)} Jam`;
    document.getElementById('hist-total-amount').innerText = this.formatRupiah(totalOvertimePay);

    const container = document.getElementById('history-entry-list');
    if (monthEntries.length === 0) {
      container.innerHTML = `<div class="recent-empty">Tidak ada catatan pada periode ${this.formatMonthDisplay(this.state.currentMonth)}. Silakan tekan menu <strong>Catat</strong> untuk menambahkan.</div>`;
      return;
    }

    container.innerHTML = monthEntries.map(entry => {
      let modeBadge = '<span class="tag-day tag-workday">⚡ Lembur Saja</span>';
      if (entry.inputMode === 'regular_and_overtime') {
        modeBadge = '<span class="tag-day tag-workday">🏢 Kerja + Lembur</span>';
      } else if (entry.inputMode === 'regular_only') {
        modeBadge = '<span class="tag-day tag-reg-only">📅 Hadir Normal</span>';
      }

      const hasDailyAllowance = (Number(entry.dailyAllowance) || 0) > 0;
      const hasDailyDeduction = (Number(entry.dailyDeduction) || 0) > 0;

      return `
        <div class="entry-card">
          <div class="entry-card-header">
            <div class="entry-date-badge">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${this.formatDateDisplay(entry.date)}
            </div>
            <div>
              ${modeBadge}
              <span class="tag-day ${entry.dayType === 'holiday' ? 'tag-holiday' : 'tag-workday'}">
                ${entry.dayType === 'holiday' ? 'Libur/Weekend' : 'Hari Kerja'}
              </span>
            </div>
          </div>

          <div class="entry-card-body">
            <div class="hours-info">
              ${entry.inputMode !== 'overtime_only' ? `<div>Jam Kerja: <strong>${entry.regularStartTime || '08:00'} - ${entry.regularEndTime || '17:00'} (${entry.regularHours || 8} Jam)</strong></div>` : ''}
              ${entry.inputMode !== 'regular_only' ? `<div>Lembur: <strong>${entry.startTime || '-'} - ${entry.endTime || '-'} (${entry.hours} Jam)</strong></div>` : ''}
            </div>
            <div class="money-info">
              <div>${entry.totalPay > 0 ? '+ ' + this.formatRupiah(entry.totalPay) : 'Rp 0'}</div>
            </div>
          </div>

          ${(hasDailyAllowance || hasDailyDeduction) ? `
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
              ${hasDailyAllowance ? `<span class="badge-addon-item allowance">+Tunjangan ${this.formatRupiah(entry.dailyAllowance)}</span>` : ''}
              ${hasDailyDeduction ? `<span class="badge-addon-item deduction">-Potongan ${this.formatRupiah(entry.dailyDeduction)}</span>` : ''}
            </div>
          ` : ''}

          ${entry.notes ? `<div class="entry-notes-box">📝 ${entry.notes}</div>` : ''}

          <div class="entry-card-footer">
            <button class="btn-icon-text" onclick="app.editEntry('${entry.id}')">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <button class="btn-icon-text danger" onclick="app.deleteEntry('${entry.id}')">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Hapus
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // RIWAYAT GAJI BULANAN & AKUMULASI (MONTHLY & CUMULATIVE PAYROLL)
  setChartMode(mode) {
    this.chartMode = mode;
    const btnM = document.getElementById('btn-chart-monthly');
    const btnC = document.getElementById('btn-chart-cumulative');
    if (btnM) btnM.classList.toggle('active', mode === 'monthly');
    if (btnC) btnC.classList.toggle('active', mode === 'cumulative');
    this.renderMonthlyHistory();
  }

  renderMonthlyHistory() {
    const emp = this.state.getActiveEmployee();
    const container = document.getElementById('monthly-history-container');
    if (!container) return;

    const baseSalary = Number(emp.baseSalary) || 0;
    const totalAllowances = (emp.allowances || []).reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
    const totalDeductions = (emp.deductions || []).reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);

    // Get all unique months for this employee (mengikuti cut-off buka & tutup buku)
    const empEntries = this.state.entries.filter(e => e.employeeId === emp.id);
    const monthsSet = new Set(empEntries.map(e => this.getPayrollPeriodForDate(e.date, emp)));
    monthsSet.add(this.state.currentMonth);

    // Sort chronologically ascending (oldest first) to compute running cumulative sums
    const sortedMonthsAsc = Array.from(monthsSet).sort();

    let runningCumulTHP = 0;
    let runningCumulOT = 0;
    let runningCumulHours = 0;

    const monthlyDataAsc = sortedMonthsAsc.map(mStr => {
      const mEntries = empEntries.filter(e => this.getPayrollPeriodForDate(e.date, emp) === mStr);
      const totalHours = mEntries.reduce((acc, cur) => acc + (Number(cur.hours) || 0), 0);
      const totalOvertimePay = mEntries.reduce((acc, cur) => acc + (Number(cur.totalPay) || 0), 0);
      const totalDays = mEntries.length;

      const mDailyAllowances = mEntries.reduce((acc, cur) => acc + (Number(cur.dailyAllowance) || 0), 0);
      const mDailyDeductions = mEntries.reduce((acc, cur) => acc + (Number(cur.dailyDeduction) || 0), 0);
      const mTotalAllowances = totalAllowances + mDailyAllowances;
      const mTotalDeductions = totalDeductions + mDailyDeductions;
      const takeHomePay = baseSalary + totalOvertimePay + mTotalAllowances - mTotalDeductions;

      runningCumulTHP += takeHomePay;
      runningCumulOT += totalOvertimePay;
      runningCumulHours += totalHours;

      const [y, m] = mStr.split('-');
      const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const shortLabel = `${monthNamesShort[parseInt(m) - 1]} '${y.slice(2)}`;

      return {
        month: mStr,
        shortLabel,
        totalDays,
        totalHours,
        totalOvertimePay,
        mTotalAllowances,
        mTotalDeductions,
        takeHomePay,
        baseAndAllowances: baseSalary + mTotalAllowances - mTotalDeductions,
        cumulativeTakeHome: runningCumulTHP,
        cumulativeOtPay: runningCumulOT,
        cumulativeOtHours: runningCumulHours
      };
    });

    // Update Cumulative Hero Card
    const grandTotalCumulTHP = runningCumulTHP;
    const grandTotalCumulOT = runningCumulOT;
    const grandTotalCumulHours = runningCumulHours;
    const avgMonthly = Math.round(grandTotalCumulTHP / monthlyDataAsc.length);

    const totalEl = document.getElementById('cumul-total-amount');
    const otEl = document.getElementById('cumul-ot-amount');
    const hoursEl = document.getElementById('cumul-ot-hours');
    const avgEl = document.getElementById('cumul-avg-monthly');

    if (totalEl) totalEl.innerText = this.formatRupiah(grandTotalCumulTHP);
    if (otEl) otEl.innerText = this.formatRupiah(grandTotalCumulOT);
    if (hoursEl) hoursEl.innerText = `${grandTotalCumulHours.toFixed(1)} Jam`;
    if (avgEl) avgEl.innerText = this.formatRupiah(avgMonthly);

    // Render SVG Chart
    this.renderMonthlyChart(monthlyDataAsc);

    // Render Cards in descending order (newest first)
    const monthlyDataDesc = [...monthlyDataAsc].reverse();

    container.innerHTML = monthlyDataDesc.map(item => {
      const rangeInfo = this.getPayrollDateRange(item.month, emp);
      return `
        <div class="monthly-card">
          <div class="monthly-card-header">
            <div>
              <div class="monthly-title">📅 ${this.formatMonthDisplay(item.month)}</div>
              <div class="monthly-cutoff-sub">${rangeInfo.displayRange}</div>
            </div>
            <span class="monthly-status-badge">${item.totalDays > 0 ? item.totalDays + ' Hari Kerja' : '0 Hari'}</span>
          </div>

          <div class="monthly-grid">
            <div class="monthly-row-label">Gaji Pokok:</div>
            <div class="monthly-row-val">${this.formatRupiah(baseSalary)}</div>

            <div class="monthly-row-label">Kehadiran & Lembur:</div>
            <div class="monthly-row-val">${item.totalDays} Hari (${item.totalHours.toFixed(1)} Jam Lembur)</div>

            <div class="monthly-row-label">Total Uang Lembur:</div>
            <div class="monthly-row-val text-success">+ ${this.formatRupiah(item.totalOvertimePay)}</div>

            <div class="monthly-row-label">Tunjangan & Potongan:</div>
            <div class="monthly-row-val">+ ${this.formatRupiah(item.mTotalAllowances)} / - ${this.formatRupiah(item.mTotalDeductions)}</div>
          </div>

          <div class="monthly-thp-row">
            <span>GAJI BERSIH (THP)</span>
            <strong>${this.formatRupiah(item.takeHomePay)}</strong>
          </div>

          <div class="monthly-cumul-row">
            <span>📈 Akumulasi s/d Bulan Ini:</span>
            <strong>${this.formatRupiah(item.cumulativeTakeHome)}</strong>
          </div>

          <div class="monthly-actions">
            <button class="btn btn-sm btn-outline" onclick="app.exportMonthToExcel('${item.month}')" title="Unduh Excel Bulan Ini">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Excel
            </button>
            <button class="btn btn-sm btn-primary" onclick="app.openSlipModal('${item.month}')" title="Cetak Slip Gaji PDF">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Slip Gaji
            </button>
            <button class="btn btn-sm btn-danger-outline" onclick="app.deleteMonthHistory('${item.month}')" title="Hapus Riwayat Bulan Ini">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Hapus
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // RENDER GRAFIK SVG RIWAYAT GAJI (PEMBACAAN BULANAN)
  renderMonthlyChart(data) {
    const dataAsc = data || this.cachedMonthlyData || [];
    if (data && data.length > 0) this.cachedMonthlyData = data;
    const svgEl = document.getElementById('monthly-salary-chart');
    const legendBox = document.getElementById('chart-legend-box');
    if (!svgEl) return;

    const width = 500;
    const height = 200;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 32;
    const paddingBottom = 28;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const isDark = this.currentTheme === 'dark';
    const gridColor = isDark ? '#24324d' : '#e2e8f0';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const titleValColor = isDark ? '#f8fafc' : '#0f172a';

    if (!dataAsc || dataAsc.length === 0) {
      svgEl.innerHTML = `<text x="${width/2}" y="${height/2}" text-anchor="middle" fill="${textColor}" font-size="13">Belum ada data grafik</text>`;
      return;
    }

    if (this.chartMode === 'cumulative') {
      // MODE GRAFIK AKUMULASI (LINE / AREA TREND)
      if (legendBox) {
        legendBox.innerHTML = `
          <div class="legend-item"><span class="legend-dot dot-cumul"></span> Akumulasi Gaji Diterima (Kumulatif)</div>
        `;
      }

      const maxVal = Math.max(...dataAsc.map(d => d.cumulativeTakeHome), 1000000) * 1.18;

      const stepX = chartW / Math.max(dataAsc.length - 1, 1);
      const points = dataAsc.map((d, idx) => {
        const x = paddingLeft + (dataAsc.length === 1 ? chartW / 2 : idx * stepX);
        const y = paddingTop + chartH - (d.cumulativeTakeHome / maxVal) * chartH;
        return { x, y, val: d.cumulativeTakeHome, label: d.shortLabel };
      });

      let pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
      }

      const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartH} L ${points[0].x} ${paddingTop + chartH} Z`;

      let gridSvg = '';
      for (let g = 0; g <= 3; g++) {
        const gridY = paddingTop + (chartH / 3) * g;
        const valAtGrid = maxVal * (1 - g / 3);
        gridSvg += `
          <line x1="${paddingLeft}" y1="${gridY}" x2="${width - paddingRight}" y2="${gridY}" stroke="${gridColor}" stroke-dasharray="3,3" stroke-width="1"/>
          <text x="${paddingLeft - 6}" y="${gridY + 4}" text-anchor="end" font-size="9.5" fill="${textColor}" font-weight="600">${this.formatShortJuta(valAtGrid)}</text>
        `;
      }

      let pointsSvg = '';
      points.forEach(p => {
        pointsSvg += `
          <rect x="${p.x - 22}" y="${p.y - 20}" width="44" height="15" rx="4" fill="${isDark ? '#1e293b' : '#0f172a'}" opacity="0.9"/>
          <text x="${p.x}" y="${p.y - 9}" text-anchor="middle" font-size="9" font-weight="700" fill="#ffffff">${this.formatShortJuta(p.val)}</text>
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="#f59e0b" stroke="${isDark ? '#0b1120' : '#ffffff'}" stroke-width="2"/>
          <text x="${p.x}" y="${height - 8}" text-anchor="middle" font-size="10.5" font-weight="600" fill="${textColor}">${p.label}</text>
        `;
      });

      svgEl.innerHTML = `
        <defs>
          <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.38"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        ${gridSvg}
        <path d="${areaD}" fill="url(#cumulGrad)"/>
        <path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        ${pointsSvg}
      `;

    } else {
      // MODE GRAFIK BULANAN (STACKED BAR - PEMBACAAN GAJI PER BULAN)
      if (legendBox) {
        legendBox.innerHTML = `
          <div class="legend-item"><span class="legend-dot dot-salary"></span> Gaji Pokok & Tunjangan</div>
          <div class="legend-item"><span class="legend-dot dot-ot"></span> Uang Lembur</div>
        `;
      }

      const maxVal = Math.max(...dataAsc.map(d => d.takeHomePay), 1000000) * 1.2;

      let gridSvg = '';
      for (let g = 0; g <= 3; g++) {
        const gridY = paddingTop + (chartH / 3) * g;
        const valAtGrid = maxVal * (1 - g / 3);
        gridSvg += `
          <line x1="${paddingLeft}" y1="${gridY}" x2="${width - paddingRight}" y2="${gridY}" stroke="${gridColor}" stroke-dasharray="3,3" stroke-width="1"/>
          <text x="${paddingLeft - 6}" y="${gridY + 4}" text-anchor="end" font-size="9.5" fill="${textColor}" font-weight="600">${this.formatShortJuta(valAtGrid)}</text>
        `;
      }

      const barWidth = Math.min(36, Math.max(18, (chartW / dataAsc.length) * 0.48));
      const stepX = chartW / dataAsc.length;

      let barsSvg = '';
      dataAsc.forEach((d, idx) => {
        const centerX = paddingLeft + (idx * stepX) + (stepX / 2);
        const barX = centerX - (barWidth / 2);

        const baseH = (d.baseAndAllowances / maxVal) * chartH;
        const otH = (d.totalOvertimePay / maxVal) * chartH;

        const baseY = paddingTop + chartH - baseH;
        const otY = baseY - otH;

        barsSvg += `
          <rect x="${barX}" y="${baseY}" width="${barWidth}" height="${baseH}" rx="4" fill="${isDark ? '#3b82f6' : '#2563eb'}" opacity="0.9"/>
          ${otH > 1 ? `
            <rect x="${barX}" y="${otY}" width="${barWidth}" height="${otH}" rx="4" fill="${isDark ? '#22c55e' : '#16a34a'}"/>
          ` : ''}
          <text x="${centerX}" y="${otY - 6}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${titleValColor}">${this.formatShortJuta(d.takeHomePay)}</text>
          <text x="${centerX}" y="${height - 8}" text-anchor="middle" font-size="10.5" font-weight="600" fill="${textColor}">${d.shortLabel}</text>
        `;
      });

      svgEl.innerHTML = `
        ${gridSvg}
        ${barsSvg}
      `;
    }
  }

  // Save / Update Entry
  handleSaveEntry(e) {
    e.preventDefault();

    const id = document.getElementById('entry-id').value;
    const empId = document.getElementById('form-emp-select').value;
    const date = document.getElementById('entry-date').value;
    const inputMode = document.querySelector('input[name="input-mode"]:checked')?.value || 'overtime_only';
    const dayType = document.querySelector('input[name="day-type"]:checked')?.value || 'workday';
    
    // Regular hours
    const regStart = document.getElementById('reg-start').value;
    const regEnd = document.getElementById('reg-end').value;
    const regHours = parseFloat(document.getElementById('reg-hours').value) || 8;

    // Overtime hours
    const startTime = document.getElementById('entry-start').value;
    const endTime = document.getElementById('entry-end').value;
    let hours = parseFloat(document.getElementById('entry-hours').value) || 0;
    if (inputMode === 'regular_only') {
      hours = 0;
    }

    // Daily addons (manual allowances / deductions for this entry)
    const dailyAllowance = this.parseCurrencyValue(document.getElementById('entry-daily-allowance')?.value) || 0;
    const dailyDeduction = this.parseCurrencyValue(document.getElementById('entry-daily-deduction')?.value) || 0;

    const notes = document.getElementById('entry-notes').value.trim();

    if (!date) {
      alert('Tanggal harus diisi');
      return;
    }

    const emp = this.state.getEmployeeById(empId);
    const calc = this.state.calculateOvertimePay(hours, dayType, emp);

    if (id) {
      // Update
      const index = this.state.entries.findIndex(item => item.id === id);
      if (index !== -1) {
        this.state.entries[index] = {
          ...this.state.entries[index],
          employeeId: empId,
          date,
          inputMode,
          dayType,
          regularStartTime: regStart,
          regularEndTime: regEnd,
          regularHours: regHours,
          startTime,
          endTime,
          hours,
          dailyAllowance,
          dailyDeduction,
          totalPay: calc.totalPay,
          notes
        };
        this.showToast('Data berhasil diperbarui!');
      }
    } else {
      // Create
      const newEntry = {
        id: 'entry_' + Date.now(),
        employeeId: empId,
        date,
        inputMode,
        dayType,
        regularStartTime: regStart,
        regularEndTime: regEnd,
        regularHours: regHours,
        startTime,
        endTime,
        hours,
        dailyAllowance,
        dailyDeduction,
        totalPay: calc.totalPay,
        notes
      };
      this.state.entries.push(newEntry);
      this.showToast('Data berhasil dicatat!');
    }

    this.state.saveAllData();
    this.cancelEditEntry();

    // Set month and active employee to the saved one (sesuai siklus cut-off buka/tutup buku)
    this.state.activeEmployeeId = empId;
    this.state.currentMonth = this.getPayrollPeriodForDate(date, emp);
    document.getElementById('selected-month').value = this.state.currentMonth;

    this.renderAll();
    this.switchTab('history');
  }

  editEntry(id) {
    const entry = this.state.entries.find(item => item.id === id);
    if (!entry) return;

    this.switchTab('input');

    document.getElementById('form-title').innerText = 'Edit Catatan';
    document.getElementById('entry-id').value = entry.id;
    document.getElementById('form-emp-select').value = entry.employeeId;
    document.getElementById('entry-date').value = entry.date;
    
    // Set input mode
    const mode = entry.inputMode || 'overtime_only';
    const modeRadio = document.querySelector(`input[name="input-mode"][value="${mode}"]`);
    if (modeRadio) modeRadio.checked = true;

    // Set day type
    if (entry.dayType === 'holiday') {
      document.getElementById('type-holiday').checked = true;
    } else {
      document.getElementById('type-workday').checked = true;
    }

    // Set reg hours
    document.getElementById('reg-start').value = entry.regularStartTime || '08:00';
    document.getElementById('reg-end').value = entry.regularEndTime || '17:00';
    document.getElementById('reg-hours').value = entry.regularHours || 8;

    // Set ot hours
    document.getElementById('entry-start').value = entry.startTime || '17:00';
    document.getElementById('entry-end').value = entry.endTime || '20:00';
    document.getElementById('entry-hours').value = entry.hours || 0;

    // Set daily addons
    const allowInput = document.getElementById('entry-daily-allowance');
    const deductInput = document.getElementById('entry-daily-deduction');
    if (allowInput) allowInput.value = entry.dailyAllowance ? this.formatNominalOnly(entry.dailyAllowance) : '';
    if (deductInput) deductInput.value = entry.dailyDeduction ? this.formatNominalOnly(entry.dailyDeduction) : '';

    const addonBox = document.getElementById('section-daily-addons') || document.getElementById('addon-expand-content');
    const addonIcon = document.getElementById('chevron-addons') || document.getElementById('addon-chevron-icon');
    if ((Number(entry.dailyAllowance) || 0) > 0 || (Number(entry.dailyDeduction) || 0) > 0) {
      if (addonBox) addonBox.style.display = 'block';
      if (addonIcon) addonIcon.classList.add('open');
    } else {
      if (addonBox) addonBox.style.display = 'none';
      if (addonIcon) addonIcon.classList.remove('open');
    }

    document.getElementById('entry-notes').value = entry.notes || '';

    this.handleInputModeChange();

    document.getElementById('btn-save-entry').innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/></svg>
      Perbarui Data
    `;
    document.getElementById('btn-cancel-edit').style.display = 'block';
  }

  cancelEditEntry() {
    document.getElementById('form-title').innerText = 'Catat Jam Kerja & Lembur';
    document.getElementById('entry-id').value = '';
    document.getElementById('entry-notes').value = '';

    const allowInput = document.getElementById('entry-daily-allowance');
    const deductInput = document.getElementById('entry-daily-deduction');
    if (allowInput) allowInput.value = '';
    if (deductInput) deductInput.value = '';

    const addonBox = document.getElementById('section-daily-addons') || document.getElementById('addon-expand-content');
    const addonIcon = document.getElementById('chevron-addons') || document.getElementById('addon-chevron-icon');
    if (addonBox) addonBox.style.display = 'none';
    if (addonIcon) addonIcon.classList.remove('open');

    document.getElementById('btn-save-entry').innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/></svg>
      Simpan Data
    `;
    document.getElementById('btn-cancel-edit').style.display = 'none';
  }

  deleteEntry(id) {
    if (confirm('Hapus catatan ini?')) {
      this.state.entries = this.state.entries.filter(item => item.id !== id);
      this.state.saveAllData();
      this.renderAll();
      this.showToast('Catatan telah dihapus.');
    }
  }

  // FITUR: HAPUS SELURUH RIWAYAT GAJI BULANAN TERTENTU
  deleteMonthHistory(monthStr) {
    const emp = this.state.getActiveEmployee();
    const periodLabel = this.formatMonthDisplay(monthStr);
    const rangeInfo = this.getPayrollDateRange(monthStr, emp);

    // Cari seluruh catatan karyawan ini yang masuk ke periode penggajian ini
    const matchingEntries = this.state.entries.filter(e => 
      e.employeeId === emp.id && this.getPayrollPeriodForDate(e.date, emp) === monthStr
    );

    if (matchingEntries.length === 0) {
      alert(`Tidak ada data catatan presensi maupun lembur di periode ${periodLabel} (${rangeInfo.displayRange}) untuk ${emp.name}.`);
      return;
    }

    const confirmMsg = `⚠️ KONFIRMASI HAPUS RIWAYAT BULANAN\n\n` +
      `Apakah Anda yakin ingin menghapus SELURUH catatan presensi & lembur untuk:\n` +
      `• Karyawan: ${emp.name}\n` +
      `• Periode: ${periodLabel}\n` +
      `• Rentang Siklus: ${rangeInfo.displayRange}\n` +
      `• Jumlah Catatan: ${matchingEntries.length} hari kerja\n\n` +
      `Tindakan ini akan mengosongkan jam lembur & uang lembur untuk bulan tersebut. Lanjutkan?`;

    if (confirm(confirmMsg)) {
      const matchingIds = new Set(matchingEntries.map(e => e.id));
      this.state.entries = this.state.entries.filter(e => !matchingIds.has(e.id));
      this.state.saveAllData();
      this.renderAll();
      this.showToast(`Riwayat gaji periode ${periodLabel} berhasil dihapus! 🗑️`);
    }
  }

  // Settings Logic
  populateSettingsForm() {
    const emp = this.state.getActiveEmployee();
    document.getElementById('set-current-emp-name').innerText = emp.name;
    document.getElementById('set-emp-name').value = emp.name;
    document.getElementById('set-emp-position').value = emp.position || '';
    document.getElementById('set-emp-company').value = emp.company || '';
    document.getElementById('set-base-salary').value = this.formatNominalOnly(emp.baseSalary || 5000000);

    if (emp.rateMethod === 'manual') {
      document.getElementById('rate-manual').checked = true;
      document.getElementById('group-manual-rate').style.display = 'block';
    } else {
      document.getElementById('rate-depnaker').checked = true;
      document.getElementById('group-manual-rate').style.display = 'none';
    }

    document.getElementById('set-manual-rate').value = this.formatNominalOnly(emp.manualRate || 35000);
    this.updateSettingsRatePreview();

    // Pengaturan Siklus Buka & Tutup Buku (Cut-Off) Penggajian
    const cutoffMode = emp.cutoffMode || 'calendar';
    if (cutoffMode === 'custom') {
      document.getElementById('cutoff-custom').checked = true;
      document.getElementById('group-custom-cutoff').style.display = 'block';
    } else {
      document.getElementById('cutoff-calendar').checked = true;
      document.getElementById('group-custom-cutoff').style.display = 'none';
    }

    const cutoffSelect = document.getElementById('set-cutoff-day');
    if (cutoffSelect) {
      if (cutoffSelect.options.length === 0) {
        for (let d = 1; d <= 30; d++) {
          const opt = document.createElement('option');
          opt.value = d;
          opt.text = `Tanggal ${d} (Tutup Buku) → Tanggal ${d + 1} (Buka Buku)`;
          cutoffSelect.appendChild(opt);
        }
      }
      cutoffSelect.value = emp.cutoffCloseDay || 25;
    }
    this.updateCutoffPreview();

    this.renderDynamicAllowances();
    this.renderDynamicDeductions();
  }

  toggleCutoffInput() {
    const isCustom = document.getElementById('cutoff-custom')?.checked;
    const group = document.getElementById('group-custom-cutoff');
    if (group) group.style.display = isCustom ? 'block' : 'none';
    this.updateCutoffPreview();
  }

  updateCutoffPreview() {
    const isCustom = document.getElementById('cutoff-custom')?.checked;
    const closeDay = Number(document.getElementById('set-cutoff-day')?.value) || 25;
    const curMonth = this.state.currentMonth;

    const tempEmp = {
      cutoffMode: isCustom ? 'custom' : 'calendar',
      cutoffCloseDay: closeDay
    };
    const range = this.getPayrollDateRange(curMonth, tempEmp);

    const openEl = document.getElementById('lbl-open-book');
    const closeEl = document.getElementById('lbl-close-book');
    const exampleEl = document.getElementById('lbl-cutoff-example');

    if (isCustom) {
      if (openEl) openEl.innerText = `Tanggal ${range.openDay} (${range.openDayText})`;
      if (closeEl) closeEl.innerText = `Tanggal ${range.closeDay} (${range.closeDayText})`;
      if (exampleEl) exampleEl.innerHTML = `📅 Periode Penggajian Bulan Ini: <span class="badge-range">${range.displayRange}</span>`;
    } else {
      if (openEl) openEl.innerText = `Tanggal 1 (Awal Bulan)`;
      if (closeEl) closeEl.innerText = `Akhir Bulan (28/29/30/31)`;
      if (exampleEl) exampleEl.innerHTML = `📅 Periode Penggajian Bulan Ini: <span class="badge-range">${range.displayRange} (1 Bulan Penuh)</span>`;
    }
  }

  toggleRateInput() {
    const isManual = document.getElementById('rate-manual').checked;
    document.getElementById('group-manual-rate').style.display = isManual ? 'block' : 'none';
    this.updateSettingsRatePreview();
  }

  updateSettingsRatePreview() {
    const isManual = document.getElementById('rate-manual')?.checked;
    let rate = 0;
    if (isManual) {
      rate = this.parseCurrencyValue(document.getElementById('set-manual-rate')?.value) || 0;
    } else {
      const base = this.parseCurrencyValue(document.getElementById('set-base-salary')?.value) || 0;
      rate = Math.round(base / 173);
    }
    const el = document.getElementById('set-effective-rate');
    if (el) el.innerText = `${this.formatRupiah(rate)} / jam`;
  }

  renderDynamicAllowances() {
    const emp = this.state.getActiveEmployee();
    const container = document.getElementById('allowances-container');
    const items = emp.allowances || [];
    if (items.length === 0) {
      container.innerHTML = `<div class="empty-dynamic-hint">Belum ada tunjangan bulanan tetap. Tekan tombol <strong>+ Tambah Tunjangan</strong> di bawah untuk memasukkan nama & nominal secara manual.</div>`;
    } else {
      container.innerHTML = items.map((item, index) => `
        <div class="dynamic-row">
          <input type="text" class="form-control allowance-name" placeholder="Nama Tunjangan" value="${item.name}">
          <div class="currency-input-wrap" style="flex:1;">
            <span class="currency-prefix">Rp</span>
            <input type="text" class="form-control allowance-amount" inputmode="numeric" placeholder="Nominal" value="${this.formatNominalOnly(item.amount)}" oninput="app.handleCurrencyInput(this); app.updateSettingsTotals();">
          </div>
          <button type="button" class="btn-delete-item" onclick="app.removeAllowanceField(${index})">&times;</button>
        </div>
      `).join('');
    }
    this.updateSettingsTotals();
  }

  addAllowanceField() {
    const emp = this.state.getActiveEmployee();
    if (!emp.allowances) emp.allowances = [];
    emp.allowances.push({ name: '', amount: 0 });
    this.renderDynamicAllowances();
  }

  removeAllowanceField(index) {
    const emp = this.state.getActiveEmployee();
    emp.allowances.splice(index, 1);
    this.renderDynamicAllowances();
  }

  renderDynamicDeductions() {
    const emp = this.state.getActiveEmployee();
    const container = document.getElementById('deductions-container');
    const items = emp.deductions || [];
    if (items.length === 0) {
      container.innerHTML = `<div class="empty-dynamic-hint">Belum ada potongan bulanan tetap. Tekan tombol <strong>+ Tambah Potongan</strong> di bawah untuk memasukkan nama & nominal secara manual.</div>`;
    } else {
      container.innerHTML = items.map((item, index) => `
        <div class="dynamic-row">
          <input type="text" class="form-control deduction-name" placeholder="Nama Potongan" value="${item.name}">
          <div class="currency-input-wrap" style="flex:1;">
            <span class="currency-prefix">Rp</span>
            <input type="text" class="form-control deduction-amount" inputmode="numeric" placeholder="Nominal" value="${this.formatNominalOnly(item.amount)}" oninput="app.handleCurrencyInput(this); app.updateSettingsTotals();">
          </div>
          <button type="button" class="btn-delete-item" onclick="app.removeDeductionField(${index})">&times;</button>
        </div>
      `).join('');
    }
    this.updateSettingsTotals();
  }

  addDeductionField() {
    const emp = this.state.getActiveEmployee();
    if (!emp.deductions) emp.deductions = [];
    emp.deductions.push({ name: '', amount: 0 });
    this.renderDynamicDeductions();
  }

  removeDeductionField(index) {
    const emp = this.state.getActiveEmployee();
    emp.deductions.splice(index, 1);
    this.renderDynamicDeductions();
  }

  updateSettingsTotals() {
    let totalA = 0;
    document.querySelectorAll('#allowances-container .allowance-amount').forEach(el => {
      totalA += this.parseCurrencyValue(el.value) || 0;
    });
    const pillA = document.getElementById('set-total-allowances');
    if (pillA) pillA.innerText = this.formatRupiah(totalA);

    let totalD = 0;
    document.querySelectorAll('#deductions-container .deduction-amount').forEach(el => {
      totalD += this.parseCurrencyValue(el.value) || 0;
    });
    const pillD = document.getElementById('set-total-deductions');
    if (pillD) pillD.innerText = this.formatRupiah(totalD);
  }

  handleSaveSettings(e) {
    e.preventDefault();
    const emp = this.state.getActiveEmployee();

    emp.name = document.getElementById('set-emp-name').value.trim() || 'Mr. Steven';
    emp.position = document.getElementById('set-emp-position').value.trim();
    emp.company = document.getElementById('set-emp-company').value.trim();
    emp.baseSalary = this.parseCurrencyValue(document.getElementById('set-base-salary').value) || 5000000;
    emp.rateMethod = document.getElementById('rate-manual').checked ? 'manual' : 'depnaker';
    emp.manualRate = this.parseCurrencyValue(document.getElementById('set-manual-rate').value) || 35000;
    emp.cutoffMode = document.getElementById('cutoff-custom')?.checked ? 'custom' : 'calendar';
    emp.cutoffCloseDay = Number(document.getElementById('set-cutoff-day')?.value) || 25;

    // Collect allowances
    const allowances = [];
    document.querySelectorAll('#allowances-container .dynamic-row').forEach(row => {
      const name = row.querySelector('.allowance-name').value.trim();
      const amount = this.parseCurrencyValue(row.querySelector('.allowance-amount').value) || 0;
      if (name) allowances.push({ name, amount });
    });
    emp.allowances = allowances;

    // Collect deductions
    const deductions = [];
    document.querySelectorAll('#deductions-container .dynamic-row').forEach(row => {
      const name = row.querySelector('.deduction-name').value.trim();
      const amount = this.parseCurrencyValue(row.querySelector('.deduction-amount').value) || 0;
      if (name) deductions.push({ name, amount });
    });
    emp.deductions = deductions;

    // Recalculate overtime pay for this employee's records
    this.state.entries = this.state.entries.map(entry => {
      if (entry.employeeId === emp.id) {
        const calc = this.state.calculateOvertimePay(entry.hours, entry.dayType, emp);
        return { ...entry, totalPay: calc.totalPay };
      }
      return entry;
    });

    this.state.saveAllData();
    this.renderAll();
    this.showToast(`Pengaturan untuk ${emp.name} berhasil disimpan!`);
    this.switchTab('dashboard');
  }

  // EXPORT FITUR: EXCEL (.CSV FORMAT DENGAN BOM UTF-8 UNTUK MS EXCEL)
  exportMonthToExcel(month) {
    const targetMonth = month || this.state.currentMonth;
    const emp = this.state.getActiveEmployee();
    const entries = this.getActiveMonthEntries(targetMonth);
    const rangeInfo = this.getPayrollDateRange(targetMonth, emp);

    if (entries.length === 0) {
      alert(`Tidak ada data lembur di bulan ${this.formatMonthDisplay(targetMonth)}.`);
      return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += `LAPORAN PRESENSI & OVERTIME - ${emp.company || 'PERUSAHAAN'}\n`;
    csv += `Nama Karyawan:,"${emp.name}"\n`;
    csv += `Jabatan:,"${emp.position || '-'}"\n`;
    csv += `Periode:,"${this.formatMonthDisplay(targetMonth)}"\n`;
    csv += `Rentang Siklus:,"${rangeInfo.displayRange}"\n`;
    csv += `Sistem Pembukuan:,"${rangeInfo.summary}"\n\n`;

    csv += 'Tanggal,Mode Input,Jenis Hari,Jam Kerja Normal,Jam Lembur,Durasi Lembur (Jam),Uang Lembur (Rp),Tunjangan Harian (Rp),Potongan Harian (Rp),Keterangan Pekerjaan\n';

    let totalOtPay = 0;
    let totalOtHours = 0;
    let totalDailyAllowances = 0;
    let totalDailyDeductions = 0;

    entries.forEach(e => {
      const day = e.dayType === 'holiday' ? 'Hari Libur / Weekend' : 'Hari Kerja';
      let modeText = 'Hanya Lembur';
      if (e.inputMode === 'regular_and_overtime') modeText = 'Kerja + Lembur';
      if (e.inputMode === 'regular_only') modeText = 'Hadir Normal Saja';

      const regTime = e.inputMode !== 'overtime_only' ? `${e.regularStartTime || '08:00'} - ${e.regularEndTime || '17:00'} (${e.regularHours || 8} Jam)` : '-';
      const otTime = e.inputMode !== 'regular_only' ? `${e.startTime || '-'} - ${e.endTime || '-'}` : '-';
      const notes = `"${(e.notes || '').replace(/"/g, '""')}"`;

      const dAllow = Number(e.dailyAllowance) || 0;
      const dDeduct = Number(e.dailyDeduction) || 0;
      totalOtPay += Number(e.totalPay) || 0;
      totalOtHours += Number(e.hours) || 0;
      totalDailyAllowances += dAllow;
      totalDailyDeductions += dDeduct;

      csv += `${e.date},"${modeText}","${day}","${regTime}","${otTime}",${e.hours},${e.totalPay},${dAllow},${dDeduct},${notes}\n`;
    });

    csv += `\nTOTAL REKAPITULASI\n`;
    csv += `Total Hari:,"${entries.length} Hari"\n`;
    csv += `Total Jam Lembur:,"${totalOtHours.toFixed(1)} Jam"\n`;
    csv += `Total Uang Lembur:,${totalOtPay}\n`;
    csv += `Gaji Pokok:,${emp.baseSalary}\n`;
    const totFixedAllow = (emp.allowances || []).reduce((a, c) => a + (Number(c.amount) || 0), 0);
    const totFixedDeduct = (emp.deductions || []).reduce((a, c) => a + (Number(c.amount) || 0), 0);
    const totAllowances = totFixedAllow + totalDailyAllowances;
    const totDeductions = totFixedDeduct + totalDailyDeductions;
    csv += `Tunjangan Tetap Bulanan:,${totFixedAllow}\n`;
    csv += `Tunjangan Harian Presensi/Lembur:,${totalDailyAllowances}\n`;
    csv += `Total Seluruh Tunjangan:,${totAllowances}\n`;
    csv += `Potongan Tetap Bulanan:,${totFixedDeduct}\n`;
    csv += `Potongan Harian Presensi/Lembur:,${totalDailyDeductions}\n`;
    csv += `Total Seluruh Potongan:,${totDeductions}\n`;
    csv += `GAJI BERSIH (TAKE HOME PAY):,${Number(emp.baseSalary) + totalOtPay + totAllowances - totDeductions}\n`;

    const fileName = `Laporan_Gaji_${emp.name.replace(/\s+/g, '_')}_${targetMonth}.csv`;
    if (window.AndroidBridge && typeof window.AndroidBridge.exportExcelFile === 'function') {
      window.AndroidBridge.exportExcelFile(csv, fileName);
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showToast('Laporan Excel berhasil diunduh!');
  }

  exportAllMonthsToExcel() {
    const emp = this.state.getActiveEmployee();
    const empEntries = this.state.entries.filter(e => e.employeeId === emp.id);

    const monthsSet = new Set(empEntries.map(e => this.getPayrollPeriodForDate(e.date, emp)));
    monthsSet.add(this.state.currentMonth);
    const sortedMonthsAsc = Array.from(monthsSet).sort();

    let csv = '\uFEFF';
    csv += `REKAPITULASI GAJI BULANAN & AKUMULASI - ${emp.company || 'PERUSAHAAN'}\n`;
    csv += `Nama Karyawan:,"${emp.name}"\n`;
    csv += `Jabatan:,"${emp.position || '-'}"\n\n`;

    csv += 'Periode Bulan,Rentang Tanggal,Total Kehadiran (Hari),Total Jam Lembur,Gaji Pokok (Rp),Total Uang Lembur (Rp),Tunjangan (Rp),Potongan (Rp),Gaji Bersih / THP (Rp),Akumulasi Gaji Bersih (Rp)\n';

    const baseSalary = Number(emp.baseSalary) || 0;
    const totFixedAllow = (emp.allowances || []).reduce((a, c) => a + (Number(c.amount) || 0), 0);
    const totFixedDeduct = (emp.deductions || []).reduce((a, c) => a + (Number(c.amount) || 0), 0);

    let runningCumul = 0;
    const rows = sortedMonthsAsc.map(mStr => {
      const mEntries = empEntries.filter(e => this.getPayrollPeriodForDate(e.date, emp) === mStr);
      const hours = mEntries.reduce((a, c) => a + (Number(c.hours) || 0), 0);
      const otPay = mEntries.reduce((a, c) => a + (Number(c.totalPay) || 0), 0);
      const mDailyAllowances = mEntries.reduce((a, c) => a + (Number(c.dailyAllowance) || 0), 0);
      const mDailyDeductions = mEntries.reduce((a, c) => a + (Number(c.dailyDeduction) || 0), 0);
      const mTotAllowances = totFixedAllow + mDailyAllowances;
      const mTotDeductions = totFixedDeduct + mDailyDeductions;
      const thp = baseSalary + otPay + mTotAllowances - mTotDeductions;
      runningCumul += thp;
      const rInfo = this.getPayrollDateRange(mStr, emp);

      return `"${this.formatMonthDisplay(mStr)}","${rInfo.displayRange}",${mEntries.length},${hours.toFixed(1)},${baseSalary},${otPay},${mTotAllowances},${mTotDeductions},${thp},${runningCumul}`;
    });

    csv += rows.reverse().join('\n') + '\n';

    const allFileName = `Rekap_Gaji_dan_Akumulasi_${emp.name.replace(/\s+/g, '_')}.csv`;
    if (window.AndroidBridge && typeof window.AndroidBridge.exportExcelFile === 'function') {
      window.AndroidBridge.exportExcelFile(csv, allFileName);
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = allFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showToast('Semua rekap bulanan & akumulasi berhasil diunduh!');
  }

  printSlipModal() {
    if (window.AndroidBridge && typeof window.AndroidBridge.printCurrentPage === 'function') {
      window.AndroidBridge.printCurrentPage('Slip Gaji - GajiKu');
      return;
    }
    window.print();
  }

  // EXPORT FITUR: CETAK SLIP GAJI / REKAP PDF
  openSlipModal(month) {
    const targetMonth = month || this.state.currentMonth;
    const emp = this.state.getActiveEmployee();
    const monthEntries = this.getActiveMonthEntries(targetMonth);
    const rangeInfo = this.getPayrollDateRange(targetMonth, emp);

    const totalHours = monthEntries.reduce((acc, cur) => acc + (Number(cur.hours) || 0), 0);
    const totalOvertimePay = monthEntries.reduce((acc, cur) => acc + (Number(cur.totalPay) || 0), 0);
    const workDays = monthEntries.length;

    const baseSalary = Number(emp.baseSalary) || 0;
    const allowances = emp.allowances || [];
    const deductions = emp.deductions || [];

    const fixedAllowances = allowances.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
    const fixedDeductions = deductions.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
    const dailyAllowancesSum = monthEntries.reduce((acc, cur) => acc + (Number(cur.dailyAllowance) || 0), 0);
    const dailyDeductionsSum = monthEntries.reduce((acc, cur) => acc + (Number(cur.dailyDeduction) || 0), 0);

    const totalAllowances = fixedAllowances + dailyAllowancesSum;
    const totalDeductions = fixedDeductions + dailyDeductionsSum;
    const takeHomePay = baseSalary + totalOvertimePay + totalAllowances - totalDeductions;

    const slipContent = document.getElementById('slip-content');
    slipContent.innerHTML = `
      <div class="payslip-container">
        <div class="payslip-header">
          <h2>SLIP GAJI KARYAWAN</h2>
          <div class="comp-name">${emp.company || 'PERUSAHAAN'}</div>
          <div class="payslip-period">Periode: ${this.formatMonthDisplay(targetMonth)} (${rangeInfo.displayRange})</div>
          <div class="payslip-cutoff-badge" style="font-size:0.78rem; color:#475569; margin-top:3px;">
            Buka Buku: <strong>${rangeInfo.openDayText}</strong> &bull; Tutup Buku: <strong>${rangeInfo.closeDayText}</strong>
          </div>
        </div>

        <div class="payslip-meta">
          <div>
            <strong>Nama Karyawan:</strong> ${emp.name}<br>
            <strong>Jabatan / Bagian:</strong> ${emp.position || 'Staff'}<br>
            <strong>Status:</strong> Karyawan Tetap
          </div>
          <div style="text-align: right;">
            <strong>Tanggal Cetak:</strong> ${this.formatDateDisplay(new Date().toISOString().split('T')[0])}<br>
            <strong>Total Kehadiran:</strong> ${workDays} Hari Kerja<br>
            <strong>Total Overtime:</strong> ${totalHours.toFixed(1)} Jam
          </div>
        </div>

        <!-- Tabel Pendapatan -->
        <table class="payslip-table">
          <thead>
            <tr>
              <th>A. PENDAPATAN</th>
              <th class="text-right">JUMLAH (RP)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Gaji Pokok</td>
              <td class="text-right">${this.formatRupiah(baseSalary)}</td>
            </tr>
            <tr>
              <td>Uang Lembur (Overtime) - ${totalHours.toFixed(1)} Jam</td>
              <td class="text-right">${this.formatRupiah(totalOvertimePay)}</td>
            </tr>
            ${allowances.map(a => `
              <tr>
                <td>${a.name} (Tunjangan Tetap)</td>
                <td class="text-right">${this.formatRupiah(a.amount)}</td>
              </tr>
            `).join('')}
            ${dailyAllowancesSum > 0 ? `
              <tr>
                <td>Tunjangan Harian (Uang Makan / Transport)</td>
                <td class="text-right">${this.formatRupiah(dailyAllowancesSum)}</td>
              </tr>
            ` : ''}
            <tr style="font-weight: 700; background: #f8fafc;">
              <td>Total Pendapatan Kotor</td>
              <td class="text-right">${this.formatRupiah(baseSalary + totalOvertimePay + totalAllowances)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Tabel Potongan -->
        <table class="payslip-table">
          <thead>
            <tr>
              <th>B. POTONGAN</th>
              <th class="text-right">JUMLAH (RP)</th>
            </tr>
          </thead>
          <tbody>
            ${(deductions.length === 0 && dailyDeductionsSum === 0) ? '<tr><td>Tidak ada potongan</td><td class="text-right">Rp 0</td></tr>' : ''}
            ${deductions.map(d => `
              <tr>
                <td>${d.name} (Potongan Tetap)</td>
                <td class="text-right">${this.formatRupiah(d.amount)}</td>
              </tr>
            `).join('')}
            ${dailyDeductionsSum > 0 ? `
              <tr>
                <td>Potongan Harian (Kasbon / Denda)</td>
                <td class="text-right">${this.formatRupiah(dailyDeductionsSum)}</td>
              </tr>
            ` : ''}
            <tr style="font-weight: 700; background: #f8fafc;">
              <td>Total Potongan</td>
              <td class="text-right">${this.formatRupiah(totalDeductions)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Total Bersih -->
        <table class="payslip-table">
          <tbody>
            <tr class="payslip-total-row">
              <td>GAJI BERSIH (TAKE HOME PAY)</td>
              <td class="text-right">${this.formatRupiah(takeHomePay)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Signatures -->
        <div class="payslip-signatures">
          <div>
            Penerima / Karyawan
            <div class="sig-space"></div>
            <strong>( ${emp.name} )</strong>
          </div>
          <div>
            Bagian Keuangan / HRD
            <div class="sig-space"></div>
            <strong>( ${emp.company || 'Manajemen'} )</strong>
          </div>
        </div>

        <div class="payslip-branding-footer">
          Dicetak melalui <strong>GajiKu</strong> • <em>Release by RDA</em><br>
          “Transparansi gaji & lembur harian dalam genggaman Anda”
        </div>
      </div>
    `;

    document.getElementById('slip-modal').style.display = 'flex';
  }

  closeSlipModal() {
    document.getElementById('slip-modal').style.display = 'none';
  }

  closeSlipModalOnBackdrop(e) {
    if (e.target.id === 'slip-modal') this.closeSlipModal();
  }

  exportMonthlyReportPDF() {
    const emp = this.state.getActiveEmployee();
    const empEntries = this.state.entries.filter(e => e.employeeId === emp.id);
    const monthsSet = new Set(empEntries.map(e => this.getPayrollPeriodForDate(e.date, emp)));
    monthsSet.add(this.state.currentMonth);
    const sortedMonthsAsc = Array.from(monthsSet).sort();

    const baseSalary = Number(emp.baseSalary) || 0;
    const totFixedAllow = (emp.allowances || []).reduce((a, c) => a + (Number(c.amount) || 0), 0);
    const totFixedDeduct = (emp.deductions || []).reduce((a, c) => a + (Number(c.amount) || 0), 0);

    let runningCumul = 0;
    const monthlyList = sortedMonthsAsc.map(mStr => {
      const mEntries = empEntries.filter(e => this.getPayrollPeriodForDate(e.date, emp) === mStr);
      const hours = mEntries.reduce((a, c) => a + (Number(c.hours) || 0), 0);
      const otPay = mEntries.reduce((a, c) => a + (Number(c.totalPay) || 0), 0);
      const mDailyAllowances = mEntries.reduce((a, c) => a + (Number(c.dailyAllowance) || 0), 0);
      const mDailyDeductions = mEntries.reduce((a, c) => a + (Number(c.dailyDeduction) || 0), 0);
      const mTotAllowances = totFixedAllow + mDailyAllowances;
      const mTotDeductions = totFixedDeduct + mDailyDeductions;
      const thp = baseSalary + otPay + mTotAllowances - mTotDeductions;
      runningCumul += thp;
      const rInfo = this.getPayrollDateRange(mStr, emp);
      return { mStr, days: mEntries.length, hours, otPay, thp, cumul: runningCumul, rangeText: rInfo.displayRange };
    });

    const slipContent = document.getElementById('slip-content');
    slipContent.innerHTML = `
      <div class="payslip-container">
        <div class="payslip-header">
          <h2>REKAPITULASI GAJI BULANAN & AKUMULASI</h2>
          <div class="comp-name">${emp.company || 'PERUSAHAAN'}</div>
          <div class="payslip-period">Karyawan: <strong>${emp.name}</strong> (${emp.position || 'Staff'})</div>
        </div>

        <table class="payslip-table">
          <thead>
            <tr>
              <th>Periode Bulan</th>
              <th>Hadir</th>
              <th>Jam OT</th>
              <th class="text-right">Uang Lembur</th>
              <th class="text-right">Gaji Bersih</th>
              <th class="text-right">Akumulasi s/d Bulan</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyList.map(item => `
              <tr>
                <td>
                  <strong>${this.formatMonthDisplay(item.mStr)}</strong><br>
                  <small style="color:#64748b; font-size:0.75rem;">${item.rangeText}</small>
                </td>
                <td>${item.days} Hari</td>
                <td>${item.hours.toFixed(1)} Jam</td>
                <td class="text-right">${this.formatRupiah(item.otPay)}</td>
                <td class="text-right" style="font-weight:700;">${this.formatRupiah(item.thp)}</td>
                <td class="text-right" style="font-weight:700; color:var(--primary);">${this.formatRupiah(item.cumul)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; margin-top:16px; font-size:0.85rem;">
          <strong>Total Akumulasi Terkumpul:</strong> <span style="font-size:1.1rem; font-weight:800; color:#1e3a8a;">${this.formatRupiah(runningCumul)}</span>
        </div>

        <div class="payslip-signatures" style="margin-top: 40px;">
          <div>
            Penerima / Karyawan
            <div class="sig-space"></div>
            <strong>( ${emp.name} )</strong>
          </div>
          <div>
            Bagian Keuangan
            <div class="sig-space"></div>
            <strong>( ${emp.company || 'Manajemen'} )</strong>
          </div>
        </div>

        <div class="payslip-branding-footer">
          Laporan Rekapitulasi <strong>GajiKu</strong> • <em>Release by RDA</em><br>
          “Transparansi gaji & lembur harian dalam genggaman Anda”
        </div>
      </div>
    `;

    document.getElementById('slip-modal').style.display = 'flex';
  }

  // Backup & Restore
  backupData() {
    const backupObj = {
      app: 'GajiKu',
      version: '4.0',
      exportDate: new Date().toISOString(),
      employees: this.state.employees,
      activeEmployeeId: this.state.activeEmployeeId,
      entries: this.state.entries
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_GajiKu_MultiUser_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showToast('Cadangan data berhasil diunduh!');
  }

  restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.employees && data.entries) {
          this.state.employees = data.employees;
          this.state.activeEmployeeId = data.activeEmployeeId || data.employees[0].id;
          this.state.entries = data.entries;
          this.state.saveAllData();
          this.renderAll();
          this.showToast('Data berhasil dipulihkan!');
        } else {
          alert('Format file cadangan tidak cocok.');
        }
      } catch (err) {
        alert('Gagal membaca file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  resetAllData() {
    if (confirm('PERINGATAN: Semua karyawan dan catatan lembur akan dihapus. Yakin?')) {
      localStorage.removeItem(STORAGE_KEYS.DATA);
      this.state.employees = [{ ...DEFAULT_EMPLOYEE }];
      this.state.activeEmployeeId = 'emp_1';
      this.state.entries = [];
      this.state.saveAllData();
      this.renderAll();
      this.showToast('Semua data berhasil dibersihkan.');
    }
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('ServiceWorker registered:', reg.scope))
          .catch(err => console.log('ServiceWorker error:', err));
      });
    }
  }
}

// Global instance
const app = new AppController();
