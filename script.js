// Utility Formatting
const formatCurrency = (num) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);

const formatUnit = (num) => {
  if (isNaN(num) || num < 100000) return "";
  if (num >= 10000000) return `(${(num / 10000000).toFixed(2)} Cr)`;
  if (num >= 100000) return `(${(num / 100000).toFixed(2)} L)`;
  return "";
};

const formatSmallUnit = (val) => {
  const unit = formatUnit(val);
  return unit
    ? `<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: 4px;">${unit}</span>`
    : "";
};

// Clean HTML to Raw Number for CSV Export
const cleanForCSV = (htmlString) => {
  // Creates a dummy element to parse innerText safely without HTML tags
  let tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlString;
  let text = tempDiv.innerText || tempDiv.textContent;
  // Remove Rupee symbol, commas, and unit abbreviations for clean Excel math
  return text
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\(.*?\)/g, "")
    .trim();
};

// CSV Export Function
function exportTableToCSV(tableID, filename) {
  let csv = [];
  let table = document.getElementById(tableID);
  let rows = table.querySelectorAll("tr");

  for (let i = 0; i < rows.length; i++) {
    let row = [],
      cols = rows[i].querySelectorAll("td, th");

    for (let j = 0; j < cols.length; j++) {
      // Clean the data before pushing to CSV
      row.push(`"${cleanForCSV(cols[j].innerHTML)}"`);
    }
    csv.push(row.join(","));
  }

  let csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
  let downloadLink = document.createElement("a");
  downloadLink.download = filename;
  downloadLink.href = window.URL.createObjectURL(csvFile);
  downloadLink.style.display = "none";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// Auto-update input units
function updateInputUnits() {
  const currencyInputs = document.querySelectorAll(
    'input[data-currency="true"]',
  );
  currencyInputs.forEach((input) => {
    const val = parseFloat(input.value) || 0;
    const unitDiv = document.getElementById(`unit-${input.id}`);
    if (unitDiv)
      unitDiv.innerText = formatUnit(val).replace("(", "").replace(")", "");

    input.addEventListener("input", function () {
      const currentVal = parseFloat(this.value) || 0;
      unitDiv.innerText = formatUnit(currentVal)
        .replace("(", "")
        .replace(")", "");
    });
  });
}

// SWP Dynamic Readout
function updateSWRReadout() {
  const total = parseFloat(document.getElementById("swpTotal").value) || 0;
  const swr = parseFloat(document.getElementById("swpSWR").value) || 0;
  const monthly = (total * (swr / 100)) / 12;

  const readoutDiv = document.getElementById("swrReadout");
  if (total > 0 && swr > 0) {
    readoutDiv.innerText = `≈ ${formatCurrency(monthly)} / month`;
  } else {
    readoutDiv.innerText = "";
  }
}

// Global Stores & Chart Instance
let globalNetWorth = 0;
let globalIAWorth = 0;
let globalGainsProportion = 0.5; // Defaults to 50% profit assumption if not calculated
let nwChartInstance = null;

function toggleSWPInput() {
  const method = document.getElementById("swpMethod").value;
  if (method === "swr") {
    document.querySelector(".swp-swr-input").style.display = "flex";
    document.querySelector(".swp-income-input").style.display = "none";
    updateSWRReadout();
  } else {
    document.querySelector(".swp-swr-input").style.display = "none";
    document.querySelector(".swp-income-input").style.display = "flex";
  }
}

function pullIAWorthToSWP() {
  if (globalIAWorth > 0) {
    const swpInput = document.getElementById("swpTotal");
    swpInput.value = Math.round(globalIAWorth);
    swpInput.dispatchEvent(new Event("input"));

    const gainInput = document.getElementById("swpGainProp");
    gainInput.value = (globalGainsProportion * 100).toFixed(1);

    updateSWRReadout();
  } else {
    alert("Please calculate Inflation Value first.");
  }
}

function pullNetWorthToInflation() {
  if (globalNetWorth > 0) {
    const infInput = document.getElementById("infCorpus");
    infInput.value = Math.round(globalNetWorth);
    infInput.dispatchEvent(new Event("input"));
  }
}

function calculateInflation() {
  const corpus = parseFloat(document.getElementById("infCorpus").value) || 0;
  const rate = parseFloat(document.getElementById("infRate").value) || 0;
  const years = parseInt(document.getElementById("infHorizon").value) || 0;

  let adjustedValue = corpus / Math.pow(1 + rate / 100, years);
  globalIAWorth = adjustedValue;

  document.getElementById("resInfValue").innerHTML =
    `${formatCurrency(adjustedValue)} ${formatSmallUnit(adjustedValue)}`;
}

function calculateNetWorth() {
  // Core parameters
  const sipAmt = parseFloat(document.getElementById("sipAmount").value) || 0;
  const sipStep = parseFloat(document.getElementById("sipStepUp").value) || 0;
  const sipRet =
    (parseFloat(document.getElementById("sipReturn").value) || 0) / 12 / 100;
  const sipInf = parseFloat(document.getElementById("sipInflation").value) || 0;
  const sipHoriz = parseInt(document.getElementById("sipHorizon").value) || 0;

  const savAmtBase =
    parseFloat(document.getElementById("savAmount").value) || 0;
  const savStep = parseFloat(document.getElementById("savStepUp").value) || 0;
  const savRet =
    (parseFloat(document.getElementById("savReturn").value) || 0) / 12 / 100;
  const savHoriz = parseInt(document.getElementById("savHorizon").value) || 0;

  const epfSal = parseFloat(document.getElementById("epfSalary").value) || 0;
  const epfBasicPct =
    parseFloat(document.getElementById("epfBasicPercent").value) || 0;
  const epfHike = parseFloat(document.getElementById("epfHike").value) || 0;
  const epfRate =
    (parseFloat(document.getElementById("epfRate").value) || 0) / 12 / 100;
  const epfEmp = parseFloat(document.getElementById("epfEmp").value) || 0;
  const epfEmpr = parseFloat(document.getElementById("epfEmpr").value) || 0;
  const epfHoriz = parseInt(document.getElementById("epfHorizon").value) || 0;

  const vpfAmt = parseFloat(document.getElementById("vpfAmount").value) || 0;
  const vpfStep = parseFloat(document.getElementById("vpfStepUp").value) || 0;
  const vpfRate =
    (parseFloat(document.getElementById("vpfRate").value) || 0) / 12 / 100;
  const vpfHoriz = parseInt(document.getElementById("vpfHorizon").value) || 0;

  // Build Cash Flow Reality Check (Year 1)
  const initialEpfEmpContrib = epfSal * (epfBasicPct / 100) * (epfEmp / 100);
  const totalMonthlyOutflow =
    sipAmt + savAmtBase + initialEpfEmpContrib + vpfAmt;
  const remainingInHand = epfSal - totalMonthlyOutflow;
  const percentInvested =
    epfSal > 0 ? ((totalMonthlyOutflow / epfSal) * 100).toFixed(1) : 0;

  document.getElementById("cfIncome").innerText = formatCurrency(epfSal);
  document.getElementById("cfOutflow").innerText =
    formatCurrency(totalMonthlyOutflow);
  document.getElementById("cfPercent").innerText =
    `${percentInvested}% of gross income`;
  document.getElementById("cfRemaining").innerText =
    formatCurrency(remainingInHand);
  document.getElementById("cashFlowSection").style.display = "block";

  // --- 1. SIP Logic ---
  let sipCorpus = 0;
  let sipValue = 0;
  let currSipSum = sipAmt;
  for (let y = 1; y <= sipHoriz; y++) {
    for (let m = 1; m <= 12; m++) {
      sipCorpus += currSipSum;
      sipValue = (sipValue + currSipSum) * (1 + sipRet);
    }
    currSipSum *= 1 + sipStep / 100;
  }
  document.getElementById("resSipCorpus").innerHTML =
    `${formatCurrency(sipCorpus)} ${formatSmallUnit(sipCorpus)}`;
  document.getElementById("resSipGains").innerHTML =
    `${formatCurrency(sipValue - sipCorpus)} ${formatSmallUnit(sipValue - sipCorpus)}`;
  document.getElementById("resSipTotal").innerHTML =
    `${formatCurrency(sipValue)} ${formatSmallUnit(sipValue)}`;

  // --- 2. Savings Logic ---
  let savCorpus = 0;
  let savValue = 0;
  let currSavSum = savAmtBase;
  for (let y = 1; y <= savHoriz; y++) {
    for (let m = 1; m <= 12; m++) {
      savCorpus += currSavSum;
      savValue = (savValue + currSavSum) * (1 + savRet);
    }
    currSavSum *= 1 + savStep / 100;
  }
  document.getElementById("resSavCorpus").innerHTML =
    `${formatCurrency(savCorpus)} ${formatSmallUnit(savCorpus)}`;
  document.getElementById("resSavGains").innerHTML =
    `${formatCurrency(savValue - savCorpus)} ${formatSmallUnit(savValue - savCorpus)}`;
  document.getElementById("resSavTotal").innerHTML =
    `${formatCurrency(savValue)} ${formatSmallUnit(savValue)}`;

  // --- 3. EPF Logic ---
  let epfCorpus = 0;
  let epfValue = 0;
  let currSalSum = epfSal;
  for (let y = 1; y <= epfHoriz; y++) {
    for (let m = 1; m <= 12; m++) {
      let basicPay = currSalSum * (epfBasicPct / 100);
      let monthlyContrib = basicPay * ((epfEmp + epfEmpr) / 100);
      epfCorpus += monthlyContrib;
      epfValue = (epfValue + monthlyContrib) * (1 + epfRate);
    }
    currSalSum *= 1 + epfHike / 100;
  }
  document.getElementById("resEpfCorpus").innerHTML =
    `${formatCurrency(epfCorpus)} ${formatSmallUnit(epfCorpus)}`;
  document.getElementById("resEpfGains").innerHTML =
    `${formatCurrency(epfValue - epfCorpus)} ${formatSmallUnit(epfValue - epfCorpus)}`;
  document.getElementById("resEpfTotal").innerHTML =
    `${formatCurrency(epfValue)} ${formatSmallUnit(epfValue)}`;

  // --- 4. VPF Logic ---
  let vpfCorpus = 0;
  let vpfValue = 0;
  let currVpfSum = vpfAmt;
  for (let y = 1; y <= vpfHoriz; y++) {
    for (let m = 1; m <= 12; m++) {
      vpfCorpus += currVpfSum;
      vpfValue = (vpfValue + currVpfSum) * (1 + vpfRate);
    }
    currVpfSum *= 1 + vpfStep / 100;
  }
  document.getElementById("resVpfCorpus").innerHTML =
    `${formatCurrency(vpfCorpus)} ${formatSmallUnit(vpfCorpus)}`;
  document.getElementById("resVpfGains").innerHTML =
    `${formatCurrency(vpfValue - vpfCorpus)} ${formatSmallUnit(vpfValue - vpfCorpus)}`;
  document.getElementById("resVpfTotal").innerHTML =
    `${formatCurrency(vpfValue)} ${formatSmallUnit(vpfValue)}`;

  // --- Grand Totals ---
  const totalCorpus = sipCorpus + savCorpus + epfCorpus + vpfCorpus;
  const totalValue = sipValue + savValue + epfValue + vpfValue;
  const totalGains = totalValue - totalCorpus;

  globalNetWorth = totalValue;
  globalGainsProportion = totalValue > 0 ? totalGains / totalValue : 0;
  document.getElementById("swpGainProp").value = (
    globalGainsProportion * 100
  ).toFixed(1);

  document.getElementById("nwTotal").innerText = formatCurrency(totalValue);
  document.getElementById("nwUnit").innerText = formatUnit(totalValue);
  document.getElementById("nwCorpus").innerText = formatCurrency(totalCorpus);
  document.getElementById("nwCorpusUnit").innerText = formatUnit(totalCorpus);
  document.getElementById("nwGains").innerText = formatCurrency(totalGains);
  document.getElementById("nwGainsUnit").innerText = formatUnit(totalGains);

  // --- Net Worth Table & Chart Data Generation ---
  const sipTbody = document.getElementById("sipTableBody");
  sipTbody.innerHTML = "";

  let tableCurrSip = sipAmt;
  let tableCurrSav = savAmtBase;
  let tableCurrSal = epfSal;
  let tableCurrVpf = vpfAmt;

  let trackerSipValue = 0;
  let trackerSavValue = 0;
  let trackerEpfValue = 0;
  let trackerVpfValue = 0;

  let chartLabels = [];
  let chartNominalData = [];
  let chartRealData = [];

  let maxHoriz = Math.max(sipHoriz, savHoriz, epfHoriz, vpfHoriz);
  if (maxHoriz === 0) maxHoriz = 15;

  for (let y = 1; y <= maxHoriz; y++) {
    let displaySip = y <= sipHoriz ? tableCurrSip : 0;
    let displaySav = y <= savHoriz ? tableCurrSav : 0;
    let displaySal = y <= epfHoriz ? tableCurrSal : 0;
    let displayVpf = y <= vpfHoriz ? tableCurrVpf : 0;

    for (let m = 1; m <= 12; m++) {
      if (y <= sipHoriz)
        trackerSipValue = (trackerSipValue + displaySip) * (1 + sipRet);
      else trackerSipValue = trackerSipValue * (1 + sipRet);

      if (y <= savHoriz)
        trackerSavValue = (trackerSavValue + displaySav) * (1 + savRet);
      else trackerSavValue = trackerSavValue * (1 + savRet);

      if (y <= epfHoriz) {
        let basicPay = displaySal * (epfBasicPct / 100);
        let monthlyContrib = basicPay * ((epfEmp + epfEmpr) / 100);
        trackerEpfValue = (trackerEpfValue + monthlyContrib) * (1 + epfRate);
      } else trackerEpfValue = trackerEpfValue * (1 + epfRate);

      if (y <= vpfHoriz)
        trackerVpfValue = (trackerVpfValue + displayVpf) * (1 + vpfRate);
      else trackerVpfValue = trackerVpfValue * (1 + vpfRate);
    }

    let totalYearlyNominal =
      trackerSipValue + trackerSavValue + trackerEpfValue + trackerVpfValue;
    let inflationFactor = Math.pow(1 + sipInf / 100, y);

    let infAdjSal = displaySal / inflationFactor;
    let infAdjSip = displaySip / inflationFactor;
    let infAdjSav = displaySav / inflationFactor;
    let totalYearlyReal = totalYearlyNominal / inflationFactor;

    // Chart mapping
    chartLabels.push(`Year ${y}`);
    chartNominalData.push(Math.round(totalYearlyNominal));
    chartRealData.push(Math.round(totalYearlyReal));

    let row = document.createElement("tr");
    row.innerHTML = `
            <td>${y}</td>
            <td style="font-weight: 500;">${displaySal > 0 ? formatCurrency(displaySal) + " <br>" + formatSmallUnit(displaySal) : "-"}</td>
            <td style="color: var(--accent-orange); font-weight: 500;">${displaySal > 0 ? formatCurrency(infAdjSal) + " <br>" + formatSmallUnit(infAdjSal) : "-"}</td>
            <td>${displaySip > 0 ? formatCurrency(displaySip) + " <br>" + formatSmallUnit(displaySip) : "-"}</td>
            <td style="color: var(--accent-purple);">${displaySip > 0 ? formatCurrency(infAdjSip) + " <br>" + formatSmallUnit(infAdjSip) : "-"}</td>
            <td>${displaySav > 0 ? formatCurrency(displaySav) + " <br>" + formatSmallUnit(displaySav) : "-"}</td>
            <td style="color: var(--accent-purple);">${displaySav > 0 ? formatCurrency(infAdjSav) + " <br>" + formatSmallUnit(infAdjSav) : "-"}</td>
            <td>${displayVpf > 0 ? formatCurrency(displayVpf) + " <br>" + formatSmallUnit(displayVpf) : "-"}</td>
            <td style="font-weight: 600;">${formatCurrency(totalYearlyNominal)} <br>${formatSmallUnit(totalYearlyNominal)}</td>
            <td style="color: var(--accent-green); font-weight: 600;">${formatCurrency(totalYearlyReal)} <br>${formatSmallUnit(totalYearlyReal)}</td>
        `;
    sipTbody.appendChild(row);

    if (y <= sipHoriz) tableCurrSip *= 1 + sipStep / 100;
    if (y <= savHoriz) tableCurrSav *= 1 + savStep / 100;
    if (y <= epfHoriz) tableCurrSal *= 1 + epfHike / 100;
    if (y <= vpfHoriz) tableCurrVpf *= 1 + vpfStep / 100;
  }

  document.getElementById("sipTableSection").style.display = "flex";
  document.getElementById("chartSection").style.display = "flex";
  renderChart(chartLabels, chartNominalData, chartRealData);
}

// Render Chart.js
function renderChart(labels, nominalData, realData) {
  const ctx = document.getElementById("netWorthChart").getContext("2d");

  if (nwChartInstance) nwChartInstance.destroy();
  Chart.defaults.color = "#86868b";

  nwChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Total Net Worth (Nominal)",
          data: nominalData,
          borderColor: "#007aff",
          backgroundColor: "rgba(0, 122, 255, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        },
        {
          label: "Total Net Worth (Inflation Adjusted)",
          data: realData,
          borderColor: "#34c759",
          backgroundColor: "transparent",
          borderWidth: 3,
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) label += ": ";
              if (context.parsed.y !== null)
                label += formatCurrency(context.parsed.y);
              return label;
            },
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: function (value) {
              if (value >= 10000000)
                return (value / 10000000).toFixed(1) + " Cr";
              if (value >= 100000) return (value / 100000).toFixed(1) + " L";
              return value;
            },
          },
        },
      },
    },
  });
}

