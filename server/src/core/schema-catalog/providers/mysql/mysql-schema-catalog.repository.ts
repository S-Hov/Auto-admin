import type { DatabaseExecutor } from "../../../../db/contracts/executor.interface";
import type { SchemaCatalogRepository } from "../../contracts/schema-catalog-repository.interface";
import type {
    ConstraintFieldWriteItem,
    ConstraintWriteItem,
    FieldWriteItem,
    IndexPartWriteItem,
    IndexWriteItem,
} from "../../contracts/schema-catalog-repository.types";
import type {
    StoredConstraintFieldRow,
    StoredConstraintRow,
    StoredFieldRow,
    StoredIndexPartRow,
    StoredIndexRow,
    StoredResourceRow,
} from "../../repository/repository.types";
import type {
    DBTable,
    SchemaCatalog,
    SchemaScanChangeCounts,
    StoredConstraint,
    StoredConstraintField,
    StoredField,
    StoredIndex,
    StoredIndexPart,
    StoredResource,
} from "../../types/schema-catalog.types";

interface SuccessfulScanRow {
    snapshot_fingerprint: string;
}

export class MySqlSchemaCatalogRepository implements SchemaCatalogRepository {
    constructor(private readonly executor: DatabaseExecutor) {}

    private async readLatestSuccessfulScanFingerprint(
        schemaName: string,
    ): Promise<string | null> {
        const rows = await this.executor.queryRows<SuccessfulScanRow>(
            `
                SELECT snapshot_fingerprint
                FROM Auto_Admin__schema_scans
                WHERE schema_name = ?
                    AND status = 'succeeded'
                    AND snapshot_fingerprint IS NOT NULL
                ORDER BY id DESC
                LIMIT 1
            `,
            [schemaName],
        );

        return rows[0]?.snapshot_fingerprint ?? null;
    }

    async readPersistedCatalog(
        schemaName: string,
        knownFingerprint?: string,
    ): Promise<SchemaCatalog | null> {
        const fingerprint =
            knownFingerprint ??
            (await this.readLatestSuccessfulScanFingerprint(schemaName));
        if (!fingerprint) return null;

        const resources = (await this.readStoredResources(schemaName)).filter(
            (resource) => resource.state === "present",
        );
        const resourceIds = new Set(resources.map((resource) => resource.id));

        const fields = (await this.readStoredFields(schemaName)).filter(
            (field) =>
                field.state === "present" && resourceIds.has(field.resourceId),
        );
        const fieldIds = new Set(fields.map((field) => field.id));

        const constraints = (await this.readStoredConstraints(schemaName))
            .filter(
                (constraint) =>
                    constraint.state === "present" &&
                    resourceIds.has(constraint.resourceId),
            )
            .map((constraint) => ({
                ...constraint,
                fields: constraint.fields.filter((field) =>
                    fieldIds.has(field.fieldId),
                ),
            }));

        const indexes = (await this.readStoredIndexes(schemaName))
            .filter(
                (index) =>
                    index.state === "present" &&
                    resourceIds.has(index.resourceId),
            )
            .map((index) => ({
                ...index,
                parts: index.parts.filter(
                    (part) =>
                        part.fieldId === null || fieldIds.has(part.fieldId),
                ),
            }));

        return {
            schemaName,
            fingerprint,
            loadedAt: Date.now(),
            resources,
            fields,
            constraints,
            indexes,
        };
    }

    async readStoredResources(schemaName: string): Promise<StoredResource[]> {
        const rows = await this.executor.queryRows<StoredResourceRow>(
            `
                SELECT
                    id,
                    schema_name,
                    table_name,
                    object_type,
                    engine,
                    comment,
                    is_service,
                    state,
                    first_seen_scan_id,
                    last_seen_scan_id
                FROM Auto_Admin__resources
                WHERE schema_name = ?
                ORDER BY table_name
            `,
            [schemaName],
        );

        return rows.map((resource) => ({
            id: resource.id,
            schemaName: resource.schema_name,
            tableName: resource.table_name,
            type: resource.object_type,
            engine: resource.engine,
            comment: resource.comment,
            isServiceTable: Boolean(resource.is_service),
            state: resource.state,
            firstSeenScanId: resource.first_seen_scan_id,
            lastSeenScanId: resource.last_seen_scan_id,
        }));
    }

