import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";

// Sanity Webhook用のISR再検証エンドポイント
export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-sanity-webhook-secret");

    // Webhook シークレットの検証
    const expected = process.env.SANITY_WEBHOOK_SECRET;
    if (!secret || !expected) {
      return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
    }

    // NOTE: 文字列の単純比較はタイミング攻撃の足がかりになるため、
    // 長さ差を含めて漏れないようハッシュ同士を定数時間比較する。
    const a = createHash("sha256").update(secret, "utf8").digest();
    const b = createHash("sha256").update(expected, "utf8").digest();
    if (!timingSafeEqual(a, b)) {
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
