// Utility Formatting
const formatCurrency = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

const formatUnit = (num) => {
  if (isNaN(num) || num < 100000) return '';
  if (num >= 10000000) return `(${(num / 10000000).toFixed(2)} Cr)`;
  if (num >= 100000) return `(${(num / 100000).toFixed(2)} L)`;
  return '';
};

const formatSmallUnit = (val) => {
  const unit = formatUnit(val);
  return unit ? `<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: 4px;">${unit}</span>` : '';
};

// Auto-update input units
function updateInputUnits() {
  const currencyInputs = document.querySelectorAll('input[data-currency="true"]');
  currencyInputs.forEach(input => {
    const val = parseFloat(input.value) || 0;
    const unitDiv = document.getElementById(`unit-${input.id}`);
    if (unitDiv) unitDiv.innerText = formatUnit(val).replace('(', '').replace(')', '');

    input.addEventListener('input', function () {
      const currentVal = parseFloat(this.value) || 0;
      unitDiv.innerText = formatUnit(currentVal).replace('(', '').replace(')', '');
    });
  });
}

// SWP Dynamic Readout
function updateSWRReadout() {
  const total = parseFloat(document.getElementById('swpTotal').value) || 0;
  const swr = parseFloat(document.getElementById('swpSWR').value) || 0;
  const monthly = (total * (swr / 100)) / 12;

  const readoutDiv = document.getElementById('swrReadout');
  if (total > 0 && swr > 0) {
    readoutDiv.innerText = `≈ ${formatCurrency(monthly)} / month`;
  } else {
    readoutDiv.innerText = '';
  }
}

// Global Stores
let globalNetWorth = 0;
let globalIAWorth = 0;

function toggleSWPInput() {
  const method = document.getElementById('swpMethod').value;
  if (method === 'swr') {
    document.querySelector('.swp-swr-input').style.display = 'flex';
    document.querySelector('.swp-income-input').style.display = 'none';
    updateSWRReadout();
  } else {
    document.querySelector('.swp-swr-input').style.display = 'none';
    document.querySelector('.swp-income-input').style.display = 'flex';
  }
}

// Pull Inflation Adjusted Worth into SWP Input
function pullIAWorthToSWP() {
  if (globalIAWorth > 0) {
    const swpInput = document.getElementById('swpTotal');
    swpInput.value = Math.round(globalIAWorth);
    swpInput.dispatchEvent(new Event('input'));
    updateSWRReadout();
  } else {
    alert("Please calculate Inflation Value first.");
  }
}

function pullNetWorthToInflation() {
  if (globalNetWorth > 0) {
    const infInput = document.getElementById('infCorpus');
    infInput.value = Math.round(globalNetWorth);
    infInput.dispatchEvent(new Event('input'));
  }
}

function calculateInflation() {
  const corpus = parseFloat(document.getElementById('infCorpus').value) || 0;
  const rate = parseFloat(document.getElementById('infRate').value) || 0;
  const years = parseInt(document.getElementById('infHorizon').value) || 0;

  // Formula: Value / (1 + r)^n
  let adjustedValue = corpus / Math.pow(1 + (rate / 100), years);
  globalIAWorth = adjustedValue; // Store globally for SWP

  document.getElementById('resInfValue').innerHTML = `${formatCurrency(adjustedValue)} ${formatSmallUnit(adjustedValue)}`;
}

