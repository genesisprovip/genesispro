# GenesisPro - Prompt para Google Stitch

## Descripción del Proyecto

Diseña una aplicación móvil premium llamada **"GenesisPro"** para la gestión profesional de aves de corral de alto rendimiento. La app está dirigida a criadores que necesitan registrar, rastrear y analizar su inventario de aves, incluyendo genealogía, salud, alimentación y rendimiento en competencias.

---

## Identidad Visual

### Concepto
- **Nombre:** GenesisPro
- **Tagline:** "Gestión Avícola Profesional"
- **Personalidad:** Profesional, confiable, tradicional pero moderno, premium
- **Audiencia:** Criadores profesionales, 30-60 años, usuarios de campo

### Paleta de Colores

```
PRIMARY
- Main: #8B4513 (Saddle Brown - tierra/tradición)
- Dark: #6B3410 (para estados pressed)
- Light: #A65D2E (para acentos)

BACKGROUND
- Base: #0F0F1A (casi negro con tinte azul)
- Card: #1A1A2E (azul marino profundo)
- Elevated: #252542 (para modales/sheets)

ACCENT
- Gold: #D4AF37 (dorado - premium/éxito)
- Gold Light: #F4D03F (para highlights)

SEMANTIC
- Success: #27AE60 (verde esmeralda)
- Warning: #F39C12 (ámbar)
- Error: #E74C3C (rojo coral)
- Info: #3498DB (azul cielo)

NEUTRAL
- Text Primary: #FFFFFF
- Text Secondary: #9E9E9E
- Text Muted: #6B6B6B
- Border: #2D2D4A
- Divider: #1F1F35

GENDER (para aves)
- Male: #3498DB (azul)
- Female: #E91E63 (rosa/magenta)
```

### Tipografía
- **Headings:** SF Pro Display / Inter Bold
- **Body:** SF Pro Text / Inter Regular
- **Numbers:** SF Mono / JetBrains Mono (para códigos y estadísticas)

### Iconografía
- Estilo: Outlined, 2px stroke
- Set: Lucide Icons / Feather Icons
- Tamaño mínimo: 24px para touch targets

### Componentes Base
- Border radius: 12px (cards), 8px (inputs), 24px (pills/badges)
- Shadows: Sutiles, blur 20px, opacity 0.15
- Spacing scale: 4, 8, 12, 16, 24, 32, 48

---

## Pantallas a Diseñar

### 1. SPLASH SCREEN
- Logo GenesisPro centrado
- Fondo con gradiente sutil del primary
- Animación de entrada del logo

### 2. LOGIN
- Logo arriba
- Campos: Email, Contraseña
- Botón "Iniciar Sesión" (gradiente primary)
- Link "Crear cuenta"
- Opción "Recordar sesión"

### 3. REGISTRO
- Campos: Nombre, Email, Contraseña, Confirmar contraseña
- Nombre del criadero (opcional)
- Términos y condiciones checkbox
- Botón "Crear Cuenta"

### 4. HOME / DASHBOARD
```
┌─────────────────────────────────┐
│  Header: "Hola, [Nombre]"       │
│  Subtítulo: nombre del criadero │
├─────────────────────────────────┤
│  STATS CARDS (horizontal scroll)│
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ 24  │ │ 18  │ │ 6   │       │
│  │Aves │ │Wins │ │Loss │       │
│  └─────┘ └─────┘ └─────┘       │
├─────────────────────────────────┤
│  RENDIMIENTO (gráfico línea)    │
│  Últimos 6 meses               │
├─────────────────────────────────┤
│  PRÓXIMOS EVENTOS              │
│  • Vacunación - 25 Ene         │
│  • Torneo Regional - 2 Feb     │
├─────────────────────────────────┤
│  ACCIONES RÁPIDAS              │
│  [+ Ave] [+ Combate] [+ Salud] │
└─────────────────────────────────┘
```

