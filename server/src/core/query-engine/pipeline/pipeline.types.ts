import { QueryResult } from "../drivers/driver.types";
import { UnifiedQuery } from "../types/query.types";

// Один шаг пайплайна
export interface PipelineStep {
    id: string;             // уникальный идентификатор шага (по нему следующие шаги будут ссылаться на результат)
    query: UnifiedQuery;    // AST-запрос
    dependsOn?: string[];   // список id шагов, от которых зависит данный шаг
}

// Манифест всего пайплайна
export interface PipelineDefinition {
    steps: PipelineStep[];      // список всех шагов
    transactional?: boolean;    // оборачивать ли весь пайплайн в одну общую транзакцию
}

// Контекст выполнения
export interface PipelineExecutionContext<T> {
    steps: Record<string, QueryResult<T>>   // объект, в который по мере выполнения мы складываем результаты
}

// Итоговый ответ клиенту
export interface PipelineResult<T> {
    success: boolean;
    steps: Record<string, QueryResult<T>>;  // результаты каждого выполненного шага.
    executionTimeMs?: number;               // общее время выполнения в миллисекундах
}