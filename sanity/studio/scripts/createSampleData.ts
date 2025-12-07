import { createClient } from "@sanity/client";

// Sanityクライアントの設定
const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || "",
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || "",
  apiVersion: "2024-01-01",
});

// カテゴリデータ
const categories = [
  {
    _type: "category",
    _id: "category-lifestyle",
    title: "ライフスタイル",
    slug: { _type: "slug", current: "lifestyle" },
    description: "心地よい暮らしのヒントとアイデア",
    sortOrder: 1,
    color: "#FF6B6B",
    seoTitle: "ライフスタイル記事一覧",
    seoDescription: "心地よい暮らしを実現するためのヒントとアイデアをお届けします。",
  },
  {
    _type: "category",
    _id: "category-interior",
    title: "インテリア",
    slug: { _type: "slug", current: "interior" },
    description: "お部屋を彩るインテリアのアイデア",
    sortOrder: 2,
    color: "#4ECDC4",
    seoTitle: "インテリア記事一覧",
    seoDescription: "お部屋を素敵に彩るインテリアのアイデアとコーディネート術。",
  },
  {
    _type: "category",
    _id: "category-kitchen",
    title: "キッチン",
    slug: { _type: "slug", current: "kitchen" },
    description: "料理が楽しくなるキッチングッズとレシピ",
    sortOrder: 3,
    color: "#FFE66D",
    seoTitle: "キッチン記事一覧",
    seoDescription: "料理が楽しくなるキッチングッズの紹介とレシピアイデア。",
  },
  {
    _type: "category",
    _id: "category-featured",
    title: "特集",
    slug: { _type: "slug", current: "featured" },
    description: "季節の特集とおすすめ商品",
    sortOrder: 4,
    color: "#A8E6CF",
    seoTitle: "特集記事一覧",
    seoDescription: "季節ごとの特集記事とスタッフのおすすめ商品をご紹介。",
  },
];

// 著者データ
const authors = [
  {
    _type: "author",
    _id: "author-spirom-staff",
    name: "Spiromスタッフ",
    slug: { _type: "slug", current: "spirom-staff" },
    bio: "暮らしを豊かにする商品を厳選してお届けするSpiromチーム。日々の生活に寄り添う情報をお届けします。",
    active: true,
  },
  {
    _type: "author",
    _id: "author-editor",
    name: "編集部",
    slug: { _type: "slug", current: "editor" },
    bio: "Spirom編集部。トレンドや暮らしのヒントを日々リサーチしています。",
    active: true,
  },
];