### 5. LISTA DE AVES
```
┌─────────────────────────────────┐
│  Header: "Mis Aves"     [🔍][+] │
├─────────────────────────────────┤
│  Filtros: [Todos▼] [Estado▼]   │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │ 🔵 GP-2026-0001            ││
│  │ ┌────┐ "El Campeón"        ││
│  │ │foto│ Giro • Kelso        ││
│  │ └────┘ Lote: 9 • 2.3kg     ││
│  │         [Activo] [Venta]   ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ 🔴 GP-2026-0002            ││
│  │ ┌────┐ "La Reina"          ││
│  │ │foto│ Colorado • Hatch    ││
│  │ └────┘ Lote: 3 • 1.8kg     ││
│  │         [Activo]           ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### 6. FORMULARIO NUEVA AVE (★ PANTALLA CLAVE ★)

```
┌─────────────────────────────────┐
│  ← Nueva Ave              [✓]  │
├─────────────────────────────────┤
│         ┌──────────┐            │
│         │  + Foto  │            │
│         │    📷    │            │
│         └──────────┘            │
├─────────────────────────────────┤
│  INFORMACIÓN BÁSICA             │
│                                 │
│  Código de Identidad            │
│  ┌─────────────────────────────┐│
│  │ Se generará automáticamente ││
│  └─────────────────────────────┘│
│                                 │
│  Sexo                           │
│  ┌──────────┬──────────┐       │
│  │  🔵 Macho │  Hembra  │       │
│  └──────────┴──────────┘       │
│                                 │
│  Fecha Nacimiento    Color      │
│  ┌───────────┐ ┌───────────┐   │
│  │2026-01-22 │ │ Giro      │   │
│  └───────────┘ └───────────┘   │
│                                 │
│  Línea Genética                 │
│  ┌─────────────────────────────┐│
│  │ Kelso                       ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  IDENTIFICACIÓN PERSONAL        │
│                                 │
│  Código Personal   Nombre       │
│  ┌───────────┐ ┌───────────┐   │
│  │ MI-001    │ │El Campeón │   │
│  └───────────┘ └───────────┘   │
│                                 │
│  Marcas en Patas (Lote: 9)     │
│  ┌─────────────────────────────┐│
│  │                             ││
│  │  IZQUIERDA    ⑨   DERECHA  ││
│  │                             ││
│  │   ●──┃──○    ○──┃──●       ││
│  │   1     2    8     4       ││
│  │                             ││
│  │  Toca para marcar           ││
│  └─────────────────────────────┘│
│                                 │
│  Marca en Nariz                 │
│  ┌──────┬──────┬──────┬──────┐ │
│  │  ○○  │  ●○  │  ○●  │  ●●  │ │
│  │Ninguna│ Izq │ Der  │Ambas │ │
│  └──────┴──────┴──────┴──────┘ │
├─────────────────────────────────┤
│  PESO                           │
│                                 │
│  Al nacer (kg)   Actual (kg)   │
│  ┌───────────┐ ┌───────────┐   │
│  │ 0.045     │ │ 2.3       │   │
│  └───────────┘ └───────────┘   │
├─────────────────────────────────┤
│  VENTA                          │
│                                 │
│  ☑ Disponible para venta       │
│                                 │
│  Precio ($)                     │
│  ┌─────────────────────────────┐│
│  │ 150.00                      ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  INFORMACIÓN ADICIONAL          │
│                                 │
│  Criadero de Origen             │
│  ┌─────────────────────────────┐│
│  │ Criadero Los Campeones      ││
│  └─────────────────────────────┘│
│                                 │
│  Notas                          │
│  ┌─────────────────────────────┐│
│  │ Excelente línea genética... ││
│  │                             ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  [Cancelar]  [██ Registrar ██] │
└─────────────────────────────────┘
```

**DETALLE DEL SELECTOR DE MARCAS DE PATAS:**

```
┌───────────────────────────────────────┐
│         Marcas en Patas               │
│         (Número de Lote: 9)           │
│                                       │
│   IZQUIERDA          DERECHA          │
│                                       │
│    ●      ○    ⑨    ○      ●         │
│    ↑      ↑         ↑      ↑         │
│  Afuera Dentro    Dentro Afuera      │
│   (1)   (2)        (8)    (4)        │
│                                       │
│    └──┃──┘          └──┃──┘          │
│       ┃                ┃              │
│     (pata)           (pata)           │
│                                       │
│  ● = Marcado (activo, color primary)  │
│  ○ = Sin marca (inactivo, gris)       │
│  ⑨ = Suma total (badge dorado)        │
└───────────────────────────────────────┘
```

### 7. DETALLE DE AVE
```
┌─────────────────────────────────┐
│  ←                    [✏️][🗑️] │
├─────────────────────────────────┤
│         ┌──────────┐            │
│         │          │            │
│         │  FOTO    │            │
│         │          │            │
│         └──────────┘            │
│                                 │
│      GP-2026-0001               │
│      "El Campeón"               │
│                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │🔵 M │ │Lote9│ │Activo│       │
│  └─────┘ └─────┘ └─────┘       │
├─────────────────────────────────┤
│  [Info] [Combates] [Salud] [Gen]│
├─────────────────────────────────┤
│  Línea: Kelso                   │
│  Color: Giro                    │
│  Peso: 2.3 kg                   │
│  Edad: 8 meses                  │
│  Criadero: Los Campeones        │
│                                 │
│  MARCAS                         │
│  Patas: Lote 9 (Izq●○ Der○●)   │
│  Nariz: Izquierda               │
│                                 │
│  ESTADÍSTICAS                   │
│  Combates: 12 | V:8 D:3 E:1    │
│  Win Rate: 66.7%                │
└─────────────────────────────────┘
```

### 8. LISTA DE COMBATES
```
┌─────────────────────────────────┐
│  Combates               [📊][+] │
├─────────────────────────────────┤
│  Stats: 45V • 12D • 3E (76%)   │
├─────────────────────────────────┤
│  [Todos▼] [Fecha▼]              │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │ 🏆 VICTORIA    22 Ene 2026  ││
│  │ El Campeón vs Adversario    ││
│  │ Rounds: 3 • KO              ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ ❌ DERROTA     18 Ene 2026  ││
│  │ La Reina vs Oponente        ││
│  │ Rounds: 5 • Decisión        ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### 9. NUEVO COMBATE
```
┌─────────────────────────────────┐
│  ← Registrar Combate      [✓]  │
├─────────────────────────────────┤
│  Seleccionar Ave                │
│  ┌─────────────────────────────┐│
│  │ 🔍 Buscar ave...            ││
│  └─────────────────────────────┘│
│                                 │
│  Fecha del Combate              │
│  ┌─────────────────────────────┐│
│  │ 22 Enero 2026               ││
│  └─────────────────────────────┘│
│                                 │
│  Oponente                       │
│  ┌─────────────────────────────┐│
│  │ Nombre o descripción        ││
│  └─────────────────────────────┘│
│                                 │
│  Resultado                      │
│  ┌────────┬────────┬──────────┐│
│  │   🏆   │   ❌   │    🤝    ││
│  │Victoria│Derrota │  Empate  ││
│  └────────┴────────┴──────────┘│
│                                 │
│  Rounds    Método               │
│  ┌──────┐  ┌──────────────┐    │
│  │  3   │  │ KO          ▼│    │
│  └──────┘  └──────────────┘    │
│                                 │
│  Notas                          │
│  ┌─────────────────────────────┐│
│  │ Descripción del combate...  ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  [██████ Guardar ██████]       │
└─────────────────────────────────┘
```

