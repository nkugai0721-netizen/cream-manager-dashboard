// GAS Web App API設定
const API_CONFIG = {
  baseUrl: 'https://script.google.com/macros/s/AKfycbyMRwbACXF2av6lDmM3o0Bg4fZtu4MjZ9ejG36a0DlVIGxgkAx_EPH4tSwwvyWSj_83Yw/exec'
};

// ダッシュボードデータ取得
async function fetchDashboardData() {
  const token = getToken();
  if (!token) throw new Error('認証トークンがありません');

  const url = `${API_CONFIG.baseUrl}?action=getDashboard&token=${encodeURIComponent(token)}`;
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