// ブログ記事データ
const posts = [
  {
    _type: "post",
    _id: "post-sustainable-living",
    title: "サステナブルな暮らしを始めよう",
    slug: { _type: "slug", current: "sustainable-living" },
    excerpt:
      "環境に優しい選択が、心地よい暮らしにつながります。日常でできる小さな一歩から始めてみませんか。",
    publishedAt: new Date("2024-12-01").toISOString(),
    author: { _type: "reference", _ref: "author-spirom-staff" },
    category: { _type: "reference", _ref: "category-lifestyle" },
    featured: true,
    tags: ["サステナブル", "エコ", "ライフスタイル"],
    body: [
      {
        _type: "block",
        style: "h2",
        children: [{ _type: "span", text: "はじめに" }],
      },
      {
        _type: "block",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "サステナブルな暮らしは、難しく考える必要はありません。日々の小さな選択の積み重ねが、大きな変化を生み出します。",
          },
        ],
      },
      {
        _type: "block",
        style: "h2",
        children: [{ _type: "span", text: "できることから始めよう" }],
      },
      {
        _type: "block",
        listItem: "bullet",
        children: [{ _type: "span", text: "エコバッグを持ち歩く" }],
      },
      {
        _type: "block",
        listItem: "bullet",
        children: [{ _type: "span", text: "マイボトルを使う" }],
      },
      {
        _type: "block",
        listItem: "bullet",
        children: [{ _type: "span", text: "地元の食材を選ぶ" }],
      },
      {
        _type: "block",
        listItem: "bullet",
        children: [
          { _type: "span", text: "長く使える質の良いものを選ぶ" },
        ],
      },
      {
        _type: "block",
        style: "h2",
        children: [{ _type: "span", text: "まとめ" }],
      },
      {
        _type: "block",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "持続可能な暮らしは、私たち一人ひとりの意識から始まります。",
          },
        ],
      },
    ],
    seoTitle: "サステナブルな暮らしを始めよう | Spirom",
    seoDescription:
      "環境に優しい選択で心地よい暮らしを実現。日常でできるサステナブルな取り組みをご紹介します。",
  },
  {
    _type: "post",
    _id: "post-home-organizing",
    title: "整理整頓で心もスッキリ",
    slug: { _type: "slug", current: "home-organizing" },
    excerpt:
      "シンプルな暮らしのためのお片付けのコツをご紹介します。物を減らすことで、本当に大切なものが見えてきます。",
    publishedAt: new Date("2024-11-28").toISOString(),
    author: { _type: "reference", _ref: "author-editor" },
    category: { _type: "reference", _ref: "category-interior" },
    featured: true,
    tags: ["整理整頓", "ミニマリスト", "インテリア"],
    body: [
      {
        _type: "block",
        style: "h2",
        children: [{ _type: "span", text: "お片付けの基本" }],
      },
      {
        _type: "block",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "整理整頓は、物理的な空間だけでなく、心の整理にもつながります。",
          },
        ],
      },
      {
        _type: "block",
        style: "h3",
        children: [{ _type: "span", text: "ステップ1: 全てを出す" }],
      },
      {
        _type: "block",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "まずは整理したいエリアの物を全て取り出してみましょう。",
          },
        ],
      },
      {
        _type: "block",
        style: "h3",
        children: [{ _type: "span", text: "ステップ2: 分類する" }],
      },
      {
        _type: "block",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "「使う」「使わない」「迷う」の3つに分けていきます。",
          },
        ],
      },
      {
        _type: "block",
        style: "h2",
        children: [{ _type: "span", text: "収納のコツ" }],
      },
      {
        _type: "block",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "使用頻度の高いものは取り出しやすい場所に、低いものは奥にしまいましょう。",
          },
        ],
      },
    ],
    seoTitle: "整理整頓で心もスッキリ | Spirom",
    seoDescription:
      "シンプルな暮らしのためのお片付けのコツ。物を減らして本当に大切なものを見つけましょう。",
  },
  {
    _type: "post",
    _id: "post-handmade-crafts",
    title: "手作りの温もりを暮らしに",
    slug: { _type: "slug", current: "handmade-crafts" },
    excerpt:
      "職人の技が光る、こだわりのハンドメイドアイテム特集。一つひとつに込められた想いをお届けします。",
    publishedAt: new Date("2024-11-25").toISOString(),
    author: { _type: "reference", _ref: "author-spirom-staff" },
    category: { _type: "reference", _ref: "category-featured" },
    featured: false,
    tags: ["ハンドメイド", "職人", "特集"],
    body: [
      {
        _type: "block",
        style: "h2",
        children: [{ _type: "span", text: "ハンドメイドの魅力" }],
      },
      {
        _type: "block",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "大量生産品にはない、作り手の温もりが感じられるハンドメイド商品。",
          },
        ],
      },
      {
        _type: "block",
        style: "h3",
        children: [{ _type: "span", text: "陶器の器" }],
      },
      {
        _type: "block",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "一つひとつ手作業で成形され、焼き上げられる器たち。使うほどに味わいが増していきます。",
          },
        ],
      },
      {
        _type: "block",
        style: "h3",
        children: [{ _type: "span", text: "木工製品" }],
      },
      {
        _type: "block",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "天然木の温もりと、職人の丁寧な仕上げが光る木工製品。長く愛用できる逸品です。",
          },
        ],
      },
    ],
    seoTitle: "手作りの温もりを暮らしに | Spirom",
    seoDescription:
      "職人の技が光るハンドメイドアイテム特集。一つひとつに込められた想いをお届けします。",
  },
  {
    _type: "post",
    _id: "post-autumn-collection",
    title: "秋の新商品が入荷しました",
    slug: { _type: "slug", current: "autumn-collection" },
    excerpt:
      "温かみのあるカラーと上質な素材。秋を彩る新商品をご紹介します。",
    publishedAt: new Date("2024-11-20").toISOString(),
    author: { _type: "reference", _ref: "author-spirom-staff" },
    category: { _type: "reference", _ref: "category-featured" },
    featured: false,
    tags: ["新商品", "秋", "特集"],
    body: [
      {
        _type: "block",
        style: "h2",
        children: [{ _type: "span", text: "秋のコレクション" }],
      },
      {
        _type: "block",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "今年の秋は、落ち着いたアースカラーを中心としたラインナップです。",
          },
        ],
      },
      {
        _type: "block",
        style: "h3",
        children: [{ _type: "span", text: "注目のアイテム" }],
      },
      {
        _type: "block",
        listItem: "bullet",
        children: [{ _type: "span", text: "ウール混紡のブランケット" }],
      },
      {
        _type: "block",
        listItem: "bullet",
        children: [{ _type: "span", text: "陶器のマグカップセット" }],
      },
      {
        _type: "block",
        listItem: "bullet",
        children: [{ _type: "span", text: "アロマキャンドル" }],
      },
      {
        _type: "block",
        style: "h2",
        children: [{ _type: "span", text: "秋の暮らしを楽しむ" }],
      },
      {
        _type: "block",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "季節の移り変わりを感じながら、心地よい時間をお過ごしください。",
          },
        ],
      },
    ],
    seoTitle: "秋の新商品が入荷しました | Spirom",
    seoDescription:
      "温かみのあるカラーと上質な素材。秋を彩る新商品をご紹介します。",
  },
];

// データを作成する関数
async function createSampleData() {
  try {
    console.log("🚀 サンプルデータの作成を開始します...\n");

    // カテゴリを作成
    console.log("📁 カテゴリを作成中...");
    for (const category of categories) {
      await client.createOrReplace(category);
      console.log(`  ✓ ${category.title}`);
    }

    // 著者を作成
    console.log("\n👤 著者を作成中...");
    for (const author of authors) {
      await client.createOrReplace(author);
      console.log(`  ✓ ${author.name}`);
    }

    // ブログ記事を作成
    console.log("\n📝 ブログ記事を作成中...");
    for (const post of posts) {
      await client.createOrReplace(post);
      console.log(`  ✓ ${post.title}`);
    }

    console.log("\n✅ サンプルデータの作成が完了しました!");
    console.log("\nSanity Studio (http://localhost:3333) でデータを確認してください。");
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  }
}

// スクリプトを実行
createSampleData();

