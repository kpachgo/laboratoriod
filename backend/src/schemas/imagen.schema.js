const { z } = require('zod');

const createImagenSchema = z.object({
  descripcion: z.string().max(255).optional().nullable(),
});

module.exports = { createImagenSchema };
