const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');
const logger = require('../config/logger');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GENESIS_MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `Eres Genesis, el asistente inteligente de GenesisPro para eventos de palenque (peleas de gallos en México).

Tu rol:
- Responder EXCLUSIVAMENTE sobre el evento de palenque actual y su información
- Analizar patrones: tiempos de peleas, rachas de partidos, balances financieros
- Hablar en español mexicano, directo y profesional
- Usar terminología correcta: partido (dueño de gallos), cotejo (enfrentamiento), rojo/verde (esquinas), tablas (empate), pelea (combate individual)

Reglas ESTRICTAS:
- Sé conciso (2-3 oraciones máximo por respuesta, a menos que pidan detalle)
- NUNCA respondas preguntas fuera del contexto del evento (clima, noticias, chistes, etc.)
- Si preguntan algo fuera de tema, responde: "Solo puedo ayudarte con información del evento actual."
- Nunca inventes datos — usa solo lo que tienes en el contexto
- Formato: texto plano, sin markdown elaborado`;

// ============================================================
// UTILITY: Normalize text for accent-insensitive matching
// ============================================================
function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matches(text, patterns) {
  const norm = normalize(text);
  return patterns.some(p => norm.includes(normalize(p)));
}

function matchesAny(text, patternGroups) {
  return patternGroups.some(group => matches(text, group));
}

// ============================================================
// EVENT CONTEXT BUILDER
// ============================================================
async function getEventContext(eventoId) {
  const ctx = {};

  const { rows: [evento] } = await db.query(
    `SELECT id, nombre, fecha, estado, pelea_actual, total_peleas, modo,
            costo_inscripcion, costo_por_pelea, premio_campeon, lugar
     FROM eventos_palenque WHERE id = $1`, [eventoId]
  );
  if (!evento) return null;
  ctx.evento = evento;

  const { rows: peleas } = await db.query(
    `SELECT numero_pelea, estado, resultado, anillo_rojo, anillo_verde,
            peso_rojo, peso_verde, placa_rojo, placa_verde,
            partido_rojo_id, partido_verde_id,
            partido_derby_rojo_id, partido_derby_verde_id,
            duracion_minutos, hora_inicio, hora_fin, tipo_victoria
     FROM peleas WHERE evento_id = $1 ORDER BY numero_pelea`, [eventoId]
  );
  ctx.peleas = peleas;

  const { rows: partidos } = await db.query(
    `SELECT pd.id, pd.nombre, pd.codigo_acceso, pd.puntos, pd.numero_partido,
            COUNT(ad.id) as total_aves,
            COUNT(ad.id) FILTER (WHERE ad.estado = 'disponible') as aves_disponibles
     FROM partidos_derby pd
     LEFT JOIN aves_derby ad ON pd.id = ad.partido_id
     WHERE pd.evento_id = $1
     GROUP BY pd.id, pd.nombre, pd.codigo_acceso, pd.puntos, pd.numero_partido
     ORDER BY pd.puntos DESC, pd.numero_partido`, [eventoId]
  );
  ctx.partidos = partidos;

  const { rows: finanzas } = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
       COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) as total_egresos,
       COUNT(*) as total_movimientos
     FROM pagos_evento WHERE evento_id = $1 AND estado != 'cancelado'`, [eventoId]
  );
  ctx.finanzas = finanzas[0];

  // Per-partido win/loss record
  const partidoStats = {};
  for (const p of partidos) {
    partidoStats[p.id] = { nombre: p.nombre, ganadas: 0, perdidas: 0, tablas: 0 };
  }
  for (const pelea of peleas) {
    if (pelea.estado !== 'finalizada') continue;
    const rojoId = pelea.partido_derby_rojo_id;
    const verdeId = pelea.partido_derby_verde_id;
    if (pelea.resultado === 'rojo') {
      if (rojoId && partidoStats[rojoId]) partidoStats[rojoId].ganadas++;
      if (verdeId && partidoStats[verdeId]) partidoStats[verdeId].perdidas++;
    } else if (pelea.resultado === 'verde') {
      if (verdeId && partidoStats[verdeId]) partidoStats[verdeId].ganadas++;
      if (rojoId && partidoStats[rojoId]) partidoStats[rojoId].perdidas++;
    } else if (pelea.resultado === 'tabla') {
      if (rojoId && partidoStats[rojoId]) partidoStats[rojoId].tablas++;
      if (verdeId && partidoStats[verdeId]) partidoStats[verdeId].tablas++;
    }
  }
  ctx.partidoStats = partidoStats;

  // Computed stats
  const finalizadas = peleas.filter(p => p.estado === 'finalizada');
  const duraciones = finalizadas.filter(p => p.duracion_minutos).map(p => p.duracion_minutos);
  ctx.stats = {
    peleas_finalizadas: finalizadas.length,
    peleas_pendientes: peleas.filter(p => p.estado === 'programada').length,
    pelea_en_curso: peleas.find(p => p.estado === 'en_curso')?.numero_pelea || null,
    victorias_rojo: finalizadas.filter(p => p.resultado === 'rojo').length,
    victorias_verde: finalizadas.filter(p => p.resultado === 'verde').length,
    tablas: finalizadas.filter(p => p.resultado === 'tabla').length,
    duracion_promedio: duraciones.length > 0 ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length) : null,
  };

  return ctx;
}

// ============================================================
// LOCAL ENGINE: Pattern matchers
// ============================================================

// Extract a fight number from text like "pelea 3", "pelea #5", "la 7"
function extractFightNumber(text) {
  const norm = normalize(text);
  const m = norm.match(/(?:pelea|combate|cotejo)\s*#?\s*(\d+)/) ||
            norm.match(/(?:la|el)\s+#?\s*(\d+)/) ||
            norm.match(/numero\s*(\d+)/) ||
            norm.match(/resultado\s+(?:de\s+)?(?:la\s+)?#?\s*(\d+)/);
  return m ? parseInt(m[1]) : null;
}

// Find a partido by name in text
function findPartidoInText(text, partidos) {
  const norm = normalize(text);
  return partidos.find(p => norm.includes(normalize(p.nombre)));
}

// Format a fight for display
function formatPelea(p) {
  let line = `Pelea #${p.numero_pelea}: ${p.estado}`;
  if (p.resultado) {
    const resMap = { rojo: 'ROJO', verde: 'VERDE', tabla: 'TABLAS' };
    line += ` - Resultado: ${resMap[p.resultado] || p.resultado}`;
  }
  if (p.placa_rojo || p.placa_verde) line += ` | ${p.placa_rojo || '?'} vs ${p.placa_verde || '?'}`;
  if (p.anillo_rojo || p.anillo_verde) line += ` | Anillos: ${p.anillo_rojo || '?'} vs ${p.anillo_verde || '?'}`;
  if (p.peso_rojo || p.peso_verde) line += ` | Peso: ${p.peso_rojo || '?'}g vs ${p.peso_verde || '?'}g`;
  if (p.duracion_minutos) line += ` | ${p.duracion_minutos} min`;
  if (p.tipo_victoria) line += ` (${p.tipo_victoria})`;
  return line;
}

