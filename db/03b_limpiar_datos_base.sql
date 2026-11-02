-- 03b_limpiar_datos_base.sql — borra SOLO las filas que cargo 03_datos_base.sql (VRESCRE = 'migracion').
-- EJECUTAR COMO USE_MEDHA antes de volver a correr 03_datos_base.sql. Alt+X.
-- Si algun cliente/tipo ya tiene expedientes, el DELETE falla con ORA-02292: en ese caso desactivalo (NESTADO = 2) en vez de borrar.
DELETE FROM AQUA_VARIANTE_REFERENCIA WHERE VRESCRE = 'migracion';
DELETE FROM AQUA_SEDE WHERE VRESCRE = 'migracion';
DELETE FROM AQUA_CLIENTE WHERE VRESCRE = 'migracion';
DELETE FROM AQUA_TIPO_PRODUCTO WHERE VRESCRE = 'migracion';
DELETE FROM AQUA_MARCA WHERE VRESCRE = 'migracion';
DELETE FROM AQUA_FABRICANTE WHERE VRESCRE = 'migracion';
DELETE FROM AQUA_PAIS_ORIGEN WHERE VRESCRE = 'migracion';
COMMIT;
