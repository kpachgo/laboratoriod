-- Migración para bases de datos existentes: control del trabajo del técnico.
-- 1) El técnico marca una prueba como terminada (pedidos.estado pasa a 'finalizado');
--    se guarda cuándo y quién lo hizo. Es un control interno del laboratorio.
-- 2) Comentarios del laboratorio sobre una prueba, que la clínica puede leer.
-- (En una base nueva, basta con correr laboratoriod.sql actualizado.)

ALTER TABLE pedidos
    ADD COLUMN terminado_at  TIMESTAMP NULL DEFAULT NULL AFTER etapa_logistica,
    ADD COLUMN terminado_por INT NULL AFTER terminado_at,
    ADD CONSTRAINT fk_pedidos_terminado_por FOREIGN KEY (terminado_por) REFERENCES usuarios(id);

-- Las pruebas que ya estaban finalizadas quedan con la fecha de su última actualización.
UPDATE pedidos SET terminado_at = updated_at WHERE estado IN ('finalizado', 'entregado') AND terminado_at IS NULL;

CREATE TABLE pedido_comentarios (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id    INT NOT NULL,
    usuario_id   INT NOT NULL,
    texto        TEXT NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
        ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE INDEX idx_pedido_comentarios_pedido ON pedido_comentarios(pedido_id);