// ============================================================
// LOCAL ENGINE: Query handlers
// ============================================================

function handleStandings(text, ctx) {
  const partido = findPartidoInText(text, ctx.partidos);

  if (partido) {
    const stats = ctx.partidoStats[partido.id];
    const respuesta = `${partido.nombre}: ${partido.puntos || 0} puntos. Ganadas: ${stats.ganadas}, Perdidas: ${stats.perdidas}, Tablas: ${stats.tablas}. Aves disponibles: ${partido.aves_disponibles}/${partido.total_aves}.`;
    return {
      respuesta,
      tipo: 'local',
      datos: { partido: partido.nombre, puntos: partido.puntos, ...stats, aves_disponibles: parseInt(partido.aves_disponibles), total_aves: parseInt(partido.total_aves) },
    };
  }

  // Full standings table
  const tabla = ctx.partidos.map((p, i) => {
    const stats = ctx.partidoStats[p.id] || { ganadas: 0, perdidas: 0, tablas: 0 };
    return `${i + 1}. ${p.nombre} - ${p.puntos || 0} pts (G:${stats.ganadas} P:${stats.perdidas} T:${stats.tablas})`;
  });

  return {
    respuesta: `Tabla de posiciones:\n${tabla.join('\n')}`,
    tipo: 'local',
    datos: {
      tabla: ctx.partidos.map(p => {
        const s = ctx.partidoStats[p.id] || { ganadas: 0, perdidas: 0, tablas: 0 };
        return { nombre: p.nombre, puntos: p.puntos || 0, ...s };
      }),
    },
  };
}

