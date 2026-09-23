-- Migración para bases de datos existentes: permite que la clínica cierre un caso
-- cuando el trabajo ya se entregó al paciente (deja de aparecer en "Mis pedidos"
-- y pasa a "Finalizados"). NULL = caso en curso.
-- (En una base nueva, basta con correr laboratoriod.sql actualizado.)

ALTER TABLE casos
    ADD COLUMN finalizado_at TIMESTAMP NULL DEFAULT NULL AFTER descripcion;
