import { z } from 'zod';
export const serviceIntentSchema = z.object({
  intent: z.enum(['service_request', 'question', 'unknown']),
  service: z.string().nullable(),
  quantity: z.number().int().positive().nullable(),
  preferredDate: z.string().nullable(),
  preferredPeriod: z.enum(['morning', 'afternoon', 'evening']).nullable(),
});
export type ServiceIntent = z.infer<typeof serviceIntentSchema>;
export interface IntentProvider {
  interpret(message: string): Promise<ServiceIntent>;
}
// Interpretation is a proposal only. Domain actions still require an authenticated
// actor, tenant authorization, server validation and explicit human confirmation.
