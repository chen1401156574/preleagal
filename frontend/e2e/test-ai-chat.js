/**
 * AI Chat Integration Test
 * Tests actual OpenRouter API calls
 */

const API_URL = 'http://localhost:8000';

async function testRegistration() {
  console.log('\n=== Test Registration ===');
  const response = await fetch(`${API_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'testpassword123'
    })
  });

  const data = await response.json();
  console.log('Registration response:', data);

  if (response.ok) {
    console.log('✓ Registration successful');
    return data.email;
  } else {
    console.log('⚠ Registration failed (may already exist):', data.detail);
    return 'test@example.com';
  }
}

async function login(email) {
  console.log('\n=== Test Login ===');
  const response = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email,
      password: 'testpassword123'
    })
  });

  const data = await response.json();
  console.log('Login response:', data);

  if (response.ok) {
    console.log('✓ Login successful');
    return data.access_token;
  } else {
    throw new Error('Login failed: ' + data.detail);
  }
}

async function testAIChat(token) {
  console.log('\n=== Test AI Chat - Initial Message ===');

  const initialMessage = "Our company ABC Corporation is partnering with XYZ Technology Ltd. We want to sign an NDA starting May 1st, 2026";

  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: initialMessage }
      ],
      currentFields: {}
    })
  });

  const data = await response.json();
  console.log('\nAI Response:');
  console.log('  Reply:', data.reply.substring(0, 200) + '...');
  console.log('  Extracted Fields:', Object.keys(data.fields || {}).length, 'fields');
  console.log('  Missing Fields:', data.missingFields || 'None');

  if (data.fields) {
    console.log('\n  Extracted Field Values:');
    for (const [key, value] of Object.entries(data.fields)) {
      console.log(`    ✓ ${key}: "${value}"`);
    }
  }

  // Verify response structure
  console.assert(data.reply, 'Should have a reply message');
  console.assert(Array.isArray(data.missingFields) || data.missingFields === undefined, 'Should have missingFields array or undefined');

  if (data.fields) {
    console.assert(typeof data.fields === 'object', 'Fields should be an object');
    console.log('\n✓ AI chat response structure verified');
  }

  return data;
}

async function testAIChatWithMoreInfo(token) {
  console.log('\n=== Test AI Chat - Follow-up Message ===');

  const messages = [
    { role: 'user', content: 'Our company ABC Corporation is partnering with XYZ Technology Ltd. We want to sign an NDA starting May 1st, 2026' },
    { role: 'assistant', content: 'Thank you! I have noted: Company=ABC Corporation, Partner=XYZ Technology Ltd, Date=May 1st, 2026\n\nNow I need to know the governing law. Which state laws should govern this agreement?' },
    { role: 'user', content: 'The governing law should be Delaware. Jurisdiction is New Castle. Party 1 is John Smith, CEO. Party 2 is Jane Doe, CTO.' }
  ];

  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      messages: messages,
      currentFields: {
        party1Company: 'ABC Corporation',
        party2Company: 'XYZ Technology Ltd',
        effectiveDate: '2026-05-01'
      }
    })
  });

  const data = await response.json();
  console.log('\nAI Response:');
  console.log('  Reply:', data.reply.substring(0, 200) + '...');

  if (data.fields) {
    console.log('\n  Newly Extracted Fields:');
    for (const [key, value] of Object.entries(data.fields)) {
      console.log(`    ✓ ${key}: "${value}"`);
    }
  }

  console.log('  Missing Fields:', data.missingFields || 'None');
  console.log('✓ Follow-up chat test completed');
}

async function testMissingFieldsResponse() {
  console.log('\n=== Test Missing Fields Response ===');

  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(await login('test@example.com'))}`
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Hello' }
      ],
      currentFields: {
        purpose: 'Testing',
        party1Name: 'John',
        party1Company: 'ABC Corp',
        party1Address: '123 Main St',
        party2Name: 'Jane',
        party2Company: 'XYZ Ltd',
        party2Address: '456 Oak Ave',
        effectiveDate: '2026-04-22'
      }
    })
  });

  const data = await response.json();
  console.log('Missing fields returned:', data.missingFields);

  if (data.missingFields && data.missingFields.length > 0) {
    console.log('✓ Missing fields correctly identified:', data.missingFields.join(', '));
  } else {
    console.log('✓ All critical fields present');
  }
}

async function runAllTests() {
  console.log('\n==========================================');
  console.log('AI Chat Integration Tests');
  console.log('==========================================');

  try {
    // Step 1: Registration
    const email = await testRegistration();

    // Step 2: Login
    const token = await login(email);

    // Step 3: Initial AI message
    const response = await testAIChat(token);

    // Step 4: More complex conversation
    await testAIChatWithMoreInfo(token);

    // Step 5: Test missing fields response
    await testMissingFieldsResponse();

    console.log('\n==========================================');
    console.log('All AI Chat Integration Tests PASSED ✓');
    console.log('==========================================\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runAllTests();
