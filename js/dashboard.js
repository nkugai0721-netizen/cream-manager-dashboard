// ダッシュボード描画ロジック

// 数値フォーマット
function fmtYen(v) {
  if (v == null) return '-';
  return '¥' + Math.round(v).toLocaleString();
}
function fmtPct(v) {
  if (v == null) return '-';
  return (v * 100).toFixed(1) + '%';
}
function fmtNum(v) {
  if (v == null) return '-';
  return Math.round(v).toLocaleString();
}

// ログイン画面表示
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboardScreen').style.display = 'none';
}

// ダッシュボード画面表示
function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'block';
}

// ローディング表示
function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
  document.getElementById('dashContent').style.display = show ? 'none' : 'block';
}

// エラー表示
function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

// KPIカード更新
function renderKPI(data) {
  const t = data.total;
  document.getElementById('kpi-sales').textContent = fmtYen(t.sales);
  document.getElementById('kpi-guests').textContent = fmtNum(t.guests) + '名';
  document.getElementById('kpi-fl').textContent = fmtPct(t.flRatio);
  document.getElementById('kpi-avg-price').textContent = fmtYen(t.avgPrice);

  // FL比率65%超でアラート
  const flCard = document.getElementById('kpi-fl-wrapper');
  if (t.flRatio > 0.65) {
    flCard.classList.add('kpi-card--danger');
  } else if (t.flRatio > 0.60) {
    flCard.classList.add('kpi-card--warning');
  } else {
    flCard.classList.remove('kpi-card--danger', 'kpi-card--warning');
  }

  // 更新日時
  const d = new Date(data.updatedAt);
  document.getElementById('updatedAt').textContent =
    `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} 更新`;

  // 対象月
  let monthStr = data.targetMonth;
  if (monthStr) {
    const md = new Date(monthStr);
    if (!isNaN(md)) monthStr = `${md.getFullYear()}年${md.getMonth() + 1}月`;
  }
  document.getElementById('targetMonth').textContent = monthStr || '';
}

