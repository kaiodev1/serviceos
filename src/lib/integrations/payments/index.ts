export interface PaymentProvider {
  createCharge(input: {
    companyId: string;
    paymentId: string;
    amountInCents: number;
    idempotencyKey: string;
  }): Promise<{ externalId: string; checkoutUrl?: string }>;
  verifyWebhook(rawBody: string, signature: string): Promise<boolean>;
}
