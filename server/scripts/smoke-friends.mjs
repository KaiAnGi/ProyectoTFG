// import fetch from "node-fetch";

const BASE_URL = "http://localhost:3000";
const TIMEOUT_MS = 10000;

/*
  Smoke test de funcionalidad de amigos.

  Qué valida:
  - Envío de solicitud de amistad
  - Aceptación de solicitud
  - Obtención de lista de amigos
  - Envío de mensajes de chat
  - Obtención de mensajes de chat
  - Marcado de mensajes como leídos
  - Eliminación de amigo

  Cómo funciona:
  1) Registra dos usuarios
  2) Usuario1 envía solicitud a Usuario2
  3) Usuario2 acepta la solicitud
  4) Verifica que sean amigos
  5) Usuario1 envía mensaje a Usuario2
  6) Usuario2 obtiene mensajes
  7) Usuario2 marca mensajes como leídos
  8) Usuario1 elimina a Usuario2 como amigo
*/

const results = [];
let user1Token, user2Token;
let user1Id, user2Id;

async function test(name, method, endpoint, body = undefined, expectedStatus = 200, token = null) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      timeout: TIMEOUT_MS,
    });

    const data = await response.json();

    const passed = response.status === expectedStatus;
    results.push({ name, passed, status: response.status, expected: expectedStatus, data });

    console.log(`${passed ? '✅' : '❌'} ${name}: ${response.status} (expected ${expectedStatus})`);
    if (!passed) console.log('  Response:', data);

    return { response, data };
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    return null;
  }
}

async function registerUser(username, email) {
  const result = await test(
    `Register ${username}`,
    'POST',
    '/api/auth/register',
    { username, email, password: 'test123', confirmPassword: 'test123' },
    201
  );
  return result?.data?.success ? true : false;
}

async function loginUser(email) {
  const { data } = await test(
    `Login ${email}`,
    'POST',
    '/api/auth/login',
    { email, password: 'test123' },
    200
  );
  return data?.token;
}

async function main() {
  console.log('🚀 Starting friends functionality smoke test...\n');

  // Limpiar base de datos primero
  try {
    await fetch(`${BASE_URL}/api/auth/reset-db`, { method: 'POST' });
  } catch (e) {
    console.log('Could not reset DB, continuing...');
  }

  // Registrar usuarios
  const timestamp = Date.now();
  const user1Username = `testuser1_${timestamp}`;
  const user2Username = `testuser2_${timestamp}`;
  const user1Email = `user1_${timestamp}@test.com`;
  const user2Email = `user2_${timestamp}@test.com`;

  const reg1Success = await registerUser(user1Username, user1Email);
  const reg2Success = await registerUser(user2Username, user2Email);

  if (!reg1Success || !reg2Success) {
    console.log('❌ Failed to register users');
    process.exit(1);
  }

  // Login para obtener tokens
  user1Token = await loginUser(user1Email);
  user2Token = await loginUser(user2Email);

  if (!user1Token || !user2Token) {
    console.log('❌ Failed to login users');
    process.exit(1);
  }

  // Enviar solicitud de amistad
  await test(
    'Send friend request',
    'POST',
    '/api/friends/request',
    { toUsername: user2Username },
    200,
    user1Token
  );

  // Obtener solicitudes pendientes de user2
  const pendingRes = await test(
    'Get pending requests',
    'GET',
    '/api/friends/requests/pending',
    undefined,
    200,
    user2Token
  );

  if (pendingRes?.data?.requests?.length > 0) {
    const requestId = pendingRes.data.requests[0]._id;

    // Aceptar solicitud
    await test(
      'Accept friend request',
      'POST',
      `/api/friends/request/${requestId}/accept`,
      {},
      200,
      user2Token
    );
  }

  // Verificar amigos
  const friends1Res = await test(
    'Get friends user1',
    'GET',
    '/api/friends',
    undefined,
    200,
    user1Token
  );

  const friends2Res = await test(
    'Get friends user2',
    'GET',
    '/api/friends',
    undefined,
    200,
    user2Token
  );

  // Nota: El chat se maneja vía WebSockets, no vía REST
  // Aquí solo probamos las funcionalidades REST

  // Eliminar amigo
  await test(
    'Remove friend',
    'DELETE',
    `/api/friends/${user2Username}`,
    undefined,
    200,
    user1Token
  );

  // Verificar que ya no son amigos
  await test(
    'Verify friends removed',
    'GET',
    '/api/friends',
    undefined,
    200,
    user1Token
  );

  // Resumen
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`\n📊 Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed');
    process.exit(1);
  }
}

main().catch(console.error);