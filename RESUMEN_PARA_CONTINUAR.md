# GenesisPro - Resumen para Continuar (5 Feb 2026)

## Estado Actual

### Repositorio
- **URL:** https://github.com/genesisprovip/genesispro
- **Branch:** master
- **Último commit:** c173f7c

### Servidor (15.1.1.30)
- **Usuario:** genesispro
- **Password:** 1234
- **Servicios PM2:** genesispro-api, genesispro-expo, cloudflare-tunnel
- **API:** https://api.genesispro.vip/api/v1

### Base de Datos
- **Host:** localhost
- **DB:** genesispro_db
- **User:** genesispro_user
- **Pass:** GenesisProDB2025

---

## Lo que está FUNCIONANDO

1. **Backend API** - Completo y funcionando
2. **Base de datos** - Todas las tablas y columnas creadas
3. **Autenticación JWT** - Login/Registro funcionando
4. **CRUD de Aves** - Crear, leer, actualizar, eliminar
5. **Combates** - Registro y estadísticas
6. **Usuario demo:** demo@genesispro.vip / Demo12345

---

## Lo que está PENDIENTE

### Prioridad Alta
1. **UI de marcas de patas/nariz no aparece en la app**
   - El código está en `mobile-rork/app/ave/new.tsx` (líneas 379-540)
   - Los estilos están definidos (líneas 712-855)
   - Posible problema: bundler no recargó cambios
   - **Solución:** Reiniciar Expo/Rork con `--clear`

2. **Diseño visual de la app**
   - Stitch no dio buenos resultados
   - Esperar a Rork para diseño

### Prioridad Media
3. Sincronizar SaludContext con backend
4. Agregar fotos de aves
5. Genealogía visual (árbol familiar)

---

## Archivos Clave

```
genesispro/
├── mobile-rork/
│   ├── app/ave/new.tsx          # Formulario con sistema de marcas
│   ├── context/AvesContext.tsx  # Gestión de aves
│   ├── services/api.ts          # Cliente API
│   ├── PROJECT_STATUS.md        # Documentación completa
│   └── CHANGELOG.md             # Historial de cambios
├── backend/                      # (en servidor)
└── STITCH_DESIGN_PROMPT.md      # Prompt para diseño (no usar Stitch)
```

---

## Comandos Útiles

```bash
# Conectar al servidor
ssh genesispro@15.1.1.30

# Ver logs del backend
pm2 logs genesispro-api --lines 50

# Reiniciar servicios
pm2 restart all

# Base de datos
PGPASSWORD='GenesisProDB2025' psql -h localhost -U genesispro_user -d genesispro_db

# Iniciar app móvil (en mobile-rork/)
npm run start
# o
npx expo start --tunnel --clear
```

---

## Para Rork (5 Feb)

Compartir con Rork:
1. Repositorio: https://github.com/genesisprovip/genesispro
2. Documentación: `mobile-rork/PROJECT_STATUS.md`
3. Prompt de diseño: `STITCH_DESIGN_PROMPT.md` (como referencia)

**Objetivo:** Que Rork analice el código y mejore el diseño visual de la app.

---

*Última actualización: 22 Enero 2026*
