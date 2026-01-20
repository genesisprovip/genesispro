# GenesisPro - Documentación Técnica Completa

## Product Requirements Document & Technical Specification v1.0

**Proyecto:** GenesisPro - Sistema Integral de Gestión Genealógica y Estadística Avícola  
**Desarrollador:** Root (AURALINK)  
**Stack:** PostgreSQL + Node.js + Express + React Native  
**Fecha:** Enero 2025  
**Versión:** 1.0.0

---

## TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Objetivos del Proyecto](#2-objetivos-del-proyecto)
3. [Alcance y Funcionalidades](#3-alcance-y-funcionalidades)
4. [Arquitectura del Sistema](#4-arquitectura-del-sistema)
5. [Stack Tecnológico](#5-stack-tecnológico)
6. [Base de Datos - Schema Completo](#6-base-de-datos---schema-completo)
7. [API REST - Endpoints Completos](#7-api-rest---endpoints-completos)
8. [Sistema de Autenticación y Autorización](#8-sistema-de-autenticación-y-autorización)
9. [Sistema de Suscripciones y Planes](#9-sistema-de-suscripciones-y-planes)
10. [Funcionalidades Detalladas](#10-funcionalidades-detalladas)
11. [Estructura de Proyecto](#11-estructura-de-proyecto)
12. [Plan de Desarrollo por Fases](#12-plan-de-desarrollo-por-fases)
13. [Configuración e Instalación](#13-configuración-e-instalación)
14. [Seguridad y Performance](#14-seguridad-y-performance)
15. [Testing y QA](#15-testing-y-qa)
16. [Deployment y DevOps](#16-deployment-y-devops)
17. [Métricas de Éxito](#17-métricas-de-éxito)

---

## 1. RESUMEN EJECUTIVO

### 1.1 Descripción del Proyecto

GenesisPro es una aplicación móvil multiplataforma (iOS/Android) diseñada para criadores profesionales de aves de combate. La plataforma permite gestión genealógica completa, análisis estadístico de rendimiento, gestión de salud, finanzas, y toma de decisiones basada en datos.

### 1.2 Propuesta de Valor

- **Centralización:** Toda la información en un solo lugar
- **Profesionalización:** Herramientas de nivel empresarial para criadores
- **Monetización:** Modelo SaaS con 3 tiers (Básico, Pro, Premium)
- **Escalabilidad:** Arquitectura cloud-ready desde día 1
- **Diferenciación:** IA, analytics avanzados, marketplace integrado

### 1.3 Usuarios Objetivo

- **Primario:** Criadores profesionales con 20-200 aves
- **Secundario:** Criadores aficionados con 5-20 aves
- **Terciario:** Granjas grandes con operaciones multi-usuario

### 1.4 Modelo de Negocio

**SaaS con suscripciones recurrentes:**
- Básico: Gratis (freemium)
- Pro: $199 MXN/mes - $1,990 MXN/año
- Premium: $399 MXN/mes - $3,990 MXN/año

**Ingresos adicionales futuros:**
- Comisión en marketplace (10-15%)
- Servicios premium (consultorías, análisis personalizados)
- Publicidad segmentada (proveedores de alimento, veterinarios)

---

## 2. OBJETIVOS DEL PROYECTO

### 2.1 Objetivos de Negocio

1. Alcanzar 500 usuarios registrados en 6 meses
2. 100 suscriptores de pago en el primer año
3. ARR de $240,000 MXN al año 1
4. Tasa de conversión free→paid: 15%
5. Churn rate < 10% mensual

### 2.2 Objetivos Técnicos

1. App móvil nativa con 99.9% uptime
2. Tiempo de carga < 2 segundos
3. Soporte offline completo
4. Escalabilidad para 10,000 usuarios concurrentes
5. Backups automáticos diarios
6. API REST documentada con Swagger

### 2.3 Objetivos de Usuario

1. Reducir 80% el tiempo de gestión manual
2. Mejorar toma de decisiones con datos
3. Incrementar ROI del criador en 20%
4. Facilitar ventas con documentación profesional
5. Conectar comunidad de criadores

---

## 3. ALCANCE Y FUNCIONALIDADES

### 3.1 Módulos Principales

```
1.  Autenticación y Usuarios
2.  Gestión de Aves (CRUD + Genealogía)
3.  Gestión de Combates
4.  Sistema de Salud y Veterinaria
5.  Gestión Financiera
6.  Alimentación y Nutrición
7.  Calendario y Recordatorios
8.  Analytics y Reportes
9.  Códigos QR
10. Certificados y Documentos
11. Marketplace
12. Red Social / Comunidad
13. Sistema de Suscripciones
14. Backup y Exportación
15. Multi-usuario (Premium)
16. Predicciones con IA (Premium)
17. API Pública (Premium)
```

### 3.2 Comparativa de Planes

| Feature | Básico | Pro | Premium |
|---------|--------|-----|---------|
| **Precio** | Gratis | $199/mes - $1,990/año | $399/mes - $3,990/año |
| **Aves máximo** | 10 | 100 | ∞ |
| **Fotos por ave** | 2 | ∞ | ∞ |
| **Combates históricos** | 20 | ∞ | ∞ |
| **Genealogía** | 2 gen | 3 gen | ∞ |
| **Analytics** | Básico | Avanzado | Avanzado + IA |
| **Exportación** | ❌ | ✅ | ✅ |
| **Salud/Veterinaria** | ❌ | ✅ | ✅ |
| **Finanzas** | ❌ | ✅ | ✅ |
| **Marketplace** | Solo compra | Compra/Venta | Compra/Venta sin comisión |
| **Multi-usuario** | ❌ | ❌ | ✅ (3 usuarios) |
| **API Access** | ❌ | ❌ | ✅ |
| **Soporte** | Email | Email | Prioritario |
| **Marca de agua** | ✅ | ❌ | ❌ |

### 3.3 Funcionalidades Detalladas por Módulo

#### **MÓDULO 1: Autenticación y Usuarios**

**Funcionalidades:**
- ✅ Registro con email/password
- ✅ Login con JWT
- ✅ Recuperación de contraseña
- ✅ Verificación de email
- ✅ Perfil de usuario editable
- ✅ Foto de perfil
- ✅ Configuraciones de cuenta
- ✅ Preferencias de notificaciones
- ✅ Gestión de suscripción
- ✅ Historial de pagos
- ✅ Multi-sesión (logout desde todos los dispositivos)

**Endpoints:**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh-token
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/verify-email/:token
GET    /api/users/profile
PUT    /api/users/profile
PUT    /api/users/profile/photo
GET    /api/users/settings
PUT    /api/users/settings
```

---

#### **MÓDULO 2: Gestión de Aves**

**Funcionalidades:**
- ✅ Crear ave con código único auto-generado (GP-YYYY-####)
- ✅ Editar información del ave
- ✅ Eliminar ave (soft delete)
- ✅ Asignar genealogía (padre, madre)
- ✅ Árbol genealógico visual hasta N generaciones
- ✅ Vista de descendencia completa
- ✅ Upload múltiple de fotos
- ✅ Galería de fotos por ave
- ✅ Foto principal destacada
- ✅ Timeline de mediciones (peso, altura, espolón)
- ✅ Búsqueda avanzada por múltiples criterios
- ✅ Filtros (sexo, edad, línea, color, estado)
- ✅ Generación de código QR único
- ✅ Escaneo de QR para ver ficha
- ✅ Marcar como "en venta" o "disponible para cruces"
- ✅ Notas y observaciones
- ✅ Historial de cambios

**Campos del Ave:**
```
- Código identidad (único)
- Usuario propietario
- Sexo (M/H)
- Fecha de nacimiento
- Peso al nacer
- Peso a los 3 meses
- Padre (referencia a otra ave)
- Madre (referencia a otra ave)
- Línea genética
- Color
- Estado (activo, vendido, fallecido)
- Precio de compra
- Precio de venta
- Disponibilidad (venta, cruces)
- Notas
- Timestamps (creación, actualización)
```

**Endpoints:**
```
GET    /api/aves
GET    /api/aves/:id
POST   /api/aves
PUT    /api/aves/:id
DELETE /api/aves/:id
GET    /api/aves/:id/genealogia?depth=3
GET    /api/aves/:id/descendencia
POST   /api/aves/:id/fotos
GET    /api/aves/:id/fotos
DELETE /api/aves/fotos/:fotoId
PUT    /api/aves/fotos/:fotoId/principal
GET    /api/aves/:id/qr
GET    /api/aves/scan/:codigo
GET    /api/aves/search?q=...&sexo=...&edad=...
```

---

#### **MÓDULO 3: Gestión de Combates**

**Funcionalidades:**
- ✅ Registrar combate (solo machos)
- ✅ Editar combate
- ✅ Eliminar combate
- ✅ Historial completo por macho
- ✅ Estadísticas automáticas (%, promedio duración)
- ✅ Filtros por fecha, ubicación, resultado
- ✅ Notas post-combate
- ✅ Registro de lesiones durante combate
- ✅ Peso del ave en combate
- ✅ Información del oponente
- ✅ Adjuntar fotos/videos del combate
- ✅ Ranking de mejores peleadores
- ✅ Comparativa entre machos

**Campos del Combate:**
```
- Macho (referencia)
- Fecha del combate
- Ubicación
- Resultado (victoria, empate, derrota)
- Duración (minutos)
- Peso del ave en combate
- Código/nombre del oponente
- Información del oponente
- Tipo de combate (entrenamiento, oficial)
- Lesiones sufridas
- Notas
- Fotos/videos
- Timestamps
```

**Endpoints:**
```
GET    /api/combates
GET    /api/combates/:id
POST   /api/combates
PUT    /api/combates/:id
DELETE /api/combates/:id
GET    /api/aves/:id/combates
GET    /api/aves/:id/estadisticas-combate
GET    /api/combates/ranking?limit=10
POST   /api/combates/:id/medios (fotos/videos)
```

---

#### **MÓDULO 4: Sistema de Salud y Veterinaria**

**Funcionalidades:**
- ✅ Historial médico completo por ave
- ✅ Registro de vacunas (tipo, fecha, próxima dosis)
- ✅ Calendario de vacunación
- ✅ Registro de desparasitaciones
- ✅ Registro de tratamientos médicos
- ✅ Medicamentos administrados
- ✅ Registro de lesiones/enfermedades
- ✅ Notas del veterinario
- ✅ Adjuntar recetas/documentos
- ✅ Alertas de próximas vacunas
- ✅ Alertas de tratamientos pendientes
- ✅ Estadísticas de salud del lote
- ✅ Costo de tratamientos

**Tablas:**
```sql
- vacunas
- desparasitaciones  
- tratamientos
- medicamentos
- lesiones
- consultas_veterinarias
```

**Endpoints:**
```
GET    /api/aves/:id/salud
POST   /api/aves/:id/vacunas
GET    /api/aves/:id/vacunas
PUT    /api/vacunas/:id
DELETE /api/vacunas/:id
POST   /api/aves/:id/tratamientos
GET    /api/aves/:id/tratamientos
POST   /api/aves/:id/lesiones
GET    /api/aves/:id/lesiones
GET    /api/salud/calendario
GET    /api/salud/alertas
```

---

#### **MÓDULO 5: Gestión Financiera**

**Funcionalidades:**
- ✅ Registro de costos por ave
  - Costo de compra/adquisición
  - Alimentación mensual
  - Veterinaria
  - Entrenamiento
  - Transporte
  - Otros gastos
- ✅ Registro de ingresos
  - Ganancias por combates
  - Venta de aves
  - Venta de pollos
  - Servicio de semental
- ✅ ROI por ave individual
- ✅ ROI por línea genealógica
- ✅ Dashboard financiero
- ✅ Reportes mensuales/anuales
- ✅ Gráficas de ingresos vs gastos
- ✅ Proyecciones financieras
- ✅ Punto de equilibrio por ave
- ✅ Exportación a Excel

**Endpoints:**
```
GET    /api/finanzas/dashboard
GET    /api/finanzas/transacciones
POST   /api/finanzas/transacciones
PUT    /api/finanzas/transacciones/:id
DELETE /api/finanzas/transacciones/:id
GET    /api/aves/:id/roi
GET    /api/finanzas/reportes/mensual?mes=1&año=2025
GET    /api/finanzas/reportes/anual?año=2025
GET    /api/finanzas/lineas/:lineaId/roi
GET    /api/finanzas/export/excel
```

---

#### **MÓDULO 6: Alimentación y Nutrición**

**Funcionalidades:**
- ✅ Registro de tipo de alimentación por ave
- ✅ Cambios de dieta con fechas
- ✅ Suplementos vitamínicos
- ✅ Consumo estimado de alimento
- ✅ Costo de alimentación por ave/mes
- ✅ Relación alimentación → rendimiento
- ✅ Planes de nutrición por etapa
  - Pollito (0-3 meses)
  - Crecimiento (3-9 meses)
  - Adulto (9+ meses)
  - Pre-combate
- ✅ Inventario de alimentos
- ✅ Alertas de stock bajo

**Endpoints:**
```
GET    /api/aves/:id/alimentacion
POST   /api/aves/:id/alimentacion
PUT    /api/alimentacion/:id
GET    /api/alimentacion/planes
POST   /api/alimentacion/inventario
GET    /api/alimentacion/inventario
GET    /api/alimentacion/alertas
```

---

#### **MÓDULO 7: Calendario y Recordatorios**

**Funcionalidades:**
- ✅ Vista de calendario mensual/semanal
- ✅ Eventos programables:
  - Combates
  - Vacunaciones
  - Desparasitaciones
  - Cruces planificados
  - Mediciones periódicas
  - Cambios de alimentación
  - Consultas veterinarias
- ✅ Notificaciones push
- ✅ Recordatorios personalizables (días antes)
- ✅ Sincronización con Google Calendar (opcional)
- ✅ Eventos recurrentes
- ✅ Vista de agenda (próximos 7 días)

**Endpoints:**
```
GET    /api/calendario?mes=1&año=2025
GET    /api/calendario/eventos
POST   /api/calendario/eventos
PUT    /api/calendario/eventos/:id
DELETE /api/calendario/eventos/:id
GET    /api/calendario/proximos?dias=7
PUT    /api/recordatorios/configuracion
```

---

#### **MÓDULO 8: Analytics y Reportes**

**Funcionalidades:**
- ✅ Dashboard principal con KPIs
  - Total aves (activas, vendidas, fallecidas)
  - Total combates (victorias, empates, derrotas)
  - % General de victorias
  - ROI global
  - Ingresos vs gastos del mes
  - Aves próximas a combatir
  - Alertas pendientes
- ✅ Gráficas de rendimiento:
  - % Victorias por línea genealógica
  - Rendimiento por edad
  - Descendencia por hembra
  - Evolución de peso
  - Tendencias de combates
- ✅ Análisis de cruces:
  - Mejores combinaciones padre-madre
  - Heatmap de combinaciones
  - Predicción de éxito de cruce
- ✅ Comparativas:
  - Comparar 2-3 aves lado a lado
  - Rankings personalizados
- ✅ Reportes exportables:
  - PDF con árbol genealógico
  - Excel con datos completos
  - Certificados de autenticidad
  - Ficha técnica para venta
- ✅ Analytics avanzados (Premium):
  - Predicciones con IA
  - Patrones ocultos
  - Recomendaciones automáticas

**Endpoints:**
```
GET    /api/analytics/dashboard
GET    /api/analytics/rendimiento
GET    /api/analytics/cruces
GET    /api/analytics/comparativa?aves=1,2,3
GET    /api/analytics/rankings?tipo=victorias&limit=10
GET    /api/analytics/predicciones (Premium)
GET    /api/reportes/ave/:id/pedigree.pdf
GET    /api/reportes/ave/:id/ficha-venta.pdf
GET    /api/reportes/exportar/excel
```

---

#### **MÓDULO 9: Códigos QR**

**Funcionalidades:**
- ✅ Generación automática de QR por ave
- ✅ QR contiene: código único del ave
- ✅ Escanear QR abre ficha del ave
- ✅ QR descargable (imagen)
- ✅ QR imprimible en etiquetas
- ✅ Escaneo desde la app
- ✅ Compartir QR por WhatsApp/Email

**Implementación:**
```javascript
// Librería: qrcode (Node.js)
// Formato QR: GP-2025-0001
// Al escanear: Redirect a /aves/scan/GP-2025-0001
```

**Endpoints:**
```
GET    /api/aves/:id/qr (genera y retorna imagen)
GET    /api/aves/scan/:codigo (obtiene info del ave)
POST   /api/aves/:id/qr/compartir
```

---

#### **MÓDULO 10: Certificados y Documentos**

**Funcionalidades:**
- ✅ Generar pedigree profesional (PDF)
- ✅ Certificado de autenticidad
- ✅ Historial de combates certificado
- ✅ Ficha técnica para venta
- ✅ Documentos personalizables con logo
- ✅ Plantillas profesionales
- ✅ Firma digital (opcional)
- ✅ Compartir documentos
- ✅ Historial de documentos generados

**Librería:** PDFKit (Node.js)

**Endpoints:**
```
GET    /api/documentos/pedigree/:aveId
GET    /api/documentos/certificado/:aveId
GET    /api/documentos/ficha-venta/:aveId
GET    /api/documentos/combates/:aveId
POST   /api/documentos/personalizar
GET    /api/documentos/historial
```

---

#### **MÓDULO 11: Marketplace**

**Funcionalidades (Fase 4):**
- ✅ Publicar aves en venta
- ✅ Publicar servicio de semental
- ✅ Buscar aves disponibles
- ✅ Filtros avanzados (precio, línea, ubicación)
- ✅ Galería de fotos
- ✅ Información del vendedor
- ✅ Sistema de reviews/reputación
- ✅ Chat directo comprador-vendedor
- ✅ Favoritos
- ✅ Notificaciones de nuevas publicaciones
- ✅ Comisión del 10% (GenesisPro)
- ✅ Sistema de pagos integrado (Stripe)
- ✅ Protección del comprador

**Endpoints:**
```
GET    /api/marketplace/publicaciones
POST   /api/marketplace/publicaciones
PUT    /api/marketplace/publicaciones/:id
DELETE /api/marketplace/publicaciones/:id
GET    /api/marketplace/search
POST   /api/marketplace/favoritos/:pubId
GET    /api/marketplace/favoritos
POST   /api/marketplace/reviews
GET    /api/marketplace/mensajes
POST   /api/marketplace/mensajes
```

---

#### **MÓDULO 12: Red Social / Comunidad**

**Funcionalidades (Fase 4):**
- ✅ Perfil público del criador
- ✅ Galería pública de aves destacadas
- ✅ Feed de actividad
- ✅ Publicaciones (logros, noticias)
- ✅ Seguir a otros criadores
- ✅ Comentarios y likes
- ✅ Compartir logros
- ✅ Rankings públicos
- ✅ Eventos comunitarios
- ✅ Foros de discusión

**Endpoints:**
```
GET    /api/social/perfil/:userId
GET    /api/social/feed
POST   /api/social/publicaciones
GET    /api/social/publicaciones/:id
POST   /api/social/publicaciones/:id/like
POST   /api/social/publicaciones/:id/comentar
POST   /api/social/seguir/:userId
GET    /api/social/rankings
```

---

## 4. ARQUITECTURA DEL SISTEMA

### 4.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  React Native (iOS + Android) + Expo                │
│  - Redux/Context API (state management)             │
│  - React Query (cache + sync)                       │
│  - AsyncStorage (offline data)                      │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS/REST API
                   │ JSON Web Token (JWT)
                   ▼
┌─────────────────────────────────────────────────────┐
│               REVERSE PROXY                          │
│  Nginx                                               │
│  - SSL/TLS (Let's Encrypt)                          │
│  - Load Balancing                                   │
│  - Rate Limiting                                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                  BACKEND API                         │
│  Node.js + Express                                   │
│  - Controllers (business logic)                      │
│  - Middleware (auth, validation, limits)            │
│  - Services (external APIs)                         │
│  - Utils (helpers)                                  │
└─────┬─────────────────────────────────┬─────────────┘
      │                                 │
      ▼                                 ▼
┌──────────────┐              ┌──────────────────┐
│  PostgreSQL  │              │  File Storage    │
│  - Relacional│              │  - Local FS      │
│  - Indexado  │              │  - Future: S3    │
│  - Backups   │              │  - Imágenes/PDFs │
└──────────────┘              └──────────────────┘
      │
      ▼
┌──────────────┐
│ Redis Cache  │ (Opcional - Fase 3)
│ - Sesiones   │
│ - Cache API  │
└──────────────┘

SERVICIOS EXTERNOS:
- Stripe / MercadoPago (Pagos)
- SendGrid / AWS SES (Emails)
- Firebase Cloud Messaging (Push notifications)
- Google Drive API (Backups remotos)
```

### 4.2 Flujo de Datos

**Creación de Ave:**
```
1. Usuario llena formulario (Frontend)
2. Frontend valida datos básicos
3. POST /api/aves con JWT en header
4. Middleware verifica JWT → obtiene userId
5. Middleware verifica límites del plan
6. Controller valida datos completos
7. Service genera código único (GP-2025-####)
8. Insert en PostgreSQL
9. Service genera QR code
10. Retorna ave creada + QR
11. Frontend actualiza cache local
12. Frontend muestra confirmación
```

**Modo Offline:**
```
1. Usuario sin conexión crea ave
2. Datos guardados en AsyncStorage
3. Cola de sincronización agregada
4. Indicador visual "Pendiente de sync"
5. Al reconectar: envío automático
6. Retry con backoff exponencial
7. Actualización de UI al confirmar
```

---

## 5. STACK TECNOLÓGICO

### 5.1 Backend

```yaml
Runtime: Node.js 18+ LTS
Framework: Express 4.18+
Database: PostgreSQL 15+
ORM: pg (native driver) - Sin ORM pesado
Authentication: jsonwebtoken (JWT)
Password Hashing: bcryptjs
Validation: express-validator
File Upload: multer
Security: helmet, cors
Logging: morgan, winston
Process Manager: PM2
Testing: Jest, Supertest
Documentation: Swagger (swagger-jsdoc + swagger-ui-express)
```

**package.json (Backend):**
```json
{
  "name": "genesispro-backend",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-validator": "^7.0.1",
    "morgan": "^1.10.0",
    "winston": "^3.11.0",
    "qrcode": "^1.5.3",
    "pdfkit": "^0.14.0",
    "stripe": "^14.8.0",
    "node-cron": "^3.0.3",
    "nodemailer": "^6.9.7",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

### 5.2 Frontend

```yaml
Framework: React Native 0.73+
Platform: Expo SDK 50+
Navigation: React Navigation 6+
State Management: React Context API + Redux Toolkit (opcional)
HTTP Client: Axios
Data Fetching: @tanstack/react-query
Forms: react-hook-form
UI Library: React Native Paper / NativeBase
Charts: Victory Native / Recharts Native
Offline: @react-native-async-storage/async-storage
Camera/Photos: expo-image-picker
QR Scanner: expo-barcode-scanner
QR Generator: react-native-qrcode-svg
Notifications: expo-notifications
Calendar: react-native-calendars
Maps: react-native-maps (si se usa ubicación)
Testing: Jest, React Native Testing Library
```

**package.json (Frontend):**
```json
{
  "name": "genesispro-mobile",
  "version": "1.0.0",
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.0",
    "expo": "~50.0.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "axios": "^1.6.2",
    "@tanstack/react-query": "^5.14.2",
    "react-hook-form": "^7.49.2",
    "react-native-paper": "^5.11.3",
    "victory-native": "^37.0.2",
    "expo-image-picker": "~14.7.1",
    "expo-barcode-scanner": "~12.9.0",
    "react-native-qrcode-svg": "^6.3.0",
    "expo-notifications": "~0.27.0",
    "react-native-calendars": "^1.1302.0",
    "@react-native-async-storage/async-storage": "1.21.0",
    "expo-file-system": "~16.0.3",
    "react-native-chart-kit": "^6.12.0"
  },
  "devDependencies": {
    "@testing-library/react-native": "^12.4.1",
    "jest": "^29.7.0"
  }
}
```

### 5.3 Base de Datos

**PostgreSQL 15+ con extensiones:**
```sql
-- Extensiones recomendadas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUIDs
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Búsqueda fuzzy
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- Índices optimizados
```

### 5.4 DevOps & Hosting

```yaml
Version Control: Git + GitHub
CI/CD: GitHub Actions
Servidor Inicial: VPS (DigitalOcean/Linode)
  - 2 vCPU
  - 4GB RAM
  - 80GB SSD
  - Ubuntu 22.04 LTS
Reverse Proxy: Nginx
SSL: Let's Encrypt (certbot)
Process Manager: PM2
Monitoring: PM2 Plus / Grafana (futuro)
Backups: Cron jobs + rsync
Future Cloud: AWS (RDS + S3 + Lambda)
```

---

## 6. BASE DE DATOS - SCHEMA COMPLETO

```sql
-- ============================================
-- GENESISPRO - SCHEMA COMPLETO v1.0
-- PostgreSQL 15+
-- ============================================

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100),
    telefono VARCHAR(20),
    ubicacion VARCHAR(100),
    foto_perfil VARCHAR(255),
    email_verificado BOOLEAN DEFAULT false,
    plan_actual VARCHAR(20) DEFAULT 'basico' CHECK (plan_actual IN ('basico', 'pro', 'premium')),
    suscripcion_activa_id INTEGER,
    push_token VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT NOW(),
    ultimo_acceso TIMESTAMP,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_plan ON usuarios(plan_actual);

-- ============================================
-- TABLA: planes
-- ============================================
CREATE TABLE planes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(20) UNIQUE NOT NULL,
    precio_mensual DECIMAL(8,2) NOT NULL,
    precio_anual DECIMAL(8,2) NOT NULL,
    max_aves INTEGER,
    max_fotos_por_ave INTEGER,
    max_combates INTEGER,
    profundidad_genealogia INTEGER,
    analytics_avanzado BOOLEAN DEFAULT false,
    multi_usuario BOOLEAN DEFAULT false,
    exportacion BOOLEAN DEFAULT false,
    api_access BOOLEAN DEFAULT false,
    marketplace_sin_comision BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar planes
INSERT INTO planes (nombre, precio_mensual, precio_anual, max_aves, max_fotos_por_ave, max_combates, profundidad_genealogia, analytics_avanzado, multi_usuario, exportacion, api_access, marketplace_sin_comision) VALUES
('basico', 0.00, 0.00, 10, 2, 20, 2, false, false, false, false, false),
('pro', 199.00, 1990.00, 100, NULL, NULL, 3, false, false, true, false, false),
('premium', 399.00, 3990.00, NULL, NULL, NULL, NULL, true, true, true, true, true);

-- ============================================
-- TABLA: suscripciones
-- ============================================
CREATE TABLE suscripciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES planes(id),
    tipo_pago VARCHAR(10) CHECK (tipo_pago IN ('mensual', 'anual')),
    fecha_inicio DATE NOT NULL,
    fecha_expiracion DATE NOT NULL,
    estado VARCHAR(20) CHECK (estado IN ('activa', 'cancelada', 'expirada', 'pendiente')) DEFAULT 'activa',
    metodo_pago VARCHAR(50),
    transaccion_id VARCHAR(100),
    auto_renovacion BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suscripciones_usuario ON suscripciones(usuario_id);
CREATE INDEX idx_suscripciones_estado ON suscripciones(estado);
CREATE INDEX idx_suscripciones_expiracion ON suscripciones(fecha_expiracion);

-- ============================================
-- TABLA: pagos
-- ============================================
CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    suscripcion_id INTEGER REFERENCES suscripciones(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    monto DECIMAL(8,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'MXN',
    metodo_pago VARCHAR(50),
    transaccion_id VARCHAR(100) UNIQUE,
    estado VARCHAR(20) CHECK (estado IN ('pendiente', 'completado', 'fallido', 'reembolsado')) DEFAULT 'pendiente',
    fecha_pago TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_pagos_usuario ON pagos(usuario_id);
CREATE INDEX idx_pagos_estado ON pagos(estado);

-- ============================================
-- TABLA: aves
-- ============================================
CREATE TABLE aves (
    id SERIAL PRIMARY KEY,
    codigo_identidad VARCHAR(20) UNIQUE NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    sexo CHAR(1) CHECK (sexo IN ('M', 'H')) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    peso_nacimiento DECIMAL(6,2),
    peso_3meses DECIMAL(6,2),
    padre_id INTEGER REFERENCES aves(id) ON DELETE SET NULL,
    madre_id INTEGER REFERENCES aves(id) ON DELETE SET NULL,
    linea_genetica VARCHAR(50),
    color VARCHAR(50),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'vendido', 'fallecido', 'prestamo')),
    precio_compra DECIMAL(10,2),
    precio_venta DECIMAL(10,2),
    disponible_venta BOOLEAN DEFAULT false,
    disponible_cruces BOOLEAN DEFAULT false,
    notas TEXT,
    qr_code VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_aves_usuario ON aves(usuario_id);
CREATE INDEX idx_aves_codigo ON aves(codigo_identidad);
CREATE INDEX idx_aves_padre ON aves(padre_id);
CREATE INDEX idx_aves_madre ON aves(madre_id);
CREATE INDEX idx_aves_sexo ON aves(sexo);
CREATE INDEX idx_aves_estado ON aves(estado);
CREATE INDEX idx_aves_disponible_venta ON aves(disponible_venta);

-- ============================================
-- TABLA: fotos
-- ============================================
CREATE TABLE fotos (
    id SERIAL PRIMARY KEY,
    ave_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    ruta_archivo VARCHAR(255) NOT NULL,
    nombre_original VARCHAR(255),
    descripcion TEXT,
    es_principal BOOLEAN DEFAULT false,
    fecha_subida TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fotos_ave ON fotos(ave_id);
CREATE INDEX idx_fotos_principal ON fotos(ave_id, es_principal);

-- ============================================
-- TABLA: mediciones
-- ============================================
CREATE TABLE mediciones (
    id SERIAL PRIMARY KEY,
    ave_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    fecha_medicion DATE NOT NULL,
    peso DECIMAL(6,2),
    altura_cm DECIMAL(5,2),
    longitud_espolon_cm DECIMAL(4,2),
    circunferencia_pata_cm DECIMAL(4,2),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mediciones_ave ON mediciones(ave_id);
CREATE INDEX idx_mediciones_fecha ON mediciones(fecha_medicion);

-- ============================================
-- TABLA: combates
-- ============================================
CREATE TABLE combates (
    id SERIAL PRIMARY KEY,
    macho_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    fecha_combate DATE NOT NULL,
    ubicacion VARCHAR(150),
    resultado VARCHAR(10) CHECK (resultado IN ('victoria', 'empate', 'derrota')) NOT NULL,
    duracion_minutos INTEGER,
    peso_combate DECIMAL(6,2),
    oponente_codigo VARCHAR(20),
    oponente_info VARCHAR(100),
    tipo_combate VARCHAR(20) DEFAULT 'oficial' CHECK (tipo_combate IN ('oficial', 'entrenamiento', 'amistoso')),
    lesiones TEXT,
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_combates_macho ON combates(macho_id);
CREATE INDEX idx_combates_fecha ON combates(fecha_combate);
CREATE INDEX idx_combates_resultado ON combates(resultado);

-- ============================================
-- TABLA: combate_medios (fotos/videos)
-- ============================================
CREATE TABLE combate_medios (
    id SERIAL PRIMARY KEY,
    combate_id INTEGER REFERENCES combates(id) ON DELETE CASCADE,
    tipo VARCHAR(10) CHECK (tipo IN ('foto', 'video')),
    ruta_archivo VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_combate_medios_combate ON combate_medios(combate_id);

-- ============================================
-- TABLA: cruces
-- ============================================
CREATE TABLE cruces (
    id SERIAL PRIMARY KEY,
    madre_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    padre_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    fecha_cruce DATE NOT NULL,
    num_huevos INTEGER,
    num_nacidos INTEGER,
    num_machos INTEGER,
    num_hembras INTEGER,
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cruces_madre ON cruces(madre_id);
CREATE INDEX idx_cruces_padre ON cruces(padre_id);
CREATE INDEX idx_cruces_fecha ON cruces(fecha_cruce);

-- ============================================
-- MÓDULO: SALUD Y VETERINARIA
-- ============================================

-- Tabla: vacunas
CREATE TABLE vacunas (
    id SERIAL PRIMARY KEY,
    ave_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    tipo_vacuna VARCHAR(100) NOT NULL,
    fecha_aplicacion DATE NOT NULL,
    proxima_dosis DATE,
    veterinario VARCHAR(100),
    lote_vacuna VARCHAR(50),
    costo DECIMAL(8,2),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vacunas_ave ON vacunas(ave_id);
CREATE INDEX idx_vacunas_proxima ON vacunas(proxima_dosis);

-- Tabla: desparasitaciones
CREATE TABLE desparasitaciones (
    id SERIAL PRIMARY KEY,
    ave_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    producto VARCHAR(100) NOT NULL,
    fecha_aplicacion DATE NOT NULL,
    proxima_aplicacion DATE,
    dosis VARCHAR(50),
    via_administracion VARCHAR(50),
    costo DECIMAL(8,2),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_desparasitaciones_ave ON desparasitaciones(ave_id);

-- Tabla: tratamientos
CREATE TABLE tratamientos (
    id SERIAL PRIMARY KEY,
    ave_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    diagnostico TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    veterinario VARCHAR(100),
    medicamentos TEXT,
    costo_total DECIMAL(10,2),
    estado VARCHAR(20) DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'completado', 'suspendido')),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tratamientos_ave ON tratamientos(ave_id);
CREATE INDEX idx_tratamientos_estado ON tratamientos(estado);

-- Tabla: lesiones
CREATE TABLE lesiones (
    id SERIAL PRIMARY KEY,
    ave_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    combate_id INTEGER REFERENCES combates(id),
    tipo_lesion VARCHAR(100),
    gravedad VARCHAR(20) CHECK (gravedad IN ('leve', 'moderada', 'grave')),
    fecha_lesion DATE NOT NULL,
    tratamiento TEXT,
    fecha_recuperacion DATE,
    costo_tratamiento DECIMAL(8,2),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lesiones_ave ON lesiones(ave_id);
CREATE INDEX idx_lesiones_combate ON lesiones(combate_id);

-- Tabla: consultas_veterinarias
CREATE TABLE consultas_veterinarias (
    id SERIAL PRIMARY KEY,
    ave_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    fecha_consulta DATE NOT NULL,
    veterinario VARCHAR(100),
    motivo TEXT,
    diagnostico TEXT,
    tratamiento_recomendado TEXT,
    costo DECIMAL(8,2),
    proxima_consulta DATE,
    documentos JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_consultas_ave ON consultas_veterinarias(ave_id);

-- ============================================
-- MÓDULO: FINANZAS
-- ============================================

-- Tabla: categorias_transaccion
CREATE TABLE categorias_transaccion (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(10) CHECK (tipo IN ('ingreso', 'egreso')),
    icono VARCHAR(50),
    color VARCHAR(20)
);

-- Categorías predefinidas
INSERT INTO categorias_transaccion (nombre, tipo) VALUES
('Compra de ave', 'egreso'),
('Venta de ave', 'ingreso'),
('Alimentación', 'egreso'),
('Veterinaria', 'egreso'),
('Vacunas', 'egreso'),
('Medicamentos', 'egreso'),
('Transporte', 'egreso'),
('Entrenamiento', 'egreso'),
('Ganancia por combate', 'ingreso'),
('Servicio de semental', 'ingreso'),
('Venta de pollos', 'ingreso'),
('Otros gastos', 'egreso'),
('Otros ingresos', 'ingreso');

-- Tabla: transacciones
CREATE TABLE transacciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    ave_id INTEGER REFERENCES aves(id) ON DELETE SET NULL,
    categoria_id INTEGER REFERENCES categorias_transaccion(id),
    tipo VARCHAR(10) CHECK (tipo IN ('ingreso', 'egreso')),
    monto DECIMAL(10,2) NOT NULL,
    fecha DATE NOT NULL,
    descripcion TEXT,
    metodo_pago VARCHAR(50),
    comprobante VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transacciones_usuario ON transacciones(usuario_id);
CREATE INDEX idx_transacciones_ave ON transacciones(ave_id);
CREATE INDEX idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX idx_transacciones_fecha ON transacciones(fecha);

-- ============================================
-- MÓDULO: ALIMENTACIÓN
-- ============================================

-- Tabla: planes_alimentacion
CREATE TABLE planes_alimentacion (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    etapa VARCHAR(50) CHECK (etapa IN ('pollito', 'crecimiento', 'adulto', 'pre_combate')),
    alimento_principal VARCHAR(100),
    suplementos TEXT,
    cantidad_diaria_gramos INTEGER,
    frecuencia_comidas INTEGER,
    costo_mensual_estimado DECIMAL(8,2),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: alimentacion_aves
CREATE TABLE alimentacion_aves (
    id SERIAL PRIMARY KEY,
    ave_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES planes_alimentacion(id),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alimentacion_ave ON alimentacion_aves(ave_id);

-- Tabla: suplementos
CREATE TABLE suplementos (
    id SERIAL PRIMARY KEY,
    ave_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    nombre_suplemento VARCHAR(100) NOT NULL,
    dosis VARCHAR(50),
    frecuencia VARCHAR(50),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    costo DECIMAL(8,2),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suplementos_ave ON suplementos(ave_id);

-- Tabla: inventario_alimentos
CREATE TABLE inventario_alimentos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_producto VARCHAR(100) NOT NULL,
    tipo VARCHAR(50),
    cantidad_kg DECIMAL(8,2),
    unidad VARCHAR(20),
    fecha_compra DATE,
    fecha_vencimiento DATE,
    costo DECIMAL(8,2),
    proveedor VARCHAR(100),
    stock_minimo DECIMAL(6,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventario_usuario ON inventario_alimentos(usuario_id);

-- ============================================
-- MÓDULO: CALENDARIO Y RECORDATORIOS
-- ============================================

-- Tabla: eventos
CREATE TABLE eventos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    ave_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(50) CHECK (tipo_evento IN ('combate', 'vacuna', 'desparasitacion', 'cruce', 'medicion', 'consulta', 'otro')) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP,
    ubicacion VARCHAR(150),
    todo_el_dia BOOLEAN DEFAULT false,
    recurrente BOOLEAN DEFAULT false,
    frecuencia_recurrencia VARCHAR(20),
    completado BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_eventos_usuario ON eventos(usuario_id);
CREATE INDEX idx_eventos_ave ON eventos(ave_id);
CREATE INDEX idx_eventos_fecha ON eventos(fecha_inicio);

-- Tabla: recordatorios
CREATE TABLE recordatorios (
    id SERIAL PRIMARY KEY,
    evento_id INTEGER REFERENCES eventos(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    minutos_antes INTEGER NOT NULL,
    metodo VARCHAR(20) CHECK (metodo IN ('push', 'email', 'ambos')) DEFAULT 'push',
    enviado BOOLEAN DEFAULT false,
    fecha_envio TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recordatorios_evento ON recordatorios(evento_id);
CREATE INDEX idx_recordatorios_usuario ON recordatorios(usuario_id);

-- ============================================
-- MÓDULO: MARKETPLACE
-- ============================================

-- Tabla: publicaciones
CREATE TABLE publicaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    ave_id INTEGER REFERENCES aves(id) ON DELETE CASCADE,
    tipo VARCHAR(20) CHECK (tipo IN ('venta', 'semental')) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    negociable BOOLEAN DEFAULT true,
    estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'vendida', 'pausada', 'cancelada')),
    vistas INTEGER DEFAULT 0,
    favoritos INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_publicaciones_usuario ON publicaciones(usuario_id);
CREATE INDEX idx_publicaciones_ave ON publicaciones(ave_id);
CREATE INDEX idx_publicaciones_tipo ON publicaciones(tipo);
CREATE INDEX idx_publicaciones_estado ON publicaciones(estado);

-- Tabla: favoritos
CREATE TABLE favoritos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    publicacion_id INTEGER REFERENCES publicaciones(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(usuario_id, publicacion_id)
);

CREATE INDEX idx_favoritos_usuario ON favoritos(usuario_id);

-- Tabla: reviews
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    vendedor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    comprador_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    publicacion_id INTEGER REFERENCES publicaciones(id),
    calificacion INTEGER CHECK (calificacion BETWEEN 1 AND 5) NOT NULL,
    comentario TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reviews_vendedor ON reviews(vendedor_id);
CREATE INDEX idx_reviews_comprador ON reviews(comprador_id);

-- Tabla: mensajes_marketplace
CREATE TABLE mensajes_marketplace (
    id SERIAL PRIMARY KEY,
    publicacion_id INTEGER REFERENCES publicaciones(id) ON DELETE CASCADE,
    remitente_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    destinatario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    leido BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mensajes_publicacion ON mensajes_marketplace(publicacion_id);
CREATE INDEX idx_mensajes_remitente ON mensajes_marketplace(remitente_id);
CREATE INDEX idx_mensajes_destinatario ON mensajes_marketplace(destinatario_id);

-- ============================================
-- MÓDULO: RED SOCIAL
-- ============================================

-- Tabla: publicaciones_sociales
CREATE TABLE publicaciones_sociales (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    ave_id INTEGER REFERENCES aves(id) ON DELETE SET NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('logro', 'noticia', 'foto', 'video')) NOT NULL,
    contenido TEXT NOT NULL,
    media_url VARCHAR(255),
    visibilidad VARCHAR(20) DEFAULT 'publico' CHECK (visibilidad IN ('publico', 'seguidores', 'privado')),
    likes INTEGER DEFAULT 0,
    comentarios INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_publicaciones_sociales_usuario ON publicaciones_sociales(usuario_id);
CREATE INDEX idx_publicaciones_sociales_fecha ON publicaciones_sociales(created_at DESC);

-- Tabla: seguidores
CREATE TABLE seguidores (
    id SERIAL PRIMARY KEY,
    seguidor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    seguido_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(seguidor_id, seguido_id),
    CHECK (seguidor_id != seguido_id)
);

CREATE INDEX idx_seguidores_seguidor ON seguidores(seguidor_id);
CREATE INDEX idx_seguidores_seguido ON seguidores(seguido_id);

-- Tabla: comentarios
CREATE TABLE comentarios (
    id SERIAL PRIMARY KEY,
    publicacion_id INTEGER REFERENCES publicaciones_sociales(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    comentario TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comentarios_publicacion ON comentarios(publicacion_id);

-- Tabla: likes
CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    publicacion_id INTEGER REFERENCES publicaciones_sociales(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(publicacion_id, usuario_id)
);

CREATE INDEX idx_likes_publicacion ON likes(publicacion_id);

-- ============================================
-- MÓDULO: MULTI-USUARIO (PREMIUM)
-- ============================================

-- Tabla: roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(20) UNIQUE NOT NULL,
    descripcion TEXT
);

INSERT INTO roles (nombre, descripcion) VALUES
('admin', 'Control total sobre la cuenta'),
('editor', 'Puede editar datos, no puede eliminar ni ver finanzas'),
('viewer', 'Solo puede ver información');

-- Tabla: colaboradores
CREATE TABLE colaboradores (
    id SERIAL PRIMARY KEY,
    propietario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    colaborador_email VARCHAR(100) NOT NULL,
    rol_id INTEGER REFERENCES roles(id),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'revocado')),
    token_invitacion VARCHAR(100) UNIQUE,
    fecha_invitacion TIMESTAMP DEFAULT NOW(),
    fecha_aceptacion TIMESTAMP,
    permisos_personalizados JSONB
);

CREATE INDEX idx_colaboradores_propietario ON colaboradores(propietario_id);
CREATE INDEX idx_colaboradores_email ON colaboradores(colaborador_email);

-- Tabla: log_actividad
CREATE TABLE log_actividad (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    propietario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    accion VARCHAR(50) NOT NULL,
    entidad VARCHAR(50),
    entidad_id INTEGER,
    detalles JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_log_usuario ON log_actividad(usuario_id);
CREATE INDEX idx_log_propietario ON log_actividad(propietario_id);
CREATE INDEX idx_log_fecha ON log_actividad(created_at DESC);

-- ============================================
-- MÓDULO: BACKUPS
-- ============================================

-- Tabla: backups
CREATE TABLE backups (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(20) CHECK (tipo IN ('manual', 'automatico', 'programado')),
    ruta_archivo VARCHAR(255) NOT NULL,
    tamaño_bytes BIGINT,
    estado VARCHAR(20) DEFAULT 'completado' CHECK (estado IN ('en_proceso', 'completado', 'fallido')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_backups_usuario ON backups(usuario_id);

-- ============================================
-- TABLAS AUXILIARES
-- ============================================

-- Tabla: configuraciones_usuario
CREATE TABLE configuraciones_usuario (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
    notificaciones_push BOOLEAN DEFAULT true,
    notificaciones_email BOOLEAN DEFAULT true,
    idioma VARCHAR(5) DEFAULT 'es',
    tema VARCHAR(10) DEFAULT 'claro' CHECK (tema IN ('claro', 'oscuro', 'auto')),
    moneda VARCHAR(3) DEFAULT 'MXN',
    zona_horaria VARCHAR(50) DEFAULT 'America/Mexico_City',
    backup_automatico BOOLEAN DEFAULT false,
    frecuencia_backup VARCHAR(20),
    configuraciones_extra JSONB,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: codigos_generados (para tracking de códigos únicos)
CREATE TABLE codigos_generados (
    id SERIAL PRIMARY KEY,
    año INTEGER NOT NULL,
    ultimo_numero INTEGER DEFAULT 0,
    UNIQUE(año)
);

-- ============================================
-- VISTA: limites_usuario
-- ============================================
CREATE OR REPLACE VIEW limites_usuario AS
SELECT 
    u.id as usuario_id,
    u.plan_actual,
    p.max_aves,
    p.max_fotos_por_ave,
    p.max_combates,
    p.profundidad_genealogia,
    p.analytics_avanzado,
    p.multi_usuario,
    p.exportacion,
    p.api_access,
    p.marketplace_sin_comision,
    COALESCE(s.fecha_expiracion, '1900-01-01') as expiracion_suscripcion,
    CASE 
        WHEN s.estado = 'activa' AND s.fecha_expiracion >= CURRENT_DATE THEN true
        WHEN u.plan_actual = 'basico' THEN true
        ELSE false
    END as suscripcion_valida
FROM usuarios u
LEFT JOIN planes p ON u.plan_actual = p.nombre
LEFT JOIN suscripciones s ON u.suscripcion_activa_id = s.id;

-- ============================================
-- FUNCIONES ÚTILES
-- ============================================

-- Función: Generar código único para ave
CREATE OR REPLACE FUNCTION generar_codigo_ave()
RETURNS VARCHAR AS $$
DECLARE
    año_actual INTEGER;
    numero_secuencial INTEGER;
    codigo_generado VARCHAR(20);
BEGIN
    año_actual := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Obtener o crear registro para el año actual
    INSERT INTO codigos_generados (año, ultimo_numero)
    VALUES (año_actual, 0)
    ON CONFLICT (año) DO NOTHING;
    
    -- Incrementar y obtener número
    UPDATE codigos_generados 
    SET ultimo_numero = ultimo_numero + 1
    WHERE año = año_actual
    RETURNING ultimo_numero INTO numero_secuencial;
    
    -- Generar código con formato GP-YYYY-####
    codigo_generado := 'GP-' || año_actual || '-' || LPAD(numero_secuencial::TEXT, 4, '0');
    
    RETURN codigo_generado;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular edad del ave en meses
CREATE OR REPLACE FUNCTION calcular_edad_meses(fecha_nac DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nac)) * 12 + 
           EXTRACT(MONTH FROM AGE(CURRENT_DATE, fecha_nac));
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener estadísticas de combates de un macho
CREATE OR REPLACE FUNCTION estadisticas_combates(macho_id_param INTEGER)
RETURNS TABLE (
    total_combates BIGINT,
    victorias BIGINT,
    empates BIGINT,
    derrotas BIGINT,
    porcentaje_victorias NUMERIC,
    duracion_promedio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_combates,
        COUNT(*) FILTER (WHERE resultado = 'victoria')::BIGINT as victorias,
        COUNT(*) FILTER (WHERE resultado = 'empate')::BIGINT as empates,
        COUNT(*) FILTER (WHERE resultado = 'derrota')::BIGINT as derrotas,
        ROUND(
            (COUNT(*) FILTER (WHERE resultado = 'victoria')::NUMERIC / 
            NULLIF(COUNT(*)::NUMERIC, 0) * 100), 2
        ) as porcentaje_victorias,
        ROUND(AVG(duracion_minutos)::NUMERIC, 2) as duracion_promedio
    FROM combates
    WHERE macho_id = macho_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER actualizar_usuarios_timestamp
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER actualizar_aves_timestamp
    BEFORE UPDATE ON aves
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER actualizar_suscripciones_timestamp
    BEFORE UPDATE ON suscripciones
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_timestamp();

-- Trigger: Sincronizar contadores de likes/comentarios
CREATE OR REPLACE FUNCTION actualizar_contador_likes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE publicaciones_sociales 
        SET likes = likes + 1 
        WHERE id = NEW.publicacion_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE publicaciones_sociales 
        SET likes = likes - 1 
        WHERE id = OLD.publicacion_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_likes
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_contador_likes();

CREATE OR REPLACE FUNCTION actualizar_contador_comentarios()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE publicaciones_sociales 
        SET comentarios = comentarios + 1 
        WHERE id = NEW.publicacion_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE publicaciones_sociales 
        SET comentarios = comentarios - 1 
        WHERE id = OLD.publicacion_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comentarios
    AFTER INSERT OR DELETE ON comentarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_contador_comentarios();
```

---

## 7. API REST - ENDPOINTS COMPLETOS

### 7.1 Convenciones

**Base URL:** `https://api.genesispro.com/api/v1`

**Autenticación:** JWT en header `Authorization: Bearer <token>`

**Respuestas estándar:**
```json
// Éxito
{
  "success": true,
  "data": { ... },
  "message": "Operación exitosa"
}

// Error
{
  "success": false,
  "error": "Mensaje de error",
  "code": "ERROR_CODE"
}

// Paginación
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Códigos HTTP:**
```
200 OK - Operación exitosa
201 Created - Recurso creado
400 Bad Request - Datos inválidos
401 Unauthorized - No autenticado
403 Forbidden - Sin permisos
404 Not Found - Recurso no existe
409 Conflict - Conflicto (ej: email duplicado)
422 Unprocessable Entity - Validación falló
429 Too Many Requests - Rate limit excedido
500 Internal Server Error - Error del servidor
```

### 7.2 Listado Completo de Endpoints

#### **AUTENTICACIÓN**

```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh-token
POST   /auth/forgot-password
POST   /auth/reset-password/:token
GET    /auth/verify-email/:token
POST   /auth/resend-verification
```

#### **USUARIOS**

```
GET    /users/profile
PUT    /users/profile
PUT    /users/profile/photo
DELETE /users/profile/photo
GET    /users/settings
PUT    /users/settings
PUT    /users/change-password
DELETE /users/account
```

#### **AVES**

```
GET    /aves
GET    /aves/:id
POST   /aves
PUT    /aves/:id
DELETE /aves/:id
GET    /aves/:id/genealogia
GET    /aves/:id/descendencia
POST   /aves/:id/fotos
GET    /aves/:id/fotos
DELETE /aves/fotos/:fotoId
PUT    /aves/fotos/:fotoId/principal
GET    /aves/:id/qr
GET    /aves/scan/:codigo
GET    /aves/search
POST   /aves/:id/mediciones
GET    /aves/:id/mediciones
```

#### **COMBATES**

```
GET    /combates
GET    /combates/:id
POST   /combates
PUT    /combates/:id
DELETE /combates/:id
GET    /aves/:id/combates
GET    /aves/:id/estadisticas-combate
GET    /combates/ranking
POST   /combates/:id/medios
```

#### **CRUCES**

```
GET    /cruces
GET    /cruces/:id
POST   /cruces
PUT    /cruces/:id
DELETE /cruces/:id
GET    /aves/:id/cruces
GET    /cruces/analisis
```

#### **SALUD**

```
GET    /aves/:id/salud/vacunas
POST   /aves/:id/salud/vacunas
PUT    /salud/vacunas/:id
DELETE /salud/vacunas/:id
GET    /aves/:id/salud/desparasitaciones
POST   /aves/:id/salud/desparasitaciones
PUT    /salud/desparasitaciones/:id
DELETE /salud/desparasitaciones/:id
GET    /aves/:id/salud/tratamientos
POST   /aves/:id/salud/tratamientos
PUT    /salud/tratamientos/:id
DELETE /salud/tratamientos/:id
GET    /aves/:id/salud/lesiones
POST   /aves/:id/salud/lesiones
PUT    /salud/lesiones/:id
GET    /aves/:id/salud/consultas
POST   /aves/:id/salud/consultas
GET    /salud/calendario
GET    /salud/alertas
```

#### **FINANZAS**

```
GET    /finanzas/dashboard
GET    /finanzas/transacciones
POST   /finanzas/transacciones
PUT    /finanzas/transacciones/:id
DELETE /finanzas/transacciones/:id
GET    /aves/:id/roi
GET    /finanzas/reportes/mensual
GET    /finanzas/reportes/anual
GET    /finanzas/lineas/:lineaId/roi
GET    /finanzas/export/excel
GET    /finanzas/categorias
```

#### **ALIMENTACIÓN**

```
GET    /aves/:id/alimentacion
POST   /aves/:id/alimentacion
PUT    /alimentacion/:id
GET    /alimentacion/planes
POST   /alimentacion/planes
GET    /alimentacion/inventario
POST   /alimentacion/inventario
PUT    /alimentacion/inventario/:id
DELETE /alimentacion/inventario/:id
GET    /alimentacion/alertas
POST   /aves/:id/suplementos
GET    /aves/:id/suplementos
```

#### **CALENDARIO**

```
GET    /calendario
GET    /calendario/eventos
POST   /calendario/eventos
PUT    /calendario/eventos/:id
DELETE /calendario/eventos/:id
GET    /calendario/proximos
POST   /recordatorios
PUT    /recordatorios/:id
DELETE /recordatorios/:id
```

#### **ANALYTICS**

```
GET    /analytics/dashboard
GET    /analytics/rendimiento
GET    /analytics/cruces
GET    /analytics/comparativa
GET    /analytics/rankings
GET    /analytics/predicciones
GET    /analytics/patrones
```

#### **DOCUMENTOS**

```
GET    /documentos/pedigree/:aveId
GET    /documentos/certificado/:aveId
GET    /documentos/ficha-venta/:aveId
GET    /documentos/combates/:aveId
POST   /documentos/personalizar
GET    /documentos/historial
```

#### **MARKETPLACE**

```
GET    /marketplace/publicaciones
POST   /marketplace/publicaciones
PUT    /marketplace/publicaciones/:id
DELETE /marketplace/publicaciones/:id
GET    /marketplace/search
POST   /marketplace/favoritos/:pubId
DELETE /marketplace/favoritos/:pubId
GET    /marketplace/favoritos
POST   /marketplace/reviews
GET    /marketplace/publicaciones/:id/reviews
POST   /marketplace/mensajes
GET    /marketplace/mensajes
GET    /marketplace/conversaciones/:pubId
```

#### **RED SOCIAL**

```
GET    /social/perfil/:userId
GET    /social/feed
POST   /social/publicaciones
GET    /social/publicaciones/:id
PUT    /social/publicaciones/:id
DELETE /social/publicaciones/:id
POST   /social/publicaciones/:id/like
DELETE /social/publicaciones/:id/like
POST   /social/publicaciones/:id/comentar
GET    /social/publicaciones/:id/comentarios
POST   /social/seguir/:userId
DELETE /social/seguir/:userId
GET    /social/seguidores
GET    /social/siguiendo
GET    /social/rankings
```

#### **SUSCRIPCIONES**

```
GET    /planes
GET    /suscripciones/actual
POST   /suscripciones/suscribir
PUT    /suscripciones/cambiar-plan
POST   /suscripciones/cancelar
POST   /suscripciones/reactivar
GET    /suscripciones/historial-pagos
POST   /webhooks/stripe
POST   /cupones/validar
GET    /suscripciones/factura/:pagoId
```

#### **BACKUPS**

```
POST   /backup/crear
GET    /backup/descargar/:backupId
POST   /backup/restaurar/:backupId
GET    /backup/historial
POST   /backup/configurar
GET    /backup/status
```

#### **COLABORADORES (Premium)**

```
POST   /colaboradores/invitar
GET    /colaboradores
DELETE /colaboradores/:id
PUT    /colaboradores/:id/rol
GET    /colaboradores/log-actividad
```

#### **API PÚBLICA (Premium)**

```
GET    /api-keys
POST   /api-keys/generar
DELETE /api-keys/:id
GET    /webhooks
POST   /webhooks
DELETE /webhooks/:id
```

---

## 8. SISTEMA DE AUTENTICACIÓN Y AUTORIZACIÓN

### 8.1 Middleware de Autenticación

```javascript
// middleware/auth.js

const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'Token no proporcionado' 
      });
    }
    
    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario existe y está activo
    const { rows } = await db.query(
      'SELECT id, email, plan_actual FROM usuarios WHERE id = $1 AND activo = true',
      [decoded.userId]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuario no válido' 
      });
    }
    
    req.user = rows[0];
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ 
      success: false,
      error: 'Token inválido' 
    });
  }
};

module.exports = { authenticateJWT };
```

### 8.2 Middleware de Límites de Plan

```javascript
// middleware/planLimits.js

const db = require('../config/database');

const checkPlanLimits = (feature) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      const { rows } = await db.query(`
        SELECT * FROM limites_usuario WHERE usuario_id = $1
      `, [userId]);
      
      if (rows.length === 0) {
        return res.status(403).json({ 
          success: false,
          error: 'Plan no encontrado' 
        });
      }
      
      const limits = rows[0];
      
      // Verificar suscripción válida
      if (!limits.suscripcion_valida && limits.plan_actual !== 'basico') {
        return res.status(403).json({ 
          success: false,
          error: 'Suscripción expirada',
          action: 'renovar',
          upgrade: true
        });
      }
      
      // Verificar límites según feature
      switch(feature) {
        case 'crear_ave':
          const { rows: aveCount } = await db.query(
            'SELECT COUNT(*) FROM aves WHERE usuario_id = $1 AND activo = true',
            [userId]
          );
          if (limits.max_aves && parseInt(aveCount[0].count) >= limits.max_aves) {
            return res.status(403).json({ 
              success: false,
              error: `Límite alcanzado: máximo ${limits.max_aves} aves en plan ${limits.plan_actual}`,
              upgrade: true,
              current_plan: limits.plan_actual
            });
          }
          break;
          
        case 'subir_foto':
          const aveId = req.params.id || req.body.ave_id;
          const { rows: fotoCount } = await db.query(
            'SELECT COUNT(*) FROM fotos WHERE ave_id = $1',
            [aveId]
          );
          if (limits.max_fotos_por_ave && parseInt(fotoCount[0].count) >= limits.max_fotos_por_ave) {
            return res.status(403).json({ 
              success: false,
              error: `Límite alcanzado: máximo ${limits.max_fotos_por_ave} fotos por ave`,
              upgrade: true
            });
          }
          break;
          
        case 'analytics_avanzado':
          if (!limits.analytics_avanzado) {
            return res.status(403).json({ 
              success: false,
              error: 'Analytics avanzado disponible en plan Premium',
              upgrade: true,
              required_plan: 'premium'
            });
          }
          break;
          
        case 'exportar':
          if (!limits.exportacion) {
            return res.status(403).json({ 
              success: false,
              error: 'Exportación disponible desde plan Pro',
              upgrade: true,
              required_plan: 'pro'
            });
          }
          break;
          
        case 'multi_usuario':
          if (!limits.multi_usuario) {
            return res.status(403).json({ 
              success: false,
              error: 'Multi-usuario disponible en plan Premium',
              upgrade: true,
              required_plan: 'premium'
            });
          }
          break;
      }
      
      req.userLimits = limits;
      next();
      
    } catch (error) {
      console.error('Error verificando límites:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error verificando límites del plan' 
      });
    }
  };
};

module.exports = { checkPlanLimits };
```

---

## 9. SISTEMA DE SUSCRIPCIONES Y PLANES

### 9.1 Integración con Stripe

```javascript
// services/stripe.service.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/database');

class StripeService {
  
  async createCheckoutSession(userId, planId, tipoPago) {
    const { rows: plan } = await db.query(
      'SELECT * FROM planes WHERE id = $1',
      [planId]
    );
    
    if (plan.length === 0) {
      throw new Error('Plan no encontrado');
    }
    
    const precio = tipoPago === 'anual' ? plan[0].precio_anual : plan[0].precio_mensual;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `GenesisPro ${plan[0].nombre.toUpperCase()} - ${tipoPago}`,
            },
            unit_amount: Math.round(precio * 100),
            recurring: tipoPago === 'anual' ? { interval: 'year' } : { interval: 'month' }
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/suscripcion/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/suscripcion/cancelado`,
      client_reference_id: userId.toString(),
      metadata: {
        userId,
        planId,
        tipoPago
      }
    });
    
    return session;
  }
  
  async handleWebhook(event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
    }
  }
  
  async handleCheckoutCompleted(session) {
    const userId = parseInt(session.client_reference_id);
    const { planId, tipoPago } = session.metadata;
    
    const fechaInicio = new Date();
    const fechaExpiracion = new Date();
    
    if (tipoPago === 'anual') {
      fechaExpiracion.setFullYear(fechaExpiracion.getFullYear() + 1);
    } else {
      fechaExpiracion.setMonth(fechaExpiracion.getMonth() + 1);
    }
    
    const { rows } = await db.query(`
      INSERT INTO suscripciones (usuario_id, plan_id, tipo_pago, fecha_inicio, fecha_expiracion, estado, metodo_pago, transaccion_id, auto_renovacion)
      VALUES ($1, $2, $3, $4, $5, 'activa', 'stripe', $6, true)
      RETURNING id
    `, [userId, planId, tipoPago, fechaInicio, fechaExpiracion, session.id]);
    
    const suscripcionId = rows[0].id;
    
    const { rows: planRows } = await db.query('SELECT nombre FROM planes WHERE id = $1', [planId]);
    
    await db.query(`
      UPDATE usuarios 
      SET plan_actual = $1, suscripcion_activa_id = $2
      WHERE id = $3
    `, [planRows[0].nombre, suscripcionId, userId]);
    
    await db.query(`
      INSERT INTO pagos (suscripcion_id, usuario_id, monto, metodo_pago, transaccion_id, estado)
      VALUES ($1, $2, $3, 'stripe', $4, 'completado')
    `, [suscripcionId, userId, session.amount_total / 100, session.id]);
  }
}

module.exports = new StripeService();
```

---

## 10. FUNCIONALIDADES DETALLADAS

### 10.1 Generación de Código QR

```javascript
// services/qr.service.js

const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');

class QRService {
  
  async generateQR(aveId, codigo) {
    try {
      const qrData = `https://genesispro.com/aves/scan/${codigo}`;
      
      const fileName = `qr_${codigo}.png`;
      const filePath = path.join(process.env.UPLOAD_PATH, 'qr', fileName);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      await QRCode.toFile(filePath, qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return `/uploads/qr/${fileName}`;
      
    } catch (error) {
      console.error('Error generando QR:', error);
      throw error;
    }
  }
  
  async generateQRBase64(codigo) {
    try {
      const qrData = `https://genesispro.com/aves/scan/${codigo}`;
      
      const qrBase64 = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2
      });
      
      return qrBase64;
      
    } catch (error) {
      console.error('Error generando QR base64:', error);
      throw error;
    }
  }
}

module.exports = new QRService();
```

### 10.2 Generación de Documentos PDF

```javascript
// services/pdf.service.js

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

class PDFService {
  
  async generarPedigree(aveId) {
    try {
      const { rows: ave } = await db.query(`
        SELECT a.*, 
               padre.codigo_identidad as padre_codigo, padre.color as padre_color,
               madre.codigo_identidad as madre_codigo, madre.color as madre_color
        FROM aves a
        LEFT JOIN aves padre ON a.padre_id = padre.id
        LEFT JOIN aves madre ON a.madre_id = madre.id
        WHERE a.id = $1
      `, [aveId]);
      
      if (ave.length === 0) {
        throw new Error('Ave no encontrada');
      }
      
      const aveData = ave[0];
      
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const fileName = `pedigree_${aveData.codigo_identidad}.pdf`;
      const filePath = path.join(process.env.UPLOAD_PATH, 'pdfs', fileName);
      
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Header
      doc.fontSize(24).text('CERTIFICADO DE PEDIGREE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(18).text('GenesisPro', { align: 'center' });
      doc.moveDown(2);
      
      // Información del ave
      doc.fontSize(14).text('INFORMACIÓN DEL AVE', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12)
         .text(`Código: ${aveData.codigo_identidad}`)
         .text(`Sexo: ${aveData.sexo === 'M' ? 'Macho' : 'Hembra'}`)
         .text(`Fecha de Nacimiento: ${new Date(aveData.fecha_nacimiento).toLocaleDateString('es-MX')}`)
         .text(`Color: ${aveData.color || 'N/A'}`)
         .text(`Línea Genética: ${aveData.linea_genetica || 'N/A'}`);
      
      doc.moveDown(2);
      
      // Genealogía
      doc.fontSize(14).text('GENEALOGÍA', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Padre: ${aveData.padre_codigo || 'Desconocido'}`);
      doc.text(`Madre: ${aveData.madre_codigo || 'Desconocido'}`);
      
      // Footer
      doc.moveDown(3);
      doc.fontSize(10)
         .text(`Generado el: ${new Date().toLocaleDateString('es-MX')}`, { align: 'center' })
         .text('GenesisPro - Sistema de Gestión Avícola', { align: 'center' });
      
      doc.end();
      
      return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(`/uploads/pdfs/${fileName}`));
        stream.on('error', reject);
      });
      
    } catch (error) {
      console.error('Error generando pedigree:', error);
      throw error;
    }
  }
}

module.exports = new PDFService();
```

### 10.3 Sistema de Notificaciones

```javascript
// services/notification.service.js

const admin = require('firebase-admin');
const db = require('../config/database');

class NotificationService {
  
  constructor() {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      })
    });
  }
  
  async enviarNotificacion(userId, titulo, mensaje, data = {}) {
    try {
      const { rows } = await db.query(`
        SELECT push_token FROM usuarios WHERE id = $1 AND push_token IS NOT NULL
      `, [userId]);
      
      if (rows.length === 0) return;
      
      const token = rows[0].push_token;
      
      const message = {
        notification: {
          title: titulo,
          body: mensaje
        },
        data: data,
        token: token
      };
      
      await admin.messaging().send(message);
      
    } catch (error) {
      console.error('Error enviando notificación:', error);
    }
  }
  
  async enviarRecordatoriosVacunas() {
    try {
      const mañana = new Date();
      mañana.setDate(mañana.getDate() + 1);
      
      const { rows } = await db.query(`
        SELECT v.*, a.codigo_identidad, a.usuario_id
        FROM vacunas v
        JOIN aves a ON v.ave_id = a.id
        WHERE v.proxima_dosis::date = $1
      `, [mañana.toISOString().split('T')[0]]);
      
      for (const vacuna of rows) {
        await this.enviarNotificacion(
          vacuna.usuario_id,
          'Recordatorio de Vacuna',
          `Mañana toca vacuna para ${vacuna.codigo_identidad}: ${vacuna.tipo_vacuna}`,
          { tipo: 'vacuna', aveId: vacuna.ave_id }
        );
      }
      
    } catch (error) {
      console.error('Error enviando recordatorios:', error);
    }
  }
}

module.exports = new NotificationService();
```

---

## 11. ESTRUCTURA DE PROYECTO

### 11.1 Estructura Backend

```
genesispro-backend/
├── src/
│   ├── config/
│   │   ├── database.js              # Configuración PostgreSQL
│   │   └── server.js                # Configuración Express
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── avesController.js
│   │   ├── combatesController.js
│   │   ├── crucesController.js
│   │   ├── saludController.js
│   │   ├── finanzasController.js
│   │   ├── alimentacionController.js
│   │   ├── calendarioController.js
│   │   ├── analyticsController.js
│   │   ├── documentosController.js
│   │   ├── marketplaceController.js
│   │   ├── socialController.js
│   │   ├── suscripcionController.js
│   │   ├── backupController.js
│   │   └── colaboradoresController.js
│   ├── middleware/
│   │   ├── auth.js                  # JWT authentication
│   │   ├── planLimits.js            # Plan limits checker
│   │   ├── upload.js                # Multer configuration
│   │   ├── validator.js             # Input validation
│   │   └── errorHandler.js          # Global error handler
│   ├── models/
│   │   ├── Usuario.js
│   │   ├── Ave.js
│   │   ├── Combate.js
│   │   ├── Cruce.js
│   │   └── ... (otros modelos)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── aves.js
│   │   ├── combates.js
│   │   ├── cruces.js
│   │   ├── salud.js
│   │   ├── finanzas.js
│   │   ├── alimentacion.js
│   │   ├── calendario.js
│   │   ├── analytics.js
│   │   ├── documentos.js
│   │   ├── marketplace.js
│   │   ├── social.js
│   │   ├── suscripciones.js
│   │   └── webhooks.js
│   ├── services/
│   │   ├── stripe.service.js
│   │   ├── qr.service.js
│   │   ├── pdf.service.js
│   │   ├── notification.service.js
│   │   ├── email.service.js
│   │   └── backup.service.js
│   ├── utils/
│   │   ├── generateCode.js
│   │   ├── validators.js
│   │   ├── imageProcessor.js
│   │   └── helpers.js
│   ├── jobs/
│   │   ├── backupJob.js
│   │   ├── notificationJob.js
│   │   └── subscriptionCheck.js
│   └── app.js                       # Main app entry
├── uploads/
│   ├── fotos/
│   ├── qr/
│   ├── pdfs/
│   └── .gitkeep
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── ecosystem.config.js              # PM2 config
```

### 11.2 Estructura Frontend (React Native)

```
genesispro-mobile/
├── src/
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.js
│   │   │   ├── RegisterScreen.js
│   │   │   └── ForgotPasswordScreen.js
│   │   ├── Home/
│   │   │   ├── HomeScreen.js
│   │   │   └── DashboardScreen.js
│   │   ├── Aves/
│   │   │   ├── AvesListScreen.js
│   │   │   ├── AveDetailScreen.js
│   │   │   ├── AveFormScreen.js
│   │   │   ├── GenealogyTreeScreen.js
│   │   │   ├── PhotoGalleryScreen.js
│   │   │   └── QRScannerScreen.js
│   │   ├── Combates/
│   │   │   ├── CombatesListScreen.js
│   │   │   ├── CombateDetailScreen.js
│   │   │   ├── CombateFormScreen.js
│   │   │   └── EstadisticasScreen.js
│   │   ├── Salud/
│   │   │   ├── SaludDashboardScreen.js
│   │   │   ├── VacunasScreen.js
│   │   │   ├── TratamientosScreen.js
│   │   │   └── CalendarioSaludScreen.js
│   │   ├── Finanzas/
│   │   │   ├── FinanzasDashboardScreen.js
│   │   │   ├── TransaccionesScreen.js
│   │   │   ├── TransaccionFormScreen.js
│   │   │   └── ReportesScreen.js
│   │   ├── Alimentacion/
│   │   │   ├── AlimentacionScreen.js
│   │   │   ├── InventarioScreen.js
│   │   │   └── PlanesScreen.js
│   │   ├── Calendario/
│   │   │   ├── CalendarioScreen.js
│   │   │   ├── EventoFormScreen.js
│   │   │   └── AgendaScreen.js
│   │   ├── Analytics/
│   │   │   ├── DashboardScreen.js
│   │   │   ├── RendimientoScreen.js
│   │   │   ├── CrucesScreen.js
│   │   │   └── ComparativaScreen.js
│   │   ├── Marketplace/
│   │   │   ├── MarketplaceScreen.js
│   │   │   ├── PublicacionDetailScreen.js
│   │   │   ├── PublicacionFormScreen.js
│   │   │   ├── MisPublicacionesScreen.js
│   │   │   └── ChatScreen.js
│   │   ├── Social/
│   │   │   ├── FeedScreen.js
│   │   │   ├── PerfilScreen.js
│   │   │   └── PublicacionDetailScreen.js
│   │   ├── Suscripcion/
│   │   │   ├── PlanesScreen.js
│   │   │   ├── SuscripcionScreen.js
│   │   │   └── PaywallScreen.js
│   │   └── Profile/
│   │       ├── ProfileScreen.js
│   │       ├── SettingsScreen.js
│   │       └── ColaboradoresScreen.js
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.js
│   │   │   ├── Input.js
│   │   │   ├── Card.js
│   │   │   ├── Loading.js
│   │   │   ├── EmptyState.js
│   │   │   └── ErrorBoundary.js
│   │   ├── aves/
│   │   │   ├── AveCard.js
│   │   │   ├── GenealogyTree.js
│   │   │   ├── PhotoCarousel.js
│   │   │   └── QRCode.js
│   │   ├── combates/
│   │   │   ├── CombateCard.js
│   │   │   └── EstadisticasCard.js
│   │   └── charts/
│   │       ├── LineChart.js
│   │       ├── BarChart.js
│   │       ├── PieChart.js
│   │       └── Heatmap.js
│   ├── navigation/
│   │   ├── AppNavigator.js
│   │   ├── AuthNavigator.js
│   │   ├── TabNavigator.js
│   │   └── DrawerNavigator.js
│   ├── services/
│   │   ├── api.js                   # Axios config
│   │   ├── authService.js
│   │   ├── avesService.js
│   │   ├── combatesService.js
│   │   └── ... (otros services)
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useAves.js
│   │   ├── useCombates.js
│   │   ├── useOfflineSync.js
│   │   └── useNotifications.js
│   ├── context/
│   │   ├── AuthContext.js
│   │   ├── ThemeContext.js
│   │   └── OfflineContext.js
│   ├── utils/
│   │   ├── helpers.js
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   └── constants.js
│   ├── constants/
│   │   ├── colors.js
│   │   ├── theme.js
│   │   └── api.js
│   └── store/                       # Redux (opcional)
│       ├── slices/
│       └── store.js
├── assets/
│   ├── images/
│   │   ├── logo.png
│   │   ├── onboarding/
│   │   └── placeholders/
│   ├── icons/
│   └── fonts/
├── App.js
├── app.json
├── package.json
├── .gitignore
└── README.md
```

---

## 12. PLAN DE DESARROLLO POR FASES

### FASE 1: Configuración Inicial y MVP Backend (Semana 1-2)

**Objetivos:**
- Configurar entorno de desarrollo
- Base de datos operacional
- Autenticación funcional
- CRUD básico de aves

**Tareas Backend:**
1. ✅ Configurar proyecto Node.js + Express
2. ✅ Configurar PostgreSQL y ejecutar migrations
3. ✅ Implementar autenticación JWT
4. ✅ Crear endpoints de registro/login
5. ✅ Implementar CRUD de aves (sin fotos)
6. ✅ Sistema de generación de códigos únicos
7. ✅ Middleware de autenticación
8. ✅ Middleware de validación
9. ✅ Configurar CORS y seguridad básica
10. ✅ Testing manual con Postman

**Entregables:**
- API funcional con autenticación
- CRUD de aves operativo
- Documentación básica de endpoints

---

### FASE 2: Frontend MVP y Sincronización (Semana 3-4)

**Objetivos:**
- App móvil funcional
- Login/Registro
- Lista y creación de aves
- Sincronización básica

**Tareas Frontend:**
1. ✅ Configurar proyecto React Native + Expo
2. ✅ Implementar navegación (Stack + Tabs)
3. ✅ Pantallas de Login/Registro
4. ✅ Context de autenticación
5. ✅ Pantalla de lista de aves
6. ✅ Pantalla de creación de ave
7. ✅ Formularios con react-hook-form
8. ✅ Integración con API (Axios)
9. ✅ Manejo de estados de carga/error
10. ✅ AsyncStorage para offline básico

**Entregables:**
- App móvil instalable
- Flujo completo de auth
- Crear y listar aves

---

### FASE 3: Fotos, Genealogía y Combates (Semana 5-7)

**Objetivos:**
- Sistema de fotos completo
- Árbol genealógico visual
- Gestión de combates

**Tareas Backend:**
1. ✅ Upload de fotos con Multer
2. ✅ Endpoint de genealogía recursivo
3. ✅ Endpoints de combates
4. ✅ Cálculo de estadísticas
5. ✅ Validación de combates (solo machos)
6. ✅ Optimización de queries

**Tareas Frontend:**
1. ✅ Integración con expo-image-picker
2. ✅ Galería de fotos
3. ✅ Componente de árbol genealógico
4. ✅ Pantallas de combates
5. ✅ Formulario de combate
6. ✅ Gráficas básicas con Victory
7. ✅ Vista de estadísticas

**Entregables:**
- Fotos operativas
- Árbol genealógico funcional
- Registro de combates

---

### FASE 4: Sistema de Planes y Suscripciones (Semana 8-9)

**Objetivos:**
- Implementar sistema de planes
- Integración con Stripe
- Límites por plan funcionando

**Tareas Backend:**
1. ✅ Middleware de verificación de límites
2. ✅ Integración con Stripe
3. ✅ Webhooks de Stripe
4. ✅ Gestión de suscripciones
5. ✅ Endpoint de planes
6. ✅ Sistema de renovación automática

**Tareas Frontend:**
1. ✅ Pantalla de planes
2. ✅ Integración con Stripe Checkout
3. ✅ Paywall screens
4. ✅ Gestión de suscripción
5. ✅ Indicadores de límites

**Entregables:**
- Sistema de suscripciones operativo
- Pagos funcionales con Stripe
- Límites aplicándose correctamente

---

### FASE 5: Salud, Finanzas y Alimentación (Semana 10-12)

**Objetivos:**
- Módulos de gestión completos
- Recordatorios operativos
- Calendario integrado

**Tareas Backend:**
1. ✅ Endpoints de salud (vacunas, tratamientos, etc.)
2. ✅ Endpoints de finanzas
3. ✅ Endpoints de alimentación
4. ✅ Sistema de recordatorios
5. ✅ Integración con Firebase (notificaciones)
6. ✅ Calendario de eventos

**Tareas Frontend:**
1. ✅ Pantallas de salud
2. ✅ Dashboard financiero
3. ✅ Gestión de inventario
4. ✅ Calendario visual
5. ✅ Notificaciones push
6. ✅ Recordatorios configurables

**Entregables:**
- Gestión de salud completa
- Sistema financiero operativo
- Notificaciones funcionando

---

### FASE 6: Analytics, QR y Documentos (Semana 13-15)

**Objetivos:**
- Analytics completo
- Códigos QR operativos
- Generación de PDFs

**Tareas Backend:**
1. ✅ Endpoints de analytics
2. ✅ Generación de QR codes
3. ✅ Generación de PDFs (pedigree, certificados)
4. ✅ Queries optimizadas para analytics
5. ✅ Sistema de comparativas

**Tareas Frontend:**
1. ✅ Dashboard de analytics
2. ✅ Gráficas avanzadas
3. ✅ Escáner de QR
4. ✅ Visualización de PDFs
5. ✅ Compartir documentos
6. ✅ Comparativas visuales

**Entregables:**
- Analytics funcional
- QR codes operativos
- PDFs profesionales

---

### FASE 7: Marketplace y Red Social (Semana 16-18)

**Objetivos:**
- Marketplace básico
- Red social MVP
- Chat entre usuarios

**Tareas Backend:**
1. ✅ Endpoints de publicaciones
2. ✅ Sistema de reviews
3. ✅ Chat/mensajería
4. ✅ Búsqueda avanzada
5. ✅ Sistema de favoritos

**Tareas Frontend:**
1. ✅ Pantallas de marketplace
2. ✅ Publicar aves
3. ✅ Sistema de chat
4. ✅ Feed social
5. ✅ Perfiles públicos
6. ✅ Sistema de seguimiento

**Entregables:**
- Marketplace operativo
- Red social básica
- Chat funcional

---

### FASE 8: Optimización y Offline (Semana 19-20)

**Objetivos:**
- Modo offline completo
- Optimización de performance
- Caching implementado

**Tareas Backend:**
1. ✅ Redis para caching (opcional)
2. ✅ Optimización de queries
3. ✅ Compresión de imágenes
4. ✅ Rate limiting
5. ✅ Monitoring básico

**Tareas Frontend:**
1. ✅ Sincronización offline completa
2. ✅ Cola de acciones pendientes
3. ✅ Cache con React Query
4. ✅ Optimización de imágenes
5. ✅ Lazy loading
6. ✅ Performance optimization

**Entregables:**
- App funcional offline
- Performance mejorado
- Caching operativo

---

### FASE 9: Testing y QA (Semana 21-22)

**Objetivos:**
- Testing completo
- Corrección de bugs
- UX polish

**Tareas:**
1. ✅ Unit tests (Jest)
2. ✅ Integration tests
3. ✅ E2E tests (opcional)
4. ✅ Testing manual completo
5. ✅ Corrección de bugs
6. ✅ Ajustes de UX
7. ✅ Optimización final

**Entregables:**
- App estable
- Bugs críticos corregidos
- Tests básicos implementados

---

### FASE 10: Deploy y Lanzamiento (Semana 23-24)

**Objetivos:**
- Deploy en producción
- Configuración de CI/CD
- Monitoring operativo

**Tareas:**
1. ✅ Configurar servidor VPS
2. ✅ Setup de Nginx
3. ✅ SSL con Let's Encrypt
4. ✅ PM2 para Node.js
5. ✅ Backups automáticos
6. ✅ Deploy de app móvil
7. ✅ Configurar monitoring
8. ✅ Documentación final

**Entregables:**
- App en producción
- Servidor configurado
- Monitoring activo

---

### FASE 11: Post-Lanzamiento (Ongoing)

**Objetivos:**
- Soporte a usuarios
- Iteración basada en feedback
- Nuevas features

**Actividades:**
1. Monitoreo de métricas
2. Soporte a usuarios
3. Corrección de bugs reportados
4. Implementación de features nuevas
5. Marketing y crecimiento
6. Optimización continua

---

## 13. CONFIGURACIÓN E INSTALACIÓN

### 13.1 Requisitos del Sistema

**Desarrollo:**
- Node.js 18+ LTS
- PostgreSQL 15+
- Git
- Expo CLI (para mobile)
- Editor: VS Code recomendado

**Producción:**
- VPS con Ubuntu 22.04 LTS
- 2 vCPU, 4GB RAM mínimo
- 80GB SSD
- Dominio con DNS configurado

### 13.2 Instalación Backend

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/genesispro-backend.git
cd genesispro-backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 4. Crear base de datos
createdb genesispro_db

# 5. Ejecutar migrations
psql genesispro_db < database/migrations/001_initial_schema.sql

# 6. Ejecutar en desarrollo
npm run dev

# 7. Ejecutar tests (opcional)
npm test
```

### 13.3 Variables de Entorno Backend (.env)

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/genesispro_db

# JWT
JWT_SECRET=tu_secret_key_super_segura_cambiar_en_produccion
JWT_EXPIRE=7d

# Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# CORS
ALLOWED_ORIGINS=http://localhost:19000,http://localhost:19001

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase (Notifications)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Email (SendGrid)
SENDGRID_API_KEY=
FROM_EMAIL=noreply@genesispro.com

# Frontend URL
FRONTEND_URL=http://localhost:19000
```

### 13.4 Instalación Frontend

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/genesispro-mobile.git
cd genesispro-mobile

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu API URL

# 4. Ejecutar en desarrollo
npx expo start

# 5. Escanear QR con Expo Go
# O presionar 'a' para Android emulator
# O presionar 'i' para iOS simulator
```

### 13.5 Variables de Entorno Frontend (.env)

```env
API_URL=http://localhost:3000
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 14. SEGURIDAD Y PERFORMANCE

### 14.1 Seguridad

**Medidas Implementadas:**

1. **Autenticación:**
   - JWT con expiración
   - Refresh tokens
   - Password hashing con bcrypt (10 rounds)
   - Email verification
   - Password reset con tokens temporales

2. **Autorización:**
   - Middleware de verificación de permisos
   - Validación de ownership de recursos
   - Rate limiting por IP
   - Plan limits enforcement

3. **Validación:**
   - Input validation con express-validator
   - SQL injection prevention (parameterized queries)
   - XSS protection
   - CSRF tokens (si se usa sesiones)

4. **Headers de Seguridad:**
   ```javascript
   app.use(helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         styleSrc: ["'self'", "'unsafe-inline'"],
         scriptSrc: ["'self'"],
         imgSrc: ["'self'", "data:", "https:"]
       }
     },
     hsts: {
       maxAge: 31536000,
       includeSubDomains: true,
       preload: true
     }
   }));
   ```

5. **HTTPS:**
   - SSL/TLS con Let's Encrypt
   - Redirect HTTP → HTTPS
   - HSTS headers

6. **Rate Limiting:**
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutos
     max: 100, // 100 requests
     message: 'Demasiadas peticiones, intenta de nuevo más tarde'
   });
   
   app.use('/api/', limiter);
   ```

7. **File Upload:**
   - Validación de tipo de archivo
   - Límite de tamaño (5MB)
   - Sanitización de nombres
   - Almacenamiento fuera de webroot

8. **Logs:**
   - Winston para logging estructurado
   - No loggear datos sensibles
   - Logs de acceso con Morgan
   - Logs de errores separados

### 14.2 Performance

**Optimizaciones Backend:**

1. **Database:**
   - Índices en columnas frecuentes
   - Queries optimizadas
   - Connection pooling
   - Prepared statements
   - EXPLAIN ANALYZE para queries pesadas

2. **Caching:**
   ```javascript
   // Redis para caching (Fase 3)
   const redis = require('redis');
   const client = redis.createClient();
   
   async function getCachedData(key) {
     const cached = await client.get(key);
     if (cached) return JSON.parse(cached);
     
     const data = await fetchFromDB();
     await client.setex(key, 3600, JSON.stringify(data));
     return data;
   }
   ```

3. **Compresión:**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

4. **Paginación:**
   ```javascript
   // Siempre paginar resultados
   router.get('/aves', async (req, res) => {
     const page = parseInt(req.query.page) || 1;
     const limit = parseInt(req.query.limit) || 20;
     const offset = (page - 1) * limit;
     
     const { rows, count } = await db.query(`
       SELECT * FROM aves 
       WHERE usuario_id = $1 
       LIMIT $2 OFFSET $3
     `, [userId, limit, offset]);
     
     res.json({
       data: rows,
       pagination: {
         page,
         limit,
         total: count,
         pages: Math.ceil(count / limit)
       }
     });
   });
   ```

**Optimizaciones Frontend:**

1. **React Query:**
   ```javascript
   const { data, isLoading } = useQuery(
     ['aves', userId],
     fetchAves,
     {
       staleTime: 5 * 60 * 1000, // 5 minutos
       cacheTime: 10 * 60 * 1000 // 10 minutos
     }
   );
   ```

2. **Lazy Loading:**
   ```javascript
   const AnalyticsScreen = lazy(() => import('./screens/Analytics/DashboardScreen'));
   ```

3. **Imágenes:**
   - Compresión automática
   - Lazy loading de imágenes
   - Thumbnails para listas
   - Progressive loading

4. **Bundle Optimization:**
   - Code splitting
   - Tree shaking
   - Minificación
   - Hermes engine (React Native)

### 14.3 Monitoring

**Métricas a Monitorear:**

1. **Performance:**
   - Response time promedio
   - Throughput (requests/segundo)
   - Error rate
   - CPU usage
   - Memory usage
   - Database connections

2. **Negocio:**
   - Usuarios activos diarios (DAU)
   - Conversión free → paid
   - Churn rate
   - MRR (Monthly Recurring Revenue)
   - Aves creadas por día
   - Combates registrados por día

3. **Errores:**
   - Error logs
   - Exception tracking
   - Failed requests
   - Database errors

**Herramientas:**
- PM2 Plus (básico)
- Grafana + Prometheus (avanzado)
- Sentry (error tracking)
- Google Analytics (mobile)

---

## 15. TESTING Y QA

### 15.1 Estrategia de Testing

**Niveles de Testing:**

1. **Unit Tests**
   - Funciones individuales
   - Utilities
   - Helpers
   - Validadores

2. **Integration Tests**
   - Endpoints de API
   - Flujos completos
   - Database operations

3. **E2E Tests** (Opcional)
   - Flujos críticos de usuario
   - Registro → Login → Crear ave

### 15.2 Unit Tests (Backend)

```javascript
// tests/unit/utils/generateCode.test.js

const { generarCodigoAve } = require('../../../src/utils/generateCode');

describe('generarCodigoAve', () => {
  test('debe generar código con formato GP-YYYY-####', () => {
    const codigo = generarCodigoAve();
    expect(codigo).toMatch(/^GP-\d{4}-\d{4}$/);
  });
  
  test('debe usar año actual', () => {
    const año = new Date().getFullYear();
    const codigo = generarCodigoAve();
    expect(codigo).toContain(`GP-${año}-`);
  });
});
```

### 15.3 Integration Tests (Backend)

```javascript
// tests/integration/aves.test.js

const request = require('supertest');
const app = require('../../src/app');

describe('Aves API', () => {
  let token;
  
  beforeAll(async () => {
    // Login para obtener token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@genesispro.com',
        password: 'test123'
      });
    token = res.body.data.token;
  });
  
  describe('POST /api/aves', () => {
    test('debe crear ave exitosamente', async () => {
      const res = await request(app)
        .post('/api/aves')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sexo: 'M',
          fecha_nacimiento: '2024-01-15',
          color: 'Rojo'
        });
        
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('codigo_identidad');
    });
    
    test('debe fallar sin autenticación', async () => {
      const res = await request(app)
        .post('/api/aves')
        .send({
          sexo: 'M',
          fecha_nacimiento: '2024-01-15'
        });
        
      expect(res.statusCode).toBe(401);
    });
  });
});
```

### 15.4 Testing Frontend

```javascript
// __tests__/components/AveCard.test.js

import React from 'react';
import { render } from '@testing-library/react-native';
import AveCard from '../../src/components/aves/AveCard';

describe('AveCard', () => {
  const mockAve = {
    id: 1,
    codigo_identidad: 'GP-2025-0001',
    sexo: 'M',
    color: 'Rojo'
  };
  
  test('debe renderizar correctamente', () => {
    const { getByText } = render(<AveCard ave={mockAve} />);
    
    expect(getByText('GP-2025-0001')).toBeTruthy();
    expect(getByText('Macho')).toBeTruthy();
  });
});
```

### 15.5 Checklist de QA

**Funcional:**
- [ ] Registro de usuario funciona
- [ ] Login funciona
- [ ] Crear ave funciona
- [ ] Upload de fotos funciona
- [ ] Árbol genealógico se muestra correctamente
- [ ] Registro de combates funciona
- [ ] Estadísticas se calculan correctamente
- [ ] Notificaciones se envían
- [ ] PDFs se generan correctamente
- [ ] QR codes funcionan
- [ ] Suscripciones funcionan
- [ ] Límites de planes se aplican

**Seguridad:**
- [ ] No hay SQL injection
- [ ] Passwords hasheados
- [ ] JWT expira correctamente
- [ ] Rate limiting funciona
- [ ] CORS configurado correctamente
- [ ] Headers de seguridad presentes

**Performance:**
- [ ] Carga en < 2 segundos
- [ ] Paginación funciona
- [ ] Imágenes optimizadas
- [ ] Cache funciona
- [ ] Modo offline funciona

**UX:**
- [ ] Navegación intuitiva
- [ ] Mensajes de error claros
- [ ] Estados de carga visibles
- [ ] Responsive en diferentes pantallas
- [ ] Tema oscuro funciona (si implementado)

---

## 16. DEPLOYMENT Y DEVOPS

### 16.1 Configuración del Servidor (VPS)

```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Instalar PostgreSQL 15
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc &>/dev/null
sudo apt update
sudo apt install -y postgresql-15

# 4. Instalar Nginx
sudo apt install -y nginx

# 5. Instalar PM2
sudo npm install -g pm2

# 6. Instalar Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx

# 7. Configurar firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 16.2 Configuración de PostgreSQL

```bash
# Crear usuario y base de datos
sudo -u postgres psql

CREATE USER genesispro WITH PASSWORD 'password_segura';
CREATE DATABASE genesispro_db OWNER genesispro;
GRANT ALL PRIVILEGES ON DATABASE genesispro_db TO genesispro;
\q

# Ejecutar migrations
psql -U genesispro -d genesispro_db -f /path/to/migrations/001_initial_schema.sql
```

### 16.3 Deploy del Backend

```bash
# 1. Clonar repositorio
cd /var/www
sudo git clone https://github.com/tu-usuario/genesispro-backend.git
cd genesispro-backend

# 2. Instalar dependencias
npm install --production

# 3. Configurar .env
sudo nano .env
# Pegar configuración de producción

# 4. Iniciar con PM2
pm2 start src/app.js --name genesispro-api
pm2 save
pm2 startup

# 5. Configurar logs
pm2 install pm2-logrotate
```

### 16.4 Configuración de Nginx

```nginx
# /etc/nginx/sites-available/genesispro

server {
    listen 80;
    server_name api.genesispro.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.genesispro.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.genesispro.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.genesispro.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files (uploads)
    location /uploads {
        alias /var/www/genesispro-backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Max body size
    client_max_body_size 10M;
}
```

```bash
# Activar configuración
sudo ln -s /etc/nginx/sites-available/genesispro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Obtener certificado SSL
sudo certbot --nginx -d api.genesispro.com
```

### 16.5 Backups Automáticos

```bash
# Script de backup: /usr/local/bin/backup-genesispro.sh

#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/genesispro"
DB_NAME="genesispro_db"
DB_USER="genesispro"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Backup de base de datos
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup de uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/genesispro-backend/uploads

# Eliminar backups antiguos (mantener últimos 30 días)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completado: $DATE"
```

```bash
# Hacer ejecutable
sudo chmod +x /usr/local/bin/backup-genesispro.sh

# Cron job diario a las 2 AM
sudo crontab -e
# Agregar:
0 2 * * * /usr/local/bin/backup-genesispro.sh >> /var/log/backup-genesispro.log 2>&1
```

### 16.6 PM2 Ecosystem Config

```javascript
// ecosystem.config.js

module.exports = {
  apps: [{
    name: 'genesispro-api',
    script: './src/app.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'uploads', 'logs']
  }]
};
```

### 16.7 CI/CD con GitHub Actions

```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to VPS
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        script: |
          cd /var/www/genesispro-backend
          git pull origin main
          npm install --production
          pm2 restart genesispro-api
          pm2 save
```

### 16.8 Deploy de App Móvil

**iOS (App Store):**
```bash
# Build para producción
expo build:ios

# Configurar en app.json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.genesispro.app",
      "buildNumber": "1.0.0"
    }
  }
}

# Subir a App Store Connect
# Seguir proceso de revisión de Apple
```

**Android (Google Play):**
```bash
# Build para producción
expo build:android -t app-bundle

# Configurar en app.json
{
  "expo": {
    "android": {
      "package": "com.genesispro.app",
      "versionCode": 1
    }
  }
}

# Subir a Google Play Console
# Seguir proceso de revisión de Google
```

---

## 17. MÉTRICAS DE ÉXITO

### 17.1 KPIs Técnicos

**Performance:**
- ⏱️ Tiempo de respuesta promedio: < 200ms
- 📊 Uptime: > 99.5%
- 🚀 Tiempo de carga de app: < 2 segundos
- 💾 Uso de memoria: < 1GB por instancia
- 🔄 Error rate: < 1%

**Monitoreo:**
```javascript
// Middleware de métricas
const responseTime = require('response-time');

app.use(responseTime((req, res, time) => {
  // Log a analytics
  console.log(`${req.method} ${req.url} - ${time}ms`);
  
  // Alert si > 1000ms
  if (time > 1000) {
    console.warn(`Slow request: ${req.url} - ${time}ms`);
  }
}));
```

### 17.2 KPIs de Negocio

**Usuarios:**
- 📱 Usuarios registrados: 500 en 6 meses
- 💰 Conversión free→paid: 15%
- 🔄 Retention (30 días): > 60%
- ❌ Churn mensual: < 10%
- 👥 DAU (Daily Active Users): > 100

**Financieros:**
- 💵 MRR (Monthly Recurring Revenue): $20,000 MXN (mes 6)
- 📈 ARR (Annual Recurring Revenue): $240,000 MXN (año 1)
- 💳 LTV (Lifetime Value): > $2,000 MXN
- 📊 CAC (Customer Acquisition Cost): < $500 MXN
- 🎯 LTV:CAC ratio: > 3:1

**Engagement:**
- 🐔 Aves creadas/usuario/mes: > 5
- ⚔️ Combates registrados/semana: > 50
- 📸 Fotos subidas/día: > 100
- 📊 Sesiones/usuario/semana: > 3
- ⏰ Tiempo promedio en app: > 10 min/sesión

### 17.3 Dashboard de Métricas

```javascript
// Endpoint de métricas (Admin only)
router.get('/admin/metrics', authenticateJWT, isAdmin, async (req, res) => {
  const metrics = {
    usuarios: {
      total: await db.query('SELECT COUNT(*) FROM usuarios'),
      activos: await db.query('SELECT COUNT(*) FROM usuarios WHERE ultimo_acceso > NOW() - INTERVAL \'30 days\''),
      nuevos_mes: await db.query('SELECT COUNT(*) FROM usuarios WHERE fecha_registro > NOW() - INTERVAL \'30 days\'')
    },
    aves: {
      total: await db.query('SELECT COUNT(*) FROM aves WHERE activo = true'),
      creadas_mes: await db.query('SELECT COUNT(*) FROM aves WHERE created_at > NOW() - INTERVAL \'30 days\'')
    },
    combates: {
      total: await db.query('SELECT COUNT(*) FROM combates'),
      mes: await db.query('SELECT COUNT(*) FROM combates WHERE fecha_combate > NOW() - INTERVAL \'30 days\'')
    },
    suscripciones: {
      activas: await db.query('SELECT COUNT(*) FROM suscripciones WHERE estado = \'activa\''),
      mrr: await db.query(`
        SELECT SUM(
          CASE 
            WHEN s.tipo_pago = 'mensual' THEN p.precio_mensual
            WHEN s.tipo_pago = 'anual' THEN p.precio_anual / 12
          END
        ) as mrr
        FROM suscripciones s
        JOIN planes p ON s.plan_id = p.id
        WHERE s.estado = 'activa'
      `)
    }
  };
  
  res.json(metrics);
});
```

---

## CONCLUSIÓN

Este documento técnico completo proporciona toda la información necesaria para desarrollar **GenesisPro** desde cero hasta producción. 

**Próximos pasos recomendados:**

1. ✅ Revisar y aprobar especificaciones
2. ✅ Configurar repositorios Git
3. ✅ Configurar entorno de desarrollo
4. ✅ Comenzar Fase 1: Backend MVP
5. ✅ Iterar según feedback

**Recursos adicionales:**
- Documentación de API: [Swagger UI]
- Board de Proyecto: [GitHub Projects]
- Slack/Discord para comunicación

---

**Desarrollado por:** Root (AURALINK)  
**Fecha:** Enero 2025  
**Versión:** 1.0.0  
**Licencia:** Propietaria

---

## APÉNDICES

### A. Glosario

- **Ave:** Gallo de combate registrado en el sistema
- **Combate:** Enfrentamiento entre dos aves macho
- **Cruce:** Apareamiento planificado entre macho y hembra
- **Genealogía:** Árbol familiar del ave (padres, abuelos, etc.)
- **ROI:** Return on Investment (retorno de inversión)
- **MRR:** Monthly Recurring Revenue (ingresos recurrentes mensuales)
- **Churn:** Tasa de cancelación de suscripciones

### B. Referencias

- Express.js: https://expressjs.com/
- React Native: https://reactnative.dev/
- PostgreSQL: https://www.postgresql.org/
- Stripe: https://stripe.com/docs
- Firebase: https://firebase.google.com/docs

### C. Contacto y Soporte

- Email técnico: dev@genesispro.com
- Email soporte: soporte@genesispro.com
- Website: https://genesispro.com

---

**FIN DEL DOCUMENTO**
