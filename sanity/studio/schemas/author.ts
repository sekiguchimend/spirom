import { defineField, defineType } from "sanity";

export default defineType({
  name: "author",
  title: "著者",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "名前",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "スラッグ",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
      },
    }),
    defineField({
      name: "image",
      title: "プロフィール画像",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "bio",
      title: "プロフィール",
      type: "text",
      description: "著者の簡単な紹介文",
    }),
    defineField({
      name: "email",
      title: "メールアドレス",
      type: "string",
    }),
    defineField({
      name: "socialLinks",
      title: "SNSリンク",
      type: "object",
      fields: [
        { name: "twitter", title: "Twitter/X", type: "url" },
        { name: "instagram", title: "Instagram", type: "url" },
        { name: "linkedin", title: "LinkedIn", type: "url" },
        { name: "website", title: "Webサイト", type: "url" },
      ],
    }),
  ],
  preview: {
    select: {
      title: "name",
      media: "image",
    },
  },
});
