/**
 * Data Retention Cron Job
 *
 * Runs daily at 4:00 AM:
 * 1. Soft-deletes data from users whose trial expired 3+ months ago
 * 2. Hard-deletes records that were soft-deleted 30+ days ago
 */

const cron = require('node-cron');
const db = require('../config/database');
const logger = require('../config/logger');

const TRIAL_RETENTION_MONTHS = 3;
const SOFT_DELETE_RETENTION_DAYS = 30;

async function softDeleteExpiredTrialData() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Find users with expired trial > 3 months, no active subscription
    const { rows: users } = await client.query(
      `SELECT u.id, u.email, u.trial_fin
       FROM usuarios u
       WHERE u.estado_cuenta = 'vencido'
         AND u.trial_fin < NOW() - INTERVAL '${TRIAL_RETENTION_MONTHS} months'
         AND u.suscripcion_activa_id IS NULL
         AND u.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM aves a WHERE a.usuario_id = u.id AND a.deleted_at IS NULL
         )`
    );

    if (users.length === 0) {
      logger.info('[DataRetention] No expired trial users to clean up');
      await client.query('COMMIT');
      return;
    }

    const userIds = users.map(u => u.id);
    logger.info(`[DataRetention] Soft-deleting data for ${userIds.length} expired trial users`);

    // Soft-delete aves
    const { rowCount: avesCount } = await client.query(
      `UPDATE aves SET deleted_at = NOW() WHERE usuario_id = ANY($1) AND deleted_at IS NULL`,
      [userIds]
    );

    // Soft-delete combates
    const { rowCount: combatesCount } = await client.query(
      `UPDATE combates SET deleted_at = NOW() WHERE usuario_id = ANY($1) AND deleted_at IS NULL`,
      [userIds]
    );

    // Delete health records (no soft-delete on these tables)
    const { rowCount: vacunasCount } = await client.query(
      `DELETE FROM vacunas WHERE usuario_id = ANY($1)`, [userIds]
    );
    const { rowCount: desparaCount } = await client.query(
      `DELETE FROM desparasitaciones WHERE usuario_id = ANY($1)`, [userIds]
    );
    const { rowCount: consultasCount } = await client.query(
      `DELETE FROM consultas_veterinarias WHERE usuario_id = ANY($1)`, [userIds]
    );
    const { rowCount: tratamientosCount } = await client.query(
      `DELETE FROM tratamientos WHERE usuario_id = ANY($1)`, [userIds]
    );

    // Delete financial records
    const { rowCount: transCount } = await client.query(
      `DELETE FROM transacciones WHERE usuario_id = ANY($1)`, [userIds]
    );

    await client.query('COMMIT');

    logger.info(`[DataRetention] Cleanup complete: ${avesCount} aves, ${combatesCount} combates, ` +
      `${vacunasCount} vacunas, ${desparaCount} desparas, ${consultasCount} consultas, ` +
      `${tratamientosCount} tratamientos, ${transCount} transacciones deleted ` +
      `for ${userIds.length} users`);

  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('[DataRetention] Error in soft-delete expired trial data:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function hardDeleteOldRecords() {
  try {
    // Hard-delete aves soft-deleted 30+ days ago
    const { rowCount: avesCount } = await db.query(
      `DELETE FROM aves WHERE deleted_at < NOW() - INTERVAL '${SOFT_DELETE_RETENTION_DAYS} days'`
    );

    // Hard-delete combates soft-deleted 30+ days ago
    const { rowCount: combatesCount } = await db.query(
      `DELETE FROM combates WHERE deleted_at < NOW() - INTERVAL '${SOFT_DELETE_RETENTION_DAYS} days'`
    );

    if (avesCount > 0 || combatesCount > 0) {
      logger.info(`[DataRetention] Hard-deleted: ${avesCount} aves, ${combatesCount} combates (soft-deleted 30+ days ago)`);
    }
  } catch (err) {
    logger.error('[DataRetention] Error in hard-delete old records:', err.message);
    throw err;
  }
}

async function cleanupPushTokens() {
  try {
    // Remove inactive tokens older than 30 days
    const { rowCount: inactiveCount } = await db.query(
      `DELETE FROM push_tokens WHERE activo = false AND updated_at < NOW() - INTERVAL '30 days'`
    );

    // Remove duplicate tokens (keep most recent per token)
    const { rowCount: dupeCount } = await db.query(
      `DELETE FROM push_tokens WHERE id NOT IN (
        SELECT DISTINCT ON (token) id FROM push_tokens ORDER BY token, updated_at DESC
      )`
    );

    // Remove tokens from deleted/inactive users
    const { rowCount: orphanCount } = await db.query(
      `DELETE FROM push_tokens WHERE usuario_id NOT IN (
        SELECT id FROM usuarios WHERE activo = true AND deleted_at IS NULL
      )`
    );

    const total = inactiveCount + dupeCount + orphanCount;
    if (total > 0) {
      logger.info(`[DataRetention] Push tokens cleanup: ${inactiveCount} inactive, ${dupeCount} duplicates, ${orphanCount} orphaned removed`);
    }
  } catch (err) {
    logger.error('[DataRetention] Error cleaning push tokens:', err.message);
  }
}

function startDataRetentionCron() {
  // Run daily at 4:00 AM
  cron.schedule('0 4 * * *', async () => {
    logger.info('[DataRetention] Starting daily cleanup...');
    try {
      await softDeleteExpiredTrialData();
      await hardDeleteOldRecords();
      await cleanupPushTokens();
      logger.info('[DataRetention] Daily cleanup finished');
    } catch (err) {
      logger.error('[DataRetention] Daily cleanup failed:', err.message);
    }
  }, {
    timezone: 'America/Mexico_City'
  });

  logger.info('[DataRetention] Cron scheduled: daily at 4:00 AM (Mexico City)');
}

module.exports = { startDataRetentionCron, softDeleteExpiredTrialData, hardDeleteOldRecords };
