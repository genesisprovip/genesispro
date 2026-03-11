-- Fix: Disable the trigger that conflicts with application code
-- The trigger awards 2 points per win, but peleas.js awards 1 point per win
-- Having both active causes double/triple counting of points

-- Drop the trigger (keep the function for reference)
DROP TRIGGER IF EXISTS trg_puntos_derby ON peleas;

-- Reset all puntos to correct values based on actual fight results
-- This recalculates from scratch using 1 point per win (match peleas.js logic)
UPDATE partidos_derby pd SET puntos = (
  SELECT COALESCE(SUM(
    CASE
      WHEN (pl.partido_derby_rojo_id = pd.id AND pl.resultado = 'rojo') THEN 1
      WHEN (pl.partido_derby_verde_id = pd.id AND pl.resultado = 'verde') THEN 1
      ELSE 0
    END
  ), 0)
  FROM peleas pl
  WHERE pl.estado = 'finalizada'
    AND (pl.partido_derby_rojo_id = pd.id OR pl.partido_derby_verde_id = pd.id)
);

-- Verify
SELECT pd.id, pd.nombre_partido, pd.numero_partido, pd.puntos, pd.evento_id
FROM partidos_derby pd
ORDER BY pd.evento_id, pd.puntos DESC;
