// 昨年対比タブ描画ロジック
// 月別YoY比較テーブル / 売上推移チャート / 原価率推移チャート / KPIサマリー

// ===== Chart.js インスタンス管理 =====
let yoySalesChart = null;
let yoyFoodCostChart = null;
let yoyFLChart = null;

// ===== YoYデータキャッシュ =====
let yoyData = null;
let yoyLoaded = false;
let yoyLoading = false;

// ===== 月名 =====
const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

// ===== YoYデータ取得 =====
async function loadYoYData() {
  if (yoyLoaded || yoyLoading) return;
  yoyLoading = true;

  document.getElementById('yoyLoading').style.display = 'flex';
  document.getElementById('yoyContent').style.display = 'none';
  document.getElementById('yoyNoData').style.display = 'none';

  try {
    const data = await fetchYoYData();
    yoyData = data.history || [];
    yoyLoaded = true;
  } catch (e) {
    console.error('YoYデータ取得エラー:', e);
    yoyData = [];
    yoyLoaded = true;
  } finally {
    yoyLoading = false;
    document.getElementById('yoyLoading').style.display = 'none';
  }

  renderYoYView();
}

// ===== データ集計ヘルパー =====

/**
 * 月次実績データを { 'yyyy-MM': { store: {...metrics} } } 形式に整理
 */
function organizeYoYData(history, store) {
  const byMonth = {};

  history.forEach(function(row) {
    if (store !== 'all' && row.store !== store) return;

    if (!byMonth[row.month]) {
      byMonth[row.month] = {
        sales: 0, food: 0, drink: 0, other: 0,
        guests: 0, foodCost: 0, drinkCost: 0,
        supplyCost: 0, varTotal: 0, labTotal: 0,
        fixedTotal: 0, opProfit: 0, uber: 0
      };
    }
    var m = byMonth[row.month];
    m.sales += row.sales;
    m.food += row.food;
    m.drink += row.drink;
    m.other += row.other;
    m.guests += row.guests;
    m.foodCost += row.foodCost;
    m.drinkCost += row.drinkCost;
    m.supplyCost += row.supplyCost;
    m.varTotal += row.varTotal;
    m.labTotal += row.labTotal;
    m.fixedTotal += row.fixedTotal;
    m.opProfit += row.opProfit;
    m.uber += row.uber;
  });

  // 客単価を計算
  Object.keys(byMonth).forEach(function(ym) {
    var m = byMonth[ym];
    m.avgPrice = m.guests > 0 ? Math.round(m.sales / m.guests) : 0;
    m.foodCostRate = m.sales > 0 ? m.foodCost / m.sales : 0;
    m.labRate = m.sales > 0 ? m.labTotal / m.sales : 0;
    m.flRate = m.sales > 0 ? (m.varTotal + m.labTotal) / m.sales : 0;
  });

  return byMonth;
}

/**
 * 今年・昨年の年を特定
 */
function getYoYYears(history) {
  var years = {};
  history.forEach(function(row) {
    var y = parseInt(row.month.split('-')[0]);
    if (!isNaN(y)) years[y] = true;
  });
  var sorted = Object.keys(years).map(Number).sort();
  var now = new Date();
  var currentYear = now.getFullYear();

  // 今年のデータがあればそれを基準、なければ最新年
  var thisYear = sorted.indexOf(currentYear) >= 0 ? currentYear : sorted[sorted.length - 1];
  var lastYear = thisYear - 1;
  return { thisYear: thisYear, lastYear: lastYear };
}

// ===== メイン描画 =====
function renderYoYView() {
  if (!yoyData || yoyData.length === 0) {
    document.getElementById('yoyContent').style.display = 'none';
    document.getElementById('yoyNoData').style.display = 'flex';
    return;
  }

  document.getElementById('yoyContent').style.display = '';
  document.getElementById('yoyNoData').style.display = 'none';

  var store = currentStore;
  var byMonth = organizeYoYData(yoyData, store);
  var years = getYoYYears(yoyData);

  renderYoYKPIs(byMonth, years);
  renderYoYSalesChart(byMonth, years);
  renderYoYCostCharts(byMonth, years);
  renderYoYTable(byMonth, years);
}

