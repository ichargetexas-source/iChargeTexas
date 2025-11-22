import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

const STRIPE_SECRET_KEY = "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";

export const createInvoiceProcedure = protectedProcedure
  .input(z.object({
    requestId: z.string(),
    customer: z.object({
      name: z.string(),
      email: z.string(),
      phone: z.string(),
    }),
    serviceType: z.string(),
    description: z.string(),
    lineItems: z.array(z.object({
      description: z.string(),
      amount: z.number(),
      quantity: z.number().optional(),
    })),
    totalAmount: z.number(),
    messengerImages: z.array(z.string()).optional(),
  }))
  .mutation(async ({ input }) => {
    try {
      console.log("[Stripe] Creating invoice with data:", JSON.stringify({
        customer: input.customer.name,
        serviceType: input.serviceType,
        lineItems: input.lineItems,
        totalAmount: input.totalAmount,
      }, null, 2));
      
      console.log("[Stripe] Creating customer...");
      
      const customerResponse = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name: input.customer.name,
          email: input.customer.email,
          phone: input.customer.phone,
          description: `${input.serviceType} Customer`,
        }).toString(),
      });

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.error("[Stripe] Customer creation failed:", errorText);
        throw new Error("Failed to create customer in Stripe");
      }

      const customer = await customerResponse.json();
      console.log("[Stripe] Customer created:", customer.id);

      console.log("[Stripe] Creating invoice...");
      
      const invoiceResponse = await fetch("https://api.stripe.com/v1/invoices", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          customer: customer.id,
          collection_method: "send_invoice",
          days_until_due: "7",
          description: input.description,
          footer: `Request ID: ${input.requestId} | Service: ${input.serviceType}`,
        }).toString(),
      });

      if (!invoiceResponse.ok) {
        const errorText = await invoiceResponse.text();
        console.error("[Stripe] Invoice creation failed:", errorText);
        throw new Error("Failed to create invoice in Stripe");
      }

      const invoice = await invoiceResponse.json();
      console.log("[Stripe] Invoice created:", invoice.id);

      console.log("[Stripe] Adding invoice line items...");
      
      for (let i = 0; i < input.lineItems.length; i++) {
        const lineItem = input.lineItems[i];
        const amountInCents = Math.round(lineItem.amount * 100);
        
        console.log(`[Stripe] Adding line item ${i + 1}/${input.lineItems.length}:`, {
          description: lineItem.description,
          amount: lineItem.amount,
          amountInCents,
        });
        
        const invoiceItemResponse = await fetch("https://api.stripe.com/v1/invoiceitems", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            customer: customer.id,
            invoice: invoice.id,
            amount: amountInCents.toString(),
            currency: "usd",
            description: lineItem.description,
          }).toString(),
        });

        if (!invoiceItemResponse.ok) {
          const errorText = await invoiceItemResponse.text();
          console.error(`[Stripe] Invoice item ${i + 1} creation failed:`, errorText);
          throw new Error(`Failed to add line item ${i + 1} to invoice`);
        }

        const invoiceItem = await invoiceItemResponse.json();
        console.log(`[Stripe] Line item ${i + 1} added:`, invoiceItem.id);
      }

      console.log("[Stripe] Finalizing invoice...");
      
      const finalizeResponse = await fetch(`https://api.stripe.com/v1/invoices/${invoice.id}/finalize`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (!finalizeResponse.ok) {
        const errorText = await finalizeResponse.text();
        console.error("[Stripe] Invoice finalization failed:", errorText);
        throw new Error("Failed to finalize invoice");
      }

      const finalizedInvoice = await finalizeResponse.json();
      console.log("[Stripe] Invoice finalized:", finalizedInvoice.id);

      if (input.messengerImages && input.messengerImages.length > 0) {
        console.log(`[Stripe] Adding ${input.messengerImages.length} messenger images to invoice metadata...`);
        
        const metadata: Record<string, string> = {
          request_id: input.requestId,
          service_type: input.serviceType,
          images_count: input.messengerImages.length.toString(),
        };
        
        input.messengerImages.forEach((imageUri, index) => {
          if (index < 10) {
            const imageKey = `image_${index + 1}`;
            const truncatedUri = imageUri.substring(0, 500);
            metadata[imageKey] = truncatedUri;
          }
        });

        try {
          const updateResponse = await fetch(`https://api.stripe.com/v1/invoices/${invoice.id}`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(metadata).toString(),
          });

          if (updateResponse.ok) {
            console.log("[Stripe] Invoice metadata updated with images");
          } else {
            console.warn("[Stripe] Failed to update invoice metadata");
          }
        } catch (error) {
          console.error("[Stripe] Error updating invoice metadata:", error);
        }
      }

      return {
        success: true,
        invoiceId: finalizedInvoice.id,
      };
    } catch (error) {
      console.error("[Stripe] Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });
