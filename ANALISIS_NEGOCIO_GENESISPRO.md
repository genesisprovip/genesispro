# Analisis Estrategico GenesisPro — Documento para Eduardo
**Fecha:** 11 Marzo 2026
**Preparado por:** Claude (equipo GenesisPro)

---

## 1. RESUMEN DE LO QUE CONVERSAMOS

### El modelo que definimos juntos:

1. **Streaming INCLUIDO en planes empresario** (no cobrado aparte) — para competir con plataformas que lo dan gratis
2. **Comisiones al empresario por suscripciones** que genere a traves de sus eventos
3. **Apuestas como Fase 2** — cuando haya base de usuarios solida y licencias
4. **Tracking por codigo de evento** — cada suscripcion se rastrea hasta el empresario que la genero

### Estructura de planes empresario acordada:

| | Basico $799 | Pro $1,999 | Premium $2,999 |
|---|---|---|---|
| Eventos/mes | 4 | 12 | 30 |
| Simultaneos | 1 | 3 | 5 |
| Streams incluidos | 1 | 2 | 3 |
| Resolucion max | 360p | 720p | 1080p |
| Audiencia/stream | 50 | 150 | 400 |
| Estadisticas evento | No | Si | Si |
| Comisiones referidos | No | No | Si |

### Comisiones empresario:
- **Mes 1** (compra del suscriptor): 20% del neto
- **Meses 2-12** (renovaciones): 3% del neto
- **Mes 13+**: Se resetea, $0

---

## 2. ANALISIS: ¿VAMOS EN EL SENTIDO CORRECTO?

### Lo que esta BIEN:

**A) El ecosistema completo es la ventaja competitiva**
GenesisPro no es solo streaming. Es cotejo + derby + finanzas + streaming + avisos + estadisticas. Nadie mas ofrece todo junto. Las plataformas que transmiten gratis solo hacen ESO — transmitir. No tienen sistema de gestion de eventos.

**B) El empresario como canal de ventas**
Es brillante. El empresario ya tiene la audiencia (los galleros). En vez de gastar en marketing, le pagas comision por traer clientes. Es mas barato que publicidad en Facebook/Google.

**C) Streaming como gancho, no como producto**
Correcto. El streaming atrae viewers → los viewers se registran → algunos se suscriben → ingreso recurrente. El costo de CDN (~$50-150 USD/mes) es tu "presupuesto de marketing".

**D) Comisiones con limite de 12 meses**
Justo para ambas partes. El empresario tiene incentivo pero no vive eternamente de un solo referido.

### Lo que NECESITA ATENCION:

**A) Comisiones solo para Premium**
En la tabla dijimos que comisiones referidos solo aplica para Premium ($2,999). PERO el incentivo de comisiones es lo que hace que TODOS los empresarios quieran traer gente.

**Mi sugerencia:** Dar comisiones a TODOS los planes pero con tasas diferentes:
- Basico: 10% mes 1, 1% meses 2-12
- Pro: 15% mes 1, 2% meses 2-12
- Premium: 20% mes 1, 3% meses 2-12

Asi el Basico tambien tiene incentivo de crecer, y cuando vea que con Premium ganaria mas, se upgradea solo.

**B) Audiencia de 50 viewers en Basico es muy baja**
Un palenque chico tiene 30-50 personas PRESENCIALES. Si 20 mas quieren ver desde casa, ya rebasaste el limite.

**Mi sugerencia:** Subir a: Basico 100, Pro 300, Premium 500. El costo de CDN extra es minimo ($1-3 USD mas por stream) pero el empresario se siente menos limitado.

**C) ¿Quien transmite si el empresario tiene 5 eventos simultaneos?**
El empresario no puede estar en 5 lugares. Necesita delegar. Actualmente la app solo permite que el organizador (owner del evento) transmita.

**Para implementar:** Agregar campo `operadores_evento` — personas autorizadas a transmitir en nombre del empresario. Cada operador con su telefono y la app puede iniciar broadcast en el evento asignado.

---

## 3. ANALISIS LEGAL — APUESTAS EN PELEAS DE GALLOS

### Marco legal actual (Mexico 2026):

**Autoridad:** Direccion General de Juegos y Sorteos (SEGOB)
**Ley:** Ley Federal de Juegos y Sorteos y su Reglamento

### Peleas de gallos — LEGAL con permiso

Las peleas de gallos con apuestas SON LEGALES en Mexico. Requieren:
- Permiso de SEGOB por evento
- Vigencia maxima: 28 dias por permiso
- Solicitante: Persona fisica o sociedad mercantil constituida en Mexico
- Opinion favorable del municipio/estado donde se realiza
- Plazo de respuesta: 10 dias habiles

### Apuestas EN LINEA — ZONA GRIS IMPORTANTE

**Lo que encontre:**
- Los permisos de SEGOB para peleas de gallos son para **establecimientos fisicos** (palenques)
- NO hay precedente claro de permisos para apuestas de peleas de gallos **en linea/digital**
- Las casas de apuestas en linea (Caliente, Betcris, etc.) tienen licencias de SEGOB pero para deportes y casino, NO para peleas de gallos
- La ley actual NO menciona especificamente apuestas digitales en peleas de gallos

### ¿Que significa esto para GenesisPro?

**RIESGO ALTO si operamos sin licencia.** Las sanciones incluyen:
- Multas
- Clausura
- Responsabilidad penal (Art. 4 de la Ley Federal de Juegos y Sorteos)

**CAMINO LEGAL posible:**
1. Constituir una sociedad mercantil mexicana (SA de CV o SAPI)
2. Solicitar permiso de SEGOB especificamente para cruce de apuestas en peleas de gallos
3. Argumentar que la plataforma digital es una EXTENSION del palenque fisico (el stream ES el palenque virtual)
4. Obtener opinion favorable del municipio donde se realizan los eventos
5. Renovar cada 28 dias (o negociar permisos mas largos)

