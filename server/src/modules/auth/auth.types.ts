import { RowDataPacket } from "mysql2";
import { AutoAdmin } from "../../db/db.types";

export interface LoginData {
    userName: string;
    password: string;
}

export type User = RowDataPacket &
    Pick<AutoAdmin.User, 'id' | 'role_id' | 'username' | 'password_hash' | 'is_active'>