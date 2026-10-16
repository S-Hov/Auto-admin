import z from "zod";

export const menuItemPanelSchema = z.object({
    name: z.string().trim().min(1, 'Введите название').max(100, 'Не более 100 символов'),
    slug: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,149}$/, 'Используйте строчные латинские буквы, цифры, дефис и подчёркивание'),
    icon: z.string().max(255).nullable(),
})

export type MenuItemPanelFormValues = z.infer<typeof menuItemPanelSchema>;
