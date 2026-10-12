# Plan: Panema → SaaS multi-empresa

Front en Vercel · API Node + PostgreSQL en el VPS propio.
Esquema SQL probado en Postgres 16: [db/001_esquema.sql](db/001_esquema.sql) y [db/002_seed_base.sql](db/002_seed_base.sql).

---

## 0. Diagnóstico del estado actual

| Qué hay hoy | Implicancia para el SaaS |
|---|---|
| React 19 + Vite, todo en memoria (`src/data/mock.js`, `src/context/DataContext.jsx`) | No hay persistencia; el `DataContext` es el único punto a reemplazar por llamadas a la API. |
| Listas fijas en código: canales, métodos de pago, categorías, motivos de merma, proveedores como texto | Pasan a ser **tablas por empresa** (cada negocio configura las suyas). |
| Ítems polimórficos `{ tipo: 'producto'|'insumo'|'promo', id }` | En la BD van como **FK separadas** con `CHECK (exactamente una)`, no como "tipo + id" (que no permite FK). |
| Promos con `componentes` y `expandir()` en el front | Tabla `venta_item_componentes`: el desglose queda guardado y las estadísticas por producto se hacen en SQL. |
| Estadísticas calculadas en el navegador sobre todo el historial (`lib/stats.js`, `reportes/datos.js`) | Con datos reales y varios meses esto no escala: se mueven a **consultas SQL agregadas** en la API. |
| Fotos en `localStorage` como dataURL | Pasan a almacenamiento de archivos (disco del VPS o R2/S3) con URL en `productos.imagen_url`. |
| "Eliminar" un registro lo borra | En un SaaS los movimientos se **anulan** (quién, cuándo, por qué); nunca se borran. |
| Sin usuarios ni login | Usuarios, empresas, roles y permisos desde el día 1. |
| El proyecto no es repositorio git | Hacer `git init` antes de empezar. |

**Panema SpA es el tenant n.º 1**: lo que se cotizó ($190.000) se entrega sobre esta arquitectura, sin rehacer después.

---

## 1. Arquitectura

```
 Vercel                          VPS (docker compose)
┌──────────────┐   HTTPS   ┌──────────────────────────────────────┐
│ app.dominio  │ ────────▶ │ Caddy (TLS automático) api.dominio   │
│ React (Vite) │           │   └─▶ API Node/Express  :3000        │
└──────────────┘           │         └─▶ PostgreSQL 16 (red int.) │
                           │ /var/panema/uploads  (fotos)         │
                           │ cron: pg_dump → almacenamiento externo│
                           └──────────────────────────────────────┘
```

Decisiones:

1. **Postgres propio en el VPS en vez de Supabase.** Tienes el VPS; Supabase autoalojado es pesado (una docena de contenedores). Postgres + tu API cubre todo, y RLS funciona igual.
2. **Misma base y mismo esquema para todas las empresas, con `empresa_id` en cada tabla** (no una base ni un esquema por cliente). Es lo más simple de operar, migrar y respaldar para cientos de empresas chicas.
3. **Doble barrera de aislamiento**:
   - La API siempre filtra por `empresa_id`.
   - Postgres aplica **RLS**: la API se conecta como `panema_app` (no es dueño de las tablas) y en cada request hace `SET LOCAL app.empresa_id`. Si un repositorio se olvida del `WHERE`, igual no se filtran datos. Probado: desde la empresa A no se ven, ni se insertan, ni se modifican filas de B.
   - **FK compuestas** `(empresa_id, x_id)`: una venta de A no puede apuntar a un producto de B (probado).
4. **Stack del back** igual que back-rubi (Express 5, ESM, capas `rutas → controladores → servicios → repositorios`), cambiando `supabase-js` por `pg` (node-postgres).
   - Migraciones: `node-pg-migrate` con archivos SQL.
   - Validación: `zod`.
   - Contraseñas: `argon2`.
   - Tokens: `jose` (JWT).
   - Logs: `pino`.
