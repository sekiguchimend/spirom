import { defineField, defineType } from "sanity";

export default defineType({
  name: "post",
  title: "ブログ記事",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "タイトル",
      type: "string",
      validation: (Rule) => Rule.required().min(1).max(100),
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
      name: "mainImage",
      title: "メイン画像",
      type: "image",
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
      fields: [
        {
          name: "alt",
          title: "代替テキスト",
          type: "string",
          description: "画像の説明（SEOとアクセシビリティに重要）",
        },
      ],
    }),
    defineField({
      name: "publishedAt",
      title: "公開日",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "author",
      title: "著者",
      type: "reference",
      to: [{ type: "author" }],
    }),
    defineField({
      name: "category",
      title: "カテゴリ",
      type: "reference",
      to: [{ type: "category" }],
    }),
    defineField({
      name: "body",
      title: "本文",
      type: "blockContent",
    }),
    defineField({
      name: "seoTitle",
      title: "SEO用タイトル",
      type: "string",
      description: "検索エンジン用のタイトル（空の場合はタイトルが使用されます）",
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: "seoDescription",
      title: "SEO用ディスクリプション",
      type: "text",
      description: "検索エンジン用の説明文",
      validation: (Rule) => Rule.max(160),
    }),
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      media: "mainImage",
      publishedAt: "publishedAt",
    },
    prepare(selection) {
      const { author, publishedAt } = selection;
      const date = publishedAt
        ? new Date(publishedAt).toLocaleDateString("ja-JP")
        : "未公開";
      return {
        ...selection,
        subtitle: author ? `${author} | ${date}` : date,
      };
    },
  },
  orderings: [
    {
      title: "公開日（新しい順）",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
    {
      title: "公開日（古い順）",
      name: "publishedAtAsc",
      by: [{ field: "publishedAt", direction: "asc" }],
    },
  ],
});
