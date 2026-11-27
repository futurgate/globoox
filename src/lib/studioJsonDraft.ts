import { parseTree, type ParseError } from 'jsonc-parser';

/** Diagnostics for any editable JSON document, independent of its presentation. */
export type JsonIssue = { message: string; path?: string; offset?: number };

export function readJson(raw: string): { value: unknown; issue: null } | { value?: never; issue: JsonIssue } {
  try {
    return { value: JSON.parse(raw), issue: null };
  } catch {
    // Safari and some embedded browsers omit offsets from the native SyntaxError.
    const errors: ParseError[] = [];
    parseTree(raw, errors, { disallowComments:true, allowTrailingComma:false });
    const offset = Math.min(raw.length, errors[0]?.offset ?? raw.length);
    const prefix = raw.slice(0, offset).split(/\r\n?|\n/);
    return { issue: {
      offset,
      message: `Ошибка синтаксиса JSON. Строка ${prefix.length}, столбец ${prefix[prefix.length - 1].length + 1}.`,
    } };
  }
}
