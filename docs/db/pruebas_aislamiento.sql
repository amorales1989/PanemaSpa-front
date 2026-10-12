-- Pruebas manuales. Correr: test_setup (como postgres) y luego test_app (como panema_app)
-- ===== test_setup.sql =====
\set ON_ERROR_STOP 1
-- dos empresas + usuario
insert into usuarios (id, email, nombre) values ('00000000-0000-0000-0000-0000000000a1','dueno@panema.cl','Dueño');
insert into empresas (id, nombre, slug) values ('00000000-0000-0000-0000-00000000000a','Panema','panema'),('00000000-0000-0000-0000-00000000000b','Otra','otra');
insert into empresa_usuarios (empresa_id, usuario_id, rol_id) select '00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a1', id from roles where codigo='dueno';
alter role panema_app password 'x';

-- ===== test_app.sql =====
\set ON_ERROR_STOP 1
begin;
set local app.empresa_id = '00000000-0000-0000-0000-00000000000b';
select inicializar_empresa('00000000-0000-0000-0000-00000000000b');
insert into productos (id, empresa_id, codigo, nombre, unidad, precio_venta) values ('00000000-0000-0000-0000-0000000000b9','00000000-0000-0000-0000-00000000000b',101,'Producto de B','un',1000);
commit;
begin;
set local app.empresa_id = '00000000-0000-0000-0000-00000000000a';
set local app.usuario_id = '00000000-0000-0000-0000-0000000000a1';
select inicializar_empresa('00000000-0000-0000-0000-00000000000a');
insert into productos (id, empresa_id, codigo, nombre, unidad, precio_venta, costo) values ('00000000-0000-0000-0000-0000000000a9','00000000-0000-0000-0000-00000000000a',101,'Marraqueta','kg',2490,1100);
insert into insumos (id, empresa_id, codigo, nombre, unidad, precio_ultimo) values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000000a',501,'Harina','kg',880);
select 'productos visibles para A' as t, count(*) from productos;
-- venta
with v as (
  insert into ventas (empresa_id, sucursal_id, numero, fecha, canal_id, metodo_pago_id, total, usuario_id)
  select app_empresa(), (select id from sucursales), siguiente_numero(app_empresa(),'venta'), current_date,
         (select id from canales_venta where nombre='Mostrador'), (select id from metodos_pago where nombre='Efectivo'), 2490, app_setting
  from (select current_setting('app.usuario_id')::uuid app_setting) s returning id)
insert into venta_items (empresa_id, venta_id, producto_id, nombre, unidad, cantidad, precio_unitario, costo_unitario, subtotal)
select app_empresa(), v.id, '00000000-0000-0000-0000-0000000000a9','Marraqueta','kg',1,2490,1100,2490 from v;
-- compra actualiza precio insumo
with e as (
  insert into egresos (empresa_id, sucursal_id, fecha, categoria_id, metodo_pago_id, total, usuario_id)
  select app_empresa(), (select id from sucursales), current_date, (select id from categorias where ambito='egreso' and nombre='Insumos'),
         (select id from metodos_pago where nombre='Transferencia'), 45000, current_setting('app.usuario_id')::uuid returning id)
insert into egreso_items (empresa_id, egreso_id, insumo_id, nombre, unidad, cantidad, precio_unitario, subtotal)
select app_empresa(), e.id, '00000000-0000-0000-0000-0000000000c1','Harina','kg',50,900,45000 from e;
select 'precio harina' t, precio_ultimo from insumos;
-- historial de precio
set local app.motivo_precio = 'Ajuste +4%';
update productos set precio_venta = 2590 where codigo = 101;
select 'historial' t, precio_anterior, precio_nuevo, motivo, usuario_id is not null as con_usuario from producto_precios;
commit;
-- ataques
begin;
set local app.empresa_id = '00000000-0000-0000-0000-00000000000a';
savepoint s1;
\set ON_ERROR_STOP 0
-- referenciar producto de B desde venta de A
insert into venta_items (empresa_id, venta_id, producto_id, nombre, unidad, cantidad, precio_unitario, subtotal)
select app_empresa(), (select id from ventas limit 1), '00000000-0000-0000-0000-0000000000b9','x','un',1,1,1;
rollback to s1;
-- insertar con empresa_id de B
insert into productos (empresa_id, codigo, nombre, unidad, precio_venta) values ('00000000-0000-0000-0000-00000000000b',999,'hack','un',1);
rollback to s1;
-- borrar una venta
delete from ventas;
rollback to s1;
update productos set nombre='hack' where id='00000000-0000-0000-0000-0000000000b9';
select 'filas de B tocadas desde A (debe 0)' t, count(*) from productos where id='00000000-0000-0000-0000-0000000000b9';
rollback;
-- sin empresa seteada
select 'sin contexto ve productos (debe 0)' t, count(*) from productos;
