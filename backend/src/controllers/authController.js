/**
 * Authentication Controller
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const { Errors, asyncHandler } = require('../middleware/errorHandler');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
const logger = require('../config/logger');

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, nombre, telefono, ubicacion, referido_por, referido_evento_id, plan } = req.body;

  // Validate plan if provided
  const validPlans = ['basico', 'pro', 'premium'];
  const planElegido = validPlans.includes(plan) ? plan : 'basico';

  // Check if email already exists
  const { rows: existing } = await db.query(
    'SELECT id FROM usuarios WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existing.length > 0) {
    throw Errors.conflict('Este email ya está registrado');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Create user with 15-day Premium trial
  // plan_actual = 'premium' during trial (full access), plan_elegido = chosen plan (applied after trial)
  const { rows } = await db.query(
    `INSERT INTO usuarios (email, password_hash, nombre, telefono, ubicacion, plan_actual, plan_elegido, estado_cuenta, trial_inicio, trial_fin, referido_por, referido_evento_id)
     VALUES ($1, $2, $3, $4, $5, 'premium', $6, 'trial', NOW(), NOW() + INTERVAL '15 days', $7, $8)
     RETURNING id, email, nombre, telefono, ubicacion, plan_actual, plan_elegido, email_verificado, estado_cuenta, trial_inicio, trial_fin, created_at`,
    [email.toLowerCase(), passwordHash, nombre, telefono || null, ubicacion || null, planElegido, referido_por || null, referido_evento_id || null]
  );

  const user = rows[0];

  // Create referral record if user was referred by an empresario
  if (referido_por) {
    try {
      await db.query(
        `INSERT INTO referidos (empresario_id, usuario_id, evento_id, estado)
         VALUES ($1, $2, $3, 'registrado')
         ON CONFLICT (usuario_id) DO NOTHING`,
        [referido_por, user.id, referido_evento_id || null]
      );
      logger.info(`Referral created: empresario=${referido_por}, user=${user.id}`);
    } catch (refError) {
      // Don't fail registration if referral tracking fails
      logger.error(`Error creating referral: ${refError.message}`);
    }
  }

  // Generate tokens
  const tokens = generateTokens(user.id);

  // Store refresh token hash
  const refreshTokenHash = crypto.createHash('sha256').update(tokens.refresh_token).digest('hex');
  await db.query(
    `INSERT INTO refresh_tokens (usuario_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [user.id, refreshTokenHash]
  );

  // Send verification email (fire-and-forget)
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
      const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
      await db.query(
        `UPDATE usuarios SET email_verification_token = $1, email_verification_expires = NOW() + INTERVAL '24 hours' WHERE id = $2`,
        [tokenHash + ':' + verifyCode, user.id]
      );

      const fromEmail = process.env.RESEND_FROM || 'GenesisPro <noreply@genesispro.vip>';
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: [user.email],
          subject: 'Bienvenido a GenesisPro - Verifica tu email',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0F172A;color:#fff;border-radius:16px;">
              <h2 style="color:#F59E0B;margin-bottom:8px;">GenesisPro</h2>
              <p>Hola ${nombre || ''},</p>
              <p>Bienvenido a GenesisPro. Tu cuenta ha sido creada con un trial Premium de 15 dias.</p>
              <div style="background:#1E293B;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                <p style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:8px;">Tu codigo de verificacion:</p>
                <h1 style="color:#10B981;font-size:36px;letter-spacing:8px;margin:0;">${verifyCode}</h1>
              </div>
              <p style="color:rgba(255,255,255,0.6);font-size:13px;">Este codigo expira en 24 horas.</p>
            </div>
          `,
        }),
      }).catch(e => logger.error('Welcome email failed:', e.message));
    }
  } catch (emailErr) {
    logger.error('Email verification setup failed:', emailErr.message);
  }

  logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    message: 'Usuario registrado exitosamente',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        telefono: user.telefono,
        ubicacion: user.ubicacion,
        plan_actual: user.plan_actual,
        plan_elegido: user.plan_elegido,
        email_verificado: user.email_verificado,
        estado_cuenta: user.estado_cuenta,
        trial_inicio: user.trial_inicio,
        trial_fin: user.trial_fin,
        created_at: user.created_at
      },
      tokens
    }
  });
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
// In-memory login attempt tracker (resets on restart, per-IP)
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function checkLoginAttempts(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return;
  if (record.count >= MAX_LOGIN_ATTEMPTS && Date.now() - record.lastAttempt < LOCKOUT_DURATION) {
    const minutesLeft = Math.ceil((LOCKOUT_DURATION - (Date.now() - record.lastAttempt)) / 60000);
    throw Errors.rateLimitExceeded();
  }
  if (Date.now() - record.lastAttempt >= LOCKOUT_DURATION) {
    loginAttempts.delete(ip);
  }
}

function recordFailedLogin(ip) {
  const record = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  record.count++;
  record.lastAttempt = Date.now();
  loginAttempts.set(ip, record);
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

const login = asyncHandler(async (req, res) => {
  const { email, password, device_info } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;

  // Check if IP is locked out
  checkLoginAttempts(clientIp);

  // Find user
  const { rows } = await db.query(
    `SELECT id, email, password_hash, nombre, telefono, ubicacion,
            plan_actual, plan_elegido, plan_empresario, email_verificado, foto_perfil, activo, estado_cuenta, trial_inicio, trial_fin, created_at
     FROM usuarios
     WHERE email = $1 AND deleted_at IS NULL`,
    [email.toLowerCase()]
  );

  if (rows.length === 0) {
    recordFailedLogin(clientIp);
    throw Errors.unauthorized('Credenciales inválidas');
  }

  const user = rows[0];

  // Check if user is active
  if (!user.activo) {
    throw Errors.unauthorized('Tu cuenta ha sido desactivada');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    recordFailedLogin(clientIp);
    throw Errors.unauthorized('Credenciales inválidas');
  }

  // Successful login - clear attempts
  clearLoginAttempts(clientIp);

  // Generate tokens
  const tokens = generateTokens(user.id);

  // Store refresh token
  const refreshTokenHash = crypto.createHash('sha256').update(tokens.refresh_token).digest('hex');
  const ipAddress = req.ip || req.connection.remoteAddress;

  await db.query(
    `INSERT INTO refresh_tokens (usuario_id, token_hash, device_info, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')`,
    [user.id, refreshTokenHash, device_info ? JSON.stringify(device_info) : null, ipAddress]
  );

  // Check trial expiry and downgrade if needed
  if (user.estado_cuenta === 'trial' && user.trial_fin && new Date(user.trial_fin) < new Date()) {
    const downgradePlan = user.plan_elegido || 'basico';
    await db.query(
      `UPDATE usuarios SET estado_cuenta = 'vencido', plan_actual = $2, ultimo_acceso = NOW() WHERE id = $1`,
      [user.id, downgradePlan]
    );
    user.estado_cuenta = 'vencido';
    user.plan_actual = downgradePlan;
  } else {
    await db.query(
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
      [user.id]
    );
  }

  logger.info(`User logged in: ${user.email}`);

  res.json({
    success: true,
    message: 'Login exitoso',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        telefono: user.telefono,
        ubicacion: user.ubicacion,
        plan_actual: user.plan_actual,
        plan_elegido: user.plan_elegido || 'basico',
        plan_empresario: user.plan_empresario || null,
        email_verificado: user.email_verificado,
        foto_perfil: user.foto_perfil,
        estado_cuenta: user.estado_cuenta,
        trial_inicio: user.trial_inicio,
        trial_fin: user.trial_fin,
        created_at: user.created_at
      },
      tokens
    }
  });
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh-token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  // Verify token
  const decoded = verifyRefreshToken(refresh_token);

  // Check if token exists and is not revoked
  const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');

  const { rows } = await db.query(
    `SELECT rt.*, u.id as user_id, u.email, u.activo
     FROM refresh_tokens rt
     JOIN usuarios u ON rt.usuario_id = u.id
     WHERE rt.token_hash = $1 AND rt.revoked = false AND rt.expires_at > NOW()`,
    [tokenHash]
  );

  if (rows.length === 0) {
    throw Errors.tokenInvalid();
  }

  const tokenData = rows[0];

  if (!tokenData.activo) {
    throw Errors.unauthorized('Tu cuenta ha sido desactivada');
  }

  // Generate new access token only
  const newAccessToken = require('jsonwebtoken').sign(
    { userId: tokenData.user_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    success: true,
    data: {
      access_token: newAccessToken,
      expires_in: 7 * 24 * 60 * 60
    }
  });
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Revoke all refresh tokens for this user (optional: could revoke just current)
    await db.query(
      `UPDATE refresh_tokens
       SET revoked = true, revoked_at = NOW(), revoked_reason = 'logout'
       WHERE usuario_id = $1 AND revoked = false`,
      [req.userId]
    );
  }

  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
const getProfile = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT
      u.id, u.email, u.nombre, u.telefono, u.ubicacion,
      u.foto_perfil, u.email_verificado, u.plan_actual, u.plan_elegido,
      u.plan_empresario, u.rol, u.estado_cuenta, u.trial_inicio, u.trial_fin,
      u.created_at, u.ultimo_acceso,
      l.max_aves, l.aves_actuales, l.max_fotos_por_ave,
      l.profundidad_genealogia, l.analytics_avanzado,
      l.multi_usuario, l.exportacion, l.api_access,
      l.suscripcion_valida
     FROM usuarios u
     LEFT JOIN v_limites_usuario l ON u.id = l.usuario_id
     WHERE u.id = $1`,
    [req.userId]
  );

  if (rows.length === 0) {
    throw Errors.notFound('Usuario');
  }

  const user = rows[0];

  // Auto-downgrade expired trial - use plan_elegido instead of hardcoded 'basico'
  if (user.estado_cuenta === 'trial' && user.trial_fin && new Date(user.trial_fin) < new Date()) {
    const downgradePlan = user.plan_elegido || 'basico';
    await db.query(
      `UPDATE usuarios SET estado_cuenta = 'vencido', plan_actual = $2 WHERE id = $1`,
      [req.userId, downgradePlan]
    );
    user.estado_cuenta = 'vencido';
    user.plan_actual = downgradePlan;
  }

  // Calculate trial days remaining
  let trialDiasRestantes = null;
  if (user.estado_cuenta === 'trial' && user.trial_fin) {
    const diff = new Date(user.trial_fin).getTime() - Date.now();
    trialDiasRestantes = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        telefono: user.telefono,
        ubicacion: user.ubicacion,
        foto_perfil: user.foto_perfil,
        email_verificado: user.email_verificado,
        plan_actual: user.plan_actual,
        plan_elegido: user.plan_elegido || 'basico',
        estado_cuenta: user.estado_cuenta,
        trial_inicio: user.trial_inicio,
        trial_fin: user.trial_fin,
        trial_dias_restantes: trialDiasRestantes,
        plan_empresario: user.plan_empresario || null,
        rol: user.rol || 'usuario',
        created_at: user.created_at,
        ultimo_acceso: user.ultimo_acceso
      },
      limites: {
        max_aves: user.max_aves,
        aves_actuales: user.aves_actuales,
        max_fotos_por_ave: user.max_fotos_por_ave,
        profundidad_genealogia: user.profundidad_genealogia,
        analytics_avanzado: user.analytics_avanzado,
        multi_usuario: user.multi_usuario,
        exportacion: user.exportacion,
        api_access: user.api_access,
        suscripcion_valida: user.suscripcion_valida
      }
    }
  });
});

/**
 * Update user profile
 * PUT /api/v1/auth/me
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { nombre, telefono, ubicacion } = req.body;

  const { rows } = await db.query(
    `UPDATE usuarios
     SET nombre = COALESCE($2, nombre),
         telefono = COALESCE($3, telefono),
         ubicacion = COALESCE($4, ubicacion),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, nombre, telefono, ubicacion, foto_perfil, plan_actual`,
    [req.userId, nombre, telefono, ubicacion]
  );

  res.json({
    success: true,
    message: 'Perfil actualizado',
    data: { user: rows[0] }
  });
});

/**
 * Change password
 * PUT /api/v1/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { password_actual, password_nuevo } = req.body;

  // Get current password hash
  const { rows } = await db.query(
    'SELECT password_hash FROM usuarios WHERE id = $1',
    [req.userId]
  );

  // Verify current password
  const isValid = await bcrypt.compare(password_actual, rows[0].password_hash);

  if (!isValid) {
    throw Errors.unauthorized('Contraseña actual incorrecta');
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const newPasswordHash = await bcrypt.hash(password_nuevo, salt);

  // Update password
  await db.query(
    'UPDATE usuarios SET password_hash = $2, updated_at = NOW() WHERE id = $1',
    [req.userId, newPasswordHash]
  );

  // Revoke all refresh tokens
  await db.query(
    `UPDATE refresh_tokens
     SET revoked = true, revoked_at = NOW(), revoked_reason = 'password_change'
     WHERE usuario_id = $1 AND revoked = false`,
    [req.userId]
  );

  logger.info(`Password changed for user: ${req.userId}`);

  res.json({
    success: true,
    message: 'Contraseña actualizada. Por favor inicia sesión nuevamente.'
  });
});

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Always return success to prevent email enumeration
  const successResponse = {
    success: true,
    message: 'Si el email existe, recibirás un código para restablecer tu contraseña'
  };

  const { rows } = await db.query(
    'SELECT id, email, nombre FROM usuarios WHERE email = $1 AND activo = true AND deleted_at IS NULL',
    [email.toLowerCase()]
  );

  if (rows.length === 0) {
    return res.json(successResponse);
  }

  // Generate 6-digit reset code (easier for mobile users)
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  // Store hashed token + code in DB
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  await db.query(
    `UPDATE usuarios SET password_reset_token = $1, password_reset_expires = $2, updated_at = NOW()
     WHERE id = $3`,
    [tokenHash + ':' + resetCode, expiresAt, rows[0].id]
  );

  // Send email with reset code via Resend
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error('RESEND_API_KEY not configured');

    const fromEmail = process.env.RESEND_FROM || 'GenesisPro <noreply@genesispro.vip>';

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [rows[0].email],
        subject: 'Recuperar contraseña - GenesisPro',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0F172A;color:#fff;border-radius:16px;">
            <h2 style="color:#F59E0B;margin-bottom:8px;">GenesisPro</h2>
            <p>Hola ${rows[0].nombre || ''},</p>
            <p>Recibimos una solicitud para restablecer tu contraseña.</p>
            <div style="background:#1E293B;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
              <p style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:8px;">Tu codigo de recuperacion:</p>
              <h1 style="color:#F59E0B;font-size:36px;letter-spacing:8px;margin:0;">${resetCode}</h1>
            </div>
            <p style="color:rgba(255,255,255,0.6);font-size:13px;">Este codigo expira en 30 minutos. Si no solicitaste este cambio, ignora este correo.</p>
          </div>
        `,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      throw new Error(resendData.message || 'Resend API error');
    }

    logger.info(`Password reset email sent via Resend to: ${email}, id: ${resendData.id}`);
  } catch (emailError) {
    logger.error('Failed to send reset email:', emailError);
    if (process.env.NODE_ENV !== 'production') {
      return res.json({
        ...successResponse,
        _dev: { resetCode, resetToken, message: 'Email fallo - codigo incluido para desarrollo' }
      });
    }
  }

  res.json(successResponse);
});

/**
 * Verify reset code
 * POST /api/v1/auth/verify-reset-code
 */
const verifyResetCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    throw Errors.badRequest('Email y código requeridos');
  }

  const { rows } = await db.query(
    `SELECT id, password_reset_token, password_reset_expires FROM usuarios
     WHERE email = $1 AND activo = true AND deleted_at IS NULL`,
    [email.toLowerCase()]
  );

  if (rows.length === 0 || !rows[0].password_reset_token) {
    throw Errors.badRequest('Código inválido o expirado');
  }

  const user = rows[0];

  // Check expiration
  if (new Date() > new Date(user.password_reset_expires)) {
    await db.query('UPDATE usuarios SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1', [user.id]);
    throw Errors.badRequest('El código ha expirado. Solicita uno nuevo.');
  }

  // Verify code (stored as "tokenHash:code")
  const storedCode = user.password_reset_token.split(':')[1];
  if (storedCode !== code.trim()) {
    throw Errors.badRequest('Código incorrecto');
  }

  // Generate a one-time reset token for the actual password change
  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Update token to the verified reset token (valid for 10 minutes)
  await db.query(
    `UPDATE usuarios SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3`,
    [tokenHash, new Date(Date.now() + 10 * 60 * 1000), user.id]
  );

  res.json({
    success: true,
    data: { reset_token: resetToken },
    message: 'Código verificado. Ahora puedes establecer tu nueva contraseña.'
  });
});

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password/:token
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    throw Errors.badRequest('La contraseña debe tener al menos 6 caracteres');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { rows } = await db.query(
    `SELECT id FROM usuarios
     WHERE password_reset_token = $1
       AND password_reset_expires > NOW()
       AND activo = true AND deleted_at IS NULL`,
    [tokenHash]
  );

  if (rows.length === 0) {
    throw Errors.badRequest('Token inválido o expirado');
  }

  const userId = rows[0].id;

  // Hash new password
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // Update password and clear reset token
  await db.query(
    `UPDATE usuarios SET password_hash = $1, password_reset_token = NULL,
     password_reset_expires = NULL, updated_at = NOW() WHERE id = $2`,
    [passwordHash, userId]
  );

  // Revoke all refresh tokens
  await db.query(
    `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW(), revoked_reason = 'password_reset'
     WHERE usuario_id = $1 AND revoked = false`,
    [userId]
  );

  logger.info(`Password reset completed for user: ${userId}`);

  res.json({
    success: true,
    message: 'Contraseña restablecida exitosamente. Inicia sesión con tu nueva contraseña.'
  });
});

