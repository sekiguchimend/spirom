import { defineType, defineArrayMember } from "sanity";

export default defineType({
  name: "blockContent",
  title: "Block Content",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      title: "Block",
      styles: [
        { title: "標準", value: "normal" },
        { title: "見出し1", value: "h1" },
        { title: "見出し2", value: "h2" },
        { title: "見出し3", value: "h3" },
        { title: "見出し4", value: "h4" },
        { title: "引用", value: "blockquote" },
      ],
      lists: [
        { title: "箇条書き", value: "bullet" },
        { title: "番号付きリスト", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "太字", value: "strong" },
          { title: "斜体", value: "em" },
          { title: "下線", value: "underline" },
          { title: "取り消し線", value: "strike-through" },
          { title: "コード", value: "code" },
        ],
        annotations: [
          {
            name: "link",
            title: "リンク",
            type: "object",
            fields: [
              {
                name: "href",
                title: "URL",
                type: "url",
                validation: (Rule) =>
                  Rule.uri({
                    allowRelative: true,
                    scheme: ["http", "https", "mailto", "tel"],
                  }),
              },
              {
                name: "blank",
                title: "新しいタブで開く",
                type: "boolean",
                initialValue: false,
              },
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: "image",
      title: "画像",
      options: { hotspot: true },
      fields: [
        {
          name: "alt",
          title: "代替テキスト",
          type: "string",
          description: "画像の説明（SEOとアクセシビリティに重要）",
        },
        {
          name: "caption",
          title: "キャプション",
          type: "string",
        },
      ],
    }),
    defineArrayMember({
      type: "code",
      title: "コードブロック",
      options: {
        language: "javascript",
        languageAlternatives: [
          { title: "JavaScript", value: "javascript" },
          { title: "TypeScript", value: "typescript" },
          { title: "HTML", value: "html" },
          { title: "CSS", value: "css" },
          { title: "Python", value: "python" },
          { title: "Rust", value: "rust" },
          { title: "JSON", value: "json" },
          { title: "Bash", value: "bash" },
        ],
        withFilename: true,
      },
    }),
  ],
});