**ALTERNATIVA MAS SEGURA:**
GenesisPro NO opera las apuestas directamente. En su lugar:
- El empresario (que ya tiene permiso de SEGOB para su palenque) es el responsable legal de las apuestas
- GenesisPro solo proporciona la HERRAMIENTA TECNOLOGICA (software)
- El dinero de apuestas pasa entre apostadores y el palenque, no por GenesisPro
- GenesisPro cobra una licencia de software/comision por uso de la herramienta

Esto es similar a como Stripe no es un banco, solo procesa pagos. GenesisPro no seria una casa de apuestas, solo el software que usa el palenque autorizado.

### Recomendacion:
**Consultar un abogado especializado en juegos y sorteos ANTES de implementar apuestas.** El costo de una consulta legal ($5,000-15,000 MXN) es nada comparado con el riesgo de operar sin licencia.

---

## 4. SISTEMA DE PAGOS PARA APUESTAS

### Stripe NO se puede usar para apuestas
Stripe tiene gambling en su lista de negocios prohibidos/restringidos. Aunque se puede pedir aprobacion especial, es poco probable para peleas de gallos.

### Opciones de procesador de pagos:

| Procesador | Soporta gambling | Metodos de pago | Comision |
|---|---|---|---|
| **Conekta** | Si (con licencia) | Tarjeta, OXXO, transferencia | 2.9% + $2.50 |
| **Kushki** | Si (gaming vertical) | Tarjeta, PSE, efectivo | 3.5% + variable |
| **OpenPay (BBVA)** | Parcial | Tarjeta, SPEI, tiendas | 2.9% + $2.50 |
| **Mercado Pago** | No directamente | — | — |
| **SPEI directo** | Si (tu banco) | Transferencia bancaria | Costo minimo |

### Mi sugerencia para el flujo de apuestas:

**Fase 1 — Saldo en plataforma (wallet interno)**
```
Usuario deposita → SPEI/OXXO/Tarjeta → Saldo GenesisPro
Saldo GenesisPro → Apuesta en pelea
Gana → Saldo aumenta
Retira → SPEI a su cuenta bancaria
```

**¿Por que wallet interno?**
- No necesitas procesar pago en cada apuesta (ahorro en comisiones)
- El usuario deposita una vez, apuesta multiples veces
- Solo pagas comision de procesador en depositos y retiros
- Mas rapido para apuestas en vivo (ya tiene saldo)

**Flujo de dinero:**
```
Apostador deposita $500 MXN via OXXO
  → Conekta cobra comision (~$17 MXN)
  → $483 se acreditan al wallet del usuario
  → Usuario apuesta $200 en pelea #5 (ROJO)
  → ROJO gana → usuario recibe $380 (2:1 menos comision casa 5%)
  → Usuario retira $600 via SPEI
  → Costo de transferencia SPEI (~$3 MXN)
  → Le llegan $597 a su banco
```

**Comision de la casa (GenesisPro):**
- 5% de cada apuesta ganada (estandar en la industria)
- De ese 5%, se divide:
  - 60% GenesisPro (operacion, infraestructura, licencias)
  - 30% Empresario (comision por su evento)
  - 10% Impuestos/reservas

### Costos de implementacion:

| Componente | Estimado |
|---|---|
| Integracion Conekta/procesador | 2-3 semanas desarrollo |
| Sistema de wallet (depositos/retiros) | 3-4 semanas desarrollo |
| Motor de apuestas (odds, liquidacion) | 4-6 semanas desarrollo |
| KYC/verificacion de identidad | 2 semanas |
| Consulta legal + tramite SEGOB | 1-3 meses |
| **Total estimado** | **3-5 meses** |

---

## 5. MANEJO DE SALDOS DE APUESTAS

### ¿Existe algo ya?
NO. Actualmente GenesisPro no tiene sistema de wallet ni manejo de saldos. Todo lo que existe es:
- Stripe para suscripciones (NO sirve para apuestas)
- Modulo de finanzas de evento (solo registro, no procesa pagos reales)

### Lo que se necesita construir:

**A) Tabla `wallets`**
```sql
- usuario_id (FK)
- saldo_disponible (DECIMAL)
- saldo_en_apuesta (DECIMAL) -- bloqueado mientras la pelea esta en curso
- total_depositado (historico)
- total_retirado (historico)
- updated_at
```

**B) Tabla `transacciones_wallet`**
```sql
- usuario_id
- tipo (deposito, retiro, apuesta, ganancia, comision)
- monto
- saldo_anterior
- saldo_posterior
- referencia (pelea_id, evento_id, etc)
- procesador_referencia (ID de Conekta/SPEI)
- estado (pendiente, completada, fallida, cancelada)
- created_at
```

**C) Tabla `apuestas`**
```sql
- usuario_id
- pelea_id
- evento_id
- monto
- seleccion (rojo, verde)
- cuota (odds)
- ganancia_potencial
- estado (activa, ganada, perdida, cancelada)
- liquidada_at
```

**D) Sistema de liquidacion automatica**
Cuando se registra resultado de pelea:
1. Buscar todas las apuestas activas de esa pelea
2. Las ganadoras: calcular ganancia, acreditar a wallet
3. Las perdedoras: marcar como perdida (saldo ya estaba bloqueado)
4. Calcular comision casa (5%)
5. Distribuir comision: 60% GenesisPro, 30% empresario, 10% reserva
6. Registrar todo en transacciones_wallet

---

## 6. ROADMAP PROPUESTO

### FASE 1: AHORA (Marzo-Abril 2026)
**Objetivo:** Generar base de usuarios con streaming gratuito

