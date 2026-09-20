import type {
    SchemaCatalog,
    StoredConstraint,
    StoredField,
    StoredIndex,
    StoredResource,
} from "../types/schema-catalog.types";

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer Item)[]
        ? readonly DeepReadonly<Item>[]
        : T extends object
            ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
            : T;

export type CachedSchemaCatalog = DeepReadonly<SchemaCatalog>;

const deepFreeze = <T>(value: T): DeepReadonly<T> => {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
        for (const child of Object.values(value)) deepFreeze(child);
        Object.freeze(value);
    }
    return value as DeepReadonly<T>;
};

export class SchemaCatalogCache {
    private catalog: CachedSchemaCatalog | null = null;
    private pendingLoad: Promise<CachedSchemaCatalog> | null = null;
    private revision = 0;
    private resourcesById = new Map<number, DeepReadonly<StoredResource>>();
    private resourcesByName = new Map<string, DeepReadonly<StoredResource>>();
    private fieldsById = new Map<number, DeepReadonly<StoredField>>();
    private fieldsByResourceId = new Map<number, readonly DeepReadonly<StoredField>[]>();
    private constraintsByResourceId = new Map<number, readonly DeepReadonly<StoredConstraint>[]>();
    private indexesByResourceId = new Map<number, readonly DeepReadonly<StoredIndex>[]>();

    isLoaded(): boolean {
        return this.catalog !== null;
    }

    get(): CachedSchemaCatalog | null {
        return this.catalog;
    }

    async getOrLoad(loader: () => Promise<SchemaCatalog>): Promise<CachedSchemaCatalog> {
        if (this.catalog) return this.catalog;
        if (this.pendingLoad) return this.pendingLoad;

        const revisionAtStart = this.revision;
        const pendingLoad = loader()
            .then((catalog) => {
                if (this.revision === revisionAtStart) return this.replace(catalog);
                return this.catalog ?? deepFreeze(structuredClone(catalog));
            })
            .finally(() => {
                if (this.pendingLoad === pendingLoad) this.pendingLoad = null;
            });

        this.pendingLoad = pendingLoad;
        return pendingLoad;
    }

    replace(catalog: SchemaCatalog): CachedSchemaCatalog {
        const frozenCatalog = deepFreeze(structuredClone(catalog));
        const resourcesById = new Map<number, DeepReadonly<StoredResource>>();
        const resourcesByName = new Map<string, DeepReadonly<StoredResource>>();
        const fieldsById = new Map<number, DeepReadonly<StoredField>>();
        const fieldsByResourceId = new Map<number, DeepReadonly<StoredField>[]>();
        const constraintsByResourceId = new Map<number, DeepReadonly<StoredConstraint>[]>();
        const indexesByResourceId = new Map<number, DeepReadonly<StoredIndex>[]>();

        for (const resource of frozenCatalog.resources) {
            resourcesById.set(resource.id, resource);
            resourcesByName.set(resource.tableName, resource);
        }
        for (const field of frozenCatalog.fields) {
            fieldsById.set(field.id, field);
            const resourceFields = fieldsByResourceId.get(field.resourceId) ?? [];
            resourceFields.push(field);
            fieldsByResourceId.set(field.resourceId, resourceFields);
        }
        for (const constraint of frozenCatalog.constraints) {
            const resourceConstraints = constraintsByResourceId.get(constraint.resourceId) ?? [];
            resourceConstraints.push(constraint);
            constraintsByResourceId.set(constraint.resourceId, resourceConstraints);
        }
        for (const index of frozenCatalog.indexes) {
            const resourceIndexes = indexesByResourceId.get(index.resourceId) ?? [];
            resourceIndexes.push(index);
            indexesByResourceId.set(index.resourceId, resourceIndexes);
        }

        for (const fields of fieldsByResourceId.values()) Object.freeze(fields);
        for (const constraints of constraintsByResourceId.values()) Object.freeze(constraints);
        for (const indexes of indexesByResourceId.values()) Object.freeze(indexes);

        this.resourcesById = resourcesById;
        this.resourcesByName = resourcesByName;
        this.fieldsById = fieldsById;
        this.fieldsByResourceId = fieldsByResourceId;
        this.constraintsByResourceId = constraintsByResourceId;
        this.indexesByResourceId = indexesByResourceId;
        this.catalog = frozenCatalog;
        this.revision += 1;
        return frozenCatalog;
    }

    clear(): void {
        this.revision += 1;
        this.pendingLoad = null;
        this.catalog = null;
        this.resourcesById.clear();
        this.resourcesByName.clear();
        this.fieldsById.clear();
        this.fieldsByResourceId.clear();
        this.constraintsByResourceId.clear();
        this.indexesByResourceId.clear();
    }

    getResourceById(id: number): DeepReadonly<StoredResource> | null {
        return this.resourcesById.get(id) ?? null;
    }

    getResourceByName(tableName: string): DeepReadonly<StoredResource> | null {
        return this.resourcesByName.get(tableName) ?? null;
    }

    getFieldById(id: number): DeepReadonly<StoredField> | null {
        return this.fieldsById.get(id) ?? null;
    }

    getFieldsForResource(resourceId: number): readonly DeepReadonly<StoredField>[] {
        return this.fieldsByResourceId.get(resourceId) ?? [];
    }

    getConstraintsForResource(resourceId: number): readonly DeepReadonly<StoredConstraint>[] {
        return this.constraintsByResourceId.get(resourceId) ?? [];
    }

    getIndexesForResource(resourceId: number): readonly DeepReadonly<StoredIndex>[] {
        return this.indexesByResourceId.get(resourceId) ?? [];
    }
}

export const schemaCatalogCache = new SchemaCatalogCache();
