const { z } = require('zod');

const baseUsuario = {
  nombre: z.string().min(1).max(150),
  usuario: z.string().email('El usuario debe ser un correo electrónico válido').max(100),
  rol: z.enum(['admin', 'tecnico', 'gestor', 'clinica']),
  clinicaId: z.coerce.number().int().positive().nullable().optional(),
  activo: z.boolean().optional().default(true),
};

const createUsuarioSchema = z
  .object({
    ...baseUsuario,
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  })
  .refine(
    (data) => (data.rol === 'clinica' ? !!data.clinicaId : true),
    { message: 'clinicaId es obligatorio cuando el rol es clinica', path: ['clinicaId'] }
  )
  .refine(
    (data) => (data.rol !== 'clinica' ? !data.clinicaId : true),
    { message: 'clinicaId debe ser nulo si el rol no es clinica', path: ['clinicaId'] }
  );

const updateUsuarioSchema = z.object({
  nombre: z.string().min(1).max(150).optional(),
  usuario: z.string().email('El usuario debe ser un correo electrónico válido').max(100).optional(),
  rol: z.enum(['admin', 'tecnico', 'gestor', 'clinica']).optional(),
  clinicaId: z.coerce.number().int().positive().nullable().optional(),
  activo: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

module.exports = { createUsuarioSchema, updateUsuarioSchema };
