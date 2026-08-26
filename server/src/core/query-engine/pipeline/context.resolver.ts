import { PipelineExecutionContext } from "./pipeline.types";

export class ContextResolver {
    static escapeIdentifier(identifier: string): string[] {
        if (identifier.includes('.')) {
            return identifier
                .split('.')
                .map((part) => `\`${part.replace(/`/g, '')}\``);
        }
        return [identifier];
    }
    
    static resolvePath(context: PipelineExecutionContext, path: string): unknown {
        
    }
}