5. **Dominio propio para front y API** (`app.tudominio.cl` en Vercel, `api.tudominio.cl` en el VPS). Así la cookie del refresh token es *same-site*. Con `*.vercel.app` + otro dominio, Safari y Chrome bloquean cookies de terceros y el login falla.

---

## 2. Modelo de datos

### 2.1 Mapa de tablas

```
PLATAFORMA (globales)                 EMPRESA (todas con empresa_id + RLS)
─────────────────────                 ─────────────────────────────────────
planes                                sucursales
usuarios ─┬─ sesiones                 categorias (ambito: producto|insumo|egreso)
          └─ tokens_usuario           canales_venta · metodos_pago · motivos_merma
empresas ─── suscripciones            proveedores · contadores
             └─ pagos_suscripcion     productos ── producto_precios (historial)
permisos                              insumos
roles ── rol_permisos ── permisos     promos ── promo_productos ── productos
empresa_usuarios (usuario↔empresa+rol)
  └─ empresa_usuario_sucursales       ventas ── venta_items ── venta_item_componentes
invitaciones                          egresos ── egreso_items
auditoria                             mermas ── merma_items
```

### 2.2 Usuarios, empresas y roles (el núcleo del SaaS)

```
usuarios ──< empresa_usuarios >── empresas
                   │
                   └──> roles ──< rol_permisos >── permisos
```

- **`usuarios`** es global: una persona, un email, una contraseña.
- **`empresa_usuarios`** es la tabla intermedia N:M y lleva el **rol en esa empresa**. El contador externo puede ser `contador` en 5 panaderías con un solo login; el dueño puede tener 2 negocios.
- **`roles`**:
  - `empresa_id NULL` → roles de sistema (Dueño, Administrador, Encargado, Vendedor, Producción, Contador), compartidos por todas las empresas.
  - `empresa_id` con valor → roles personalizados de esa empresa (plan Pro en adelante).
  - Un trigger impide asignar a un usuario el rol personalizado de otra empresa.
- **`permisos`** es un catálogo fijo definido por el código (`ventas.crear`, `productos.ver_costos`…). La API valida **permisos, nunca nombres de rol**. Así los roles personalizados funcionan sin tocar código.
- **`empresa_usuario_sucursales`**: limita a un usuario a ciertos locales (`todas_sucursales = false`).
- **`invitaciones`**: email + rol + token con vencimiento. Al aceptar, se crea (o se reutiliza) el usuario y su `empresa_usuarios`.
- **`usuarios.es_superadmin`**: tú, para el panel de la plataforma. No pertenece a ninguna empresa.

Matriz de roles de sistema (cargada en el seed):

| Permiso | Dueño | Admin | Encargado | Vendedor | Producción | Contador |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Panel de inicio | ✔ | ✔ | ✔ | | | ✔ |
| Registrar venta | ✔ | ✔ | ✔ | ✔ | | |
| Ver ventas de todos (si no, solo las propias) | ✔ | ✔ | ✔ | | | ✔ |
| Anular ventas | ✔ | ✔ | ✔ | | | |
| Egresos / compras | ✔ | ✔ | ✔ | | registra | ve |
| Merma | ✔ | ✔ | ✔ | registra | ✔ | ve |
| Gestionar productos, insumos y promos | ✔ | ✔ | ✔ | | | |
| Ver costos y márgenes | ✔ | ✔ | ✔ | | | ✔ |
| Ajuste masivo de precios | ✔ | ✔ | | | | |
| Estadísticas e informes PDF | ✔ | ✔ | ✔ | | | ✔ |
| Configuración, sucursales, usuarios, roles | ✔ | ✔ | | | | |
| Suscripción y pagos | ✔ | | | | | |

> `productos.ver_costos` no se puede resolver con RLS (RLS filtra filas, no columnas). La API **no devuelve** `costo` ni márgenes si falta el permiso. No basta con ocultarlos en el front.

