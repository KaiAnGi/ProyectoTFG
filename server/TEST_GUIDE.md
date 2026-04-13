# Tests del Sistema de Puntuación Actualizado
Este documento explica cómo ejecutar los tests para verificar que los cambios en las reglas del juego funcionan correctamente.

## Cambios Implementados

1. **Partidas de 3, 5 o 9 rondas**: El jugador que crea la sala elige el número de rondas
2. **Sistema de victorias por partida**: Las victorias se guardan solo al terminar la partida completa
3. **Sin reset de victorias**: Si pierdes una partida, no se pierden las victorias previas
4. **Campos de BD actualizados**: Campo `matchVictories` en lugar de `consecutiveWins` en el modelo Leaderboard

## Cómo Ejecutar los Tests

### Prerrequísitos

1. Asegúrate que el servidor está levantado:
```bash
cd server
npm install
npm start
```

2. En otra terminal, asegúrate de que la BD está limpia:
```bash
cd server
npm run db:reset
```

### Tests Disponibles

#### 1. Test de Socket (Prueba de Flujo Completo)
Verifica que toda la lógica del juego funciona correctamente con maxRounds:

```bash
cd server
npm run smoke:sockets
```

**Qué valida:**
- ✓ Creación de sala con maxRounds
- ✓ Cálculo correcto de victorias necesarias
- ✓ Flag `isFinished` se activa cuando alguien gana
- ✓ Evento `match_finished` se emite correctamente
- ✓ Los scores finales son correctos

**Ejemplo de salida exitosa:**
```
alice connected
bob connected
room_created { roomId: 'room_...', message: '...', maxRounds: 3 }
alice room_joined { roomId: '...', players: [ 'alice', 'bob' ], maxRounds: 3 }
bob room_joined { roomId: '...', players: [ 'alice', 'bob' ], maxRounds: 3 }
start_round { roundNumber: 1 }
...
round_result { ..., isFinished: true }
match_finished { winner: 'alice', finalScore: { player1: 2, player2: 0 } }
```

#### 2. Test de MaxRounds (Todas las Variantes)
Verifica que 3, 5 y 9 rondas funcionan correctamente:

```bash
cd server
npm run test:maxrounds
```

**Qué valida:**
- ✓ maxRounds=3 requiere 2 victorias
- ✓ maxRounds=5 requiere 3 victorias
- ✓ maxRounds=9 requiere 5 victorias
- ✓ Las partidas terminan automáticamente cuando se alcanzan las victorias necesarias
- ✓ El flag `isFinished` es correcto para cada caso

**Ejemplo de salida:**
```
=== TEST: 3 rondas (BO3) ===
Alice conectada
Sala creada con maxRounds=3
Ronda 1 iniciada
Ronda 1: Alice 1 - 0 Bob | isFinished: false
Ronda 2 iniciada
Ronda 2: Alice 2 - 0 Bob | isFinished: true
Partida terminada. Ganador: alice_3
✓ Test 3 rondas (BO3) completado exitosamente

=== TEST: 5 rondas (BO5) ===
...

=== TEST: 9 rondas (BO9) ===
...
```

#### 3. Test de MaxRounds por Defecto
Verifica que cuando no se proporciona maxRounds, se usa 3 como valor por defecto:

```bash
cd server
npm run test:default
```

**Qué valida:**
- ✓ Si no se envía maxRounds en `create_room`, el servidor usa 3
- ✓ El cliente recibe maxRounds=3 en `room_created` y `room_joined`
- ✓ La partida funciona correctamente con el valor por defecto

**Ejemplo de salida:**
```
Alice conectada
Sala creada, maxRounds recibido: 3
✓ Valor por defecto correcto: 3
Alice room_joined, maxRounds: 3
Bob room_joined, maxRounds: 3
Partida iniciada con maxRounds=3
Ronda 1: Alice 1 - 0 Bob | isFinished: false
Ronda 2: Alice 2 - 0 Bob | isFinished: true
Partida terminada. Ganador: alice_default

=== ✓ TEST DEFAULTMAXROUNDS PASÓ EXITOSAMENTE ===
```

