// ダッシュボード描画ロジック v2
// 3タブ構成: 今日の数字 / SNS・集客 / 月次P&L

// ===== ユーティリティ =====

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

// 先週比バッジHTML生成
function wowBadge(current, prev) {
  if (current == null || prev == null || prev === 0) return '';
  const diff = ((current - prev) / prev) * 100;
  const absDiff = Math.abs(diff).toFixed(1);
  if (diff > 1) return `<span class="wow-badge wow-badge--up">↑${absDiff}%</span>`;
  if (diff < -1) return `<span class="wow-badge wow-badge--down">↓${absDiff}%</span>`;
  return `<span class="wow-badge wow-badge--flat">→0%</span>`;
}

// プログレスバーの色クラスを返す
function progressColor(pct) {
  if (pct >= 90) return 'progress-bar__fill--green';
  if (pct >= 70) return 'progress-bar__fill--yellow';
  return 'progress-bar__fill--red';
}

// シグナルバッジ（判定用）
function signalBadge(label) {
  if (!label) return '<span class="signal-badge signal-badge--gray"></span>';
  if (label === '効率的' || label === '良好' || label === '🟢') return '<span class="signal-badge signal-badge--green"></span>';
  if (label === '要注意' || label === '普通' || label === '🟡') return '<span class="signal-badge signal-badge--yellow"></span>';
  if (label === '非効率' || label === '低迷' || label === '🔴') return '<span class="signal-badge signal-badge--red"></span>';
  return '<span class="signal-badge signal-badge--gray"></span>';
}

// ===== 画面表示制御 =====

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboardScreen').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'block';
}

function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
  document.getElementById('dashContent').style.display = show ? 'none' : 'block';
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

// ===== タブ切り替え =====

let currentTab = 'daily';

function initTabs() {
  document.querySelectorAll('.tab-nav__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === currentTab) return;
      // ボタン状態更新
      document.querySelectorAll('.tab-nav__btn').forEach(b => b.classList.remove('tab-nav__btn--active'));
      btn.classList.add('tab-nav__btn--active');
      // パネル表示切り替え
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
      document.getElementById('tab-' + tab).style.display = '';
      currentTab = tab;
    });
  });
}

// ===== 店舗フィルタ =====

let currentStore = 'all';
let dashData = null;

function initStoreFilter() {
  // URLパラメータからデフォルト店舗を読み込み
  const params = new URLSearchParams(window.location.search);
  const storeParam = params.get('store');
  if (storeParam) {
    currentStore = storeParam;
    localStorage.setItem('cream_store', storeParam);
  } else {
    currentStore = localStorage.getItem('cream_store') || 'all';
  }

  document.querySelectorAll('.store-filter__btn').forEach(btn => {
    // 初期状態の反映
    if (btn.dataset.store === currentStore) {
      document.querySelectorAll('.store-filter__btn').forEach(b => b.classList.remove('store-filter__btn--active'));
      btn.classList.add('store-filter__btn--active');
    }
    btn.addEventListener('click', () => {
      currentStore = btn.dataset.store;
      localStorage.setItem('cream_store', currentStore);
      document.querySelectorAll('.store-filter__btn').forEach(b => b.classList.remove('store-filter__btn--active'));
      btn.classList.add('store-filter__btn--active');
      if (dashData) renderDailyView(dashData);
    });
  });
}

// ===== 画面1: 今日の数字 =====

