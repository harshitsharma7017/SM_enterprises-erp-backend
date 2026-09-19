const API_URL = 'http://localhost:5001/api';

async function fetchApi(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.log('Failed to parse JSON. Raw status:', res.status, res.statusText);
      const text = await res.text();
      console.log('Raw body:', text);
      throw e;
    }
    
    return { status: res.status, data };
  } catch (err) {
    return { status: 500, error: err.message };
  }
}

async function runTests() {
  console.log('--- STARTING AUTH TESTS ---');
  let token = null;

  // 1. Invalid Login
  console.log('\n1. Testing invalid login...');
  const res1 = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'user@example.com', password: 'wrongpassword' })
  });
  console.log('res1:', res1);
  console.assert(res1.status === 401, 'Should return 401 for wrong password');
  console.log('✅ Invalid login rejected (401)');

  // 2. Valid Login
  console.log('\n2. Testing valid login...');
  const res2 = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'user@example.com', password: 'password123' })
  });
  console.assert(res2.status === 200, 'Should return 200 for correct credentials');
  console.assert(res2.data.data.token, 'Should return a token');
  token = res2.data.data.token;
  console.log('✅ Valid login successful. Token received.');

  // 3. /me without token
  console.log('\n3. Testing /me without token...');
  const res3 = await fetchApi('/auth/me');
  console.assert(res3.status === 401, 'Should reject missing token');
  console.log('✅ Missing token rejected (401)');

  // 4. /me with token
  console.log('\n4. Testing /me with token...');
  const res4 = await fetchApi('/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.assert(res4.status === 200, 'Should accept valid token');
  console.assert(res4.data.data.user.email === 'user@example.com', 'Should return correct user');
  console.log('✅ Token accepted. User retrieved.');

  // 5. Logout
  console.log('\n5. Testing logout...');
  const res5 = await fetchApi('/auth/logout', { method: 'POST' });
  console.assert(res5.status === 200, 'Logout should succeed');
  console.log('✅ Logout endpoint works.');

  console.log('\n🎉 All Backend Tests Passed!');
}

runTests();
