/**
 * GenesisPro - Health Event Reminders Cron
 * Sends push notifications 2 days and 1 day before scheduled health events
 * Runs daily at 8:00 AM Mexico City time
 */

const cron = require('node-cron');
const db = require('../config/database');
const logger = require('../config/logger');

function startHealthRemindersCron() {
  // Run daily at 8:00 AM Mexico City (UTC-6 = 14:00 UTC)
  cron.schedule('0 14 * * *', async () => {
    logger.info('[HealthReminders] Running daily health reminders check...');

    try {
      const tomorrow = new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10);
      const in2days = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

      // Collect all upcoming health events (vacunas, desparasitaciones, consultas)
      const reminders = [];

      // Vacunas
      const { rows: vacunas } = await db.query(`
        SELECT v.proxima_dosis as fecha, v.tipo_vacuna, v.recordatorio_silenciado,
               a.codigo_identidad, a.usuario_id
        FROM vacunas v
        JOIN aves a ON v.ave_id = a.id
        WHERE a.deleted_at IS NULL
          AND v.recordatorio_silenciado = false
          AND v.proxima_dosis IN ($1, $2)
      `, [tomorrow, in2days]);

      vacunas.forEach(v => {
        const diasAntes = v.fecha === tomorrow ? 1 : 2;
        reminders.push({
          usuario_id: v.usuario_id,
          titulo: diasAntes === 1 ? 'Vacuna MANANA' : 'Vacuna en 2 dias',
          cuerpo: `${v.tipo_vacuna || 'Vacuna'} para ${v.codigo_identidad}`,
          urgente: diasAntes === 1,
        });
      });

      // Desparasitaciones
      const { rows: desparas } = await db.query(`
        SELECT d.proxima_aplicacion as fecha, d.producto, d.recordatorio_silenciado,
               a.codigo_identidad, a.usuario_id
        FROM desparasitaciones d
        JOIN aves a ON d.ave_id = a.id
        WHERE a.deleted_at IS NULL
          AND d.recordatorio_silenciado = false
          AND d.proxima_aplicacion IN ($1, $2)
      `, [tomorrow, in2days]);

      desparas.forEach(d => {
        const diasAntes = d.fecha === tomorrow ? 1 : 2;
        reminders.push({
          usuario_id: d.usuario_id,
          titulo: diasAntes === 1 ? 'Desparasitacion MANANA' : 'Desparasitacion en 2 dias',
          cuerpo: `${d.producto || 'Desparasitacion'} para ${d.codigo_identidad}`,
          urgente: diasAntes === 1,
        });
      });

      // Consultas
      const { rows: consultas } = await db.query(`
        SELECT cv.proxima_consulta as fecha, cv.motivo, cv.recordatorio_silenciado,
               a.codigo_identidad, a.usuario_id
        FROM consultas_veterinarias cv
        JOIN aves a ON cv.ave_id = a.id
        WHERE a.deleted_at IS NULL
          AND cv.recordatorio_silenciado = false
          AND cv.proxima_consulta IN ($1, $2)
      `, [tomorrow, in2days]);

      consultas.forEach(c => {
        const diasAntes = c.fecha === tomorrow ? 1 : 2;
        reminders.push({
          usuario_id: c.usuario_id,
          titulo: diasAntes === 1 ? 'Consulta veterinaria MANANA' : 'Consulta en 2 dias',
          cuerpo: `${c.motivo || 'Consulta'} para ${c.codigo_identidad}`,
          urgente: diasAntes === 1,
        });
      });

      if (reminders.length === 0) {
        logger.info('[HealthReminders] No pending reminders.');
        return;
      }

      // Group by user and send
      const byUser = {};
      for (const r of reminders) {
        if (!byUser[r.usuario_id]) byUser[r.usuario_id] = [];
        byUser[r.usuario_id].push(r);
      }

      let sent = 0;
      for (const [userId, userReminders] of Object.entries(byUser)) {
        const { rows: tokens } = await db.query(
          'SELECT token FROM push_tokens WHERE usuario_id = $1 AND activo = true',
          [userId]
        );

        if (tokens.length === 0) continue;

        const tokenList = tokens.map(t => t.token);
        const hasUrgent = userReminders.some(r => r.urgente);

        // If multiple, group into one notification
        let title, body;
        if (userReminders.length === 1) {
          title = userReminders[0].titulo;
          body = userReminders[0].cuerpo;
        } else {
          title = hasUrgent ? 'Recordatorios de salud URGENTES' : 'Recordatorios de salud';
          body = userReminders.map(r => r.cuerpo).join('\n');
        }

        const messages = tokenList.map(token => ({
          to: token,
          sound: 'default',
          title,
          body,
          data: { tipo: 'recordatorio_salud' },
          priority: hasUrgent ? 'high' : 'default',
          channelId: hasUrgent ? 'fight-alerts' : 'default',
        }));

        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
          });
          sent += tokenList.length;
        } catch (err) {
          logger.error(`[HealthReminders] Error sending to user ${userId}:`, err);
        }
      }

      logger.info(`[HealthReminders] Sent ${sent} notifications for ${reminders.length} events to ${Object.keys(byUser).length} users.`);
    } catch (error) {
      logger.error('[HealthReminders] Cron error:', error);
    }
  });

  logger.info('[HealthReminders] Cron scheduled: daily at 8:00 AM Mexico City');
}

module.exports = { startHealthRemindersCron };
