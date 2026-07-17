import { RowDataPacket } from "mysql2";
import { AutoAdmin } from "../../../db/db.types";

export interface RegisterData {
    userName: string;
    password: string;
    confirmPassword: string;
}

export interface RequestMeta {
    ipAddress: string | null,
    userAgent: string | null,
}

export interface UserRole extends RowDataPacket {
    id: number,
    key?: 'user' | 'manager' | 'admin' | string,
    name?: 'User' | 'Manager' | 'Admin' | string,
    rights?: 'read_only' | 'manager' | 'full' | string,
}

export interface RegisterResponse {
    redirectedTo?: string;
}

export type AdminLookupRow = RowDataPacket &
    Pick<AutoAdmin.User, 'id' | 'username'>