- [x] Streaming funcional (ya existe)
- [ ] Actualizar EMPRESARIO_CONFIG con nuevos planes y limites
- [ ] Implementar tracking de referidos por codigo de evento
- [ ] Campo `referido_por_evento_id` en tabla usuarios
- [ ] Dashboard empresario: seccion "Mis Referidos"
- [ ] Pantalla de suscripcion diferenciada (usuario vs empresario) — YA EN PROGRESO
- [ ] Streaming ligado a codigo de evento — YA EN PROGRESO
- [ ] Fix: evento finalizado no permite transmitir — YA EN PROGRESO

### FASE 2: Mayo-Julio 2026
**Objetivo:** Eventos grandes de mayo, crecer base de usuarios

- [ ] CDN (BunnyCDN) para soportar 200+ viewers
- [ ] Operadores delegados (personas que transmiten en nombre del empresario)
- [ ] Sistema de comisiones automatico (calculo mensual)
- [ ] Dashboard de comisiones para empresario
- [ ] Notificaciones de comisiones ganadas
- [ ] Mejorar estadisticas de alcance (viewers por evento, tiempo de visualizacion)

### FASE 3: Agosto-Octubre 2026
**Objetivo:** Preparar infraestructura legal y tecnica para apuestas

- [ ] Consulta legal especializada en juegos y sorteos
- [ ] Definir modelo legal (GenesisPro como software vs operador)
- [ ] Integrar procesador de pagos para gambling (Conekta o Kushki)
- [ ] Desarrollar sistema de wallet (depositos/retiros)
- [ ] Desarrollar motor de apuestas (MVP)
- [ ] KYC/verificacion de identidad
- [ ] Pruebas internas cerradas

### FASE 4: Noviembre 2026 - Enero 2027
**Objetivo:** Lanzar apuestas en beta controlada

- [ ] Obtener permiso SEGOB (o acuerdo con empresarios que ya tienen permiso)
- [ ] Beta con 2-3 empresarios de confianza
- [ ] Apuestas en vivo integradas al stream
- [ ] Sistema de liquidacion automatica
- [ ] Comisiones de apuestas para empresarios
- [ ] Monitoreo de fraude/abuso

### FASE 5: 2027+
**Objetivo:** Escala nacional

- [ ] Apuestas abiertas a todos los empresarios con permiso
- [ ] App de viewer dedicada (solo ver streams y apostar)
- [ ] Patrocinios y publicidad en streams
- [ ] Expansion a otros paises (Centroamerica, Colombia, Peru)

---

## 7. OPINIONES Y SUGERENCIAS FINALES

### A) Sobre las apuestas — SER CAUTELOSO
La oportunidad es enorme pero el riesgo legal tambien. Mi sugerencia fuerte:
**No implementes apuestas sin consulta legal primero.** El costo de un abogado es $10,000-20,000 MXN. El costo de una clausura/multa puede ser millones.

El modelo mas seguro es que GenesisPro sea PROVEEDOR DE SOFTWARE, no operador de apuestas. El empresario con su permiso de SEGOB es el responsable legal. Nosotros solo cobramos por el uso de la herramienta.

### B) Sobre el streaming gratuito — ES CORRECTO
El costo de CDN es tu inversion en crecimiento. $2,000-5,000 MXN/mes de CDN es mas barato que cualquier campana de marketing. Y cada viewer que atrae un empresario es un cliente potencial.

### C) Sobre los planes empresario — SIMPLIFICAR
Tienes 3 planes de usuario + 3 planes empresario + modulos adicionales + comisiones. Es mucho. Para el lanzamiento, sugiero:

- **2 planes empresario** (no 3): Basico y Premium
- **Modulos adicionales** los dejas para despues, cuando tengas demanda real
- **Comisiones** las activas para TODOS los planes (con diferentes tasas)

### D) Sobre la competencia — TU VENTAJA
Las plataformas que transmiten gratis peleas de gallos no tienen:
- Sistema de cotejo digital
- Derby con puntos automaticos
- Finanzas por evento
- Dashboard de administracion
- Push notifications
- Genealogia y gestion de aves
- App movil nativa

GenesisPro es la UNICA plataforma que integra GESTION + STREAMING + COTEJO. Esa es tu ventaja y es incopiable a corto plazo.

### E) Prioridad inmediata
1. Terminar lo que ya estamos construyendo (streaming por evento, suscripcion diferenciada)
2. Implementar tracking de referidos (es rapido y genera datos valiosos)
3. Preparar infraestructura para mayo 2026 (CDN, rendimiento)
4. Consulta legal para apuestas
5. Todo lo demas viene despues

---

## 8. NUMEROS CLAVE

| Metrica | Valor |
|---|---|
| Costo CDN por stream 720p (200 viewers, 3hrs) | ~$6.75 USD |
| Comision Stripe Mexico | 3.6% + $3 MXN |
| IVA Mexico | 16% |
| ISR retencion plataformas 2026 | 2.5% |
| Licencia SEGOB apuestas (tarifa anual) | 1% del volumen de ventas |
| Impuesto a ganancias de apuestas | 21% |
| Permiso peleas de gallos con apuestas | Max 28 dias por permiso |
| Margen neto por suscripcion Pro ($599) | ~$390 MXN (65%) |
| Comision empresario mes 1 (20% del neto) | ~$78 MXN por suscriptor |

---

---

## 9. EL SESGO LEGAL: PELEAS DE GALLOS COMO DEPORTE DE COMPETENCIA

### El hallazgo clave

En Mexico, las peleas de gallos son una INDUSTRIA de mas de $7,000 millones de pesos anuales.
Solo en Puebla generan 250,000 empleos directos e indirectos. Y en febrero 2026, la SCJN
levanto la prohibicion en Tepic (Nayarit), reafirmando su legalidad como actividad cultural.

