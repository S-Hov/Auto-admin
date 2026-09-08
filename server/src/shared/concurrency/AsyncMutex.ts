export class AsyncMutex {
    private tail: Promise<void> = Promise.resolve();

    async acquire(): Promise<() => void> {
        let releaseCurrent!: () => void;
        const current = new Promise<void>((resolve) => {
            releaseCurrent = resolve;
        });
        const previous = this.tail;
        this.tail = previous.then(() => current);

        await previous;

        let released = false;
        return () => {
            if (released) return;
            released = true;
            releaseCurrent();
        };
    }
}
