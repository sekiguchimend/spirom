var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-hMbhLa/checked-fetch.js
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

// build/index.js
import { WorkerEntrypoint as ue } from "cloudflare:workers";
import H from "./f9cd8ff67b0caa0bf12fb1500936fd8f4929670b-index_bg.wasm";
var _;
function w(e2) {
  let t = _.__externref_table_alloc();
  return _.__wbindgen_externrefs.set(t, e2), t;
}
__name(w, "w");
var C = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry((e2) => {
  e2.instance === o && e2.dtor(e2.a, e2.b);
});
function M(e2) {
  let t = typeof e2;
  if (t == "number" || t == "boolean" || e2 == null) return `${e2}`;
  if (t == "string") return `"${e2}"`;
  if (t == "symbol") {
    let i = e2.description;
    return i == null ? "Symbol" : `Symbol(${i})`;
  }
  if (t == "function") {
    let i = e2.name;
    return typeof i == "string" && i.length > 0 ? `Function(${i})` : "Function";
  }
  if (Array.isArray(e2)) {
    let i = e2.length, a = "[";
    i > 0 && (a += M(e2[0]));
    for (let c = 1; c < i; c++) a += ", " + M(e2[c]);
    return a += "]", a;
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
__name(M, "M");
function G(e2, t) {
  e2 = e2 >>> 0;
  let n = b(), r = [];
  for (let i = e2; i < e2 + 4 * t; i += 4) r.push(_.__wbindgen_externrefs.get(n.getUint32(i, true)));
  return _.__externref_drop_slice(e2, t), r;
}
__name(G, "G");
function D(e2, t) {
  return e2 = e2 >>> 0, W().subarray(e2 / 1, e2 / 1 + t);
}
__name(D, "D");
var h = null;
function b() {
  return (h === null || h.buffer.detached === true || h.buffer.detached === void 0 && h.buffer !== _.memory.buffer) && (h = new DataView(_.memory.buffer)), h;
}
__name(b, "b");
function g(e2, t) {
  return e2 = e2 >>> 0, X(e2, t);
}
__name(g, "g");
var S = null;
function W() {
  return (S === null || S.byteLength === 0) && (S = new Uint8Array(_.memory.buffer)), S;
}
__name(W, "W");
function s(e2, t) {
  try {
    return e2.apply(this, t);
  } catch (n) {
    let r = w(n);
    _.__wbindgen_exn_store(r);
  }
}
__name(s, "s");
function u(e2) {
  return e2 == null;
}
__name(u, "u");
function K(e2, t, n, r) {
  let i = { a: e2, b: t, cnt: 1, dtor: n, instance: o }, a = /* @__PURE__ */ __name((...c) => {
    if (i.instance !== o) throw new Error("Cannot invoke closure from previous WASM instance");
    i.cnt++;
    let f = i.a;
    i.a = 0;
    try {
      return r(f, i.b, ...c);
    } finally {
      i.a = f, a._wbg_cb_unref();
    }
  }, "a");
  return a._wbg_cb_unref = () => {
    --i.cnt === 0 && (i.dtor(i.a, i.b), i.a = 0, C.unregister(i));
  }, C.register(a, i, i), a;
}
__name(K, "K");
function Q(e2, t) {
  let n = t(e2.length * 4, 4) >>> 0;
  for (let r = 0; r < e2.length; r++) {
    let i = w(e2[r]);
    b().setUint32(n + 4 * r, i, true);
  }
  return d = e2.length, n;
}
__name(Q, "Q");
function p(e2, t, n) {
  if (n === void 0) {
    let f = j.encode(e2), l = t(f.length, 1) >>> 0;
    return W().subarray(l, l + f.length).set(f), d = f.length, l;
  }
  let r = e2.length, i = t(r, 1) >>> 0, a = W(), c = 0;
  for (; c < r; c++) {
    let f = e2.charCodeAt(c);
    if (f > 127) break;
    a[i + c] = f;
  }
  if (c !== r) {
    c !== 0 && (e2 = e2.slice(c)), i = n(i, r, r = c + e2.length * 3, 1) >>> 0;
    let f = W().subarray(i + c, i + r), l = j.encodeInto(e2, f);
    c += l.written, i = n(i, r, c, 1) >>> 0;
  }
  return d = c, i;
}
__name(p, "p");
var B = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
B.decode();
function X(e2, t) {
  return B.decode(W().subarray(e2, e2 + t));
}
__name(X, "X");
var j = new TextEncoder();
"encodeInto" in j || (j.encodeInto = function(e2, t) {
  let n = j.encode(e2);
  return t.set(n), { read: e2.length, written: n.length };
});
var d = 0;
function Y(e2, t, n) {
  _.wasm_bindgen__convert__closures_____invoke__hd572778bb1b323dc(e2, t, n);
}
__name(Y, "Y");
function Z(e2, t, n, r) {
  _.wasm_bindgen__convert__closures_____invoke__h4700856478a2dd40(e2, t, n, r);
}
__name(Z, "Z");
var ee = ["bytes"];
var te = ["follow", "error", "manual"];
var o = 0;
var ne = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry(({ ptr: e2, instance: t }) => {
  t === o && _.__wbg_containerstartupoptions_free(e2 >>> 0, 1);
});
var re = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry(({ ptr: e2, instance: t }) => {
  t === o && _.__wbg_intounderlyingbytesource_free(e2 >>> 0, 1);
});
var _e = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry(({ ptr: e2, instance: t }) => {
  t === o && _.__wbg_intounderlyingsink_free(e2 >>> 0, 1);
});
var ie = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry(({ ptr: e2, instance: t }) => {
  t === o && _.__wbg_intounderlyingsource_free(e2 >>> 0, 1);
});
var q = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry(({ ptr: e2, instance: t }) => {
  t === o && _.__wbg_minifyconfig_free(e2 >>> 0, 1);
});
var oe = typeof FinalizationRegistry > "u" ? { register: /* @__PURE__ */ __name(() => {
}, "register"), unregister: /* @__PURE__ */ __name(() => {
}, "unregister") } : new FinalizationRegistry(({ ptr: e2, instance: t }) => {
  t === o && _.__wbg_r2range_free(e2 >>> 0, 1);
});
var v = class {
  static {
    __name(this, "v");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, ne.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    _.__wbg_containerstartupoptions_free(t, 0);
  }
  get entrypoint() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    let t = _.__wbg_get_containerstartupoptions_entrypoint(this.__wbg_ptr);
    var n = G(t[0], t[1]).slice();
    return _.__wbindgen_free(t[0], t[1] * 4, 4), n;
  }
  set entrypoint(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    let n = Q(t, _.__wbindgen_malloc), r = d;
    _.__wbg_set_containerstartupoptions_entrypoint(this.__wbg_ptr, n, r);
  }
  get enableInternet() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    let t = _.__wbg_get_containerstartupoptions_enableInternet(this.__wbg_ptr);
    return t === 16777215 ? void 0 : t !== 0;
  }
  set enableInternet(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    _.__wbg_set_containerstartupoptions_enableInternet(this.__wbg_ptr, u(t) ? 16777215 : t ? 1 : 0);
  }
  get env() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    return _.__wbg_get_containerstartupoptions_env(this.__wbg_ptr);
  }
  set env(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    _.__wbg_set_containerstartupoptions_env(this.__wbg_ptr, t);
  }
};
Symbol.dispose && (v.prototype[Symbol.dispose] = v.prototype.free);
var x = class {
  static {
    __name(this, "x");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, re.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    _.__wbg_intounderlyingbytesource_free(t, 0);
  }
  get autoAllocateChunkSize() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    return _.intounderlyingbytesource_autoAllocateChunkSize(this.__wbg_ptr) >>> 0;
  }
  pull(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    return _.intounderlyingbytesource_pull(this.__wbg_ptr, t);
  }
  start(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    _.intounderlyingbytesource_start(this.__wbg_ptr, t);
  }
  get type() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    let t = _.intounderlyingbytesource_type(this.__wbg_ptr);
    return ee[t];
  }
  cancel() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    let t = this.__destroy_into_raw();
    _.intounderlyingbytesource_cancel(t);
  }
};
Symbol.dispose && (x.prototype[Symbol.dispose] = x.prototype.free);
var I = class {
  static {
    __name(this, "I");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, _e.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    _.__wbg_intounderlyingsink_free(t, 0);
  }
  abort(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    let n = this.__destroy_into_raw();
    return _.intounderlyingsink_abort(n, t);
  }
  close() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    let t = this.__destroy_into_raw();
    return _.intounderlyingsink_close(t);
  }
  write(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    return _.intounderlyingsink_write(this.__wbg_ptr, t);
  }
};
Symbol.dispose && (I.prototype[Symbol.dispose] = I.prototype.free);
var R = class {
  static {
    __name(this, "R");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, ie.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    _.__wbg_intounderlyingsource_free(t, 0);
  }
  pull(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    return _.intounderlyingsource_pull(this.__wbg_ptr, t);
  }
  cancel() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    let t = this.__destroy_into_raw();
    _.intounderlyingsource_cancel(t);
  }
};
Symbol.dispose && (R.prototype[Symbol.dispose] = R.prototype.free);
var y = class e {
  static {
    __name(this, "e");
  }
  static __wrap(t) {
    t = t >>> 0;
    let n = Object.create(e.prototype);
    return n.__wbg_ptr = t, n.__wbg_inst = o, q.register(n, { ptr: t, instance: o }, n), n;
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, q.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    _.__wbg_minifyconfig_free(t, 0);
  }
  get js() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    return _.__wbg_get_minifyconfig_js(this.__wbg_ptr) !== 0;
  }
  set js(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    _.__wbg_set_minifyconfig_js(this.__wbg_ptr, t);
  }
  get html() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    return _.__wbg_get_minifyconfig_html(this.__wbg_ptr) !== 0;
  }
  set html(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    _.__wbg_set_minifyconfig_html(this.__wbg_ptr, t);
  }
  get css() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    return _.__wbg_get_minifyconfig_css(this.__wbg_ptr) !== 0;
  }
  set css(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    _.__wbg_set_minifyconfig_css(this.__wbg_ptr, t);
  }
};
Symbol.dispose && (y.prototype[Symbol.dispose] = y.prototype.free);
var E = class {
  static {
    __name(this, "E");
  }
  __destroy_into_raw() {
    let t = this.__wbg_ptr;
    return this.__wbg_ptr = 0, oe.unregister(this), t;
  }
  free() {
    let t = this.__destroy_into_raw();
    _.__wbg_r2range_free(t, 0);
  }
  get offset() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    let t = _.__wbg_get_r2range_offset(this.__wbg_ptr);
    return t[0] === 0 ? void 0 : t[1];
  }
  set offset(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    _.__wbg_set_r2range_offset(this.__wbg_ptr, !u(t), u(t) ? 0 : t);
  }
  get length() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    let t = _.__wbg_get_r2range_length(this.__wbg_ptr);
    return t[0] === 0 ? void 0 : t[1];
  }
  set length(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    _.__wbg_set_r2range_length(this.__wbg_ptr, !u(t), u(t) ? 0 : t);
  }
  get suffix() {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    let t = _.__wbg_get_r2range_suffix(this.__wbg_ptr);
    return t[0] === 0 ? void 0 : t[1];
  }
  set suffix(t) {
    if (this.__wbg_inst !== void 0 && this.__wbg_inst !== o) throw new Error("Invalid stale object from previous Wasm instance");
    _.__wbg_set_r2range_suffix(this.__wbg_ptr, !u(t), u(t) ? 0 : t);
  }
};
Symbol.dispose && (E.prototype[Symbol.dispose] = E.prototype.free);
function N() {
  o++, h = null, S = null, typeof numBytesDecoded < "u" && (numBytesDecoded = 0), typeof d < "u" && (d = 0), _ = new WebAssembly.Instance(H, V).exports, _.__wbindgen_start();
}
__name(N, "N");
function $(e2, t, n) {
  return _.fetch(e2, t, n);
}
__name($, "$");
function T(e2) {
  _.setPanicHook(e2);
}
__name(T, "T");
var V = { __wbindgen_placeholder__: { __wbg_Error_52673b7de5a0ca89: /* @__PURE__ */ __name(function(e2, t) {
  return Error(g(e2, t));
}, "__wbg_Error_52673b7de5a0ca89"), __wbg_String_8f0eb39a4a4c2f66: /* @__PURE__ */ __name(function(e2, t) {
  let n = String(t), r = p(n, _.__wbindgen_malloc, _.__wbindgen_realloc), i = d;
  b().setInt32(e2 + 4, i, true), b().setInt32(e2 + 0, r, true);
}, "__wbg_String_8f0eb39a4a4c2f66"), __wbg___wbindgen_boolean_get_dea25b33882b895b: /* @__PURE__ */ __name(function(e2) {
  let t = e2, n = typeof t == "boolean" ? t : void 0;
  return u(n) ? 16777215 : n ? 1 : 0;
}, "__wbg___wbindgen_boolean_get_dea25b33882b895b"), __wbg___wbindgen_debug_string_adfb662ae34724b6: /* @__PURE__ */ __name(function(e2, t) {
  let n = M(t), r = p(n, _.__wbindgen_malloc, _.__wbindgen_realloc), i = d;
  b().setInt32(e2 + 4, i, true), b().setInt32(e2 + 0, r, true);
}, "__wbg___wbindgen_debug_string_adfb662ae34724b6"), __wbg___wbindgen_is_function_8d400b8b1af978cd: /* @__PURE__ */ __name(function(e2) {
  return typeof e2 == "function";
}, "__wbg___wbindgen_is_function_8d400b8b1af978cd"), __wbg___wbindgen_is_string_704ef9c8fc131030: /* @__PURE__ */ __name(function(e2) {
  return typeof e2 == "string";
}, "__wbg___wbindgen_is_string_704ef9c8fc131030"), __wbg___wbindgen_is_undefined_f6b95eab589e0269: /* @__PURE__ */ __name(function(e2) {
  return e2 === void 0;
}, "__wbg___wbindgen_is_undefined_f6b95eab589e0269"), __wbg___wbindgen_number_get_9619185a74197f95: /* @__PURE__ */ __name(function(e2, t) {
  let n = t, r = typeof n == "number" ? n : void 0;
  b().setFloat64(e2 + 8, u(r) ? 0 : r, true), b().setInt32(e2 + 0, !u(r), true);
}, "__wbg___wbindgen_number_get_9619185a74197f95"), __wbg___wbindgen_string_get_a2a31e16edf96e42: /* @__PURE__ */ __name(function(e2, t) {
  let n = t, r = typeof n == "string" ? n : void 0;
  var i = u(r) ? 0 : p(r, _.__wbindgen_malloc, _.__wbindgen_realloc), a = d;
  b().setInt32(e2 + 4, a, true), b().setInt32(e2 + 0, i, true);
}, "__wbg___wbindgen_string_get_a2a31e16edf96e42"), __wbg___wbindgen_throw_dd24417ed36fc46e: /* @__PURE__ */ __name(function(e2, t) {
  throw new Error(g(e2, t));
}, "__wbg___wbindgen_throw_dd24417ed36fc46e"), __wbg__wbg_cb_unref_87dfb5aaa0cbcea7: /* @__PURE__ */ __name(function(e2) {
  e2._wbg_cb_unref();
}, "__wbg__wbg_cb_unref_87dfb5aaa0cbcea7"), __wbg_body_947b901c33f7fe32: /* @__PURE__ */ __name(function(e2) {
  let t = e2.body;
  return u(t) ? 0 : w(t);
}, "__wbg_body_947b901c33f7fe32"), __wbg_buffer_6cb2fecb1f253d71: /* @__PURE__ */ __name(function(e2) {
  return e2.buffer;
}, "__wbg_buffer_6cb2fecb1f253d71"), __wbg_byobRequest_f8e3517f5f8ad284: /* @__PURE__ */ __name(function(e2) {
  let t = e2.byobRequest;
  return u(t) ? 0 : w(t);
}, "__wbg_byobRequest_f8e3517f5f8ad284"), __wbg_byteLength_faa9938885bdeee6: /* @__PURE__ */ __name(function(e2) {
  return e2.byteLength;
}, "__wbg_byteLength_faa9938885bdeee6"), __wbg_byteOffset_3868b6a19ba01dea: /* @__PURE__ */ __name(function(e2) {
  return e2.byteOffset;
}, "__wbg_byteOffset_3868b6a19ba01dea"), __wbg_call_3020136f7a2d6e44: /* @__PURE__ */ __name(function() {
  return s(function(e2, t, n) {
    return e2.call(t, n);
  }, arguments);
}, "__wbg_call_3020136f7a2d6e44"), __wbg_call_78f94eb02ec7f9b2: /* @__PURE__ */ __name(function() {
  return s(function(e2, t, n, r, i) {
    return e2.call(t, n, r, i);
  }, arguments);
}, "__wbg_call_78f94eb02ec7f9b2"), __wbg_call_abb4ff46ce38be40: /* @__PURE__ */ __name(function() {
  return s(function(e2, t) {
    return e2.call(t);
  }, arguments);
}, "__wbg_call_abb4ff46ce38be40"), __wbg_call_c8baa5c5e72d274e: /* @__PURE__ */ __name(function() {
  return s(function(e2, t, n, r) {
    return e2.call(t, n, r);
  }, arguments);
}, "__wbg_call_c8baa5c5e72d274e"), __wbg_cancel_a65cf45dca50ba4c: /* @__PURE__ */ __name(function(e2) {
  return e2.cancel();
}, "__wbg_cancel_a65cf45dca50ba4c"), __wbg_catch_b9db41d97d42bd02: /* @__PURE__ */ __name(function(e2, t) {
  return e2.catch(t);
}, "__wbg_catch_b9db41d97d42bd02"), __wbg_cause_2863fe79d084e5de: /* @__PURE__ */ __name(function(e2) {
  return e2.cause;
}, "__wbg_cause_2863fe79d084e5de"), __wbg_cf_385b86c5ccb6e877: /* @__PURE__ */ __name(function() {
  return s(function(e2) {
    let t = e2.cf;
    return u(t) ? 0 : w(t);
  }, arguments);
}, "__wbg_cf_385b86c5ccb6e877"), __wbg_cf_a492fb887307ca9e: /* @__PURE__ */ __name(function() {
  return s(function(e2) {
    let t = e2.cf;
    return u(t) ? 0 : w(t);
  }, arguments);
}, "__wbg_cf_a492fb887307ca9e"), __wbg_close_0af5661bf3d335f2: /* @__PURE__ */ __name(function() {
  return s(function(e2) {
    e2.close();
  }, arguments);
}, "__wbg_close_0af5661bf3d335f2"), __wbg_close_3ec111e7b23d94d8: /* @__PURE__ */ __name(function() {
  return s(function(e2) {
    e2.close();
  }, arguments);
}, "__wbg_close_3ec111e7b23d94d8"), __wbg_constructor_bd34b914d5a3a404: /* @__PURE__ */ __name(function(e2) {
  return e2.constructor;
}, "__wbg_constructor_bd34b914d5a3a404"), __wbg_done_62ea16af4ce34b24: /* @__PURE__ */ __name(function(e2) {
  return e2.done;
}, "__wbg_done_62ea16af4ce34b24"), __wbg_enqueue_a7e6b1ee87963aad: /* @__PURE__ */ __name(function() {
  return s(function(e2, t) {
    e2.enqueue(t);
  }, arguments);
}, "__wbg_enqueue_a7e6b1ee87963aad"), __wbg_entries_13da0847a5239578: /* @__PURE__ */ __name(function(e2) {
  return e2.entries();
}, "__wbg_entries_13da0847a5239578"), __wbg_error_7534b8e9a36f1ab4: /* @__PURE__ */ __name(function(e2, t) {
  let n, r;
  try {
    n = e2, r = t, console.error(g(e2, t));
  } finally {
    _.__wbindgen_free(n, r, 1);
  }
}, "__wbg_error_7534b8e9a36f1ab4"), __wbg_error_7bc7d576a6aaf855: /* @__PURE__ */ __name(function(e2) {
  console.error(e2);
}, "__wbg_error_7bc7d576a6aaf855"), __wbg_error_d7f117185d9ffd19: /* @__PURE__ */ __name(function(e2, t) {
  console.error(e2, t);
}, "__wbg_error_d7f117185d9ffd19"), __wbg_fetch_99a2937bdadf44ce: /* @__PURE__ */ __name(function(e2, t, n) {
  return e2.fetch(t, n);
}, "__wbg_fetch_99a2937bdadf44ce"), __wbg_fetch_bf2dba3dc9383b4e: /* @__PURE__ */ __name(function(e2, t, n, r) {
  return e2.fetch(g(t, n), r);
}, "__wbg_fetch_bf2dba3dc9383b4e"), __wbg_getReader_48e00749fe3f6089: /* @__PURE__ */ __name(function() {
  return s(function(e2) {
    return e2.getReader();
  }, arguments);
}, "__wbg_getReader_48e00749fe3f6089"), __wbg_getTime_ad1e9878a735af08: /* @__PURE__ */ __name(function(e2) {
  return e2.getTime();
}, "__wbg_getTime_ad1e9878a735af08"), __wbg_get_54490178d7d67e5e: /* @__PURE__ */ __name(function() {
  return s(function(e2, t, n, r) {
    let i = t.get(g(n, r));
    var a = u(i) ? 0 : p(i, _.__wbindgen_malloc, _.__wbindgen_realloc), c = d;
    b().setInt32(e2 + 4, c, true), b().setInt32(e2 + 0, a, true);
  }, arguments);
}, "__wbg_get_54490178d7d67e5e"), __wbg_get_6b7bd52aca3f9671: /* @__PURE__ */ __name(function(e2, t) {
  return e2[t >>> 0];
}, "__wbg_get_6b7bd52aca3f9671"), __wbg_get_af9dab7e9603ea93: /* @__PURE__ */ __name(function() {
  return s(function(e2, t) {
    return Reflect.get(e2, t);
  }, arguments);
}, "__wbg_get_af9dab7e9603ea93"), __wbg_get_done_f98a6e62c4e18fb9: /* @__PURE__ */ __name(function(e2) {
  let t = e2.done;
  return u(t) ? 16777215 : t ? 1 : 0;
}, "__wbg_get_done_f98a6e62c4e18fb9"), __wbg_get_value_63e39884ef11812e: /* @__PURE__ */ __name(function(e2) {
  return e2.value;
}, "__wbg_get_value_63e39884ef11812e"), __wbg_headers_654c30e1bcccc552: /* @__PURE__ */ __name(function(e2) {
  return e2.headers;
}, "__wbg_headers_654c30e1bcccc552"), __wbg_headers_850c3fb50632ae78: /* @__PURE__ */ __name(function(e2) {
  return e2.headers;
}, "__wbg_headers_850c3fb50632ae78"), __wbg_instanceof_Error_3443650560328fa9: /* @__PURE__ */ __name(function(e2) {
  let t;
  try {
    t = e2 instanceof Error;
  } catch {
    t = false;
  }
  return t;
}, "__wbg_instanceof_Error_3443650560328fa9"), __wbg_instanceof_ReadableStream_412db92608b03a68: /* @__PURE__ */ __name(function(e2) {
  let t;
  try {
    t = e2 instanceof ReadableStream;
  } catch {
    t = false;
  }
  return t;
}, "__wbg_instanceof_ReadableStream_412db92608b03a68"), __wbg_instanceof_Response_cd74d1c2ac92cb0b: /* @__PURE__ */ __name(function(e2) {
  let t;
  try {
    t = e2 instanceof Response;
  } catch {
    t = false;
  }
  return t;
}, "__wbg_instanceof_Response_cd74d1c2ac92cb0b"), __wbg_length_22ac23eaec9d8053: /* @__PURE__ */ __name(function(e2) {
  return e2.length;
}, "__wbg_length_22ac23eaec9d8053"), __wbg_log_1d990106d99dacb7: /* @__PURE__ */ __name(function(e2) {
  console.log(e2);
}, "__wbg_log_1d990106d99dacb7"), __wbg_method_6a1f0d0a9e501984: /* @__PURE__ */ __name(function(e2, t) {
  let n = t.method, r = p(n, _.__wbindgen_malloc, _.__wbindgen_realloc), i = d;
  b().setInt32(e2 + 4, i, true), b().setInt32(e2 + 0, r, true);
}, "__wbg_method_6a1f0d0a9e501984"), __wbg_minifyconfig_new: /* @__PURE__ */ __name(function(e2) {
  return y.__wrap(e2);
}, "__wbg_minifyconfig_new"), __wbg_name_6d8c704cecb9e350: /* @__PURE__ */ __name(function(e2) {
  return e2.name;
}, "__wbg_name_6d8c704cecb9e350"), __wbg_new_0_23cedd11d9b40c9d: /* @__PURE__ */ __name(function() {
  return /* @__PURE__ */ new Date();
}, "__wbg_new_0_23cedd11d9b40c9d"), __wbg_new_1ba21ce319a06297: /* @__PURE__ */ __name(function() {
  return new Object();
}, "__wbg_new_1ba21ce319a06297"), __wbg_new_25f239778d6112b9: /* @__PURE__ */ __name(function() {
  return new Array();
}, "__wbg_new_25f239778d6112b9"), __wbg_new_3c79b3bb1b32b7d3: /* @__PURE__ */ __name(function() {
  return s(function() {
    return new Headers();
  }, arguments);
}, "__wbg_new_3c79b3bb1b32b7d3"), __wbg_new_8a6f238a6ece86ea: /* @__PURE__ */ __name(function() {
  return new Error();
}, "__wbg_new_8a6f238a6ece86ea"), __wbg_new_b546ae120718850e: /* @__PURE__ */ __name(function() {
  return /* @__PURE__ */ new Map();
}, "__wbg_new_b546ae120718850e"), __wbg_new_df1173567d5ff028: /* @__PURE__ */ __name(function(e2, t) {
  return new Error(g(e2, t));
}, "__wbg_new_df1173567d5ff028"), __wbg_new_ff12d2b041fb48f1: /* @__PURE__ */ __name(function(e2, t) {
  try {
    var n = { a: e2, b: t }, r = /* @__PURE__ */ __name((a, c) => {
      let f = n.a;
      n.a = 0;
      try {
        return Z(f, n.b, a, c);
      } finally {
        n.a = f;
      }
    }, "r");
    return new Promise(r);
  } finally {
    n.a = n.b = 0;
  }
}, "__wbg_new_ff12d2b041fb48f1"), __wbg_new_no_args_cb138f77cf6151ee: /* @__PURE__ */ __name(function(e2, t) {
  return new Function(g(e2, t));
}, "__wbg_new_no_args_cb138f77cf6151ee"), __wbg_new_with_byte_offset_and_length_d85c3da1fd8df149: /* @__PURE__ */ __name(function(e2, t, n) {
  return new Uint8Array(e2, t >>> 0, n >>> 0);
}, "__wbg_new_with_byte_offset_and_length_d85c3da1fd8df149"), __wbg_new_with_headers_58af989e06bb5134: /* @__PURE__ */ __name(function() {
  return s(function(e2) {
    return new Headers(e2);
  }, arguments);
}, "__wbg_new_with_headers_58af989e06bb5134"), __wbg_new_with_length_aa5eaf41d35235e5: /* @__PURE__ */ __name(function(e2) {
  return new Uint8Array(e2 >>> 0);
}, "__wbg_new_with_length_aa5eaf41d35235e5"), __wbg_new_with_opt_buffer_source_and_init_1200e907bc1ec81d: /* @__PURE__ */ __name(function() {
  return s(function(e2, t) {
    return new Response(e2, t);
  }, arguments);
}, "__wbg_new_with_opt_buffer_source_and_init_1200e907bc1ec81d"), __wbg_new_with_opt_readable_stream_and_init_6377f53b425fda23: /* @__PURE__ */ __name(function() {
  return s(function(e2, t) {
    return new Response(e2, t);
  }, arguments);
}, "__wbg_new_with_opt_readable_stream_and_init_6377f53b425fda23"), __wbg_new_with_opt_str_and_init_01a4a75000df79cb: /* @__PURE__ */ __name(function() {
  return s(function(e2, t, n) {
    return new Response(e2 === 0 ? void 0 : g(e2, t), n);
  }, arguments);
}, "__wbg_new_with_opt_str_and_init_01a4a75000df79cb"), __wbg_new_with_str_and_init_c5748f76f5108934: /* @__PURE__ */ __name(function() {
  return s(function(e2, t, n) {
    return new Request(g(e2, t), n);
  }, arguments);
}, "__wbg_new_with_str_and_init_c5748f76f5108934"), __wbg_next_3cfe5c0fe2a4cc53: /* @__PURE__ */ __name(function() {
  return s(function(e2) {
    return e2.next();
  }, arguments);
}, "__wbg_next_3cfe5c0fe2a4cc53"), __wbg_prototypesetcall_dfe9b766cdc1f1fd: /* @__PURE__ */ __name(function(e2, t, n) {
  Uint8Array.prototype.set.call(D(e2, t), n);
}, "__wbg_prototypesetcall_dfe9b766cdc1f1fd"), __wbg_queueMicrotask_9b549dfce8865860: /* @__PURE__ */ __name(function(e2) {
  return e2.queueMicrotask;
}, "__wbg_queueMicrotask_9b549dfce8865860"), __wbg_queueMicrotask_fca69f5bfad613a5: /* @__PURE__ */ __name(function(e2) {
  queueMicrotask(e2);
}, "__wbg_queueMicrotask_fca69f5bfad613a5"), __wbg_read_39c4b35efcd03c25: /* @__PURE__ */ __name(function(e2) {
  return e2.read();
}, "__wbg_read_39c4b35efcd03c25"), __wbg_releaseLock_a5912f590b185180: /* @__PURE__ */ __name(function(e2) {
  e2.releaseLock();
}, "__wbg_releaseLock_a5912f590b185180"), __wbg_resolve_fd5bfbaa4ce36e1e: /* @__PURE__ */ __name(function(e2) {
  return Promise.resolve(e2);
}, "__wbg_resolve_fd5bfbaa4ce36e1e"), __wbg_respond_9f7fc54636c4a3af: /* @__PURE__ */ __name(function() {
  return s(function(e2, t) {
    e2.respond(t >>> 0);
  }, arguments);
}, "__wbg_respond_9f7fc54636c4a3af"), __wbg_set_169e13b608078b7b: /* @__PURE__ */ __name(function(e2, t, n) {
  e2.set(D(t, n));
}, "__wbg_set_169e13b608078b7b"), __wbg_set_3f1d0b984ed272ed: /* @__PURE__ */ __name(function(e2, t, n) {
  e2[t] = n;
}, "__wbg_set_3f1d0b984ed272ed"), __wbg_set_425eb8b710d5beee: /* @__PURE__ */ __name(function() {
  return s(function(e2, t, n, r, i) {
    e2.set(g(t, n), g(r, i));
  }, arguments);
}, "__wbg_set_425eb8b710d5beee"), __wbg_set_781438a03c0c3c81: /* @__PURE__ */ __name(function() {
  return s(function(e2, t, n) {
    return Reflect.set(e2, t, n);
  }, arguments);
}, "__wbg_set_781438a03c0c3c81"), __wbg_set_7df433eea03a5c14: /* @__PURE__ */ __name(function(e2, t, n) {
  e2[t >>> 0] = n;
}, "__wbg_set_7df433eea03a5c14"), __wbg_set_body_8e743242d6076a4f: /* @__PURE__ */ __name(function(e2, t) {
  e2.body = t;
}, "__wbg_set_body_8e743242d6076a4f"), __wbg_set_efaaf145b9377369: /* @__PURE__ */ __name(function(e2, t, n) {
  return e2.set(t, n);
}, "__wbg_set_efaaf145b9377369"), __wbg_set_headers_5671cf088e114d2b: /* @__PURE__ */ __name(function(e2, t) {
  e2.headers = t;
}, "__wbg_set_headers_5671cf088e114d2b"), __wbg_set_headers_9f734278b4257b03: /* @__PURE__ */ __name(function(e2, t) {
  e2.headers = t;
}, "__wbg_set_headers_9f734278b4257b03"), __wbg_set_method_76c69e41b3570627: /* @__PURE__ */ __name(function(e2, t, n) {
  e2.method = g(t, n);
}, "__wbg_set_method_76c69e41b3570627"), __wbg_set_redirect_e125c2dc00f1a7bf: /* @__PURE__ */ __name(function(e2, t) {
  e2.redirect = te[t];
}, "__wbg_set_redirect_e125c2dc00f1a7bf"), __wbg_set_signal_e89be862d0091009: /* @__PURE__ */ __name(function(e2, t) {
  e2.signal = t;
}, "__wbg_set_signal_e89be862d0091009"), __wbg_set_status_2727ed43f6735170: /* @__PURE__ */ __name(function(e2, t) {
  e2.status = t;
}, "__wbg_set_status_2727ed43f6735170"), __wbg_stack_0ed75d68575b0f3c: /* @__PURE__ */ __name(function(e2, t) {
  let n = t.stack, r = p(n, _.__wbindgen_malloc, _.__wbindgen_realloc), i = d;
  b().setInt32(e2 + 4, i, true), b().setInt32(e2 + 0, r, true);
}, "__wbg_stack_0ed75d68575b0f3c"), __wbg_static_accessor_GLOBAL_769e6b65d6557335: /* @__PURE__ */ __name(function() {
  let e2 = typeof global > "u" ? null : global;
  return u(e2) ? 0 : w(e2);
}, "__wbg_static_accessor_GLOBAL_769e6b65d6557335"), __wbg_static_accessor_GLOBAL_THIS_60cf02db4de8e1c1: /* @__PURE__ */ __name(function() {
  let e2 = typeof globalThis > "u" ? null : globalThis;
  return u(e2) ? 0 : w(e2);
}, "__wbg_static_accessor_GLOBAL_THIS_60cf02db4de8e1c1"), __wbg_static_accessor_SELF_08f5a74c69739274: /* @__PURE__ */ __name(function() {
  let e2 = typeof self > "u" ? null : self;
  return u(e2) ? 0 : w(e2);
}, "__wbg_static_accessor_SELF_08f5a74c69739274"), __wbg_static_accessor_WINDOW_a8924b26aa92d024: /* @__PURE__ */ __name(function() {
  let e2 = typeof window > "u" ? null : window;
  return u(e2) ? 0 : w(e2);
}, "__wbg_static_accessor_WINDOW_a8924b26aa92d024"), __wbg_status_9bfc680efca4bdfd: /* @__PURE__ */ __name(function(e2) {
  return e2.status;
}, "__wbg_status_9bfc680efca4bdfd"), __wbg_stringify_655a6390e1f5eb6b: /* @__PURE__ */ __name(function() {
  return s(function(e2) {
    return JSON.stringify(e2);
  }, arguments);
}, "__wbg_stringify_655a6390e1f5eb6b"), __wbg_text_71293f456c7d2f37: /* @__PURE__ */ __name(function() {
  return s(function(e2) {
    return e2.text();
  }, arguments);
}, "__wbg_text_71293f456c7d2f37"), __wbg_then_429f7caf1026411d: /* @__PURE__ */ __name(function(e2, t, n) {
  return e2.then(t, n);
}, "__wbg_then_429f7caf1026411d"), __wbg_then_4f95312d68691235: /* @__PURE__ */ __name(function(e2, t) {
  return e2.then(t);
}, "__wbg_then_4f95312d68691235"), __wbg_toString_14b47ee7542a49ef: /* @__PURE__ */ __name(function(e2) {
  return e2.toString();
}, "__wbg_toString_14b47ee7542a49ef"), __wbg_url_87f30c96ceb3baf7: /* @__PURE__ */ __name(function(e2, t) {
  let n = t.url, r = p(n, _.__wbindgen_malloc, _.__wbindgen_realloc), i = d;
  b().setInt32(e2 + 4, i, true), b().setInt32(e2 + 0, r, true);
}, "__wbg_url_87f30c96ceb3baf7"), __wbg_value_57b7b035e117f7ee: /* @__PURE__ */ __name(function(e2) {
  return e2.value;
}, "__wbg_value_57b7b035e117f7ee"), __wbg_view_788aaf149deefd2f: /* @__PURE__ */ __name(function(e2) {
  let t = e2.view;
  return u(t) ? 0 : w(t);
}, "__wbg_view_788aaf149deefd2f"), __wbg_webSocket_cf2721a7666c6346: /* @__PURE__ */ __name(function() {
  return s(function(e2) {
    let t = e2.webSocket;
    return u(t) ? 0 : w(t);
  }, arguments);
}, "__wbg_webSocket_cf2721a7666c6346"), __wbindgen_cast_2241b6af4c4b2941: /* @__PURE__ */ __name(function(e2, t) {
  return g(e2, t);
}, "__wbindgen_cast_2241b6af4c4b2941"), __wbindgen_cast_4625c577ab2ec9ee: /* @__PURE__ */ __name(function(e2) {
  return BigInt.asUintN(64, e2);
}, "__wbindgen_cast_4625c577ab2ec9ee"), __wbindgen_cast_9ae0607507abb057: /* @__PURE__ */ __name(function(e2) {
  return e2;
}, "__wbindgen_cast_9ae0607507abb057"), __wbindgen_cast_bed82e4eab6aa455: /* @__PURE__ */ __name(function(e2, t) {
  return K(e2, t, _.wasm_bindgen__closure__destroy__h19c645e604deb7c5, Y);
}, "__wbindgen_cast_bed82e4eab6aa455"), __wbindgen_cast_d6cd19b81560fd6e: /* @__PURE__ */ __name(function(e2) {
  return e2;
}, "__wbindgen_cast_d6cd19b81560fd6e"), __wbindgen_init_externref_table: /* @__PURE__ */ __name(function() {
  let e2 = _.__wbindgen_externrefs, t = e2.grow(4);
  e2.set(0, void 0), e2.set(t + 0, void 0), e2.set(t + 1, null), e2.set(t + 2, true), e2.set(t + 3, false);
}, "__wbindgen_init_externref_table") } };
var se = new WebAssembly.Instance(H, V);
_ = se.exports;
_.__wbindgen_start();
Error.stackTraceLimit = 100;
var k = false;
function J() {
  T && T(function(e2) {
    let t = new Error("Rust panic: " + e2);
    console.error("Critical", t), k = true;
  });
}
__name(J, "J");
J();
var P = 0;
function U() {
  k && (console.log("Reinitializing Wasm application"), N(), k = false, J(), P++);
}
__name(U, "U");
addEventListener("error", (e2) => {
  L(e2.error);
});
function L(e2) {
  e2 instanceof WebAssembly.RuntimeError && (console.error("Critical", e2), k = true);
}
__name(L, "L");
var z = class extends ue {
  static {
    __name(this, "z");
  }
};
z.prototype.fetch = function(t) {
  return $.call(this, t, this.env, this.ctx);
};
var fe = { set: /* @__PURE__ */ __name((e2, t, n, r) => Reflect.set(e2.instance, t, n, r), "set"), has: /* @__PURE__ */ __name((e2, t) => Reflect.has(e2.instance, t), "has"), deleteProperty: /* @__PURE__ */ __name((e2, t) => Reflect.deleteProperty(e2.instance, t), "deleteProperty"), apply: /* @__PURE__ */ __name((e2, t, n) => Reflect.apply(e2.instance, t, n), "apply"), construct: /* @__PURE__ */ __name((e2, t, n) => Reflect.construct(e2.instance, t, n), "construct"), getPrototypeOf: /* @__PURE__ */ __name((e2) => Reflect.getPrototypeOf(e2.instance), "getPrototypeOf"), setPrototypeOf: /* @__PURE__ */ __name((e2, t) => Reflect.setPrototypeOf(e2.instance, t), "setPrototypeOf"), isExtensible: /* @__PURE__ */ __name((e2) => Reflect.isExtensible(e2.instance), "isExtensible"), preventExtensions: /* @__PURE__ */ __name((e2) => Reflect.preventExtensions(e2.instance), "preventExtensions"), getOwnPropertyDescriptor: /* @__PURE__ */ __name((e2, t) => Reflect.getOwnPropertyDescriptor(e2.instance, t), "getOwnPropertyDescriptor"), defineProperty: /* @__PURE__ */ __name((e2, t, n) => Reflect.defineProperty(e2.instance, t, n), "defineProperty"), ownKeys: /* @__PURE__ */ __name((e2) => Reflect.ownKeys(e2.instance), "ownKeys") };
var m = { construct(e2, t, n) {
  try {
    U();
    let r = { instance: Reflect.construct(e2, t, n), instanceId: P, ctor: e2, args: t, newTarget: n };
    return new Proxy(r, { ...fe, get(i, a, c) {
      i.instanceId !== P && (i.instance = Reflect.construct(i.ctor, i.args, i.newTarget), i.instanceId = P);
      let f = Reflect.get(i.instance, a, c);
      return typeof f != "function" ? f : f.constructor === Function ? new Proxy(f, { apply(l, O, A) {
        U();
        try {
          return l.apply(O, A);
        } catch (F) {
          throw L(F), F;
        }
      } }) : new Proxy(f, { async apply(l, O, A) {
        U();
        try {
          return await l.apply(O, A);
        } catch (F) {
          throw L(F), F;
        }
      } });
    } });
  } catch (r) {
    throw k = true, r;
  }
} };
var ge = new Proxy(z, m);
var de = new Proxy(v, m);
var we = new Proxy(x, m);
var le = new Proxy(I, m);
var pe = new Proxy(R, m);
var he = new Proxy(y, m);
var ye = new Proxy(E, m);

// ../../../../../../../../home/shunya/.local/share/mise/installs/node/20.19.5/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
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

// ../../../../../../../../home/shunya/.local/share/mise/installs/node/20.19.5/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
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

// .wrangler/tmp/bundle-hMbhLa/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = ge;

// ../../../../../../../../home/shunya/.local/share/mise/installs/node/20.19.5/lib/node_modules/wrangler/templates/middleware/common.ts
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

// .wrangler/tmp/bundle-hMbhLa/middleware-loader.entry.ts
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
  de as ContainerStartupOptions,
  we as IntoUnderlyingByteSource,
  le as IntoUnderlyingSink,
  pe as IntoUnderlyingSource,
  he as MinifyConfig,
  ye as R2Range,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=shim.js.map