function handleFightInfo(text, ctx) {
  const norm = normalize(text);
  const num = extractFightNumber(text);

  // Specific fight number
  if (num) {
    const pelea = ctx.peleas.find(p => p.numero_pelea === num);
    if (!pelea) return { respuesta: `No existe la pelea #${num}. El evento tiene ${ctx.peleas.length} peleas.`, tipo: 'local' };
    return { respuesta: formatPelea(pelea), tipo: 'local', datos: pelea };
  }

  // Current fight
  if (matches(text, ['pelea actual', 'pelea en curso', 'que pelea va', 'en que pelea', 'cual pelea'])) {
    const enCurso = ctx.peleas.find(p => p.estado === 'en_curso');
    if (!enCurso) return { respuesta: 'No hay pelea en curso en este momento.', tipo: 'local' };
    return { respuesta: formatPelea(enCurso), tipo: 'local', datos: enCurso };
  }

  // Next fight
  if (matches(text, ['siguiente pelea', 'proxima pelea', 'que sigue'])) {
    const siguiente = ctx.peleas.find(p => p.estado === 'programada');
    if (!siguiente) return { respuesta: 'No hay más peleas programadas.', tipo: 'local' };
    return { respuesta: `Siguiente: ${formatPelea(siguiente)}`, tipo: 'local', datos: siguiente };
  }

  // Last fight
  if (matches(text, ['ultima pelea', 'pelea pasada', 'pelea anterior'])) {
    const finalizadas = ctx.peleas.filter(p => p.estado === 'finalizada');
    if (finalizadas.length === 0) return { respuesta: 'Aún no se ha finalizado ninguna pelea.', tipo: 'local' };
    const ultima = finalizadas[finalizadas.length - 1];
    return { respuesta: `Última pelea finalizada: ${formatPelea(ultima)}`, tipo: 'local', datos: ultima };
  }

  // Result of last fight
  if (matches(text, ['resultado', 'quien gano', 'como quedo'])) {
    const finalizadas = ctx.peleas.filter(p => p.estado === 'finalizada');
    if (finalizadas.length === 0) return { respuesta: 'Aún no hay resultados.', tipo: 'local' };
    const ultima = finalizadas[finalizadas.length - 1];
    return { respuesta: formatPelea(ultima), tipo: 'local', datos: ultima };
  }

  return null;
}

function handleStats(text, ctx) {
  const norm = normalize(text);

  if (matches(text, ['promedio', 'duracion promedio', 'tiempo promedio'])) {
    const prom = ctx.stats.duracion_promedio;
    return {
      respuesta: prom ? `Duración promedio de peleas: ${prom} minutos.` : 'Aún no hay datos suficientes para calcular promedio.',
      tipo: 'local',
      datos: { duracion_promedio: prom },
    };
  }

  if (matches(text, ['cuantas peleas', 'total peleas', 'numero de peleas'])) {
    return {
      respuesta: `Total: ${ctx.peleas.length} peleas. Finalizadas: ${ctx.stats.peleas_finalizadas}. Pendientes: ${ctx.stats.peleas_pendientes}. En curso: ${ctx.stats.pelea_en_curso || 'ninguna'}.`,
      tipo: 'local',
      datos: ctx.stats,
    };
  }

  if (matches(text, ['victorias rojo', 'cuantas rojo', 'gano rojo', 'rojas'])) {
    return { respuesta: `Victorias Rojo: ${ctx.stats.victorias_rojo} de ${ctx.stats.peleas_finalizadas} peleas finalizadas.`, tipo: 'local' };
  }

  if (matches(text, ['victorias verde', 'cuantas verde', 'gano verde', 'verdes'])) {
    return { respuesta: `Victorias Verde: ${ctx.stats.victorias_verde} de ${ctx.stats.peleas_finalizadas} peleas finalizadas.`, tipo: 'local' };
  }

  if (matches(text, ['racha', 'consecutiv'])) {
    const finalizadas = ctx.peleas.filter(p => p.estado === 'finalizada');
    if (finalizadas.length === 0) return { respuesta: 'No hay peleas finalizadas para analizar rachas.', tipo: 'local' };
    // Calculate current streak
    let streak = 1;
    let streakColor = finalizadas[finalizadas.length - 1]?.resultado;
    for (let i = finalizadas.length - 2; i >= 0; i--) {
      if (finalizadas[i].resultado === streakColor) streak++;
      else break;
    }
    const colorName = { rojo: 'Rojo', verde: 'Verde', tabla: 'Tablas' }[streakColor] || streakColor;
    return {
      respuesta: `Racha actual: ${streak} ${streak === 1 ? 'victoria' : 'victorias'} consecutivas de ${colorName}.`,
      tipo: 'local',
      datos: { racha: streak, color: streakColor },
    };
  }

  // General stats
  if (matches(text, ['estadistica', 'stats', 'resumen', 'como va el evento'])) {
    const s = ctx.stats;
    const e = ctx.evento;
    return {
      respuesta: `${e.nombre} (${e.estado}). Pelea ${e.pelea_actual || 0} de ${e.total_peleas}. Finalizadas: ${s.peleas_finalizadas}. Rojo: ${s.victorias_rojo}, Verde: ${s.victorias_verde}, Tablas: ${s.tablas}. Duración promedio: ${s.duracion_promedio ? s.duracion_promedio + ' min' : 'sin datos'}.`,
      tipo: 'local',
      datos: s,
    };
  }

  return null;
}

