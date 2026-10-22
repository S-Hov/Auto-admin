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

function CheckboxField({ value, defaultValue, disabled = false, showLabel = true }: {
    value?: boolean;
    defaultValue?: boolean;
    disabled?: boolean;
    showLabel?: boolean;
}) {
    const { control } = useForm<{ active: boolean }>({
        defaultValues: value === undefined ? {} : { active: value },
    });
    return createElement(ControlledInput<{ active: boolean }>, {
        name: 'active', control, label: 'Active', type: 'checkbox', defaultValue, disabled, showLabel,
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

    it('uses checked instead of a boolean value attribute for checkboxes', () => {
        const checked = renderToStaticMarkup(createElement(CheckboxField, { value: true }));
        const unchecked = renderToStaticMarkup(createElement(CheckboxField, { value: false, defaultValue: true }));
        expect(checked).toContain('checked=""');
        expect(unchecked).not.toContain('checked=""');
        expect(checked).not.toContain('value=');
        expect(unchecked).not.toContain('value=');
    });

    it('supports boolean defaults and defaults to unchecked', () => {
        expect(renderToStaticMarkup(createElement(CheckboxField, { defaultValue: true }))).toContain('checked=""');
        expect(renderToStaticMarkup(createElement(CheckboxField))).not.toContain('checked=""');
    });

    it('retains an accessible name when the visible label is hidden', () => {
        const html = renderToStaticMarkup(createElement(CheckboxField, { showLabel: false, disabled: true }));
        expect(html).toContain('aria-label="Active"');
        expect(html).toContain('disabled=""');
        expect(html).not.toContain('<span>Active</span>');
    });

    it('gives fields with the same name distinct IDs', () => {
        const html = renderToStaticMarkup(createElement('div', null,
            createElement(CheckboxField), createElement(CheckboxField)));
        const ids = [...html.matchAll(/<input[^>]* id="([^"]+)"/g)].map((match) => match[1]);
        expect(ids).toHaveLength(2);
        expect(new Set(ids).size).toBe(2);
        for (const id of ids) expect(html).toContain(`for="${id}"`);
    });
});
