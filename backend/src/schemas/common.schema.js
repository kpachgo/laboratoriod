const { z } = require('zod');

const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

module.exports = { idParam, paginationQuery };