function handleFinancial(text, ctx) {
  const ingresos = parseFloat(ctx.finanzas.total_ingresos);
  const egresos = parseFloat(ctx.finanzas.total_egresos);
  const balance = ingresos - egresos;

  if (matches(text, ['balance', 'cuanto lleva', 'como va financ', 'dinero', 'ganancia'])) {
    return {
      respuesta: `Balance del evento: $${balance.toLocaleString()}. Ingresos: $${ingresos.toLocaleString()}, Egresos: $${egresos.toLocaleString()}. Movimientos: ${ctx.finanzas.total_movimientos}.`,
      tipo: 'local',
      datos: { ingresos, egresos, balance, movimientos: parseInt(ctx.finanzas.total_movimientos) },
    };
  }

  if (matches(text, ['ingreso'])) {
    return { respuesta: `Ingresos totales del evento: $${ingresos.toLocaleString()}.`, tipo: 'local', datos: { ingresos } };
  }

  if (matches(text, ['egreso', 'gasto'])) {
    return { respuesta: `Egresos totales del evento: $${egresos.toLocaleString()}.`, tipo: 'local', datos: { egresos } };
  }

  return null;
}

function handlePartidoInfo(text, ctx) {
  const partido = findPartidoInText(text, ctx.partidos);

  if (matches(text, ['cuantos partidos', 'total partidos', 'partidos hay', 'partidos registrados'])) {
    const nombres = ctx.partidos.map(p => p.nombre).join(', ');
    return {
      respuesta: `Hay ${ctx.partidos.length} partidos registrados: ${nombres}.`,
      tipo: 'local',
      datos: { total: ctx.partidos.length, partidos: ctx.partidos.map(p => p.nombre) },
    };
  }

  if (partido && matches(text, ['aves de', 'gallos de', 'cuantas aves'])) {
    return {
      respuesta: `${partido.nombre} tiene ${partido.aves_disponibles} aves disponibles de ${partido.total_aves} registradas.`,
      tipo: 'local',
      datos: { partido: partido.nombre, disponibles: parseInt(partido.aves_disponibles), total: parseInt(partido.total_aves) },
    };
  }

  return null;
}

