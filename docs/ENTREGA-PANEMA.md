# Checklist de entrega: Panema en producción (Fase 7)

Revisión hecha el 12/10/2026. ✅ hecho · ⚠️ pendiente.

## 1. Datos y respaldos (antes de cargar datos reales)

- ⚠️ **Respaldos automáticos de la base.** Hoy hay **0 respaldos programados**. En Coolify:
  1. **Settings → S3 Storages → + Add**. Cloudflare R2 da 10 GB gratis: crear un bucket `panema-respaldos` y un token de API con permiso de lectura y escritura sobre ese bucket.
  2. Recurso de la base → **Backups → + Add**, con frecuencia `0 4 * * *` (todos los días a las 4:00) y **Save to S3** activado.
  3. Ejecutar un respaldo a mano y **probar la restauración** una vez, en una base de prueba.
- ✅ La base no está expuesta a internet (puerto 5432 cerrado).
- ✅ Disco: 50 % usado (19 GB libres).

## 2. Seguridad del servidor

- ⚠️ **Panel de Coolify en `http://IP:8000`, sin HTTPS.** La contraseña del panel viaja sin cifrar.
  1. Coolify → **Settings → Instance's Domain**: `https://coolify.116.203.244.65.sslip.io` (o un subdominio propio). Guardar y entrar por esa URL.
  2. Activar **2FA** en el perfil de Coolify.
  3. Después, cerrar los puertos 8000, 6001 y 6002 con el firewall (punto siguiente).
- ⚠️ **Firewall inactivo.** En la consola de Hetzner: **Firewalls → Create** con solo los puertos 22, 80 y 443 entrantes (TCP), aplicado al servidor. Hacerlo después de mover Coolify a HTTPS.
- ⚠️ **SSH acepta contraseña con root.** Ya entra con llave desde el notebook de desarrollo. Pasos:
  1. Agregar una segunda llave de respaldo (otro equipo) en `/root/.ssh/authorized_keys`.
  2. En `/etc/ssh/sshd_config.d/50-cloud-init.conf`, poner `PasswordAuthentication no` y ejecutar `systemctl reload ssh`.
  3. Si alguna vez se pierde el acceso, queda la consola web de Hetzner.
- ✅ API: HTTPS con redirección, HSTS, CSP, nosniff, CORS solo para el front, puerto 3000 cerrado.
- ✅ Sesiones: cookie httpOnly y `Secure` en producción, token de 15 min, renovación rotativa y límite de intentos de login.
- ✅ Aislamiento entre empresas: RLS en la base + tests automáticos.

## 3. Monitoreo

- ⚠️ **Aviso si la app se cae.** UptimeRobot (gratis): monitor HTTP(s) a `https://panema-spa.vercel.app/api/salud` cada 5 min, con aviso por email o Telegram.
- ⚠️ Mirar los logs del back en Coolify la primera semana.

## 4. Panema

- ✅ Empresa Panema con plan Fundador, contrato indefinido, sin ver planes ni suscripción.
- ✅ Cuenta del dueño: `panema@panema.cl`.
- ⚠️ **Cargar el catálogo real:** Configuración → Importar catálogo → descargar la plantilla, completarla y subirla.
- ⚠️ **Revisar las listas** (canales, medios de pago, categorías de egresos) en Configuración → Listas.
- ⚠️ **Crear el equipo** (Configuración → Equipo) y entregar a cada persona su usuario y su contraseña temporal.
- ⚠️ **Capacitación** (sesión guiada): registrar venta (tecla V, código + Enter, venta por peso), egreso o compra, merma, anular, informes PDF.
- ⚠️ 30 días de corrección de errores sin costo desde la entrega (según el presupuesto).
