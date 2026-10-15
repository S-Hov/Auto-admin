import z from "zod";

export const ControlledIconPickerSchema = z.object({
    icon: z.string().nullable().optional(),
})

export type ControlledIconPickerFormValues = z.infer<typeof ControlledIconPickerSchema>;