function handleSchedule(text, ctx) {
  if (matches(text, ['cuantas faltan', 'peleas faltan', 'quedan', 'pendientes'])) {
    const pendientes = ctx.stats.peleas_pendientes;
    return {
      respuesta: `Faltan ${pendientes} peleas por realizarse de ${ctx.peleas.length} totales.`,
      tipo: 'local',
      datos: { pendientes, total: ctx.peleas.length },
    };
  }

  if (matches(text, ['a que hora empezo', 'hora de inicio', 'cuando empezo', 'inicio del evento'])) {
    const fecha = ctx.evento.fecha;
    const primera = ctx.peleas.find(p => p.hora_inicio);
    const inicio = primera ? new Date(primera.hora_inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : null;
    return {
      respuesta: inicio
        ? `La primera pelea inició a las ${inicio}.`
        : `El evento está programado para ${fecha ? new Date(fecha).toLocaleDateString('es-MX') : 'fecha no definida'}. Aún no hay registro de hora de inicio.`,
      tipo: 'local',
    };
  }

  return null;
}

function isOutOfScope(text) {
  return matches(text, [
    'clima', 'tiempo', 'lluvia', 'temperatura',
    'noticias', 'politica', 'futbol', 'soccer',
    'chiste', 'broma', 'cancion', 'musica',
    'receta', 'cocina', 'comida',
    'que eres', 'quien te creo', 'como te llamas',
    'hola', 'buenos dias', 'buenas noches', 'buenas tardes',
  ]);
}

// ============================================================
// LOCAL ENGINE: Main dispatcher
// ============================================================
function tryLocalEngine(text, ctx) {
  const norm = normalize(text);

  // Out of scope check (only if it doesn't also mention event terms)
  const eventTerms = ['pelea', 'partido', 'punto', 'evento', 'cotejo', 'rojo', 'verde', 'tabla', 'ave', 'gallo', 'balance', 'resultado'];
  const hasEventTerm = eventTerms.some(t => norm.includes(t));

  if (isOutOfScope(text) && !hasEventTerm) {
    return { respuesta: 'Solo puedo ayudarte con información del evento actual.', tipo: 'local' };
  }

  // Greetings with redirect
  if (matches(text, ['hola', 'buenos dias', 'buenas tardes', 'buenas noches']) && !hasEventTerm) {
    const s = ctx.stats;
    return {
      respuesta: `¡Hola! Soy Genesis. El evento "${ctx.evento.nombre}" va en la pelea ${ctx.evento.pelea_actual || 0} de ${ctx.evento.total_peleas}. ¿En qué te ayudo?`,
      tipo: 'local',
    };
  }

  // Standings / scores / who's winning
  if (matches(text, ['tabla', 'posicion', 'puntos', 'puntaje', 'quien va ganando', 'como va', 'score', 'marcador', 'clasificacion', 'ranking'])) {
    return handleStandings(text, ctx);
  }

  // Fight info
  if (matches(text, ['pelea', 'combate', 'cotejo', 'resultado', 'quien gano', 'como quedo', 'que sigue', 'siguiente'])) {
    const result = handleFightInfo(text, ctx);
    if (result) return result;
  }

  // Stats
  if (matches(text, ['promedio', 'duracion', 'cuantas peleas', 'total peleas', 'victorias', 'racha', 'consecutiv', 'estadistica', 'stats', 'resumen'])) {
    const result = handleStats(text, ctx);
    if (result) return result;
  }

  // Financial
  if (matches(text, ['balance', 'ingreso', 'egreso', 'gasto', 'dinero', 'financ', 'cuanto lleva', 'ganancia'])) {
    const result = handleFinancial(text, ctx);
    if (result) return result;
  }

  // Partido info
  if (matches(text, ['partido', 'aves de', 'gallos de', 'cuantos partidos'])) {
    const result = handlePartidoInfo(text, ctx);
    if (result) return result;
  }

  // Schedule
  if (matches(text, ['faltan', 'quedan', 'pendiente', 'hora empezo', 'hora de inicio', 'cuando empezo', 'inicio del evento'])) {
    const result = handleSchedule(text, ctx);
    if (result) return result;
  }

  // No local match
  return null;
}

// ============================================================
// REGLAMENTO: DB search
// ============================================================
async function searchReglamento(eventoId, text) {
  const norm = normalize(text);
  const keywords = norm.split(/\s+/).filter(w => w.length > 2);

  if (keywords.length === 0) return null;

  // Search in reglamentos: official rules + event-specific rules
  const { rows } = await db.query(
    `SELECT titulo, contenido, seccion, articulo, es_oficial
     FROM reglamentos
     WHERE (evento_id = $1 OR evento_id IS NULL)
       AND (
         $2 && keywords
         OR LOWER(contenido) LIKE ANY(ARRAY(SELECT '%' || unnest($2::text[]) || '%'))
         OR LOWER(titulo) LIKE ANY(ARRAY(SELECT '%' || unnest($2::text[]) || '%'))
       )
     ORDER BY es_oficial DESC, articulo
     LIMIT 5`,
    [eventoId, keywords]
  );

  if (rows.length === 0) return null;

  const sections = rows.map(r => {
    let line = '';
    if (r.articulo) line += `Art. ${r.articulo}: `;
    if (r.titulo) line += `${r.titulo} - `;
    line += r.contenido;
    if (r.es_oficial) line += ' (oficial)';
    return line;
  });

  return {
    respuesta: `Encontré ${rows.length} sección(es) relevante(s) en el reglamento:\n\n${sections.join('\n\n')}`,
    tipo: 'reglamento',
    datos: { secciones: rows },
  };
}

// ============================================================
// CLAUDE API FALLBACK (Tier 2)
// ============================================================
function buildContextString(ctx) {
  return `CONTEXTO DEL EVENTO:
Evento: ${ctx.evento.nombre} (${ctx.evento.estado}) - Modo: ${ctx.evento.modo}
Lugar: ${ctx.evento.lugar || 'No especificado'}
Pelea actual: ${ctx.evento.pelea_actual || 0} de ${ctx.evento.total_peleas}
Costos: Inscripción $${ctx.evento.costo_inscripcion || 0}, Por pelea $${ctx.evento.costo_por_pelea || 0}, Premio $${ctx.evento.premio_campeon || 0}

ESTADÍSTICAS:
- Finalizadas: ${ctx.stats.peleas_finalizadas}, Pendientes: ${ctx.stats.peleas_pendientes}
- En curso: Pelea ${ctx.stats.pelea_en_curso || 'ninguna'}
- Victorias Rojo: ${ctx.stats.victorias_rojo}, Verde: ${ctx.stats.victorias_verde}, Tablas: ${ctx.stats.tablas}
- Duración promedio: ${ctx.stats.duracion_promedio ? ctx.stats.duracion_promedio + ' min' : 'sin datos'}

FINANZAS:
- Ingresos: $${parseFloat(ctx.finanzas.total_ingresos).toLocaleString()}, Egresos: $${parseFloat(ctx.finanzas.total_egresos).toLocaleString()}
- Balance: $${(parseFloat(ctx.finanzas.total_ingresos) - parseFloat(ctx.finanzas.total_egresos)).toLocaleString()}

PARTIDOS (${ctx.partidos.length}):
${ctx.partidos.map(p => {
  const s = ctx.partidoStats[p.id] || { ganadas: 0, perdidas: 0, tablas: 0 };
  return `- ${p.nombre} (#${p.numero_partido || '?'}): ${p.puntos || 0} pts, G:${s.ganadas} P:${s.perdidas} T:${s.tablas}, Aves: ${p.aves_disponibles}/${p.total_aves}`;
}).join('\n')}

