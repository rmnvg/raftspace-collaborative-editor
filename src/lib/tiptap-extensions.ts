import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";

// Single source of truth for the editor's schema, shared by the live editor
// (Prompt 5) and the server-side import conversion (Prompt 6) so imported
// content always matches what the editor can actually render.
export const tiptapExtensions = [
  StarterKit.configure({ heading: { levels: [1, 2] } }),
  Underline,
];