### 2.3 Tablas intermedias y por qué cada una

| Tabla intermedia | Relaciona | Datos propios |
|---|---|---|
| `empresa_usuarios` | usuarios N:M empresas | rol, estado, alcance de sucursales |
| `rol_permisos` | roles N:M permisos | — |
| `empresa_usuario_sucursales` | membresía N:M sucursales | — |
| `promo_productos` | promos N:M productos | cantidad |
| `venta_items` | ventas N:M productos/promos | snapshot de nombre, precio, costo, subtotal |
| `venta_item_componentes` | línea promo N:M productos | cantidad y precio prorrateado |
| `egreso_items` | egresos N:M insumos | cantidad, precio unitario |
| `merma_items` | mermas N:M productos/insumos | cantidad, costo |

### 2.4 Reglas de diseño aplicadas

- **Snapshots en las líneas**: `nombre`, `unidad`, `precio_unitario` y `costo_unitario` se copian al vender. El margen histórico queda bien aunque después cambie el costo (hoy `statsProductos` usa el costo *actual*, que distorsiona meses pasados).
- **Dinero**: `numeric(14,2)` + `empresas.decimales` (CLP = 0) para redondear subtotales. Nunca `float`.
- **Cantidades**: `numeric(12,3)` (venta por peso al gramo).
- **Fecha**: `ventas.fecha` (día del negocio, calculado con `empresas.zona_horaria`) + `ocurrido_en timestamptz` (momento exacto). Los índices y reportes usan `fecha`.
- **Correlativos**: `contadores` + `siguiente_numero()` dan el n.º de ticket por empresa, sin carreras entre cajas.
- **Códigos** (101, 501, 901) únicos por empresa solo entre los no eliminados (índice parcial). Se puede reutilizar el código de un producto borrado.
- **Borrado**:
  - Catálogo: `deleted_at` (borrado lógico).
  - Movimientos: `estado = anulada`, con quién, cuándo y motivo.
  - A `panema_app` se le **quitó el permiso DELETE** sobre movimientos (probado).
- **Automatismos en la BD**, probados:
  - Trigger: la compra actualiza `insumos.precio_ultimo`, solo si no es más antigua que la última registrada.
  - Trigger: el cambio de `precio_venta` escribe `producto_precios` con motivo y usuario.
- **Índices** `(empresa_id, fecha desc) WHERE estado = confirmada` en ventas, egresos y mermas: cubren el panel, las estadísticas y los reportes.

---

## 3. Plan de trabajo paso a paso

Cada fase deja algo funcionando y verificable. Las fases 1 a 4 son el mínimo para pasar Panema de mock a producción. Las 5 a 8 convierten el sistema en SaaS vendible.

### Fase 1: Infraestructura y repositorio (1–2 días)

1. `git init` en el front. Crear el repo `back-panema` con la estructura de back-rubi:
   ```
   src/
     config/        db.js (Pool pg), env.js (zod sobre process.env)
     db/            migraciones/ (001_esquema.sql, 002_seed_base.sql…), contexto.js
     middlewares/   auth.js, empresa.js, permiso.js, errores.js, limite.js
     rutas/ controladores/ servicios/ repositorios/
     utilidades/    dinero.js, fechas.js, tokens.js
   ```
2. En el VPS:
   - Instalar Docker y docker compose.
   - Crear `docker-compose.yml` con `postgres:16` (volumen persistente, **sin puerto público**), `api` y `caddy`.
   - Firewall (ufw): solo 22, 80 y 443.
   - SSH solo con llave y fail2ban.
3. DNS: `api.tudominio.cl` → IP del VPS. Caddy saca el certificado solo.
4. Variables de entorno:
   - `DATABASE_URL` (usuario `panema_app`) y `DATABASE_URL_MIGRACIONES` (usuario dueño).
   - `JWT_SECRET`, `CORS_ORIGIN=https://app.tudominio.cl`, `UPLOADS_DIR`.
