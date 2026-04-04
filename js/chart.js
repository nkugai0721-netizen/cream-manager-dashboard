// Chart.js グラフ描画
// datalabelsプラグインをグローバル登録
Chart.register(ChartDataLabels);

// 共通: datalabelsをデフォルト非表示（チャートごとに有効化）
Chart.defaults.set('plugins.datalabels', { display: false });

let storeChart = null;

function renderStoreChart(data) {
  const ctx = document.getElementById('storeChart').getContext('2d');
  const stores = ['せんべろ', 'GARAGE', 'Leje', 'ちゃっきー'];
  const storeKeys = ['せんべろ本店', 'SAN DRIP GARAGE', 'Leje', 'ちゃっきー'];

  if (storeChart) storeChart.destroy();

  storeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: stores,
      datasets: [
        {
          label: '売上',
          data: storeKeys.map(k => data.stores[k]?.sales || 0),
          backgroundColor: '#4285F4',
          borderRadius: 4
        },
        {
          label: '変動費',
          data: storeKeys.map(k => data.stores[k]?.varTotal || 0),
          backgroundColor: '#FBBC04',
          borderRadius: 4
        },
        {
          label: '人件費',
          data: storeKeys.map(k => data.stores[k]?.labTotal || 0),
          backgroundColor: '#EA4335',
          borderRadius: 4
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
            padding: 20,
            usePointStyle: true,
            pointStyle: 'rectRounded'
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ¥${ctx.raw.toLocaleString()}`
          }
        },
        datalabels: {
          display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
          anchor: 'end',
          align: 'top',
          font: { size: 10, weight: '600', family: "'Montserrat', sans-serif" },
          color: '#555',
          formatter: (v) => `¥${(v / 10000).toFixed(0)}万`
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => `¥${(v / 10000).toFixed(0)}万`,
            font: { size: 11 }
          },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        x: {
          ticks: { font: { size: 12 } },
          grid: { display: false }
        }
      }
    }
  });
}

// FL比率の横棒グラフ（目標55%ライン付き）
let flChart = null;

function renderFLChart(data) {
  const ctx = document.getElementById('flChart').getContext('2d');
  const stores = ['せんべろ', 'GARAGE', 'Leje', 'ちゃっきー', '全店'];
  const storeKeys = ['せんべろ本店', 'SAN DRIP GARAGE', 'Leje', 'ちゃっきー'];

  if (flChart) flChart.destroy();

  const varRatios = storeKeys.map(k => parseFloat(((data.stores[k]?.varRatio || 0) * 100).toFixed(1)));
  const labRatios = storeKeys.map(k => parseFloat(((data.stores[k]?.labRatio || 0) * 100).toFixed(1)));
  varRatios.push(parseFloat(((data.total.varRatio || 0) * 100).toFixed(1)));
  labRatios.push(parseFloat(((data.total.labRatio || 0) * 100).toFixed(1)));

  flChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: stores,
      datasets: [
        {
          label: '変動費率',
          data: varRatios,
          backgroundColor: '#FBBC04',
          borderRadius: 4
        },
        {
          label: '人件費率',
          data: labRatios,
          backgroundColor: '#EA4335',
          borderRadius: 4
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: "'Noto Sans JP', sans-serif", size: 12 },
            padding: 20,
            usePointStyle: true,
            pointStyle: 'rectRounded'
          }
        },
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%` }
        },
        datalabels: {
          display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
          anchor: 'center',
          align: 'center',
          font: { size: 11, weight: '700', family: "'Montserrat', sans-serif" },
          color: '#fff',
          formatter: (v) => `${v}%`
        },
        // FL目標55%の縦線アノテーション
        annotation: undefined
      },
      scales: {
        x: {
          stacked: true,
          max: 100,
          ticks: { callback: (v) => `${v}%`, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        y: {
          stacked: true,
          ticks: { font: { size: 12 } },
          grid: { display: false }
        }
      }
    },
    plugins: [{
      // カスタムプラグイン: FL目標55%ラインを描画
      id: 'flTargetLine',
      afterDraw(chart) {
        const xScale = chart.scales.x;
        const yScale = chart.scales.y;
        const ctx = chart.ctx;
        const xPos = xScale.getPixelForValue(55);

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#F44336';
        ctx.lineWidth = 2;
        ctx.moveTo(xPos, yScale.top);
        ctx.lineTo(xPos, yScale.bottom);
        ctx.stroke();

        // ラベル
        ctx.fillStyle = '#F44336';
        ctx.font = "bold 11px 'Montserrat', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('目標55%', xPos, yScale.top - 6);
        ctx.restore();
      }
    }]
  });
}

// 売上構成比ドーナツチャート
let salesCompChart = null;

