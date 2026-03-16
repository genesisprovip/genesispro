# GenesisPro - Estado del Proyecto

**Fecha de actualización:** 2026-01-22
**Versión:** 1.0.0-beta

---

## Descripción General

GenesisPro es un sistema de gestión avícola especializado para criadores de gallos. Permite registrar, rastrear y gestionar aves, combates, salud, alimentación y eventos.

---

## Arquitectura del Sistema

### Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| **Mobile App** | React Native + Expo SDK 54 |
| **Navigation** | Expo Router |
| **Backend** | Node.js + Express |
| **Base de datos** | PostgreSQL |
| **Autenticación** | JWT (Access + Refresh tokens) |
| **Hosting API** | Servidor Ubuntu 15.1.1.30 |
| **Tunnel** | Cloudflare |
| **Process Manager** | PM2 |

### URLs de Producción

- **API:** `https://api.genesispro.vip/api/v1`
- **Servidor:** `15.1.1.30` (usuario: `genesispro`)

---

## Estado de Servicios (PM2)

| Servicio | Estado | Descripción |
|----------|--------|-------------|
| `genesispro-api` | ✅ Online | Backend API (puerto 3000) |
| `genesispro-expo` | ✅ Online | Expo/Metro bundler |
| `cloudflare-tunnel` | ✅ Online | Tunnel para API pública |

---

## Base de Datos

### Credenciales
- **Host:** localhost
- **Database:** `genesispro_db`
- **User:** `genesispro_user`
- **Password:** [REDACTED - see VPS .env]

### Tablas Principales

#### `users`
Usuarios del sistema con autenticación JWT.

#### `aves`
Registro de aves con campos:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `codigo_identidad` | VARCHAR | Código auto-generado (GP-YYYY-NNNN) |
| `codigo_personal` | VARCHAR | **NUEVO** - Código personalizado del criador |
| `nombre` | VARCHAR | **NUEVO** - Nombre/apodo del ave |
| `usuario_id` | UUID | Propietario |
| `sexo` | CHAR(1) | M/H |
| `fecha_nacimiento` | DATE | Fecha de nacimiento |
| `peso_nacimiento` | DECIMAL | Peso al nacer (kg) |
| `peso_actual` | DECIMAL | Peso actual (kg) |
| `padre_id` | UUID | Referencia al padre |
| `madre_id` | UUID | Referencia a la madre |
| `linea_genetica` | VARCHAR | Línea genética |
| `color` | VARCHAR | Color del plumaje |
| `estado` | VARCHAR | activo/vendido/muerto/retirado |
| `criadero_origen` | VARCHAR | Criadero de procedencia |
| `marca_pata_izquierda` | VARCHAR | **NUEVO** - Marca pata izquierda |
| `marca_pata_derecha` | VARCHAR | **NUEVO** - Marca pata derecha |
| `marca_nariz` | VARCHAR | **NUEVO** - Marca en nariz |
| `disponible_venta` | BOOLEAN | Disponible para venta |
| `precio_venta` | DECIMAL | Precio de venta |
| `notas` | TEXT | Observaciones |

#### `combates`
Registro de peleas con estadísticas.

#### `registros_salud`
Vacunas, tratamientos y registros médicos.

#### `registros_alimentacion`
Control de alimentación.

#### `eventos`
Calendario de eventos.

---

## Sistema de Marcas de Identificación

### Marcas de Patas (Sistema Binario Lote 1-15)

Basado en la "Tabla de Marcas para Criadores":

| Posición | Valor |
|----------|-------|
| Izquierda Afuera | 1 |
| Izquierda Dentro | 2 |
| Derecha Afuera | 4 |
| Derecha Dentro | 8 |

**Cálculo:** Suma de posiciones marcadas = Número de Lote (1-15)

**Ejemplo:** Marca en Izq Afuera (1) + Der Dentro (8) = Lote 9

### Marcas de Nariz

Muesca en la membrana nasal para identificación:
- `ninguna` - Sin marca
- `izquierda` - Muesca en orificio izquierdo
- `derecha` - Muesca en orificio derecho
- `ambas` - Muescas en ambos orificios

---

## Estructura de la App Móvil

