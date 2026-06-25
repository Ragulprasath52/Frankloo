const BASE_URL = 'http://localhost:5000/api/auth';

async function runTests() {
  console.log('--- STARTING AUTHENTICATION VERIFICATION TESTS ---');
  
  const testId = Date.now();
  const mixedCasedEmail = `  TestUser_${testId}@Frankloo.Pro  `;
  const rawUsername = `testuser_${testId}`;
  const password = 'TestPassword123!';
  const name = 'Test User';

  const expectedEmail = `testuser_${testId}@frankloo.pro`;

  console.log(`\n1. [TEST] Register account with mixed casing and spaces: "${mixedCasedEmail}"`);
  const registerRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: mixedCasedEmail,
      username: rawUsername,
      name,
      password
    })
  });

  const registerData = await registerRes.json();
  if (registerRes.status !== 201) {
    console.error('❌ Registration failed:', registerData);
    process.exit(1);
  }
  console.log('✅ Registration succeeded. Returned user:', registerData.user);
  if (registerData.user.email !== expectedEmail) {
    console.error(`❌ Registration email mismatch. Expected: "${expectedEmail}", Got: "${registerData.user.email}"`);
    process.exit(1);
  }
  console.log('✅ Registration email correctly saved as lowercase.');

  const token = registerData.token;

  console.log(`\n2. [TEST] Login using exact original input ("${mixedCasedEmail}")`);
  const loginRes1 = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: mixedCasedEmail,
      password
    })
  });
  const loginData1 = await loginRes1.json();
  if (loginRes1.status !== 200) {
    console.error('❌ Login with exact input failed:', loginData1);
    process.exit(1);
  }
  console.log('✅ Login with exact input succeeded.');

  console.log(`\n3. [TEST] Login using lowercase trimmed email ("${expectedEmail}")`);
  const loginRes2 = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: expectedEmail,
      password
    })
  });
  const loginData2 = await loginRes2.json();
  if (loginRes2.status !== 200) {
    console.error('❌ Login with lowercase email failed:', loginData2);
    process.exit(1);
  }
  console.log('✅ Login with lowercase email succeeded.');

  const uppercaseEmail = expectedEmail.toUpperCase();
  console.log(`\n4. [TEST] Login using uppercase email ("${uppercaseEmail}")`);
  const loginRes3 = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uppercaseEmail,
      password
    })
  });
  const loginData3 = await loginRes3.json();
  if (loginRes3.status !== 200) {
    console.error('❌ Login with uppercase email failed:', loginData3);
    process.exit(1);
  }
  console.log('✅ Login with uppercase email succeeded.');

  console.log('\n5. [TEST] Login with incorrect password');
  const loginResWrong = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: expectedEmail,
      password: 'wrongpassword'
    })
  });
  const loginDataWrong = await loginResWrong.json();
  if (loginResWrong.status === 400 && (loginDataWrong.error === 'Invalid credentials' || loginDataWrong.error === 'Invalid Credentials')) {
    console.log('✅ Correctly rejected login with wrong password.');
  } else {
    console.error('❌ Failed to reject wrong password. Status:', loginResWrong.status, 'Body:', loginDataWrong);
    process.exit(1);
  }

  console.log('\n6. [TEST] Verify seed users remain accessible (e.g., demo@frankloo.pro)');
  const seedLoginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: '  DEMO@frankloo.pro  ', // test lowercase normalization + trimming for seed
      password: 'password123'
    })
  });
  const seedLoginData = await seedLoginRes.json();
  if (seedLoginRes.status !== 200) {
    console.error('❌ Seed user login failed:', seedLoginData);
    process.exit(1);
  }
  console.log('✅ Seed user login succeeded:', seedLoginData.user);

  console.log('\n7. [TEST] Verify auth middleware /me endpoint with valid token');
  const meRes = await fetch(`${BASE_URL}/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const meData = await meRes.json();
  if (meRes.status !== 200) {
    console.error('❌ Auth /me middleware failed:', meData);
    process.exit(1);
  }
  console.log('✅ Auth /me middleware succeeded:', meData);

  console.log('\n--- ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
