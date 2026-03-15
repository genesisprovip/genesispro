/**
 * Smart Query Assistant
 * Parses user messages via keyword matching and runs scoped DB queries.
 * No external AI API — all logic is pattern matching + SQL.
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../config/logger');
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getUserAlerts, markAlertRead } = require('../cron/smartAlerts');

// ─── Intent Detection ───────────────────────────────────────────────

const INTENT_KEYWORDS = {
  genealogy: ['hijos', 'crias', 'descendencia', 'nietos', 'cruzas', 'padre', 'madre', 'genealogia', 'arbol', 'familia'],
  stats: ['estadistica', 'stats', 'record', 'rendimiento', 'linea ganadora', 'linea perdedora', 'mejor linea', 'peor linea'],
  health: ['vacuna', 'salud', 'tratamiento', 'desparasit', 'veterinar', 'consulta', 'enferm'],
  plan: ['plan', 'suscripcion', 'limite', 'cuantas aves puedo', 'fotos', 'premium', 'pro'],
  combates: ['combate', 'pelea', 'fight', 'resultado', 'ganado', 'perdido'],
  finances: ['finanza', 'gasto', 'ingreso', 'dinero', 'costo', 'transaccion'],
  summary: ['resumen', 'informe', 'reporte', 'general', 'todo'],
  help: ['ayuda', 'help', 'que puedes', 'como funciona'],
  alimentacion: ['alimentacion', 'formula', 'dieta', 'comida', 'nutricion'],
  bird_search: ['buscar', 'encontrar', 'donde esta'],
};

function detectIntent(message) {
  const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const lowerOriginal = message.toLowerCase();

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const kw of keywords) {
      const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower.includes(kwNorm)) {
        // Extract search term: remove the matched keyword and common filler words
        let searchTerm = lowerOriginal
          .replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '')
          .replace(/\b(de|del|la|el|los|las|mi|mis|un|una|que|es|tiene|como|esta|para|por|con|en|al|a)\b/gi, '')
          .trim();
        return { intent, searchTerm };
      }
    }
  }

  // Default: try as bird search
  return { intent: 'bird_search', searchTerm: lowerOriginal.trim() };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatWeight(grams) {
  if (!grams) return 'N/A';
  return `${Number(grams).toLocaleString('es-MX')}g`;
}

function calcAge(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const birth = new Date(fechaNacimiento);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 1) return 'Menos de 1 mes';
  if (months < 12) return `${months} meses`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} año${years > 1 ? 's' : ''} y ${rem} mes${rem > 1 ? 'es' : ''}` : `${years} año${years > 1 ? 's' : ''}`;
}

async function getBirdCombatesRecord(userId, birdId) {
  const { rows } = await db.query(
    `SELECT resultado, COUNT(*)::int as total
     FROM combates WHERE usuario_id = $1 AND ave_id = $2
     GROUP BY resultado`,
    [userId, birdId]
  );
  const record = { ganado: 0, perdido: 0, empate: 0, tabla: 0, total: 0 };
  for (const r of rows) {
    record[r.resultado] = r.total;
    record.total += r.total;
  }
  return record;
}

function formatBirdCard(bird, record) {
  return {
    id: bird.id,
    nombre: bird.nombre,
    codigo_identidad: bird.codigo_identidad,
    linea_genetica: bird.linea_genetica,
    sexo: bird.sexo,
    peso: formatWeight(bird.peso_actual),
    estado: bird.estado,
    color: bird.color,
    edad: calcAge(bird.fecha_nacimiento),
    anillo_metalico: bird.anillo_metalico,
    anillo_color: bird.anillo_color,
    anillo_codigo: bird.anillo_codigo,
    anillo_pata: bird.anillo_pata,
    criadero_origen: bird.criadero_origen,
    combates: record,
  };
}

// ─── Intent Handlers ─────────────────────────────────────────────────

async function handleBirdSearch(userId, searchTerm) {
  if (!searchTerm || searchTerm.length < 1) {
    return {
      type: 'not_found',
      title: 'Búsqueda de aves',
      content: 'Dime el nombre, código o anillo del ave que buscas.',
      suggestions: ['Buscar Cenizo', 'Mis aves activas', 'Resumen general'],
    };
  }

  const pattern = `%${searchTerm}%`;
  const { rows } = await db.query(
    `SELECT * FROM aves
     WHERE usuario_id = $1 AND deleted_at IS NULL
       AND (nombre ILIKE $2 OR codigo_identidad ILIKE $2 OR anillo_metalico ILIKE $2
            OR anillo_codigo ILIKE $2 OR linea_genetica ILIKE $2 OR color ILIKE $2)
     ORDER BY nombre ASC LIMIT 10`,
    [userId, pattern]
  );

  if (rows.length === 0) {
    return {
      type: 'not_found',
      title: 'Sin resultados',
      content: `No encontré aves que coincidan con "${searchTerm}".`,
      suggestions: ['Mis aves activas', 'Estadísticas', 'Ayuda'],
    };
  }

  if (rows.length === 1) {
    const bird = rows[0];
    const record = await getBirdCombatesRecord(userId, bird.id);
    return {
      type: 'bird_card',
      title: bird.nombre || bird.codigo_identidad,
      content: `Encontré a ${bird.nombre || bird.codigo_identidad}.`,
      items: [formatBirdCard(bird, record)],
      suggestions: [
        `Hijos de ${bird.nombre || bird.codigo_identidad}`,
        `Combates de ${bird.nombre || bird.codigo_identidad}`,
        `Salud de ${bird.nombre || bird.codigo_identidad}`,
      ],
    };
  }

  const items = [];
  for (const bird of rows) {
    const record = await getBirdCombatesRecord(userId, bird.id);
    items.push(formatBirdCard(bird, record));
  }

  return {
    type: 'bird_list',
    title: `${rows.length} aves encontradas`,
    content: `Encontré ${rows.length} aves que coinciden con "${searchTerm}".`,
    items,
    suggestions: ['Estadísticas', 'Resumen general'],
  };
}

async function handleGenealogy(userId, searchTerm) {
  if (!searchTerm || searchTerm.length < 1) {
    return {
      type: 'not_found',
      title: 'Genealogía',
      content: 'Dime el nombre del ave para consultar su genealogía. Ejemplo: "Hijos de Cenizo"',
      suggestions: ['Hijos de ...', 'Cruzas de ...', 'Árbol de ...'],
    };
  }

  // Find the bird first
  const pattern = `%${searchTerm}%`;
  const { rows: birds } = await db.query(
    `SELECT * FROM aves WHERE usuario_id = $1 AND deleted_at IS NULL
     AND (nombre ILIKE $2 OR codigo_identidad ILIKE $2) LIMIT 1`,
    [userId, pattern]
  );

  if (birds.length === 0) {
    return {
      type: 'not_found',
      title: 'Ave no encontrada',
      content: `No encontré un ave llamada "${searchTerm}".`,
      suggestions: ['Buscar ave', 'Mis aves activas'],
    };
  }

  const bird = birds[0];
  const birdName = bird.nombre || bird.codigo_identidad;

  // Get children
  const { rows: children } = await db.query(
    `SELECT * FROM aves WHERE usuario_id = $1 AND deleted_at IS NULL
     AND (padre_id = $2 OR madre_id = $2) ORDER BY fecha_nacimiento DESC`,
    [userId, bird.id]
  );

  // Get parents
  let padre = null;
  let madre = null;
  if (bird.padre_id) {
    const { rows } = await db.query('SELECT id, nombre, codigo_identidad, linea_genetica FROM aves WHERE id = $1 AND usuario_id = $2', [bird.padre_id, userId]);
    padre = rows[0] || null;
  }
  if (bird.madre_id) {
    const { rows } = await db.query('SELECT id, nombre, codigo_identidad, linea_genetica FROM aves WHERE id = $1 AND usuario_id = $2', [bird.madre_id, userId]);
    madre = rows[0] || null;
  }

  // Get grandchildren
  const childIds = children.map(c => c.id);
  let grandchildren = [];
  if (childIds.length > 0) {
    const { rows } = await db.query(
      `SELECT a.*, p.nombre as parent_nombre FROM aves a
       LEFT JOIN aves p ON (a.padre_id = p.id OR a.madre_id = p.id)
       WHERE a.usuario_id = $1 AND a.deleted_at IS NULL
         AND (a.padre_id = ANY($2) OR a.madre_id = ANY($2))
       ORDER BY a.fecha_nacimiento DESC`,
      [userId, childIds]
    );
    grandchildren = rows;
  }

  // Get unique mates (cruzas)
  const { rows: mates } = await db.query(
    `SELECT DISTINCT ON (mate.id) mate.id, mate.nombre, mate.codigo_identidad, mate.linea_genetica, mate.sexo,
       COUNT(*) OVER (PARTITION BY mate.id) as crias_juntos
     FROM aves cria
     JOIN aves mate ON (
       (cria.padre_id = $2 AND cria.madre_id = mate.id) OR
       (cria.madre_id = $2 AND cria.padre_id = mate.id)
     )
     WHERE cria.usuario_id = $1 AND cria.deleted_at IS NULL AND mate.usuario_id = $1
     ORDER BY mate.id`,
    [userId, bird.id]
  );

  const items = children.map(c => ({
    id: c.id,
    nombre: c.nombre,
    codigo_identidad: c.codigo_identidad,
    sexo: c.sexo,
    linea_genetica: c.linea_genetica,
    estado: c.estado,
    edad: calcAge(c.fecha_nacimiento),
  }));

  const parts = [];
  if (padre) parts.push(`Padre: ${padre.nombre || padre.codigo_identidad}`);
  if (madre) parts.push(`Madre: ${madre.nombre || madre.codigo_identidad}`);
  parts.push(`${children.length} hijo${children.length !== 1 ? 's' : ''} directos`);
  if (grandchildren.length > 0) parts.push(`${grandchildren.length} nieto${grandchildren.length !== 1 ? 's' : ''}`);
  if (mates.length > 0) parts.push(`Cruzado con ${mates.length} ave${mates.length !== 1 ? 's' : ''}`);

  return {
    type: 'bird_list',
    title: `Genealogía de ${birdName}`,
    content: parts.join(' | '),
    items,
    parents: { padre, madre },
    grandchildren_count: grandchildren.length,
    mates: mates.map(m => ({
      id: m.id,
      nombre: m.nombre || m.codigo_identidad,
      linea_genetica: m.linea_genetica,
      crias_juntos: m.crias_juntos,
    })),
    suggestions: [
      `Buscar ${birdName}`,
      `Combates de ${birdName}`,
      'Estadísticas',
    ],
  };
}

async function handleStats(userId) {
  // Aves by estado
  const { rows: estadoCounts } = await db.query(
    `SELECT estado, COUNT(*)::int as total FROM aves
     WHERE usuario_id = $1 AND deleted_at IS NULL GROUP BY estado ORDER BY total DESC`,
    [userId]
  );

  const totalAves = estadoCounts.reduce((sum, r) => sum + r.total, 0);

  // Overall combates record
  const { rows: combateRecord } = await db.query(
    `SELECT resultado, COUNT(*)::int as total FROM combates
     WHERE usuario_id = $1 GROUP BY resultado`,
    [userId]
  );
  const record = { ganado: 0, perdido: 0, empate: 0, tabla: 0, total: 0 };
  for (const r of combateRecord) {
    record[r.resultado] = r.total;
    record.total += r.total;
  }

  // Best and worst linea_genetica
  const { rows: lineaStats } = await db.query(
    `SELECT a.linea_genetica,
       COUNT(*) FILTER (WHERE c.resultado = 'ganado')::int as wins,
       COUNT(*) FILTER (WHERE c.resultado = 'perdido')::int as losses,
       COUNT(*)::int as total
     FROM combates c
     JOIN aves a ON c.ave_id = a.id
     WHERE c.usuario_id = $1 AND a.linea_genetica IS NOT NULL AND a.linea_genetica != ''
     GROUP BY a.linea_genetica
     HAVING COUNT(*) >= 1
     ORDER BY wins DESC`,
    [userId]
  );

  const bestLinea = lineaStats.length > 0 ? lineaStats[0] : null;
  const worstLinea = lineaStats.length > 0 ? lineaStats[lineaStats.length - 1] : null;

  const parts = [`${totalAves} aves en total`];
  for (const e of estadoCounts) {
    parts.push(`${e.estado}: ${e.total}`);
  }
  if (record.total > 0) {
    parts.push(`Record: ${record.ganado}G - ${record.perdido}P - ${record.empate}E (${record.total} combates)`);
  }
  if (bestLinea) {
    parts.push(`Mejor línea: ${bestLinea.linea_genetica} (${bestLinea.wins}/${bestLinea.total} ganados)`);
  }
  if (worstLinea && worstLinea.linea_genetica !== (bestLinea && bestLinea.linea_genetica)) {
    parts.push(`Línea con más derrotas: ${worstLinea.linea_genetica} (${worstLinea.losses}/${worstLinea.total} perdidos)`);
  }

  return {
    type: 'stats',
    title: 'Estadísticas generales',
    content: parts.join('\n'),
    items: {
      totalAves,
      estadoCounts,
      record,
      lineaStats,
      bestLinea,
      worstLinea,
    },
    suggestions: ['Resumen general', 'Combates recientes', 'Mis aves activas'],
  };
}

async function handleHealth(userId, searchTerm) {
  const items = [];

  // If a specific bird is mentioned, scope to it
  let birdFilter = '';
  let params = [userId];
  if (searchTerm && searchTerm.length > 1) {
    const { rows: birds } = await db.query(
      `SELECT id, nombre FROM aves WHERE usuario_id = $1 AND deleted_at IS NULL
       AND (nombre ILIKE $2 OR codigo_identidad ILIKE $2) LIMIT 1`,
      [userId, `%${searchTerm}%`]
    );
    if (birds.length > 0) {
      birdFilter = ' AND t.ave_id = $2';
      params.push(birds[0].id);
    }
  }

  // Upcoming vaccines
  const { rows: vacunas } = await db.query(
    `SELECT v.id, v.nombre, v.fecha, v.proxima_fecha, a.nombre as ave_nombre, a.codigo_identidad
     FROM vacunas v JOIN aves a ON v.ave_id = a.id
     WHERE v.usuario_id = $1${birdFilter.replace(/t\./g, 'v.')}
     ORDER BY v.proxima_fecha ASC NULLS LAST LIMIT 10`,
    params
  );

  // Recent treatments
  const { rows: tratamientos } = await db.query(
    `SELECT t.id, t.tipo, t.descripcion, t.fecha, a.nombre as ave_nombre, a.codigo_identidad
     FROM tratamientos t JOIN aves a ON t.ave_id = a.id
     WHERE t.usuario_id = $1${birdFilter}
     ORDER BY t.fecha DESC LIMIT 10`,
    params
  );

  // Desparasitaciones
  const { rows: despars } = await db.query(
    `SELECT d.id, d.nombre, d.fecha, d.proxima_fecha, a.nombre as ave_nombre, a.codigo_identidad
     FROM desparasitaciones d JOIN aves a ON d.ave_id = a.id
     WHERE d.usuario_id = $1${birdFilter.replace(/t\./g, 'd.')}
     ORDER BY d.proxima_fecha ASC NULLS LAST LIMIT 10`,
    params
  );

  const content = [];
  if (vacunas.length > 0) content.push(`${vacunas.length} vacuna(s) registrada(s)`);
  if (tratamientos.length > 0) content.push(`${tratamientos.length} tratamiento(s) reciente(s)`);
  if (despars.length > 0) content.push(`${despars.length} desparasitación(es)`);
  if (content.length === 0) content.push('No hay registros de salud encontrados.');

  return {
    type: 'health',
    title: 'Registros de salud',
    content: content.join(' | '),
    items: { vacunas, tratamientos, desparasitaciones: despars },
    suggestions: ['Estadísticas', 'Buscar ave', 'Resumen general'],
  };
}

async function handlePlan(userId) {
  const { rows: userRows } = await db.query(
    `SELECT u.plan_actual, u.plan_elegido, p.nombre as plan_nombre, p.max_aves, p.max_fotos_por_ave
     FROM usuarios u
     LEFT JOIN planes p ON u.plan_actual = p.nombre OR u.plan_elegido = p.nombre
     WHERE u.id = $1 LIMIT 1`,
    [userId]
  );

  const { rows: aveCount } = await db.query(
    'SELECT COUNT(*)::int as total FROM aves WHERE usuario_id = $1 AND deleted_at IS NULL',
    [userId]
  );

  const user = userRows[0] || {};
  const total = aveCount[0]?.total || 0;
  const maxAves = user.max_aves || 10;
  const remaining = Math.max(0, maxAves - total);
  const planName = user.plan_actual || user.plan_elegido || 'basico';

  const content = [
    `Plan actual: ${planName.charAt(0).toUpperCase() + planName.slice(1)}`,
    `Aves registradas: ${total} de ${maxAves} permitidas`,
    `Disponibles: ${remaining}`,
  ];

  if (user.max_fotos_por_ave) {
    content.push(`Fotos por ave: ${user.max_fotos_por_ave}`);
  }

  if (remaining <= 3 && remaining > 0) {
    content.push('⚠ Estás cerca del límite. Considera actualizar tu plan.');
  } else if (remaining === 0) {
    content.push('⚠ Llegaste al límite de aves. Actualiza tu plan para registrar más.');
  }

  return {
    type: 'plan',
    title: `Plan ${planName}`,
    content: content.join('\n'),
    items: { planName, total, maxAves, remaining, maxFotos: user.max_fotos_por_ave },
    suggestions: ['Ver planes disponibles', 'Estadísticas', 'Resumen general'],
  };
}

async function handleCombates(userId, searchTerm) {
  let birdCondition = '';
  let params = [userId];

  if (searchTerm && searchTerm.length > 1) {
    const { rows: birds } = await db.query(
      `SELECT id, nombre FROM aves WHERE usuario_id = $1 AND deleted_at IS NULL
       AND (nombre ILIKE $2 OR codigo_identidad ILIKE $2) LIMIT 1`,
      [userId, `%${searchTerm}%`]
    );
    if (birds.length > 0) {
      birdCondition = ' AND c.ave_id = $2';
      params.push(birds[0].id);
    }
  }

  const { rows: combates } = await db.query(
    `SELECT c.id, c.resultado, c.fecha, c.ubicacion, c.peso_combate,
       c.duracion_minutos, c.oponente_descripcion, c.notas,
       a.nombre as ave_nombre, a.codigo_identidad
     FROM combates c
     JOIN aves a ON c.ave_id = a.id
     WHERE c.usuario_id = $1${birdCondition}
     ORDER BY c.fecha DESC LIMIT 20`,
    params
  );

  // Record summary
  const { rows: recordRows } = await db.query(
    `SELECT resultado, COUNT(*)::int as total FROM combates
     WHERE usuario_id = $1${birdCondition} GROUP BY resultado`,
    params
  );
  const record = { ganado: 0, perdido: 0, empate: 0, tabla: 0, total: 0 };
  for (const r of recordRows) {
    record[r.resultado] = r.total;
    record.total += r.total;
  }

  const items = combates.map(c => ({
    ...c,
    peso_combate: formatWeight(c.peso_combate),
  }));

  return {
    type: 'combates',
    title: `Combates${searchTerm ? ` de "${searchTerm}"` : ''}`,
    content: `Record: ${record.ganado}G - ${record.perdido}P - ${record.empate}E | ${record.total} combates`,
    items,
    record,
    suggestions: ['Estadísticas', 'Mejor línea', 'Resumen general'],
  };
}

async function handleFinances(userId) {
  const { rows: summary } = await db.query(
    `SELECT tipo, SUM(monto)::numeric as total, COUNT(*)::int as cantidad
     FROM transacciones WHERE usuario_id = $1 GROUP BY tipo`,
    [userId]
  );

  let totalIngresos = 0;
  let totalEgresos = 0;
  let cantIngresos = 0;
  let cantEgresos = 0;
  for (const r of summary) {
    if (r.tipo === 'ingreso') { totalIngresos = Number(r.total); cantIngresos = r.cantidad; }
    if (r.tipo === 'egreso') { totalEgresos = Number(r.total); cantEgresos = r.cantidad; }
  }
  const balance = totalIngresos - totalEgresos;

  const { rows: recent } = await db.query(
    `SELECT id, tipo, monto, descripcion, fecha FROM transacciones
     WHERE usuario_id = $1 ORDER BY fecha DESC LIMIT 10`,
    [userId]
  );

  const formatMoney = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  return {
    type: 'finances',
    title: 'Resumen financiero',
    content: [
      `Ingresos: ${formatMoney(totalIngresos)} (${cantIngresos} transacciones)`,
      `Egresos: ${formatMoney(totalEgresos)} (${cantEgresos} transacciones)`,
      `Balance: ${formatMoney(balance)}`,
    ].join('\n'),
    items: recent,
    summary: { totalIngresos, totalEgresos, balance, cantIngresos, cantEgresos },
    suggestions: ['Estadísticas', 'Resumen general', 'Combates recientes'],
  };
}

async function handleSummary(userId) {
  // Total aves by estado
  const { rows: estadoCounts } = await db.query(
    `SELECT estado, COUNT(*)::int as total FROM aves
     WHERE usuario_id = $1 AND deleted_at IS NULL GROUP BY estado ORDER BY total DESC`,
    [userId]
  );
  const totalAves = estadoCounts.reduce((sum, r) => sum + r.total, 0);

  // Combates record
  const { rows: combateRecord } = await db.query(
    `SELECT resultado, COUNT(*)::int as total FROM combates
     WHERE usuario_id = $1 GROUP BY resultado`,
    [userId]
  );
  const record = { ganado: 0, perdido: 0, empate: 0, tabla: 0, total: 0 };
  for (const r of combateRecord) {
    record[r.resultado] = r.total;
    record.total += r.total;
  }

  // Plan info
  const { rows: userRows } = await db.query(
    `SELECT u.plan_actual, p.max_aves FROM usuarios u
     LEFT JOIN planes p ON u.plan_actual = p.nombre
     WHERE u.id = $1 LIMIT 1`,
    [userId]
  );
  const plan = userRows[0]?.plan_actual || 'basico';
  const maxAves = userRows[0]?.max_aves || 10;

  // Recent activity (last 5 aves added)
  const { rows: recentAves } = await db.query(
    `SELECT nombre, codigo_identidad, created_at FROM aves
     WHERE usuario_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 5`,
    [userId]
  );

  // Finances balance
  const { rows: finSummary } = await db.query(
    `SELECT tipo, SUM(monto)::numeric as total FROM transacciones
     WHERE usuario_id = $1 GROUP BY tipo`,
    [userId]
  );
  let ingresos = 0, egresos = 0;
  for (const r of finSummary) {
    if (r.tipo === 'ingreso') ingresos = Number(r.total);
    if (r.tipo === 'egreso') egresos = Number(r.total);
  }

  const content = [
    `Aves: ${totalAves} (${estadoCounts.map(e => `${e.estado}: ${e.total}`).join(', ')})`,
    `Plan: ${plan} (${totalAves}/${maxAves})`,
    `Record: ${record.ganado}G - ${record.perdido}P - ${record.empate}E (${record.total} combates)`,
    `Balance: $${(ingresos - egresos).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
  ];

  return {
    type: 'summary',
    title: 'Resumen general',
    content: content.join('\n'),
    items: { totalAves, estadoCounts, record, plan, maxAves, recentAves, balance: ingresos - egresos },
    suggestions: ['Estadísticas detalladas', 'Combates recientes', 'Salud de mis aves'],
  };
}

function handleHelp() {
  return {
    type: 'help',
    title: 'Asistente GenesisPro',
    content: [
      'Puedo ayudarte con lo siguiente:',
      '',
      '🐓 Buscar aves — "Buscar Cenizo", "Donde está el 4521"',
      '🌳 Genealogía — "Hijos de Cenizo", "Cruzas de Negro"',
      '📊 Estadísticas — "Estadísticas", "Mejor línea", "Record"',
      '⚔️ Combates — "Combates de Cenizo", "Peleas recientes"',
      '💊 Salud — "Vacunas pendientes", "Tratamientos de Cenizo"',
      '💰 Finanzas — "Resumen financiero", "Gastos"',
      '🍽️ Alimentación — "Mis fórmulas", "Dietas"',
      '📋 Plan — "Mi plan", "Cuántas aves puedo tener"',
      '📄 Resumen — "Resumen general", "Reporte"',
    ].join('\n'),
    suggestions: ['Resumen general', 'Estadísticas', 'Buscar ave'],
  };
}

async function handleAlimentacion(userId) {
  const { rows: formulas } = await db.query(
    `SELECT id, nombre, descripcion, created_at FROM formulas
     WHERE usuario_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [userId]
  );

  if (formulas.length === 0) {
    return {
      type: 'alimentacion',
      title: 'Alimentación',
      content: 'No tienes fórmulas de alimentación registradas aún.',
      items: [],
      suggestions: ['Crear fórmula', 'Resumen general', 'Ayuda'],
    };
  }

  return {
    type: 'alimentacion',
    title: `Fórmulas de alimentación (${formulas.length})`,
    content: `Tienes ${formulas.length} fórmula${formulas.length !== 1 ? 's' : ''} registrada${formulas.length !== 1 ? 's' : ''}.`,
    items: formulas,
    suggestions: ['Estadísticas', 'Resumen general', 'Salud de mis aves'],
  };
}

// ─── Main Route ──────────────────────────────────────────────────────

router.post('/query', authenticateJWT, asyncHandler(async (req, res) => {
  const { message } = req.body;
  const userId = req.userId;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'El mensaje no puede estar vacío.',
    });
  }

  const trimmed = message.trim();
  logger.info(`Assistant query from user ${userId}: "${trimmed}"`);

  const { intent, searchTerm } = detectIntent(trimmed);
  let data;

  switch (intent) {
    case 'bird_search':
      data = await handleBirdSearch(userId, searchTerm);
      break;
    case 'genealogy':
      data = await handleGenealogy(userId, searchTerm);
      break;
    case 'stats':
      data = await handleStats(userId);
      break;
    case 'health':
      data = await handleHealth(userId, searchTerm);
      break;
    case 'plan':
      data = await handlePlan(userId);
      break;
    case 'combates':
      data = await handleCombates(userId, searchTerm);
      break;
    case 'finances':
      data = await handleFinances(userId);
      break;
    case 'summary':
      data = await handleSummary(userId);
      break;
    case 'help':
      data = handleHelp();
      break;
    case 'alimentacion':
      data = await handleAlimentacion(userId);
      break;
    default:
      data = await handleBirdSearch(userId, trimmed);
      break;
  }

  // Attach unread alerts count to every response
  try {
    const alerts = await getUserAlerts(userId, 5);
    if (alerts && alerts.length > 0) {
      data.alertas_pendientes = alerts.length;
      // If this is a help/summary query, include alert previews
      if (intent === 'help' || intent === 'summary') {
        data.alertas = alerts.map(a => ({
          id: a.id,
          tipo: a.tipo,
          titulo: a.titulo,
          mensaje: a.mensaje,
          prioridad: a.prioridad,
        }));
      }
    }
  } catch (alertErr) {
    logger.error('Error fetching alerts for assistant:', alertErr.message);
  }

  return res.json({ success: true, data });
}));

// GET /alerts — fetch unread smart alerts
router.get('/alerts', authenticateJWT, asyncHandler(async (req, res) => {
  const alerts = await getUserAlerts(req.userId, 20);
  res.json({
    success: true,
    data: {
      count: alerts.length,
      alerts: alerts.map(a => ({
        id: a.id,
        tipo: a.tipo,
        titulo: a.titulo,
        mensaje: a.mensaje,
        prioridad: a.prioridad,
        datos_extra: a.datos_extra,
        created_at: a.created_at,
      })),
    },
  });
}));

// POST /alerts/:id/read — mark alert as read
router.post('/alerts/:id/read', authenticateJWT, asyncHandler(async (req, res) => {
  const success = await markAlertRead(req.params.id, req.userId);
  res.json({ success, message: success ? 'Alerta marcada como leida' : 'Alerta no encontrada' });
}));

module.exports = router;