5. Respaldos desde el día 1:
   - Cron diario con `pg_dump -Fc`, guardado fuera del VPS (Backblaze B2, R2 o similar), con 30 días de retención.
   - Probar una restauración una vez. Un respaldo que nunca se restauró no está probado.
6. Ambientes: base `panema_dev` en local (Docker) y `panema_prod` en el VPS. El front usa `VITE_API_URL` por ambiente en Vercel.

**Listo cuando:** `GET https://api.tudominio.cl/salud` responde 200 y consulta la BD.

### Fase 2: Esquema y aislamiento (1–2 días)

1. Pasar `docs/db/*.sql` a migraciones de `node-pg-migrate`. De aquí en adelante, **cada cambio de esquema es una migración nueva**, nunca se edita una ya aplicada.
2. Correr las migraciones con el usuario dueño. Definir la contraseña de `panema_app`.
3. `src/db/contexto.js`: helper que abre una transacción por request:
   ```js
   export async function conEmpresa({ empresaId, usuarioId }, fn) {
     const cliente = await pool.connect()
     try {
       await cliente.query('begin')
       await cliente.query("select set_config('app.empresa_id', $1, true), set_config('app.usuario_id', $2, true)", [empresaId, usuarioId])
       const r = await fn(cliente)
       await cliente.query('commit')
       return r
     } catch (e) {
       await cliente.query('rollback')
       throw e
     } finally {
       cliente.release()
     }
   }
   ```
   (`set_config(..., true)` equivale a `SET LOCAL` y admite parámetros.)
4. **Tests de aislamiento automáticos** (vitest + BD de test). Pasar [db/pruebas_aislamiento.sql](db/pruebas_aislamiento.sql) a tests:
   - A no ve, no edita y no referencia datos de B.
   - Sin contexto no se ve nada.
   - No se pueden borrar ventas.

   Estos tests corren siempre en CI. Son los más importantes del SaaS.

> Las tablas de plataforma (`usuarios`, `empresas`, `empresa_usuarios`, `sesiones`…) no tienen RLS porque las usa el login antes de que exista una empresa elegida. Solo deben tocarse desde `servicios/auth*` y `servicios/empresa*`, siempre con `WHERE` explícito.

### Fase 3: Autenticación, empresas y permisos (3–4 días)

1. **Registro** (`POST /auth/registro`), en una transacción:
   1. Crea el usuario.
   2. Crea la empresa con un slug único.
   3. Crea `empresa_usuarios` con el rol `dueno`.
   4. Llama a `inicializar_empresa()` (sucursal, canales, métodos de pago, categorías, motivos).
   5. Crea la suscripción `prueba` por 14 días.
   6. Envía el email de verificación.
2. **Login**:
   - `POST /auth/login` → access token JWT de 15 min (`sub = usuario_id`), devuelto en el body y guardado en memoria en el front.
   - Refresh token opaco en cookie `httpOnly; Secure; SameSite=Lax; Domain=.tudominio.cl`, guardado hasheado en `sesiones`.
   - `POST /auth/refresh` rota el refresh token. `POST /auth/logout` revoca la sesión.
   - Recuperar contraseña con `tokens_usuario`.
   - Rate limit en `/auth/*` (por ejemplo, 5 intentos por minuto por IP + email).
3. **Elegir empresa**:
   - `GET /yo` devuelve el usuario y sus empresas, con rol y permisos en cada una.
   - El front manda la empresa activa en el header `X-Empresa-Id`.
4. **Middlewares**, en este orden:
   1. `auth`: verifica el JWT → `req.usuario`.
   2. `empresa`: lee `X-Empresa-Id` y comprueba que exista una membresía activa y que la empresa esté `activa` → `req.empresa` y `req.permisos` (Set). Caché en memoria de unos 60 s por (usuario, empresa), que se invalida al cambiar roles.
   3. `permiso('ventas.crear')` por ruta.
   4. Abre `conEmpresa(...)` y lo deja en `req.db`.