function renderDailyView(data) {
  const store = currentStore;
  let storeObj, daily, targets, forecast;

  if (store === 'all') {
    storeObj = data.total;
    daily = data.totalDaily || [];
    targets = data.totalTargets || null;
    forecast = data.totalForecast || null;
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

  // 昨日の売上
  const yesterdaySales = daily.length > 0 ? daily[daily.length - 1].sales : null;
  const dailyTarget = targets ? (targets.monthlySales / 30) : null;
  document.getElementById('daily-yesterday-sales').textContent = fmtYen(yesterdaySales);
  document.getElementById('daily-target').textContent = fmtYen(dailyTarget);

  // 日次プログレスバー
  const dailyPct = (yesterdaySales && dailyTarget && dailyTarget > 0)
    ? Math.min(Math.round((yesterdaySales / dailyTarget) * 100), 150) : 0;
  const dailyProgress = document.getElementById('daily-progress');
  dailyProgress.style.width = Math.min(dailyPct, 100) + '%';
  dailyProgress.className = 'progress-bar__fill ' + progressColor(dailyPct);

  // 客数 / 客単価 + 先週比
  const yesterdayGuests = daily.length > 0 ? daily[daily.length - 1].guests : null;
  const yesterdayAvgPrice = (yesterdaySales && yesterdayGuests && yesterdayGuests > 0)
    ? Math.round(yesterdaySales / yesterdayGuests) : null;
  const guestStr = yesterdayGuests != null ? `${yesterdayGuests}名` : '--';
  const priceStr = yesterdayAvgPrice != null ? fmtYen(yesterdayAvgPrice) : '--';
  document.getElementById('daily-guests-price').textContent = `${guestStr} / ${priceStr}`;

  // 先週同曜日比（7日前のデータがあれば）
  const wowEl = document.getElementById('daily-wow-guest');
  if (daily.length >= 8) {
    const prevDay = daily[daily.length - 8];
    const prevGuests = prevDay ? prevDay.guests : null;
    const prevPrice = (prevDay && prevDay.sales && prevDay.guests > 0)
      ? Math.round(prevDay.sales / prevDay.guests) : null;
    wowEl.innerHTML = `先週同曜日比 客数${wowBadge(yesterdayGuests, prevGuests)} 客単価${wowBadge(yesterdayAvgPrice, prevPrice)}`;
  } else {
    wowEl.innerHTML = '';
  }

  // 月次累計
  const mtd = daily.reduce((s, d) => s + (d.sales || 0), 0);
  const monthlyTarget = targets ? targets.monthlySales : null;
  const landing = forecast ? forecast.landing : null;
  document.getElementById('daily-mtd').textContent = fmtYen(mtd);
  document.getElementById('daily-monthly-target').textContent = fmtYen(monthlyTarget);
  document.getElementById('daily-landing').textContent = fmtYen(landing);

  // 月次プログレスバー
  const achieveRate = (landing && monthlyTarget && monthlyTarget > 0)
    ? Math.round((landing / monthlyTarget) * 100) : 0;
  const mtdPct = (monthlyTarget && monthlyTarget > 0)
    ? Math.min(Math.round((mtd / monthlyTarget) * 100), 100) : 0;
  const monthlyProgress = document.getElementById('daily-monthly-progress');
  monthlyProgress.style.width = mtdPct + '%';
  monthlyProgress.className = 'progress-bar__fill ' + progressColor(achieveRate);
  document.getElementById('daily-achieve-rate').textContent = achieveRate + '%';

  // 全店KPIカード（常に全店を表示）
  const t = data.total;
  document.getElementById('kpi-sales').textContent = fmtYen(t.sales);
  document.getElementById('kpi-guests').textContent = fmtNum(t.guests) + '名';
  document.getElementById('kpi-fl').textContent = fmtPct(t.flRatio);
  document.getElementById('kpi-avg-price').textContent = fmtYen(t.avgPrice);

  // FL比率アラート（目標55%）
  const flCard = document.getElementById('kpi-fl-wrapper');
  flCard.classList.remove('kpi-card--danger', 'kpi-card--warning');
  if (t.flRatio > 0.60) flCard.classList.add('kpi-card--danger');
  else if (t.flRatio > 0.55) flCard.classList.add('kpi-card--warning');
}

// ===== 画面2: SNS・集客 =====

// チャネル横断比較マトリクス
function renderChannelMatrix(sns) {
  const tbody = document.getElementById('channelMatrixBody');
  tbody.innerHTML = '';
  if (!sns) return;

  const rows = [];

  // Instagram行（各店舗）
  if (sns.ig && sns.ig.length > 0) {
    sns.ig.forEach((ig, idx) => {
      const shortName = ig.store.replace('_ishigaki', '').replace('San drip garage', 'GARAGE').replace('せんべろ風土', 'せんべろ').replace('Leje石垣島', 'Leje');
      const prev = (sns.igPrev && sns.igPrev[idx]) ? sns.igPrev[idx] : null;
      const reachWow = prev ? wowBadge(ig.reach, prev.reach) : '';
      // CVR = webClicks / reach
      const cvr = ig.reach > 0 ? ((ig.webClicks / ig.reach) * 100).toFixed(1) + '%' : '-';
      // 判定: Eng率ベース
      const signal = ig.engRate >= 3 ? '🟢' : ig.engRate >= 1.5 ? '🟡' : '🔴';
      rows.push({
        store: shortName, channel: 'Instagram',
        exposure: ig.reach.toLocaleString(), interest: ig.webClicks.toLocaleString(),
        visits: '-', cvr: cvr, signal: signal, wow: reachWow
      });
    });
  }

  // TikTok行
  if (sns.tiktok) {
    const tt = sns.tiktok;
    const prev = sns.tiktokPrev || null;
    const viewWow = prev ? wowBadge(tt.views, prev.views) : '';
    const signal = tt.engRate >= 3 ? '🟢' : tt.engRate >= 1 ? '🟡' : '🔴';
    rows.push({
      store: 'ちゃっきー', channel: 'TikTok',
      exposure: tt.views.toLocaleString(), interest: '-',
      visits: '-', cvr: tt.engRate + '%', signal: signal, wow: viewWow
    });
  }

  // Threads行
  if (sns.threads) {
    const th = sns.threads;
    const prev = sns.threadsPrev || null;
    const viewWow = prev ? wowBadge(th.views, prev.views) : '';
    rows.push({
      store: 'Leje', channel: 'Threads',
      exposure: th.views.toLocaleString(), interest: '-',
      visits: '-', cvr: '-',
      signal: '🟡', wow: viewWow
    });
  }

  // X行
  if (sns.x) {
    const x = sns.x;
    const prev = sns.xPrev || null;
    const impWow = prev ? wowBadge(x.impressions, prev.impressions) : '';
    const signal = x.engRate >= 2 ? '🟢' : x.engRate >= 1 ? '🟡' : '🔴';
    rows.push({
      store: 'Leje', channel: 'X',
      exposure: x.impressions.toLocaleString(), interest: '-',
      visits: '-', cvr: x.engRate + '%', signal: signal, wow: impWow
    });
  }

  // 広告・予約チャネル行
  if (sns.ads && sns.ads.length > 0) {
    sns.ads.forEach(ad => {
      const signal = ad.cpa <= 0 ? '🟢' : ad.cpa <= 3000 ? '🟢' : ad.cpa <= 5000 ? '🟡' : '🔴';
      rows.push({
        store: ad.store, channel: ad.channel,
        exposure: '-', interest: '-',
        visits: ad.estimatedVisits > 0 ? ad.estimatedVisits + '件' : '-',
        cvr: ad.cpa > 0 ? fmtYen(ad.cpa) + '/件' : '-',
        signal: signal, wow: ''
      });
    });
  }

  // 行を描画
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="store-table__label">${r.store}</td>
      <td class="store-table__cell">${r.channel}</td>
      <td class="store-table__cell">${r.exposure}</td>
      <td class="store-table__cell">${r.interest}</td>
      <td class="store-table__cell">${r.visits}</td>
      <td class="store-table__cell">${r.cvr}</td>
      <td class="store-table__cell">${signalBadge(r.signal)}</td>
      <td class="store-table__cell">${r.wow}</td>`;
    tbody.appendChild(tr);
  });
}

// 自動アクション提案
function renderSuggestions(sns) {
  const container = document.getElementById('suggestionCards');
  container.innerHTML = '';

  const suggestions = (sns && sns.suggestions) ? sns.suggestions : [];
  if (suggestions.length === 0) {
    container.innerHTML = '<div style="color:#999;font-size:0.85rem;padding:8px 0;">現在提案はありません</div>';
    return;
  }

  suggestions.forEach(s => {
    const levelClass = s.level === 'danger' ? 'suggestion-card--danger'
      : s.level === 'warning' ? 'suggestion-card--warning'
      : 'suggestion-card--info';
    const icon = s.level === 'danger' ? '🔴' : s.level === 'warning' ? '⚠️' : '💡';
    const card = document.createElement('div');
    card.className = `suggestion-card ${levelClass}`;
    card.innerHTML = `
      <div class="suggestion-card__icon">${icon}</div>
      <div class="suggestion-card__body">
        <div class="suggestion-card__title">${s.store || ''} ${s.channel || ''}</div>
        <div class="suggestion-card__desc">${s.message || ''}</div>
      </div>`;
    container.appendChild(card);
  });
}

// ===== 画面2: SNS KPI・テーブル（既存機能を保持） =====

function renderSNSKpi(sns) {
  if (!sns || !sns.ig || sns.ig.length === 0) {
    document.getElementById('snsKpiGrid').style.display = 'none';
    return;
  }
  document.getElementById('snsKpiGrid').style.display = '';
  const totalFollowers = sns.ig.reduce((s, i) => s + i.followers, 0);
  const totalReach = sns.ig.reduce((s, i) => s + i.reach, 0);
  const totalClicks = sns.ig.reduce((s, i) => s + i.webClicks, 0);
  const avgEng = sns.ig.reduce((s, i) => s + i.engRate, 0) / sns.ig.length;

  document.getElementById('kpi-followers').textContent = totalFollowers.toLocaleString();
  document.getElementById('kpi-reach').textContent = totalReach.toLocaleString();
  document.getElementById('kpi-eng-rate').textContent = avgEng.toFixed(2) + '%';
  document.getElementById('kpi-web-clicks').textContent = totalClicks.toLocaleString();
}

function renderSNSTable(sns) {
  const thead = document.getElementById('snsTableHead');
  const tbody = document.getElementById('snsTableBody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (!sns || !sns.ig || sns.ig.length === 0) return;

  thead.innerHTML = `<tr>
    <th>プラットフォーム</th><th>アカウント</th><th>フォロワー</th>
    <th>リーチ/ビュー</th><th>PV</th><th>Eng率</th><th>投稿数</th><th>前週比</th>
  </tr>`;

  // IG行
  sns.ig.forEach((ig, idx) => {
    const shortName = ig.store.replace('_ishigaki', '').replace('San drip garage', 'GARAGE').replace('せんべろ風土', 'せんべろ').replace('Leje石垣島', 'Leje');
    const prev = (sns.igPrev && sns.igPrev[idx]) ? sns.igPrev[idx] : null;
    const reachWow = prev ? wowBadge(ig.reach, prev.reach) : '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="store-table__label">Instagram</td>
      <td class="store-table__cell">${shortName}</td>
      <td class="store-table__cell">${ig.followers.toLocaleString()}</td>
      <td class="store-table__cell">${ig.reach.toLocaleString()}</td>
      <td class="store-table__cell">${ig.pv.toLocaleString()}</td>
      <td class="store-table__cell">${ig.engRate}%</td>
      <td class="store-table__cell">${ig.posts}</td>
      <td class="store-table__cell">${reachWow}</td>`;
    tbody.appendChild(tr);
  });

  // Threads行
  if (sns.threads) {
    const t = sns.threads;
    const prev = sns.threadsPrev || null;
    const viewWow = prev ? wowBadge(t.views, prev.views) : '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="store-table__label">Threads</td>
      <td class="store-table__cell">Leje</td>
      <td class="store-table__cell">${t.followers.toLocaleString()}</td>
      <td class="store-table__cell">${t.views.toLocaleString()}</td>
      <td class="store-table__cell">-</td>
      <td class="store-table__cell">-</td>
      <td class="store-table__cell">-</td>
      <td class="store-table__cell">${viewWow}</td>`;
    tbody.appendChild(tr);
  }

  // X行
  if (sns.x) {
    const x = sns.x;
    const prev = sns.xPrev || null;
    const impWow = prev ? wowBadge(x.impressions, prev.impressions) : '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="store-table__label">X</td>
      <td class="store-table__cell">Leje</td>
      <td class="store-table__cell">${x.followers.toLocaleString()}</td>
      <td class="store-table__cell">${x.impressions.toLocaleString()}</td>
      <td class="store-table__cell">-</td>
      <td class="store-table__cell">${x.engRate}%</td>
      <td class="store-table__cell">${x.posts}</td>
      <td class="store-table__cell">${impWow}</td>`;
    tbody.appendChild(tr);
  }

  // TikTok行
  if (sns.tiktok) {
    const tt = sns.tiktok;
    const prev = sns.tiktokPrev || null;
    const viewWow = prev ? wowBadge(tt.views, prev.views) : '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="store-table__label">TikTok</td>
      <td class="store-table__cell">ちゃっきー</td>
      <td class="store-table__cell">${tt.followers.toLocaleString()}</td>
      <td class="store-table__cell">${tt.views.toLocaleString()}</td>
      <td class="store-table__cell">-</td>
      <td class="store-table__cell">${tt.engRate}%</td>
      <td class="store-table__cell">${tt.videos}</td>
      <td class="store-table__cell">${viewWow}</td>`;
    tbody.appendChild(tr);
  }
}

// 広告媒体・予約テーブル
function renderAdTable(sns) {
  const thead = document.getElementById('adTableHead');
  const tbody = document.getElementById('adTableBody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  const hasAds = sns && sns.ads && sns.ads.length > 0;
  const hasRes = sns && sns.reservations && sns.reservations.length > 0;
  if (!hasAds && !hasRes) {
    document.getElementById('adTableCard').style.display = 'none';
    return;
  }
  document.getElementById('adTableCard').style.display = '';

  thead.innerHTML = `<tr>
    <th>店舗</th><th>チャネル</th><th>月額コスト</th>
    <th>予約/来店数</th><th>CPA</th>
  </tr>`;

  if (hasAds) {
    sns.ads.forEach(ad => {
      const tr = document.createElement('tr');
      const costStr = ad.monthlyCost > 0 ? fmtYen(ad.monthlyCost) : '無料';
      const visitStr = ad.estimatedVisits > 0 ? ad.estimatedVisits + '件' : '-';
      const cpaStr = ad.cpa > 0 ? fmtYen(ad.cpa) : '-';
      // CPA色分け
      let cpaClass = '';
      if (ad.cpa > 5000) cpaClass = 'cell--danger';
      else if (ad.cpa > 3000) cpaClass = 'cell--warning';
      else if (ad.cpa > 0) cpaClass = 'cell--success';
      tr.innerHTML = `
        <td class="store-table__label">${ad.store}</td>
        <td class="store-table__cell">${ad.channel}</td>
        <td class="store-table__cell">${costStr}</td>
        <td class="store-table__cell">${visitStr}</td>
        <td class="store-table__cell ${cpaClass}">${cpaStr}</td>`;
      tbody.appendChild(tr);
    });
  }

  if (hasRes) {
    const secRow = document.createElement('tr');
    secRow.className = 'store-table__section-header';
    secRow.innerHTML = '<td colspan="5">予約データ（最新月）</td>';
    tbody.appendChild(secRow);

    sns.reservations.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="store-table__label">${r.store}</td>
        <td class="store-table__cell">${r.platform}</td>
        <td class="store-table__cell">-</td>
        <td class="store-table__cell">${r.total}件</td>
        <td class="store-table__cell">PV: ${r.pv.toLocaleString()}</td>`;
      tbody.appendChild(tr);
    });
  }
}

