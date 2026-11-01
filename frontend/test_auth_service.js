/**
 * Test script for frontend authentication services (api.js)
 */

// Polyfill localStorage in Node.js environment
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

// Polyfill fetch for Node.js
if (!global.fetch) {
  const http = require('http');
  // Simple fetch wrapper for http://localhost:8080
  global.fetch = async (url, options = {}) => {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const reqOptions = {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = http.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: async () => JSON.parse(data),
            text: async () => data
          });
        });
      });

      req.on('error', (err) => reject(err));
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  };
}

async function runTests() {
  console.log('--- TEST SUITE: Frontend Authentication Services (api.js) ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName}: ${details}`);
      failCount++;
    }
  }

  // Import functions from api.js (simulated ES-module or direct import)
  // Let's import dynamically
  const api = await import('./src/services/api.js');

  // Test 1: Initial empty state
  localStorage.clear();
  assert(api.getStoredToken() === null, 'T1: getStoredToken() returns null when no session');
  assert(api.getStoredUser() === null, 'T2: getStoredUser() returns null when no session');
  const initialUser = await api.getCurrentUser();
  assert(initialUser === null, 'T3: getCurrentUser() returns null when no token');

  // Test 2: Input validation
  try {
    await api.loginUser('', '');
    assert(false, 'T4: loginUser with empty fields should throw');
  } catch (err) {
    assert(err.message.includes('wajib diisi'), 'T4: loginUser validates empty fields', err.message);
  }

  // Test 3: Invalid credentials
  try {
    await api.loginUser('F5512530109', 'kata_sandi_salah');
    assert(false, 'T5: loginUser with wrong password should throw');
  } catch (err) {
    assert(err.message.includes('tidak cocok') || err.message.includes('INVALID_CREDENTIALS'), 'T5: loginUser rejects invalid password', err.message);
  }

  // Test 4: Valid login (Ilham Arifin)
  try {
    const res = await api.loginUser('F5512530109', 'karyawan123');
    assert(res.token && res.token.length > 10, 'T6: loginUser returns JWT token', res.token);
    assert(res.user && res.user.nik === 'F5512530109', 'T7: loginUser returns user profile', res.user?.nama_lengkap);
    assert(api.getStoredToken() === res.token, 'T8: Token stored in localStorage');
    assert(api.getStoredUser().nik === 'F5512530109', 'T9: User stored in localStorage');
  } catch (err) {
    assert(false, 'T6-T9: loginUser failed', err.message);
  }

  // Test 5: getCurrentUser with active session
  try {
    const currentUser = await api.getCurrentUser();
    assert(currentUser !== null && currentUser.nik === 'F5512530109', 'T10: getCurrentUser returns active user', currentUser?.nama_lengkap);
  } catch (err) {
    assert(false, 'T10: getCurrentUser failed', err.message);
  }

  // Test 6: Logout
  try {
    const loggedOut = api.logoutUser();
    assert(loggedOut === true, 'T11: logoutUser returns true');
    assert(api.getStoredToken() === null, 'T12: Token removed on logout');
    assert(api.getStoredUser() === null, 'T13: User removed on logout');
    const userAfterLogout = await api.getCurrentUser();
    assert(userAfterLogout === null, 'T14: getCurrentUser is null after logout');
  } catch (err) {
    assert(false, 'T11-T14: logoutUser failed', err.message);
  }

  // Test 7: Admin login
  try {
    const adminRes = await api.loginUser('admin@absensi.com', 'admin123');
    assert(adminRes.user && adminRes.user.role === 'ADMIN', 'T15: Admin login returns ADMIN role', adminRes.user?.role);
    api.logoutUser();
  } catch (err) {
    assert(false, 'T15: Admin login failed', err.message);
  }

  console.log(`\nResult: ${passCount} PASSED, ${failCount} FAILED`);
  if (failCount > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