// ===== KPIサマリー（前年同月比） =====
function renderYoYKPIs(byMonth, years) {
  var el = function(id) { return document.getElementById(id); };
  var now = new Date();
  var curMonth = String(now.getMonth() + 1).padStart(2, '0');
  var thisYM = years.thisYear + '-' + curMonth;
  var lastYM = years.lastYear + '-' + curMonth;

  var thisData = byMonth[thisYM];
  var lastData = byMonth[lastYM];

  // 当月データがなければ直近の月を使用
  if (!thisData) {
    var months = Object.keys(byMonth).filter(function(ym) {
      return ym.startsWith(String(years.thisYear));
    }).sort();
    if (months.length > 0) {
      thisYM = months[months.length - 1];
      thisData = byMonth[thisYM];
      var m = parseInt(thisYM.split('-')[1]);
      lastYM = years.lastYear + '-' + String(m).padStart(2, '0');
      lastData = byMonth[lastYM];
    }
  }

  var monthLabel = thisYM ? thisYM.split('-')[1].replace(/^0/, '') + '月' : '';

  // 売上
  renderYoYKPI('yoy-sales-diff', thisData, lastData, 'sales', 'yen', monthLabel);
  // 客数
  renderYoYKPI('yoy-guests-diff', thisData, lastData, 'guests', 'num', monthLabel);
  // 客単価
  renderYoYKPI('yoy-price-diff', thisData, lastData, 'avgPrice', 'yen', monthLabel);
  // 営業利益
  renderYoYKPI('yoy-profit-diff', thisData, lastData, 'opProfit', 'yen', monthLabel);
}

function renderYoYKPI(id, thisData, lastData, key, fmt, monthLabel) {
  var el = document.getElementById(id);
  var subEl = document.getElementById(id + '-sub');

  if (!thisData && !lastData) {
    el.textContent = '-';
    el.className = 'kpi-card__value';
    subEl.textContent = '';
    return;
  }

  var thisVal = thisData ? thisData[key] : 0;
  var lastVal = lastData ? lastData[key] : 0;

  if (lastVal > 0) {
    var pctChange = ((thisVal - lastVal) / lastVal) * 100;
    var sign = pctChange >= 0 ? '+' : '';
    el.textContent = sign + pctChange.toFixed(1) + '%';
    el.className = 'kpi-card__value ' + (pctChange >= 0 ? '' : 'analysis-kpi--negative');

    if (fmt === 'yen') {
      var diff = thisVal - lastVal;
      subEl.textContent = monthLabel + ' ' + (diff >= 0 ? '+' : '') + fmtYen(diff);
    } else {
      subEl.textContent = monthLabel + ' 今年' + thisVal + ' / 昨年' + lastVal;
    }
  } else if (thisVal > 0) {
    el.textContent = fmt === 'yen' ? fmtYen(thisVal) : String(thisVal);
    el.className = 'kpi-card__value';
    subEl.textContent = monthLabel + '（昨年データなし）';
  } else {
    el.textContent = '-';
    el.className = 'kpi-card__value';
    subEl.textContent = '';
  }
}