Pero aqui viene lo importante: HAY DOS MUNDOS SEPARADOS LEGALMENTE:

1. **Peleas de gallos CON APUESTAS** → Requiere permiso SEGOB, regulacion estricta, es "juego con apuesta"
2. **Peleas de gallos como COMPETENCIA/DEPORTE** → Derby, puntos, ranking, campeonatos → NO es apuesta

### La distincion que cambia todo

Un DERBY es una competencia deportiva:
- Partidos compiten por PUNTOS (3 por victoria, 1 por tabla, 0 por derrota)
- Hay RANKINGS y CLASIFICACIONES
- Hay CAMPEON al final del torneo
- Es como una liga de futbol: hay competencia, hay ganador, hay puntos

Esto es EXACTAMENTE lo que GenesisPro ya hace hoy. Tu sistema de derby con puntos,
partidos, cotejo automatico — eso es gestion DEPORTIVA, no apuestas.

### Los 3 niveles de monetizacion (de menor a mayor riesgo legal)

**NIVEL 1 — SIN RIESGO LEGAL (hoy)**
GenesisPro como plataforma de gestion deportiva:
- Cotejo de peleas
- Derby con puntos y ranking
- Streaming de competencias
- Estadisticas de rendimiento de aves
- Genealogia y crianza
→ Esto es SOFTWARE, como Tuums o PalenqueSoft. No hay apuesta, no hay riesgo.

**NIVEL 2 — RIESGO BAJO (fantasy/prediccion)**
Sistema de predicciones tipo "Fantasy Sports":
- El usuario predice resultados de peleas (no apuesta dinero, acumula puntos)
- Rankings de mejores predictores
- Premios por temporada (merch, suscripciones gratis, reconocimiento)
- O version con entry fee: paga $50 MXN por participar en pool de predicciones
→ Fantasy sports NO esta regulado en Mexico. Hay vacio legal pero NO es apuesta
   porque se considera "juego de habilidad" (analizar estadisticas, conocer aves).

**NIVEL 3 — REQUIERE LICENCIA (apuestas reales)**
Apuestas con dinero real en peleas en vivo:
- Requiere permiso SEGOB
- Requiere procesador de pagos especial
- Requiere KYC y antilavado
→ ALTO riesgo, ALTA recompensa. Solo con abogado y licencia.

### Mi sugerencia: LA ESCALERA

No saltes al Nivel 3. Sube escalon por escalon:

**Paso 1 (ahora):** Domina el Nivel 1. Sé LA plataforma de gestion de derbies en Mexico.
Ya tienes ventaja: cotejo, puntos, streaming, dashboard. Nadie mas tiene todo junto.

**Paso 2 (6 meses):** Lanza Nivel 2 con "Fantasy Gallistico":
- Los usuarios predicen resultados de peleas en eventos con streaming
- Pagan entry fee de $50-100 MXN por torneo de predicciones
- El 80% va al pool de premios, 20% para GenesisPro
- NO es apuesta (es juego de habilidad, como Fantasy Football)
- Genera engagement masivo con el streaming (la gente ve porque tiene "skin in the game")
- Genera datos de que tan grande es la demanda de apuestas reales

**Paso 3 (12+ meses):** Con datos del Nivel 2, decides si vale la pena el Nivel 3.
Si el Nivel 2 genera $500K MXN/mes, imagina el Nivel 3.
Entonces SI inviertes en abogado, licencia SEGOB, procesador de pagos.

### ¿Por que Fantasy Gallistico es genio?

1. **No necesitas licencia de apuestas** — Es juego de habilidad
2. **Genera engagement** — La gente ve el stream porque tiene predicciones activas
3. **Genera datos** — Sabes cuantos usuarios pagarian por apostar de verdad
4. **Genera ingresos** — 20% de cada pool de predicciones
5. **Es escalable** — Cada evento con streaming puede tener su torneo de predicciones
6. **Prueba el mercado** — Si nadie paga $50 por predecir, tampoco pagarian por apostar

### Ejemplo de Fantasy Gallistico:

```
TORNEO DE PREDICCIONES — Copa Jalisco 2026
Entry fee: $100 MXN
Participantes: 200
Pool total: $20,000 MXN
  → GenesisPro (20%): $4,000
  → 1er lugar (40%): $8,000
  → 2do lugar (20%): $4,000
  → 3er lugar (10%): $2,000
  → 4to-10mo (10%): $286 c/u

Mecanica:
- Antes de cada pelea, predices: ROJO, VERDE o TABLAS
- Acierto = 3 puntos, Tablas correcto = 5 puntos
- Bonus: predecir ronda exacta = +2 puntos
- Al final del evento, ranking por puntos = premios
```

El viewer esta pegado al stream porque cada pelea le suma o resta puntos.
El empresario esta feliz porque tiene 200 personas viendo su evento.
Tu estas feliz porque ganaste $4,000 sin necesitar licencia de apuestas.

---

## 10. MODELO LEGAL: GenesisPro COMO PROVEEDOR B2B

### La distincion internacional clave

En la industria del gambling hay dos tipos de licencia:
- **B2C (Business to Consumer):** El operador que tiene contacto directo con el apostador
- **B2B (Business to Business):** El proveedor de software que le vende herramientas al operador

GenesisPro deberia ser SIEMPRE B2B:
- Tu NO operas apuestas
- Tu VENDES el software al empresario que tiene su permiso SEGOB
- El empresario es el responsable legal ante SEGOB
- Tu cobras licencia de software + comision por transaccion procesada
- Tu NO tienes relacion contractual con el apostador final

### ¿Por que B2B es mas seguro?

