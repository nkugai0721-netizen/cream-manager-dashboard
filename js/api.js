// GAS Web App API設定
const API_CONFIG = {
  baseUrl: 'https://script.google.com/macros/s/AKfycbyMRwbACXF2av6lDmM3o0Bg4fZtu4MjZ9ejG36a0DlVIGxgkAx_EPH4tSwwvyWSj_83Yw/exec'
};

// 目標データ保存
async function saveTargetsData(month, targets) {
  const token = getToken();
  if (!token) throw new Error('認証トークンがありません');

  const res = await fetch(API_CONFIG.baseUrl, {
    method: 'POST',
    body: JSON.stringify({ action: 'saveTargets', token: token, month: month, targets: targets })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  if (json.status === 'unauthorized') {
    logout();
    throw new Error('認証エラー: ログインし直してください');
  }
  if (json.status === 'error') throw new Error(json.message || 'APIエラー');
  return json;
}

// ダッシュボードデータ取得（nocache=trueでGASキャッシュ強制クリア）
async function fetchDashboardData(nocache = false) {
  const token = getToken();
  if (!token) throw new Error('認証トークンがありません');

  let url = `${API_CONFIG.baseUrl}?action=getDashboard&token=${encodeURIComponent(token)}&_t=${Date.now()}`;
  if (nocache) url += '&nocache=1';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  if (json.status === 'unauthorized') {
    logout();
    throw new Error('認証エラー: ログインし直してください');
  }
  if (json.status === 'error') throw new Error(json.message || 'APIエラー');

  return json.data;
}