// SWP Logic with LTCG Tax
function calculateSWP() {
  const totalInv = parseFloat(document.getElementById("swpTotal").value) || 0;
  const returnRate =
    (parseFloat(document.getElementById("swpReturn").value) || 0) / 12 / 100;
  const inflation =
    parseFloat(document.getElementById("swpInflation").value) || 0;
  const horizon = parseInt(document.getElementById("swpHorizon").value) || 0;
  const method = document.getElementById("swpMethod").value;
  const ltcgRate = parseFloat(document.getElementById("swpLTCG").value) || 0;
  const gainProp =
    (parseFloat(document.getElementById("swpGainProp").value) || 0) / 100;

  let initialMonthly = 0;
  if (method === "swr") {
    const swr = parseFloat(document.getElementById("swpSWR").value) || 0;
    initialMonthly = (totalInv * (swr / 100)) / 12;
  } else {
    initialMonthly =
      parseFloat(document.getElementById("swpIncome").value) || 0;
  }

  let portfolio = totalInv;
  let currentMonthly = initialMonthly;

  const tbody = document.getElementById("swpTableBody");
  tbody.innerHTML = "";

  for (let year = 1; year <= horizon; year++) {
    if (year > 1) currentMonthly *= 1 + inflation / 100;

    // Annual Withdrawal calculation for Tax
    let annualWithdrawal = currentMonthly * 12;
    let taxableGain = annualWithdrawal * gainProp;
    let estimatedTax = taxableGain * (ltcgRate / 100);

    for (let month = 1; month <= 12; month++) {
      if (portfolio > 0)
        portfolio = portfolio * (1 + returnRate) - currentMonthly;
      if (portfolio < 0) portfolio = 0;
    }

    let inflationFactor = Math.pow(1 + inflation / 100, year);
    let adjPortfolio = portfolio / inflationFactor;

    let row = document.createElement("tr");
    row.innerHTML = `
            <td>${year}</td>
            <td style="color: var(--accent-orange); font-weight: 500;">${formatCurrency(annualWithdrawal)} <br>${formatSmallUnit(annualWithdrawal)}</td>
            <td style="color: var(--danger); font-weight: 500;">${formatCurrency(estimatedTax)} <br>${formatSmallUnit(estimatedTax)}</td>
            <td style="font-weight: 500;">${formatCurrency(portfolio)} <br>${formatSmallUnit(portfolio)}</td>
            <td style="color: var(--accent-green); font-weight: 500;">${formatCurrency(adjPortfolio)} <br>${formatSmallUnit(adjPortfolio)}</td>
        `;
    tbody.appendChild(row);

    if (portfolio <= 0) break;
  }

  document.getElementById("swpTableSection").style.display = "flex";
}

// Run setup on load
window.onload = () => {
  updateInputUnits();
  document
    .getElementById("swpTotal")
    .addEventListener("input", updateSWRReadout);
  document.getElementById("swpSWR").addEventListener("input", updateSWRReadout);

  calculateInflation();
  calculateNetWorth();
  updateSWRReadout();
};
