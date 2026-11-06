import { z } from 'zod';

export const submitBidInputSchema = z
  .object({
    freight_charges: z
      .number()
      .min(0, 'Freight charges cannot be negative'),
    origin_charges: z
      .number()
      .min(0, 'Origin charges cannot be negative'),
    destination_charges: z
      .number()
      .min(0, 'Destination charges cannot be negative'),
    validity_days: z
      .number()
      .int('Validity days must be a whole number')
      .min(1, 'Quote validity must be at least 1 day')
      .max(365, 'Quote validity cannot exceed 365 days'),
  })
  .refine(
    (data) => {
      const total = data.freight_charges + data.origin_charges + data.destination_charges;
      return total > 0;
    },
    {
      message: 'Total quotation amount (Freight + Origin + Destination) must be greater than zero',
      path: ['freight_charges'],
    }
  );

export type SubmitBidInput = z.infer<typeof submitBidInputSchema>;