// ===== 画面3: 月次P&L テーブル =====

function renderTable(data) {
  const storeKeys = ['せんべろ本店', 'SAN DRIP GARAGE', 'Leje', 'ちゃっきー'];

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
        { label: '  食材費率', field: 'foodCostPct', fmt: 'pct', computed: true },
        { label: 'ドリンク費', field: 'drinkCost', fmt: 'yen', snackNA: true },
        { label: '  ドリンク費率', field: 'drinkCostPct', fmt: 'pct', snackNA: true, computed: true },
        { label: '消耗品', field: 'supplyCost', fmt: 'yen', snackNA: true },
        { label: '  消耗品率', field: 'supplyCostPct', fmt: 'pct', snackNA: true, computed: true },
        { label: '変動費率', field: 'varRatio', fmt: 'pct', highlight: true },
        { label: '人件費合計', field: 'labTotal', fmt: 'yen', highlight: true },
        { label: '人件費率', field: 'labRatio', fmt: 'pct', highlight: true },
        { label: 'Uber手数料(30%)', field: 'uberComm', fmt: 'yen', garageOnly: true },
        { label: 'FL比率', field: 'flRatio', fmt: 'pct', highlight: true },
        { label: '固定費合計', field: 'fixedTotal', fmt: 'yen', highlight: true },
        { label: '営業利益', field: 'opProfit', fmt: 'yen', highlight: true, profitColor: true }
      ]
    }
  ];

  const tbody = document.getElementById('storeTableBody');
  tbody.innerHTML = '';

  sections.forEach(section => {
    const headerRow = document.createElement('tr');
    headerRow.className = 'store-table__section-header';
    headerRow.innerHTML = `<td colspan="6">${section.title}</td>`;
    tbody.appendChild(headerRow);

    section.rows.forEach(rowDef => {
      const tr = document.createElement('tr');
      if (rowDef.highlight) tr.className = 'store-table__row--highlight';
      tr.innerHTML = `<td class="store-table__label">${rowDef.label}</td>`;

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
          if (rowDef.computed && store.sales > 0) {
            if (rowDef.field === 'foodPct') val = store.food / store.sales;
            else if (rowDef.field === 'drinkPct') val = store.drink / store.sales;
            else if (rowDef.field === 'otherPct') val = store.other / store.sales;
            else if (rowDef.field === 'foodCostPct') val = (store.foodCost || 0) / store.sales;
            else if (rowDef.field === 'drinkCostPct') val = (store.drinkCost || 0) / store.sales;
            else if (rowDef.field === 'supplyCostPct') val = (store.supplyCost || 0) / store.sales;
          }
          if (rowDef.fmt === 'yen') td.textContent = fmtYen(val);
          else if (rowDef.fmt === 'pct') {
            td.textContent = fmtPct(val);
            // FL比率は目標55%ベースで色分け
            if (rowDef.field === 'flRatio' && val > 0.60) td.classList.add('cell--danger');
            else if (rowDef.field === 'flRatio' && val > 0.55) td.classList.add('cell--warning');
            // 食材費率は目標28%
            if (rowDef.field === 'foodCostPct' && val > 0.32) td.classList.add('cell--danger');
            else if (rowDef.field === 'foodCostPct' && val > 0.28) td.classList.add('cell--warning');
          }
          else td.textContent = fmtNum(val);
          if (rowDef.profitColor && val < 0) td.classList.add('cell--danger');
        }
        tr.appendChild(td);
      });

      // 全店合計列
      const totalTd = document.createElement('td');
      totalTd.className = 'store-table__cell store-table__cell--total';
      let totalVal = data.total[rowDef.field];
      if (rowDef.computed && data.total.sales > 0) {
        const s = data.total.sales;
        if (rowDef.field === 'foodPct') totalVal = data.total.food / s;
        else if (rowDef.field === 'drinkPct') totalVal = data.total.drink / s;
        else if (rowDef.field === 'otherPct') totalVal = data.total.other / s;
        else if (rowDef.field === 'foodCostPct') totalVal = (data.total.foodCost || 0) / s;
        else if (rowDef.field === 'drinkCostPct') totalVal = (data.total.drinkCost || 0) / s;
        else if (rowDef.field === 'supplyCostPct') totalVal = (data.total.supplyCost || 0) / s;
      }
      if (rowDef.garageOnly) {
        totalTd.textContent = fmtYen(data.total.uber || 0);
        if (rowDef.field === 'uberComm') totalTd.textContent = fmtYen(data.total.uberComm || 0);
      } else if (rowDef.fmt === 'yen') totalTd.textContent = fmtYen(totalVal);
      else if (rowDef.fmt === 'pct') {
        totalTd.textContent = fmtPct(totalVal);
        if (rowDef.field === 'flRatio' && totalVal > 0.60) totalTd.classList.add('cell--danger');
        else if (rowDef.field === 'flRatio' && totalVal > 0.55) totalTd.classList.add('cell--warning');
        if (rowDef.field === 'foodCostPct' && totalVal > 0.32) totalTd.classList.add('cell--danger');
        else if (rowDef.field === 'foodCostPct' && totalVal > 0.28) totalTd.classList.add('cell--warning');
      }
      else totalTd.textContent = fmtNum(totalVal);
      if (rowDef.profitColor && totalVal < 0) totalTd.classList.add('cell--danger');
      tr.appendChild(totalTd);

      tbody.appendChild(tr);
    });
  });
}