function calculateNetWorth() {

  // Core parameters
  const sipAmt = parseFloat(document.getElementById('sipAmount').value) || 0;
  const sipStep = parseFloat(document.getElementById('sipStepUp').value) || 0;
  const sipRet = (parseFloat(document.getElementById('sipReturn').value) || 0) / 12 / 100;
  const sipInf = parseFloat(document.getElementById('sipInflation').value) || 0;
  const sipHoriz = parseInt(document.getElementById('sipHorizon').value) || 0;

  const savAmtBase = parseFloat(document.getElementById('savAmount').value) || 0;
  const savStep = parseFloat(document.getElementById('savStepUp').value) || 0;
  const savRet = (parseFloat(document.getElementById('savReturn').value) || 0) / 12 / 100;
  const savHoriz = parseInt(document.getElementById('savHorizon').value) || 0;

  const epfSal = parseFloat(document.getElementById('epfSalary').value) || 0;
  const epfBasicPct = parseFloat(document.getElementById('epfBasicPercent').value) || 0;
  const epfHike = parseFloat(document.getElementById('epfHike').value) || 0;
  const epfRate = (parseFloat(document.getElementById('epfRate').value) || 0) / 12 / 100;
  const epfEmp = parseFloat(document.getElementById('epfEmp').value) || 0;
  const epfEmpr = parseFloat(document.getElementById('epfEmpr').value) || 0;
  const epfHoriz = parseInt(document.getElementById('epfHorizon').value) || 0;

  // --- 1. SIP Logic (Summary Box) ---
  let sipCorpus = 0; let sipValue = 0; let currSipSum = sipAmt;
  for (let y = 1; y <= sipHoriz; y++) {
    for (let m = 1; m <= 12; m++) {
      sipCorpus += currSipSum;
      sipValue = (sipValue + currSipSum) * (1 + sipRet);
    }
    currSipSum *= (1 + (sipStep / 100));
  }
  document.getElementById('resSipCorpus').innerHTML = `${formatCurrency(sipCorpus)} ${formatSmallUnit(sipCorpus)}`;
  document.getElementById('resSipGains').innerHTML = `${formatCurrency(sipValue - sipCorpus)} ${formatSmallUnit(sipValue - sipCorpus)}`;
  document.getElementById('resSipTotal').innerHTML = `${formatCurrency(sipValue)} ${formatSmallUnit(sipValue)}`;

  // --- 2. Savings Logic (Summary Box) ---
  let savCorpus = 0; let savValue = 0; let currSavSum = savAmtBase;
  for (let y = 1; y <= savHoriz; y++) {
    for (let m = 1; m <= 12; m++) {
      savCorpus += currSavSum;
      savValue = (savValue + currSavSum) * (1 + savRet);
    }
    currSavSum *= (1 + (savStep / 100));
  }
  document.getElementById('resSavCorpus').innerHTML = `${formatCurrency(savCorpus)} ${formatSmallUnit(savCorpus)}`;
  document.getElementById('resSavGains').innerHTML = `${formatCurrency(savValue - savCorpus)} ${formatSmallUnit(savValue - savCorpus)}`;
  document.getElementById('resSavTotal').innerHTML = `${formatCurrency(savValue)} ${formatSmallUnit(savValue)}`;

  // --- 3. EPF Logic (Summary Box) ---
  let epfCorpus = 0; let epfValue = 0; let currSalSum = epfSal;
  for (let y = 1; y <= epfHoriz; y++) {
    for (let m = 1; m <= 12; m++) {
      // EPF is calculated on Basic Pay, not Gross Salary
      let basicPay = currSalSum * (epfBasicPct / 100);
      let monthlyContrib = basicPay * ((epfEmp + epfEmpr) / 100);
      epfCorpus += monthlyContrib;
      epfValue = (epfValue + monthlyContrib) * (1 + epfRate);
    }
    currSalSum *= (1 + (epfHike / 100));
  }
  document.getElementById('resEpfCorpus').innerHTML = `${formatCurrency(epfCorpus)} ${formatSmallUnit(epfCorpus)}`;
  document.getElementById('resEpfGains').innerHTML = `${formatCurrency(epfValue - epfCorpus)} ${formatSmallUnit(epfValue - epfCorpus)}`;
  document.getElementById('resEpfTotal').innerHTML = `${formatCurrency(epfValue)} ${formatSmallUnit(epfValue)}`;

  // --- Grand Totals ---
  const totalCorpus = sipCorpus + savCorpus + epfCorpus;
  const totalValue = sipValue + savValue + epfValue;
  const totalGains = totalValue - totalCorpus;

  globalNetWorth = totalValue;

  document.getElementById('nwTotal').innerText = formatCurrency(totalValue);
  document.getElementById('nwUnit').innerText = formatUnit(totalValue);
  document.getElementById('nwCorpus').innerText = formatCurrency(totalCorpus);
  document.getElementById('nwCorpusUnit').innerText = formatUnit(totalCorpus);
  document.getElementById('nwGains').innerText = formatCurrency(totalGains);
  document.getElementById('nwGainsUnit').innerText = formatUnit(totalGains);


  // --- 4. Net Worth Table Generation ---
  const sipTbody = document.getElementById('sipTableBody');
  sipTbody.innerHTML = '';

  let tableCurrSip = sipAmt;
  let tableCurrSav = savAmtBase;
  let tableCurrSal = epfSal;
  let tableSipValue = 0;

  // Find the maximum horizon across all investments so the table shows the full journey
  let maxHoriz = Math.max(sipHoriz, savHoriz, epfHoriz);
  if (maxHoriz === 0) maxHoriz = 15; // default fallback

  for (let y = 1; y <= maxHoriz; y++) {
    // Only display active investments for their specific horizons
    let displaySip = y <= sipHoriz ? tableCurrSip : 0;
    let displaySav = y <= savHoriz ? tableCurrSav : 0;
    let displaySal = y <= epfHoriz ? tableCurrSal : 0;

    // Portfolio compounding logic (compounds even if you stop contributing)
    for (let m = 1; m <= 12; m++) {
      if (y <= sipHoriz) tableSipValue = (tableSipValue + displaySip) * (1 + sipRet);
      else tableSipValue = tableSipValue * (1 + sipRet);
    }

    // Apply shared inflation factor (based on SIP inflation rate field)
    let inflationFactor = Math.pow(1 + (sipInf / 100), y);
    let infAdjSal = displaySal / inflationFactor;
    let infAdjSip = displaySip / inflationFactor;
    let infAdjSav = displaySav / inflationFactor;
    let infAdjValue = tableSipValue / inflationFactor;

    let row = document.createElement('tr');
    row.innerHTML = `
            <td>${y}</td>
            <td style="font-weight: 500;">${displaySal > 0 ? formatCurrency(displaySal) + ' <br>' + formatSmallUnit(displaySal) : '-'}</td>
            <td style="color: var(--accent-orange); font-weight: 500;">${displaySal > 0 ? formatCurrency(infAdjSal) + ' <br>' + formatSmallUnit(infAdjSal) : '-'}</td>
            <td>${displaySip > 0 ? formatCurrency(displaySip) + ' <br>' + formatSmallUnit(displaySip) : '-'}</td>
            <td style="color: var(--accent-purple);">${displaySip > 0 ? formatCurrency(infAdjSip) + ' <br>' + formatSmallUnit(infAdjSip) : '-'}</td>
            <td>${displaySav > 0 ? formatCurrency(displaySav) + ' <br>' + formatSmallUnit(displaySav) : '-'}</td>
            <td style="color: var(--accent-purple);">${displaySav > 0 ? formatCurrency(infAdjSav) + ' <br>' + formatSmallUnit(infAdjSav) : '-'}</td>
            <td>${formatCurrency(tableSipValue)} <br>${formatSmallUnit(tableSipValue)}</td>
            <td style="color: var(--accent-green);">${formatCurrency(infAdjValue)} <br>${formatSmallUnit(infAdjValue)}</td>
        `;
    sipTbody.appendChild(row);

    // Step up amounts for next year calculation
    if (y <= sipHoriz) tableCurrSip *= (1 + (sipStep / 100));
    if (y <= savHoriz) tableCurrSav *= (1 + (savStep / 100));
    if (y <= epfHoriz) tableCurrSal *= (1 + (epfHike / 100));
  }

  document.getElementById('sipTableSection').style.display = 'flex';
}