### 10. SALUD
```
┌─────────────────────────────────┐
│  Salud                      [+] │
├─────────────────────────────────┤
│  [Vacunas] [Tratamientos] [Med] │
├─────────────────────────────────┤
│  Próximas vacunas               │
│  ┌─────────────────────────────┐│
│  │ 💉 Newcastle - 25 Ene       ││
│  │    El Campeón, La Reina     ││
│  └─────────────────────────────┘│
│                                 │
│  Historial reciente             │
│  ┌─────────────────────────────┐│
│  │ ✓ Vitaminas - 20 Ene        ││
│  │   Aplicado a 12 aves        ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### 11. TAB BAR (Navegación)
```
┌─────────────────────────────────┐
│  🏠      🐓      ⚔️      💊    ≡ │
│ Inicio  Aves  Combates Salud Más│
└─────────────────────────────────┘

- Tab activo: icono dorado + label
- Tab inactivo: icono gris
- Badge rojo para notificaciones
```

### 12. MÁS (Menú)
```
┌─────────────────────────────────┐
│  Menú                           │
├─────────────────────────────────┤
│  👤 Mi Perfil                 > │
│  📅 Calendario                > │
│  🍽️ Alimentación              > │
│  📊 Reportes                  > │
│  ⚙️ Configuración             > │
│  ❓ Ayuda                     > │
├─────────────────────────────────┤
│  🚪 Cerrar Sesión               │
└─────────────────────────────────┘
```

---

## Estados y Microinteracciones

### Estados de Botones
- Default: Color sólido
- Pressed: 10% más oscuro
- Disabled: 50% opacidad
- Loading: Spinner + texto "Cargando..."

### Estados de Cards
- Default: Elevación sutil
- Pressed: Escala 0.98
- Selected: Borde dorado

### Feedback
- Success: Toast verde con checkmark
- Error: Toast rojo con X
- Loading: Skeleton screens

### Animaciones
- Transiciones: 200ms ease-out
- Modales: Slide up + fade
- Listas: Stagger animation al cargar

---

## Responsive Considerations

- Safe areas para notch/dynamic island
- Teclado: Inputs se elevan cuando el teclado aparece
- Landscape: No requerido (portrait only)
- Tamaños de fuente accesibles (mínimo 14px)
- Touch targets mínimo 44x44px

---

## Assets Requeridos

1. Logo GenesisPro (SVG)
2. Iconos de navegación
3. Ilustración empty state (sin aves)
4. Placeholder de foto de ave
5. Iconos de resultados (victoria/derrota/empate)
6. Badges de estado (activo/vendido/muerto/retirado)

---

## Entregables Esperados

1. **10-12 pantallas en alta fidelidad** (iPhone 14 Pro frame)
2. **Sistema de componentes** (botones, inputs, cards, badges)
3. **Flujo de usuario** para registro de ave nueva
4. **Prototipo interactivo** del selector de marcas de patas

---

*GenesisPro - Gestión Avícola Profesional*
*"Tradición y tecnología para el criador moderno"*