| B2C (operador) | B2B (proveedor software) |
|---|---|
| Necesita licencia SEGOB | Necesita acuerdo comercial con operador licenciado |
| Responsable de antilavado | El operador hace antilavado |
| Responsable de menores de edad | El operador verifica edad |
| Multas directas si hay fallo | Responsabilidad limitada al software |
| Riesgo penal | Riesgo civil (mucho menor) |

### Modelo de ingresos B2B para apuestas (futuro):

| Concepto | Ingreso GenesisPro |
|---|---|
| Licencia mensual de software | $2,999-9,999 MXN/mes |
| Comision por transaccion procesada | 1-3% del volumen |
| Setup fee (integracion) | $15,000-30,000 MXN unica vez |

El empresario con su permiso SEGOB usa GenesisPro como herramienta.
El gana de las apuestas, tu ganas del software. Nadie va preso.

---

## 11. RESUMEN FINAL — QUE HACER Y EN QUE ORDEN

| Prioridad | Que | Riesgo | Ingreso potencial |
|---|---|---|---|
| 1 (ahora) | Plataforma de gestion + streaming | CERO | Suscripciones: $50-200K/mes |
| 2 (3-6 meses) | Tracking referidos + comisiones empresario | CERO | Crece base 3-5x |
| 3 (6-9 meses) | Fantasy Gallistico (predicciones) | BAJO | $50-150K/mes |
| 4 (12+ meses) | Apuestas reales (B2B) | MEDIO | $500K-2M/mes |
| 5 (18+ meses) | Expansion internacional | BAJO | Multiplica todo |

El camino seguro es: 1 → 2 → 3 → evaluar → 4 si los numeros lo justifican.

Nunca necesitas saltar al 4 si el 3 ya genera suficiente.
Y si llegas al 4, llegas con base de usuarios, datos, y capital para hacerlo bien.

---

---

## 12. MODELO FINAL: FANTASY GALLISTICO (Predicciones por Ronda)

### Modelo acordado con Eduardo (11 Marzo 2026)

**Concepto:** Torneos de prediccion por RONDA, no por evento completo.
Cada ronda es independiente. El usuario paga entry por ronda y no esta obligado a jugar todas.

### Mecanica de juego

```
EVENTO: Derby de 500 mil — 80 partidos, 40 peleas, 4 rondas

RONDA 1 (10 peleas):
  → Entry: $1,000 MXN (establecido por empresario segun nivel del evento)
  → Usuario selecciona 4-5 peleas para predecir
  → Solo 2 opciones: ROJO o VERDE
  → Si resulta TABLAS: todos los que predijeron esa pelea reciben +0.5 puntos
  → Prediccion correcta: +3 puntos
  → Prediccion incorrecta: 0 puntos
  → Se corren las peleas, se calculan puntos, se distribuyen ganancias

RONDA 2 (10 peleas):
  → Nuevo entry de $1,000 (opcional)
  → Los ganadores de ronda 1 pueden usar su premio como entry
  → Se repite el ciclo

... asi hasta ronda 4 (o 5 opcional)
```

### Tiers de entrada por ronda (mismo evento)

| Tier | Entry | Ejemplo pool (200 participantes) |
|---|---|---|
| Bronce | $100 MXN | $20,000 |
| Plata | $500 MXN | $100,000 |
| Oro | $1,000 MXN | $200,000 |
| Diamante | $5,000 MXN | $1,000,000 |

**Regla:** UN entry por tier por persona. Mismas predicciones aplican a todos los tiers donde participe.
El empresario define que tiers se activan segun el nivel del evento.

### Distribucion del pool (por ronda)

```
Pool total por ronda:
  → 75% — Premios a ganadores (por ranking de puntos)
  → 15% — GenesisPro (operacion, infraestructura)
  → 10% — Empresario (comision por generar audiencia)
```

### Premios por ranking (del 75%):

| Posicion | % del pool de premios |
|---|---|
| 1er lugar | 35% |
| 2do lugar | 20% |
| 3er lugar | 12% |
| 4to-5to | 8% c/u |
| 6to-10mo | 3.4% c/u |

### ¿Por que 2 opciones y no 3?

Eduardo decidio que TABLAS no sea opcion de prediccion:
- Simplifica la mecanica (ROJO o VERDE, punto)
- TABLAS es resultado raro (~5-10% de peleas)
- Si resulta TABLAS: +0.5 para TODOS los que predijeron esa pelea (nadie pierde por algo impredecible)
- Reduce de 3 opciones a 2, mas facil para el usuario

### Schema de base de datos (propuesto, NO implementar aun)

```sql
CREATE TABLE torneos_prediccion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID REFERENCES eventos_palenque(id),
    ronda INTEGER NOT NULL,
    tier VARCHAR(20) NOT NULL,        -- bronce, plata, oro, diamante
    entry_fee DECIMAL(10,2) NOT NULL,
    pool_total DECIMAL(12,2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'abierto', -- abierto, en_curso, cerrado, liquidado
    num_participantes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cerrado_at TIMESTAMPTZ,
    liquidado_at TIMESTAMPTZ
);

CREATE TABLE participantes_torneo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id UUID REFERENCES torneos_prediccion(id),
    usuario_id UUID REFERENCES usuarios(id),
    puntos DECIMAL(5,1) DEFAULT 0,
    posicion_final INTEGER,
    premio DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(torneo_id, usuario_id)
);

CREATE TABLE predicciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participante_id UUID REFERENCES participantes_torneo(id),
    pelea_id UUID REFERENCES peleas(id),
    seleccion VARCHAR(10) NOT NULL,   -- 'rojo' o 'verde' (NUNCA 'tablas')
    puntos_obtenidos DECIMAL(3,1) DEFAULT 0,
    resultado_pelea VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 13. SISTEMA DE WALLET INTERNO

### Flujo de dinero

```
DEPOSITO:
  Usuario → Conekta (OXXO/SPEI/tarjeta) → Confirmacion → Saldo interno GenesisPro