PELEAS:
${ctx.peleas.map(p => {
  let line = `#${p.numero_pelea}: ${p.estado}`;
  if (p.resultado) line += ` → ${p.resultado}`;
  if (p.placa_rojo || p.placa_verde) line += ` | ${p.placa_rojo || '?'} vs ${p.placa_verde || '?'}`;
  if (p.anillo_rojo || p.anillo_verde) line += ` | ${p.anillo_rojo || '?'} vs ${p.anillo_verde || '?'}`;
  if (p.peso_rojo || p.peso_verde) line += ` | ${p.peso_rojo || '?'}g vs ${p.peso_verde || '?'}g`;
  if (p.duracion_minutos) line += ` | ${p.duracion_minutos}min`;
  return line;
}).join('\n')}`;
}

async function askClaude(mensaje, ctx, tipo) {
  const contextStr = buildContextString(ctx);
  const userContent = tipo === 'observar'
    ? `${contextStr}\n\n---\n\nAnaliza el estado actual del evento y da observaciones relevantes.`
    : tipo === 'cambio'
      ? `${contextStr}\n\n---\n\nEl empresario quiere hacer este cambio: "${mensaje}". Analiza las consecuencias y advierte si es necesario.`
      : `${contextStr}\n\n---\n\n${mensaje}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: GENESIS_MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  const data = await response.json();
  if (data.error) {
    logger.error('Genesis API error:', data.error);
    throw new Error(data.error.message || 'Error de API');
  }

  return data.content?.[0]?.text || 'Sin respuesta';
}

