# Checklist de entrega: Panema en producción (Fase 7)

Revisión hecha el 12/10/2026. ✅ hecho · ⚠️ pendiente · ⏸️ postergado por decisión del cliente.

## 1. Datos y respaldos (antes de cargar datos reales)

- ✅ **Respaldo diario de la base** en Coolify (`0 4 * * *` UTC, 14 copias). El primero se hizo el 12/10 y se **restauró en una base de prueba**: quedó idéntico a producción.
- ⏸️ **Copia fuera del VPS** (Backblaze B2 o Cloudflare R2), postergada por decisión del cliente. Sin ella, perder el VPS significa perder los respaldos. Mientras tanto se puede bajar a mano el último `.dmp` de `/data/coolify/backups/` una vez por semana.
- ⏸️ **Respaldo de las fotos de productos**, postergado. El respaldo de Coolify cubre solo la base, no el volumen `/app/uploads`. Propuesta: una tarea diaria en el VPS que comprima el volumen y guarde 14 copias junto a los respaldos de la base.
- ⏸️ Bajar el límite de subida de fotos de 1,5 MB a 500 KB (el front ya las reduce a unos 30–60 KB).
- ✅ La base no está expuesta a internet (puerto 5432 cerrado).
- ✅ Disco: 50 % usado (19 GB libres).

## 2. Seguridad del servidor

- ✅ **Panel de Coolify con HTTPS:** `https://coolify.116.203.244.65.sslip.io` (certificado de Let's Encrypt; HTTP redirige a HTTPS). Entrar siempre por esa URL, nunca por `http://IP:8000`.
- ⚠️ **2FA en Coolify:** Profile → Two-factor Authentication. Todavía no está activado.
- ⏸️ **Firewall de Hetzner** (solo 22, 80 y 443 entrantes), postergado. Los puertos 8000, 6001 y 6002 siguen abiertos; el riesgo baja con 2FA y entrando siempre por la URL con HTTPS.
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
