import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RecipePromptPicker } from '../app/studio/_components/RecipePromptPicker';
import IOSSettingsRow from '../components/ui/ios-settings-row';

const item = { id: 'variant', label: 'Личный вариант', content: 'Текст', revision: 2, deletedAt: null, active: false, template: 'glossary.txt' };

describe('личные варианты в селекторе рецепта', () => {
  const picker = (name?: string) => renderToStaticMarkup(createElement(RecipePromptPicker, {
    ownerId: 'owner', label: 'Шаблон глоссария', name, value: item.id, choices: [item],
    disabled: false, onChange: vi.fn(), onSaved: vi.fn(),
  }));
  it('opens a menu with account actions only when the recipe has a configured stage template', () => {
    expect(picker(item.template)).toContain('aria-haspopup="menu"');
    expect(picker(item.template)).toContain(item.label);
    expect(picker()).toContain('aria-haspopup="listbox"');
  });
  it('keeps ordinary settings controls as listboxes and permits adding to an empty managed selector', () => {
    const props = { label: 'Выбор', value: '', options: [], onChange: vi.fn() };
    const simple = renderToStaticMarkup(createElement(IOSSettingsRow, props));
    const editable = renderToStaticMarkup(createElement(IOSSettingsRow, { ...props, addAction: { label: 'Добавить', onClick: vi.fn() } }));
    expect(simple).toContain('disabled');
    expect(editable).not.toContain('disabled=""');
    expect(editable).toContain('aria-haspopup="menu"');
  });
});
