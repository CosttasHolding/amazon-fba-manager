import {z} from'zod'
export const stockMovementSchema=z.object({productId:z.string().uuid(),movementType:z.enum(['inbound_shipment','received_at_amazon','sale','return','removal','adjustment','damaged','transfer_to_warehouse']),quantity:z.number().int().refine(v=>v!==0),reference:z.string().max(255).optional().nullable(),notes:z.string().max(1000).optional().nullable()})
