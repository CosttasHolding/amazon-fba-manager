import {z} from'zod'
export const saleSchema=z.object({productId:z.string().uuid(),saleDate:z.date(),unitsSold:z.number().int().min(1),revenue:z.number().min(0),amazonFees:z.number().min(0).default(0),orderId:z.string().max(255).optional().nullable()})
