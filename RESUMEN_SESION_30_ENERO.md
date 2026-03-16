# Resumen Sesion 30 de Enero 2026

## Problemas Resueltos

### 1. VirtualBox en Servidor Aura
- **Problema:** Error "kernel driver not installed (rc=-1908)"
- **Solucion:** Cargar modulos del kernel de VirtualBox
  ```bash
  sudo modprobe vboxdrv
  sudo modprobe vboxnetflt
  sudo modprobe vboxnetadp
  ```
- **Resultado:** VM GenesisPro iniciada correctamente

### 2. Compatibilidad Expo Go
- **Problema:** Error "TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could not be found"
- **Causa:** Incompatibilidad de versiones entre el proyecto y Expo Go
- **Solucion:** Actualizar dependencias a las versiones esperadas por Expo Go:
  - react@19.1.0
  - react-native@0.81.5
  - expo@54.0.32

### 3. URL del API
- **Problema:** La app usaba URL local `http://15.1.1.30:3000/api/v1`
- **Solucion:** Cambiar a URL publica `https://api.genesispro.vip/api/v1`

### 4. App de Rork
- **Problema:** El servidor tenia una app diferente a la creada con Rork
- **Solucion:** Subir mobile-rork al servidor
- **Dependencia faltante:** Instalar `zod` para @rork-ai/toolkit-sdk

## Estado Actual del Servidor

### Servicios PM2
| Servicio | Estado | Puerto |
|----------|--------|--------|
| genesispro-api | Online | 3000 |
| cloudflare-tunnel | Online | - |
| genesispro-expo | Online | 8082 |

### URLs de Acceso
- **API:** https://api.genesispro.vip/api/v1
- **Expo Tunnel:** exp://xp7UUQI-anonymous-8082.exp.direct (cambia en cada reinicio)

### Credenciales de Prueba
- **Email:** demo@genesispro.vip
- **Password:** [REDACTED]

## Estructura del Proyecto en Servidor

```
/home/genesispro/
├── mobile/              # App movil (mobile-rork)
│   ├── app/            # Pantallas (expo-router)
│   ├── context/        # Contexts (Auth, Aves, Combates, etc.)
│   ├── services/       # API service
│   ├── assets/         # Imagenes y logo
│   └── package.json
├── backend/            # API Node.js + Express
└── mobile-backup-old/  # Backup de la app anterior
```

## Configuracion de Red

| Servidor | IP ZeroTier | IP Local | Usuario | Password |
|----------|-------------|----------|---------|----------|
| Aura (Host) | 10.147.17.155 | - | aura | 1234 |
| GenesisPro (VM) | 10.147.17.220 | 15.1.1.30 | genesispro | 1234 |

## Notas Importantes

1. **Tunel ngrok:** Es inestable, se desconecta frecuentemente. Considerar alternativas.
2. **Rutas faltantes:** La app de Rork no tiene pantallas de login/register propias, usa el context de Auth.
3. **Logo:** Copiado a `/home/genesispro/mobile/assets/images/logo.png`

## Para Continuar

1. Implementar pantallas de login/register en la app de Rork
2. Agregar el logo a la interfaz
3. Probar todas las funcionalidades (CRUD aves, combates, salud, alimentacion)
4. Considerar usar EAS Build para generar APK

## Comandos Utiles

```bash
# Conectar al servidor GenesisPro
ssh genesispro@10.147.17.220

# Ver estado de servicios
pm2 status

# Ver logs de Metro
pm2 logs genesispro-expo --lines 50

# Reiniciar Metro con tunel
pm2 restart genesispro-expo

# Iniciar VM desde Aura
plink -ssh -pw 1234 -batch aura@10.147.17.155 "vboxmanage startvm genesispro --type headless"
```