// ===== ヘッダー情報 =====

function renderHeader(data) {
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

// ===== メインロード =====

async function loadDashboard() {
  showLoading(true);
  showError('');
  try {
    const data = await fetchDashboardData();
    dashData = data;

    // ヘッダー
    renderHeader(data);

    // 画面1: 今日の数字
    renderDailyView(data);

    // 画面2: SNS・集客
    if (data.sns) {
      renderChannelMatrix(data.sns);
      renderSuggestions(data.sns);
      renderSNSKpi(data.sns);
      renderSNSReachChart(data.sns);
      renderSNSEngChart(data.sns);
      renderSNSTable(data.sns);
      renderAdTable(data.sns);
    }

    // 画面3: 月次P&L
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

// ===== ログイン =====

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

// ===== 目標設定モーダル =====

const TARGET_STORES = [
  { key: 'せんべろ本店', label: 'せんべろ本店' },
  { key: 'SAN DRIP GARAGE', label: 'SAN DRIP GARAGE' },
  { key: 'Leje', label: 'Leje' },
  { key: 'ちゃっきー', label: 'ちゃっきー' }
];

function openTargetModal() {
  const modal = document.getElementById('targetModal');
  modal.style.display = 'flex';

  // 対象月を今月に設定
  const now = new Date();
  const monthInput = document.getElementById('targetMonthInput');
  monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // テーブル行を生成（既存のtargetsデータがあればプリフィル）
  renderTargetForm();

  // ステータスリセット
  const status = document.getElementById('targetSaveStatus');
  status.textContent = '';
  status.className = 'modal__status';
}

function closeTargetModal() {
  document.getElementById('targetModal').style.display = 'none';
}

function renderTargetForm() {
  const tbody = document.getElementById('targetTableBody');
  tbody.innerHTML = '';

  TARGET_STORES.forEach(s => {
    // dashDataから既存の目標値をプリフィル
    let t = null;
    if (dashData && dashData.stores && dashData.stores[s.key] && dashData.stores[s.key].targets) {
      t = dashData.stores[s.key].targets;
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="store-table__label">${s.label}</td>
      <td><input type="number" data-store="${s.key}" data-field="monthlySales" value="${t ? t.monthlySales : 0}" placeholder="0"></td>
      <td><input type="number" data-store="${s.key}" data-field="foodCostRatio" value="${t ? (t.foodCostRatio * 100).toFixed(0) : 28}" step="0.1" placeholder="28"></td>
      <td><input type="number" data-store="${s.key}" data-field="laborCostRatio" value="${t ? (t.laborCostRatio * 100).toFixed(0) : 27}" step="0.1" placeholder="27"></td>
      <td><input type="number" data-store="${s.key}" data-field="avgPrice" value="${t ? t.avgPrice : 0}" placeholder="0"></td>
      <td><input type="number" data-store="${s.key}" data-field="guestCount" value="${t ? t.guestCount : 0}" placeholder="0"></td>`;
    tbody.appendChild(tr);
  });
}

async function saveTargets() {
  const status = document.getElementById('targetSaveStatus');
  const saveBtn = document.getElementById('targetSaveBtn');

  // 月を取得
  const monthInput = document.getElementById('targetMonthInput');
  const monthVal = monthInput.value; // "2026-04"
  if (!monthVal) {
    status.textContent = '対象月を選択してください';
    status.className = 'modal__status modal__status--error';
    return;
  }

  // フォームからデータ収集
  const targets = TARGET_STORES.map(s => {
    const getVal = (field) => {
      const input = document.querySelector(`input[data-store="${s.key}"][data-field="${field}"]`);
      return input ? input.value : '0';
    };
    return {
      store: s.key,
      monthlySales: getVal('monthlySales'),
      foodCostRatio: getVal('foodCostRatio'),
      laborCostRatio: getVal('laborCostRatio'),
      avgPrice: getVal('avgPrice'),
      guestCount: getVal('guestCount')
    };
  });

  // 保存
  status.textContent = '保存中...';
  status.className = 'modal__status modal__status--loading';
  saveBtn.disabled = true;

  try {
    await saveTargetsData(monthVal, targets);
    status.textContent = '保存しました！';
    status.className = 'modal__status modal__status--ok';
    // 2秒後にモーダルを閉じてダッシュボード更新
    setTimeout(() => {
      closeTargetModal();
      loadDashboard();
    }, 1500);
  } catch (e) {
    status.textContent = 'エラー: ' + e.message;
    status.className = 'modal__status modal__status--error';
  } finally {
    saveBtn.disabled = false;
  }
}

function initTargetModal() {
  document.getElementById('targetBtn').addEventListener('click', openTargetModal);
  document.getElementById('targetModalClose').addEventListener('click', closeTargetModal);
  document.getElementById('targetCancelBtn').addEventListener('click', closeTargetModal);
  document.getElementById('targetSaveBtn').addEventListener('click', saveTargets);
  // オーバーレイクリックで閉じる
  document.querySelector('.modal__overlay').addEventListener('click', closeTargetModal);
  // 月変更時にフォームをリセット（目標値は月ごとに異なるため）
  document.getElementById('targetMonthInput').addEventListener('change', renderTargetForm);
}

// ===== 初期化 =====

document.addEventListener('DOMContentLoaded', () => {
  // タブ初期化
  initTabs();

  // 店舗フィルタ初期化
  initStoreFilter();

  // 目標設定モーダル初期化
  initTargetModal();

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