function renderSalesCompChart(data) {
  const ctx = document.getElementById('salesCompChart').getContext('2d');
  if (salesCompChart) salesCompChart.destroy();

  const t = data.total;
  const food = t.food || 0;
  const drink = t.drink || 0;
  const other = t.other || 0;
  const total = food + drink + other;

  salesCompChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['フード', 'ドリンク', 'その他'],
      datasets: [{
        data: [food, drink, other],
        backgroundColor: ['#4285F4', '#FBBC04', '#34A853'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: "'Noto Sans JP', sans-serif", size: 12 },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
              return `${ctx.label}: ¥${ctx.raw.toLocaleString()} (${pct}%)`;
            }
          }
        },
        datalabels: {
          display: (ctx) => {
            const v = ctx.dataset.data[ctx.dataIndex];
            return total > 0 && (v / total) > 0.05;
          },
          font: { size: 13, weight: '700', family: "'Montserrat', sans-serif" },
          color: '#fff',
          formatter: (v) => total > 0 ? `${((v / total) * 100).toFixed(1)}%` : ''
        }
      }
    }
  });
}

// コスト構成比ドーナツチャート
let costCompChart = null;

function renderCostCompChart(data) {
  const ctx = document.getElementById('costCompChart').getContext('2d');
  if (costCompChart) costCompChart.destroy();

  const t = data.total;
  const varTotal = t.varTotal || 0;
  const labTotal = t.labTotal || 0;
  const uberComm = t.uberComm || 0;
  const remaining = Math.max(0, (t.sales || 0) - varTotal - labTotal - uberComm);
  const salesTotal = t.sales || 1;

  costCompChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['変動費', '人件費', 'Uber手数料', '利益(残)'],
      datasets: [{
        data: [varTotal, labTotal, uberComm, remaining],
        backgroundColor: ['#FBBC04', '#EA4335', '#FF6D01', '#34A853'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: "'Noto Sans JP', sans-serif", size: 12 },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = ((ctx.raw / salesTotal) * 100).toFixed(1);
              return `${ctx.label}: ¥${ctx.raw.toLocaleString()} (${pct}%)`;
            }
          }
        },
        datalabels: {
          display: (ctx) => {
            const v = ctx.dataset.data[ctx.dataIndex];
            return (v / salesTotal) > 0.05;
          },
          font: { size: 13, weight: '700', family: "'Montserrat', sans-serif" },
          color: '#fff',
          formatter: (v) => `${((v / salesTotal) * 100).toFixed(1)}%`
        }
      }
    }
  });
}

// ===== SNSチャート =====

// IGリーチ・フォロワー棒グラフ
let snsReachChart = null;

function renderSNSReachChart(sns) {
  const ctx = document.getElementById('snsReachChart').getContext('2d');
  if (snsReachChart) snsReachChart.destroy();

  if (!sns || !sns.ig || sns.ig.length === 0) return;

  const labels = sns.ig.map(i => i.store.replace('_ishigaki', '').replace('San drip garage', 'GARAGE').replace('せんべろ風土', 'せんべろ').replace('Leje石垣島', 'Leje'));

  snsReachChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'リーチ(28日)',
          data: sns.ig.map(i => i.reach),
          backgroundColor: '#7B1FA2',
          borderRadius: 4
        },
        {
          label: 'フォロワー',
          data: sns.ig.map(i => i.followers),
          backgroundColor: '#E1BEE7',
          borderRadius: 4
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
            padding: 16, usePointStyle: true, pointStyle: 'rectRounded'
          }
        },
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()}` }
        },
        datalabels: {
          display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
          anchor: 'end', align: 'top',
          font: { size: 10, weight: '600', family: "'Montserrat', sans-serif" },
          color: '#555',
          formatter: (v) => v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toLocaleString()
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        x: { ticks: { font: { size: 12 } }, grid: { display: false } }
      }
    }
  });
}

// IGエンゲージメント率 横棒グラフ
let snsEngChart = null;

function renderSNSEngChart(sns) {
  const ctx = document.getElementById('snsEngChart').getContext('2d');
  if (snsEngChart) snsEngChart.destroy();

  if (!sns || !sns.ig || sns.ig.length === 0) return;

  const labels = sns.ig.map(i => i.store.replace('_ishigaki', '').replace('San drip garage', 'GARAGE').replace('せんべろ風土', 'せんべろ').replace('Leje石垣島', 'Leje'));

  // Threads/Xも追加
  const engData = sns.ig.map(i => i.engRate);
  if (sns.threads) { labels.push('Threads'); engData.push(0); }
  if (sns.x) { labels.push('X'); engData.push(sns.x.engRate); }

  snsEngChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Eng率(%)',
        data: engData,
        backgroundColor: engData.map(v => v >= 1.5 ? '#4CAF50' : v >= 1.0 ? '#FBBC04' : '#EA4335'),
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => `Eng率: ${ctx.raw}%` }
        },
        datalabels: {
          display: true,
          anchor: 'end', align: 'end',
          font: { size: 12, weight: '700', family: "'Montserrat', sans-serif" },
          color: '#333',
          formatter: (v) => `${v}%`
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: Math.max(...engData) * 1.3 || 5,
          ticks: { callback: (v) => `${v}%`, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        y: { ticks: { font: { size: 12 } }, grid: { display: false } }
      }
    }
  });
}
