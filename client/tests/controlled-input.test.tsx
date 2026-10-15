import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { ControlledInput } from '../src/shared/form/ControlledInput/ControlledInput';

function Field({ value, defaultValue }: { value?: string; defaultValue?: string }) {
    const { control } = useForm<{ text: string }>({
        defaultValues: value === undefined ? {} : { text: value },
    });
    return createElement(ControlledInput<{ text: string }>, {
        name: 'text', control, label: 'Text', defaultValue,
    });
}

describe('ControlledInput', () => {
    it('renders the current form value instead of replacing it with a default', () => {
        for (const value of ['', 'user', 'user123']) {
            const html = renderToStaticMarkup(createElement(Field, { value, defaultValue: 'initial' }));
            expect(html).toContain(`value="${value}"`);
        }
    });

    it('initializes a field default when the form has no value', () => {
        const html = renderToStaticMarkup(createElement(Field, { defaultValue: 'Menu item' }));
        expect(html).toContain('value="Menu item"');
    });
});