#### 4. Test de Ranking (BD)
Verifica que las victorias se guardan correctamente en la BD:

```bash
cd server
npm run test:ranking
```

**Qué valida:**
- ✓ Las victorias se incrementan cuando ganas
- ✓ Las derrotas NO eliminan las victorias previas (cambio importante)
- ✓ El ranking se ordena correctamente por `matchVictories`
- ✓ Se puede obtener estadísticas de un jugador específico

**Ejemplo de salida:**
```
=== TEST RANKING ENDPOINT ===

Obteniendo ranking inicial...
Ranking inicial: [...]

Actualizando jugador 'TestWinner' con victoria...
Winner update result: { success: true, player: { playerName: 'TestWinner', matchVictories: 1 } }
✓ Victoria registrada correctamente

Actualizando mismo jugador con derrota...
Lose update result: { success: true, player: { playerName: 'TestWinner', matchVictories: 1 } }
✓ Derrota procesada sin resetear victorias

Ranking final: [...]
✓ Ranking ordenado correctamente por matchVictories
```

#### 5. Test Completo (Todos los Anteriores)
Ejecuta todos los tests de juego en secuencia (recomendado):

```bash
cd server
npm run test:game
```

El orden de ejecución es:
1. `smoke:sockets` - Test básico de flujo de partida
2. `test:default` - Test de valor por defecto de maxRounds
3. `test:maxrounds` - Test de 3, 5 y 9 rondas
4. `test:ranking` - Test de guardado en BD

**Tiempo aproximado:** 2-3 minutos

### Cómo Leer los Resultados

**Salida exitosa:** El comando termina con `exit code 0` y mensajes con `✓`

**Salida fallida:** El comando termina con `exit code 1` y mensajes de error con `ERROR*` o `FALLA`

## Troubleshooting

### "Connection refused"
El servidor no está levantado. Ejecuta:
```bash
cd server
npm start
```

### "Timeout en test"
El servidor está muy lento o hay un problema de red. Intenta:
1. Reiniciar el servidor
2. Aumentar el timeout: `SMOKE_TIMEOUT_MS=30000 npm run test:maxrounds`

### "round_result mismatch"
La lógica de cálculo de ganador no coincide. Verifica que `gameRoom.ts` tiene la lógica correcta de `calculateWinner()`.

### "Ranking no guardado"
Asegúrate de que MongoDB está levantado y la BD está limpia:
```bash
npm run db:reset
```

## Resumen de Cambios en la Lógica

### Antes (Sistema Antiguo)
```
- Racha de victorias consecutivas
- Se reseteaba al perder
- No había límite de rondas
- Leaderboard: consecutiveWins
```

### Ahora (Sistema Nuevo)
```
- 3, 5 o 9 rondas seleccionables
- Victorias acumuladas por partida (no racha)
- Partida termina cuando alguien gana maxRounds/2 + 1 rondas
- Derrota NO elimina victorias previas
- Leaderboard: matchVictories
```

### Fórmula de Victorias Necesarias
```
winsNeeded = Math.floor(maxRounds / 2) + 1

3 rondas  → winsNeeded = 2
5 rondas  → winsNeeded = 3
9 rondas  → winsNeeded = 5
```

## Ejemplo de Flujo Completamente

1. Alice crea sala con `maxRounds=3`
2. Bob se une a la sala
3. Se juegan rondas hasta que alguien gane 2 (rock-paper-scissors):
   - Ronda 1: Alice elige rock, Bob elige scissors → Alice gana (1-0)
   - Ronda 2: Alice elige paper, Bob elige rock → Alice gana (2-0)
   - `isFinished: true` → Se emite `match_finished`
4. Las victorias se guardan en BD:
   - `updatePlayerStats('alice', true)` → matchVictories++
   - `updatePlayerStats('bob', false)` → matchVictories se mantiene igual
5. Se actualiza el ranking
