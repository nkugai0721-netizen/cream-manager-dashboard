// 売上分析タブ描画ロジック
// 曜日別平均 / 週別推移 / 客単価トレンド / 目標達成サマリー / 日別テーブル

// ===== Chart.js インスタンス管理 =====
let dowChart = null;
let weeklyTrendChart = null;
let unitPriceChart = null;
let fdTrendChart = null;

// ===== 曜日名 =====
const DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

// ===== メイン描画 =====
function renderAnalysisView(data) {
  const store = currentStore;
  let storeObj, daily, targets, forecast;

  if (store === 'all') {
    storeObj = data.total;
    daily = (data.total && data.total.daily) ? data.total.daily : [];
    targets = (data.total && data.total.targets) ? data.total.targets : null;
    forecast = (data.total && data.total.forecast) ? data.total.forecast : null;
  } else {
    storeObj = data.stores[store];
    if (storeObj) {
      daily = storeObj.daily || [];
      targets = storeObj.targets || null;
      forecast = storeObj.forecast || null;
    } else {
      daily = [];
      targets = null;
      forecast = null;
    }
  }

  // 営業日数・日次目標
  const bizDays = (targets && targets.businessDays > 0)
    ? targets.businessDays
    : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dailyTarget = targets ? Math.round(targets.monthlySales / bizDays) : null;
  const unitPriceTarget = (targets && targets.avgPrice > 0) ? targets.avgPrice : null;

  renderTargetSummary(daily, targets, forecast, dailyTarget, bizDays);
  renderYoYComparisonInAnalysis(store);
  renderDowChart(daily, dailyTarget);
  renderWeeklyTrendChart(daily, dailyTarget);
  renderUnitPriceChart(daily, unitPriceTarget);
  renderFDTrendChart(daily);
  renderDailyTable(daily, dailyTarget);
}

// ===== 目標達成サマリー =====
function renderTargetSummary(daily, targets, forecast, dailyTarget, bizDays) {
  const el = (id) => document.getElementById(id);
  if (daily.length === 0) {
    el('analysis-achieve-days').textContent = '-';
    el('analysis-achieve-days-sub').textContent = '';
    el('analysis-remaining-target').textContent = '-';
    el('analysis-remaining-target-sub').textContent = '';
    el('analysis-best-day').textContent = '-';
    el('analysis-best-day-sub').textContent = '';
    el('analysis-avg-diff').textContent = '-';
    el('analysis-avg-diff-sub').textContent = '';
    return;
  }

  // 目標達成日数
  const achieveDays = dailyTarget ? daily.filter(d => d.sales >= dailyTarget).length : 0;
  el('analysis-achieve-days').textContent = dailyTarget ? `${achieveDays} / ${daily.length}日` : '-';
  el('analysis-achieve-days-sub').textContent =
    dailyTarget ? `達成率 ${((achieveDays / daily.length) * 100).toFixed(0)}%` : '';

  // 残り必要日売上
  const monthlyTarget = targets ? targets.monthlySales : null;
  const mtd = daily.reduce((s, d) => s + (d.sales || 0), 0);
  const remainingDays = Math.max(0, bizDays - daily.length);
  const remainingTarget = (monthlyTarget && remainingDays > 0)
    ? Math.round((monthlyTarget - mtd) / remainingDays) : null;
  el('analysis-remaining-target').textContent =
    remainingTarget != null ? fmtYen(remainingTarget) : (monthlyTarget ? '達成済み' : '-');
  el('analysis-remaining-target-sub').textContent =
    remainingDays > 0 ? `残り${remainingDays}日` : '全日程終了';

  // 最高売上日
  const bestDay = daily.reduce((best, d) => (!best || (d.sales || 0) > (best.sales || 0)) ? d : best, null);
  if (bestDay && bestDay.date) {
    const bd = new Date(bestDay.date);
    el('analysis-best-day').textContent = fmtYen(bestDay.sales);
    el('analysis-best-day-sub').textContent =
      `${bd.getMonth() + 1}/${bd.getDate()}(${DOW_NAMES[bd.getDay()]})`;
  } else {
    el('analysis-best-day').textContent = '-';
    el('analysis-best-day-sub').textContent = '';
  }

  // 日平均 vs 目標の差額
  const dailyAvg = daily.length > 0 ? Math.round(mtd / daily.length) : 0;
  const diff = dailyTarget ? dailyAvg - dailyTarget : null;
  if (diff != null) {
    const sign = diff >= 0 ? '+' : '';
    el('analysis-avg-diff').textContent = `${sign}${fmtYen(diff)}`;
    el('analysis-avg-diff').className =
      `kpi-card__value ${diff >= 0 ? '' : 'analysis-kpi--negative'}`;
    el('analysis-avg-diff-sub').textContent = `日平均 ${fmtYen(dailyAvg)}`;
  } else {
    el('analysis-avg-diff').textContent = fmtYen(dailyAvg);
    el('analysis-avg-diff').className = 'kpi-card__value';
    el('analysis-avg-diff-sub').textContent = '日平均売上';
  }
}