    async readStoredFields(schemaName: string): Promise<StoredField[]> {
        const rows = await this.executor.queryRows<StoredFieldRow>(
            `
                SELECT
                    f.id,
                    f.resource_id,
                    f.column_name,
                    f.ordinal_position,
                    f.data_type,
                    f.column_type,
                    f.is_nullable,
                    f.default_value,
                    f.character_maximum_length,
                    f.numeric_precision,
                    f.numeric_scale,
                    f.datetime_precision,
                    f.character_set_name,
                    f.collation_name,
                    f.is_auto_increment,
                    f.is_generated,
                    f.generation_expression,
                    f.extra,
                    f.comment,
                    f.state,
                    f.first_seen_scan_id,
                    f.last_seen_scan_id
                FROM Auto_Admin__fields AS f
                INNER JOIN Auto_Admin__resources AS r
                    ON r.id = f.resource_id
                WHERE r.schema_name = ?
                ORDER BY r.table_name, f.ordinal_position
            `,
            [schemaName],
        );

        return rows.map((field) => ({
            id: field.id,
            resourceId: field.resource_id,
            name: field.column_name,
            position: field.ordinal_position,
            dataType: field.data_type,
            columnType: field.column_type,
            nullable: Boolean(field.is_nullable),
            defaultValue: field.default_value,
            characterMaximumLength: field.character_maximum_length,
            numericPrecision: field.numeric_precision,
            numericScale: field.numeric_scale,
            datetimePrecision: field.datetime_precision,
            characterSetName: field.character_set_name,
            collationName: field.collation_name,
            autoIncrement: Boolean(field.is_auto_increment),
            generated: {
                isGenerated: Boolean(field.is_generated),
                generationExpression: field.generation_expression,
            },
            extra: field.extra,
            comment: field.comment,
            state: field.state,
            firstSeenScanId: field.first_seen_scan_id,
            lastSeenScanId: field.last_seen_scan_id,
        }));
    }

    async readStoredConstraints(
        schemaName: string,
    ): Promise<StoredConstraint[]> {
        const constraintRows =
            await this.executor.queryRows<StoredConstraintRow>(
                `
                SELECT
                    c.id,
                    c.resource_id,
                    c.constraint_name,
                    c.constraint_type,
                    c.referenced_schema_name,
                    c.referenced_table_name,
                    c.referenced_resource_id,
                    c.on_update,
                    c.on_delete,
                    c.state,
                    c.first_seen_scan_id,
                    c.last_seen_scan_id
                FROM Auto_Admin__constraints AS c
                INNER JOIN Auto_Admin__resources AS r ON r.id = c.resource_id
                WHERE r.schema_name = ?
                ORDER BY r.table_name, c.constraint_name
            `,
                [schemaName],
            );

        const fieldRows =
            await this.executor.queryRows<StoredConstraintFieldRow>(
                `
                SELECT
                    cf.id,
                    cf.constraint_id,
                    cf.ordinal_position,
                    cf.field_id,
                    f.column_name,
                    cf.referenced_field_id,
                    cf.referenced_column_name
                FROM Auto_Admin__constraint_fields AS cf
                INNER JOIN Auto_Admin__constraints AS c ON c.id = cf.constraint_id
                INNER JOIN Auto_Admin__resources AS r ON r.id = c.resource_id
                INNER JOIN Auto_Admin__fields AS f ON f.id = cf.field_id
                WHERE r.schema_name = ?
                ORDER BY cf.constraint_id, cf.ordinal_position
            `,
                [schemaName],
            );

        const fieldsByConstraintId = new Map<number, StoredConstraintField[]>();

        for (const row of fieldRows) {
            const fields = fieldsByConstraintId.get(row.constraint_id) ?? [];
            fields.push({
                id: row.id,
                constraintId: row.constraint_id,
                position: row.ordinal_position,
                fieldId: row.field_id,
                columnName: row.column_name,
                referencedFieldId: row.referenced_field_id,
                referencedColumnName: row.referenced_column_name,
            });
            fieldsByConstraintId.set(row.constraint_id, fields);
        }

        return constraintRows.map((row) => ({
            id: row.id,
            resourceId: row.resource_id,
            constraintName: row.constraint_name,
            type: row.constraint_type,
            referencedSchemaName: row.referenced_schema_name,
            referencedTableName: row.referenced_table_name,
            referencedResourceId: row.referenced_resource_id,
            onUpdate: row.on_update,
            onDelete: row.on_delete,
            state: row.state,
            firstSeenScanId: row.first_seen_scan_id,
            lastSeenScanId: row.last_seen_scan_id,
            fields: fieldsByConstraintId.get(row.id) ?? [],
        }));
    }

