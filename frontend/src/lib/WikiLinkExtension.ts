import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { WikiLinkNode } from "./WikiLinkNode";
import {
  WikiLinkSuggestion,
  type WikiLinkSuggestionRef,
} from "./WikiLinkSuggestion";

export interface WikiLinkOptions {
  getNoteTitles: () => string[];
  suggestion: Partial<SuggestionOptions<string>>;
}

export const WikiLinkExtension = Node.create<WikiLinkOptions>({
  name: "wikiLink",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      getNoteTitles: () => [],
      suggestion: {},
    };
  },

  addAttributes() {
    return {
      title: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-wiki-link]",
        getAttrs: (el) => ({
          title: (el as HTMLElement).getAttribute("data-wiki-link") ?? "",
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({ "data-wiki-link": node.attrs.title }, HTMLAttributes),
      `[[${node.attrs.title}]]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikiLinkNode);
  },

  // tiptap-markdown integration
  addStorage() {
    return {
      markdown: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        serialize(state: any, node: any) {
          state.write(`[[${node.attrs.title}]]`);
        },
        parse: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setup(markdownit: any) {
            markdownit.inline.ruler.push(
              "wikilink",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (state: any, silent: boolean) => {
                const pos = state.pos;
                if (
                  state.src.charCodeAt(pos) !== 0x5b ||
                  state.src.charCodeAt(pos + 1) !== 0x5b
                )
                  return false;
                const closePos = state.src.indexOf("]]", pos + 2);
                if (closePos < 0) return false;
                if (!silent) {
                  const title = state.src.slice(pos + 2, closePos);
                  const token = state.push("html_inline", "", 0);
                  token.content = `<span data-wiki-link="${title}">[[${title}]]</span>`;
                }
                state.pos = closePos + 2;
                return true;
              }
            );
          },
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<string>({
        editor: this.editor,
        char: "[[",
        startOfLine: false,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: this.name, attrs: { title: props } },
              { type: "text", text: " " },
            ])
            .run();
        },
        items: ({ query }) => {
          return this.options
            .getNoteTitles()
            .filter((t) => t.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 8);
        },
        render: () => {
          let renderer: ReactRenderer<WikiLinkSuggestionRef>;

          return {
            onStart: (props) => {
              renderer = new ReactRenderer(WikiLinkSuggestion, {
                props,
                editor: props.editor,
              });
              document.body.appendChild(renderer.element);
            },
            onUpdate: (props) => {
              renderer.updateProps(props);
            },
            onKeyDown: ({ event }) => {
              return renderer.ref?.onKeyDown(event) ?? false;
            },
            onExit: () => {
              document.body.removeChild(renderer.element);
              renderer.destroy();
            },
          };
        },
        ...this.options.suggestion,
      }),
    ];
  },
});