5. **Equipo**:
   - `GET /equipo`, `POST /invitaciones` (verifica `max_usuarios` del plan), `POST /invitaciones/:token/aceptar`.
   - `PATCH /equipo/:id` (rol, estado, sucursales).
   - Regla: siempre debe quedar al menos un dueño activo.
6. **Roles personalizados**: `GET/POST/PATCH /roles` y `GET /permisos`. Se puede dejar para la Fase 7 si apura.
7. **Auditoría**: helper `auditar(req, accion, entidad, id, datos)` para login, invitar, cambiar rol, anular y ajustar precios.

**Listo cuando:** dos empresas de prueba con usuarios de distintos roles reciben 403 donde corresponde y nunca ven datos de la otra.

### Fase 4: API de negocio (5–7 días)

Todas las rutas van con prefijo `/v1`, requieren `auth + empresa`, y validan el body con zod.

**Configuración** (`configuracion.gestionar`):
- `GET /config` devuelve en una sola llamada canales, métodos de pago, categorías, motivos, sucursales y proveedores (lo que hoy importa `mock.js`).
- CRUD de cada lista. Se desactivan (`activo = false`) en vez de borrarse si ya tienen movimientos.

**Catálogo:**
- `GET/POST/PATCH/DELETE /productos` (`productos.*`):
  - `costo` sale solo con `productos.ver_costos`.
  - `DELETE` es lógico.
  - `GET /productos/siguiente-codigo`.
  - Antes de crear, verificar `max_productos` del plan.
- `POST /productos/ajuste-precios` (`precios.ajustar`): body `{ cambios: [{id, precio}], motivo }`, en una transacción con `set_config('app.motivo_precio', motivo, true)`. El trigger arma el historial.
- `GET /productos/:id/historial-precios`.
- `POST /productos/:id/imagen`:
  - Recibe multipart, valida tipo y tamaño (máx. 5 MB).
  - Convierte a webp con `sharp` (800 px) y guarda en `UPLOADS_DIR/{empresa_id}/{producto_id}.webp`.
  - Caddy sirve `/uploads` con caché.
  - Si después se quiere escalar, se cambia por R2 sin tocar el front.
- `insumos` y `promos` siguen el mismo patrón. Las promos se guardan con `promo_productos` en una transacción. `precioNormal` se calcula en SQL.

**Movimientos:**
- `POST /ventas` (`ventas.crear`), en una transacción:
  1. Recibe solo `[{producto_id | promo_id, cantidad, precio_unitario?}]`, canal y método de pago.
  2. **El servidor relee precios y costos del catálogo.** Solo acepta un precio distinto si el usuario tiene un permiso para eso (por ejemplo, agregar `ventas.modificar_precio`).
  3. Calcula subtotales con los decimales de la empresa.
  4. Desglosa las promos en `venta_item_componentes` (lógica de `componentesPromo`).
  5. Asigna `numero` con `siguiente_numero()` y `fecha` en la zona horaria de la empresa.
  6. Guarda `total`.
- **Idempotencia**: header `Idempotency-Key` desde el front, para que un doble clic o un reintento con mala señal no duplique la venta. Opcional: tabla `idempotencia(empresa_id, clave, respuesta)` o un `unique` en `ventas`.
- `GET /ventas?desde&hasta&canal&usuario&pagina`: paginado por cursor. Sin `ventas.ver_todas`, filtra por `usuario_id = yo`.
- `POST /ventas/:id/anular` (`ventas.anular`, con motivo obligatorio).
- `POST /egresos`:
  - Si la categoría tiene `con_items`, exige líneas de insumos y proveedor.
  - Si no, exige monto y descripción.
  - El trigger actualiza el precio de los insumos.