// ============================================================
// ACCESS CONTROL: Check if user has access to event
// ============================================================
async function checkEventAccess(userId, eventoId) {
  const { rows: userRows } = await db.query('SELECT rol FROM usuarios WHERE id = $1', [userId]);
  if (userRows[0]?.rol === 'admin') return true;

  // Is organizer?
  const { rows: org } = await db.query(
    'SELECT id FROM eventos_palenque WHERE id = $1 AND organizador_id = $2', [eventoId, userId]
  );
  if (org.length > 0) return true;

  // Is participant?
  const { rows: part } = await db.query(
    'SELECT id FROM participantes_evento WHERE evento_id = $1 AND usuario_id = $2', [eventoId, userId]
  );
  if (part.length > 0) return true;

  // Is partido member?
  const { rows: partido } = await db.query(
    'SELECT id FROM partidos_derby WHERE evento_id = $1 AND usuario_id = $2', [eventoId, userId]
  );
  if (partido.length > 0) return true;

  return false;
}

async function checkAdminOrOrganizer(userId, eventoId) {
  const { rows: userRows } = await db.query('SELECT rol FROM usuarios WHERE id = $1', [userId]);
  if (userRows[0]?.rol === 'admin') return true;

  const { rows: org } = await db.query(
    'SELECT id FROM eventos_palenque WHERE id = $1 AND organizador_id = $2', [eventoId, userId]
  );
  return org.length > 0;
}

// ============================================================
// ROUTES
// ============================================================

// POST /genesis/consultar - Main query endpoint (Tier 1 + Tier 2)
router.post('/consultar', authenticateJWT, asyncHandler(async (req, res) => {
  const { eventoId, mensaje, tipo } = req.body;

  if (!eventoId || !mensaje) {
    return res.status(400).json({ success: false, error: { message: 'eventoId y mensaje requeridos' } });
  }

  // Access control: any event participant
  const hasAccess = await checkEventAccess(req.userId, eventoId);
  if (!hasAccess) {
    return res.status(403).json({ success: false, error: { message: 'No tienes acceso a este evento' } });
  }

  // Get full context
  const context = await getEventContext(eventoId);
  if (!context) {
    return res.status(404).json({ success: false, error: { message: 'Evento no encontrado' } });
  }

  // --- TIER 1: Reglamento check ---
  if (matches(mensaje, ['regla', 'reglamento', 'articulo', 'se puede', 'es valido', 'esta permitido', 'permitido', 'prohibido', 'norma'])) {
    try {
      const reglamentoResult = await searchReglamento(eventoId, mensaje);
      if (reglamentoResult) {
        logger.info(`[Genesis] reglamento: "${mensaje.substring(0, 50)}..." → local match`);
        return res.json({ success: true, data: reglamentoResult });
      }
    } catch (err) {
      // Reglamento table might not exist yet, continue
      logger.warn('[Genesis] Reglamento search failed (table may not exist):', err.message);
    }
  }

  // --- TIER 1: Local engine ---
  const localResult = tryLocalEngine(mensaje, context);
  if (localResult) {
    logger.info(`[Genesis] local: "${mensaje.substring(0, 50)}..." → "${localResult.respuesta.substring(0, 80)}..."`);
    return res.json({ success: true, data: localResult });
  }

  // --- TIER 2: Claude API fallback ---
  if (ANTHROPIC_API_KEY) {
    try {
      const respuesta = await askClaude(mensaje, context, tipo);
      logger.info(`[Genesis] ai: "${mensaje.substring(0, 50)}..." → "${respuesta.substring(0, 80)}..."`);
      return res.json({
        success: true,
        data: {
          respuesta,
          tipo: 'ai',
          datos: {
            pelea_actual: context.stats.pelea_en_curso,
            peleas_finalizadas: context.stats.peleas_finalizadas,
            peleas_pendientes: context.stats.peleas_pendientes,
          },
        },
      });
    } catch (error) {
      logger.error('Genesis AI fallback error:', error);
    }
  }

  // --- No match, no API ---
  return res.json({
    success: true,
    data: {
      respuesta: 'No tengo información sobre eso. Intenta preguntar sobre peleas, partidos, puntos o reglamento.',
      tipo: 'local',
    },
  });
}));

