import z from "zod";

export const menuItemPanelSchema = z.object({
    name: z.string(),
    slug: z.string(),
    parentId: z.string().nullish(),
})

export type MenuItemPanelFormValues = z.infer<typeof menuItemPanelSchema>;