    async readStoredIndexes(schemaName: string): Promise<StoredIndex[]> {
        const indexRows = await this.executor.queryRows<StoredIndexRow>(
            `
                SELECT
                    i.id,
                    i.resource_id,
                    i.index_name,
                    i.is_unique,
                    i.index_type,
                    i.is_visible,
                    i.comment,
                    i.state,
                    i.first_seen_scan_id,
                    i.last_seen_scan_id
                FROM Auto_Admin__indexes AS i
                INNER JOIN Auto_Admin__resources AS r ON r.id = i.resource_id
                WHERE r.schema_name = ?
                ORDER BY r.table_name, i.index_name
            `,
            [schemaName],
        );

        const partRows = await this.executor.queryRows<StoredIndexPartRow>(
            `
                SELECT
                    ip.id,
                    ip.index_id,
                    ip.ordinal_position,
                    ip.field_id,
                    f.column_name,
                    ip.expression,
                    ip.prefix_length,
                    ip.sort_direction
                FROM Auto_Admin__index_parts AS ip
                INNER JOIN Auto_Admin__indexes AS i ON i.id = ip.index_id
                INNER JOIN Auto_Admin__resources AS r ON r.id = i.resource_id
                LEFT JOIN Auto_Admin__fields AS f ON f.id = ip.field_id
                WHERE r.schema_name = ?
                ORDER BY ip.index_id, ip.ordinal_position
            `,
            [schemaName],
        );

        const partsByIndexId = new Map<number, StoredIndexPart[]>();

        for (const row of partRows) {
            const parts = partsByIndexId.get(row.index_id) ?? [];

            if (
                row.field_id !== null &&
                row.column_name !== null &&
                row.expression === null
            ) {
                parts.push({
                    id: row.id,
                    indexId: row.index_id,
                    position: row.ordinal_position,
                    fieldId: row.field_id,
                    kind: "column",
                    columnName: row.column_name,
                    expression: null,
                    prefixLength: row.prefix_length,
                    sortDirection: row.sort_direction,
                });
            } else if (row.field_id === null && row.expression !== null) {
                parts.push({
                    id: row.id,
                    indexId: row.index_id,
                    position: row.ordinal_position,
                    fieldId: null,
                    kind: "expression",
                    columnName: null,
                    expression: row.expression,
                    prefixLength: row.prefix_length,
                    sortDirection: row.sort_direction,
                });
            } else {
                throw new Error(`Index part ${row.id} has an invalid source`);
            }

            partsByIndexId.set(row.index_id, parts);
        }

        return indexRows.map((row) => ({
            id: row.id,
            resourceId: row.resource_id,
            name: row.index_name,
            isUnique: Boolean(row.is_unique),
            indexType: row.index_type,
            isVisible: Boolean(row.is_visible),
            comment: row.comment,
            state: row.state,
            firstSeenScanId: row.first_seen_scan_id,
            lastSeenScanId: row.last_seen_scan_id,
            parts: partsByIndexId.get(row.id) ?? [],
        }));
    }

