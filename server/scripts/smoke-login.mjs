import fetch from "node-fetch";

const BASE_URL = "http://localhost:3000";
const TIMEOUT_MS = 10000;

/*
  Smoke test de autenticación (registro + login).

  Qué valida:
  - Registro correcto de usuario nuevo.
  - Rechazo de email duplicado.
  - Rechazo de contraseña inválida en registro.
  - Login exitoso con credenciales válidas.
  - Rechazo de login con contraseña incorrecta.
  - Rechazo de login con usuario inexistente.

  Cómo funciona:
  1) Define helper `test(...)` para ejecutar una petición HTTP y comparar su
    código de estado con el esperado.
  2) Cada caso guarda resultado en `results` para construir un resumen final,
    sin detener inmediatamente la suite cuando falla una prueba.
  3) Genera un usuario único por timestamp para evitar colisiones entre
    ejecuciones.
  4) Ejecuta los escenarios de forma secuencial, mostrando status y payload
    recibido para facilitar depuración.
  5) Al final imprime métricas (`pasadas/total`) y termina con código 0 solo
    si todas las pruebas pasaron; en caso contrario, código 1.

  Criterio de éxito:
  - Todas las respuestas tienen el status esperado para cada escenario.
*/

const results = [];

async function test(
  name,
  method,
  endpoint,
  body = undefined,
  expectedStatus = 200,
) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      timeout: TIMEOUT_MS,
    });

    const data = await response.json();

    if (response.status !== expectedStatus) {
      results.push({
        name,
        success: false,
        message: `Status ${response.status} (esperado ${expectedStatus})`,
      });
    } else {
      results.push({ name, success: true, message: "OK" });
    }

    console.log(`\n${name}:`);
    console.log(`Status: ${response.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    results.push({
      name,
      success: false,
      message: error instanceof Error ? error.message : String(error),
    });
    console.log(`\n${name}: ERROR`);
    console.log(error);
  }
}

async function runTests() {
  console.log("🧪 Iniciando pruebas de autenticación...\n");

  // Registrar un nuevo usuario
  const timestamp = Date.now();
  const testUser = {
    username: `testuser_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: "Test123456",
    confirmPassword: "Test123456",
  };

  await test(
    "Register - Registro exitoso",
    "POST",
    "/api/auth/register",
    testUser,
    201,
  );

  // Intentar registrar con el mismo email
  await test(
    "Register - Email duplicado",
    "POST",
    "/api/auth/register",
    testUser,
    400,
  );

  // Registrar con contraseña inválida (menos de 6 caracteres)
  await test(
    "Register - Contraseña inválida",
    "POST",
    "/api/auth/register",
    {
      username: `testuser2_${timestamp}`,
      email: `test2_${timestamp}@example.com`,
      password: "test",
      confirmPassword: "test",
    },
    400,
  );

  // Login exitoso
  await test("Login - Señal de entrada exitosa", "POST", "/api/auth/login", {
    email: testUser.email,
    password: testUser.password,
  });

  // Login con contraseña incorrecta
  await test(
    "Login - Contraseña incorrecta",
    "POST",
    "/api/auth/login",
    {
      email: testUser.email,
      password: "wrongpassword",
    },
    401,
  );

  // Login con email inexistente
  await test(
    "Login - Usuario inexistente",
    "POST",
    "/api/auth/login",
    {
      email: "nonexistent@example.com",
      password: "password123",
    },
    401,
  );

  // Resumen
  console.log("\n\n" + "=".repeat(50));
  console.log("📊 RESUMEN DE PRUEBAS");
  console.log("=".repeat(50));

  const passed = results.filter((r) => r.success).length;
  const total = results.length;

  results.forEach((result) => {
    const icon = result.success ? "✅" : "❌";
    console.log(`${icon} ${result.name}: ${result.message}`);
  });

  console.log("\n" + "=".repeat(50));
  console.log(`Resultados: ${passed}/${total} pruebas pasadas`);
  console.log("=".repeat(50));

  process.exit(passed === total ? 0 : 1);
}

runTests();