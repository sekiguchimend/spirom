import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { codeInput } from "@sanity/code-input";
import { schemaTypes } from "./schemas";

export default defineConfig({
  name: "spirom",
  title: "Spirom Blog CMS",

  projectId: process.env.SANITY_STUDIO_PROJECT_ID || "your-project-id",
  dataset: process.env.SANITY_STUDIO_DATASET || "production",

  plugins: [
    codeInput(),
    structureTool(),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },

  studio: {
    components: {
      // カスタムコンポーネントをここに追加可能
    },
  },
});