    async createRunningScan(
        schemaName: string,
        createdBy: number | null,
    ): Promise<number> {
        const result = await this.executor.execute(
            `
                INSERT INTO Auto_Admin__schema_scans
                (status, schema_name, created_by)
                VALUES (?, ?, ?)
            `,
            ["running", schemaName, createdBy],
        );

        if (
            !result.insertId ||
            typeof result.insertId !== "number" ||
            result.insertId < 0
        ) {
            throw new Error("Failed to insert schema scan");
        }

        return result.insertId;
    }

    async markScanSucceeded(
        scanId: number,
        fingerprint: string,
        counts: SchemaScanChangeCounts,
    ): Promise<void> {
        const result = await this.executor.execute(
            `
                UPDATE Auto_Admin__schema_scans
                SET
                    status = 'succeeded',
                    finished_at = NOW(3),
                    snapshot_fingerprint = ?,
                    added_resources = ?,
                    changed_resources = ?,
                    missing_resources = ?,
                    added_fields = ?,
                    changed_fields = ?,
                    missing_fields = ?,
                    error_code = NULL
                WHERE id = ?
                    AND status = 'running'
            `,
            [
                fingerprint,
                counts.addedResources,
                counts.changedResources,
                counts.missingResources,
                counts.addedFields,
                counts.changedFields,
                counts.missingFields,
                scanId,
            ],
        );

        if (result.affectedRows !== 1) {
            throw new Error(
                `Schema scan ${scanId} not found or not in 'running' state`,
            );
        }
    }

    async markScanFailed(scanId: number, errorCode: string): Promise<void> {
        const result = await this.executor.execute(
            `
                UPDATE Auto_Admin__schema_scans
                SET
                    status = 'failed',
                    finished_at = NOW(3),
                    error_code = ?
                WHERE id = ?
                    AND status = 'running'
            `,
            [errorCode, scanId],
        );

        if (result.affectedRows !== 1) {
            throw new Error(
                `Schema scan ${scanId} not found or not in 'running' state`,
            );
        }
    }

    async upsertPresentResources(
        schemaName: string,
        snapshotTables: DBTable[],
        scanId: number,
    ): Promise<void> {
        if (snapshotTables.length === 0) {
            return;
        }

        const placeholders = snapshotTables
            .map(() => `(?, ?, ?, ?, ?, ?, ?, ?, 'present')`)
            .join(", ");

        const params = snapshotTables.flatMap((table) => [
            schemaName,
            table.name,
            table.type,
            table.engine,
            table.comment,
            table.isServiceTable,
            scanId,
            scanId,
        ]);

        await this.executor.execute(
            `
                INSERT INTO Auto_Admin__resources (
                    schema_name,
                    table_name,
                    object_type,
                    engine,
                    comment,
                    is_service,
                    first_seen_scan_id,
                    last_seen_scan_id,
                    state
                ) VALUES ${placeholders}
                ON DUPLICATE KEY UPDATE
                    object_type = VALUES(object_type),
                    engine = VALUES(engine),
                    comment = VALUES(comment),
                    is_service = VALUES(is_service),
                    state = VALUES(state),
                    last_seen_scan_id = VALUES(last_seen_scan_id)
            `,
            params,
        );
    }

    async markResourcesMissing(resourceIds: number[]): Promise<void> {
        if (resourceIds.length === 0) {
            return;
        }

        const placeholders = resourceIds.map(() => "?").join(", ");

        const result = await this.executor.execute(
            `
                UPDATE Auto_Admin__resources
                SET state = 'missing'
                WHERE id IN (${placeholders})
                    AND state = 'present'
            `,
            resourceIds,
        );

        if (result.affectedRows !== resourceIds.length) {
            throw new Error(
                `Expected ${resourceIds.length} rows to be affected, but got ${result.affectedRows}.`,
            );
        }
    }