USO:
  Saldo interno → Entry a ronda de prediccion → Pool del torneo

GANANCIA:
  Pool → Calculo ranking → Premio acreditado a saldo interno

RETIRO:
  Usuario solicita retiro → GenesisPro calcula comisiones/impuestos
  → Instruye a Conekta dispersar via SPEI → Usuario recibe en su banco
```

### ¿Por que Conekta y no Stripe?

| | Stripe | Conekta |
|---|---|---|
| Soporte gambling/gaming | NO (prohibido) | SI (con licencia) |
| OXXO en tiempo real | No nativo | Si, nativo |
| SPEI nativo | No | Si |
| Dispersiones (payouts) | Solo a cuentas Stripe | SPEI a cualquier banco |
| Comision | 3.6% + $3 MXN | 2.9% + $2.50 MXN |
| Regulado en Mexico | Si | Si (Fintech) |

### Separacion de procesadores

- **Stripe** → Solo suscripciones (usuario + empresario). Ya funciona, no tocar.
- **Conekta** → Todo lo relacionado a wallet: depositos, entries, premios, retiros.

Nunca mezclar flujos. Dos procesadores, dos propositos, dos contabilidades.

### Costos de Conekta para el wallet:

| Operacion | Costo |
|---|---|
| Deposito tarjeta | 2.9% + $2.50 MXN |
| Deposito OXXO | $10 MXN fijo |
| Deposito SPEI | $3-7 MXN fijo |
| Retiro SPEI (dispersion) | ~$3-8 MXN fijo |
| Contracargo tarjeta | $350 MXN + monto |

---

## 14. PROTECCION CONTRA LAVADO DE DINERO (PLD/FT)

### LFPIORPI — Ley Federal que aplica

La LFPIORPI (Ley Federal para la Prevencion e Identificacion de Operaciones con Recursos
de Procedencia Ilicita) es la ley antilavado de Mexico. Reforma 2026 endurece obligaciones.

### Obligaciones si manejamos wallet con fondos reales:

| Obligacion | Que implica |
|---|---|
| Sistemas automatizados de cumplimiento | Software que detecte patrones sospechosos automaticamente |
| Evaluacion anual de riesgos | Documento formal evaluando riesgos PLD de cada cliente y del negocio |
| Programa de capacitacion | Personal entrenado en PLD/FT |
| Oficial de cumplimiento | Persona designada responsable ante la UIF |
| Reportes a UIF | Operaciones relevantes (≥$64,920 MXN efectivo), inusuales, preocupantes |
| Conservar expedientes | 10 años minimo de registros de transacciones |

### ¿Necesitamos licencia CNBV?

**SI, si GenesisPro custodia fondos directamente** (IFPE — Institucion de Fondos de Pago Electronico).
Actualmente hay ~49 IFPE licenciadas en Mexico. Obtener licencia toma 6-12 meses y es costoso.

**NO, si Conekta custodia los fondos:**
- GenesisPro lleva el registro interno (ledger/saldo)
- Conekta custodia el dinero real
- Conekta ya esta regulada y cumple PLD ante CNBV
- Nosotros somos intermediarios tecnologicos, no institucion financiera
- **ESTA ES LA VIA RECOMENDADA**

### KYC (Conoce a Tu Cliente) — Niveles propuestos

| Nivel | Limite mensual | Requisitos |
|---|---|---|
| Basico | Depositos ≤ $3,000 MXN | Email, telefono, nombre completo |
| Verificado | Depositos ≤ $15,000 MXN | + INE (ambos lados), CURP, fecha nacimiento |
| Completo | Depositos ≤ $50,000 MXN | + RFC, selfie con INE, comprobante domicilio |
| Premium | Sin limite | + Verificacion manual, declaracion origen de fondos |

### Deteccion automatica de patrones sospechosos

```
PATRON 1: Structuring (fraccionamiento)
  → Multiples depositos pequeños en corto tiempo para evitar umbrales
  → Ej: 10 depositos de $2,900 en lugar de 1 de $29,000
  → ACCION: Bloquear cuenta, solicitar KYC nivel Completo

PATRON 2: Pass-through (lavado)
  → Deposito → retiro inmediato sin participar en predicciones
  → Ej: Deposita $50,000 el lunes, retira $49,000 el martes, 0 entries
  → ACCION: Bloquear retiro, investigar manualmente

PATRON 3: Multi-account (identidad)
  → Misma IP/dispositivo con multiples cuentas
  → Ej: 5 cuentas desde el mismo telefono depositan y retiran
  → ACCION: Suspender todas las cuentas vinculadas

PATRON 4: Velocity (velocidad)
  → Frecuencia anormal de transacciones
  → Ej: 50 transacciones en 1 hora desde una sola cuenta
  → ACCION: Rate limit + revision manual

PATRON 5: Colusion
  → Dos o mas cuentas que siempre predicen opuesto (aseguran que una gane)
  → Ej: Cuenta A siempre ROJO, Cuenta B siempre VERDE en mismas peleas
  → ACCION: Suspender ambas, investigar
```

### Reportes obligatorios a la UIF (Unidad de Inteligencia Financiera)

| Tipo de reporte | Cuando | Plazo |
|---|---|---|
| Operaciones relevantes | Transacciones ≥ $64,920 MXN en efectivo | Mensual (dia 17) |
| Operaciones inusuales | Cualquier patron sospechoso, sin importar monto | 24 horas |
| Operaciones internas preocupantes | Detectadas por nuestro propio sistema de monitoreo | 24 horas |

### Tablas de base de datos PLD (propuestas, NO implementar aun)

```sql
CREATE TABLE pld_alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    tipo VARCHAR(50),           -- structuring, pass_through, multi_account, velocity, colusion
    severidad VARCHAR(20),      -- baja, media, alta, critica
    descripcion TEXT,
    monto_involucrado DECIMAL(12,2),
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, revisado, reportado, descartado
    revisado_por UUID REFERENCES usuarios(id),
    reportado_uif BOOLEAN DEFAULT FALSE,
    reportado_uif_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kyc_verificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID UNIQUE REFERENCES usuarios(id),
    nivel VARCHAR(20) DEFAULT 'basico',
    ine_frontal_url TEXT,
    ine_reverso_url TEXT,
    selfie_url TEXT,
    curp VARCHAR(18),
    rfc VARCHAR(13),
    comprobante_domicilio_url TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, aprobado, rechazado
    verificado_por UUID,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

