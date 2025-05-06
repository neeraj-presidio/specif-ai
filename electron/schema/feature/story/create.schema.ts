import { z } from 'zod';

export const createStorySchema = z.object({
  appId: z.string(),
  appName: z.string(),
  appDescription: z.string(),
  reqName: z.string(),
  reqDesc: z.string(),
  extraContext: z.string().optional(),
  technicalDetails: z.string().optional()
});

export type CreateStoryRequest = z.infer<typeof createStorySchema>;

export interface CreateStoryResponse {
  features: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}
