import type { FictionFlowEnabled, ServerPrompt } from './api';

const directions = ['RU-EN', 'RU-FR', 'EN-RU', 'FR-RU', 'FR-EN'];

export function previewDirections(name: string) {
  if (name === 'reader_check_calques.txt') return ['RU-EN'];
  const suffix = /_(ru|en|fr|x)_(ru|en|fr)\.txt$/.exec(name);
  if (!suffix) return directions;
  return directions.filter(pair => {
    const [from, to] = pair.toLowerCase().split('-');
    return (suffix[1] === 'x' || suffix[1] === from) && suffix[2] === to;
  });
}

export function promptPreview(template: ServerPrompt, catalog: ServerPrompt[], direction: string, draft: string) {
  const stage: keyof FictionFlowEnabled = template.group === 'revise' ? 'revision' : template.group === 'reader-check'
    ? (template.name === 'correct_fiction.txt' ? 'correction' : 'readerCheck') : template.group;
  const enabled: FictionFlowEnabled = {
    glossary: stage === 'glossary', translate: stage !== 'glossary', revision: stage === 'revision',
    readerCheck: stage === 'readerCheck' || stage === 'correction', correction: stage === 'correction',
  };
  const prompts: Partial<Record<keyof FictionFlowEnabled, string>> = { [stage]: draft };
  // The playground's built-in Pass 1 predates the direction-specific catalog.
  // Supply the live prerequisite for the selected source/target, including → RU.
  if (enabled.translate && stage !== 'translate') {
    prompts.translate = catalog.find(item => item.group === 'translate' && previewDirections(item.name).includes(direction))?.content;
  }
  if (enabled.correction) prompts.readerCheck = catalog.find(item => item.name === 'reader_check_fiction.txt')?.content;
  const available = previewDirections(template.name).includes(direction) &&
    (!enabled.translate || !!prompts.translate?.trim()) && (!enabled.readerCheck || !!prompts.readerCheck?.trim());
  return { stage, enabled, prompts, available } as const;
}
