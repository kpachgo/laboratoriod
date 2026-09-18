const { z } = require('zod');

const createPedidoSchema = z.object({
  casoId: z.coerce.number().int().positive(),
  folio: z.string().max(50).optional().nullable(),
  etapa: z.string().min(1).max(60),
  fechaEntrada: z.string().min(1, 'fechaEntrada es obligatoria (YYYY-MM-DD)'),
  fechaEntregaEst: z.string().optional().nullable(),
  gestorId: z.coerce.number().int().positive().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

const updatePedidoSchema = z.object({
  folio: z.string().max(50).optional().nullable(),
  etapa: z.string().min(1).max(60).optional(),
  fechaEntrada: z.string().optional(),
  fechaEntregaEst: z.string().optional().nullable(),
  gestorId: z.coerce.number().int().positive().optional().nullable(),
  estado: z.enum(['en_proceso', 'finalizado', 'entregado']).optional(),
  observaciones: z.string().optional().nullable(),
});

const pedidoQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  estado: z.enum(['en_proceso', 'finalizado', 'entregado']).optional(),
  etapa: z.string().optional(),
  casoId: z.coerce.number().int().positive().optional(),
  clinicaId: z.coerce.number().int().positive().optional(),
});

module.exports = { createPedidoSchema, updatePedidoSchema, pedidoQuerySchema };