// ===== 月別売上推移チャート =====
function renderYoYSalesChart(byMonth, years) {
  var ctx = document.getElementById('yoySalesChart').getContext('2d');
  if (yoySalesChart) yoySalesChart.destroy();

  var thisSales = [];
  var lastSales = [];
  var thisGuests = [];
  var lastGuests = [];

  for (var m = 1; m <= 12; m++) {
    var mm = String(m).padStart(2, '0');
    var thisYM = years.thisYear + '-' + mm;
    var lastYM = years.lastYear + '-' + mm;
    thisSales.push(byMonth[thisYM] ? byMonth[thisYM].sales : null);
    lastSales.push(byMonth[lastYM] ? byMonth[lastYM].sales : null);
    thisGuests.push(byMonth[thisYM] ? byMonth[thisYM].guests : null);
    lastGuests.push(byMonth[lastYM] ? byMonth[lastYM].guests : null);
  }

  yoySalesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MONTH_LABELS,
      datasets: [
        {
          label: years.thisYear + '年 売上',
          data: thisSales,
          backgroundColor: 'rgba(66, 133, 244, 0.8)',
          borderRadius: 6,
          yAxisID: 'y',
          order: 2
        },
        {
          label: years.lastYear + '年 売上',
          data: lastSales,
          backgroundColor: 'rgba(66, 133, 244, 0.25)',
          borderRadius: 6,
          yAxisID: 'y',
          order: 3
        },
        {
          label: years.thisYear + '年 客数',
          data: thisGuests,
          type: 'line',
          borderColor: '#FF6F61',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#FF6F61',
          yAxisID: 'y1',
          order: 1
        },
        {
          label: years.lastYear + '年 客数',
          data: lastGuests,
          type: 'line',
          borderColor: '#FF6F61',
          borderDash: [6, 4],
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 3,
          pointBackgroundColor: '#FF6F61',
          pointBorderColor: '#FF6F61',
          yAxisID: 'y1',
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: "'Noto Sans JP', sans-serif", size: 11 },
            padding: 16, usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(c) {
              if (c.dataset.yAxisID === 'y1') return c.dataset.label + ': ' + (c.raw != null ? c.raw + '名' : '-');
              return c.dataset.label + ': ' + (c.raw != null ? '¥' + c.raw.toLocaleString() : '-');
            }
          }
        },
        datalabels: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true, position: 'left',
          ticks: { callback: function(v) { return '¥' + (v / 10000).toFixed(0) + '万'; }, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        y1: {
          beginAtZero: true, position: 'right',
          ticks: { callback: function(v) { return v + '名'; }, font: { size: 11 } },
          grid: { display: false }
        },
        x: {
          ticks: { font: { size: 12, weight: '500' } },
          grid: { display: false }
        }
      }
    }
  });
}