// 店舗別テーブル描画
function renderTable(data) {
  const storeKeys = ['せんべろ本店', 'SAN DRIP GARAGE', 'Leje', 'ちゃっきー'];
  const displayNames = ['せんべろ', 'GARAGE', 'Leje', 'ちゃっきー', '全店合計'];

  const sections = [
    {
      title: '売上', rows: [
        { label: '総売上', field: 'sales', fmt: 'yen' },
        { label: 'フード売上', field: 'food', fmt: 'yen', snackNA: true },
        { label: 'ドリンク売上', field: 'drink', fmt: 'yen', snackNA: true },
        { label: 'その他', field: 'other', fmt: 'yen', snackNA: true },
        { label: 'Uber売上', field: 'uber', fmt: 'yen', garageOnly: true },
        { label: '客数', field: 'guests', fmt: 'num' },
        { label: '平均客数/日', field: 'avgGuests', fmt: 'num' },
        { label: '客単価', field: 'avgPrice', fmt: 'yen' }
      ]
    },
    {
      title: '売上構成比', rows: [
        { label: 'フード比率', field: 'foodPct', fmt: 'pct', snackNA: true, computed: true },
        { label: 'ドリンク比率', field: 'drinkPct', fmt: 'pct', snackNA: true, computed: true },
        { label: 'その他比率', field: 'otherPct', fmt: 'pct', snackNA: true, computed: true }
      ]
    },
    {
      title: 'コスト', rows: [
        { label: '変動費合計', field: 'varTotal', fmt: 'yen', highlight: true },
        { label: '食材費', field: 'foodCost', fmt: 'yen' },
        { label: 'ドリンク費', field: 'drinkCost', fmt: 'yen', snackNA: true },
        { label: '消耗品', field: 'supplyCost', fmt: 'yen', snackNA: true },
        { label: '人件費合計', field: 'labTotal', fmt: 'yen', highlight: true },
        { label: 'Uber手数料(30%)', field: 'uberComm', fmt: 'yen', garageOnly: true },
        { label: '変動費率', field: 'varRatio', fmt: 'pct' },
        { label: '人件費率', field: 'labRatio', fmt: 'pct' },
        { label: 'FL比率', field: 'flRatio', fmt: 'pct', highlight: true }
      ]
    }
  ];

  const tbody = document.getElementById('storeTableBody');
  tbody.innerHTML = '';

  sections.forEach(section => {
    // セクションヘッダー
    const headerRow = document.createElement('tr');
    headerRow.className = 'store-table__section-header';
    headerRow.innerHTML = `<td colspan="6">${section.title}</td>`;
    tbody.appendChild(headerRow);

    section.rows.forEach(rowDef => {
      const tr = document.createElement('tr');
      if (rowDef.highlight) tr.className = 'store-table__row--highlight';

      // ラベル列
      tr.innerHTML = `<td class="store-table__label">${rowDef.label}</td>`;

      // 各店舗列
      storeKeys.forEach(key => {
        const store = data.stores[key];
        const td = document.createElement('td');
        td.className = 'store-table__cell';

        if (!store) {
          td.textContent = '-';
        } else if (rowDef.garageOnly && key !== 'SAN DRIP GARAGE') {
          td.textContent = '-';
        } else if (rowDef.snackNA && store.isSnack) {
          td.textContent = '-';
        } else {
          let val = store[rowDef.field];
          // 売上構成比は動的に計算
          if (rowDef.computed && store.sales > 0) {
            if (rowDef.field === 'foodPct') val = store.food / store.sales;
            else if (rowDef.field === 'drinkPct') val = store.drink / store.sales;
            else if (rowDef.field === 'otherPct') val = store.other / store.sales;
          }
          if (rowDef.fmt === 'yen') td.textContent = fmtYen(val);
          else if (rowDef.fmt === 'pct') {
            td.textContent = fmtPct(val);
            // FL比率の色分け
            if (rowDef.field === 'flRatio' && val > 0.65) td.classList.add('cell--danger');
            else if (rowDef.field === 'flRatio' && val > 0.60) td.classList.add('cell--warning');
          }
          else td.textContent = fmtNum(val);
        }
        tr.appendChild(td);
      });

      // 全店合計列
      const totalTd = document.createElement('td');
      totalTd.className = 'store-table__cell store-table__cell--total';
      let totalVal = data.total[rowDef.field];
      // 売上構成比は動的に計算
      if (rowDef.computed && data.total.sales > 0) {
        if (rowDef.field === 'foodPct') totalVal = data.total.food / data.total.sales;
        else if (rowDef.field === 'drinkPct') totalVal = data.total.drink / data.total.sales;
        else if (rowDef.field === 'otherPct') totalVal = data.total.other / data.total.sales;
      }
      if (rowDef.garageOnly) {
        totalTd.textContent = fmtYen(data.total.uber || 0);
        if (rowDef.field === 'uberComm') totalTd.textContent = fmtYen(data.total.uberComm || 0);
      } else if (rowDef.fmt === 'yen') totalTd.textContent = fmtYen(totalVal);
      else if (rowDef.fmt === 'pct') {
        totalTd.textContent = fmtPct(totalVal);
        if (rowDef.field === 'flRatio' && totalVal > 0.65) totalTd.classList.add('cell--danger');
        else if (rowDef.field === 'flRatio' && totalVal > 0.60) totalTd.classList.add('cell--warning');
      }
      else totalTd.textContent = fmtNum(totalVal);
      tr.appendChild(totalTd);

      tbody.appendChild(tr);
    });
  });
}

// データ読み込み・描画
async function loadDashboard() {
  showLoading(true);
  showError('');
  try {
    const data = await fetchDashboardData();
    renderKPI(data);
    renderStoreChart(data);
    renderFLChart(data);
    renderSalesCompChart(data);
    renderCostCompChart(data);
    renderTable(data);
    showLoading(false);
  } catch (e) {
    showLoading(false);
    showError(e.message);
  }
}

// ログインフォーム処理
async function handleLogin(e) {
  e.preventDefault();
  const password = document.getElementById('passwordInput').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  const ok = await login(password);
  if (ok) {
    showDashboard();
    loadDashboard();
  } else {
    errEl.textContent = 'パスワードが正しくありません';
    errEl.style.display = 'block';
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // ログインフォーム
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  // 更新ボタン
  document.getElementById('refreshBtn').addEventListener('click', loadDashboard);

  // ログアウトボタン
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // 認証済みならダッシュボード表示
  if (isAuthenticated()) {
    showDashboard();
    loadDashboard();
  } else {
    showLogin();
  }
});
