export type ValidationParams = Record<string, string | number | boolean>;

export type FieldValidationError = {
    field: string;
    code: string;
    params?: ValidationParams;
}