// ===== 原価率・FL比率チャート =====
function renderYoYCostCharts(byMonth, years) {
  // 食材費率
  var ctx1 = document.getElementById('yoyFoodCostChart').getContext('2d');
  if (yoyFoodCostChart) yoyFoodCostChart.destroy();

  var thisFoodRate = [];
  var lastFoodRate = [];
  var thisLabRate = [];
  var lastLabRate = [];
  var thisFLRate = [];
  var lastFLRate = [];

  for (var m = 1; m <= 12; m++) {
    var mm = String(m).padStart(2, '0');
    var td = byMonth[years.thisYear + '-' + mm];
    var ld = byMonth[years.lastYear + '-' + mm];
    thisFoodRate.push(td ? parseFloat((td.foodCostRate * 100).toFixed(1)) : null);
    lastFoodRate.push(ld ? parseFloat((ld.foodCostRate * 100).toFixed(1)) : null);
    thisLabRate.push(td ? parseFloat((td.labRate * 100).toFixed(1)) : null);
    lastLabRate.push(ld ? parseFloat((ld.labRate * 100).toFixed(1)) : null);
    thisFLRate.push(td ? parseFloat((td.flRate * 100).toFixed(1)) : null);
    lastFLRate.push(ld ? parseFloat((ld.flRate * 100).toFixed(1)) : null);
  }

  yoyFoodCostChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: MONTH_LABELS,
      datasets: [
        {
          label: years.thisYear + '年 食材費率',
          data: thisFoodRate,
          borderColor: '#4285F4',
          backgroundColor: 'rgba(66, 133, 244, 0.08)',
          borderWidth: 2.5, pointRadius: 4,
          fill: true, spanGaps: true, tension: 0.3
        },
        {
          label: years.lastYear + '年 食材費率',
          data: lastFoodRate,
          borderColor: '#4285F4',
          borderDash: [6, 4],
          backgroundColor: 'transparent',
          borderWidth: 1.5, pointRadius: 3,
          spanGaps: true, tension: 0.3
        },
        {
          label: years.thisYear + '年 人件費率',
          data: thisLabRate,
          borderColor: '#EA4335',
          backgroundColor: 'rgba(234, 67, 53, 0.08)',
          borderWidth: 2.5, pointRadius: 4,
          fill: true, spanGaps: true, tension: 0.3
        },
        {
          label: years.lastYear + '年 人件費率',
          data: lastLabRate,
          borderColor: '#EA4335',
          borderDash: [6, 4],
          backgroundColor: 'transparent',
          borderWidth: 1.5, pointRadius: 3,
          spanGaps: true, tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: "'Noto Sans JP', sans-serif", size: 10 },
            padding: 12, usePointStyle: true
          }
        },
        tooltip: {
          callbacks: { label: function(c) { return c.dataset.label + ': ' + (c.raw != null ? c.raw + '%' : '-'); } }
        },
        datalabels: { display: false }
      },
      scales: {
        y: {
          ticks: { callback: function(v) { return v + '%'; }, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false }
        }
      }
    }
  });

  // FL比率
  var ctx2 = document.getElementById('yoyFLChart').getContext('2d');
  if (yoyFLChart) yoyFLChart.destroy();

  yoyFLChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: MONTH_LABELS,
      datasets: [
        {
          label: years.thisYear + '年 FL比率',
          data: thisFLRate,
          borderColor: '#7B1FA2',
          backgroundColor: 'rgba(123, 31, 162, 0.08)',
          borderWidth: 2.5, pointRadius: 4,
          fill: true, spanGaps: true, tension: 0.3
        },
        {
          label: years.lastYear + '年 FL比率',
          data: lastFLRate,
          borderColor: '#7B1FA2',
          borderDash: [6, 4],
          backgroundColor: 'transparent',
          borderWidth: 1.5, pointRadius: 3,
          spanGaps: true, tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: "'Noto Sans JP', sans-serif", size: 11 },
            padding: 12, usePointStyle: true
          }
        },
        tooltip: {
          callbacks: { label: function(c) { return c.dataset.label + ': ' + (c.raw != null ? c.raw + '%' : '-'); } }
        },
        datalabels: { display: false }
      },
      scales: {
        y: {
          ticks: { callback: function(v) { return v + '%'; }, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' },
          suggestedMin: 20,
          suggestedMax: 70
        },
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false }
        }
      }
    },
    plugins: [{
      id: 'flTargetLine',
      afterDraw: function(chart) {
        var yScale = chart.scales.y;
        var xScale = chart.scales.x;
        var c = chart.ctx;
        var yPos = yScale.getPixelForValue(55);
        c.save();
        c.beginPath();
        c.setLineDash([6, 4]);
        c.strokeStyle = '#F44336';
        c.lineWidth = 1.5;
        c.moveTo(xScale.left, yPos);
        c.lineTo(xScale.right, yPos);
        c.stroke();
        c.fillStyle = '#F44336';
        c.font = "bold 10px 'Montserrat', sans-serif";
        c.textAlign = 'right';
        c.fillText('目標 55%', xScale.right, yPos - 6);
        c.restore();
      }
    }]
  });
}

