import { z } from 'zod';
import { ValidationError } from '../errors.js';

/**
 * `return_to` is the classic open-redirect vector: an attacker supplies an absolute URL to a
 * site they control and StackLoop sends the freshly authenticated user there.
 *
 * Only same-site paths are accepted. A leading `//` or `/\` is rejected because browsers read
 * those as protocol-relative URLs pointing at another host.
 */
const returnToSchema = z
  .string()
  .max(2048)
  .refine((value) => value.startsWith('/'), { message: 'return_to must be a relative path' })
  .refine((value) => !value.startsWith('//') && !value.startsWith('/\\'), {
    message: 'return_to must not be protocol-relative',
  })
  .optional();

export const githubLoginSchema = z.object({
  return_to: returnToSchema,
});

export const githubCallbackSchema = z.object({
  code: z.string().min(1, 'code is required').max(512),
  state: z.string().min(1, 'state is required').max(512),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1).max(4096).optional(),
});

/** Parses with a schema, converting a failure into the API's standard validation error. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new ValidationError(
      'Request validation failed',
      result.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    );
  }

  return result.data;
}
