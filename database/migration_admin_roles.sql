-- Migration: Admin roles + password recovery
-- Date: 2026-03-08

-- 1. Add rol column to usuarios (default 'usuario')
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(20) DEFAULT 'usuario';

-- 2. Add password reset fields
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

-- 3. Add email verification fields
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;

-- 4. Index for fast role lookups
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_reset_token ON usuarios(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- 5. Set admin for the main admin account
-- UPDATE usuarios SET rol = 'admin' WHERE email = 'tu-email-admin@genesispro.vip';

-- 6. Set empresario for any existing empresario accounts
UPDATE usuarios SET rol = 'empresario' WHERE plan_empresario IS NOT NULL AND rol = 'usuario';
