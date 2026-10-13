export interface MenuItemDto {
    id: number;
    parentId: number | null;
    name: string;
    slug: string;
    icon: string | null;
    iconType: 'icon' | 'svg' | 'image' | 'video';
    sortOrder: number;
    isActive: boolean;
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}