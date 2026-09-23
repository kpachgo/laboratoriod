const { z } = require('zod');

const pedidoIdParam = z.object({
  pedidoId: z.coerce.number().int().positive(),
});

const comentarioParams = z.object({
  pedidoId: z.coerce.number().int().positive(),
  comentarioId: z.coerce.number().int().positive(),
});

const createComentarioSchema = z.object({
  texto: z.string().trim().min(1, 'El comentario no puede estar vacío').max(2000),
});

module.exports = { pedidoIdParam, comentarioParams, createComentarioSchema };