// SWP Logic
function calculateSWP() {
  const totalInv = parseFloat(document.getElementById('swpTotal').value) || 0;
  const returnRate = (parseFloat(document.getElementById('swpReturn').value) || 0) / 12 / 100;
  const inflation = parseFloat(document.getElementById('swpInflation').value) || 0;
  const horizon = parseInt(document.getElementById('swpHorizon').value) || 0;
  const method = document.getElementById('swpMethod').value;

  let initialMonthly = 0;
  if (method === 'swr') {
    const swr = parseFloat(document.getElementById('swpSWR').value) || 0;
    initialMonthly = (totalInv * (swr / 100)) / 12;
  } else {
    initialMonthly = parseFloat(document.getElementById('swpIncome').value) || 0;
  }

  let portfolio = totalInv;
  let currentMonthly = initialMonthly;

  const tbody = document.getElementById('swpTableBody');
  tbody.innerHTML = '';

  for (let year = 1; year <= horizon; year++) {

    if (year > 1) {
      currentMonthly *= (1 + (inflation / 100));
    }

    for (let month = 1; month <= 12; month++) {
      if (portfolio > 0) {
        portfolio = portfolio * (1 + returnRate) - currentMonthly;
      }
      if (portfolio < 0) portfolio = 0;
    }

    // Calculate Inflation Adjusted Portfolio remaining at the end of the year
    let inflationFactor = Math.pow(1 + (inflation / 100), year);
    let adjPortfolio = portfolio / inflationFactor;

    let row = document.createElement('tr');
    row.innerHTML = `
            <td>${year}</td>
            <td style="color: var(--accent-orange); font-weight: 500;">${formatCurrency(currentMonthly)} <br>${formatSmallUnit(currentMonthly)}</td>
            <td style="color: ${portfolio > 0 ? 'inherit' : 'var(--danger)'};">${formatCurrency(portfolio)} <br>${formatSmallUnit(portfolio)}</td>
            <td style="color: var(--accent-green);">${formatCurrency(adjPortfolio)} <br>${formatSmallUnit(adjPortfolio)}</td>
        `;
    tbody.appendChild(row);

    if (portfolio <= 0) break;
  }

  document.getElementById('swpTableSection').style.display = 'flex';
}

// Run setup on load
window.onload = () => {
  updateInputUnits();

  document.getElementById('swpTotal').addEventListener('input', updateSWRReadout);
  document.getElementById('swpSWR').addEventListener('input', updateSWRReadout);

  calculateInflation(); // Pre-calculate inflation to populate globalIAWorth
  calculateNetWorth();  // Builds dashboard
  updateSWRReadout();   // Ensures the SWR helper text loads instantly
};