// ===== 売上分析タブ内 前年同月比セクション =====
function renderYoYComparisonInAnalysis(store) {
  // YoYデータが未取得の場合はセクションを非表示
  var wrapper = document.getElementById('analysisYoYSection');
  if (!wrapper) return;

  if (!yoyData || yoyData.length === 0) {
    wrapper.style.display = 'none';
    return;
  }

  var lastYear = getLastYearSameMonth(store);
  if (!lastYear) {
    wrapper.style.display = 'none';
    return;
  }

  wrapper.style.display = '';

  // 現在の月次データを取得
  var thisData = null;
  if (dashData) {
    if (store === 'all') {
      thisData = dashData.total;
    } else {
      thisData = dashData.stores[store];
    }
  }

  if (!thisData) {
    wrapper.style.display = 'none';
    return;
  }

  var el = function(id) { return document.getElementById(id); };

  // 売上対比
  var thisSales = thisData.sales || 0;
  var lastSales = lastYear.sales || 0;
  if (lastSales > 0) {
    var salesPct = ((thisSales - lastSales) / lastSales * 100);
    el('analysis-yoy-sales').textContent = (salesPct >= 0 ? '+' : '') + salesPct.toFixed(1) + '%';
    el('analysis-yoy-sales').className = 'kpi-card__value ' + (salesPct >= 0 ? '' : 'analysis-kpi--negative');
    el('analysis-yoy-sales-sub').textContent = '昨年 ' + fmtYen(lastSales);
  } else {
    el('analysis-yoy-sales').textContent = '-';
    el('analysis-yoy-sales').className = 'kpi-card__value';
    el('analysis-yoy-sales-sub').textContent = '';
  }

  // 客数対比
  var thisGuests = thisData.guests || 0;
  var lastGuests = lastYear.guests || 0;
  if (lastGuests > 0) {
    var guestsPct = ((thisGuests - lastGuests) / lastGuests * 100);
    el('analysis-yoy-guests').textContent = (guestsPct >= 0 ? '+' : '') + guestsPct.toFixed(1) + '%';
    el('analysis-yoy-guests').className = 'kpi-card__value ' + (guestsPct >= 0 ? '' : 'analysis-kpi--negative');
    el('analysis-yoy-guests-sub').textContent = '昨年 ' + lastGuests + '名';
  } else {
    el('analysis-yoy-guests').textContent = '-';
    el('analysis-yoy-guests').className = 'kpi-card__value';
    el('analysis-yoy-guests-sub').textContent = '';
  }

  // 客単価対比
  var thisPrice = thisData.avgPrice || 0;
  var lastPrice = lastYear.avgPrice || 0;
  if (lastPrice > 0) {
    var pricePct = ((thisPrice - lastPrice) / lastPrice * 100);
    el('analysis-yoy-price').textContent = (pricePct >= 0 ? '+' : '') + pricePct.toFixed(1) + '%';
    el('analysis-yoy-price').className = 'kpi-card__value ' + (pricePct >= 0 ? '' : 'analysis-kpi--negative');
    el('analysis-yoy-price-sub').textContent = '昨年 ' + fmtYen(lastPrice);
  } else {
    el('analysis-yoy-price').textContent = '-';
    el('analysis-yoy-price').className = 'kpi-card__value';
    el('analysis-yoy-price-sub').textContent = '';
  }
}

