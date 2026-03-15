-- Migration: Gallera identity (name + logo) for users
-- Date: 2026-03-15

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre_gallera VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS logo_gallera_url VARCHAR(500);
