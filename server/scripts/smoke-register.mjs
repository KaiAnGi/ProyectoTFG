const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const fetchFn = globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : (await import("node-fetch")).default;

/*
  Smoke test específico de registro de usuarios.

  Qué valida:
  - Validaciones de formulario en backend:
   * contraseñas distintas,
   * contraseña demasiado corta,
   * username demasiado corto,
   * email con formato inválido,
   * campos obligatorios faltantes.
  - Registro exitoso con datos válidos.
  - Detección de duplicados por email y por username.
  - Ausencia de fuga de contraseña en la respuesta del registro exitoso.

  Cómo funciona:
  1) `testRegister(...)` envía `POST /api/auth/register` y valida según el caso
    esperado (éxito o error).
  2) Para casos de éxito, comprueba `success`, `user` y que no exista
    `user.password` en el payload.
  3) Para casos de fallo, exige `success === false` y mensaje de error.
  4) `main` crea credenciales únicas con timestamp y ejecuta todos los
    escenarios en orden lógico: validaciones -> alta correcta -> duplicados.
  5) Si cualquier aserción falla, el script aborta con código 1; si todo pasa,
    finaliza con código 0.

  Criterio de éxito:
  - Todas las validaciones y el registro correcto se comportan como se espera.
*/

async function testRegister(data, shouldSucceed, label) {
  const res = await fetchFn(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (shouldSucceed) {
    if (!json.success || !json.user) {
      throw new Error(
        `${label} - Expected success but got: ${JSON.stringify(json)}`,
      );
    }
    // Verificar que no devuelve la contraseña
    if (json.user.password) {
      throw new Error(`${label} - Password leaked in response!`);
    }
    console.log(`[PASS] ${label}`);
    return json;
  } else {
    if (json.success) {
      throw new Error(`${label} - Expected failure but got success`);
    }
    if (!json.error) {
      throw new Error(`${label} - Expected error message`);
    }
    console.log(`[PASS] ${label} - Error: "${json.error}"`);
    return json;
  }
}

async function main() {
  console.log("Auth Registration Smoke Test\n");

  // Generar un username único para evitar colisiones
  const timestamp = Date.now();
  const uniqueUsername = `testuser_${timestamp}`;
  const uniqueEmail = `test_${timestamp}@example.com`;

  console.log("Testing validations...");

  // 1. Contraseñas no coinciden
  await testRegister(
    {
      username: uniqueUsername,
      email: uniqueEmail,
      password: "password123",
      confirmPassword: "password456",
    },
    false,
    "Reject mismatched passwords",
  );

  // 2. Contraseña muy corta
  await testRegister(
    {
      username: uniqueUsername,
      email: uniqueEmail,
      password: "12345",
      confirmPassword: "12345",
    },
    false,
    "Reject short password",
  );

  // 3. Username muy corto
  await testRegister(
    {
      username: "ab",
      email: uniqueEmail,
      password: "password123",
      confirmPassword: "password123",
    },
    false,
    "Reject short username",
  );

  // 4. Email inválido
  await testRegister(
    {
      username: uniqueUsername,
      email: "invalid-email",
      password: "password123",
      confirmPassword: "password123",
    },
    false,
    "Reject invalid email",
  );

  // 5. Campos faltantes
  await testRegister(
    {
      username: uniqueUsername,
      email: uniqueEmail,
      password: "password123",
      // Sin confirmPassword
    },
    false,
    "Reject missing fields",
  );

  console.log("\nTesting successful registration...");

  // 6. Registro exitoso
  const result = await testRegister(
    {
      username: uniqueUsername,
      email: uniqueEmail,
      password: "password123",
      confirmPassword: "password123",
    },
    true,
    "Register new user",
  );

  // Verificar campos devueltos
  if (!result.user._id) throw new Error("Missing _id in response");
  if (result.user.username !== uniqueUsername)
    throw new Error("Username mismatch");
  if (result.user.email !== uniqueEmail) throw new Error("Email mismatch");
  console.log(`  User ID: ${result.user._id}`);
  console.log(`  Username: ${result.user.username}`);
  console.log(`  Email: ${result.user.email}`);
  console.log(`  Profile Picture: ${result.user.profilePicture || "null"}`);

  console.log("\nTesting duplicate detection...");

  // 7. Email duplicado
  await testRegister(
    {
      username: `another_${timestamp}`,
      email: uniqueEmail, // Email ya usado
      password: "password123",
      confirmPassword: "password123",
    },
    false,
    "Reject duplicate email",
  );

  // 8. Username duplicado
  await testRegister(
    {
      username: uniqueUsername, // Username ya usado
      email: `another_${timestamp}@example.com`,
      password: "password123",
      confirmPassword: "password123",
    },
    false,
    "Reject duplicate username",
  );

  console.log("\nAll auth registration tests passed!");
}

main().catch((err) => {
  console.error("\nAuth registration test failed:", err.message);
  process.exit(1);
});
