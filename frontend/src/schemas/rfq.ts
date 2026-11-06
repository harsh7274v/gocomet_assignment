import { z } from 'zod';

export const extensionTriggerSchema = z.enum([
  'any_bid',
  'any_rank_change',
  'l1_change',
]);

export const auctionConfigSchema = z.object({
  trigger_window_minutes: z
    .number()
    .int('Must be an integer')
    .min(1, 'Trigger window must be at least 1 minute')
    .max(120, 'Trigger window cannot exceed 120 minutes'),
  extension_duration_minutes: z
    .number()
    .int('Must be an integer')
    .min(1, 'Extension duration must be at least 1 minute')
    .max(60, 'Extension duration cannot exceed 60 minutes'),
  extension_trigger: extensionTriggerSchema,
});

export const createRFQInputSchema = z
  .object({
    name: z.string().trim().min(1, 'RFQ name is required'),
    service_type: z.string().trim().min(1, 'Service type is required'),
    pickup_location: z.string().trim().min(1, 'Origin / Pickup location is required'),
    destination: z.string().trim().min(1, 'Destination location is required'),
    pickup_at: z.string().min(1, 'Pickup date is required'),
    bid_start_at: z.string().min(1, 'Bid start time is required'),
    initial_close_at: z.string().min(1, 'Bid close time is required'),
    forced_close_at: z.string().min(1, 'Forced ceiling time is required'),
    target_budget: z
      .number()
      .positive('Target budget must be a positive number')
      .optional()
      .nullable(),
    enable_british_auction: z.boolean().default(true),
    auction_config: auctionConfigSchema.optional(),
    invited_supplier_ids: z
      .array(z.string())
      .min(1, 'Please select at least one carrier partner to invite'),
  })
  .refine(
    (data) => {
      const start = new Date(data.bid_start_at).getTime();
      const close = new Date(data.initial_close_at).getTime();
      return isNaN(start) || isNaN(close) || close > start;
    },
    {
      message: 'Bid Close Time must be strictly later than Bid Start Time',
      path: ['initial_close_at'],
    }
  )
  .refine(
    (data) => {
      const close = new Date(data.initial_close_at).getTime();
      const forced = new Date(data.forced_close_at).getTime();
      return isNaN(close) || isNaN(forced) || forced > close;
    },
    {
      message: 'Forced Close Time must be later than Bid Close Time to allow extensions',
      path: ['forced_close_at'],
    }
  );

export type CreateRFQInput = z.infer<typeof createRFQInputSchema>;