// ===== 曜日別平均売上（棒グラフ） =====
function renderDowChart(daily, dailyTarget) {
  const ctx = document.getElementById('dowChart').getContext('2d');
  if (dowChart) dowChart.destroy();

  // 曜日別に集計
  const dowData = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));
  daily.forEach(d => {
    if (!d.date) return;
    const date = new Date(d.date);
    const dow = date.getDay();
    dowData[dow].sum += d.sales || 0;
    dowData[dow].count++;
  });

  // 月〜日の順（日本式）
  const order = [1, 2, 3, 4, 5, 6, 0];
  const labels = order.map(i => DOW_NAMES[i]);
  const avgSales = order.map(i =>
    dowData[i].count > 0 ? Math.round(dowData[i].sum / dowData[i].count) : 0
  );
  const bgColors = avgSales.map(v => {
    if (!dailyTarget) return 'rgba(66, 133, 244, 0.8)';
    return v >= dailyTarget ? 'rgba(76, 175, 80, 0.8)' : 'rgba(66, 133, 244, 0.8)';
  });

  dowChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '平均売上',
        data: avgSales,
        backgroundColor: bgColors,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => `平均売上: ¥${c.raw.toLocaleString()}`,
            afterLabel: (c) => {
              const idx = order[c.dataIndex];
              return `(${dowData[idx].count}日分)`;
            }
          }
        },
        datalabels: {
          display: (c) => c.dataset.data[c.dataIndex] > 0,
          anchor: 'end', align: 'top',
          font: { size: 11, weight: '600', family: "'Montserrat', sans-serif" },
          color: '#555',
          formatter: (v) => `¥${(v / 10000).toFixed(1)}万`
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => `¥${(v / 10000).toFixed(0)}万`, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        x: {
          ticks: { font: { size: 13, weight: '600' } },
          grid: { display: false }
        }
      }
    },
    plugins: dailyTarget ? [{
      id: 'dowTargetLine',
      afterDraw(chart) {
        const yScale = chart.scales.y;
        const xScale = chart.scales.x;
        const c = chart.ctx;
        const yPos = yScale.getPixelForValue(dailyTarget);
        c.save();
        c.beginPath();
        c.setLineDash([6, 4]);
        c.strokeStyle = '#F44336';
        c.lineWidth = 2;
        c.moveTo(xScale.left, yPos);
        c.lineTo(xScale.right, yPos);
        c.stroke();
        c.fillStyle = '#F44336';
        c.font = "bold 11px 'Montserrat', sans-serif";
        c.textAlign = 'right';
        c.fillText(`目標 ¥${(dailyTarget / 10000).toFixed(1)}万`, xScale.right, yPos - 6);
        c.restore();
      }
    }] : []
  });
}

