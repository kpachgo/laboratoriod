const { z } = require('zod');

const createDoctorSchema = z.object({
  // Opcional: si quien crea el doctor es una clínica, el backend fuerza su propia clinicaId.
  clinicaId: z.coerce.number().int().positive().optional(),
  nombre: z.string().min(1).max(150),
  telefono: z.string().max(50).optional().nullable(),
  email: z.string().email().max(150).optional().nullable(),
});

const updateDoctorSchema = createDoctorSchema.partial();

module.exports = { createDoctorSchema, updateDoctorSchema };
