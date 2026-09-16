import type { DBTable } from "../types/schema-catalog.types";
import type { SnapshotConstraint, SnapshotConstraintField } from "./synchronizer.types";

const createLocalFields = (columnNames: string[]): SnapshotConstraintField[] => {
    return columnNames.map((columnName, index) => ({
        position: index + 1,
        columnName,
        referencedColumnName: null,
    }));
};

const createForeignKeyFields = (constraintName: string, columnNames: string[], referencedColumnNames: string[]): SnapshotConstraintField[] => {
    if (columnNames.length !== referencedColumnNames.length) {
        throw new Error(`Foreign key ${constraintName} has inconsistent column pairs`);
    }

    return columnNames.map((columnName, index) => ({
        position: index + 1,
        columnName,
        referencedColumnName: referencedColumnNames[index]!,
    }));
};

export const flattenSnapshotConstraints = (tables: DBTable[]): SnapshotConstraint[] => {
    const constraints: SnapshotConstraint[] = [];

    for (const table of tables) {
        if (table.primaryKey) {
            constraints.push({
                tableName: table.name,
                constraintName: table.primaryKey.name,
                type: 'primary',
                fields: createLocalFields(table.primaryKey.columns),
                referencedSchemaName: null,
                referencedTableName: null,
                onUpdate: null,
                onDelete: null,
            });
        }

        for (const uniqueKey of table.uniqueKeys) {
            constraints.push({
                tableName: table.name,
                constraintName: uniqueKey.name,
                type: 'unique',
                fields: createLocalFields(uniqueKey.columns),
                referencedSchemaName: null,
                referencedTableName: null,
                onUpdate: null,
                onDelete: null,
            });
        }

        for (const foreignKey of table.foreignKeys) {
            constraints.push({
                tableName: table.name,
                constraintName: foreignKey.name,
                type: 'foreign',
                fields: createForeignKeyFields(
                    foreignKey.name,
                    foreignKey.columns,
                    foreignKey.referencedColumns,
                ),
                referencedSchemaName: foreignKey.referencedSchemaName,
                referencedTableName: foreignKey.referencedTableName,
                onUpdate: foreignKey.onUpdate,
                onDelete: foreignKey.onDelete,
            });
        }
    }

    return constraints;
};
