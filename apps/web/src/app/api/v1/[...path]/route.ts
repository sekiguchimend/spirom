import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac, randomUUID } from 'crypto';
import { createServerClient } from '@supabase/ssr';

/**
 * `/api/v1/*` を BFF にプロキシする Route Handler。
 * - クライアントは常に同一オリジンに fetch できる（CORS/Mixed Content回避）
 * - 実際の上流(BFF)はサーバー環境変数で切り替える
 */
const BFF_BASE_URL =
  process.env.BFF_URL ||
  process.env.NEXT_PUBLIC_BFF_URL ||
  // 既存の環境変数との互換性（過去にBFF URLとして設定されていたケースに対応）
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8787';

// BFF直叩き（curl/Postman）対策：Nextサーバーのみが付与できるプロキシトークン
// - ブラウザには露出しない（NEXT_PUBLICは使わない）
const BFF_PROXY_TOKEN = process.env.BFF_PROXY_TOKEN || process.env.API_PROXY_TOKEN || '';

// デバッグログは明示的に有効化した場合のみ出力（パフォーマンス改善）
const DEBUG_PROXY =
  process.env.DEBUG_API_PROXY === '1' ||
  process.env.NEXT_PUBLIC_DEBUG_API_PROXY === '1';

const SESSION_COOKIE_NAME = 'spirom_session_id';

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET/JWT_SECRET is not set');
  }
  return secret;
}

function signSessionId(sessionId: string): string {
  return createHmac('sha256', getSessionSecret()).update(sessionId).digest('hex');
}

function parseCookieValue(cookie: string, name: string): string | null {
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function newSessionId(): string {
  // API側が検証する形式: sess_ + 32hex
  return `sess_${randomUUID().replace(/-/g, '')}`;
}

function bffBaseUrlSource() {
  if (process.env.BFF_URL) return 'BFF_URL';
  if (process.env.NEXT_PUBLIC_BFF_URL) return 'NEXT_PUBLIC_BFF_URL';
  if (process.env.NEXT_PUBLIC_API_URL) return 'NEXT_PUBLIC_API_URL';
  return 'default(http://localhost:8787)';
}

function pickHeaders(headers: Headers, names: string[]) {
  const out: Record<string, string> = {};
  for (const name of names) {
    const v = headers.get(name);
    if (v) out[name] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function safeTokenFingerprint(token: string) {
  // token自体は絶対にログに出さない（ハッシュだけ）
  try {
    return createHash('sha256').update(token).digest('hex').slice(0, 12);
  } catch {
    return 'hash_failed';
  }
}

function nowMs() {
  return Date.now();
}

function buildUpstreamUrl(req: NextRequest, pathParts: string[]) {
  const upstream = new URL(`${BFF_BASE_URL.replace(/\/$/, '')}/api/v1/${pathParts.join('/')}`);
  // クエリをそのまま引き継ぐ
  req.nextUrl.searchParams.forEach((value, key) => upstream.searchParams.set(key, value));
  return upstream;
}

function parseAllowedOrigins(req: NextRequest): Set<string> {
  const set = new Set<string>();
  // 実行中のオリジン（Vercel等でもここが最も確実）
  set.add(req.nextUrl.origin);
  // 明示設定がある場合（本番URLなど）
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.CSRF_ALLOWED_ORIGINS,
  ].filter(Boolean) as string[];

  for (const v of candidates) {
    for (const part of v.split(',').map((s) => s.trim()).filter(Boolean)) {
      try {
        set.add(new URL(part).origin);
      } catch {
        // ignore invalid url
      }
    }
  }
  return set;
}

function originFromHeaders(req: NextRequest): string | null {
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      return null;
    }
  }
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }
  return null;
}

function enforceCsrf(req: NextRequest, method: string): NextResponse | null {
  // ブラウザからの「状態変更」リクエストは同一オリジンのみ許可
  const unsafe = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  if (!unsafe) return null;

  const allowed = parseAllowedOrigins(req);
  const origin = originFromHeaders(req);

  if (!origin || !allowed.has(origin)) {
    return NextResponse.json(
      { message: 'CSRF protection: invalid origin' },
      { status: 403 }
    );
  }

  return null;
}