- `POST /mermas`: los productos se valorizan a `costo` y los insumos a `precio_ultimo`, ambos leídos en el servidor.

**Listo cuando:** se puede usar Panema completo con Postman o con tests de integración.

### Fase 5: Estadísticas y reportes en el servidor (3–4 días)

Pasar `lib/stats.js` y `reportes/datos.js` a SQL. Cada endpoint recibe `desde`, `hasta` y opcionalmente `sucursal_id`, y devuelve los datos listos para graficar:

| Endpoint | Reemplaza a | SQL base |
|---|---|---|
| `GET /resumen` | `Inicio.jsx` (totales + período anterior) | `sum(total)` de ventas, egresos y mermas en ambos rangos |
| `GET /estadisticas/serie` | `serie()` / `tramos()` | `date_bin` o `generate_series` + `left join` agrupando por día o semana |
| `GET /estadisticas/mensual` | `porMes()` | `date_trunc('month', fecha)` |
| `GET /estadisticas/dia-semana` | `porDiaSemana()` | `extract(isodow …)` con promedio por día distinto |
| `GET /estadisticas/top-productos` | `topItems()` / `statsProductos()` | `union all` de `venta_items` (producto) y `venta_item_componentes` |
| `GET /estadisticas/canales`, `/egresos-por-categoria` | `agrupar()` | `group by` |
| `GET /productos/:id/estadisticas` | `ItemDetalle.jsx` | incluye "se venden juntos": self-join de `venta_items` por `venta_id` |
| `GET /insumos/:id/compras` | `statsInsumos()` | evolución del precio desde `egreso_items` |

- Margen = `precio − costo_unitario` **del snapshot**.
- Ticket promedio = `avg(total)`.
- Los PDF pueden seguir armándose en el front con `@react-pdf` a partir de estos endpoints. No hace falta mover la generación al servidor.
- Si con muchas empresas alguna consulta pasa de ~200 ms: crear una tabla `resumen_diario(empresa_id, fecha, ventas, egresos, merma, tickets)` actualizada por trigger o por un cron nocturno. **No hacerlo antes de medir.**

### Fase 6: Adaptar el front (4–5 días)

1. Agregar `@tanstack/react-query` y un cliente `src/lib/api.js`:
   - `fetch` con `VITE_API_URL`, `Authorization` y `X-Empresa-Id`.
   - Ante un 401, reintenta una vez después de `/auth/refresh`.
2. Partir `DataContext` en:
   - `AuthContext`: usuario, empresas, empresa activa, `puede(permiso)`.
   - Hooks de datos: `useProductos()`, `useVentas(rango)`, `useResumen(rango)`, `useRegistrarVenta()`…
   - Mantener los nombres de lo que consumen las páginas para tocar poco cada una.
3. Pantallas nuevas:
   - Login, registro, recuperar contraseña, aceptar invitación.
   - Selector de empresa.
   - Equipo y roles.
   - Configuración (listas, sucursales).
   - Mi plan.
4. UI por permisos:
   - Ocultar menús y botones según `puede()`. Es comodidad; la seguridad real está en la API.
   - Columnas de costo y margen solo con `productos.ver_costos`.
5. Reemplazar las constantes de `mock.js` (`METODOS_PAGO`, `CATEGORIAS_*`…) por `GET /config`. `HOY` pasa a ser la fecha real.
6. Venta rápida: actualización optimista + `Idempotency-Key`, y que la confirmación grande no espere a que se recarguen las listas.
7. En Vercel: `VITE_API_URL` por ambiente y dominio `app.tudominio.cl`.
8. Mantener `mock.js` solo como datos de demo (seed de una empresa "Demo" para mostrar a clientes nuevos).

### Fase 7: Carga de Panema y salida a producción (1–2 días)

