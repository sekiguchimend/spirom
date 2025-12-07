import { defineField, defineType } from "sanity";

export default defineType({
  name: "category",
  title: "カテゴリ",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "タイトル",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "スラッグ",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "説明",
      type: "text",
      description: "カテゴリの説明文",
    }),
    defineField({
      name: "image",
      title: "画像",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "parent",
      title: "親カテゴリ",
      type: "reference",
      to: [{ type: "category" }],
      description: "サブカテゴリの場合、親カテゴリを選択",
    }),
    defineField({
      name: "sortOrder",
      title: "表示順",
      type: "number",
      description: "小さい数字ほど先に表示されます",
      initialValue: 0,
    }),
    defineField({
      name: "color",
      title: "カラーコード",
      type: "string",
      description: "カテゴリのブランドカラー（例: #FF5733）",
      validation: (Rule) =>
        Rule.custom((color: string | undefined) => {
          if (!color) return true;
          return /^#[0-9A-F]{6}$/i.test(color) || "有効なカラーコードを入力してください（例: #FF5733）";
        }),
    }),
    defineField({
      name: "seoTitle",
      title: "SEO用タイトル",
      type: "string",
      description: "カテゴリページのSEOタイトル",
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: "seoDescription",
      title: "SEO用ディスクリプション",
      type: "text",
      description: "カテゴリページのSEO説明文",
      validation: (Rule) => Rule.max(160),
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
      media: "image",
    },
  },
  orderings: [
    {
      title: "表示順",
      name: "sortOrderAsc",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
    {
      title: "タイトル",
      name: "titleAsc",
      by: [{ field: "title", direction: "asc" }],
    },
  ],
});
