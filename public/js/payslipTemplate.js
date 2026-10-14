/**
 * AssistHealth Payslip - calculation + HTML template
 * Layout mirrors AssistHealth_Payslip_Revised.pdf. Styles live in css/payroll.css (.ps-*).
 */
(function () {
    const COMPANY = {
        name: 'AssistHealth Tech Solutions Pvt Ltd',
        address: '#850, 3rd Floor, D Block, Opp Cafe Coffee Day, Sahakar Nagar, Bangalore 560092',
        contact: 'support@assisthealth.in | +91-9611232519 / 69 / 93',
        logo: 'images/Payslip.png'
    };

    const PAYMENT_MODES = ['Bank Transfer (NEFT)', 'Bank Transfer (IMPS)', 'UPI', 'Cheque', 'Cash'];

    const PF_WAGE_CEILING = 15000;
    const PF_RATE = 0.12;

    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];

    const num = (v) => {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
    };
    const hasValue = (v) => v !== null && v !== undefined && v !== '';
    const esc = (v) => (typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? ''));

    function parseMonth(month) {
        const [year, m] = String(month).split('-').map(Number);
        return { year, monthIndex: m - 1, daysInMonth: new Date(year, m, 0).getDate() };
    }

    function monthLabel(month) {
        const { year, monthIndex } = parseMonth(month);
        return `${MONTH_NAMES[monthIndex]} ${year}`;
    }

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function payPeriod(month) {
        const { year, monthIndex, daysInMonth } = parseMonth(month);
        return `01/${pad(monthIndex + 1)}/${year} - ${daysInMonth}/${pad(monthIndex + 1)}/${year}`;
    }

    // Karnataka PT: Rs 200/month when monthly gross >= 25,000 (Rs 300 in February), else nil.
    function karnatakaPT(gross, month) {
        if (gross < 25000) return 0;
        return parseMonth(month).monthIndex === 1 ? 300 : 200;
    }

    // Default LOP for someone who joined part-way through the month.
    function joiningLopDays(employee, month) {
        if (!employee.dateOfJoining) return 0;
        const { year, monthIndex } = parseMonth(month);
        const [jy, jm, jd] = employee.dateOfJoining.split('-').map(Number);
        if (jy === year && jm - 1 === monthIndex) return Math.max(0, jd - 1);
        return 0;
    }

    function defaultInputs() {
        return {
            lopDays: 0,
            incentive: 0,
            bonus: 0,
            tds: 0,
            advance: 0,
            otherDed1: 0,
            otherDed2: 0,
            conveyanceLabel: 'Conveyance Allowance',
            incentiveLabel: 'Overtime / Incentive',
            otherDed1Label: 'Other Deduction 1',
            otherDed2Label: 'Other Deduction 2',
            leaveBalance: '',
            ptOverride: '',
            pfOverride: '',
            employerPfOverride: '',
            paymentMode: PAYMENT_MODES[0],
            paymentDate: ''
        };
    }

    /**
     * Fixed components are prorated by paid days; incentive/bonus are paid as entered.
     */
    function compute(employee, inputs, month) {
        const { daysInMonth } = parseMonth(month);
        const lopDays = Math.min(Math.max(num(inputs.lopDays), 0), daysInMonth);
        const paidDays = daysInMonth - lopDays;
        const ratio = paidDays / daysInMonth;
        const prorate = (v) => Math.round(num(v) * ratio);

        const earnings = {
            basic: prorate(employee.basic),
            hra: prorate(employee.hra),
            specialAllowance: prorate(employee.specialAllowance),
            conveyance: prorate(employee.conveyance),
            incentive: Math.round(num(inputs.incentive)),
            bonus: Math.round(num(inputs.bonus))
        };
        const gross = Object.values(earnings).reduce((a, b) => a + b, 0);

        const autoPf = employee.pfApplicable
            ? Math.round(Math.min(earnings.basic, PF_WAGE_CEILING) * PF_RATE)
            : 0;

        const deductions = {
            pt: hasValue(inputs.ptOverride) ? Math.round(num(inputs.ptOverride)) : karnatakaPT(gross, month),
            tds: Math.round(num(inputs.tds)),
            pf: hasValue(inputs.pfOverride) ? Math.round(num(inputs.pfOverride)) : autoPf,
            advance: Math.round(num(inputs.advance)),
            otherDed1: Math.round(num(inputs.otherDed1)),
            otherDed2: Math.round(num(inputs.otherDed2))
        };
        const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);

        return {
            daysInMonth,
            lopDays,
            paidDays,
            earnings,
            gross,
            deductions,
            totalDeductions,
            net: gross - totalDeductions,
            employerPf: hasValue(inputs.employerPfOverride) ? Math.round(num(inputs.employerPfOverride)) : autoPf,
            autoPt: karnatakaPT(gross, month),
            autoPf
        };
    }

    function monthlyGross(employee) {
        return num(employee.basic) + num(employee.hra) + num(employee.specialAllowance) + num(employee.conveyance);
    }

    // Indian numbering system (lakh / crore)
    function numberToWords(amount) {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
            'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        const twoDigits = (n) => (n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ' ' + ones[n % 10] : ''}`);
        const threeDigits = (n) => {
            const h = Math.floor(n / 100);
            const rest = n % 100;
            return [h ? `${ones[h]} Hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ');
        };

        let n = Math.round(Math.abs(amount));
        if (n === 0) return 'Rupees Zero Only';

        const parts = [];
        const crore = Math.floor(n / 10000000); n %= 10000000;
        const lakh = Math.floor(n / 100000); n %= 100000;
        const thousand = Math.floor(n / 1000); n %= 1000;

        if (crore) parts.push(`${threeDigits(crore)} Crore`);
        if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
        if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
        if (n) parts.push(threeDigits(n));

        return `${amount < 0 ? 'Minus ' : ''}Rupees ${parts.join(' ')} Only`;
    }

    function money(v) {
        return num(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function isoToDisplay(iso) {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    }

    /**
     * Render one A4 payslip page.
     * @param {object} p - { employee, inputs, month, settings, logoSrc }
     */
    function render({ employee, inputs, month, settings = {}, logoSrc }) {
        const c = compute(employee, inputs, month);
        const text = (v) => (hasValue(v) ? esc(v) : '&mdash;');
        const cell = (v, cls = 'ps-val') => `<td class="${cls}">${v}</td>`;
        const amount = (v) => cell(money(v), 'ps-val ps-amt');

        const row = (l1, v1, l2, v2) => `
            <tr><td class="ps-lbl">${l1}</td>${v1}<td class="ps-lbl">${l2}</td>${v2}</tr>`;

        return `
<div class="ps-page">
  <div class="ps-header">
    <div class="ps-company">${esc(COMPANY.name)}</div>
    <img class="ps-logo" src="${logoSrc || COMPANY.logo}" alt="AssistHealth">
  </div>
  <div class="ps-address">${esc(COMPANY.address)}<br>${esc(COMPANY.contact)}</div>

  <table class="ps-grid">
    <colgroup><col style="width:28%"><col style="width:22%"><col style="width:28%"><col style="width:22%"></colgroup>
    ${row('Establishment Reg. No.<br><span class="ps-sub">(Karnataka S&amp;E Act)</span>', cell(text(settings.establishmentRegNo)),
        'PT Registration No.', cell(text(settings.ptRegNo)))}
    ${row('<b>PAYSLIP FOR THE MONTH OF</b>', cell(`<b>${esc(monthLabel(month))}</b>`),
        '<b>Pay Period</b>', cell(esc(payPeriod(month))))}

    <tr class="ps-gap"><td colspan="4"></td></tr>
    <tr class="ps-bar"><td colspan="4">EMPLOYEE DETAILS</td></tr>
    ${row('Employee Name', cell(`<b>${text(employee.name)}</b>`), 'Employee ID', cell(text(employee.employeeId)))}
    ${row('Designation', cell(text(employee.designation)), 'Date of Joining', cell(text(isoToDisplay(employee.dateOfJoining))))}
    ${row('Department', cell(text(employee.department)), 'PAN', cell(text(employee.pan)))}
    ${row('Bank A/c No.', cell(text(employee.bankAccount)), 'Bank Name', cell(text(employee.bankName)))}
    ${row('IFSC', cell(text(employee.ifsc)), 'UAN (only if PF applicable)', cell(text(employee.uan)))}

    <tr class="ps-gap"><td colspan="4"></td></tr>
    <tr class="ps-bar"><td colspan="4">ATTENDANCE</td></tr>
    ${row('Days in Month', cell(c.daysInMonth), 'LOP Days', cell(c.lopDays))}
    ${row('Paid Days', cell(c.paidDays, 'ps-val ps-calc'), 'Leave Balance (optional)', cell(text(inputs.leaveBalance)))}

    <tr class="ps-gap"><td colspan="4"></td></tr>
    <tr class="ps-bar">
      <td>EARNINGS</td><td class="ps-right">Amount (INR)</td>
      <td>DEDUCTIONS</td><td class="ps-right">Amount (INR)</td>
    </tr>
    ${row('Basic Salary', amount(c.earnings.basic), 'Professional Tax (Karnataka)', amount(c.deductions.pt))}
    ${row('HRA', amount(c.earnings.hra), 'TDS (Income Tax)', amount(c.deductions.tds))}
    ${row('Special Allowance', amount(c.earnings.specialAllowance), 'PF - Employee share', amount(c.deductions.pf))}
    ${row(esc(inputs.conveyanceLabel || 'Conveyance Allowance'), amount(c.earnings.conveyance), 'Salary Advance Recovery', amount(c.deductions.advance))}
    ${row(esc(inputs.incentiveLabel || 'Overtime / Incentive'), amount(c.earnings.incentive), esc(inputs.otherDed1Label || 'Other Deduction 1'), amount(c.deductions.otherDed1))}
    ${row('Arrears / Bonus', amount(c.earnings.bonus), esc(inputs.otherDed2Label || 'Other Deduction 2'), amount(c.deductions.otherDed2))}
    <tr>
      <td class="ps-lbl"><b>GROSS EARNINGS (A)</b></td><td class="ps-val ps-calc ps-amt"><b>${money(c.gross)}</b></td>
      <td class="ps-lbl"><b>TOTAL DEDUCTIONS (B)</b></td><td class="ps-val ps-calc ps-amt"><b>${money(c.totalDeductions)}</b></td>
    </tr>
    <tr class="ps-net">
      <td class="ps-lbl"><b>NET PAY (A - B)</b></td>
      <td class="ps-val ps-calc" colspan="3"><b>&#8377; ${money(c.net)}</b></td>
    </tr>
    <tr>
      <td class="ps-lbl">Net Pay in Words</td>
      <td class="ps-val ps-calc" colspan="3">${esc(numberToWords(c.net))}</td>
    </tr>
    ${row('Mode of Payment', cell(text(inputs.paymentMode)), 'Payment Date', cell(text(isoToDisplay(inputs.paymentDate))))}

    <tr class="ps-gap"><td colspan="4"></td></tr>
    <tr class="ps-bar"><td colspan="4">EMPLOYER CONTRIBUTIONS (information only, not part of net pay)</td></tr>
    <tr>
      <td class="ps-lbl">Employer PF contribution<br><span class="ps-sub">(if applicable)</span></td>
      ${amount(c.employerPf)}<td colspan="2"></td>
    </tr>
  </table>

  <div class="ps-footer">This is a computer-generated payslip and does not require signature.</div>
</div>`;
    }

    window.payslipTemplate = {
        COMPANY,
        PAYMENT_MODES,
        compute,
        render,
        defaultInputs,
        joiningLopDays,
        monthlyGross,
        monthLabel,
        numberToWords,
        money
    };
})();
