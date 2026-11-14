import {
  parse,
  type SFCScriptBlock,
  type SFCStyleBlock,
  type SFCTemplateBlock,
} from '@vue/compiler-sfc';

export interface VueParts {
  template?: SFCTemplateBlock;
  script?: SFCScriptBlock;
  styles?: SFCStyleBlock[];
}

export const vueParse = (code: string, filename: string): VueParts => {
  const { descriptor, errors } = parse(code, { filename, sourceMap: false });
  if (errors.length > 0) {
    throw new Error(
      errors.map((e) => (e instanceof Error ? e.message : String(e))).join('\n'),
    );
  }

  const parts: VueParts = {};
  if (descriptor.template) parts.template = descriptor.template;
  const script = descriptor.script ?? descriptor.scriptSetup;
  if (script) parts.script = script;
  if (descriptor.styles.length > 0) parts.styles = descriptor.styles;
  return parts;
};
