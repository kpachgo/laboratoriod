const { z } = require('zod');

const casoItemInput = z.object({
  tipoTrabajo: z.string().min(1).max(100),
  material: z.string().max(100).optional().nullable(),
  piezasDentales: z.string().max(100).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  unidades: z.coerce.number().int().positive().optional().default(1),
  datosExtra: z.record(z.any()).optional().nullable(),
});

const createCasoSchema = z.object({
  // Opcional: si quien crea el caso es una clínica, el backend fuerza su propia clinicaId.
  clinicaId: z.coerce.number().int().positive().optional(),
  doctorId: z.coerce.number().int().positive(),
  pacienteNombre: z.string().max(150).optional().nullable(),
  descripcion: z.string().max(255).optional().nullable(),
  items: z.array(casoItemInput).optional().default([]),
});

const updateCasoSchema = z.object({
  clinicaId: z.coerce.number().int().positive().optional(),
  doctorId: z.coerce.number().int().positive().optional(),
  pacienteNombre: z.string().max(150).optional().nullable(),
  descripcion: z.string().max(255).optional().nullable(),
});

const createCasoItemSchema = casoItemInput;
const updateCasoItemSchema = casoItemInput.partial();

module.exports = {
  createCasoSchema,
  updateCasoSchema,
  createCasoItemSchema,
  updateCasoItemSchema,
};
