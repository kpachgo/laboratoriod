const { z } = require('zod');

const createRutaSchema = z.object({
  gestorId: z.coerce.number().int().positive(),
  fecha: z.string().min(1, 'fecha es obligatoria (YYYY-MM-DD)'),
  nombre: z.string().max(100).optional().nullable(),
});

const updateRutaSchema = z.object({
  gestorId: z.coerce.number().int().positive().optional(),
  fecha: z.string().optional(),
  nombre: z.string().max(100).optional().nullable(),
  estado: z.enum(['planificada', 'en_curso', 'completada']).optional(),
});

const createParadaSchema = z.object({
  pedidoId: z.coerce.number().int().positive(),
  tipo: z.enum(['recoger', 'entregar']),
  orden: z.coerce.number().int().min(0).optional().default(0),
  horaEstimada: z.string().optional().nullable(),
});

const updateParadaSchema = z.object({
  tipo: z.enum(['recoger', 'entregar']).optional(),
  orden: z.coerce.number().int().min(0).optional(),
  estado: z.enum(['pendiente', 'completada']).optional(),
  horaEstimada: z.string().optional().nullable(),
});

module.exports = {
  createRutaSchema,
  updateRutaSchema,
  createParadaSchema,
  updateParadaSchema,
};