CREATE TABLE pld_limites_usuario (
    usuario_id UUID PRIMARY KEY REFERENCES usuarios(id),
    nivel_kyc VARCHAR(20) DEFAULT 'basico',
    deposito_mensual_max DECIMAL(12,2) DEFAULT 3000,
    retiro_mensual_max DECIMAL(12,2) DEFAULT 3000,
    saldo_max DECIMAL(12,2) DEFAULT 5000,
    entry_max DECIMAL(12,2) DEFAULT 1000,
    deposito_acumulado_mes DECIMAL(12,2) DEFAULT 0,
    retiro_acumulado_mes DECIMAL(12,2) DEFAULT 0,
    mes_actual VARCHAR(7),          -- '2026-03' para resetear acumulados mensualmente
    bloqueado BOOLEAN DEFAULT FALSE,
    motivo_bloqueo TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 15. QUE FALTA POR ANALIZAR — LISTA COMPLETA

### A) LEGAL (requiere abogado fintech/gaming)

| # | Tema | Por que importa | Estado |
|---|---|---|---|
| 1 | **Clasificacion legal de "Fantasy Gallistico"** | ¿Es juego de azar o de habilidad? Determina si necesitas licencia SEGOB o no. En otros paises los fantasy sports se consideran habilidad, pero Mexico NO tiene precedente claro para peleas de gallos. | PENDIENTE — consulta legal |
| 2 | **Opinion legal formal de abogado fintech** | Documento que te protege demostrando buena fe. Si hay problema regulatorio, puedes demostrar que actuaste con asesoria. Costo: $15,000-25,000 MXN. | PENDIENTE |
| 3 | **Estructura societaria correcta** | ¿SA de CV? ¿SAPI? ¿Necesitas dos entidades (una para suscripciones, otra para predicciones)? El abogado te dira. | PENDIENTE |
| 4 | **Obligaciones fiscales de premios** | Cuando un usuario gana $8,000 en predicciones, ¿GenesisPro retiene ISR? En apuestas formales se retiene 21% al ganador. En fantasy sports, ¿aplica lo mismo? | PENDIENTE — consulta fiscal |
| 5 | **Terminos y condiciones del wallet** | Documento legal que define: limites, comisiones, responsabilidades, clausulas de PLD, derecho a bloquear cuentas, resolucion de disputas. | PENDIENTE — abogado redacta |
| 6 | **Proteccion de datos (LFPDPPP)** | Si hacemos KYC con INE y selfie, somos responsables de datos personales sensibles. Necesitamos aviso de privacidad actualizado y medidas de seguridad. | PENDIENTE |
| 7 | **Responsabilidad por menores de edad** | ¿Como verificamos edad? La INE dice fecha de nacimiento, pero ¿es suficiente sin verificacion biometrica? | PENDIENTE |
| 8 | **Permisos SEGOB para el empresario** | Si el empresario organiza predicciones en su evento, ¿el necesita permiso adicional? ¿O el permiso de palenque cubre? | PENDIENTE — consulta legal |

### B) FINANCIERO Y FISCAL

| # | Tema | Por que importa | Estado |
|---|---|---|---|
| 9 | **Retencion ISR a ganadores** | ¿Cuanto retener? ¿Aplica el 21% de apuestas o es ingreso general (tabla ISR)? | PENDIENTE — consulta fiscal |
| 10 | **IVA en comisiones de prediccion** | ¿El 15% que cobra GenesisPro del pool causa IVA? ¿Y el 10% del empresario? | PENDIENTE |
| 11 | **Facturacion a usuarios** | ¿Se emite factura por cada entry? ¿Por cada premio? ¿O solo por depositos? | PENDIENTE |
| 12 | **Contabilidad de pools** | El dinero del pool NO es ingreso de GenesisPro hasta que se toma la comision. ¿Como se contabiliza el pool en transito? Cuenta de orden? Fideicomiso? | PENDIENTE — contador |
| 13 | **Comisiones al empresario: ¿factura?** | El empresario recibe 10% del pool. ¿Necesita facturar a GenesisPro? ¿O es retencion directa? | PENDIENTE |
| 14 | **Chargebacks/contracargos** | Si un usuario deposita con tarjeta, participa, pierde, y hace chargeback... ¿el pool ya se repartio? ¿Quien absorbe la perdida? Politica: solo permitir depositos SPEI/OXXO (sin chargeback) para entries grandes. | POR DEFINIR |
| 15 | **Limites de retiro y tiempos** | ¿Retiro inmediato o con delay de 24-72hrs? El delay permite detectar fraude antes de dispersar. | POR DEFINIR |

### C) TECNICO

| # | Tema | Por que importa | Estado |
|---|---|---|---|
| 16 | **Integracion Conekta** | API de Conekta: tokenizacion, webhooks, dispersiones, manejo de errores. Necesita sandbox primero. | NO INICIADO |
| 17 | **Verificacion KYC: proveedor** | Mati (Metamap), Truora, o Veriff. Costo $5-15 MXN por verificacion. ¿Cual soporta INE mexicana mejor? | INVESTIGAR |
| 18 | **Seguridad del wallet** | Encriptacion de saldos, auditing de transacciones, reconciliacion diaria con Conekta, pruebas de penetracion. | NO INICIADO |
| 19 | **Concurrencia en predicciones** | Si 500 usuarios predicen al mismo tiempo en la misma pelea, ¿el sistema aguanta? Locks de base de datos, colas, race conditions. | DISEÑAR |
| 20 | **Liquidacion automatica** | Cuando termina una pelea: calcular puntos de TODOS los participantes, actualizar ranking, calcular premios, mover dinero. Todo atomico (si falla uno, falla todo). | DISEÑAR |
| 21 | **Tiempo limite de prediccion** | ¿Hasta cuando se puede predecir? ¿Hasta que empieza la pelea? ¿2 minutos antes? Necesita sincronizacion con el broadcast. | POR DEFINIR |
| 22 | **Reconciliacion de saldos** | Diaria: sumar TODOS los saldos internos y comparar con lo que Conekta reporta. Si no cuadra, alerta critica. | DISEÑAR |
| 23 | **Infraestructura para escala** | Si hay 2,000 usuarios en un evento con 4 tiers y 4 rondas, son potencialmente 32,000 entries + predicciones. ¿PostgreSQL aguanta o necesitamos Redis/cache? | EVALUAR |

### D) PRODUCTO Y EXPERIENCIA

| # | Tema | Por que importa | Estado |
|---|---|---|---|
| 24 | **UX del flujo de prediccion** | ¿Como se ve en pantalla? ¿Overlay sobre el stream? ¿Pantalla separada? ¿Push notification antes de cada ronda? | DISEÑAR |
| 25 | **Onboarding del wallet** | Primera vez que el usuario deposita: ¿tarjeta guardada? ¿OXXO con referencia? ¿SPEI con CLABE virtual? Cada uno tiene UX diferente. | DISEÑAR |
| 26 | **Historial de predicciones** | El usuario quiere ver: cuanto deposite, cuantas rondas jugue, cuanto gane/perdi, mi ranking historico. Dashboard personal. | DISEÑAR |
| 27 | **Notificaciones** | "La ronda 2 empieza en 5 minutos, ¿quieres entrar?" "Ganaste $3,500 en la Copa Jalisco". Push + in-app. | DISEÑAR |
| 28 | **Disputas y reclamos** | ¿Que pasa si el usuario dice "la pelea fue injusta"? ¿Hay mecanismo de reclamo? ¿Quien decide? El empresario? GenesisPro? | POR DEFINIR |
| 29 | **Testing en entorno real** | Necesitas probar con dinero real en eventos reales antes de lanzar publicamente. Beta cerrada con 2-3 empresarios de confianza. | FASE 2-3 |

### E) RIESGOS ESPECIFICOS DE PELEAS DE GALLOS

| # | Tema | Por que importa | Estado |
|---|---|---|---|
| 30 | **Percepcion publica** | Peleas de gallos + dinero + app = posible cobertura de medios negativa. ¿Plan de comunicacion? | CONSIDERAR |
| 31 | **App Store policies** | Apple y Google prohiben apps de apuestas sin licencia. ¿Fantasy Gallistico califica como "apuesta" para ellos? Si si, rechazan la app. Opcion: wallet y predicciones via WebView/PWA, no nativo. | CRITICO — INVESTIGAR |
| 32 | **Bloqueo de procesador** | Si Conekta decide que predicciones en peleas de gallos no le conviene, ¿tenemos plan B? Kushki? SPEI directo? | TENER PLAN B |
| 33 | **Bienestar animal** | Tendencia global anti peleas de gallos. ¿Riesgo de que se prohiban en Mexico en 5-10 años? ¿GenesisPro puede pivotar a otros deportes? | LARGO PLAZO |
| 34 | **Competencia** | Si GenesisPro prueba que el modelo funciona, ¿que tan facil es que alguien lo copie? Barrera: base de usuarios + relaciones con empresarios + datos historicos. | ESTRATEGIA |

---

## 16. RESUMEN EJECUTIVO — ESTADO ACTUAL

```
IMPLEMENTADO Y FUNCIONANDO:
✅ App movil (gestion de aves, combates, salud, alimentacion, derby)
✅ Streaming en vivo (WebRTC + LLHLS)
✅ Sistema de eventos/palenque con cotejo
✅ Suscripciones via Stripe (usuario + empresario)
✅ Dashboard web PWA
✅ Push notifications
✅ Admin panel

DISEÑADO PERO NO IMPLEMENTADO:
📋 Fantasy Gallistico (predicciones por ronda) — Seccion 12
📋 Wallet interno con Conekta — Seccion 13
📋 Sistema PLD/KYC — Seccion 14
📋 Comisiones empresario por referidos
📋 Tracking de suscripciones por codigo de evento

REQUIERE ACCION EXTERNA (no es codigo):
⚠️  Consulta legal con abogado fintech/gaming — $15-25K MXN
⚠️  Consulta fiscal para retencion ISR en premios
⚠️  Contactar Conekta para cuenta sandbox + revisar politicas gambling
⚠️  Investigar politicas App Store/Play Store para predicciones en peleas de gallos
⚠️  Evaluar proveedor KYC (Mati/Truora)

DECISION FIRME DE EDUARDO:
🔒 NO implementar predicciones/wallet hasta tener bases juridicas correctas
🔒 Primero analizar, protegerse, y luego construir
🔒 La infraestructura tecnologica ya existe — solo falta la parte legal/fiscal
```

---

**Este documento esta en:** `C:\genesispro\ANALISIS_NEGOCIO_GENESISPRO.md`

Se actualiza conforme avanzamos en el analisis. Ultima actualizacion: 11 Marzo 2026.

— Claude (equipo GenesisPro, 2026-03-11)
