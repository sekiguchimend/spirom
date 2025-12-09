var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-WF4eRo/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// build/worker/shim.mjs
import U from "./c5ce179f116403fc6e251eed48be469d42947d96-index.wasm";
import un from "./c5ce179f116403fc6e251eed48be469d42947d96-index.wasm";
import { WorkerEntrypoint as tn } from "cloudflare:workers";
var q = Object.defineProperty;
var D = /* @__PURE__ */ __name((e2, t) => {
  for (var n in t) q(e2, n, { get: t[n], enumerable: true });
}, "D");
var g = {};
D(g, { IntoUnderlyingByteSource: /* @__PURE__ */ __name(() => F, "IntoUnderlyingByteSource"), IntoUnderlyingSink: /* @__PURE__ */ __name(() => R, "IntoUnderlyingSink"), IntoUnderlyingSource: /* @__PURE__ */ __name(() => S, "IntoUnderlyingSource"), MinifyConfig: /* @__PURE__ */ __name(() => y, "MinifyConfig"), PolishConfig: /* @__PURE__ */ __name(() => K, "PolishConfig"), R2Range: /* @__PURE__ */ __name(() => I, "R2Range"), RequestRedirect: /* @__PURE__ */ __name(() => Q, "RequestRedirect"), __wbg_Error_52673b7de5a0ca89: /* @__PURE__ */ __name(() => Z, "__wbg_Error_52673b7de5a0ca89"), __wbg_String_8f0eb39a4a4c2f66: /* @__PURE__ */ __name(() => ee, "__wbg_String_8f0eb39a4a4c2f66"), __wbg___wbindgen_boolean_get_dea25b33882b895b: /* @__PURE__ */ __name(() => te, "__wbg___wbindgen_boolean_get_dea25b33882b895b"), __wbg___wbindgen_debug_string_adfb662ae34724b6: /* @__PURE__ */ __name(() => ne, "__wbg___wbindgen_debug_string_adfb662ae34724b6"), __wbg___wbindgen_is_function_8d400b8b1af978cd: /* @__PURE__ */ __name(() => re, "__wbg___wbindgen_is_function_8d400b8b1af978cd"), __wbg___wbindgen_is_string_704ef9c8fc131030: /* @__PURE__ */ __name(() => _e, "__wbg___wbindgen_is_string_704ef9c8fc131030"), __wbg___wbindgen_is_undefined_f6b95eab589e0269: /* @__PURE__ */ __name(() => oe, "__wbg___wbindgen_is_undefined_f6b95eab589e0269"), __wbg___wbindgen_number_get_9619185a74197f95: /* @__PURE__ */ __name(() => ce, "__wbg___wbindgen_number_get_9619185a74197f95"), __wbg___wbindgen_string_get_a2a31e16edf96e42: /* @__PURE__ */ __name(() => se, "__wbg___wbindgen_string_get_a2a31e16edf96e42"), __wbg___wbindgen_throw_dd24417ed36fc46e: /* @__PURE__ */ __name(() => ie, "__wbg___wbindgen_throw_dd24417ed36fc46e"), __wbg__wbg_cb_unref_87dfb5aaa0cbcea7: /* @__PURE__ */ __name(() => ue, "__wbg__wbg_cb_unref_87dfb5aaa0cbcea7"), __wbg_body_947b901c33f7fe32: /* @__PURE__ */ __name(() => fe, "__wbg_body_947b901c33f7fe32"), __wbg_buffer_6cb2fecb1f253d71: /* @__PURE__ */ __name(() => be, "__wbg_buffer_6cb2fecb1f253d71"), __wbg_byobRequest_f8e3517f5f8ad284: /* @__PURE__ */ __name(() => ae, "__wbg_byobRequest_f8e3517f5f8ad284"), __wbg_byteLength_faa9938885bdeee6: /* @__PURE__ */ __name(() => ge, "__wbg_byteLength_faa9938885bdeee6"), __wbg_byteOffset_3868b6a19ba01dea: /* @__PURE__ */ __name(() => de, "__wbg_byteOffset_3868b6a19ba01dea"), __wbg_call_3020136f7a2d6e44: /* @__PURE__ */ __name(() => we, "__wbg_call_3020136f7a2d6e44"), __wbg_call_78f94eb02ec7f9b2: /* @__PURE__ */ __name(() => le, "__wbg_call_78f94eb02ec7f9b2"), __wbg_call_abb4ff46ce38be40: /* @__PURE__ */ __name(() => pe, "__wbg_call_abb4ff46ce38be40"), __wbg_call_c8baa5c5e72d274e: /* @__PURE__ */ __name(() => ye, "__wbg_call_c8baa5c5e72d274e"), __wbg_cancel_a65cf45dca50ba4c: /* @__PURE__ */ __name(() => xe, "__wbg_cancel_a65cf45dca50ba4c"), __wbg_catch_b9db41d97d42bd02: /* @__PURE__ */ __name(() => he, "__wbg_catch_b9db41d97d42bd02"), __wbg_cause_2863fe79d084e5de: /* @__PURE__ */ __name(() => me, "__wbg_cause_2863fe79d084e5de"), __wbg_cf_194957b722a72988: /* @__PURE__ */ __name(() => Fe, "__wbg_cf_194957b722a72988"), __wbg_cf_2d8126b4ac84e631: /* @__PURE__ */ __name(() => Re, "__wbg_cf_2d8126b4ac84e631"), __wbg_close_0af5661bf3d335f2: /* @__PURE__ */ __name(() => Se, "__wbg_close_0af5661bf3d335f2"), __wbg_close_3ec111e7b23d94d8: /* @__PURE__ */ __name(() => Ie, "__wbg_close_3ec111e7b23d94d8"), __wbg_constructor_bd34b914d5a3a404: /* @__PURE__ */ __name(() => ke, "__wbg_constructor_bd34b914d5a3a404"), __wbg_done_62ea16af4ce34b24: /* @__PURE__ */ __name(() => Ee, "__wbg_done_62ea16af4ce34b24"), __wbg_enqueue_a7e6b1ee87963aad: /* @__PURE__ */ __name(() => Oe, "__wbg_enqueue_a7e6b1ee87963aad"), __wbg_entries_13da0847a5239578: /* @__PURE__ */ __name(() => Me, "__wbg_entries_13da0847a5239578"), __wbg_error_7534b8e9a36f1ab4: /* @__PURE__ */ __name(() => ze, "__wbg_error_7534b8e9a36f1ab4"), __wbg_error_7bc7d576a6aaf855: /* @__PURE__ */ __name(() => Ae, "__wbg_error_7bc7d576a6aaf855"), __wbg_fetch_99a2937bdadf44ce: /* @__PURE__ */ __name(() => Te, "__wbg_fetch_99a2937bdadf44ce"), __wbg_fetch_bf2dba3dc9383b4e: /* @__PURE__ */ __name(() => Le, "__wbg_fetch_bf2dba3dc9383b4e"), __wbg_getReader_48e00749fe3f6089: /* @__PURE__ */ __name(() => je, "__wbg_getReader_48e00749fe3f6089"), __wbg_getTime_ad1e9878a735af08: /* @__PURE__ */ __name(() => qe, "__wbg_getTime_ad1e9878a735af08"), __wbg_get_54490178d7d67e5e: /* @__PURE__ */ __name(() => De, "__wbg_get_54490178d7d67e5e"), __wbg_get_6b7bd52aca3f9671: /* @__PURE__ */ __name(() => Ue, "__wbg_get_6b7bd52aca3f9671"), __wbg_get_af9dab7e9603ea93: /* @__PURE__ */ __name(() => ve, "__wbg_get_af9dab7e9603ea93"), __wbg_get_done_f98a6e62c4e18fb9: /* @__PURE__ */ __name(() => Ce, "__wbg_get_done_f98a6e62c4e18fb9"), __wbg_get_value_63e39884ef11812e: /* @__PURE__ */ __name(() => We, "__wbg_get_value_63e39884ef11812e"), __wbg_headers_654c30e1bcccc552: /* @__PURE__ */ __name(() => Be, "__wbg_headers_654c30e1bcccc552"), __wbg_headers_850c3fb50632ae78: /* @__PURE__ */ __name(() => Ne, "__wbg_headers_850c3fb50632ae78"), __wbg_instanceof_Error_3443650560328fa9: /* @__PURE__ */ __name(() => $e, "__wbg_instanceof_Error_3443650560328fa9"), __wbg_instanceof_ReadableStream_412db92608b03a68: /* @__PURE__ */ __name(() => Pe, "__wbg_instanceof_ReadableStream_412db92608b03a68"), __wbg_instanceof_Response_cd74d1c2ac92cb0b: /* @__PURE__ */ __name(() => Ve, "__wbg_instanceof_Response_cd74d1c2ac92cb0b"), __wbg_length_22ac23eaec9d8053: /* @__PURE__ */ __name(() => He, "__wbg_length_22ac23eaec9d8053"), __wbg_log_1d990106d99dacb7: /* @__PURE__ */ __name(() => Xe, "__wbg_log_1d990106d99dacb7"), __wbg_method_6a1f0d0a9e501984: /* @__PURE__ */ __name(() => Ge, "__wbg_method_6a1f0d0a9e501984"), __wbg_minifyconfig_new: /* @__PURE__ */ __name(() => Je, "__wbg_minifyconfig_new"), __wbg_name_6d8c704cecb9e350: /* @__PURE__ */ __name(() => Ye, "__wbg_name_6d8c704cecb9e350"), __wbg_new_0_23cedd11d9b40c9d: /* @__PURE__ */ __name(() => Ke, "__wbg_new_0_23cedd11d9b40c9d"), __wbg_new_1ba21ce319a06297: /* @__PURE__ */ __name(() => Qe, "__wbg_new_1ba21ce319a06297"), __wbg_new_25f239778d6112b9: /* @__PURE__ */ __name(() => Ze, "__wbg_new_25f239778d6112b9"), __wbg_new_3c79b3bb1b32b7d3: /* @__PURE__ */ __name(() => et, "__wbg_new_3c79b3bb1b32b7d3"), __wbg_new_8a6f238a6ece86ea: /* @__PURE__ */ __name(() => tt, "__wbg_new_8a6f238a6ece86ea"), __wbg_new_b546ae120718850e: /* @__PURE__ */ __name(() => nt, "__wbg_new_b546ae120718850e"), __wbg_new_df1173567d5ff028: /* @__PURE__ */ __name(() => rt, "__wbg_new_df1173567d5ff028"), __wbg_new_ff12d2b041fb48f1: /* @__PURE__ */ __name(() => _t, "__wbg_new_ff12d2b041fb48f1"), __wbg_new_no_args_cb138f77cf6151ee: /* @__PURE__ */ __name(() => ot, "__wbg_new_no_args_cb138f77cf6151ee"), __wbg_new_with_byte_offset_and_length_d85c3da1fd8df149: /* @__PURE__ */ __name(() => ct, "__wbg_new_with_byte_offset_and_length_d85c3da1fd8df149"), __wbg_new_with_headers_58af989e06bb5134: /* @__PURE__ */ __name(() => st, "__wbg_new_with_headers_58af989e06bb5134"), __wbg_new_with_length_aa5eaf41d35235e5: /* @__PURE__ */ __name(() => it, "__wbg_new_with_length_aa5eaf41d35235e5"), __wbg_new_with_opt_buffer_source_and_init_1200e907bc1ec81d: /* @__PURE__ */ __name(() => ut, "__wbg_new_with_opt_buffer_source_and_init_1200e907bc1ec81d"), __wbg_new_with_opt_readable_stream_and_init_6377f53b425fda23: /* @__PURE__ */ __name(() => ft, "__wbg_new_with_opt_readable_stream_and_init_6377f53b425fda23"), __wbg_new_with_opt_str_and_init_01a4a75000df79cb: /* @__PURE__ */ __name(() => bt, "__wbg_new_with_opt_str_and_init_01a4a75000df79cb"), __wbg_new_with_str_and_init_c5748f76f5108934: /* @__PURE__ */ __name(() => at, "__wbg_new_with_str_and_init_c5748f76f5108934"), __wbg_next_3cfe5c0fe2a4cc53: /* @__PURE__ */ __name(() => gt, "__wbg_next_3cfe5c0fe2a4cc53"), __wbg_prototypesetcall_dfe9b766cdc1f1fd: /* @__PURE__ */ __name(() => dt, "__wbg_prototypesetcall_dfe9b766cdc1f1fd"), __wbg_queueMicrotask_9b549dfce8865860: /* @__PURE__ */ __name(() => wt, "__wbg_queueMicrotask_9b549dfce8865860"), __wbg_queueMicrotask_fca69f5bfad613a5: /* @__PURE__ */ __name(() => lt, "__wbg_queueMicrotask_fca69f5bfad613a5"), __wbg_read_39c4b35efcd03c25: /* @__PURE__ */ __name(() => pt, "__wbg_read_39c4b35efcd03c25"), __wbg_releaseLock_a5912f590b185180: /* @__PURE__ */ __name(() => yt, "__wbg_releaseLock_a5912f590b185180"), __wbg_resolve_fd5bfbaa4ce36e1e: /* @__PURE__ */ __name(() => xt, "__wbg_resolve_fd5bfbaa4ce36e1e"), __wbg_respond_9f7fc54636c4a3af: /* @__PURE__ */ __name(() => ht, "__wbg_respond_9f7fc54636c4a3af"), __wbg_set_169e13b608078b7b: /* @__PURE__ */ __name(() => mt, "__wbg_set_169e13b608078b7b"), __wbg_set_3807d5f0bfc24aa7: /* @__PURE__ */ __name(() => Ft, "__wbg_set_3807d5f0bfc24aa7"), __wbg_set_3f1d0b984ed272ed: /* @__PURE__ */ __name(() => Rt, "__wbg_set_3f1d0b984ed272ed"), __wbg_set_425eb8b710d5beee: /* @__PURE__ */ __name(() => St, "__wbg_set_425eb8b710d5beee"), __wbg_set_781438a03c0c3c81: /* @__PURE__ */ __name(() => It, "__wbg_set_781438a03c0c3c81"), __wbg_set_7df433eea03a5c14: /* @__PURE__ */ __name(() => kt, "__wbg_set_7df433eea03a5c14"), __wbg_set_body_8e743242d6076a4f: /* @__PURE__ */ __name(() => Et, "__wbg_set_body_8e743242d6076a4f"), __wbg_set_efaaf145b9377369: /* @__PURE__ */ __name(() => Ot, "__wbg_set_efaaf145b9377369"), __wbg_set_headers_5671cf088e114d2b: /* @__PURE__ */ __name(() => Mt, "__wbg_set_headers_5671cf088e114d2b"), __wbg_set_headers_9f734278b4257b03: /* @__PURE__ */ __name(() => zt, "__wbg_set_headers_9f734278b4257b03"), __wbg_set_method_76c69e41b3570627: /* @__PURE__ */ __name(() => At, "__wbg_set_method_76c69e41b3570627"), __wbg_set_redirect_e125c2dc00f1a7bf: /* @__PURE__ */ __name(() => Tt, "__wbg_set_redirect_e125c2dc00f1a7bf"), __wbg_set_signal_e89be862d0091009: /* @__PURE__ */ __name(() => Lt, "__wbg_set_signal_e89be862d0091009"), __wbg_set_status_2727ed43f6735170: /* @__PURE__ */ __name(() => jt, "__wbg_set_status_2727ed43f6735170"), __wbg_stack_0ed75d68575b0f3c: /* @__PURE__ */ __name(() => qt, "__wbg_stack_0ed75d68575b0f3c"), __wbg_static_accessor_GLOBAL_769e6b65d6557335: /* @__PURE__ */ __name(() => Dt, "__wbg_static_accessor_GLOBAL_769e6b65d6557335"), __wbg_static_accessor_GLOBAL_THIS_60cf02db4de8e1c1: /* @__PURE__ */ __name(() => Ut, "__wbg_static_accessor_GLOBAL_THIS_60cf02db4de8e1c1"), __wbg_static_accessor_SELF_08f5a74c69739274: /* @__PURE__ */ __name(() => vt, "__wbg_static_accessor_SELF_08f5a74c69739274"), __wbg_static_accessor_WINDOW_a8924b26aa92d024: /* @__PURE__ */ __name(() => Ct, "__wbg_static_accessor_WINDOW_a8924b26aa92d024"), __wbg_status_9bfc680efca4bdfd: /* @__PURE__ */ __name(() => Wt, "__wbg_status_9bfc680efca4bdfd"), __wbg_stringify_655a6390e1f5eb6b: /* @__PURE__ */ __name(() => Bt, "__wbg_stringify_655a6390e1f5eb6b"), __wbg_then_429f7caf1026411d: /* @__PURE__ */ __name(() => Nt, "__wbg_then_429f7caf1026411d"), __wbg_then_4f95312d68691235: /* @__PURE__ */ __name(() => $t, "__wbg_then_4f95312d68691235"), __wbg_toString_14b47ee7542a49ef: /* @__PURE__ */ __name(() => Pt, "__wbg_toString_14b47ee7542a49ef"), __wbg_url_87f30c96ceb3baf7: /* @__PURE__ */ __name(() => Vt, "__wbg_url_87f30c96ceb3baf7"), __wbg_value_57b7b035e117f7ee: /* @__PURE__ */ __name(() => Ht, "__wbg_value_57b7b035e117f7ee"), __wbg_view_788aaf149deefd2f: /* @__PURE__ */ __name(() => Xt, "__wbg_view_788aaf149deefd2f"), __wbg_webSocket_d11bc2bcaeace27a: /* @__PURE__ */ __name(() => Gt, "__wbg_webSocket_d11bc2bcaeace27a"), __wbindgen_cast_2241b6af4c4b2941: /* @__PURE__ */ __name(() => Jt, "__wbindgen_cast_2241b6af4c4b2941"), __wbindgen_cast_4625c577ab2ec9ee: /* @__PURE__ */ __name(() => Yt, "__wbindgen_cast_4625c577ab2ec9ee"), __wbindgen_cast_9ae0607507abb057: /* @__PURE__ */ __name(() => Kt, "__wbindgen_cast_9ae0607507abb057"), __wbindgen_cast_bed82e4eab6aa455: /* @__PURE__ */ __name(() => Qt, "__wbindgen_cast_bed82e4eab6aa455"), __wbindgen_cast_d6cd19b81560fd6e: /* @__PURE__ */ __name(() => Zt, "__wbindgen_cast_d6cd19b81560fd6e"), __wbindgen_init_externref_table: /* @__PURE__ */ __name(() => en, "__wbindgen_init_externref_table"), fetch: /* @__PURE__ */ __name(() => A, "fetch"), getMemory: /* @__PURE__ */ __name(() => C, "getMemory") });
var v = new WebAssembly.Instance(U, { "./index_bg.js": g });
var _ = v.exports;
function C() {
  return _.memory;
}
__name(C, "C");
function d(e2) {
  let t = _.__externref_table_alloc();
  return _.__wbindgen_externrefs.set(t, e2), t;
}
__name(d, "d");
var T = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry((e2) => e2.dtor(e2.a, e2.b));
function z(e2) {
  let t = typeof e2;
  if (t == "number" || t == "boolean" || e2 == null) return `${e2}`;
  if (t == "string") return `"${e2}"`;
  if (t == "symbol") {
    let o = e2.description;
    return o == null ? "Symbol" : `Symbol(${o})`;
  }
  if (t == "function") {
    let o = e2.name;
    return typeof o == "string" && o.length > 0 ? `Function(${o})` : "Function";
  }
  if (Array.isArray(e2)) {
    let o = e2.length, u = "[";
    o > 0 && (u += z(e2[0]));
    for (let s = 1; s < o; s++) u += ", " + z(e2[s]);
    return u += "]", u;
  }
  let n = /\[object ([^\]]+)\]/.exec(toString.call(e2)), r;
  if (n && n.length > 1) r = n[1];
  else return toString.call(e2);
  if (r == "Object") try {
    return "Object(" + JSON.stringify(e2) + ")";
  } catch {
    return "Object";
  }
  return e2 instanceof Error ? `${e2.name}: ${e2.message}
${e2.stack}` : r;
}
__name(z, "z");
function j(e2, t) {
  return e2 = e2 >>> 0, h().subarray(e2 / 1, e2 / 1 + t);
}
__name(j, "j");
var p = null;
function f() {
  return (p === null || p.buffer.detached === true || p.buffer.detached === void 0 && p.buffer !== _.memory.buffer) && (p = new DataView(_.memory.buffer)), p;
}
__name(f, "f");
function a(e2, t) {
  return e2 = e2 >>> 0, N(e2, t);
}
__name(a, "a");
var k = null;
function h() {
  return (k === null || k.byteLength === 0) && (k = new Uint8Array(_.memory.buffer)), k;
}
__name(h, "h");
function c(e2, t) {
  try {
    return e2.apply(this, t);
  } catch (n) {
    let r = d(n);
    _.__wbindgen_exn_store(r);
  }
}
__name(c, "c");
function i(e2) {
  return e2 == null;
}
__name(i, "i");
function W(e2, t, n, r) {
  let o = { a: e2, b: t, cnt: 1, dtor: n }, u = /* @__PURE__ */ __name((...s) => {
    o.cnt++;
    let b = o.a;
    o.a = 0;
    try {
      return r(b, o.b, ...s);
    } finally {
      o.a = b, u._wbg_cb_unref();
    }
  }, "u");
  return u._wbg_cb_unref = () => {
    --o.cnt === 0 && (o.dtor(o.a, o.b), o.a = 0, T.unregister(o));
  }, T.register(u, o, o), u;
}
__name(W, "W");
function l(e2, t, n) {
  if (n === void 0) {
    let b = m.encode(e2), x = t(b.length, 1) >>> 0;
    return h().subarray(x, x + b.length).set(b), w = b.length, x;
  }
  let r = e2.length, o = t(r, 1) >>> 0, u = h(), s = 0;
  for (; s < r; s++) {
    let b = e2.charCodeAt(s);
    if (b > 127) break;
    u[o + s] = b;
  }
  if (s !== r) {
    s !== 0 && (e2 = e2.slice(s)), o = n(o, r, r = s + e2.length * 3, 1) >>> 0;
    let b = h().subarray(o + s, o + r), x = m.encodeInto(e2, b);
    s += x.written, o = n(o, r, s, 1) >>> 0;
  }
  return w = s, o;
}
__name(l, "l");
var E = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
E.decode();
var B = 2146435072;
var M = 0;
function N(e2, t) {
  return M += t, M >= B && (E = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }), E.decode(), M = t), E.decode(h().subarray(e2, e2 + t));
}
__name(N, "N");
var m = new TextEncoder();
"encodeInto" in m || (m.encodeInto = function(e2, t) {
  let n = m.encode(e2);
  return t.set(n), { read: e2.length, written: n.length };
});
var w = 0;
function $(e2, t, n) {
  _.wasm_bindgen__convert__closures_____invoke__hd572778bb1b323dc(e2, t, n);
}
__name($, "$");
function P(e2, t, n, r) {
  _.wasm_bindgen__convert__closures_____invoke__h4700856478a2dd40(e2, t, n, r);
}
__name(P, "P");
var V = ["bytes"];
var H = ["follow", "error", "manual"];
var X = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry((e2) => _.__wbg_intounderlyingbytesource_free(e2 >>> 0, 1));
var G = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry((e2) => _.__wbg_intounderlyingsink_free(e2 >>> 0, 1));
var J = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry((e2) => _.__wbg_intounderlyingsource_free(e2 >>> 0, 1));
var L = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry((e2) => _.__wbg_minifyconfig_free(e2 >>> 0, 1));
var Y = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry((e2) => _.__wbg_r2range_free(e2 >>> 0, 1));
var F = class {
  static {
    __name(this, "F");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, X.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    _.__wbg_intounderlyingbytesource_free(t, 0);
  }
  get autoAllocateChunkSize() {
    return _.intounderlyingbytesource_autoAllocateChunkSize(this.__wbg_ptr) >>> 0;
  }
  pull(t) {
    return _.intounderlyingbytesource_pull(this.__wbg_ptr, t);
  }
  start(t) {
    _.intounderlyingbytesource_start(this.__wbg_ptr, t);
  }
  get type() {
    let t = _.intounderlyingbytesource_type(this.__wbg_ptr);
    return V[t];
  }
  cancel() {
    let t = this.__destroy_into_raw();
    _.intounderlyingbytesource_cancel(t);
  }
};
Symbol.dispose && (F.prototype[Symbol.dispose] = F.prototype.free);
var R = class {
  static {
    __name(this, "R");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, G.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    _.__wbg_intounderlyingsink_free(t, 0);
  }
  abort(t) {
    let n = this.__destroy_into_raw();
    return _.intounderlyingsink_abort(n, t);
  }
  close() {
    let t = this.__destroy_into_raw();
    return _.intounderlyingsink_close(t);
  }
  write(t) {
    return _.intounderlyingsink_write(this.__wbg_ptr, t);
  }
};
Symbol.dispose && (R.prototype[Symbol.dispose] = R.prototype.free);
var S = class {
  static {
    __name(this, "S");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, J.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    _.__wbg_intounderlyingsource_free(t, 0);
  }
  pull(t) {
    return _.intounderlyingsource_pull(this.__wbg_ptr, t);
  }
  cancel() {
    let t = this.__destroy_into_raw();
    _.intounderlyingsource_cancel(t);
  }
};
Symbol.dispose && (S.prototype[Symbol.dispose] = S.prototype.free);
var y = class e {
  static {
    __name(this, "e");
  }
  static __wrap(t) {
    t = t >>> 0;
    let n = Object.create(e.prototype);
    return n.__wbg_ptr = t, L.register(n, n.__wbg_ptr, n), n;
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, L.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    _.__wbg_minifyconfig_free(t, 0);
  }
  get js() {
    return _.__wbg_get_minifyconfig_js(this.__wbg_ptr) !== 0;
  }
  set js(t) {
    _.__wbg_set_minifyconfig_js(this.__wbg_ptr, t);
  }
  get html() {
    return _.__wbg_get_minifyconfig_html(this.__wbg_ptr) !== 0;
  }
  set html(t) {
    _.__wbg_set_minifyconfig_html(this.__wbg_ptr, t);
  }
  get css() {
    return _.__wbg_get_minifyconfig_css(this.__wbg_ptr) !== 0;
  }
  set css(t) {
    _.__wbg_set_minifyconfig_css(this.__wbg_ptr, t);
  }
};
Symbol.dispose && (y.prototype[Symbol.dispose] = y.prototype.free);
var K = Object.freeze({ Off: 0, 0: "Off", Lossy: 1, 1: "Lossy", Lossless: 2, 2: "Lossless" });
var I = class {
  static {
    __name(this, "I");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, Y.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    _.__wbg_r2range_free(t, 0);
  }
  get offset() {
    let t = _.__wbg_get_r2range_offset(this.__wbg_ptr);
    return t[0] === 0 ? void 0 : t[1];
  }
  set offset(t) {
    _.__wbg_set_r2range_offset(this.__wbg_ptr, !i(t), i(t) ? 0 : t);
  }
  get length() {
    let t = _.__wbg_get_r2range_length(this.__wbg_ptr);
    return t[0] === 0 ? void 0 : t[1];
  }
  set length(t) {
    _.__wbg_set_r2range_length(this.__wbg_ptr, !i(t), i(t) ? 0 : t);
  }
  get suffix() {
    let t = _.__wbg_get_r2range_suffix(this.__wbg_ptr);
    return t[0] === 0 ? void 0 : t[1];
  }
  set suffix(t) {
    _.__wbg_set_r2range_suffix(this.__wbg_ptr, !i(t), i(t) ? 0 : t);
  }
};
Symbol.dispose && (I.prototype[Symbol.dispose] = I.prototype.free);
var Q = Object.freeze({ Error: 0, 0: "Error", Follow: 1, 1: "Follow", Manual: 2, 2: "Manual" });
function A(e2, t, n) {
  return _.fetch(e2, t, n);
}
__name(A, "A");
function Z(e2, t) {
  return Error(a(e2, t));
}
__name(Z, "Z");
function ee(e2, t) {
  let n = String(t), r = l(n, _.__wbindgen_malloc, _.__wbindgen_realloc), o = w;
  f().setInt32(e2 + 4 * 1, o, true), f().setInt32(e2 + 4 * 0, r, true);
}
__name(ee, "ee");
function te(e2) {
  let t = e2, n = typeof t == "boolean" ? t : void 0;
  return i(n) ? 16777215 : n ? 1 : 0;
}
__name(te, "te");
function ne(e2, t) {
  let n = z(t), r = l(n, _.__wbindgen_malloc, _.__wbindgen_realloc), o = w;
  f().setInt32(e2 + 4 * 1, o, true), f().setInt32(e2 + 4 * 0, r, true);
}
__name(ne, "ne");
function re(e2) {
  return typeof e2 == "function";
}
__name(re, "re");
function _e(e2) {
  return typeof e2 == "string";
}
__name(_e, "_e");
function oe(e2) {
  return e2 === void 0;
}
__name(oe, "oe");
function ce(e2, t) {
  let n = t, r = typeof n == "number" ? n : void 0;
  f().setFloat64(e2 + 8 * 1, i(r) ? 0 : r, true), f().setInt32(e2 + 4 * 0, !i(r), true);
}
__name(ce, "ce");
function se(e2, t) {
  let n = t, r = typeof n == "string" ? n : void 0;
  var o = i(r) ? 0 : l(r, _.__wbindgen_malloc, _.__wbindgen_realloc), u = w;
  f().setInt32(e2 + 4 * 1, u, true), f().setInt32(e2 + 4 * 0, o, true);
}
__name(se, "se");
function ie(e2, t) {
  throw new Error(a(e2, t));
}
__name(ie, "ie");
function ue(e2) {
  e2._wbg_cb_unref();
}
__name(ue, "ue");
function fe(e2) {
  let t = e2.body;
  return i(t) ? 0 : d(t);
}
__name(fe, "fe");
function be(e2) {
  return e2.buffer;
}
__name(be, "be");
function ae(e2) {
  let t = e2.byobRequest;
  return i(t) ? 0 : d(t);
}
__name(ae, "ae");
function ge(e2) {
  return e2.byteLength;
}
__name(ge, "ge");
function de(e2) {
  return e2.byteOffset;
}
__name(de, "de");
function we() {
  return c(function(e2, t, n) {
    return e2.call(t, n);
  }, arguments);
}
__name(we, "we");
function le() {
  return c(function(e2, t, n, r, o) {
    return e2.call(t, n, r, o);
  }, arguments);
}
__name(le, "le");
function pe() {
  return c(function(e2, t) {
    return e2.call(t);
  }, arguments);
}
__name(pe, "pe");
function ye() {
  return c(function(e2, t, n, r) {
    return e2.call(t, n, r);
  }, arguments);
}
__name(ye, "ye");
function xe(e2) {
  return e2.cancel();
}
__name(xe, "xe");
function he(e2, t) {
  return e2.catch(t);
}
__name(he, "he");
function me(e2) {
  return e2.cause;
}
__name(me, "me");
function Fe() {
  return c(function(e2) {
    let t = e2.cf;
    return i(t) ? 0 : d(t);
  }, arguments);
}
__name(Fe, "Fe");
function Re() {
  return c(function(e2) {
    let t = e2.cf;
    return i(t) ? 0 : d(t);
  }, arguments);
}
__name(Re, "Re");
function Se() {
  return c(function(e2) {
    e2.close();
  }, arguments);
}
__name(Se, "Se");
function Ie() {
  return c(function(e2) {
    e2.close();
  }, arguments);
}
__name(Ie, "Ie");
function ke(e2) {
  return e2.constructor;
}
__name(ke, "ke");
function Ee(e2) {
  return e2.done;
}
__name(Ee, "Ee");
function Oe() {
  return c(function(e2, t) {
    e2.enqueue(t);
  }, arguments);
}
__name(Oe, "Oe");
function Me(e2) {
  return e2.entries();
}
__name(Me, "Me");
function ze(e2, t) {
  let n, r;
  try {
    n = e2, r = t, console.error(a(e2, t));
  } finally {
    _.__wbindgen_free(n, r, 1);
  }
}
__name(ze, "ze");
function Ae(e2) {
  console.error(e2);
}
__name(Ae, "Ae");
function Te(e2, t, n) {
  return e2.fetch(t, n);
}
__name(Te, "Te");
function Le(e2, t, n, r) {
  return e2.fetch(a(t, n), r);
}
__name(Le, "Le");
function je() {
  return c(function(e2) {
    return e2.getReader();
  }, arguments);
}
__name(je, "je");
function qe(e2) {
  return e2.getTime();
}
__name(qe, "qe");
function De() {
  return c(function(e2, t, n, r) {
    let o = t.get(a(n, r));
    var u = i(o) ? 0 : l(o, _.__wbindgen_malloc, _.__wbindgen_realloc), s = w;
    f().setInt32(e2 + 4 * 1, s, true), f().setInt32(e2 + 4 * 0, u, true);
  }, arguments);
}
__name(De, "De");
function Ue(e2, t) {
  return e2[t >>> 0];
}
__name(Ue, "Ue");
function ve() {
  return c(function(e2, t) {
    return Reflect.get(e2, t);
  }, arguments);
}
__name(ve, "ve");
function Ce(e2) {
  let t = e2.done;
  return i(t) ? 16777215 : t ? 1 : 0;
}
__name(Ce, "Ce");
function We(e2) {
  return e2.value;
}
__name(We, "We");
function Be(e2) {
  return e2.headers;
}
__name(Be, "Be");
function Ne(e2) {
  return e2.headers;
}
__name(Ne, "Ne");
function $e(e2) {
  let t;
  try {
    t = e2 instanceof Error;
  } catch {
    t = false;
  }
  return t;
}
__name($e, "$e");
function Pe(e2) {
  let t;
  try {
    t = e2 instanceof ReadableStream;
  } catch {
    t = false;
  }
  return t;
}
__name(Pe, "Pe");
function Ve(e2) {
  let t;
  try {
    t = e2 instanceof Response;
  } catch {
    t = false;
  }
  return t;
}
__name(Ve, "Ve");
function He(e2) {
  return e2.length;
}
__name(He, "He");
function Xe(e2) {
  console.log(e2);
}
__name(Xe, "Xe");
function Ge(e2, t) {
  let n = t.method, r = l(n, _.__wbindgen_malloc, _.__wbindgen_realloc), o = w;
  f().setInt32(e2 + 4 * 1, o, true), f().setInt32(e2 + 4 * 0, r, true);
}
__name(Ge, "Ge");
function Je(e2) {
  return y.__wrap(e2);
}
__name(Je, "Je");
function Ye(e2) {
  return e2.name;
}
__name(Ye, "Ye");
function Ke() {
  return /* @__PURE__ */ new Date();
}
__name(Ke, "Ke");
function Qe() {
  return new Object();
}
__name(Qe, "Qe");
function Ze() {
  return new Array();
}
__name(Ze, "Ze");
function et() {
  return c(function() {
    return new Headers();
  }, arguments);
}
__name(et, "et");
function tt() {
  return new Error();
}
__name(tt, "tt");
function nt() {
  return /* @__PURE__ */ new Map();
}
__name(nt, "nt");
function rt(e2, t) {
  return new Error(a(e2, t));
}
__name(rt, "rt");
function _t(e2, t) {
  try {
    var n = { a: e2, b: t }, r = /* @__PURE__ */ __name((u, s) => {
      let b = n.a;
      n.a = 0;
      try {
        return P(b, n.b, u, s);
      } finally {
        n.a = b;
      }
    }, "r");
    return new Promise(r);
  } finally {
    n.a = n.b = 0;
  }
}
__name(_t, "_t");
function ot(e2, t) {
  return new Function(a(e2, t));
}
__name(ot, "ot");
function ct(e2, t, n) {
  return new Uint8Array(e2, t >>> 0, n >>> 0);
}
__name(ct, "ct");
function st() {
  return c(function(e2) {
    return new Headers(e2);
  }, arguments);
}
__name(st, "st");
function it(e2) {
  return new Uint8Array(e2 >>> 0);
}
__name(it, "it");
function ut() {
  return c(function(e2, t) {
    return new Response(e2, t);
  }, arguments);
}
__name(ut, "ut");
function ft() {
  return c(function(e2, t) {
    return new Response(e2, t);
  }, arguments);
}
__name(ft, "ft");
function bt() {
  return c(function(e2, t, n) {
    return new Response(e2 === 0 ? void 0 : a(e2, t), n);
  }, arguments);
}
__name(bt, "bt");
function at() {
  return c(function(e2, t, n) {
    return new Request(a(e2, t), n);
  }, arguments);
}
__name(at, "at");
function gt() {
  return c(function(e2) {
    return e2.next();
  }, arguments);
}
__name(gt, "gt");
function dt(e2, t, n) {
  Uint8Array.prototype.set.call(j(e2, t), n);
}
__name(dt, "dt");
function wt(e2) {
  return e2.queueMicrotask;
}
__name(wt, "wt");
function lt(e2) {
  queueMicrotask(e2);
}
__name(lt, "lt");
function pt(e2) {
  return e2.read();
}
__name(pt, "pt");
function yt(e2) {
  e2.releaseLock();
}
__name(yt, "yt");
function xt(e2) {
  return Promise.resolve(e2);
}
__name(xt, "xt");
function ht() {
  return c(function(e2, t) {
    e2.respond(t >>> 0);
  }, arguments);
}
__name(ht, "ht");
function mt(e2, t, n) {
  e2.set(j(t, n));
}
__name(mt, "mt");
function Ft(e2, t, n) {
  e2[t] = n;
}
__name(Ft, "Ft");
function Rt(e2, t, n) {
  e2[t] = n;
}
__name(Rt, "Rt");
function St() {
  return c(function(e2, t, n, r, o) {
    e2.set(a(t, n), a(r, o));
  }, arguments);
}
__name(St, "St");
function It() {
  return c(function(e2, t, n) {
    return Reflect.set(e2, t, n);
  }, arguments);
}
__name(It, "It");
function kt(e2, t, n) {
  e2[t >>> 0] = n;
}
__name(kt, "kt");
function Et(e2, t) {
  e2.body = t;
}
__name(Et, "Et");
function Ot(e2, t, n) {
  return e2.set(t, n);
}
__name(Ot, "Ot");
function Mt(e2, t) {
  e2.headers = t;
}
__name(Mt, "Mt");
function zt(e2, t) {
  e2.headers = t;
}
__name(zt, "zt");
function At(e2, t, n) {
  e2.method = a(t, n);
}
__name(At, "At");
function Tt(e2, t) {
  e2.redirect = H[t];
}
__name(Tt, "Tt");
function Lt(e2, t) {
  e2.signal = t;
}
__name(Lt, "Lt");
function jt(e2, t) {
  e2.status = t;
}
__name(jt, "jt");
function qt(e2, t) {
  let n = t.stack, r = l(n, _.__wbindgen_malloc, _.__wbindgen_realloc), o = w;
  f().setInt32(e2 + 4 * 1, o, true), f().setInt32(e2 + 4 * 0, r, true);
}
__name(qt, "qt");
function Dt() {
  let e2 = typeof global > "u" ? null : global;
  return i(e2) ? 0 : d(e2);
}
__name(Dt, "Dt");
function Ut() {
  let e2 = typeof globalThis > "u" ? null : globalThis;
  return i(e2) ? 0 : d(e2);
}
__name(Ut, "Ut");
function vt() {
  let e2 = typeof self > "u" ? null : self;
  return i(e2) ? 0 : d(e2);
}
__name(vt, "vt");
function Ct() {
  let e2 = typeof window > "u" ? null : window;
  return i(e2) ? 0 : d(e2);
}
__name(Ct, "Ct");
function Wt(e2) {
  return e2.status;
}
__name(Wt, "Wt");
function Bt() {
  return c(function(e2) {
    return JSON.stringify(e2);
  }, arguments);
}
__name(Bt, "Bt");
function Nt(e2, t, n) {
  return e2.then(t, n);
}
__name(Nt, "Nt");
function $t(e2, t) {
  return e2.then(t);
}
__name($t, "$t");
function Pt(e2) {
  return e2.toString();
}
__name(Pt, "Pt");
function Vt(e2, t) {
  let n = t.url, r = l(n, _.__wbindgen_malloc, _.__wbindgen_realloc), o = w;
  f().setInt32(e2 + 4 * 1, o, true), f().setInt32(e2 + 4 * 0, r, true);
}
__name(Vt, "Vt");
function Ht(e2) {
  return e2.value;
}
__name(Ht, "Ht");
function Xt(e2) {
  let t = e2.view;
  return i(t) ? 0 : d(t);
}
__name(Xt, "Xt");
function Gt() {
  return c(function(e2) {
    let t = e2.webSocket;
    return i(t) ? 0 : d(t);
  }, arguments);
}
__name(Gt, "Gt");
function Jt(e2, t) {
  return a(e2, t);
}
__name(Jt, "Jt");
function Yt(e2) {
  return BigInt.asUintN(64, e2);
}
__name(Yt, "Yt");
function Kt(e2) {
  return e2;
}
__name(Kt, "Kt");
function Qt(e2, t) {
  return W(e2, t, _.wasm_bindgen__closure__destroy__h19c645e604deb7c5, $);
}
__name(Qt, "Qt");
function Zt(e2) {
  return e2;
}
__name(Zt, "Zt");
function en() {
  let e2 = _.__wbindgen_externrefs, t = e2.grow(4);
  e2.set(0, void 0), e2.set(t + 0, void 0), e2.set(t + 1, null), e2.set(t + 2, true), e2.set(t + 3, false);
}
__name(en, "en");
var O = class extends tn {
  static {
    __name(this, "O");
  }
  async fetch(t) {
    return await A(t, this.env, this.ctx);
  }
  async queue(t) {
    return await (void 0)(t, this.env, this.ctx);
  }
  async scheduled(t) {
    return await (void 0)(t, this.env, this.ctx);
  }
};
var nn = ["IntoUnderlyingByteSource", "IntoUnderlyingSink", "IntoUnderlyingSource", "MinifyConfig", "PolishConfig", "R2Range", "RequestRedirect", "fetch", "queue", "scheduled", "getMemory"];
Object.keys(g).map((e2) => {
  nn.includes(e2) | e2.startsWith("__") || (O.prototype[e2] = g[e2]);
});
var bn = O;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e2) {
      console.error("Failed to drain the unused request body.", e2);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e2) {
  return {
    name: e2?.name,
    message: e2?.message ?? String(e2),
    stack: e2?.stack,
    cause: e2?.cause === void 0 ? void 0 : reduceError(e2.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e2) {
    const error = reduceError(e2);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-WF4eRo/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = bn;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-WF4eRo/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  F as IntoUnderlyingByteSource,
  R as IntoUnderlyingSink,
  S as IntoUnderlyingSource,
  y as MinifyConfig,
  K as PolishConfig,
  I as R2Range,
  Q as RequestRedirect,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  Z as __wbg_Error_52673b7de5a0ca89,
  ee as __wbg_String_8f0eb39a4a4c2f66,
  te as __wbg___wbindgen_boolean_get_dea25b33882b895b,
  ne as __wbg___wbindgen_debug_string_adfb662ae34724b6,
  re as __wbg___wbindgen_is_function_8d400b8b1af978cd,
  _e as __wbg___wbindgen_is_string_704ef9c8fc131030,
  oe as __wbg___wbindgen_is_undefined_f6b95eab589e0269,
  ce as __wbg___wbindgen_number_get_9619185a74197f95,
  se as __wbg___wbindgen_string_get_a2a31e16edf96e42,
  ie as __wbg___wbindgen_throw_dd24417ed36fc46e,
  ue as __wbg__wbg_cb_unref_87dfb5aaa0cbcea7,
  fe as __wbg_body_947b901c33f7fe32,
  be as __wbg_buffer_6cb2fecb1f253d71,
  ae as __wbg_byobRequest_f8e3517f5f8ad284,
  ge as __wbg_byteLength_faa9938885bdeee6,
  de as __wbg_byteOffset_3868b6a19ba01dea,
  we as __wbg_call_3020136f7a2d6e44,
  le as __wbg_call_78f94eb02ec7f9b2,
  pe as __wbg_call_abb4ff46ce38be40,
  ye as __wbg_call_c8baa5c5e72d274e,
  xe as __wbg_cancel_a65cf45dca50ba4c,
  he as __wbg_catch_b9db41d97d42bd02,
  me as __wbg_cause_2863fe79d084e5de,
  Fe as __wbg_cf_194957b722a72988,
  Re as __wbg_cf_2d8126b4ac84e631,
  Se as __wbg_close_0af5661bf3d335f2,
  Ie as __wbg_close_3ec111e7b23d94d8,
  ke as __wbg_constructor_bd34b914d5a3a404,
  Ee as __wbg_done_62ea16af4ce34b24,
  Oe as __wbg_enqueue_a7e6b1ee87963aad,
  Me as __wbg_entries_13da0847a5239578,
  ze as __wbg_error_7534b8e9a36f1ab4,
  Ae as __wbg_error_7bc7d576a6aaf855,
  Te as __wbg_fetch_99a2937bdadf44ce,
  Le as __wbg_fetch_bf2dba3dc9383b4e,
  je as __wbg_getReader_48e00749fe3f6089,
  qe as __wbg_getTime_ad1e9878a735af08,
  De as __wbg_get_54490178d7d67e5e,
  Ue as __wbg_get_6b7bd52aca3f9671,
  ve as __wbg_get_af9dab7e9603ea93,
  Ce as __wbg_get_done_f98a6e62c4e18fb9,
  We as __wbg_get_value_63e39884ef11812e,
  Be as __wbg_headers_654c30e1bcccc552,
  Ne as __wbg_headers_850c3fb50632ae78,
  $e as __wbg_instanceof_Error_3443650560328fa9,
  Pe as __wbg_instanceof_ReadableStream_412db92608b03a68,
  Ve as __wbg_instanceof_Response_cd74d1c2ac92cb0b,
  He as __wbg_length_22ac23eaec9d8053,
  Xe as __wbg_log_1d990106d99dacb7,
  Ge as __wbg_method_6a1f0d0a9e501984,
  Je as __wbg_minifyconfig_new,
  Ye as __wbg_name_6d8c704cecb9e350,
  Ke as __wbg_new_0_23cedd11d9b40c9d,
  Qe as __wbg_new_1ba21ce319a06297,
  Ze as __wbg_new_25f239778d6112b9,
  et as __wbg_new_3c79b3bb1b32b7d3,
  tt as __wbg_new_8a6f238a6ece86ea,
  nt as __wbg_new_b546ae120718850e,
  rt as __wbg_new_df1173567d5ff028,
  _t as __wbg_new_ff12d2b041fb48f1,
  ot as __wbg_new_no_args_cb138f77cf6151ee,
  ct as __wbg_new_with_byte_offset_and_length_d85c3da1fd8df149,
  st as __wbg_new_with_headers_58af989e06bb5134,
  it as __wbg_new_with_length_aa5eaf41d35235e5,
  ut as __wbg_new_with_opt_buffer_source_and_init_1200e907bc1ec81d,
  ft as __wbg_new_with_opt_readable_stream_and_init_6377f53b425fda23,
  bt as __wbg_new_with_opt_str_and_init_01a4a75000df79cb,
  at as __wbg_new_with_str_and_init_c5748f76f5108934,
  gt as __wbg_next_3cfe5c0fe2a4cc53,
  dt as __wbg_prototypesetcall_dfe9b766cdc1f1fd,
  wt as __wbg_queueMicrotask_9b549dfce8865860,
  lt as __wbg_queueMicrotask_fca69f5bfad613a5,
  pt as __wbg_read_39c4b35efcd03c25,
  yt as __wbg_releaseLock_a5912f590b185180,
  xt as __wbg_resolve_fd5bfbaa4ce36e1e,
  ht as __wbg_respond_9f7fc54636c4a3af,
  mt as __wbg_set_169e13b608078b7b,
  Ft as __wbg_set_3807d5f0bfc24aa7,
  Rt as __wbg_set_3f1d0b984ed272ed,
  St as __wbg_set_425eb8b710d5beee,
  It as __wbg_set_781438a03c0c3c81,
  kt as __wbg_set_7df433eea03a5c14,
  Et as __wbg_set_body_8e743242d6076a4f,
  Ot as __wbg_set_efaaf145b9377369,
  Mt as __wbg_set_headers_5671cf088e114d2b,
  zt as __wbg_set_headers_9f734278b4257b03,
  At as __wbg_set_method_76c69e41b3570627,
  Tt as __wbg_set_redirect_e125c2dc00f1a7bf,
  Lt as __wbg_set_signal_e89be862d0091009,
  jt as __wbg_set_status_2727ed43f6735170,
  qt as __wbg_stack_0ed75d68575b0f3c,
  Dt as __wbg_static_accessor_GLOBAL_769e6b65d6557335,
  Ut as __wbg_static_accessor_GLOBAL_THIS_60cf02db4de8e1c1,
  vt as __wbg_static_accessor_SELF_08f5a74c69739274,
  Ct as __wbg_static_accessor_WINDOW_a8924b26aa92d024,
  Wt as __wbg_status_9bfc680efca4bdfd,
  Bt as __wbg_stringify_655a6390e1f5eb6b,
  Nt as __wbg_then_429f7caf1026411d,
  $t as __wbg_then_4f95312d68691235,
  Pt as __wbg_toString_14b47ee7542a49ef,
  Vt as __wbg_url_87f30c96ceb3baf7,
  Ht as __wbg_value_57b7b035e117f7ee,
  Xt as __wbg_view_788aaf149deefd2f,
  Gt as __wbg_webSocket_d11bc2bcaeace27a,
  Jt as __wbindgen_cast_2241b6af4c4b2941,
  Yt as __wbindgen_cast_4625c577ab2ec9ee,
  Kt as __wbindgen_cast_9ae0607507abb057,
  Qt as __wbindgen_cast_bed82e4eab6aa455,
  Zt as __wbindgen_cast_d6cd19b81560fd6e,
  en as __wbindgen_init_externref_table,
  middleware_loader_entry_default as default,
  A as fetch,
  C as getMemory,
  un as wasmModule
};
//# sourceMappingURL=shim.js.map