async function proxy(req: NextRequest, method: string, pathParts: string[]) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `req_${Math.random().toString(16).slice(2)}`;
  const startedAt = nowMs();

  const csrf = enforceCsrf(req, method);
  if (csrf) return csrf;

  const upstreamUrl = buildUpstreamUrl(req, pathParts);

  // NextRequest.headers は readonly なのでコピーしてから調整
  const headers = new Headers(req.headers);
  const originalAcceptEncoding = headers.get('accept-encoding') || undefined;
  headers.delete('host');
  headers.delete('connection');
  // 上流(BFF)から圧縮レスポンスを返されると、Next側fetchが自動解凍→ブラウザが二重解凍して
  // ERR_CONTENT_DECODING_FAILED になることがあるため、上流には圧縮を要求しない
  headers.delete('accept-encoding');

  // Authorization が無い場合は、Supabase SSR セッション(cookie)から補完する（認証の単一ソース）
  // ただし、認証不要なエンドポイント（products, categories, health）はスキップして高速化
  let cookiesToSet: Array<{ name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] }> = [];
  const pathStr = pathParts.join('/');
  const isPublicEndpoint =
    pathStr.startsWith('products') ||
    pathStr.startsWith('categories') ||
    pathStr === 'health' ||
    pathStr.startsWith('blog');

  if (!headers.get('authorization') && !isPublicEndpoint) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(nextCookies: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet = nextCookies;
            nextCookies.forEach(({ name, value }) => req.cookies.set(name, value));
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) headers.set('authorization', `Bearer ${token}`);
  }

  // カート/注文で使うセッション（署名付き）を上流へ付与
  // - ブラウザは署名できないため、Nextサーバー側で署名して付与する
  // - クライアントが任意の session_id を偽装しても署名が無ければ無効化される
  const cookie = req.headers.get('cookie') || '';
  let sessionId = parseCookieValue(cookie, SESSION_COOKIE_NAME);
  let setSessionCookie = false;
  if (!sessionId) {
    sessionId = newSessionId();
    setSessionCookie = true;
  }
  if (sessionId) {
    headers.set('x-session-id', sessionId);
    headers.set('x-session-signature', signSessionId(sessionId));
  }

  // 相関IDを上流へ（BFFログと突合できるように）
  headers.set('x-request-id', requestId);
  const clientReqId = req.headers.get('x-client-request-id');
  if (clientReqId) headers.set('x-client-request-id', clientReqId);

  // Bot/curl 対策：Next 経由のみ通す（本番はBFF側で必須化する）
  if (BFF_PROXY_TOKEN) {
    headers.set('x-bff-proxy-token', BFF_PROXY_TOKEN);
  }

  if (DEBUG_PROXY) {
    const authHeader = headers.get('authorization') || '';
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    const tokenInfo = bearer
      ? { present: true, length: bearer.length, fp: safeTokenFingerprint(bearer) }
      : { present: false };

    console.info('[api-proxy] -> start', {
      requestId,
      method,
      path: `/api/v1/${pathParts.join('/')}`,
      upstream: upstreamUrl.toString(),
      upstreamBaseUrl: BFF_BASE_URL,
      upstreamBaseUrlSource: bffBaseUrlSource(),
      token: tokenInfo,
      ua: req.headers.get('user-agent') || undefined,
      accept: req.headers.get('accept') || undefined,
      contentType: req.headers.get('content-type') || undefined,
      clientRequestId: clientReqId || undefined,
      origin: req.headers.get('origin') || undefined,
      referer: req.headers.get('referer') || undefined,
      originalAcceptEncoding,
    });
  }

  // ボディの読み取り（GET/HEADは読み取らない）
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      redirect: 'manual',
    });
  } catch (e) {
    // ネットワークエラーは、原因が分かるメッセージを返す
    const message =
      `BFFへの接続に失敗しました（${BFF_BASE_URL}）。` +
      ` ローカル開発ならBFFが起動しているか、/health が 200 になるか確認してください。`;
    if (DEBUG_PROXY) {
      console.error('[api-proxy] !! upstream fetch failed', {
        requestId,
        method,
        upstream: upstreamUrl.toString(),
        elapsedMs: nowMs() - startedAt,
        error: e instanceof Error ? { name: e.name, message: e.message } : String(e),
      });
    }
    return NextResponse.json(
      { message, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  // レスポンスは基本そのまま返す（ストリーム対応）
  const resHeaders = new Headers(upstreamRes.headers);
  const upstreamInfo = {
    status: upstreamRes.status,
    contentType: upstreamRes.headers.get('content-type') || undefined,
    contentEncoding: upstreamRes.headers.get('content-encoding') || undefined,
    contentLength: upstreamRes.headers.get('content-length') || undefined,
  };
  const upstreamHeaderHints = pickHeaders(upstreamRes.headers, [
    // どの環境/どのプロキシに当たっているかを確実に判別するためのヘッダ
    'server',
    'via',
    'fly-request-id',
    'cf-ray',
    'x-request-id',
    'x-bff-env',
    'x-bff-api-base-url',
    'x-bff-upstream-url',
    // そのほかの判別材料
    'content-encoding',
    'content-type',
  ]);
  // hop-by-hop headers は除去
  resHeaders.delete('connection');
  resHeaders.delete('keep-alive');
  resHeaders.delete('proxy-authenticate');
  resHeaders.delete('proxy-authorization');
  resHeaders.delete('te');
  resHeaders.delete('trailers');
  resHeaders.delete('transfer-encoding');
  resHeaders.delete('upgrade');
  // Next の fetch が自動的に解凍したボディを返す場合があるため、content-encoding/length を落とす
  resHeaders.delete('content-encoding');
  resHeaders.delete('content-length');

  // 相関IDをクライアントにも返す
  resHeaders.set('x-request-id', requestId);
  if (clientReqId) resHeaders.set('x-client-request-id', clientReqId);

  if (DEBUG_PROXY) {
    console.info('[api-proxy] <- end', {
      requestId,
      method,
      upstreamUrl: upstreamUrl.toString(),
      elapsedMs: nowMs() - startedAt,
      upstream: upstreamInfo,
      upstreamHeaders: upstreamHeaderHints,
    });

    // 「localhost へ投げたのに server/via がクラウドっぽい」等、次で確実に気付ける警告
    try {
      const server = (upstreamRes.headers.get('server') || '').toLowerCase();
      const via = (upstreamRes.headers.get('via') || '').toLowerCase();
      if (upstreamUrl.hostname === 'localhost' || upstreamUrl.hostname === '127.0.0.1') {
        const looksRemote =
          server.includes('fly') ||
          via.includes('fly') ||
          Boolean(upstreamRes.headers.get('fly-request-id'));
        if (looksRemote) {
          console.warn('[api-proxy] upstream looks remote although upstreamUrl is localhost', {
            requestId,
            upstreamUrl: upstreamUrl.toString(),
            upstreamHeaders: upstreamHeaderHints,
          });
        }
      }
    } catch {
      // ignore
    }

    // 401/4xx/5xx の場合は本文の断片も出す（最大800文字、JSON/テキストのみ）
    if (!upstreamRes.ok) {
      try {
        const cloned = upstreamRes.clone();
        const ct = cloned.headers.get('content-type') || '';
        if (ct.includes('application/json') || ct.includes('text/')) {
          const text = await cloned.text();
          console.warn('[api-proxy] response body (truncated)', {
            requestId,
            status: upstreamRes.status,
            body: text.slice(0, 800),
          });
        }
      } catch (e) {
        console.warn('[api-proxy] failed to read error body', {
          requestId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  const response = new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: resHeaders,
  });

  // Supabase セッション更新が走った場合は、cookie をクライアントへ返す
  if (cookiesToSet.length) {
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
  }

  if (setSessionCookie && sessionId) {
    const secure = process.env.NODE_ENV === 'production';
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
  }

  return response;
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(req, 'GET', path);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(req, 'POST', path);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(req, 'PUT', path);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(req, 'DELETE', path);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(req, 'PATCH', path);
}


