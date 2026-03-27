// Chart.js グラフ描画
let storeChart = null;

function renderStoreChart(data) {
  const ctx = document.getElementById('storeChart').getContext('2d');
  const stores = ['せんべろ', 'GARAGE', 'Leje', 'ちゃっきー'];
  const storeKeys = ['せんべろ本店', 'SAN DRIP GARAGE', 'Leje', 'ちゃっきー'];

  // 既存チャートがあれば破棄
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

// FL比率の横棒グラフ
let flChart = null;

function renderFLChart(data) {
  const ctx = document.getElementById('flChart').getContext('2d');
  const stores = ['せんべろ', 'GARAGE', 'Leje', 'ちゃっきー', '全店'];
  const storeKeys = ['せんべろ本店', 'SAN DRIP GARAGE', 'Leje', 'ちゃっきー'];

  if (flChart) flChart.destroy();

  const varRatios = storeKeys.map(k => ((data.stores[k]?.varRatio || 0) * 100).toFixed(1));
  const labRatios = storeKeys.map(k => ((data.stores[k]?.labRatio || 0) * 100).toFixed(1));
  varRatios.push(((data.total.varRatio || 0) * 100).toFixed(1));
  labRatios.push(((data.total.labRatio || 0) * 100).toFixed(1));

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
        }
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
    }
  });
}
