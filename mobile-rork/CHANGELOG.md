# Changelog - GenesisPro Mobile

Todos los cambios notables del proyecto serán documentados en este archivo.

---

## [1.0.0-beta] - 2026-01-22

### Agregado
- **Sistema de Identificación Personal de Aves**
  - Campo `codigo_personal`: Código personalizado por el criador
  - Campo `nombre`: Nombre o apodo del ave
  - Sistema de marcas de patas con selector visual (Lote 1-15)
  - Sistema de marca de nariz con selector visual

- **Selector Visual de Marcas de Patas** (`app/ave/new.tsx`)
  - Interface `MarcasPata` con 4 posiciones booleanas
  - Función `calcularNumeroLote()`: Calcula el número de lote (1-15)
  - Función `marcasDesdeNumero()`: Convierte número a marcas
  - UI interactiva con círculos tocables
  - Display central del número de lote

- **Selector Visual de Marca de Nariz**
  - 4 opciones: Ninguna, Izquierda, Derecha, Ambas
  - Representación visual de los orificios nasales
  - Indicador de marca activa

### Modificado
- **`services/api.ts`**
  - Agregado auto-init de tokens antes de cada request
  - Agregado logging para debug de autenticación

- **`context/SaludContext.tsx`**
  - Cambiado a usar solo almacenamiento local
  - Removidas llamadas a API (endpoints del backend son diferentes)

- **Backend: `avesController.js`**
  - Actualizado destructuring en `create()` para incluir nuevos campos
  - Actualizado INSERT con 18 valores
  - Actualizado `allowedFields` en `update()` con nuevos campos

### Base de Datos
- Agregadas columnas a tabla `aves`:
  ```sql
  ALTER TABLE aves ADD COLUMN codigo_personal VARCHAR(100);
  ALTER TABLE aves ADD COLUMN nombre VARCHAR(100);
  ALTER TABLE aves ADD COLUMN marca_pata_izquierda VARCHAR(255);
  ALTER TABLE aves ADD COLUMN marca_pata_derecha VARCHAR(255);
  ALTER TABLE aves ADD COLUMN marca_nariz VARCHAR(255);
  ALTER TABLE aves ADD COLUMN criadero_origen VARCHAR(255);
  ```

### Corregido
- Error "Token no proporcionado" al crear aves
- Formato de fecha mostrando timestamp completo ISO
- Campos `peso_actual` y `criadero_origen` no se guardaban

---

## [0.9.0] - 2026-01-20

### Agregado
- Implementación inicial de AuthContext
- Implementación de AvesContext con CRUD completo
- Implementación de CombatesContext
- Implementación de SaludContext
- Implementación de AlimentacionContext
- Implementación de EventosContext
- Sistema de tabs con Expo Router
- Formulario de nueva ave
- Lista de aves con filtros

### Configurado
- Conexión a API backend
- JWT con refresh tokens
- AsyncStorage para persistencia

---

## Estructura de Archivos Modificados

```
mobile-rork/
├── app/ave/new.tsx          # +200 líneas (sistema de marcas)
├── services/api.ts          # +15 líneas (auto-init tokens)
├── context/SaludContext.tsx # Modificado (solo local storage)
├── PROJECT_STATUS.md        # Nuevo (documentación)
└── CHANGELOG.md             # Nuevo (este archivo)

Backend (servidor):
└── src/controllers/avesController.js  # Actualizado (nuevos campos)
```

---

## Notas de Migración

Para actualizar una instalación existente:

1. **Base de datos:** Ejecutar las sentencias ALTER TABLE
2. **Backend:** Reiniciar con `pm2 restart genesispro-api`
3. **Mobile:** Limpiar caché y reiniciar bundler

```bash
# Limpiar caché de Expo
npx expo start --clear

# O con npm
npm start -- --clear
```
