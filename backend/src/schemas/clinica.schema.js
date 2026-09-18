const { z } = require('zod');

const createClinicaSchema = z.object({
  nombre: z.string().min(1).max(150),
  direccion: z.string().max(255).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  email: z.string().email().max(150).optional().nullable(),
});

const updateClinicaSchema = createClinicaSchema.partial();

module.exports = { createClinicaSchema, updateClinicaSchema };
