-- Migración para bases de datos existentes (esquema original de pedidos):
-- agrega la etapa logística del gestor (pendiente_entrega -> recibido ->
-- en_laboratorio -> entregado_en_clinica), separada del estado de laboratorio,
-- y su historial de cambios.
-- (En una base nueva, basta con correr laboratoriod.sql actualizado.)

ALTER TABLE pedidos
    ADD COLUMN etapa_logistica
        ENUM('pendiente_entrega','recibido','en_laboratorio','entregado_en_clinica')
        NOT NULL DEFAULT 'en_laboratorio' AFTER estado;

-- Los pedidos ya entregados quedan como entregados en clínica.
UPDATE pedidos SET etapa_logistica = 'entregado_en_clinica' WHERE estado = 'entregado';

CREATE TABLE pedido_logistica_historial (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id         INT NOT NULL,
    etapa_anterior    VARCHAR(30) NULL,
    etapa_nueva       VARCHAR(30) NOT NULL,
    usuario_id        INT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
        ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE INDEX idx_pedidos_etapa_logistica ON pedidos(etapa_logistica);
CREATE INDEX idx_pedido_logistica_historial_pedido ON pedido_logistica_historial(pedido_id);