    async upsertPresentFields(
        items: FieldWriteItem[],
        scanId: number,
    ): Promise<void> {
        if (items.length === 0) {
            return;
        }

        const placeholders = items
            .map(
                () =>
                    `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'present')`,
            )
            .join(", ");

        const params = items.flatMap((item) => [
            item.resourceId,
            item.column.name,
            item.column.position,
            item.column.dataType,
            item.column.characterMaximumLength,
            item.column.numericPrecision,
            item.column.numericScale,
            item.column.datetimePrecision,
            item.column.columnType,
            item.column.nullable,
            item.column.defaultValue,
            item.column.generated.isGenerated,
            item.column.generated.generationExpression,
            item.column.autoIncrement,
            item.column.extra,
            item.column.characterSetName,
            item.column.collationName,
            item.column.comment,
            scanId,
            scanId,
        ]);

        await this.executor.execute(
            `
                INSERT INTO Auto_Admin__fields (
                    resource_id,
                    column_name,
                    ordinal_position,
                    data_type,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale,
                    datetime_precision,
                    column_type,
                    is_nullable,
                    default_value,
                    is_generated,
                    generation_expression,
                    is_auto_increment,
                    extra,
                    character_set_name,
                    collation_name,
                    comment,
                    first_seen_scan_id,
                    last_seen_scan_id,
                    state
                ) VALUES ${placeholders}
                ON DUPLICATE KEY UPDATE
                    ordinal_position = VALUES(ordinal_position),
                    data_type = VALUES(data_type),
                    character_maximum_length = VALUES(character_maximum_length),
                    numeric_precision = VALUES(numeric_precision),
                    numeric_scale = VALUES(numeric_scale),
                    datetime_precision = VALUES(datetime_precision),
                    column_type = VALUES(column_type),
                    is_nullable = VALUES(is_nullable),
                    default_value = VALUES(default_value),
                    is_generated = VALUES(is_generated),
                    generation_expression = VALUES(generation_expression),
                    is_auto_increment = VALUES(is_auto_increment),
                    extra = VALUES(extra),
                    character_set_name = VALUES(character_set_name),
                    collation_name = VALUES(collation_name),
                    comment = VALUES(comment),
                    state = VALUES(state),
                    last_seen_scan_id = VALUES(last_seen_scan_id)
            `,
            params,
        );
    }

    async markFieldsMissing(fieldIds: number[]): Promise<void> {
        if (fieldIds.length === 0) {
            return;
        }

        const placeholders = fieldIds.map(() => "?").join(", ");

        const result = await this.executor.execute(
            `
                UPDATE Auto_Admin__fields
                SET state = 'missing'
                WHERE id IN (${placeholders})
                    AND state = 'present'
            `,
            fieldIds,
        );

        if (result.affectedRows !== fieldIds.length) {
            throw new Error(
                `Expected ${fieldIds.length} rows to be affected, but got ${result.affectedRows}.`,
            );
        }
    }

    async upsertPresentConstraints(
        items: ConstraintWriteItem[],
        scanId: number,
    ): Promise<void> {
        if (items.length === 0) return;

        const placeholders = items
            .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'present')")
            .join(", ");
        const values = items.flatMap((item) => [
            item.resourceId,
            item.constraintName,
            item.type,
            item.referencedSchemaName,
            item.referencedTableName,
            item.referencedResourceId,
            item.onUpdate,
            item.onDelete,
            scanId,
            scanId,
        ]);

