// 認証設定
// パスワードのSHA-256ハッシュとAES暗号化されたAPIトークンを埋め込む
// 初期セットアップ時に setup.html で生成する
const AUTH_CONFIG = {
  passwordHash: '8246b86a6902e4dcfcadc03dd5c61ef53fc618bb0b2ffc194959dd37e735395e',
  encryptedToken: 'a8cbe7fdee906635640cf34935a3cc42b4b033803aa60276ed5f43d0778d8c9e3677f8988dbd52fb889af9b67bdda4bd916163d1ac8e327268eb6fe50afcc8113446a4a522cffc8889fee0de7f38d2443cd12b314e7f429b84aecbb8'
};

// SHA-256ハッシュ
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// AES-GCM暗号化用キー生成（パスワードから派生）
async function deriveKey(password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('cream-dashboard'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

// AES-GCM復号
async function decryptToken(encryptedHex, password) {
  const key = await deriveKey(password);
  const data = Uint8Array.from(encryptedHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

// AES-GCM暗号化（セットアップ用）
async function encryptToken(token, password) {
  const key = await deriveKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(token)
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ログイン
async function login(password) {
  const hash = await sha256(password);
  if (hash !== AUTH_CONFIG.passwordHash) return false;
  try {
    const token = await decryptToken(AUTH_CONFIG.encryptedToken, password);
    sessionStorage.setItem('dashToken', token);
    return true;
  } catch (e) {
    console.error('トークン復号エラー:', e);
    return false;
  }
}

// トークン取得
function getToken() {
  return sessionStorage.getItem('dashToken');
}

// ログアウト
function logout() {
  sessionStorage.removeItem('dashToken');
  showLogin();
}

// 認証状態チェック
function isAuthenticated() {
  return !!getToken();
}