// ===== 月別対比テーブル =====
function renderYoYTable(byMonth, years) {
  var tbody = document.getElementById('yoyTableBody');
  tbody.innerHTML = '';

  for (var m = 1; m <= 12; m++) {
    var mm = String(m).padStart(2, '0');
    var thisYM = years.thisYear + '-' + mm;
    var lastYM = years.lastYear + '-' + mm;
    var td = byMonth[thisYM];
    var ld = byMonth[lastYM];

    // 両方ともデータがなければスキップ
    if (!td && !ld) continue;

    var tr = document.createElement('tr');

    var thisSales = td ? td.sales : 0;
    var lastSales = ld ? ld.sales : 0;
    var salesDiff = thisSales - lastSales;
    var salesPct = lastSales > 0 ? ((salesDiff / lastSales) * 100) : null;

    var thisGuests = td ? td.guests : 0;
    var lastGuests = ld ? ld.guests : 0;
    var thisPrice = td ? td.avgPrice : 0;
    var lastPrice = ld ? ld.avgPrice : 0;

    var thisFoodRate = td ? (td.foodCostRate * 100).toFixed(1) + '%' : '-';
    var thisLabRate = td ? (td.labRate * 100).toFixed(1) + '%' : '-';
    var thisFLRate = td ? (td.flRate * 100).toFixed(1) + '%' : '-';

    // 昨年の率もツールチップ用に計算
    var lastFoodRate = ld ? (ld.foodCostRate * 100).toFixed(1) : null;
    var lastLabRate = ld ? (ld.labRate * 100).toFixed(1) : null;
    var lastFLRate = ld ? (ld.flRate * 100).toFixed(1) : null;

    var salesDiffClass = salesDiff >= 0 ? 'cell--success' : 'cell--danger';
    var salesPctClass = salesPct != null ? (salesPct >= 0 ? 'cell--success' : 'cell--danger') : '';

    tr.innerHTML =
      '<td class="store-table__label">' + m + '月</td>' +
      '<td class="store-table__cell">' + (td ? fmtYen(thisSales) : '-') + '</td>' +
      '<td class="store-table__cell" style="color:#999">' + (ld ? fmtYen(lastSales) : '-') + '</td>' +
      '<td class="store-table__cell ' + (td && ld ? salesDiffClass : '') + '">' +
        (td && ld ? (salesDiff >= 0 ? '+' : '') + fmtYen(salesDiff) : '-') + '</td>' +
      '<td class="store-table__cell ' + salesPctClass + '">' +
        (salesPct != null ? (salesPct >= 0 ? '+' : '') + salesPct.toFixed(1) + '%' : '-') + '</td>' +
      '<td class="store-table__cell">' + (td ? thisGuests + '名' : '-') + '</td>' +
      '<td class="store-table__cell" style="color:#999">' + (ld ? lastGuests + '名' : '-') + '</td>' +
      '<td class="store-table__cell">' + (td && thisPrice > 0 ? fmtYen(thisPrice) : '-') + '</td>' +
      '<td class="store-table__cell" style="color:#999">' + (ld && lastPrice > 0 ? fmtYen(lastPrice) : '-') + '</td>' +
      '<td class="store-table__cell">' + thisFoodRate +
        (lastFoodRate ? '<span class="yoy-sub-rate">(' + lastFoodRate + '%)</span>' : '') + '</td>' +
      '<td class="store-table__cell">' + thisLabRate +
        (lastLabRate ? '<span class="yoy-sub-rate">(' + lastLabRate + '%)</span>' : '') + '</td>' +
      '<td class="store-table__cell ' + (td && td.flRate > 0.55 ? 'cell--danger' : td && td.flRate <= 0.55 ? 'cell--success' : '') + '">' +
        thisFLRate +
        (lastFLRate ? '<span class="yoy-sub-rate">(' + lastFLRate + '%)</span>' : '') + '</td>';

    tbody.appendChild(tr);
  }

  if (tbody.children.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:24px;color:#999;">データなし</td></tr>';
  }
}

// ===== 売上分析タブ用: 前年同月データ取得 =====
function getLastYearSameMonth(store) {
  if (!yoyData || yoyData.length === 0) return null;

  var now = new Date();
  var years = getYoYYears(yoyData);
  var curMonth = String(now.getMonth() + 1).padStart(2, '0');
  var lastYM = years.lastYear + '-' + curMonth;

  var byMonth = organizeYoYData(yoyData, store);

  // 当月の前年データ
  if (byMonth[lastYM]) return byMonth[lastYM];

  // 当月データがなければ直近の今年の月に対応する昨年データを探す
  var thisYearMonths = Object.keys(byMonth).filter(function(ym) {
    return ym.startsWith(String(years.thisYear));
  }).sort();

  if (thisYearMonths.length > 0) {
    var latestMonth = thisYearMonths[thisYearMonths.length - 1].split('-')[1];
    var fallback = years.lastYear + '-' + latestMonth;
    return byMonth[fallback] || null;
  }

  return null;
}