        await this.executor.execute(
            `
                INSERT INTO Auto_Admin__constraints
                    (resource_id, constraint_name, constraint_type,
                    referenced_schema_name, referenced_table_name, referenced_resource_id,
                    on_update, on_delete, first_seen_scan_id, last_seen_scan_id, state)
                VALUES ${placeholders}
                ON DUPLICATE KEY UPDATE
                    constraint_type = VALUES(constraint_type),
                    referenced_schema_name = VALUES(referenced_schema_name),
                    referenced_table_name = VALUES(referenced_table_name),
                    referenced_resource_id = VALUES(referenced_resource_id),
                    on_update = VALUES(on_update),
                    on_delete = VALUES(on_delete),
                    last_seen_scan_id = VALUES(last_seen_scan_id),
                    state = 'present'
            `,
            values,
        );
    }

    async markConstraintsMissing(ids: number[]): Promise<void> {
        if (ids.length === 0) return;
        await this.executor.execute(
            `
                UPDATE Auto_Admin__constraints
                SET state = 'missing'
                WHERE id IN (${ids.map(() => "?").join(", ")})
            `,
            ids,
        );
    }

    async replaceConstraintFields(
        constraintIds: number[],
        items: ConstraintFieldWriteItem[],
    ): Promise<void> {
        if (constraintIds.length === 0) return;

        await this.executor.execute(
            `
                DELETE FROM Auto_Admin__constraint_fields
                WHERE constraint_id IN (${constraintIds.map(() => "?").join(", ")})
            `,
            constraintIds,
        );

        if (items.length === 0) return;

        const placeholders = items.map(() => "(?, ?, ?, ?, ?)").join(", ");
        const values = items.flatMap((item) => [
            item.constraintId,
            item.position,
            item.fieldId,
            item.referencedFieldId,
            item.referencedColumnName,
        ]);

        await this.executor.execute(
            `
                INSERT INTO Auto_Admin__constraint_fields
                    (constraint_id, ordinal_position, field_id, referenced_field_id, referenced_column_name)
                VALUES ${placeholders}
            `,
            values,
        );
    }

    async upsertPresentIndexes(
        items: IndexWriteItem[],
        scanId: number,
    ): Promise<void> {
        if (items.length === 0) return;

        const placeholders = items
            .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, 'present')")
            .join(", ");
        const values = items.flatMap(({ resourceId, index }) => [
            resourceId,
            index.name,
            index.isUnique,
            index.indexType,
            index.isVisible,
            index.comment,
            scanId,
            scanId,
        ]);

        await this.executor.execute(
            `
                INSERT INTO Auto_Admin__indexes
                    (resource_id, index_name, is_unique, index_type, is_visible, comment,
                    first_seen_scan_id, last_seen_scan_id, state)
                VALUES ${placeholders}
                ON DUPLICATE KEY UPDATE
                    is_unique = VALUES(is_unique),
                    index_type = VALUES(index_type),
                    is_visible = VALUES(is_visible),
                    comment = VALUES(comment),
                    last_seen_scan_id = VALUES(last_seen_scan_id),
                    state = 'present'
            `,
            values,
        );
    }

    async markIndexesMissing(ids: number[]): Promise<void> {
        if (ids.length === 0) return;
        await this.executor.execute(
            `
                UPDATE Auto_Admin__indexes
                SET state = 'missing'
                WHERE id IN (${ids.map(() => "?").join(", ")})
            `,
            ids,
        );
    }

    async replaceIndexParts(
        indexIds: number[],
        items: IndexPartWriteItem[],
    ): Promise<void> {
        if (indexIds.length === 0) return;

        await this.executor.execute(
            `
                DELETE FROM Auto_Admin__index_parts
                WHERE index_id IN (${indexIds.map(() => "?").join(", ")})
            `,
            indexIds,
        );

        if (items.length === 0) return;

        const placeholders = items.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
        const values = items.flatMap((item) => [
            item.indexId,
            item.position,
            item.fieldId,
            item.expression,
            item.prefixLength,
            item.sortDirection,
        ]);

        await this.executor.execute(
            `
                INSERT INTO Auto_Admin__index_parts
                    (index_id, ordinal_position, field_id, expression, prefix_length, sort_direction)
                VALUES ${placeholders}
            `,
            values,
        );
    }
}
