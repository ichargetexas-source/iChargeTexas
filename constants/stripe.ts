import { trpcClient } from "@/lib/trpc";

export interface StripeLineItem {
  description: string;
  amount: number;
  quantity?: number;
}

export interface StripeInvoiceData {
  requestId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  serviceType: string;
  description: string;
  lineItems: StripeLineItem[];
  totalAmount: number;
  messengerImages?: string[];
}

export async function createStripeInvoice(data: StripeInvoiceData): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    console.log("[Stripe] Creating invoice via backend...");
    
    const result = await trpcClient.stripe.createInvoice.mutate(data);
    
    return result;
  } catch (error) {
    console.error("[Stripe] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