/**
 * Verify email with 6-digit code
 * POST /api/v1/auth/verify-email
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    throw Errors.badRequest('Email y código requeridos');
  }

  if (code.length !== 6) {
    throw Errors.badRequest('Código de 6 dígitos requerido');
  }

  const { rows } = await db.query(
    `SELECT id, email_verification_token, email_verification_expires, email_verificado
     FROM usuarios WHERE email = $1 AND activo = true AND deleted_at IS NULL`,
    [email.toLowerCase()]
  );

  if (rows.length === 0) {
    throw Errors.badRequest('Código inválido o expirado');
  }

  const user = rows[0];

  if (user.email_verificado) {
    return res.json({ success: true, message: 'Email ya verificado' });
  }

  if (!user.email_verification_token || !user.email_verification_expires) {
    throw Errors.badRequest('No hay código de verificación pendiente. Solicita uno nuevo.');
  }

  if (new Date(user.email_verification_expires) < new Date()) {
    throw Errors.badRequest('Código expirado. Solicita uno nuevo.');
  }

  // Token stored as "hash:plainCode"
  const storedCode = user.email_verification_token.split(':')[1];
  if (!storedCode || storedCode !== code) {
    throw Errors.badRequest('Código incorrecto');
  }

  await db.query(
    `UPDATE usuarios SET email_verificado = true, email_verification_token = NULL,
     email_verification_expires = NULL, updated_at = NOW() WHERE id = $1`,
    [user.id]
  );

  logger.info(`Email verified for user: ${user.id}`);

  res.json({
    success: true,
    message: 'Email verificado exitosamente'
  });
});

/**
 * Resend verification code
 * POST /api/v1/auth/resend-verification
 */
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw Errors.badRequest('Email requerido');
  }

  const { rows } = await db.query(
    `SELECT id, nombre, email_verificado FROM usuarios
     WHERE email = $1 AND activo = true AND deleted_at IS NULL`,
    [email.toLowerCase()]
  );

  if (rows.length === 0) {
    // Don't reveal if email exists
    return res.json({ success: true, message: 'Si el email existe, se envió un nuevo código' });
  }

  const user = rows[0];

  if (user.email_verificado) {
    return res.json({ success: true, message: 'Email ya verificado' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    throw Errors.internal('Servicio de email no configurado');
  }

  const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
  const tokenHash = crypto.createHash('sha256').update(crypto.randomBytes(32).toString('hex')).digest('hex');

  await db.query(
    `UPDATE usuarios SET email_verification_token = $1, email_verification_expires = NOW() + INTERVAL '24 hours' WHERE id = $2`,
    [tokenHash + ':' + verifyCode, user.id]
  );

  const fromEmail = process.env.RESEND_FROM || 'GenesisPro <noreply@genesispro.vip>';
  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromEmail,
      to: [email.toLowerCase()],
      subject: 'GenesisPro - Nuevo código de verificación',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0F172A;color:#fff;border-radius:16px;">
          <h2 style="color:#F59E0B;margin-bottom:8px;">GenesisPro</h2>
          <p>Hola ${user.nombre || ''},</p>
          <p>Aquí tienes tu nuevo código de verificación:</p>
          <div style="background:#1E293B;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
            <p style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:8px;">Tu código de verificación:</p>
            <h1 style="color:#10B981;font-size:36px;letter-spacing:8px;margin:0;">${verifyCode}</h1>
          </div>
          <p style="color:rgba(255,255,255,0.5);font-size:12px;">Este código expira en 24 horas.</p>
        </div>`
    })
  }).catch(err => logger.error('Error sending verification email:', err));

  res.json({
    success: true,
    message: 'Si el email existe, se envió un nuevo código'
  });
});

/**
 * Delete account
 * DELETE /api/v1/auth/account
 */
const deleteAccount = asyncHandler(async (req, res) => {
  // Soft delete
  await db.query(
    `UPDATE usuarios
     SET deleted_at = NOW(), activo = false, email = email || '_deleted_' || id
     WHERE id = $1`,
    [req.userId]
  );

  // Revoke all tokens
  await db.query(
    `UPDATE refresh_tokens
     SET revoked = true, revoked_at = NOW(), revoked_reason = 'account_deleted'
     WHERE usuario_id = $1`,
    [req.userId]
  );

  logger.info(`Account deleted: ${req.userId}`);

  res.json({
    success: true,
    message: 'Cuenta eliminada'
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  verifyEmail,
  resendVerification,
  deleteAccount
};
