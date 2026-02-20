Si da errores a parte de los obvios por la falta de codigo, lo que hay que importar es esto:
- socket.io, socket.io-client, @mediapipe/hands, @mediapipe/camera_utils

Instrucciones para ejecutar los test rest y sockets:
Smoke, en el sector del desarrollo es una prueba rapida que si falla "sale humo", es decir, que está roto o no hace lo que se espera.

Los test están en la carpeta "scripts" en la raiz del directorio de server.
Hay 3 scripts con extension .mjs (ECMAScript permite usar import y export directamente, util para test segun chatito gepetito)
- rest-smoke.mjs: Comprueba que el back responde y la base de datos funciona con lo basico
- socket-smoke.mjs: Comprueba que los sockets conectan, crean sala, juegan rondas y terminan. Todavia no se controlan los errores, futuras actualizaciones
- smoke-all.mjs: Llama a los 2 scripts anteriores y los ejecuta a la vez

¿Como probar los test?
1. En una terminal aparte, ejecutar el servidor
2. En el package.json ya se controla que con poner en la terminal npm run smoke:rest|smoke:sockets|smoke:all funcione cada test. IMPORTANTE TENER EL SERVIDOR CORRIENDO
3. El test hace la simulación de 2 jugadores que se conectan y juegan, decidiendo al final quien es el ganador
4. Al final del test saldrá un mensaje de "Smoke test (REST + sockets) passed, dando por exitoso el test.