import z from "zod"

export const recoverySchema = z.object({
    expectedVersion: z.string(),
    checksum: z.string()
})

export type RecoveryData = z.infer<typeof recoverySchema>