(function (b, w) {
  typeof exports == 'object' && typeof module < 'u'
    ? w(exports, require('react'))
    : typeof define == 'function' && define.amd
      ? define(['exports', 'react'], w)
      : ((b = typeof globalThis < 'u' ? globalThis : b || self), w((b.PvaUi = {}), b.require$$0));
})(this, function (b, w) {
  'use strict';
  const Se = {
      pva: {
        sage: { DEFAULT: '#3a5a40', light: '#588157', dark: '#2c4231' },
        terracotta: { DEFAULT: '#a44a3f', light: '#c95b4d', dark: '#7d3830' },
        gold: { DEFAULT: '#d4af37' },
      },
    },
    Ce = {
      name: 'Pura Vida Ayurveda',
      colors: {
        sage: { DEFAULT: '#3a5a40', light: '#588157', dark: '#2c4231' },
        terracotta: { DEFAULT: '#a44a3f', light: '#c95b4d', dark: '#7d3830' },
        gold: { DEFAULT: '#d4af37' },
      },
    };
  var J = { exports: {} },
    D = {};
  /**
   * @license React
   * react-jsx-runtime.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */ var ee;
  function je() {
    if (ee) return D;
    ee = 1;
    var m = w,
      h = Symbol.for('react.element'),
      y = Symbol.for('react.fragment'),
      E = Object.prototype.hasOwnProperty,
      U = m.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
      W = { key: !0, ref: !0, __self: !0, __source: !0 };
    function $(T, c, C) {
      var p,
        _ = {},
        x = null,
        Y = null;
      (C !== void 0 && (x = '' + C),
        c.key !== void 0 && (x = '' + c.key),
        c.ref !== void 0 && (Y = c.ref));
      for (p in c) E.call(c, p) && !W.hasOwnProperty(p) && (_[p] = c[p]);
      if (T && T.defaultProps)
        for (p in ((c = T.defaultProps), c)) _[p] === void 0 && (_[p] = c[p]);
      return { $$typeof: h, type: T, key: x, ref: Y, props: _, _owner: U.current };
    }
    return ((D.Fragment = y), (D.jsx = $), (D.jsxs = $), D);
  }
  var F = {};
  /**
   * @license React
   * react-jsx-runtime.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */ var re;
  function ke() {
    return (
      re ||
        ((re = 1),
        process.env.NODE_ENV !== 'production' &&
          (function () {
            var m = w,
              h = Symbol.for('react.element'),
              y = Symbol.for('react.portal'),
              E = Symbol.for('react.fragment'),
              U = Symbol.for('react.strict_mode'),
              W = Symbol.for('react.profiler'),
              $ = Symbol.for('react.provider'),
              T = Symbol.for('react.context'),
              c = Symbol.for('react.forward_ref'),
              C = Symbol.for('react.suspense'),
              p = Symbol.for('react.suspense_list'),
              _ = Symbol.for('react.memo'),
              x = Symbol.for('react.lazy'),
              Y = Symbol.for('react.offscreen'),
              te = Symbol.iterator,
              We = '@@iterator';
            function Ye(e) {
              if (e === null || typeof e != 'object') return null;
              var r = (te && e[te]) || e[We];
              return typeof r == 'function' ? r : null;
            }
            var j = m.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
            function f(e) {
              {
                for (var r = arguments.length, t = new Array(r > 1 ? r - 1 : 0), n = 1; n < r; n++)
                  t[n - 1] = arguments[n];
                Ve('error', e, t);
              }
            }
            function Ve(e, r, t) {
              {
                var n = j.ReactDebugCurrentFrame,
                  i = n.getStackAddendum();
                i !== '' && ((r += '%s'), (t = t.concat([i])));
                var u = t.map(function (o) {
                  return String(o);
                });
                (u.unshift('Warning: ' + r), Function.prototype.apply.call(console[e], console, u));
              }
            }
            var Ne = !1,
              Me = !1,
              Be = !1,
              Je = !1,
              qe = !1,
              ne;
            ne = Symbol.for('react.module.reference');
            function Ke(e) {
              return !!(
                typeof e == 'string' ||
                typeof e == 'function' ||
                e === E ||
                e === W ||
                qe ||
                e === U ||
                e === C ||
                e === p ||
                Je ||
                e === Y ||
                Ne ||
                Me ||
                Be ||
                (typeof e == 'object' &&
                  e !== null &&
                  (e.$$typeof === x ||
                    e.$$typeof === _ ||
                    e.$$typeof === $ ||
                    e.$$typeof === T ||
                    e.$$typeof === c ||
                    e.$$typeof === ne ||
                    e.getModuleId !== void 0))
              );
            }
            function Ge(e, r, t) {
              var n = e.displayName;
              if (n) return n;
              var i = r.displayName || r.name || '';
              return i !== '' ? t + '(' + i + ')' : t;
            }
            function ae(e) {
              return e.displayName || 'Context';
            }
            function R(e) {
              if (e == null) return null;
              if (
                (typeof e.tag == 'number' &&
                  f(
                    'Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.',
                  ),
                typeof e == 'function')
              )
                return e.displayName || e.name || null;
              if (typeof e == 'string') return e;
              switch (e) {
                case E:
                  return 'Fragment';
                case y:
                  return 'Portal';
                case W:
                  return 'Profiler';
                case U:
                  return 'StrictMode';
                case C:
                  return 'Suspense';
                case p:
                  return 'SuspenseList';
              }
              if (typeof e == 'object')
                switch (e.$$typeof) {
                  case T:
                    var r = e;
                    return ae(r) + '.Consumer';
                  case $:
                    var t = e;
                    return ae(t._context) + '.Provider';
                  case c:
                    return Ge(e, e.render, 'ForwardRef');
                  case _:
                    var n = e.displayName || null;
                    return n !== null ? n : R(e.type) || 'Memo';
                  case x: {
                    var i = e,
                      u = i._payload,
                      o = i._init;
                    try {
                      return R(o(u));
                    } catch {
                      return null;
                    }
                  }
                }
              return null;
            }
            var O = Object.assign,
              I = 0,
              oe,
              ie,
              ue,
              se,
              le,
              ce,
              fe;
            function de() {}
            de.__reactDisabledLog = !0;
            function ze() {
              {
                if (I === 0) {
                  ((oe = console.log),
                    (ie = console.info),
                    (ue = console.warn),
                    (se = console.error),
                    (le = console.group),
                    (ce = console.groupCollapsed),
                    (fe = console.groupEnd));
                  var e = { configurable: !0, enumerable: !0, value: de, writable: !0 };
                  Object.defineProperties(console, {
                    info: e,
                    log: e,
                    warn: e,
                    error: e,
                    group: e,
                    groupCollapsed: e,
                    groupEnd: e,
                  });
                }
                I++;
              }
            }
            function Xe() {
              {
                if ((I--, I === 0)) {
                  var e = { configurable: !0, enumerable: !0, writable: !0 };
                  Object.defineProperties(console, {
                    log: O({}, e, { value: oe }),
                    info: O({}, e, { value: ie }),
                    warn: O({}, e, { value: ue }),
                    error: O({}, e, { value: se }),
                    group: O({}, e, { value: le }),
                    groupCollapsed: O({}, e, { value: ce }),
                    groupEnd: O({}, e, { value: fe }),
                  });
                }
                I < 0 &&
                  f('disabledDepth fell below zero. This is a bug in React. Please file an issue.');
              }
            }
            var q = j.ReactCurrentDispatcher,
              K;
            function V(e, r, t) {
              {
                if (K === void 0)
                  try {
                    throw Error();
                  } catch (i) {
                    var n = i.stack.trim().match(/\n( *(at )?)/);
                    K = (n && n[1]) || '';
                  }
                return (
                  `
` +
                  K +
                  e
                );
              }
            }
            var G = !1,
              N;
            {
              var He = typeof WeakMap == 'function' ? WeakMap : Map;
              N = new He();
            }
            function ve(e, r) {
              if (!e || G) return '';
              {
                var t = N.get(e);
                if (t !== void 0) return t;
              }
              var n;
              G = !0;
              var i = Error.prepareStackTrace;
              Error.prepareStackTrace = void 0;
              var u;
              ((u = q.current), (q.current = null), ze());
              try {
                if (r) {
                  var o = function () {
                    throw Error();
                  };
                  if (
                    (Object.defineProperty(o.prototype, 'props', {
                      set: function () {
                        throw Error();
                      },
                    }),
                    typeof Reflect == 'object' && Reflect.construct)
                  ) {
                    try {
                      Reflect.construct(o, []);
                    } catch (v) {
                      n = v;
                    }
                    Reflect.construct(e, [], o);
                  } else {
                    try {
                      o.call();
                    } catch (v) {
                      n = v;
                    }
                    e.call(o.prototype);
                  }
                } else {
                  try {
                    throw Error();
                  } catch (v) {
                    n = v;
                  }
                  e();
                }
              } catch (v) {
                if (v && n && typeof v.stack == 'string') {
                  for (
                    var a = v.stack.split(`
`),
                      d = n.stack.split(`
`),
                      s = a.length - 1,
                      l = d.length - 1;
                    s >= 1 && l >= 0 && a[s] !== d[l];

                  )
                    l--;
                  for (; s >= 1 && l >= 0; s--, l--)
                    if (a[s] !== d[l]) {
                      if (s !== 1 || l !== 1)
                        do
                          if ((s--, l--, l < 0 || a[s] !== d[l])) {
                            var g =
                              `
` + a[s].replace(' at new ', ' at ');
                            return (
                              e.displayName &&
                                g.includes('<anonymous>') &&
                                (g = g.replace('<anonymous>', e.displayName)),
                              typeof e == 'function' && N.set(e, g),
                              g
                            );
                          }
                        while (s >= 1 && l >= 0);
                      break;
                    }
                }
              } finally {
                ((G = !1), (q.current = u), Xe(), (Error.prepareStackTrace = i));
              }
              var A = e ? e.displayName || e.name : '',
                P = A ? V(A) : '';
              return (typeof e == 'function' && N.set(e, P), P);
            }
            function Ze(e, r, t) {
              return ve(e, !1);
            }
            function Qe(e) {
              var r = e.prototype;
              return !!(r && r.isReactComponent);
            }
            function M(e, r, t) {
              if (e == null) return '';
              if (typeof e == 'function') return ve(e, Qe(e));
              if (typeof e == 'string') return V(e);
              switch (e) {
                case C:
                  return V('Suspense');
                case p:
                  return V('SuspenseList');
              }
              if (typeof e == 'object')
                switch (e.$$typeof) {
                  case c:
                    return Ze(e.render);
                  case _:
                    return M(e.type, r, t);
                  case x: {
                    var n = e,
                      i = n._payload,
                      u = n._init;
                    try {
                      return M(u(i), r, t);
                    } catch {}
                  }
                }
              return '';
            }
            var L = Object.prototype.hasOwnProperty,
              pe = {},
              ge = j.ReactDebugCurrentFrame;
            function B(e) {
              if (e) {
                var r = e._owner,
                  t = M(e.type, e._source, r ? r.type : null);
                ge.setExtraStackFrame(t);
              } else ge.setExtraStackFrame(null);
            }
            function er(e, r, t, n, i) {
              {
                var u = Function.call.bind(L);
                for (var o in e)
                  if (u(e, o)) {
                    var a = void 0;
                    try {
                      if (typeof e[o] != 'function') {
                        var d = Error(
                          (n || 'React class') +
                            ': ' +
                            t +
                            ' type `' +
                            o +
                            '` is invalid; it must be a function, usually from the `prop-types` package, but received `' +
                            typeof e[o] +
                            '`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.',
                        );
                        throw ((d.name = 'Invariant Violation'), d);
                      }
                      a = e[o](r, o, n, t, null, 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED');
                    } catch (s) {
                      a = s;
                    }
                    (a &&
                      !(a instanceof Error) &&
                      (B(i),
                      f(
                        '%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).',
                        n || 'React class',
                        t,
                        o,
                        typeof a,
                      ),
                      B(null)),
                      a instanceof Error &&
                        !(a.message in pe) &&
                        ((pe[a.message] = !0),
                        B(i),
                        f('Failed %s type: %s', t, a.message),
                        B(null)));
                  }
              }
            }
            var rr = Array.isArray;
            function z(e) {
              return rr(e);
            }
            function tr(e) {
              {
                var r = typeof Symbol == 'function' && Symbol.toStringTag,
                  t = (r && e[Symbol.toStringTag]) || e.constructor.name || 'Object';
                return t;
              }
            }
            function nr(e) {
              try {
                return (be(e), !1);
              } catch {
                return !0;
              }
            }
            function be(e) {
              return '' + e;
            }
            function he(e) {
              if (nr(e))
                return (
                  f(
                    'The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.',
                    tr(e),
                  ),
                  be(e)
                );
            }
            var me = j.ReactCurrentOwner,
              ar = { key: !0, ref: !0, __self: !0, __source: !0 },
              ye,
              _e;
            function or(e) {
              if (L.call(e, 'ref')) {
                var r = Object.getOwnPropertyDescriptor(e, 'ref').get;
                if (r && r.isReactWarning) return !1;
              }
              return e.ref !== void 0;
            }
            function ir(e) {
              if (L.call(e, 'key')) {
                var r = Object.getOwnPropertyDescriptor(e, 'key').get;
                if (r && r.isReactWarning) return !1;
              }
              return e.key !== void 0;
            }
            function ur(e, r) {
              typeof e.ref == 'string' && me.current;
            }
            function sr(e, r) {
              {
                var t = function () {
                  ye ||
                    ((ye = !0),
                    f(
                      '%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)',
                      r,
                    ));
                };
                ((t.isReactWarning = !0),
                  Object.defineProperty(e, 'key', { get: t, configurable: !0 }));
              }
            }
            function lr(e, r) {
              {
                var t = function () {
                  _e ||
                    ((_e = !0),
                    f(
                      '%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)',
                      r,
                    ));
                };
                ((t.isReactWarning = !0),
                  Object.defineProperty(e, 'ref', { get: t, configurable: !0 }));
              }
            }
            var cr = function (e, r, t, n, i, u, o) {
              var a = { $$typeof: h, type: e, key: r, ref: t, props: o, _owner: u };
              return (
                (a._store = {}),
                Object.defineProperty(a._store, 'validated', {
                  configurable: !1,
                  enumerable: !1,
                  writable: !0,
                  value: !1,
                }),
                Object.defineProperty(a, '_self', {
                  configurable: !1,
                  enumerable: !1,
                  writable: !1,
                  value: n,
                }),
                Object.defineProperty(a, '_source', {
                  configurable: !1,
                  enumerable: !1,
                  writable: !1,
                  value: i,
                }),
                Object.freeze && (Object.freeze(a.props), Object.freeze(a)),
                a
              );
            };
            function fr(e, r, t, n, i) {
              {
                var u,
                  o = {},
                  a = null,
                  d = null;
                (t !== void 0 && (he(t), (a = '' + t)),
                  ir(r) && (he(r.key), (a = '' + r.key)),
                  or(r) && ((d = r.ref), ur(r, i)));
                for (u in r) L.call(r, u) && !ar.hasOwnProperty(u) && (o[u] = r[u]);
                if (e && e.defaultProps) {
                  var s = e.defaultProps;
                  for (u in s) o[u] === void 0 && (o[u] = s[u]);
                }
                if (a || d) {
                  var l = typeof e == 'function' ? e.displayName || e.name || 'Unknown' : e;
                  (a && sr(o, l), d && lr(o, l));
                }
                return cr(e, a, d, i, n, me.current, o);
              }
            }
            var X = j.ReactCurrentOwner,
              Ee = j.ReactDebugCurrentFrame;
            function k(e) {
              if (e) {
                var r = e._owner,
                  t = M(e.type, e._source, r ? r.type : null);
                Ee.setExtraStackFrame(t);
              } else Ee.setExtraStackFrame(null);
            }
            var H;
            H = !1;
            function Z(e) {
              return typeof e == 'object' && e !== null && e.$$typeof === h;
            }
            function Re() {
              {
                if (X.current) {
                  var e = R(X.current.type);
                  if (e)
                    return (
                      `

Check the render method of \`` +
                      e +
                      '`.'
                    );
                }
                return '';
              }
            }
            function dr(e) {
              return '';
            }
            var Te = {};
            function vr(e) {
              {
                var r = Re();
                if (!r) {
                  var t = typeof e == 'string' ? e : e.displayName || e.name;
                  t &&
                    (r =
                      `

Check the top-level render call using <` +
                      t +
                      '>.');
                }
                return r;
              }
            }
            function xe(e, r) {
              {
                if (!e._store || e._store.validated || e.key != null) return;
                e._store.validated = !0;
                var t = vr(r);
                if (Te[t]) return;
                Te[t] = !0;
                var n = '';
                (e &&
                  e._owner &&
                  e._owner !== X.current &&
                  (n = ' It was passed a child from ' + R(e._owner.type) + '.'),
                  k(e),
                  f(
                    'Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.',
                    t,
                    n,
                  ),
                  k(null));
              }
            }
            function Oe(e, r) {
              {
                if (typeof e != 'object') return;
                if (z(e))
                  for (var t = 0; t < e.length; t++) {
                    var n = e[t];
                    Z(n) && xe(n, r);
                  }
                else if (Z(e)) e._store && (e._store.validated = !0);
                else if (e) {
                  var i = Ye(e);
                  if (typeof i == 'function' && i !== e.entries)
                    for (var u = i.call(e), o; !(o = u.next()).done; ) Z(o.value) && xe(o.value, r);
                }
              }
            }
            function pr(e) {
              {
                var r = e.type;
                if (r == null || typeof r == 'string') return;
                var t;
                if (typeof r == 'function') t = r.propTypes;
                else if (typeof r == 'object' && (r.$$typeof === c || r.$$typeof === _))
                  t = r.propTypes;
                else return;
                if (t) {
                  var n = R(r);
                  er(t, e.props, 'prop', n, e);
                } else if (r.PropTypes !== void 0 && !H) {
                  H = !0;
                  var i = R(r);
                  f(
                    'Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?',
                    i || 'Unknown',
                  );
                }
                typeof r.getDefaultProps == 'function' &&
                  !r.getDefaultProps.isReactClassApproved &&
                  f(
                    'getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.',
                  );
              }
            }
            function gr(e) {
              {
                for (var r = Object.keys(e.props), t = 0; t < r.length; t++) {
                  var n = r[t];
                  if (n !== 'children' && n !== 'key') {
                    (k(e),
                      f(
                        'Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.',
                        n,
                      ),
                      k(null));
                    break;
                  }
                }
                e.ref !== null &&
                  (k(e), f('Invalid attribute `ref` supplied to `React.Fragment`.'), k(null));
              }
            }
            var Pe = {};
            function we(e, r, t, n, i, u) {
              {
                var o = Ke(e);
                if (!o) {
                  var a = '';
                  (e === void 0 ||
                    (typeof e == 'object' && e !== null && Object.keys(e).length === 0)) &&
                    (a +=
                      " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.");
                  var d = dr();
                  d ? (a += d) : (a += Re());
                  var s;
                  (e === null
                    ? (s = 'null')
                    : z(e)
                      ? (s = 'array')
                      : e !== void 0 && e.$$typeof === h
                        ? ((s = '<' + (R(e.type) || 'Unknown') + ' />'),
                          (a =
                            ' Did you accidentally export a JSX literal instead of a component?'))
                        : (s = typeof e),
                    f(
                      'React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s',
                      s,
                      a,
                    ));
                }
                var l = fr(e, r, t, i, u);
                if (l == null) return l;
                if (o) {
                  var g = r.children;
                  if (g !== void 0)
                    if (n)
                      if (z(g)) {
                        for (var A = 0; A < g.length; A++) Oe(g[A], e);
                        Object.freeze && Object.freeze(g);
                      } else
                        f(
                          'React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.',
                        );
                    else Oe(g, e);
                }
                if (L.call(r, 'key')) {
                  var P = R(e),
                    v = Object.keys(r).filter(function (Er) {
                      return Er !== 'key';
                    }),
                    Q =
                      v.length > 0
                        ? '{key: someKey, ' + v.join(': ..., ') + ': ...}'
                        : '{key: someKey}';
                  if (!Pe[P + Q]) {
                    var _r = v.length > 0 ? '{' + v.join(': ..., ') + ': ...}' : '{}';
                    (f(
                      `A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`,
                      Q,
                      P,
                      _r,
                      P,
                    ),
                      (Pe[P + Q] = !0));
                  }
                }
                return (e === E ? gr(l) : pr(l), l);
              }
            }
            function br(e, r, t) {
              return we(e, r, t, !0);
            }
            function hr(e, r, t) {
              return we(e, r, t, !1);
            }
            var mr = hr,
              yr = br;
            ((F.Fragment = E), (F.jsx = mr), (F.jsxs = yr));
          })()),
      F
    );
  }
  process.env.NODE_ENV === 'production' ? (J.exports = je()) : (J.exports = ke());
  var S = J.exports;
  const Ae =
      'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
    De = {
      primary: 'bg-pva-sage text-white hover:bg-pva-sage-light focus-visible:ring-pva-gold',
      secondary:
        'bg-pva-terracotta text-white hover:bg-pva-terracotta-light focus-visible:ring-pva-gold',
      tertiary: 'border border-pva-sage text-pva-sage hover:bg-pva-sage-light hover:text-white',
    },
    Fe = ({ variant: m = 'primary', className: h = '', ...y }) => {
      const E = De[m];
      return S.jsx('button', { className: `${Ae} ${E} ${h}`, ...y });
    };
  function $e({ title: m, children: h, href: y }) {
    return S.jsxs('a', {
      className:
        'group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-neutral-700 hover:bg-neutral-800/30',
      href: `${y}?utm_source=create-turbo&utm_medium=with-tailwind&utm_campaign=create-turbo`,
      rel: 'noopener noreferrer',
      target: '_blank',
      children: [
        S.jsxs('h2', {
          className: 'mb-3 text-2xl font-semibold',
          children: [
            m,
            ' ',
            S.jsx('span', {
              className:
                'inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none',
              children: '->',
            }),
          ],
        }),
        S.jsx('p', { className: 'm-0 max-w-[30ch] text-sm opacity-50', children: h }),
      ],
    });
  }
  const Ie = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    Le = {
      sage: 'bg-pva-sage text-white',
      terracotta: 'bg-pva-terracotta text-white',
      gold: 'bg-pva-gold text-black',
      neutral: 'bg-gray-200 text-gray-800',
    },
    Ue = ({ color: m = 'neutral', className: h = '', ...y }) =>
      S.jsx('span', { className: `${Ie} ${Le[m]} ${h}`, ...y });
  ((b.Badge = Ue),
    (b.Button = Fe),
    (b.Card = $e),
    (b.PVA_BRAND = Ce),
    (b.PVA_COLORS = Se),
    Object.defineProperty(b, Symbol.toStringTag, { value: 'Module' }));
});
