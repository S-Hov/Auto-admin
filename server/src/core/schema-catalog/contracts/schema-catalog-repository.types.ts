import type {
    DBColumn,
    DBIndex,
    ForeignKeyAction,
} from "../types/schema-catalog.types";

export interface FieldWriteItem {
    resourceId: number;
    column: DBColumn;
}

export interface ConstraintWriteItem {
    resourceId: number;
    constraintName: string;
    type: "primary" | "unique" | "foreign";
    referencedSchemaName: string | null;
    referencedTableName: string | null;
    referencedResourceId: number | null;
    onUpdate: ForeignKeyAction | null;
    onDelete: ForeignKeyAction | null;
}

export interface ConstraintFieldWriteItem {
    constraintId: number;
    position: number;
    fieldId: number;
    referencedFieldId: number | null;
    referencedColumnName: string | null;
}

export interface IndexWriteItem {
    resourceId: number;
    index: DBIndex;
}

export interface IndexPartWriteItem {
    indexId: number;
    position: number;
    fieldId: number | null;
    expression: string | null;
    prefixLength: number | null;
    sortDirection: "ASC" | "DESC" | null;
}