// ===== 週別日平均推移（棒 + 折れ線コンボ） =====
function renderWeeklyTrendChart(daily, dailyTarget) {
  const ctx = document.getElementById('weeklyTrendChart').getContext('2d');
  if (weeklyTrendChart) weeklyTrendChart.destroy();

  if (daily.length === 0) return;

  // 月曜起点で週を分類
  const weeks = {};
  daily.forEach(d => {
    if (!d.date) return;
    const dayOfMonth = new Date(d.date).getDate();
    const weekNum = Math.ceil(dayOfMonth / 7);
    const weekKey = `第${weekNum}週`;
    if (!weeks[weekKey]) weeks[weekKey] = { sum: 0, count: 0, guests: 0 };
    weeks[weekKey].sum += d.sales || 0;
    weeks[weekKey].count++;
    weeks[weekKey].guests += d.guests || 0;
  });

  const labels = Object.keys(weeks);
  const avgSales = labels.map(k => weeks[k].count > 0 ? Math.round(weeks[k].sum / weeks[k].count) : 0);
  const avgGuests = labels.map(k => weeks[k].count > 0 ? Math.round(weeks[k].guests / weeks[k].count) : 0);

  weeklyTrendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '日平均売上',
          data: avgSales,
          backgroundColor: 'rgba(66, 133, 244, 0.8)',
          borderRadius: 6,
          yAxisID: 'y',
          order: 2
        },
        {
          label: '日平均客数',
          data: avgGuests,
          type: 'line',
          borderColor: '#FF6F61',
          backgroundColor: 'rgba(255, 111, 97, 0.1)',
          borderWidth: 2.5,
          pointRadius: 5,
          pointBackgroundColor: '#FF6F61',
          fill: false,
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
            font: { family: "'Noto Sans JP', sans-serif", size: 12 },
            padding: 20, usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: (c) => {
              if (c.dataset.yAxisID === 'y1') return `日平均客数: ${c.raw}名`;
              return `日平均売上: ¥${c.raw.toLocaleString()}`;
            },
            afterBody: (items) => {
              const idx = items[0].dataIndex;
              const k = labels[idx];
              return `稼働${weeks[k].count}日`;
            }
          }
        },
        datalabels: {
          display: (c) => c.datasetIndex === 0 && c.dataset.data[c.dataIndex] > 0,
          anchor: 'end', align: 'top',
          font: { size: 11, weight: '600', family: "'Montserrat', sans-serif" },
          color: '#555',
          formatter: (v) => `¥${(v / 10000).toFixed(1)}万`
        }
      },
      scales: {
        y: {
          beginAtZero: true, position: 'left',
          ticks: { callback: (v) => `¥${(v / 10000).toFixed(0)}万`, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        y1: {
          beginAtZero: true, position: 'right',
          ticks: { callback: (v) => `${v}名`, font: { size: 11 } },
          grid: { display: false }
        },
        x: {
          ticks: { font: { size: 12, weight: '500' } },
          grid: { display: false }
        }
      }
    },
    plugins: dailyTarget ? [{
      id: 'weeklyTargetLine',
      afterDraw(chart) {
        const yScale = chart.scales.y;
        const xScale = chart.scales.x;
        const c = chart.ctx;
        const yPos = yScale.getPixelForValue(dailyTarget);
        c.save();
        c.beginPath();
        c.setLineDash([6, 4]);
        c.strokeStyle = '#F44336';
        c.lineWidth = 2;
        c.moveTo(xScale.left, yPos);
        c.lineTo(xScale.right, yPos);
        c.stroke();
        c.fillStyle = '#F44336';
        c.font = "bold 10px 'Montserrat', sans-serif";
        c.textAlign = 'right';
        c.fillText('日次目標', xScale.right, yPos - 6);
        c.restore();
      }
    }] : []
  });
}

// ===== 客単価トレンド（折れ線） =====
function renderUnitPriceChart(daily, unitPriceTarget) {
  const ctx = document.getElementById('unitPriceChart').getContext('2d');
  if (unitPriceChart) unitPriceChart.destroy();

  if (daily.length === 0) return;

  const labels = daily.map(d => {
    if (!d.date) return '';
    const date = new Date(d.date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  const unitPrices = daily.map(d =>
    (d.sales > 0 && d.guests > 0) ? Math.round(d.sales / d.guests) : null
  );

  unitPriceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '客単価',
        data: unitPrices,
        borderColor: '#7B1FA2',
        backgroundColor: 'rgba(123, 31, 162, 0.08)',
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#7B1FA2',
        pointHoverRadius: 6,
        fill: true,
        spanGaps: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => `客単価: ¥${c.raw?.toLocaleString() || '-'}`
          }
        },
        datalabels: { display: false }
      },
      scales: {
        y: {
          ticks: { callback: (v) => `¥${v.toLocaleString()}`, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        x: {
          ticks: { maxTicksLimit: 15, font: { size: 10 } },
          grid: { display: false }
        }
      }
    },
    plugins: unitPriceTarget ? [{
      id: 'unitPriceTargetLine',
      afterDraw(chart) {
        const yScale = chart.scales.y;
        const xScale = chart.scales.x;
        const c = chart.ctx;
        const yPos = yScale.getPixelForValue(unitPriceTarget);
        c.save();
        c.beginPath();
        c.setLineDash([6, 4]);
        c.strokeStyle = '#F44336';
        c.lineWidth = 2;
        c.moveTo(xScale.left, yPos);
        c.lineTo(xScale.right, yPos);
        c.stroke();
        c.fillStyle = '#F44336';
        c.font = "bold 10px 'Montserrat', sans-serif";
        c.textAlign = 'right';
        c.fillText(`目標 ¥${unitPriceTarget.toLocaleString()}`, xScale.right, yPos - 6);
        c.restore();
      }
    }] : []
  });
}