// GET /genesis/observar/:eventoId - Quick auto-analysis
router.get('/observar/:eventoId', authenticateJWT, asyncHandler(async (req, res) => {
  const { eventoId } = req.params;

  const hasAccess = await checkEventAccess(req.userId, eventoId);
  if (!hasAccess) {
    return res.status(403).json({ success: false, error: { message: 'No tienes acceso a este evento' } });
  }

  const context = await getEventContext(eventoId);
  if (!context) return res.status(404).json({ success: false, error: { message: 'Evento no encontrado' } });

  // Local observation (no API needed)
  const s = context.stats;
  const e = context.evento;
  let observacion = `${e.nombre}: pelea ${e.pelea_actual || 0} de ${e.total_peleas}.`;

  if (s.peleas_finalizadas > 0) {
    observacion += ` Rojo ${s.victorias_rojo} - Verde ${s.victorias_verde} - Tablas ${s.tablas}.`;
    if (s.duracion_promedio) observacion += ` Duración promedio: ${s.duracion_promedio} min.`;

    // Detect streaks
    const finalizadas = context.peleas.filter(p => p.estado === 'finalizada');
    if (finalizadas.length >= 3) {
      let streak = 1;
      let streakColor = finalizadas[finalizadas.length - 1]?.resultado;
      for (let i = finalizadas.length - 2; i >= 0; i--) {
        if (finalizadas[i].resultado === streakColor) streak++;
        else break;
      }
      if (streak >= 3) {
        const colorName = { rojo: 'Rojo', verde: 'Verde', tabla: 'Tablas' }[streakColor] || streakColor;
        observacion += ` ⚠ Racha de ${streak} ${colorName} consecutivas.`;
      }
    }
  } else {
    observacion += ' Aún no hay peleas finalizadas.';
  }

  // If API is available and event is active, get AI insight too
  if (ANTHROPIC_API_KEY && e.estado === 'en_curso' && s.peleas_finalizadas >= 3) {
    try {
      const aiObservacion = await askClaude('observar', context, 'observar');
      return res.json({ success: true, data: { respuesta: aiObservacion, tipo: 'ai' } });
    } catch (error) {
      // Fall through to local observation
    }
  }

  res.json({ success: true, data: { respuesta: observacion, tipo: 'local' } });
}));

// GET /genesis/reglamento/:eventoId - List available rules
router.get('/reglamento/:eventoId', authenticateJWT, asyncHandler(async (req, res) => {
  const { eventoId } = req.params;

  try {
    const { rows } = await db.query(
      `SELECT id, titulo, seccion, articulo, es_oficial, created_at
       FROM reglamentos
       WHERE evento_id = $1 OR evento_id IS NULL
       ORDER BY es_oficial DESC, seccion, articulo`,
      [eventoId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    // Table might not exist yet
    if (err.code === '42P01') {
      return res.json({ success: true, data: [] });
    }
    throw err;
  }
}));

// POST /genesis/reglamento - Create/upload rule section (admin/organizer only)
router.post('/reglamento', authenticateJWT, asyncHandler(async (req, res) => {
  const { eventoId, titulo, contenido, seccion, articulo, keywords, es_oficial } = req.body;

  if (!contenido) {
    return res.status(400).json({ success: false, error: { message: 'contenido es requerido' } });
  }

  // Only admin or organizer can create rules
  const isAllowed = await checkAdminOrOrganizer(req.userId, eventoId);
  if (!isAllowed) {
    return res.status(403).json({ success: false, error: { message: 'Solo admin u organizador puede crear reglamentos' } });
  }

  // Auto-generate keywords from title and content if not provided
  const autoKeywords = keywords || [
    ...(titulo || '').toLowerCase().split(/\s+/),
    ...contenido.toLowerCase().split(/\s+/).filter(w => w.length > 3),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 20);

  try {
    const { rows: [created] } = await db.query(
      `INSERT INTO reglamentos (evento_id, titulo, contenido, seccion, articulo, keywords, es_oficial)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, titulo, seccion, articulo`,
      [eventoId || null, titulo || null, contenido, seccion || null, articulo || null, autoKeywords, es_oficial || false]
    );

    res.json({ success: true, data: created });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(500).json({ success: false, error: { message: 'Tabla reglamentos no existe. Ejecuta la migración primero.' } });
    }
    throw err;
  }
}));

module.exports = router;
