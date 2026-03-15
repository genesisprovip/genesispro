/**
 * Plan Limits Middleware
 * Verifies user limits based on subscription plan
 */

const db = require('../config/database');
const { Errors, asyncHandler } = require('./errorHandler');

/**
 * Get user limits from database
 */
const getUserLimits = async (userId) => {
  const { rows } = await db.query(
    `SELECT * FROM v_limites_usuario WHERE usuario_id = $1`,
    [userId]
  );

  if (rows.length === 0) {
    throw Errors.notFound('Plan de usuario');
  }

  return rows[0];
};

/**
 * Check plan limits middleware factory
 * @param {string} feature - Feature to check
 */
const checkPlanLimits = (feature) => {
  return asyncHandler(async (req, res, next) => {
    const userId = req.userId;
    const limits = await getUserLimits(userId);

    // Verify subscription is valid
    if (!limits.suscripcion_valida && limits.plan_actual !== 'basico') {
      throw Errors.subscriptionExpired();
    }

    // Attach limits to request for later use
    req.userLimits = limits;

    switch (feature) {
      case 'crear_ave': {
        if (limits.max_aves !== null && limits.aves_actuales >= limits.max_aves) {
          throw Errors.limitExceeded(
            `Has alcanzado el límite de ${limits.max_aves} aves en tu plan ${limits.plan_actual}`,
            {
              current: limits.aves_actuales,
              max: limits.max_aves,
              plan: limits.plan_actual,
              upgrade_required: true
            }
          );
        }
        break;
      }

      case 'foto':
      case 'subir_foto': {
        if (limits.max_fotos_por_ave !== null) {
          const aveId = req.params.id || req.body.ave_id;

          const { rows } = await db.query(
            'SELECT COUNT(*) FROM fotos WHERE ave_id = $1',
            [aveId]
          );

          const currentPhotos = parseInt(rows[0].count);

          if (currentPhotos >= limits.max_fotos_por_ave) {
            throw Errors.limitExceeded(
              `Has alcanzado el límite de ${limits.max_fotos_por_ave} fotos por ave`,
              {
                current: currentPhotos,
                max: limits.max_fotos_por_ave,
                plan: limits.plan_actual,
                upgrade_required: true
              }
            );
          }
        }
        break;
      }

      case 'crear_combate': {
        if (limits.max_combates !== null) {
          const { rows } = await db.query(
            `SELECT COUNT(*) FROM combates c
             JOIN aves a ON c.macho_id = a.id
             WHERE a.usuario_id = $1 AND c.deleted_at IS NULL`,
            [userId]
          );

          const currentCombates = parseInt(rows[0].count);

          if (currentCombates >= limits.max_combates) {
            throw Errors.limitExceeded(
              `Has alcanzado el límite de ${limits.max_combates} combates`,
              {
                current: currentCombates,
                max: limits.max_combates,
                plan: limits.plan_actual,
                upgrade_required: true
              }
            );
          }
        }
        break;
      }

      case 'genealogia': {
        // Store max depth for use in controller
        req.maxGenealogyDepth = limits.profundidad_genealogia || 2;
        break;
      }

      case 'analytics_avanzado': {
        if (!limits.analytics_avanzado) {
          throw Errors.subscriptionRequired('premium');
        }
        break;
      }

      case 'exportar': {
        if (!limits.exportacion) {
          throw Errors.subscriptionRequired('pro');
        }
        break;
      }

      case 'multi_usuario': {
        if (!limits.multi_usuario) {
          throw Errors.subscriptionRequired('premium');
        }

        // Check collaborator limit
        if (limits.max_colaboradores !== null &&
            limits.colaboradores_actuales >= limits.max_colaboradores) {
          throw Errors.limitExceeded(
            `Has alcanzado el límite de ${limits.max_colaboradores} colaboradores`,
            {
              current: limits.colaboradores_actuales,
              max: limits.max_colaboradores,
              plan: limits.plan_actual
            }
          );
        }
        break;
      }

      case 'api_access': {
        if (!limits.api_access) {
          throw Errors.subscriptionRequired('premium');
        }
        break;
      }

      case 'salud':
      case 'finanzas':
      case 'alimentacion':
      case 'formulas':
      case 'observaciones': {
        // These features require at least Pro plan
        if (limits.plan_actual === 'basico') {
          throw Errors.subscriptionRequired('pro');
        }
        break;
      }

      case 'pedigree': {
        // Pedigree PDF requires Premium plan
        const planHierarchy = { basico: 0, pro: 1, premium: 2 };
        if ((planHierarchy[limits.plan_actual] || 0) < 2) {
          throw Errors.subscriptionRequired('premium');
        }
        break;
      }

      default:
        // No specific limit check
        break;
    }

    next();
  });
};

/**
 * Require minimum plan level (uses hierarchy: basico < pro < premium)
 * Trial users already have plan_actual='premium' in DB, so they pass automatically.
 * @param {string} minPlan - Minimum plan required: 'basico', 'pro', or 'premium'
 */
const requirePlan = (minPlan) => {
  const planHierarchy = { basico: 0, pro: 1, premium: 2 };

  return asyncHandler(async (req, res, next) => {
    const limits = req.userLimits || await getUserLimits(req.userId);
    req.userLimits = limits;

    // Verify subscription is valid
    if (!limits.suscripcion_valida && limits.plan_actual !== 'basico') {
      throw Errors.subscriptionExpired();
    }

    const userLevel = planHierarchy[limits.plan_actual] || 0;
    const requiredLevel = planHierarchy[minPlan] || 0;

    if (userLevel < requiredLevel) {
      throw Errors.subscriptionRequired(minPlan);
    }

    next();
  });
};

module.exports = {
  checkPlanLimits,
  requirePlan,
  getUserLimits
};
