import Oe from "react";
const Er = {
  pva: {
    sage: {
      DEFAULT: "#3a5a40",
      light: "#588157",
      dark: "#2c4231"
    },
    terracotta: {
      DEFAULT: "#a44a3f",
      light: "#c95b4d",
      dark: "#7d3830"
    },
    gold: {
      DEFAULT: "#d4af37"
    }
  }
}, mr = {
  name: "Pura Vida Ayurveda",
  colors: {
    sage: {
      DEFAULT: "#3a5a40",
      light: "#588157",
      dark: "#2c4231"
    },
    terracotta: {
      DEFAULT: "#a44a3f",
      light: "#c95b4d",
      dark: "#7d3830"
    },
    gold: { DEFAULT: "#d4af37" }
  }
};
var H = { exports: {} }, I = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var xe;
function cr() {
  if (xe) return I;
  xe = 1;
  var E = Oe, b = Symbol.for("react.element"), h = Symbol.for("react.fragment"), y = Object.prototype.hasOwnProperty, R = E.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, P = { key: !0, ref: !0, __self: !0, __source: !0 };
  function D(T, c, S) {
    var p, m = {}, x = null, W = null;
    S !== void 0 && (x = "" + S), c.key !== void 0 && (x = "" + c.key), c.ref !== void 0 && (W = c.ref);
    for (p in c) y.call(c, p) && !P.hasOwnProperty(p) && (m[p] = c[p]);
    if (T && T.defaultProps) for (p in c = T.defaultProps, c) m[p] === void 0 && (m[p] = c[p]);
    return { $$typeof: b, type: T, key: x, ref: W, props: m, _owner: R.current };
  }
  return I.Fragment = h, I.jsx = D, I.jsxs = D, I;
}
var L = {};
/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var we;
function fr() {
  return we || (we = 1, process.env.NODE_ENV !== "production" && function() {
    var E = Oe, b = Symbol.for("react.element"), h = Symbol.for("react.portal"), y = Symbol.for("react.fragment"), R = Symbol.for("react.strict_mode"), P = Symbol.for("react.profiler"), D = Symbol.for("react.provider"), T = Symbol.for("react.context"), c = Symbol.for("react.forward_ref"), S = Symbol.for("react.suspense"), p = Symbol.for("react.suspense_list"), m = Symbol.for("react.memo"), x = Symbol.for("react.lazy"), W = Symbol.for("react.offscreen"), Z = Symbol.iterator, Pe = "@@iterator";
    function Se(e) {
      if (e === null || typeof e != "object")
        return null;
      var r = Z && e[Z] || e[Pe];
      return typeof r == "function" ? r : null;
    }
    var C = E.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    function f(e) {
      {
        for (var r = arguments.length, t = new Array(r > 1 ? r - 1 : 0), a = 1; a < r; a++)
          t[a - 1] = arguments[a];
        Ce("error", e, t);
      }
    }
    function Ce(e, r, t) {
      {
        var a = C.ReactDebugCurrentFrame, i = a.getStackAddendum();
        i !== "" && (r += "%s", t = t.concat([i]));
        var s = t.map(function(o) {
          return String(o);
        });
        s.unshift("Warning: " + r), Function.prototype.apply.call(console[e], console, s);
      }
    }
    var je = !1, ke = !1, Ae = !1, De = !1, Fe = !1, Q;
    Q = Symbol.for("react.module.reference");
    function $e(e) {
      return !!(typeof e == "string" || typeof e == "function" || e === y || e === P || Fe || e === R || e === S || e === p || De || e === W || je || ke || Ae || typeof e == "object" && e !== null && (e.$$typeof === x || e.$$typeof === m || e.$$typeof === D || e.$$typeof === T || e.$$typeof === c || // This needs to include all possible module reference object
      // types supported by any Flight configuration anywhere since
      // we don't know which Flight build this will end up being used
      // with.
      e.$$typeof === Q || e.getModuleId !== void 0));
    }
    function Ie(e, r, t) {
      var a = e.displayName;
      if (a)
        return a;
      var i = r.displayName || r.name || "";
      return i !== "" ? t + "(" + i + ")" : t;
    }
    function ee(e) {
      return e.displayName || "Context";
    }
    function _(e) {
      if (e == null)
        return null;
      if (typeof e.tag == "number" && f("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), typeof e == "function")
        return e.displayName || e.name || null;
      if (typeof e == "string")
        return e;
      switch (e) {
        case y:
          return "Fragment";
        case h:
          return "Portal";
        case P:
          return "Profiler";
        case R:
          return "StrictMode";
        case S:
          return "Suspense";
        case p:
          return "SuspenseList";
      }
      if (typeof e == "object")
        switch (e.$$typeof) {
          case T:
            var r = e;
            return ee(r) + ".Consumer";
          case D:
            var t = e;
            return ee(t._context) + ".Provider";
          case c:
            return Ie(e, e.render, "ForwardRef");
          case m:
            var a = e.displayName || null;
            return a !== null ? a : _(e.type) || "Memo";
          case x: {
            var i = e, s = i._payload, o = i._init;
            try {
              return _(o(s));
            } catch {
              return null;
            }
          }
        }
      return null;
    }
    var w = Object.assign, F = 0, re, te, ae, ne, oe, ie, se;
    function ue() {
    }
    ue.__reactDisabledLog = !0;
    function Le() {
      {
        if (F === 0) {
          re = console.log, te = console.info, ae = console.warn, ne = console.error, oe = console.group, ie = console.groupCollapsed, se = console.groupEnd;
          var e = {
            configurable: !0,
            enumerable: !0,
            value: ue,
            writable: !0
          };
          Object.defineProperties(console, {
            info: e,
            log: e,
            warn: e,
            error: e,
            group: e,
            groupCollapsed: e,
            groupEnd: e
          });
        }
        F++;
      }
    }
    function We() {
      {
        if (F--, F === 0) {
          var e = {
            configurable: !0,
            enumerable: !0,
            writable: !0
          };
          Object.defineProperties(console, {
            log: w({}, e, {
              value: re
            }),
            info: w({}, e, {
              value: te
            }),
            warn: w({}, e, {
              value: ae
            }),
            error: w({}, e, {
              value: ne
            }),
            group: w({}, e, {
              value: oe
            }),
            groupCollapsed: w({}, e, {
              value: ie
            }),
            groupEnd: w({}, e, {
              value: se
            })
          });
        }
        F < 0 && f("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
      }
    }
    var M = C.ReactCurrentDispatcher, B;
    function Y(e, r, t) {
      {
        if (B === void 0)
          try {
            throw Error();
          } catch (i) {
            var a = i.stack.trim().match(/\n( *(at )?)/);
            B = a && a[1] || "";
          }
        return `
` + B + e;
      }
    }
    var J = !1, U;
    {
      var Ye = typeof WeakMap == "function" ? WeakMap : Map;
      U = new Ye();
    }
    function le(e, r) {
      if (!e || J)
        return "";
      {
        var t = U.get(e);
        if (t !== void 0)
          return t;
      }
      var a;
      J = !0;
      var i = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      var s;
      s = M.current, M.current = null, Le();
      try {
        if (r) {
          var o = function() {
            throw Error();
          };
          if (Object.defineProperty(o.prototype, "props", {
            set: function() {
              throw Error();
            }
          }), typeof Reflect == "object" && Reflect.construct) {
            try {
              Reflect.construct(o, []);
            } catch (v) {
              a = v;
            }
            Reflect.construct(e, [], o);
          } else {
            try {
              o.call();
            } catch (v) {
              a = v;
            }
            e.call(o.prototype);
          }
        } else {
          try {
            throw Error();
          } catch (v) {
            a = v;
          }
          e();
        }
      } catch (v) {
        if (v && a && typeof v.stack == "string") {
          for (var n = v.stack.split(`
`), d = a.stack.split(`
`), u = n.length - 1, l = d.length - 1; u >= 1 && l >= 0 && n[u] !== d[l]; )
            l--;
          for (; u >= 1 && l >= 0; u--, l--)
            if (n[u] !== d[l]) {
              if (u !== 1 || l !== 1)
                do
                  if (u--, l--, l < 0 || n[u] !== d[l]) {
                    var g = `
` + n[u].replace(" at new ", " at ");
                    return e.displayName && g.includes("<anonymous>") && (g = g.replace("<anonymous>", e.displayName)), typeof e == "function" && U.set(e, g), g;
                  }
                while (u >= 1 && l >= 0);
              break;
            }
        }
      } finally {
        J = !1, M.current = s, We(), Error.prepareStackTrace = i;
      }
      var k = e ? e.displayName || e.name : "", O = k ? Y(k) : "";
      return typeof e == "function" && U.set(e, O), O;
    }
    function Ue(e, r, t) {
      return le(e, !1);
    }
    function Ne(e) {
      var r = e.prototype;
      return !!(r && r.isReactComponent);
    }
    function N(e, r, t) {
      if (e == null)
        return "";
      if (typeof e == "function")
        return le(e, Ne(e));
      if (typeof e == "string")
        return Y(e);
      switch (e) {
        case S:
          return Y("Suspense");
        case p:
          return Y("SuspenseList");
      }
      if (typeof e == "object")
        switch (e.$$typeof) {
          case c:
            return Ue(e.render);
          case m:
            return N(e.type, r, t);
          case x: {
            var a = e, i = a._payload, s = a._init;
            try {
              return N(s(i), r, t);
            } catch {
            }
          }
        }
      return "";
    }
    var $ = Object.prototype.hasOwnProperty, ce = {}, fe = C.ReactDebugCurrentFrame;
    function V(e) {
      if (e) {
        var r = e._owner, t = N(e.type, e._source, r ? r.type : null);
        fe.setExtraStackFrame(t);
      } else
        fe.setExtraStackFrame(null);
    }
    function Ve(e, r, t, a, i) {
      {
        var s = Function.call.bind($);
        for (var o in e)
          if (s(e, o)) {
            var n = void 0;
            try {
              if (typeof e[o] != "function") {
                var d = Error((a || "React class") + ": " + t + " type `" + o + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof e[o] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                throw d.name = "Invariant Violation", d;
              }
              n = e[o](r, o, a, t, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
            } catch (u) {
              n = u;
            }
            n && !(n instanceof Error) && (V(i), f("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", a || "React class", t, o, typeof n), V(null)), n instanceof Error && !(n.message in ce) && (ce[n.message] = !0, V(i), f("Failed %s type: %s", t, n.message), V(null));
          }
      }
    }
    var Me = Array.isArray;
    function q(e) {
      return Me(e);
    }
    function Be(e) {
      {
        var r = typeof Symbol == "function" && Symbol.toStringTag, t = r && e[Symbol.toStringTag] || e.constructor.name || "Object";
        return t;
      }
    }
    function Je(e) {
      try {
        return de(e), !1;
      } catch {
        return !0;
      }
    }
    function de(e) {
      return "" + e;
    }
    function ve(e) {
      if (Je(e))
        return f("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", Be(e)), de(e);
    }
    var pe = C.ReactCurrentOwner, qe = {
      key: !0,
      ref: !0,
      __self: !0,
      __source: !0
    }, ge, be;
    function Ke(e) {
      if ($.call(e, "ref")) {
        var r = Object.getOwnPropertyDescriptor(e, "ref").get;
        if (r && r.isReactWarning)
          return !1;
      }
      return e.ref !== void 0;
    }
    function Ge(e) {
      if ($.call(e, "key")) {
        var r = Object.getOwnPropertyDescriptor(e, "key").get;
        if (r && r.isReactWarning)
          return !1;
      }
      return e.key !== void 0;
    }
    function ze(e, r) {
      typeof e.ref == "string" && pe.current;
    }
    function Xe(e, r) {
      {
        var t = function() {
          ge || (ge = !0, f("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", r));
        };
        t.isReactWarning = !0, Object.defineProperty(e, "key", {
          get: t,
          configurable: !0
        });
      }
    }
    function He(e, r) {
      {
        var t = function() {
          be || (be = !0, f("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", r));
        };
        t.isReactWarning = !0, Object.defineProperty(e, "ref", {
          get: t,
          configurable: !0
        });
      }
    }
    var Ze = function(e, r, t, a, i, s, o) {
      var n = {
        // This tag allows us to uniquely identify this as a React Element
        $$typeof: b,
        // Built-in properties that belong on the element
        type: e,
        key: r,
        ref: t,
        props: o,
        // Record the component responsible for creating this element.
        _owner: s
      };
      return n._store = {}, Object.defineProperty(n._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: !1
      }), Object.defineProperty(n, "_self", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: a
      }), Object.defineProperty(n, "_source", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: i
      }), Object.freeze && (Object.freeze(n.props), Object.freeze(n)), n;
    };
    function Qe(e, r, t, a, i) {
      {
        var s, o = {}, n = null, d = null;
        t !== void 0 && (ve(t), n = "" + t), Ge(r) && (ve(r.key), n = "" + r.key), Ke(r) && (d = r.ref, ze(r, i));
        for (s in r)
          $.call(r, s) && !qe.hasOwnProperty(s) && (o[s] = r[s]);
        if (e && e.defaultProps) {
          var u = e.defaultProps;
          for (s in u)
            o[s] === void 0 && (o[s] = u[s]);
        }
        if (n || d) {
          var l = typeof e == "function" ? e.displayName || e.name || "Unknown" : e;
          n && Xe(o, l), d && He(o, l);
        }
        return Ze(e, n, d, i, a, pe.current, o);
      }
    }
    var K = C.ReactCurrentOwner, he = C.ReactDebugCurrentFrame;
    function j(e) {
      if (e) {
        var r = e._owner, t = N(e.type, e._source, r ? r.type : null);
        he.setExtraStackFrame(t);
      } else
        he.setExtraStackFrame(null);
    }
    var G;
    G = !1;
    function z(e) {
      return typeof e == "object" && e !== null && e.$$typeof === b;
    }
    function ye() {
      {
        if (K.current) {
          var e = _(K.current.type);
          if (e)
            return `

Check the render method of \`` + e + "`.";
        }
        return "";
      }
    }
    function er(e) {
      return "";
    }
    var Ee = {};
    function rr(e) {
      {
        var r = ye();
        if (!r) {
          var t = typeof e == "string" ? e : e.displayName || e.name;
          t && (r = `

Check the top-level render call using <` + t + ">.");
        }
        return r;
      }
    }
    function me(e, r) {
      {
        if (!e._store || e._store.validated || e.key != null)
          return;
        e._store.validated = !0;
        var t = rr(r);
        if (Ee[t])
          return;
        Ee[t] = !0;
        var a = "";
        e && e._owner && e._owner !== K.current && (a = " It was passed a child from " + _(e._owner.type) + "."), j(e), f('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', t, a), j(null);
      }
    }
    function _e(e, r) {
      {
        if (typeof e != "object")
          return;
        if (q(e))
          for (var t = 0; t < e.length; t++) {
            var a = e[t];
            z(a) && me(a, r);
          }
        else if (z(e))
          e._store && (e._store.validated = !0);
        else if (e) {
          var i = Se(e);
          if (typeof i == "function" && i !== e.entries)
            for (var s = i.call(e), o; !(o = s.next()).done; )
              z(o.value) && me(o.value, r);
        }
      }
    }
    function tr(e) {
      {
        var r = e.type;
        if (r == null || typeof r == "string")
          return;
        var t;
        if (typeof r == "function")
          t = r.propTypes;
        else if (typeof r == "object" && (r.$$typeof === c || // Note: Memo only checks outer props here.
        // Inner props are checked in the reconciler.
        r.$$typeof === m))
          t = r.propTypes;
        else
          return;
        if (t) {
          var a = _(r);
          Ve(t, e.props, "prop", a, e);
        } else if (r.PropTypes !== void 0 && !G) {
          G = !0;
          var i = _(r);
          f("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", i || "Unknown");
        }
        typeof r.getDefaultProps == "function" && !r.getDefaultProps.isReactClassApproved && f("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
      }
    }
    function ar(e) {
      {
        for (var r = Object.keys(e.props), t = 0; t < r.length; t++) {
          var a = r[t];
          if (a !== "children" && a !== "key") {
            j(e), f("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", a), j(null);
            break;
          }
        }
        e.ref !== null && (j(e), f("Invalid attribute `ref` supplied to `React.Fragment`."), j(null));
      }
    }
    var Re = {};
    function Te(e, r, t, a, i, s) {
      {
        var o = $e(e);
        if (!o) {
          var n = "";
          (e === void 0 || typeof e == "object" && e !== null && Object.keys(e).length === 0) && (n += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.");
          var d = er();
          d ? n += d : n += ye();
          var u;
          e === null ? u = "null" : q(e) ? u = "array" : e !== void 0 && e.$$typeof === b ? (u = "<" + (_(e.type) || "Unknown") + " />", n = " Did you accidentally export a JSX literal instead of a component?") : u = typeof e, f("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", u, n);
        }
        var l = Qe(e, r, t, i, s);
        if (l == null)
          return l;
        if (o) {
          var g = r.children;
          if (g !== void 0)
            if (a)
              if (q(g)) {
                for (var k = 0; k < g.length; k++)
                  _e(g[k], e);
                Object.freeze && Object.freeze(g);
              } else
                f("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
            else
              _e(g, e);
        }
        if ($.call(r, "key")) {
          var O = _(e), v = Object.keys(r).filter(function(lr) {
            return lr !== "key";
          }), X = v.length > 0 ? "{key: someKey, " + v.join(": ..., ") + ": ...}" : "{key: someKey}";
          if (!Re[O + X]) {
            var ur = v.length > 0 ? "{" + v.join(": ..., ") + ": ...}" : "{}";
            f(`A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`, X, O, ur, O), Re[O + X] = !0;
          }
        }
        return e === y ? ar(l) : tr(l), l;
      }
    }
    function nr(e, r, t) {
      return Te(e, r, t, !0);
    }
    function or(e, r, t) {
      return Te(e, r, t, !1);
    }
    var ir = or, sr = nr;
    L.Fragment = y, L.jsx = ir, L.jsxs = sr;
  }()), L;
}
process.env.NODE_ENV === "production" ? H.exports = cr() : H.exports = fr();
var A = H.exports;
const dr = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none", vr = {
  primary: "bg-pva-sage text-white hover:bg-pva-sage-light focus-visible:ring-pva-gold",
  secondary: "bg-pva-terracotta text-white hover:bg-pva-terracotta-light focus-visible:ring-pva-gold",
  tertiary: "border border-pva-sage text-pva-sage hover:bg-pva-sage-light hover:text-white"
}, _r = ({ variant: E = "primary", className: b = "", ...h }) => {
  const y = vr[E];
  return /* @__PURE__ */ A.jsx("button", { className: `${dr} ${y} ${b}`, ...h });
}, pr = "bg-white text-gray-900 rounded-lg overflow-hidden", gr = {
  elevated: "shadow-md",
  outline: "border border-pva-sage",
  flat: ""
}, Rr = ({
  variant: E = "elevated",
  className: b = "",
  header: h,
  children: y,
  footer: R,
  ...P
}) => /* @__PURE__ */ A.jsxs("div", { className: `${pr} ${gr[E]} ${b}`, ...P, children: [
  h ? /* @__PURE__ */ A.jsx("div", { className: "px-4 py-3 border-b border-gray-100 bg-pva-sage text-white", children: h }) : null,
  /* @__PURE__ */ A.jsx("div", { className: "p-4", children: y }),
  R ? /* @__PURE__ */ A.jsx("div", { className: "px-4 py-3 border-t border-gray-100 bg-gray-50", children: R }) : null
] }), br = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", hr = {
  sage: "bg-pva-sage text-white",
  terracotta: "bg-pva-terracotta text-white",
  gold: "bg-pva-gold text-black",
  neutral: "bg-gray-200 text-gray-800"
}, Tr = ({ color: E = "neutral", className: b = "", ...h }) => /* @__PURE__ */ A.jsx("span", { className: `${br} ${hr[E]} ${b}`, ...h });
export {
  Tr as Badge,
  _r as Button,
  Rr as Card,
  mr as PVA_BRAND,
  Er as PVA_COLORS
};
