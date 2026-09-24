export type NormalizedMessage = {
  providerId: string;
  from: string;
  to: string;
  text: string;
  receivedAt: string;
};
export interface WhatsAppProvider {
  sendMessage(input: {
    to: string;
    text: string;
    idempotencyKey: string;
  }): Promise<{ providerMessageId: string }>;
  verifyWebhook(body: string, signature: string): Promise<boolean>;
  normalizeWebhook(payload: unknown): NormalizedMessage[];
  receiveMessage(message: NormalizedMessage): Promise<void>;
}
// No provider is enabled. Verify signature, resolve tenant from a trusted provider
// account mapping, and deduplicate providerMessageId before processing webhooks.