// ===== F/D比率推移（GAS拡張データがある場合のみ表示） =====
function renderFDTrendChart(daily) {
  const wrapper = document.getElementById('fdChartWrapper');
  const ctx = document.getElementById('fdTrendChart');
  if (fdTrendChart) fdTrendChart.destroy();

  // food/drink データが含まれているかチェック
  const hasDetail = daily.some(d => d.food != null && d.drink != null);
  if (!hasDetail || daily.length === 0) {
    wrapper.style.display = 'none';
    return;
  }
  wrapper.style.display = '';

  const labels = daily.map(d => {
    if (!d.date) return '';
    const date = new Date(d.date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  const foodPct = daily.map(d =>
    d.sales > 0 ? parseFloat(((d.food || 0) / d.sales * 100).toFixed(1)) : null
  );
  const drinkPct = daily.map(d =>
    d.sales > 0 ? parseFloat(((d.drink || 0) / d.sales * 100).toFixed(1)) : null
  );

  fdTrendChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'フード比率',
          data: foodPct,
          borderColor: '#4285F4',
          backgroundColor: 'rgba(66, 133, 244, 0.08)',
          borderWidth: 2, pointRadius: 3,
          fill: true, spanGaps: true, tension: 0.3
        },
        {
          label: 'ドリンク比率',
          data: drinkPct,
          borderColor: '#FBBC04',
          backgroundColor: 'rgba(251, 188, 4, 0.08)',
          borderWidth: 2, pointRadius: 3,
          fill: true, spanGaps: true, tension: 0.3
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
            font: { family: "'Noto Sans JP', sans-serif", size: 12 },
            padding: 16, usePointStyle: true
          }
        },
        tooltip: {
          callbacks: { label: (c) => `${c.dataset.label}: ${c.raw}%` }
        },
        datalabels: { display: false }
      },
      scales: {
        y: {
          ticks: { callback: (v) => `${v}%`, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        x: {
          ticks: { maxTicksLimit: 15, font: { size: 10 } },
          grid: { display: false }
        }
      }
    }
  });
}

// ===== 日別実績テーブル =====
function renderDailyTable(daily, dailyTarget) {
  const tbody = document.getElementById('analysisTableBody');
  tbody.innerHTML = '';

  if (daily.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#999;">データなし</td></tr>';
    return;
  }

  // 新しい日付順
  const sorted = [...daily].reverse();

  sorted.forEach(d => {
    const tr = document.createElement('tr');
    const date = d.date ? new Date(d.date) : null;
    const dow = date ? DOW_NAMES[date.getDay()] : '-';
    const dateStr = date ? `${date.getMonth() + 1}/${date.getDate()}` : '-';
    const unitPrice = (d.sales > 0 && d.guests > 0) ? Math.round(d.sales / d.guests) : null;
    const diff = (dailyTarget && d.sales != null) ? d.sales - dailyTarget : null;

    if (dailyTarget && d.sales >= dailyTarget) {
      tr.className = 'analysis-row--achieve';
    }

    let dowClass = '';
    if (date) {
      if (date.getDay() === 0) dowClass = 'analysis-dow--sun';
      if (date.getDay() === 6) dowClass = 'analysis-dow--sat';
    }

    tr.innerHTML = `
      <td class="store-table__label">${dateStr}</td>
      <td class="store-table__cell ${dowClass}">${dow}</td>
      <td class="store-table__cell">${fmtYen(d.sales)}</td>
      <td class="store-table__cell">${d.guests != null ? d.guests + '名' : '-'}</td>
      <td class="store-table__cell">${unitPrice != null ? fmtYen(unitPrice) : '-'}</td>
      <td class="store-table__cell ${diff != null ? (diff >= 0 ? 'cell--success' : 'cell--danger') : ''}">${diff != null ? (diff >= 0 ? '+' : '') + fmtYen(diff) : '-'}</td>`;
    tbody.appendChild(tr);
  });
}
