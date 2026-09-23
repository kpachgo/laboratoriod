use laboratoriod;
-- ============================================================
-- SISTEMA DE PEDIDOS - LABORATORIO DENTAL
-- Esquema v0.2 - agrega CASOS para agrupar las pruebas/etapas
-- de un mismo trabajo (rodete, bizcocho, metal, color, entrega)
-- ============================================================
-- ------------------------------------------------------------
-- CLINICAS: quién envía los pedidos al laboratorio
-- ------------------------------------------------------------
CREATE TABLE clinicas (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    nombre        VARCHAR(150) NOT NULL,
    direccion     VARCHAR(255),
    telefono      VARCHAR(50),
    email         VARCHAR(150),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
 
-- ------------------------------------------------------------
-- DOCTORES: pertenecen a una clínica
-- ------------------------------------------------------------
CREATE TABLE doctores (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    clinica_id    INT NOT NULL,
    nombre        VARCHAR(150) NOT NULL,
    telefono      VARCHAR(50),
    email         VARCHAR(150),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;
 
-- ------------------------------------------------------------
-- USUARIOS: acceso al sistema (personal del laboratorio y clínicas)
-- rol = 'clinica'  -> solo puede ver sus propios casos/pedidos (clinica_id obligatorio)
-- rol = 'admin'    -> control total
-- rol = 'tecnico'  -> trabaja los pedidos (cambia estado, sube fotos)
-- rol = 'gestor'   -> recoge/entrega pedidos entre clínica y laboratorio
-- ------------------------------------------------------------
CREATE TABLE usuarios (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    usuario         VARCHAR(100) NOT NULL UNIQUE,   -- login
    password_hash   VARCHAR(255) NOT NULL,
    rol             ENUM('admin','tecnico','gestor','clinica') NOT NULL,
    clinica_id      INT NULL,                       -- solo se llena si rol = 'clinica'
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_clinica_id_segun_rol CHECK (
        (rol = 'clinica' AND clinica_id IS NOT NULL) OR
        (rol <> 'clinica' AND clinica_id IS NULL)
    )
) ENGINE=InnoDB;
 
-- ------------------------------------------------------------
-- CASOS: el trabajo completo para un paciente
-- (ej. "Corona pieza 16" de Ana López en Clínica Vidal).
-- Agrupa todas las pruebas/etapas para que no se pierda la
-- relación entre ellas.
-- ------------------------------------------------------------
CREATE TABLE casos (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    clinica_id        INT NOT NULL,
    doctor_id         INT NOT NULL,
    paciente_nombre   VARCHAR(150),
    descripcion       VARCHAR(255),            -- ej: "Corona - Pieza 16"
    finalizado_at     TIMESTAMP NULL DEFAULT NULL, -- cuando la clínica entregó el trabajo al paciente y lo cerró;
                                                     -- NULL = en curso (distinto de pedidos.estado, que es del laboratorio)
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
    FOREIGN KEY (doctor_id) REFERENCES doctores(id)
) ENGINE=InnoDB;
 
-- ------------------------------------------------------------
-- CASO_ITEMS: cada pieza/trabajo dentro de un caso
-- (un caso puede tener corona + puente, cada uno con su propio
--  material, piezas dentales y color). No cambia entre pruebas.
-- ------------------------------------------------------------
CREATE TABLE caso_items (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    caso_id           INT NOT NULL,
    tipo_trabajo      VARCHAR(100) NOT NULL,   -- corona, puente, implante, carilla, placa...
    material          VARCHAR(100),            -- ceramica prensada, zirconia, disilicato de litio...
    piezas_dentales   VARCHAR(100),            -- ej: "16,17,18" (numeración FDI)
    color             VARCHAR(50),
    unidades          INT DEFAULT 1,
    datos_extra       JSON,                    -- campos variables según laboratorio
                                                 -- ej: {"colorimetro":"VITA A2","guia_quirurgica":true}
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (caso_id) REFERENCES casos(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;
 
-- ------------------------------------------------------------
-- PEDIDOS: cada prueba/etapa física de un caso
-- (rodete, bizcocho, metal, color, entrega final...).
-- Es lo que se recoge/entrega y lo que trae el diagrama original
-- "PEDIDO -> ESTADO: EN PROCESO - FINALIZADO - ENTREGADO".
-- ------------------------------------------------------------
CREATE TABLE pedidos (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    caso_id             INT NOT NULL,
    folio               VARCHAR(50) UNIQUE,              -- número de orden visible al usuario
    etapa               VARCHAR(60) NOT NULL,             -- rodete, bizcocho, metal, color, entrega_final...
                                                            -- texto libre: cada laboratorio nombra sus pruebas distinto
    fecha_entrada       DATE NOT NULL,
    fecha_entrega_est   DATE,
    gestor_id           INT NULL,                        -- usuario (rol='gestor') que recogió/entregó
    estado              ENUM('en_proceso','finalizado','entregado')
                             NOT NULL DEFAULT 'en_proceso',   -- estado del trabajo en laboratorio
    etapa_logistica     ENUM('pendiente_entrega','recibido','en_laboratorio','entregado_en_clinica')
                             NOT NULL DEFAULT 'en_laboratorio', -- recorrido del gestor (cambia con las paradas/rutas)
    observaciones       TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (caso_id) REFERENCES casos(id)
        ON DELETE CASCADE,
    FOREIGN KEY (gestor_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;
 
-- ------------------------------------------------------------
-- RUTAS: agrupa las paradas de un gestor para un día/zona,
-- porque puede haber varios gestores con rutas distintas.
-- ------------------------------------------------------------
CREATE TABLE rutas (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    gestor_id     INT NOT NULL,                 -- usuario con rol='gestor'
    fecha         DATE NOT NULL,
    nombre        VARCHAR(100),                 -- ej: "Zona Escalón", "Ruta mañana"
    estado        ENUM('planificada','en_curso','completada')
                       NOT NULL DEFAULT 'planificada',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gestor_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;
 
-- ------------------------------------------------------------
-- RUTA_PARADAS: cada parada de una ruta. Un mismo pedido genera
-- dos paradas distintas en su ciclo de vida: una para recogerlo
-- en la clínica y otra para entregarlo de vuelta.
-- ------------------------------------------------------------
CREATE TABLE ruta_paradas (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    ruta_id         INT NOT NULL,
    pedido_id       INT NOT NULL,
    tipo            ENUM('recoger','entregar') NOT NULL,
    orden           INT NOT NULL DEFAULT 0,       -- secuencia de visita en la ruta
    estado          ENUM('pendiente','completada') NOT NULL DEFAULT 'pendiente',
    hora_estimada   TIME,
    hora_real       TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ruta_id) REFERENCES rutas(id)
        ON DELETE CASCADE,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
) ENGINE=InnoDB;
 
-- ------------------------------------------------------------
-- IMAGENES: solo guarda la ruta del archivo (lo pedido)
-- Se asocia a un pedido (una prueba/etapa concreta), para saber
-- en qué momento del caso se tomó cada foto.
-- ------------------------------------------------------------
CREATE TABLE imagenes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id       INT NOT NULL,
    ruta            VARCHAR(500) NOT NULL,     -- ruta/URL del archivo, se define el almacenamiento después
    descripcion     VARCHAR(255),              -- opcional: "antes", "modelo", "color de referencia"
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- PEDIDO_LOGISTICA_HISTORIAL: traza cada cambio de etapa logística
-- de un pedido (quién lo cambió y cuándo), disparado por las
-- paradas y rutas del gestor.
-- ------------------------------------------------------------
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

-- Índices útiles para búsquedas frecuentes
CREATE INDEX idx_casos_clinica ON casos(clinica_id);
CREATE INDEX idx_caso_items_caso ON caso_items(caso_id);
CREATE INDEX idx_pedidos_caso ON pedidos(caso_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_etapa_logistica ON pedidos(etapa_logistica);
CREATE INDEX idx_pedido_logistica_historial_pedido ON pedido_logistica_historial(pedido_id);
CREATE INDEX idx_pedidos_etapa ON pedidos(etapa);
CREATE INDEX idx_imagenes_pedido ON imagenes(pedido_id);
CREATE INDEX idx_usuarios_clinica ON usuarios(clinica_id);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_rutas_gestor_fecha ON rutas(gestor_id, fecha);
CREATE INDEX idx_ruta_paradas_ruta ON ruta_paradas(ruta_id);
CREATE INDEX idx_ruta_paradas_pedido ON ruta_paradas(pedido_id);