1. Script `scripts/importar-catalogo.js` que lee CSV o Excel (productos, insumos, promos) y los inserta en la empresa Panema. Es la "carga inicial" del presupuesto.
2. Crear la cuenta del dueño de Panema e invitar al equipo con sus roles.
3. Checklist:
   - Respaldo probado.
   - HTTPS.
   - CORS solo hacia `app.tudominio.cl`.
   - Rate limits.
   - Logs sin contraseñas ni tokens.
   - Monitoreo de uptime (UptimeRobot o Better Stack sobre `/salud`).
   - Alertas de disco del VPS.
4. Capacitación y período de corrección de 30 días.

### Fase 8: Monetización y plataforma (cuando haya un segundo cliente)

> **Panema SpA, la empresa fundadora:** tiene contrato indefinido y sin costo, con el plan interno "Fundador" y sin fecha de vencimiento. Usa el sistema **como su desarrollo propio**, así que nunca debe ver planes, pruebas, pagos, límites ni la palabra "suscripción". El back marca estas empresas con `modoPropio: true` en `/v1/auth/yo`. Toda pantalla o aviso de facturación del front tiene que ocultarse cuando `modoPropio` es `true`.

1. **Planes y límites**: middleware `limite('usuarios' | 'productos' | 'sucursales')` que compara contra `planes`. Las funciones premium (roles personalizados, varias sucursales) se controlan por plan.
2. **Cobro con MercadoPago** (ya lo usas en back-rubi), con suscripciones o preapproval:
   - Webhook → `pagos_suscripcion` (idempotente por `proveedor_ref`) → actualiza `suscripciones`.
   - Cron diario: las vencidas pasan a `vencida`. Después de X días de gracia, la empresa queda `suspendida` (solo lectura, con un aviso en el front).
3. **Panel de superadmin** (`/admin`, solo `es_superadmin`):
   - Empresas, planes, estado y uso.
   - Suspender o reactivar.
   - Usa una conexión aparte con un rol con `BYPASSRLS`. Nunca el de la API normal.
4. **Onboarding**: empresa demo con datos de ejemplo, un asistente de primeros pasos y un importador CSV accesible para cada cliente.
5. **Legal y datos**:
   - Términos y política de privacidad.
   - Exportar los datos de una empresa (CSV).
   - Eliminar una empresa: `deleted_at` y purga a los N días.

---

## 4. Riesgos y cómo se cubren

| Riesgo | Mitigación |
|---|---|
| Fuga de datos entre empresas | RLS + FK compuestas + tests de aislamiento en CI |
| El precio de la venta lo manipula el cliente | El servidor relee precios y costos del catálogo |
| Ventas duplicadas por mala conexión | `Idempotency-Key` |
| Pérdida del VPS | `pg_dump` diario fuera del VPS + restauración probada; las fotos también se respaldan |
| Cookies bloqueadas entre Vercel y el VPS | Mismo dominio raíz para app y api |
| Estadísticas lentas al crecer | Índices por `(empresa_id, fecha)`; `resumen_diario` solo si se mide lentitud |
| Cambiar permisos rompe código | La API verifica permisos, nunca nombres de rol |

## 5. Orden y tiempos estimados

| Fase | Días | Resultado |
|---|---|---|
| 1. Infraestructura | 1–2 | API y BD vivas en el VPS con respaldos |
| 2. Esquema + RLS | 1–2 | Migraciones y tests de aislamiento |
| 3. Auth + roles | 3–4 | Login, empresas, invitaciones, permisos |
| 4. API de negocio | 5–7 | Catálogo y movimientos completos |
| 5. Estadísticas | 3–4 | Panel, estadísticas y reportes desde SQL |
| 6. Front | 4–5 | App conectada, con login y permisos |
| 7. Panema en producción | 1–2 | Primer cliente operando |
| 8. SaaS (cobro, admin) | 5+ | Listo para vender a otros negocios |

**Total hasta tener Panema en producción multi-empresa: ~3–4 semanas.** El cobro y el panel de admin vienen después, cuando haya un segundo cliente.
