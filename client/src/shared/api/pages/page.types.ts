import type { z } from 'zod';
import type { pageRowsQuerySchema } from '@auto-admin/contracts/pages';
export type { PageConfig, PageField, PageFieldDisplay, PageData, PageRowsResult } from '@auto-admin/contracts/pages';
// Before defaults are applied, offset may be omitted by the caller.
export type PageRowsParams = z.input<typeof pageRowsQuerySchema>;