```
mobile-rork/
├── app/                    # Pantallas (Expo Router)
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Home/Dashboard
│   │   ├── aves.tsx       # Lista de aves
│   │   ├── combates.tsx   # Combates
│   │   ├── salud.tsx      # Salud
│   │   └── mas.tsx        # Más opciones
│   ├── ave/
│   │   ├── [id].tsx       # Detalle de ave
│   │   └── new.tsx        # Formulario nueva ave
│   ├── auth/
│   │   ├── login.tsx      # Login
│   │   └── register.tsx   # Registro
│   └── _layout.tsx        # Layout principal
├── context/               # Contextos React
│   ├── AuthContext.tsx    # Autenticación
│   ├── AvesContext.tsx    # Gestión de aves
│   ├── CombatesContext.tsx
│   ├── SaludContext.tsx
│   ├── AlimentacionContext.tsx
│   └── EventosContext.tsx
├── services/
│   └── api.ts             # Cliente API con JWT
├── types/
│   └── index.ts           # TypeScript types
└── constants/
    ├── colors.ts          # Paleta de colores
    └── theme.ts           # Espaciado y estilos
```

---

## Funcionalidades Implementadas

### Autenticación
- [x] Login con email/password
- [x] Registro de usuarios
- [x] JWT con refresh tokens
- [x] Logout
- [x] Persistencia de sesión (AsyncStorage)

### Gestión de Aves
- [x] Listar aves del usuario
- [x] Crear nueva ave
- [x] Editar ave existente
- [x] Eliminar ave
- [x] Código de identidad auto-generado
- [x] Código personal personalizable
- [x] Sistema de marcas de patas (UI visual)
- [x] Sistema de marca de nariz (UI visual)
- [x] Campos de peso (nacimiento/actual)
- [x] Criadero de origen

### Combates
- [x] Listar combates
- [x] Registrar combate
- [x] Estadísticas por ave
- [x] Ranking de peleadores

### Salud
- [x] Registros de salud (local storage)
- [ ] Sincronización con backend (endpoints diferentes)

### Alimentación
- [x] Registros de alimentación
- [x] Almacenamiento local

### Eventos
- [x] Calendario de eventos
- [x] Almacenamiento local

---

## Cambios Recientes (2026-01-21)

### Backend
1. Agregadas columnas a tabla `aves`:
   - `codigo_personal`
   - `nombre`
   - `marca_pata_izquierda`
   - `marca_pata_derecha`
   - `marca_nariz`
   - `criadero_origen`

2. Actualizado `avesController.js`:
   - CREATE: Acepta nuevos campos
   - UPDATE: Incluye nuevos campos en allowedFields

### Mobile App
1. Actualizado `app/ave/new.tsx`:
   - Nueva sección "Identificación Personal"
   - Selector visual de marcas de patas (4 posiciones)
   - Selector visual de marca de nariz (4 opciones)
   - Campos para código personal y nombre

2. Corregido `services/api.ts`:
   - Auto-init de tokens antes de requests
   - Logging para debug

3. Corregido `context/SaludContext.tsx`:
   - Usa solo almacenamiento local (backend tiene endpoints diferentes)

---

## Pendientes / TODO

### Alta Prioridad
- [ ] Verificar que la sección "Identificación Personal" renderice en la app
- [ ] Probar creación de ave con marcas
- [ ] Sincronizar SaludContext con endpoints correctos del backend

### Media Prioridad
- [ ] Agregar fotos de aves
- [ ] Implementar genealogía visual (árbol familiar)
- [ ] Dashboard con estadísticas

### Baja Prioridad
- [ ] Notificaciones push
- [ ] Exportar datos a PDF/Excel
- [ ] Modo offline completo

---

## Cómo Ejecutar

### Backend (Servidor)
```bash
ssh genesispro@15.1.1.30
cd ~/genesispro-backend
pm2 restart genesispro-api
```

### Mobile App (Desarrollo)
```bash
cd mobile-rork
npm run start
# o
npx expo start --tunnel
```

### Base de Datos
```bash
docker exec -it genesispro-db psql -U genesispro_user -d genesispro_db
```

---

## Contacto

- **Repositorio:** GitHub (privado)
- **API Docs:** Swagger en `/api/v1/docs` (si está habilitado)

---

*Documento generado automáticamente - GenesisPro v1.0.0-beta*
