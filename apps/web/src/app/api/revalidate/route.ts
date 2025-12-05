import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Sanity Webhook用のISR再検証エンドポイント
export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-sanity-webhook-secret");

    // Webhook シークレットの検証
    if (secret !== process.env.SANITY_WEBHOOK_SECRET) {
      return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
    }

    const body = await request.json();

    // ブログ記事の場合、該当ページとブログ一覧を再検証
    if (body._type === "post") {
      revalidatePath("/blog");
      if (body.slug?.current) {
        revalidatePath(`/blog/${body.slug.current}`);
      }
    }

    // sitemap.xmlも再検証
    revalidatePath("/sitemap.xml");

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { message: "Error revalidating" },
      { status: 500 }
    );
  }
}
