import { z } from "zod";
import { positiveIdSchema } from "../../../core/access-control/schema/permission.schema";
import { PERMISSION_SUBJECT_TYPES } from "../../../core/access-control/contracts/permission.constants";
import { badRequest } from "../../../shared/api/errors/error-helpers";
import { ERROR_CODES } from "../../../shared/api/codes/error-codes";

export const menuSaveSchema = z
    .strictObject({
        id: positiveIdSchema.optional(),
        parentId: positiveIdSchema.nullable(),
        name: z.string().trim().min(1).max(100),
        slug: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,149}$/),
        icon: z.string().max(255).nullable(),
        iconType: z.enum(["icon", "svg", "image", "video"]),
        sortOrder: z.number().int().min(-1_000_000).max(1_000_000),
        isActive: z.boolean(),
    })
    .superRefine((menu, ctx) => {
        if (menu.icon === null) return;
        const valid =
            menu.iconType === "icon"
                ? /^[a-zA-Z0-9_-]+$/.test(menu.icon)
                : (/^\/assets\/[a-zA-Z0-9_./-]+$/.test(menu.icon) &&
                      !menu.icon.includes("..")) ||
                  (() => {
                      try {
                          const url = new URL(menu.icon);
                          return (
                              url.protocol === "https:" &&
                              !url.username &&
                              !url.password
                          );
                      } catch {
                          return false;
                      }
                  })();
        if (!valid)
            ctx.addIssue({
                code: "custom",
                path: ["icon"],
                message: "Use an icon key or a safe asset URL",
            });
    });

export const menuPermissionSchema = z.strictObject({
    menuId: positiveIdSchema,
    subjectType: z.enum(PERMISSION_SUBJECT_TYPES),
    subjectId: positiveIdSchema,
    permissions: z
        .strictObject({
            canView: z.boolean(),
            canCreate: z.boolean(),
            canUpdate: z.boolean(),
            canDelete: z.boolean(),
        })
        .nullable(),
});

export function parseMenuSave(input: unknown) {
    const parsed = menuSaveSchema.safeParse(input);
    if (!parsed.success)
        throw badRequest(ERROR_CODES.MENU_INVALID, { cause: parsed.error });
    return parsed.data;
}

export function parseMenuPermissions(input: unknown) {
    const parsed = menuPermissionSchema.safeParse(input);
    if (!parsed.success)
        throw badRequest(ERROR_CODES.MENU_INVALID, { cause: parsed.error });
    return parsed.data;
}
