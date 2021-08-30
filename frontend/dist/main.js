
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init$1(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getAugmentedNamespace(n) {
    	if (n.__esModule) return n;
    	var a = Object.defineProperty({}, '__esModule', {value: true});
    	Object.keys(n).forEach(function (k) {
    		var d = Object.getOwnPropertyDescriptor(n, k);
    		Object.defineProperty(a, k, d.get ? d : {
    			enumerable: true,
    			get: function () {
    				return n[k];
    			}
    		});
    	});
    	return a;
    }

    var urlPattern = {exports: {}};

    (function (module, exports) {
    // Generated by CoffeeScript 1.10.0
    var slice = [].slice;

    (function(root, factory) {
      if (exports !== null) {
        return module.exports = factory();
      } else {
        return root.UrlPattern = factory();
      }
    })(commonjsGlobal, function() {
      var P, UrlPattern, astNodeContainsSegmentsForProvidedParams, astNodeToNames, astNodeToRegexString, baseAstNodeToRegexString, concatMap, defaultOptions, escapeForRegex, getParam, keysAndValuesToObject, newParser, regexGroupCount, stringConcatMap, stringify;
      escapeForRegex = function(string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      };
      concatMap = function(array, f) {
        var i, length, results;
        results = [];
        i = -1;
        length = array.length;
        while (++i < length) {
          results = results.concat(f(array[i]));
        }
        return results;
      };
      stringConcatMap = function(array, f) {
        var i, length, result;
        result = '';
        i = -1;
        length = array.length;
        while (++i < length) {
          result += f(array[i]);
        }
        return result;
      };
      regexGroupCount = function(regex) {
        return (new RegExp(regex.toString() + '|')).exec('').length - 1;
      };
      keysAndValuesToObject = function(keys, values) {
        var i, key, length, object, value;
        object = {};
        i = -1;
        length = keys.length;
        while (++i < length) {
          key = keys[i];
          value = values[i];
          if (value == null) {
            continue;
          }
          if (object[key] != null) {
            if (!Array.isArray(object[key])) {
              object[key] = [object[key]];
            }
            object[key].push(value);
          } else {
            object[key] = value;
          }
        }
        return object;
      };
      P = {};
      P.Result = function(value, rest) {
        this.value = value;
        this.rest = rest;
      };
      P.Tagged = function(tag, value) {
        this.tag = tag;
        this.value = value;
      };
      P.tag = function(tag, parser) {
        return function(input) {
          var result, tagged;
          result = parser(input);
          if (result == null) {
            return;
          }
          tagged = new P.Tagged(tag, result.value);
          return new P.Result(tagged, result.rest);
        };
      };
      P.regex = function(regex) {
        return function(input) {
          var matches, result;
          matches = regex.exec(input);
          if (matches == null) {
            return;
          }
          result = matches[0];
          return new P.Result(result, input.slice(result.length));
        };
      };
      P.sequence = function() {
        var parsers;
        parsers = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return function(input) {
          var i, length, parser, rest, result, values;
          i = -1;
          length = parsers.length;
          values = [];
          rest = input;
          while (++i < length) {
            parser = parsers[i];
            result = parser(rest);
            if (result == null) {
              return;
            }
            values.push(result.value);
            rest = result.rest;
          }
          return new P.Result(values, rest);
        };
      };
      P.pick = function() {
        var indexes, parsers;
        indexes = arguments[0], parsers = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        return function(input) {
          var array, result;
          result = P.sequence.apply(P, parsers)(input);
          if (result == null) {
            return;
          }
          array = result.value;
          result.value = array[indexes];
          return result;
        };
      };
      P.string = function(string) {
        var length;
        length = string.length;
        return function(input) {
          if (input.slice(0, length) === string) {
            return new P.Result(string, input.slice(length));
          }
        };
      };
      P.lazy = function(fn) {
        var cached;
        cached = null;
        return function(input) {
          if (cached == null) {
            cached = fn();
          }
          return cached(input);
        };
      };
      P.baseMany = function(parser, end, stringResult, atLeastOneResultRequired, input) {
        var endResult, parserResult, rest, results;
        rest = input;
        results = stringResult ? '' : [];
        while (true) {
          if (end != null) {
            endResult = end(rest);
            if (endResult != null) {
              break;
            }
          }
          parserResult = parser(rest);
          if (parserResult == null) {
            break;
          }
          if (stringResult) {
            results += parserResult.value;
          } else {
            results.push(parserResult.value);
          }
          rest = parserResult.rest;
        }
        if (atLeastOneResultRequired && results.length === 0) {
          return;
        }
        return new P.Result(results, rest);
      };
      P.many1 = function(parser) {
        return function(input) {
          return P.baseMany(parser, null, false, true, input);
        };
      };
      P.concatMany1Till = function(parser, end) {
        return function(input) {
          return P.baseMany(parser, end, true, true, input);
        };
      };
      P.firstChoice = function() {
        var parsers;
        parsers = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return function(input) {
          var i, length, parser, result;
          i = -1;
          length = parsers.length;
          while (++i < length) {
            parser = parsers[i];
            result = parser(input);
            if (result != null) {
              return result;
            }
          }
        };
      };
      newParser = function(options) {
        var U;
        U = {};
        U.wildcard = P.tag('wildcard', P.string(options.wildcardChar));
        U.optional = P.tag('optional', P.pick(1, P.string(options.optionalSegmentStartChar), P.lazy(function() {
          return U.pattern;
        }), P.string(options.optionalSegmentEndChar)));
        U.name = P.regex(new RegExp("^[" + options.segmentNameCharset + "]+"));
        U.named = P.tag('named', P.pick(1, P.string(options.segmentNameStartChar), P.lazy(function() {
          return U.name;
        })));
        U.escapedChar = P.pick(1, P.string(options.escapeChar), P.regex(/^./));
        U["static"] = P.tag('static', P.concatMany1Till(P.firstChoice(P.lazy(function() {
          return U.escapedChar;
        }), P.regex(/^./)), P.firstChoice(P.string(options.segmentNameStartChar), P.string(options.optionalSegmentStartChar), P.string(options.optionalSegmentEndChar), U.wildcard)));
        U.token = P.lazy(function() {
          return P.firstChoice(U.wildcard, U.optional, U.named, U["static"]);
        });
        U.pattern = P.many1(P.lazy(function() {
          return U.token;
        }));
        return U;
      };
      defaultOptions = {
        escapeChar: '\\',
        segmentNameStartChar: ':',
        segmentValueCharset: 'a-zA-Z0-9-_~ %',
        segmentNameCharset: 'a-zA-Z0-9',
        optionalSegmentStartChar: '(',
        optionalSegmentEndChar: ')',
        wildcardChar: '*'
      };
      baseAstNodeToRegexString = function(astNode, segmentValueCharset) {
        if (Array.isArray(astNode)) {
          return stringConcatMap(astNode, function(node) {
            return baseAstNodeToRegexString(node, segmentValueCharset);
          });
        }
        switch (astNode.tag) {
          case 'wildcard':
            return '(.*?)';
          case 'named':
            return "([" + segmentValueCharset + "]+)";
          case 'static':
            return escapeForRegex(astNode.value);
          case 'optional':
            return '(?:' + baseAstNodeToRegexString(astNode.value, segmentValueCharset) + ')?';
        }
      };
      astNodeToRegexString = function(astNode, segmentValueCharset) {
        if (segmentValueCharset == null) {
          segmentValueCharset = defaultOptions.segmentValueCharset;
        }
        return '^' + baseAstNodeToRegexString(astNode, segmentValueCharset) + '$';
      };
      astNodeToNames = function(astNode) {
        if (Array.isArray(astNode)) {
          return concatMap(astNode, astNodeToNames);
        }
        switch (astNode.tag) {
          case 'wildcard':
            return ['_'];
          case 'named':
            return [astNode.value];
          case 'static':
            return [];
          case 'optional':
            return astNodeToNames(astNode.value);
        }
      };
      getParam = function(params, key, nextIndexes, sideEffects) {
        var index, maxIndex, result, value;
        if (sideEffects == null) {
          sideEffects = false;
        }
        value = params[key];
        if (value == null) {
          if (sideEffects) {
            throw new Error("no values provided for key `" + key + "`");
          } else {
            return;
          }
        }
        index = nextIndexes[key] || 0;
        maxIndex = Array.isArray(value) ? value.length - 1 : 0;
        if (index > maxIndex) {
          if (sideEffects) {
            throw new Error("too few values provided for key `" + key + "`");
          } else {
            return;
          }
        }
        result = Array.isArray(value) ? value[index] : value;
        if (sideEffects) {
          nextIndexes[key] = index + 1;
        }
        return result;
      };
      astNodeContainsSegmentsForProvidedParams = function(astNode, params, nextIndexes) {
        var i, length;
        if (Array.isArray(astNode)) {
          i = -1;
          length = astNode.length;
          while (++i < length) {
            if (astNodeContainsSegmentsForProvidedParams(astNode[i], params, nextIndexes)) {
              return true;
            }
          }
          return false;
        }
        switch (astNode.tag) {
          case 'wildcard':
            return getParam(params, '_', nextIndexes, false) != null;
          case 'named':
            return getParam(params, astNode.value, nextIndexes, false) != null;
          case 'static':
            return false;
          case 'optional':
            return astNodeContainsSegmentsForProvidedParams(astNode.value, params, nextIndexes);
        }
      };
      stringify = function(astNode, params, nextIndexes) {
        if (Array.isArray(astNode)) {
          return stringConcatMap(astNode, function(node) {
            return stringify(node, params, nextIndexes);
          });
        }
        switch (astNode.tag) {
          case 'wildcard':
            return getParam(params, '_', nextIndexes, true);
          case 'named':
            return getParam(params, astNode.value, nextIndexes, true);
          case 'static':
            return astNode.value;
          case 'optional':
            if (astNodeContainsSegmentsForProvidedParams(astNode.value, params, nextIndexes)) {
              return stringify(astNode.value, params, nextIndexes);
            } else {
              return '';
            }
        }
      };
      UrlPattern = function(arg1, arg2) {
        var groupCount, options, parsed, parser, withoutWhitespace;
        if (arg1 instanceof UrlPattern) {
          this.isRegex = arg1.isRegex;
          this.regex = arg1.regex;
          this.ast = arg1.ast;
          this.names = arg1.names;
          return;
        }
        this.isRegex = arg1 instanceof RegExp;
        if (!(('string' === typeof arg1) || this.isRegex)) {
          throw new TypeError('argument must be a regex or a string');
        }
        if (this.isRegex) {
          this.regex = arg1;
          if (arg2 != null) {
            if (!Array.isArray(arg2)) {
              throw new Error('if first argument is a regex the second argument may be an array of group names but you provided something else');
            }
            groupCount = regexGroupCount(this.regex);
            if (arg2.length !== groupCount) {
              throw new Error("regex contains " + groupCount + " groups but array of group names contains " + arg2.length);
            }
            this.names = arg2;
          }
          return;
        }
        if (arg1 === '') {
          throw new Error('argument must not be the empty string');
        }
        withoutWhitespace = arg1.replace(/\s+/g, '');
        if (withoutWhitespace !== arg1) {
          throw new Error('argument must not contain whitespace');
        }
        options = {
          escapeChar: (arg2 != null ? arg2.escapeChar : void 0) || defaultOptions.escapeChar,
          segmentNameStartChar: (arg2 != null ? arg2.segmentNameStartChar : void 0) || defaultOptions.segmentNameStartChar,
          segmentNameCharset: (arg2 != null ? arg2.segmentNameCharset : void 0) || defaultOptions.segmentNameCharset,
          segmentValueCharset: (arg2 != null ? arg2.segmentValueCharset : void 0) || defaultOptions.segmentValueCharset,
          optionalSegmentStartChar: (arg2 != null ? arg2.optionalSegmentStartChar : void 0) || defaultOptions.optionalSegmentStartChar,
          optionalSegmentEndChar: (arg2 != null ? arg2.optionalSegmentEndChar : void 0) || defaultOptions.optionalSegmentEndChar,
          wildcardChar: (arg2 != null ? arg2.wildcardChar : void 0) || defaultOptions.wildcardChar
        };
        parser = newParser(options);
        parsed = parser.pattern(arg1);
        if (parsed == null) {
          throw new Error("couldn't parse pattern");
        }
        if (parsed.rest !== '') {
          throw new Error("could only partially parse pattern");
        }
        this.ast = parsed.value;
        this.regex = new RegExp(astNodeToRegexString(this.ast, options.segmentValueCharset));
        this.names = astNodeToNames(this.ast);
      };
      UrlPattern.prototype.match = function(url) {
        var groups, match;
        match = this.regex.exec(url);
        if (match == null) {
          return null;
        }
        groups = match.slice(1);
        if (this.names) {
          return keysAndValuesToObject(this.names, groups);
        } else {
          return groups;
        }
      };
      UrlPattern.prototype.stringify = function(params) {
        if (params == null) {
          params = {};
        }
        if (this.isRegex) {
          throw new Error("can't stringify patterns generated from a regex");
        }
        if (params !== Object(params)) {
          throw new Error("argument must be an object or undefined");
        }
        return stringify(this.ast, params, {});
      };
      UrlPattern.escapeForRegex = escapeForRegex;
      UrlPattern.concatMap = concatMap;
      UrlPattern.stringConcatMap = stringConcatMap;
      UrlPattern.regexGroupCount = regexGroupCount;
      UrlPattern.keysAndValuesToObject = keysAndValuesToObject;
      UrlPattern.P = P;
      UrlPattern.newParser = newParser;
      UrlPattern.defaultOptions = defaultOptions;
      UrlPattern.astNodeToRegexString = astNodeToRegexString;
      UrlPattern.astNodeToNames = astNodeToNames;
      UrlPattern.getParam = getParam;
      UrlPattern.astNodeContainsSegmentsForProvidedParams = astNodeContainsSegmentsForProvidedParams;
      UrlPattern.stringify = stringify;
      return UrlPattern;
    });
    }(urlPattern, urlPattern.exports));

    var UrlPattern = urlPattern.exports;

    function defineProp (obj, prop, value) {
      Object.defineProperty(obj, prop, { value });
    }

    // Parse schema into routes
    function parse$2 (schema = {}, notRoot, pathname, href = '#') {
      // Convert schema to options object. Schema can be:
      // + function: Svelte component
      // + string: redirect path
      // + object: options
      if (notRoot) {
        let type = typeof schema;
        schema = type === 'function' ? { $$component: schema }
          : type === 'string' ? { $$redirect: schema }
          : (type !== 'object' || schema === null) ? {} : schema;

        let c = schema.$$component;
        if (typeof c !== 'function' && c !== undefined && c !== null)
          throw new Error('Invalid Svelte component')
      }

      // Any properties not starting with $$ will be treated as routes,
      // the rest will be kept as route data. Custom data is also kept,
      // but will be replaced with internal data if duplicating names.
      let route = {};
      for (let i in schema) {
        if (/^\$\$/.test(i))
          defineProp(route, i, schema[i]);
        else
          route[i] = parse$2(schema[i], true, i, href + i);
      }

      // Define internal data
      if (notRoot) {
        defineProp(route, '$$href', href); // full path including #
        defineProp(route, '$$pathname', pathname); // scoped path
        defineProp(route, '$$pattern', new UrlPattern(href));
        defineProp(route, '$$stringify', v => route.$$pattern.stringify(v));
      }

      return Object.freeze(route)
    }

    // Routes store must be set before creating any Svelte components.
    // It can only be set once. A parsed version is created after with
    // helpful internal data
    let schema = writable();
    let routes = derived(schema, $ => parse$2($));
    routes.set = v => {
      schema.set(v);
      delete routes.set;
    };

    let regex = /(#?[^?]*)?(\?.*)?/;

    function parse$1 () {
      let match = regex.exec(window.location.hash);
      let pathname = match[1] || '#/';
      let querystring = match[2];
      return { pathname, querystring }
    }

    let path = readable(parse$1(), set => {
      let update = () => set(parse$1());
      window.addEventListener('hashchange', update);
      return () => window.removeEventListener('hashchange', update)
    });

    let pathname = derived(path, $ => $.pathname); // current pathname without query
    let querystring = derived(path, $ => $.querystring);
    derived(querystring, $ => {
      return Array.from(new URLSearchParams($))
        .reduce((a, [i, e]) => { a[i] = e; return a }, {})
    });

    // Search for matching route
    function parse (active, pathname, notRoot, matches = []) {
      if (notRoot) {
        let params = active.$$pattern.match(pathname);
        if (params) {
          return !active.$$redirect
            ? { active, params, matches }
            // redirect
            : tick().then(() => {
              history.replaceState(null, null, '#' + active.$$redirect);
              window.dispatchEvent(new Event('hashchange'));
            })
        }
      }

      for (let e of Object.values(active)) {
        let result = parse(e, pathname, true, [...matches, e]);
        if (result) return result
      }
    }

    let match = derived([routes, pathname], ([$r, $p]) => parse($r, $p) || {});
    derived(match, $ => $.active || {}); // current active route
    derived(match, $ => $.params || {});
    let matches = derived(match, $ => $.matches || []); // parents of active route and itself
    let components = derived(matches, $ => $.map(e => e.$$component).filter(e => e));// components to use in <Router/>

    /* node_modules/svelte-hash-router/src/components/Router.svelte generated by Svelte v3.42.4 */

    function create_fragment$3(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*$$props*/ ctx[2]];
    	var switch_value = /*$components*/ ctx[0][/*i*/ ctx[1]];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const switch_instance_changes = (dirty & /*$$props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*$$props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*$components*/ ctx[0][/*i*/ ctx[1]])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    let level = 0;

    function instance$1($$self, $$props, $$invalidate) {
    	let $components;
    	component_subscribe($$self, components, $$value => $$invalidate(0, $components = $$value));
    	let i = level++;
    	onDestroy(() => level--);

    	$$self.$$set = $$new_props => {
    		$$invalidate(2, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$props = exclude_internal_props($$props);
    	return [$components, i, $$props];
    }

    class Router extends SvelteComponent {
    	constructor(options) {
    		super();
    		init$1(this, options, instance$1, create_fragment$3, safe_not_equal, {});
    	}
    }

    /*
     _       __      _ __    
    | |     / /___ _(_) /____
    | | /| / / __ `/ / / ___/
    | |/ |/ / /_/ / / (__  ) 
    |__/|__/\__,_/_/_/____/  
    The lightweight framework for web-like apps
    (c) Lea Anthony 2019-present
    */

    /* jshint esversion: 6 */


    /**
     * Log the given message with the backend
     *
     * @export
     * @param {string} message
     */
    function Print(message) {
    	window.wails.Log.Print(message);
    }

    /**
     * Log the given trace message with the backend
     *
     * @export
     * @param {string} message
     */
    function Trace(message) {
    	window.wails.Log.Trace(message);
    }

    /**
     * Log the given debug message with the backend
     *
     * @export
     * @param {string} message
     */
    function Debug(message) {
    	window.wails.Log.Debug(message);
    }

    /**
     * Log the given info message with the backend
     *
     * @export
     * @param {string} message
     */
    function Info(message) {
    	window.wails.Log.Info(message);
    }

    /**
     * Log the given warning message with the backend
     *
     * @export
     * @param {string} message
     */
    function Warning(message) {
    	window.wails.Log.Warning(message);
    }

    /**
     * Log the given error message with the backend
     *
     * @export
     * @param {string} message
     */
    function Error$1(message) {
    	window.wails.Log.Error(message);
    }

    /**
     * Log the given fatal message with the backend
     *
     * @param {string} message
     */
    function Fatal(message) {
    	window.wails.Log.Fatal(message);
    }


    /**
     * Sets the Log level to the given log level
     *
     * @param {number} loglevel
     */
    function SetLogLevel(loglevel) {
    	window.wails.Log.SetLogLevel(loglevel);
    }

    // Log levels
    const Level = {
    	TRACE: 1,
    	DEBUG: 2,
    	INFO: 3,
    	WARNING: 4,
    	ERROR: 5,
    };


    var log = {
    	Print: Print,
    	Trace: Trace,
    	Debug: Debug,
    	Info: Info,
    	Warning: Warning,
    	Error: Error$1,
    	Fatal: Fatal,
    	SetLogLevel: SetLogLevel,
    	Level: Level,
    };

    /*
     _       __      _ __    
    | |     / /___ _(_) /____
    | | /| / / __ `/ / / ___/
    | |/ |/ / /_/ / / (__  ) 
    |__/|__/\__,_/_/_/____/  
    The lightweight framework for web-like apps
    (c) Lea Anthony 2019-present
    */
    /* jshint esversion: 6 */

    /**
     * Opens the given URL or Filename in the system browser
     *
     * @export
     * @param {string} target
     * @returns
     */
    function Open$1(target) {
    	return window.wails.Browser.Open(target);
    }

    var browser = /*#__PURE__*/Object.freeze({
        __proto__: null,
        Open: Open$1
    });

    var require$$1 = /*@__PURE__*/getAugmentedNamespace(browser);

    /*
     _       __      _ __    
    | |     / /___ _(_) /____
    | | /| / / __ `/ / / ___/
    | |/ |/ / /_/ / / (__  ) 
    |__/|__/\__,_/_/_/____/  
    The lightweight framework for web-like apps
    (c) Lea Anthony 2019-present
    */

    /* jshint esversion: 6 */

    /**
     * @type {Object} OpenDialog
     * @param {string} [DefaultDirectory=""]           
     * @param {string} [DefaultFilename=""]            
     * @param {string} [Title=""]                      
     * @param {string} [Filters=""]                    
     * @param {boolean} [AllowFiles=false]
     * @param {boolean} [AllowDirectories=false]
     * @param {boolean} [AllowMultiple=false]
     * @param {boolean} [ShowHiddenFiles=false]
     * @param {boolean} [CanCreateDirectories=false]
     * @param {boolean} [ResolvesAliases=false] - Mac Only: Resolves aliases (symlinks)
     * @param {boolean} [TreatPackagesAsDirectories=false] - Mac Only: Show packages (EG Applications) as folders
     */

    /**
     * Opens a dialog using the given parameters, prompting the user to
     * select files/folders.
     *
     * @export
     * @param {OpenDialogOptions} options
     * @returns {Promise<Array<string>>} - List of files/folders selected
     */
    function Open(options) {
    	return window.wails.Dialog.Open(options);
    }

    /**
     * 
     * @type {Object} SaveDialogOptions 
     * @param {string} [DefaultDirectory=""]           
     * @param {string} [DefaultFilename=""]            
     * @param {string} [Title=""]                      
     * @param {string} [Filters=""]                    
     * @param {boolean} [ShowHiddenFiles=false]
     * @param {boolean} [CanCreateDirectories=false]
     * @param {boolean} [TreatPackagesAsDirectories=false]
     */

    /**
     * Opens a dialog using the given parameters, prompting the user to
     * select a single file/folder.
     * 
     * @export
     * @param {SaveDialogOptions} options
     * @returns {Promise<string>} 
     */
    function Save(options) {
    	return window.wails.Dialog.Save(options);
    }

    /**
     *
     * @type {Object} MessageDialogOptions
     * @param {DialogType} [Type=InfoDialog] - The type of the dialog
     * @param {string} [Title=""] - The dialog title
     * @param {string} [Message=""] - The dialog message
     * @param {string[]} [Buttons=[]] - The button titles
     * @param {string} [DefaultButton=""] - The button that should be used as the default button
     * @param {string} [CancelButton=""] - The button that should be used as the cancel button
     * @param {string} [Icon=""] - The name of the icon to use in the dialog
     */

    /**
     * Opens a dialog using the given parameters, to display a message
     * or prompt the user to select an option
     *
     * @export
     * @param {MessageDialogOptions} options
     * @returns {Promise<string>} - The button text that was selected
     */
    function Message(options) {
    	return window.wails.Dialog.Message(options);
    }

    var dialog = /*#__PURE__*/Object.freeze({
        __proto__: null,
        Open: Open,
        Save: Save,
        Message: Message
    });

    var require$$2 = /*@__PURE__*/getAugmentedNamespace(dialog);

    /*
     _       __      _ __    
    | |     / /___ _(_) /____
    | | /| / / __ `/ / / ___/
    | |/ |/ / /_/ / / (__  ) 
    |__/|__/\__,_/_/_/____/  
    The lightweight framework for web-like apps
    (c) Lea Anthony 2019-present
    */

    /* jshint esversion: 6 */


    /**
     * Registers an event listener that will be invoked `maxCallbacks` times before being destroyed
     *
     * @export
     * @param {string} eventName
     * @param {function} callback
     * @param {number} maxCallbacks
     */
    function OnMultiple(eventName, callback, maxCallbacks) {
    	window.wails.Events.OnMultiple(eventName, callback, maxCallbacks);
    }

    /**
     * Registers an event listener that will be invoked every time the event is emitted
     *
     * @export
     * @param {string} eventName
     * @param {function} callback
     */
    function On(eventName, callback) {
    	OnMultiple(eventName, callback);
    }

    /**
     * Registers an event listener that will be invoked once then destroyed
     *
     * @export
     * @param {string} eventName
     * @param {function} callback
     */
    function Once(eventName, callback) {
    	OnMultiple(eventName, callback, 1);
    }


    /**
     * Emit an event with the given name and data
     *
     * @export
     * @param {string} eventName
     */
    function Emit(eventName) {
    	var args = [eventName].slice.call(arguments);
    	return window.wails.Events.Emit.apply(null, args);
    }

    /**
     * Registers listeners for when the system theme changes
     *
     * @export
     * @param {function} callback
     */
    function OnThemeChange$1(callback) {
    	On('wails:system:themechange', callback);
    }

    var events = {
    	OnMultiple: OnMultiple,
    	On: On,
    	Once: Once,
    	Emit: Emit,
    	OnThemeChange: OnThemeChange$1,
    };

    var bridge$1 = {exports: {}};

    (function (module, exports) {
    (function (global, factory) {
        factory(exports) ;
    }(commonjsGlobal, (function (exports) {
        function noop() { }
        const identity = x => x;
        function run(fn) {
            return fn();
        }
        function blank_object() {
            return Object.create(null);
        }
        function run_all(fns) {
            fns.forEach(run);
        }
        function is_function(thing) {
            return typeof thing === 'function';
        }
        function safe_not_equal(a, b) {
            return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
        }
        function is_empty(obj) {
            return Object.keys(obj).length === 0;
        }
        function subscribe(store, ...callbacks) {
            if (store == null) {
                return noop;
            }
            const unsub = store.subscribe(...callbacks);
            return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
        }
        function component_subscribe(component, store, callback) {
            component.$$.on_destroy.push(subscribe(store, callback));
        }
        function action_destroyer(action_result) {
            return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
        }

        const is_client = typeof window !== 'undefined';
        let now = is_client
            ? () => window.performance.now()
            : () => Date.now();
        let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

        const tasks = new Set();
        function run_tasks(now) {
            tasks.forEach(task => {
                if (!task.c(now)) {
                    tasks.delete(task);
                    task.f();
                }
            });
            if (tasks.size !== 0)
                raf(run_tasks);
        }
        /**
         * Creates a new task that runs on each raf frame
         * until it returns a falsy value or is aborted
         */
        function loop(callback) {
            let task;
            if (tasks.size === 0)
                raf(run_tasks);
            return {
                promise: new Promise(fulfill => {
                    tasks.add(task = { c: callback, f: fulfill });
                }),
                abort() {
                    tasks.delete(task);
                }
            };
        }

        function append(target, node) {
            target.appendChild(node);
        }
        function insert(target, node, anchor) {
            target.insertBefore(node, anchor || null);
        }
        function detach(node) {
            node.parentNode.removeChild(node);
        }
        function destroy_each(iterations, detaching) {
            for (let i = 0; i < iterations.length; i += 1) {
                if (iterations[i])
                    iterations[i].d(detaching);
            }
        }
        function element(name) {
            return document.createElement(name);
        }
        function text(data) {
            return document.createTextNode(data);
        }
        function space() {
            return text(' ');
        }
        function empty() {
            return text('');
        }
        function listen(node, event, handler, options) {
            node.addEventListener(event, handler, options);
            return () => node.removeEventListener(event, handler, options);
        }
        function attr(node, attribute, value) {
            if (value == null)
                node.removeAttribute(attribute);
            else if (node.getAttribute(attribute) !== value)
                node.setAttribute(attribute, value);
        }
        function children(element) {
            return Array.from(element.childNodes);
        }
        function set_data(text, data) {
            data = '' + data;
            if (text.wholeText !== data)
                text.data = data;
        }
        function custom_event(type, detail) {
            const e = document.createEvent('CustomEvent');
            e.initCustomEvent(type, false, false, detail);
            return e;
        }

        const active_docs = new Set();
        let active = 0;
        // https://github.com/darkskyapp/string-hash/blob/master/index.js
        function hash(str) {
            let hash = 5381;
            let i = str.length;
            while (i--)
                hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
            return hash >>> 0;
        }
        function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
            const step = 16.666 / duration;
            let keyframes = '{\n';
            for (let p = 0; p <= 1; p += step) {
                const t = a + (b - a) * ease(p);
                keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
            }
            const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
            const name = `__svelte_${hash(rule)}_${uid}`;
            const doc = node.ownerDocument;
            active_docs.add(doc);
            const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
            const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
            if (!current_rules[name]) {
                current_rules[name] = true;
                stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
            }
            const animation = node.style.animation || '';
            node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
            active += 1;
            return name;
        }
        function delete_rule(node, name) {
            const previous = (node.style.animation || '').split(', ');
            const next = previous.filter(name
                ? anim => anim.indexOf(name) < 0 // remove specific animation
                : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
            );
            const deleted = previous.length - next.length;
            if (deleted) {
                node.style.animation = next.join(', ');
                active -= deleted;
                if (!active)
                    clear_rules();
            }
        }
        function clear_rules() {
            raf(() => {
                if (active)
                    return;
                active_docs.forEach(doc => {
                    const stylesheet = doc.__svelte_stylesheet;
                    let i = stylesheet.cssRules.length;
                    while (i--)
                        stylesheet.deleteRule(i);
                    doc.__svelte_rules = {};
                });
                active_docs.clear();
            });
        }

        let current_component;
        function set_current_component(component) {
            current_component = component;
        }
        function get_current_component() {
            if (!current_component)
                throw new Error('Function called outside component initialization');
            return current_component;
        }
        function onMount(fn) {
            get_current_component().$$.on_mount.push(fn);
        }

        const dirty_components = [];
        const binding_callbacks = [];
        const render_callbacks = [];
        const flush_callbacks = [];
        const resolved_promise = Promise.resolve();
        let update_scheduled = false;
        function schedule_update() {
            if (!update_scheduled) {
                update_scheduled = true;
                resolved_promise.then(flush);
            }
        }
        function add_render_callback(fn) {
            render_callbacks.push(fn);
        }
        let flushing = false;
        const seen_callbacks = new Set();
        function flush() {
            if (flushing)
                return;
            flushing = true;
            do {
                // first, call beforeUpdate functions
                // and update components
                for (let i = 0; i < dirty_components.length; i += 1) {
                    const component = dirty_components[i];
                    set_current_component(component);
                    update(component.$$);
                }
                set_current_component(null);
                dirty_components.length = 0;
                while (binding_callbacks.length)
                    binding_callbacks.pop()();
                // then, once components are updated, call
                // afterUpdate functions. This may cause
                // subsequent updates...
                for (let i = 0; i < render_callbacks.length; i += 1) {
                    const callback = render_callbacks[i];
                    if (!seen_callbacks.has(callback)) {
                        // ...so guard against infinite loops
                        seen_callbacks.add(callback);
                        callback();
                    }
                }
                render_callbacks.length = 0;
            } while (dirty_components.length);
            while (flush_callbacks.length) {
                flush_callbacks.pop()();
            }
            update_scheduled = false;
            flushing = false;
            seen_callbacks.clear();
        }
        function update($$) {
            if ($$.fragment !== null) {
                $$.update();
                run_all($$.before_update);
                const dirty = $$.dirty;
                $$.dirty = [-1];
                $$.fragment && $$.fragment.p($$.ctx, dirty);
                $$.after_update.forEach(add_render_callback);
            }
        }

        let promise;
        function wait() {
            if (!promise) {
                promise = Promise.resolve();
                promise.then(() => {
                    promise = null;
                });
            }
            return promise;
        }
        function dispatch(node, direction, kind) {
            node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
        }
        const outroing = new Set();
        let outros;
        function group_outros() {
            outros = {
                r: 0,
                c: [],
                p: outros // parent group
            };
        }
        function check_outros() {
            if (!outros.r) {
                run_all(outros.c);
            }
            outros = outros.p;
        }
        function transition_in(block, local) {
            if (block && block.i) {
                outroing.delete(block);
                block.i(local);
            }
        }
        function transition_out(block, local, detach, callback) {
            if (block && block.o) {
                if (outroing.has(block))
                    return;
                outroing.add(block);
                outros.c.push(() => {
                    outroing.delete(block);
                    if (callback) {
                        if (detach)
                            block.d(1);
                        callback();
                    }
                });
                block.o(local);
            }
        }
        const null_transition = { duration: 0 };
        function create_bidirectional_transition(node, fn, params, intro) {
            let config = fn(node, params);
            let t = intro ? 0 : 1;
            let running_program = null;
            let pending_program = null;
            let animation_name = null;
            function clear_animation() {
                if (animation_name)
                    delete_rule(node, animation_name);
            }
            function init(program, duration) {
                const d = program.b - t;
                duration *= Math.abs(d);
                return {
                    a: t,
                    b: program.b,
                    d,
                    duration,
                    start: program.start,
                    end: program.start + duration,
                    group: program.group
                };
            }
            function go(b) {
                const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
                const program = {
                    start: now() + delay,
                    b
                };
                if (!b) {
                    // @ts-ignore todo: improve typings
                    program.group = outros;
                    outros.r += 1;
                }
                if (running_program || pending_program) {
                    pending_program = program;
                }
                else {
                    // if this is an intro, and there's a delay, we need to do
                    // an initial tick and/or apply CSS animation immediately
                    if (css) {
                        clear_animation();
                        animation_name = create_rule(node, t, b, duration, delay, easing, css);
                    }
                    if (b)
                        tick(0, 1);
                    running_program = init(program, duration);
                    add_render_callback(() => dispatch(node, b, 'start'));
                    loop(now => {
                        if (pending_program && now > pending_program.start) {
                            running_program = init(pending_program, duration);
                            pending_program = null;
                            dispatch(node, running_program.b, 'start');
                            if (css) {
                                clear_animation();
                                animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                            }
                        }
                        if (running_program) {
                            if (now >= running_program.end) {
                                tick(t = running_program.b, 1 - t);
                                dispatch(node, running_program.b, 'end');
                                if (!pending_program) {
                                    // we're done
                                    if (running_program.b) {
                                        // intro — we can tidy up immediately
                                        clear_animation();
                                    }
                                    else {
                                        // outro — needs to be coordinated
                                        if (!--running_program.group.r)
                                            run_all(running_program.group.c);
                                    }
                                }
                                running_program = null;
                            }
                            else if (now >= running_program.start) {
                                const p = now - running_program.start;
                                t = running_program.a + running_program.d * easing(p / running_program.duration);
                                tick(t, 1 - t);
                            }
                        }
                        return !!(running_program || pending_program);
                    });
                }
            }
            return {
                run(b) {
                    if (is_function(config)) {
                        wait().then(() => {
                            // @ts-ignore
                            config = config();
                            go(b);
                        });
                    }
                    else {
                        go(b);
                    }
                },
                end() {
                    clear_animation();
                    running_program = pending_program = null;
                }
            };
        }

        const globals = (typeof window !== 'undefined'
            ? window
            : typeof globalThis !== 'undefined'
                ? globalThis
                : commonjsGlobal);
        function create_component(block) {
            block && block.c();
        }
        function mount_component(component, target, anchor) {
            const { fragment, on_mount, on_destroy, after_update } = component.$$;
            fragment && fragment.m(target, anchor);
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
            after_update.forEach(add_render_callback);
        }
        function destroy_component(component, detaching) {
            const $$ = component.$$;
            if ($$.fragment !== null) {
                run_all($$.on_destroy);
                $$.fragment && $$.fragment.d(detaching);
                // TODO null out other refs, including component.$$ (but need to
                // preserve final state?)
                $$.on_destroy = $$.fragment = null;
                $$.ctx = [];
            }
        }
        function make_dirty(component, i) {
            if (component.$$.dirty[0] === -1) {
                dirty_components.push(component);
                schedule_update();
                component.$$.dirty.fill(0);
            }
            component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
        }
        function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
            const parent_component = current_component;
            set_current_component(component);
            const $$ = component.$$ = {
                fragment: null,
                ctx: null,
                // state
                props,
                update: noop,
                not_equal,
                bound: blank_object(),
                // lifecycle
                on_mount: [],
                on_destroy: [],
                before_update: [],
                after_update: [],
                context: new Map(parent_component ? parent_component.$$.context : []),
                // everything else
                callbacks: blank_object(),
                dirty,
                skip_bound: false
            };
            let ready = false;
            $$.ctx = instance
                ? instance(component, options.props || {}, (i, ret, ...rest) => {
                    const value = rest.length ? rest[0] : ret;
                    if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                        if (!$$.skip_bound && $$.bound[i])
                            $$.bound[i](value);
                        if (ready)
                            make_dirty(component, i);
                    }
                    return ret;
                })
                : [];
            $$.update();
            ready = true;
            run_all($$.before_update);
            // `false` as a special case of no DOM component
            $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
            if (options.target) {
                if (options.hydrate) {
                    const nodes = children(options.target);
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    $$.fragment && $$.fragment.l(nodes);
                    nodes.forEach(detach);
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    $$.fragment && $$.fragment.c();
                }
                if (options.intro)
                    transition_in(component.$$.fragment);
                mount_component(component, options.target, options.anchor);
                flush();
            }
            set_current_component(parent_component);
        }
        /**
         * Base class for Svelte components. Used when dev=false.
         */
        class SvelteComponent {
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set($$props) {
                if (this.$$set && !is_empty($$props)) {
                    this.$$.skip_bound = true;
                    this.$$set($$props);
                    this.$$.skip_bound = false;
                }
            }
        }

        const subscriber_queue = [];
        /**
         * Create a `Writable` store that allows both updating and reading by subscription.
         * @param {*=}value initial value
         * @param {StartStopNotifier=}start start and stop notifications for subscriptions
         */
        function writable(value, start = noop) {
            let stop;
            const subscribers = [];
            function set(new_value) {
                if (safe_not_equal(value, new_value)) {
                    value = new_value;
                    if (stop) { // store is ready
                        const run_queue = !subscriber_queue.length;
                        for (let i = 0; i < subscribers.length; i += 1) {
                            const s = subscribers[i];
                            s[1]();
                            subscriber_queue.push(s, value);
                        }
                        if (run_queue) {
                            for (let i = 0; i < subscriber_queue.length; i += 2) {
                                subscriber_queue[i][0](subscriber_queue[i + 1]);
                            }
                            subscriber_queue.length = 0;
                        }
                    }
                }
            }
            function update(fn) {
                set(fn(value));
            }
            function subscribe(run, invalidate = noop) {
                const subscriber = [run, invalidate];
                subscribers.push(subscriber);
                if (subscribers.length === 1) {
                    stop = start(set) || noop;
                }
                run(value);
                return () => {
                    const index = subscribers.indexOf(subscriber);
                    if (index !== -1) {
                        subscribers.splice(index, 1);
                    }
                    if (subscribers.length === 0) {
                        stop();
                        stop = null;
                    }
                };
            }
            return { set, update, subscribe };
        }

        function log(message) {
            // eslint-disable-next-line
            console.log(
                '%c wails bridge %c ' + message + ' ',
                'background: #aa0000; color: #fff; border-radius: 3px 0px 0px 3px; padding: 1px; font-size: 0.7rem',
                'background: #009900; color: #fff; border-radius: 0px 3px 3px 0px; padding: 1px; font-size: 0.7rem'
            );
        }

        /** Overlay */
        const overlayVisible = writable(false);

        function showOverlay() {
            overlayVisible.set(true);
        }
        function hideOverlay() {
            overlayVisible.set(false);
        }

        /** Menubar **/
        const menuVisible = writable(false);

        /** Trays **/

        const trays = writable([]);
        function setTray(tray) {
            trays.update((current) => {
                // Remove existing if it exists, else add
                const index = current.findIndex(item => item.ID === tray.ID);
                if ( index === -1 ) {
                    current.push(tray);
                } else {
                    current[index] = tray;
                }
                return current;
            });
        }
        function updateTrayLabel(tray) {
            trays.update((current) => {
                // Remove existing if it exists, else add
                const index = current.findIndex(item => item.ID === tray.ID);
                if ( index === -1 ) {
                    return log("ERROR: Attempted to update tray index ", tray.ID)
                }
                current[index].Label = tray.Label;
                return current;
            });
        }

        function deleteTrayMenu(id) {
            trays.update((current) => {
                // Remove existing if it exists, else add
                const index = current.findIndex(item => item.ID === id);
                if ( index === -1 ) {
                    return log("ERROR: Attempted to delete tray index ")
                }
                current.splice(index, 1);
                return current;
            });
        }

        let selectedMenu = writable(null);

        function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
            const o = +getComputedStyle(node).opacity;
            return {
                delay,
                duration,
                easing,
                css: t => `opacity: ${t * o}`
            };
        }

        /* Overlay.svelte generated by Svelte v3.32.2 */

        function add_css() {
        	var style = element("style");
        	style.id = "svelte-1m56lfo-style";
        	style.textContent = ".wails-reconnect-overlay.svelte-1m56lfo{position:fixed;top:0;left:0;width:100%;height:100%;backdrop-filter:blur(20px) saturate(160%) contrast(45%) brightness(140%);z-index:999999\n    }.wails-reconnect-overlay-content.svelte-1m56lfo{position:relative;top:50%;transform:translateY(-50%);margin:0;background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEsAAAA7CAMAAAAEsocZAAAC91BMVEUAAACzQ0PjMjLkMjLZLS7XLS+vJCjkMjKlEx6uGyHjMDGiFx7GJyrAISjUKy3mMzPlMjLjMzOsGyDKJirkMjK6HyXmMjLgMDC6IiLcMjLULC3MJyrRKSy+IibmMzPmMjK7ISXlMjLIJimzHSLkMjKtGiHZLC7BIifgMDCpGSDFIivcLy+yHSKoGR+eFBzNKCvlMjKxHSPkMTKxHSLmMjLKJyq5ICXDJCe6ISXdLzDkMjLmMzPFJSm2HyTlMTLhMDGyHSKUEBmhFx24HyTCJCjHJijjMzOiFh7mMjJ6BhDaLDCuGyOKABjnMzPGJinJJiquHCGEChSmGB/pMzOiFh7VKy3OKCu1HiSvHCLjMTLMKCrBIyeICxWxHCLDIyjSKizBIyh+CBO9ISa6ISWDChS9Iie1HyXVLC7FJSrLKCrlMjLiMTGPDhicFRywGyKXFBuhFx1/BxO7IiXkMTGeFBx8BxLkMTGnGR/GJCi4ICWsGyGJDxXSLS2yGiHSKi3CJCfnMzPQKiyECRTKJiq6ISWUERq/Iye0HiPDJCjGJSm6ICaPDxiTEBrdLy+3HyXSKiy0HyOQEBi4ICWhFh1+CBO9IieODhfSKyzWLC2LDhh8BxHKKCq7ISWaFBzkMzPqNDTTLC3EJSiHDBacExyvGyO1HyTPKCy+IieoGSC7ISaVEhrMKCvQKyusGyG0HiKACBPIJSq/JCaABxR5BRLEJCnkMzPJJinEJimPDRZ2BRKqHx/jMjLnMzPgMDHULC3NKSvQKSzsNDTWLS7SKyy3HyTKJyrDJSjbLzDYLC6mGB/GJSnVLC61HiPLKCrHJSm/Iye8Iia6ICWzHSKxHCLaLi/PKSupGR+7ICXpMzPbLi/IJinJJSmsGyGrGiCkFx6PDheJCxaFChXBIyfAIieSDxmBCBPlMjLeLzDdLzC5HySMDRe+ISWvGyGcFBzSKSzPJyvMJyrEJCjDIyefFRyWERriMDHUKiy/ISaZExv0NjbwNTXuNDTrMzMI0c+yAAAAu3RSTlMAA8HR/gwGgAj+MEpGCsC+hGpjQjYnIxgWBfzx7urizMrFqqB1bF83KhsR/fz8+/r5+fXv7unZ1tC+t6mmopqKdW1nYVpVRjUeHhIQBPr59/b28/Hx8ODg3NvUw8O/vKeim5aNioiDgn1vZWNjX1xUU1JPTUVFPT08Mi4qJyIh/Pv7+/n4+Pf39fT08/Du7efn5uXj4uHa19XNwsG/vrq2tbSuramlnpyYkpGNiIZ+enRraGVjVVBKOzghdjzRsAAABJVJREFUWMPtllVQG1EYhTc0ASpoobS0FCulUHd3oUjd3d3d3d3d3d2b7CYhnkBCCHGDEIK7Vh56d0NpOgwkYfLQzvA9ZrLfnPvfc+8uVEst/yheBJup3Nya2MjU6pa/jWLZtxjXpZFtVB4uVNI6m5gIruNkVFebqIb5Ug2ym4TIEM/gtUOGbg613oBzjAzZFrZ+lXu/3TIiMXXS5M6HTvrNHeLpZLEh6suGNW9fzZ9zd/qVi2eOHygqi5cDE5GUrJocONgzyqo0UXNSUlKSEhMztFqtXq9vNxImAmS3g7Y6QlbjdBWVGW36jt4wDGTUXjUsafh5zJWRkdFuZGtWGnCRmg+HasiGMUClTTzW0ZuVgLlGDIPM4Lhi0IrVq+tv2hS21fNrSONQgpM9DsJ4t3fM9PkvJuKj2ZjrZwvILKvaSTgciUSirjt6dOfOpyd169bDb9rMOwF9Hj4OD100gY0YXYb299bjzMrqj9doNByJWlVXFB9DT5dmJuvy+cq83JyuS6ayEYSHulKL8dmFnBkrCeZlHKMrC5XRhXGCZB2Ty1fkleRQaMCFT2DBsEafzRFJu7/2MicbKynPhQUDLiZwMWLJZKNLzoLbJBYVcurSmbmn+rcyJ8vCMgmlmaW6gnwun/+3C96VpAUuET1ZgRR36r2xWlnYSnf3oKABA14uXDDvydxHs6cpTV1p3hlJ2rJCiUjIZCByItXg8sHJijuvT64CuMTABUYvb6NN1Jdp1PH7D7f3bo2eS5KvW4RJr7atWT5w4MBBg9zdBw9+37BS7QIoFS5WnIaj12dr1DEXFgdvr4fh4eFl+u/wz8uf3jjHic8s4DL2Dal0IANyUBeCRCcwOBJV26JsjSpGwHVuSai69jvqD+jr56OgtKy0zAAK5mLTVBKVKL5tNthGAR9JneJQ/bFsHNzy+U7IlCYROxtMpIjR0ceoQVnowracLLpAQWETqV361bPoFo3cEbz2zYLZM7t3HWXcxmiBOgttS1ycWkTXMWh4mGigdug9DFdttqCFgTN6nD0q1XEVSoCxEjyFCi2eNC6Z69MRVIImJ6JQSf5gcFVCuF+aDhCa1F6MJFDaiNBQAh2TMfWBjhmLsAxUjG/fmjs0qjJck8D0GPBcuUuZW1LS/tIsPzqmQt17PvZQknlwnf4tHDBc+7t5VV3QQCkdc+Ur8/hdrz0but0RCumWiYbiKmLJ7EVbRomj4Q7+y5wsaXvfTGFpQcHB7n2WbG4MGdniw2Tm8xl5Yhr7MrSYHQ3uampz10aWyHyuzxvqaW/6W4MjXAUD3QV2aw97ZxhGjxCohYf5TpTHMXU1BbsAuoFnkRygVieIGAbqiF7rrH4rfWpKJouBCtyHJF8ctEyGubBa+C6NsMYEUonJFITHZqWBxXUA12Dv76Tf/PgOBmeNiiLG1pcKo1HAq8jLpY4JU1yWEixVNaOgoRJAKBSZHTZTU+wJOMtUDZvlVITC6FTlksyrEBoPHXpxxbzdaqzigUtVDkJVIOtVQ9UEOR4VGUh/kHWq0edJ6CxnZ+eePXva2bnY/cF/I1RLLf8vvwDANdMSMegxcAAAAABJRU5ErkJggg==);background-repeat:no-repeat;background-position:center\n    }.wails-reconnect-overlay-loadingspinner.svelte-1m56lfo{pointer-events:none;width:2.5em;height:2.5em;border:.4em solid transparent;border-color:#f00 #eee0 #f00 #eee0;border-radius:50%;animation:svelte-1m56lfo-loadingspin 1s linear infinite;margin:auto;padding:2.5em\n    }@keyframes svelte-1m56lfo-loadingspin{100%{transform:rotate(360deg)}}";
        	append(document.head, style);
        }

        // (8:0) {#if $overlayVisible }
        function create_if_block(ctx) {
        	let div2;
        	let div2_transition;
        	let current;

        	return {
        		c() {
        			div2 = element("div");
        			div2.innerHTML = `<div class="wails-reconnect-overlay-content svelte-1m56lfo"><div class="wails-reconnect-overlay-loadingspinner svelte-1m56lfo"></div></div>`;
        			attr(div2, "class", "wails-reconnect-overlay svelte-1m56lfo");
        		},
        		m(target, anchor) {
        			insert(target, div2, anchor);
        			current = true;
        		},
        		i(local) {
        			if (current) return;

        			add_render_callback(() => {
        				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 200 }, true);
        				div2_transition.run(1);
        			});

        			current = true;
        		},
        		o(local) {
        			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 200 }, false);
        			div2_transition.run(0);
        			current = false;
        		},
        		d(detaching) {
        			if (detaching) detach(div2);
        			if (detaching && div2_transition) div2_transition.end();
        		}
        	};
        }

        function create_fragment(ctx) {
        	let if_block_anchor;
        	let current;
        	let if_block = /*$overlayVisible*/ ctx[0] && create_if_block();

        	return {
        		c() {
        			if (if_block) if_block.c();
        			if_block_anchor = empty();
        		},
        		m(target, anchor) {
        			if (if_block) if_block.m(target, anchor);
        			insert(target, if_block_anchor, anchor);
        			current = true;
        		},
        		p(ctx, [dirty]) {
        			if (/*$overlayVisible*/ ctx[0]) {
        				if (if_block) {
        					if (dirty & /*$overlayVisible*/ 1) {
        						transition_in(if_block, 1);
        					}
        				} else {
        					if_block = create_if_block();
        					if_block.c();
        					transition_in(if_block, 1);
        					if_block.m(if_block_anchor.parentNode, if_block_anchor);
        				}
        			} else if (if_block) {
        				group_outros();

        				transition_out(if_block, 1, 1, () => {
        					if_block = null;
        				});

        				check_outros();
        			}
        		},
        		i(local) {
        			if (current) return;
        			transition_in(if_block);
        			current = true;
        		},
        		o(local) {
        			transition_out(if_block);
        			current = false;
        		},
        		d(detaching) {
        			if (if_block) if_block.d(detaching);
        			if (detaching) detach(if_block_anchor);
        		}
        	};
        }

        function instance($$self, $$props, $$invalidate) {
        	let $overlayVisible;
        	component_subscribe($$self, overlayVisible, $$value => $$invalidate(0, $overlayVisible = $$value));
        	return [$overlayVisible];
        }

        class Overlay extends SvelteComponent {
        	constructor(options) {
        		super();
        		if (!document.getElementById("svelte-1m56lfo-style")) add_css();
        		init(this, options, instance, create_fragment, safe_not_equal, {});
        	}
        }

        /* Menu.svelte generated by Svelte v3.32.2 */

        function add_css$1() {
        	var style = element("style");
        	style.id = "svelte-1oysp7o-style";
        	style.textContent = ".menu.svelte-1oysp7o.svelte-1oysp7o{padding:3px;background-color:#0008;color:#EEF;border-radius:5px;margin-top:5px;position:absolute;backdrop-filter:blur(3px) saturate(160%) contrast(45%) brightness(140%);border:1px solid rgb(88,88,88);box-shadow:0 0 1px rgb(146,146,148) inset}.menuitem.svelte-1oysp7o.svelte-1oysp7o{display:flex;align-items:center;padding:1px 5px}.menuitem.svelte-1oysp7o.svelte-1oysp7o:hover{display:flex;align-items:center;background-color:rgb(57,131,223);padding:1px 5px;border-radius:5px}.menuitem.svelte-1oysp7o img.svelte-1oysp7o{padding-right:5px}";
        	append(document.head, style);
        }

        function get_each_context(ctx, list, i) {
        	const child_ctx = ctx.slice();
        	child_ctx[2] = list[i];
        	return child_ctx;
        }

        // (8:0) {#if !hidden}
        function create_if_block$1(ctx) {
        	let div;
        	let if_block = /*menu*/ ctx[0].Menu && create_if_block_1(ctx);

        	return {
        		c() {
        			div = element("div");
        			if (if_block) if_block.c();
        			attr(div, "class", "menu svelte-1oysp7o");
        		},
        		m(target, anchor) {
        			insert(target, div, anchor);
        			if (if_block) if_block.m(div, null);
        		},
        		p(ctx, dirty) {
        			if (/*menu*/ ctx[0].Menu) {
        				if (if_block) {
        					if_block.p(ctx, dirty);
        				} else {
        					if_block = create_if_block_1(ctx);
        					if_block.c();
        					if_block.m(div, null);
        				}
        			} else if (if_block) {
        				if_block.d(1);
        				if_block = null;
        			}
        		},
        		d(detaching) {
        			if (detaching) detach(div);
        			if (if_block) if_block.d();
        		}
        	};
        }

        // (10:4) {#if menu.Menu }
        function create_if_block_1(ctx) {
        	let each_1_anchor;
        	let each_value = /*menu*/ ctx[0].Menu.Items;
        	let each_blocks = [];

        	for (let i = 0; i < each_value.length; i += 1) {
        		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
        	}

        	return {
        		c() {
        			for (let i = 0; i < each_blocks.length; i += 1) {
        				each_blocks[i].c();
        			}

        			each_1_anchor = empty();
        		},
        		m(target, anchor) {
        			for (let i = 0; i < each_blocks.length; i += 1) {
        				each_blocks[i].m(target, anchor);
        			}

        			insert(target, each_1_anchor, anchor);
        		},
        		p(ctx, dirty) {
        			if (dirty & /*menu*/ 1) {
        				each_value = /*menu*/ ctx[0].Menu.Items;
        				let i;

        				for (i = 0; i < each_value.length; i += 1) {
        					const child_ctx = get_each_context(ctx, each_value, i);

        					if (each_blocks[i]) {
        						each_blocks[i].p(child_ctx, dirty);
        					} else {
        						each_blocks[i] = create_each_block(child_ctx);
        						each_blocks[i].c();
        						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
        					}
        				}

        				for (; i < each_blocks.length; i += 1) {
        					each_blocks[i].d(1);
        				}

        				each_blocks.length = each_value.length;
        			}
        		},
        		d(detaching) {
        			destroy_each(each_blocks, detaching);
        			if (detaching) detach(each_1_anchor);
        		}
        	};
        }

        // (13:12) {#if menuItem.Image }
        function create_if_block_2(ctx) {
        	let div;
        	let img;
        	let img_src_value;

        	return {
        		c() {
        			div = element("div");
        			img = element("img");
        			attr(img, "alt", "");
        			if (img.src !== (img_src_value = "data:image/png;base64," + /*menuItem*/ ctx[2].Image)) attr(img, "src", img_src_value);
        			attr(img, "class", "svelte-1oysp7o");
        		},
        		m(target, anchor) {
        			insert(target, div, anchor);
        			append(div, img);
        		},
        		p(ctx, dirty) {
        			if (dirty & /*menu*/ 1 && img.src !== (img_src_value = "data:image/png;base64," + /*menuItem*/ ctx[2].Image)) {
        				attr(img, "src", img_src_value);
        			}
        		},
        		d(detaching) {
        			if (detaching) detach(div);
        		}
        	};
        }

        // (11:8) {#each menu.Menu.Items as menuItem}
        function create_each_block(ctx) {
        	let div1;
        	let t0;
        	let div0;
        	let t1_value = /*menuItem*/ ctx[2].Label + "";
        	let t1;
        	let t2;
        	let if_block = /*menuItem*/ ctx[2].Image && create_if_block_2(ctx);

        	return {
        		c() {
        			div1 = element("div");
        			if (if_block) if_block.c();
        			t0 = space();
        			div0 = element("div");
        			t1 = text(t1_value);
        			t2 = space();
        			attr(div0, "class", "menulabel");
        			attr(div1, "class", "menuitem svelte-1oysp7o");
        		},
        		m(target, anchor) {
        			insert(target, div1, anchor);
        			if (if_block) if_block.m(div1, null);
        			append(div1, t0);
        			append(div1, div0);
        			append(div0, t1);
        			append(div1, t2);
        		},
        		p(ctx, dirty) {
        			if (/*menuItem*/ ctx[2].Image) {
        				if (if_block) {
        					if_block.p(ctx, dirty);
        				} else {
        					if_block = create_if_block_2(ctx);
        					if_block.c();
        					if_block.m(div1, t0);
        				}
        			} else if (if_block) {
        				if_block.d(1);
        				if_block = null;
        			}

        			if (dirty & /*menu*/ 1 && t1_value !== (t1_value = /*menuItem*/ ctx[2].Label + "")) set_data(t1, t1_value);
        		},
        		d(detaching) {
        			if (detaching) detach(div1);
        			if (if_block) if_block.d();
        		}
        	};
        }

        function create_fragment$1(ctx) {
        	let if_block_anchor;
        	let if_block = !/*hidden*/ ctx[1] && create_if_block$1(ctx);

        	return {
        		c() {
        			if (if_block) if_block.c();
        			if_block_anchor = empty();
        		},
        		m(target, anchor) {
        			if (if_block) if_block.m(target, anchor);
        			insert(target, if_block_anchor, anchor);
        		},
        		p(ctx, [dirty]) {
        			if (!/*hidden*/ ctx[1]) {
        				if (if_block) {
        					if_block.p(ctx, dirty);
        				} else {
        					if_block = create_if_block$1(ctx);
        					if_block.c();
        					if_block.m(if_block_anchor.parentNode, if_block_anchor);
        				}
        			} else if (if_block) {
        				if_block.d(1);
        				if_block = null;
        			}
        		},
        		i: noop,
        		o: noop,
        		d(detaching) {
        			if (if_block) if_block.d(detaching);
        			if (detaching) detach(if_block_anchor);
        		}
        	};
        }

        function instance$1($$self, $$props, $$invalidate) {
        	let { menu } = $$props;
        	let { hidden = true } = $$props;

        	$$self.$$set = $$props => {
        		if ("menu" in $$props) $$invalidate(0, menu = $$props.menu);
        		if ("hidden" in $$props) $$invalidate(1, hidden = $$props.hidden);
        	};

        	return [menu, hidden];
        }

        class Menu extends SvelteComponent {
        	constructor(options) {
        		super();
        		if (!document.getElementById("svelte-1oysp7o-style")) add_css$1();
        		init(this, options, instance$1, create_fragment$1, safe_not_equal, { menu: 0, hidden: 1 });
        	}
        }

        /* TrayMenu.svelte generated by Svelte v3.32.2 */

        const { document: document_1 } = globals;

        function add_css$2() {
        	var style = element("style");
        	style.id = "svelte-esze1k-style";
        	style.textContent = ".tray-menu.svelte-esze1k{padding-left:0.5rem;padding-right:0.5rem;overflow:visible;font-size:14px}.label.svelte-esze1k{text-align:right;padding-right:10px}";
        	append(document_1.head, style);
        }

        // (47:4) {#if tray.ProcessedMenu }
        function create_if_block$2(ctx) {
        	let menu;
        	let current;

        	menu = new Menu({
        			props: {
        				menu: /*tray*/ ctx[0].ProcessedMenu,
        				hidden: /*hidden*/ ctx[1]
        			}
        		});

        	return {
        		c() {
        			create_component(menu.$$.fragment);
        		},
        		m(target, anchor) {
        			mount_component(menu, target, anchor);
        			current = true;
        		},
        		p(ctx, dirty) {
        			const menu_changes = {};
        			if (dirty & /*tray*/ 1) menu_changes.menu = /*tray*/ ctx[0].ProcessedMenu;
        			if (dirty & /*hidden*/ 2) menu_changes.hidden = /*hidden*/ ctx[1];
        			menu.$set(menu_changes);
        		},
        		i(local) {
        			if (current) return;
        			transition_in(menu.$$.fragment, local);
        			current = true;
        		},
        		o(local) {
        			transition_out(menu.$$.fragment, local);
        			current = false;
        		},
        		d(detaching) {
        			destroy_component(menu, detaching);
        		}
        	};
        }

        function create_fragment$2(ctx) {
        	let span1;
        	let span0;
        	let t0_value = /*tray*/ ctx[0].Label + "";
        	let t0;
        	let t1;
        	let current;
        	let mounted;
        	let dispose;
        	let if_block = /*tray*/ ctx[0].ProcessedMenu && create_if_block$2(ctx);

        	return {
        		c() {
        			span1 = element("span");
        			span0 = element("span");
        			t0 = text(t0_value);
        			t1 = space();
        			if (if_block) if_block.c();
        			attr(span0, "class", "label svelte-esze1k");
        			attr(span1, "class", "tray-menu svelte-esze1k");
        		},
        		m(target, anchor) {
        			insert(target, span1, anchor);
        			append(span1, span0);
        			append(span0, t0);
        			append(span1, t1);
        			if (if_block) if_block.m(span1, null);
        			current = true;

        			if (!mounted) {
        				dispose = [
        					listen(span0, "click", /*trayClicked*/ ctx[3]),
        					action_destroyer(clickOutside.call(null, span1)),
        					listen(span1, "click_outside", /*closeMenu*/ ctx[2])
        				];

        				mounted = true;
        			}
        		},
        		p(ctx, [dirty]) {
        			if ((!current || dirty & /*tray*/ 1) && t0_value !== (t0_value = /*tray*/ ctx[0].Label + "")) set_data(t0, t0_value);

        			if (/*tray*/ ctx[0].ProcessedMenu) {
        				if (if_block) {
        					if_block.p(ctx, dirty);

        					if (dirty & /*tray*/ 1) {
        						transition_in(if_block, 1);
        					}
        				} else {
        					if_block = create_if_block$2(ctx);
        					if_block.c();
        					transition_in(if_block, 1);
        					if_block.m(span1, null);
        				}
        			} else if (if_block) {
        				group_outros();

        				transition_out(if_block, 1, 1, () => {
        					if_block = null;
        				});

        				check_outros();
        			}
        		},
        		i(local) {
        			if (current) return;
        			transition_in(if_block);
        			current = true;
        		},
        		o(local) {
        			transition_out(if_block);
        			current = false;
        		},
        		d(detaching) {
        			if (detaching) detach(span1);
        			if (if_block) if_block.d();
        			mounted = false;
        			run_all(dispose);
        		}
        	};
        }

        function clickOutside(node) {
        	const handleClick = event => {
        		if (node && !node.contains(event.target) && !event.defaultPrevented) {
        			node.dispatchEvent(new CustomEvent("click_outside", node));
        		}
        	};

        	document.addEventListener("click", handleClick, true);

        	return {
        		destroy() {
        			document.removeEventListener("click", handleClick, true);
        		}
        	};
        }

        function instance$2($$self, $$props, $$invalidate) {
        	let hidden;
        	let $selectedMenu;
        	component_subscribe($$self, selectedMenu, $$value => $$invalidate(4, $selectedMenu = $$value));
        	let { tray = null } = $$props;

        	function closeMenu() {
        		selectedMenu.set(null);
        	}

        	function trayClicked() {
        		if ($selectedMenu !== tray) {
        			selectedMenu.set(tray);
        		} else {
        			selectedMenu.set(null);
        		}
        	}

        	$$self.$$set = $$props => {
        		if ("tray" in $$props) $$invalidate(0, tray = $$props.tray);
        	};

        	$$self.$$.update = () => {
        		if ($$self.$$.dirty & /*$selectedMenu, tray*/ 17) {
        			$$invalidate(1, hidden = $selectedMenu !== tray);
        		}
        	};

        	return [tray, hidden, closeMenu, trayClicked, $selectedMenu];
        }

        class TrayMenu extends SvelteComponent {
        	constructor(options) {
        		super();
        		if (!document_1.getElementById("svelte-esze1k-style")) add_css$2();
        		init(this, options, instance$2, create_fragment$2, safe_not_equal, { tray: 0 });
        	}
        }

        /* Menubar.svelte generated by Svelte v3.32.2 */

        function add_css$3() {
        	var style = element("style");
        	style.id = "svelte-1i0zb4n-style";
        	style.textContent = ".tray-menus.svelte-1i0zb4n{display:flex;flex-direction:row;justify-content:flex-end}.wails-menubar.svelte-1i0zb4n{position:relative;display:block;top:0;height:2rem;width:100%;border-bottom:1px solid #b3b3b3;box-shadow:0 0 10px 0 #33333360}.time.svelte-1i0zb4n{padding-left:0.5rem;padding-right:1.5rem;overflow:visible;font-size:14px}";
        	append(document.head, style);
        }

        function get_each_context$1(ctx, list, i) {
        	const child_ctx = ctx.slice();
        	child_ctx[9] = list[i];
        	return child_ctx;
        }

        // (38:0) {#if $menuVisible }
        function create_if_block$3(ctx) {
        	let div;
        	let span1;
        	let t0;
        	let span0;
        	let t1;
        	let div_transition;
        	let current;
        	let each_value = /*$trays*/ ctx[2];
        	let each_blocks = [];

        	for (let i = 0; i < each_value.length; i += 1) {
        		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
        	}

        	const out = i => transition_out(each_blocks[i], 1, 1, () => {
        		each_blocks[i] = null;
        	});

        	return {
        		c() {
        			div = element("div");
        			span1 = element("span");

        			for (let i = 0; i < each_blocks.length; i += 1) {
        				each_blocks[i].c();
        			}

        			t0 = space();
        			span0 = element("span");
        			t1 = text(/*dateTimeString*/ ctx[0]);
        			attr(span0, "class", "time svelte-1i0zb4n");
        			attr(span1, "class", "tray-menus svelte-1i0zb4n");
        			attr(div, "class", "wails-menubar svelte-1i0zb4n");
        		},
        		m(target, anchor) {
        			insert(target, div, anchor);
        			append(div, span1);

        			for (let i = 0; i < each_blocks.length; i += 1) {
        				each_blocks[i].m(span1, null);
        			}

        			append(span1, t0);
        			append(span1, span0);
        			append(span0, t1);
        			current = true;
        		},
        		p(ctx, dirty) {
        			if (dirty & /*$trays*/ 4) {
        				each_value = /*$trays*/ ctx[2];
        				let i;

        				for (i = 0; i < each_value.length; i += 1) {
        					const child_ctx = get_each_context$1(ctx, each_value, i);

        					if (each_blocks[i]) {
        						each_blocks[i].p(child_ctx, dirty);
        						transition_in(each_blocks[i], 1);
        					} else {
        						each_blocks[i] = create_each_block$1(child_ctx);
        						each_blocks[i].c();
        						transition_in(each_blocks[i], 1);
        						each_blocks[i].m(span1, t0);
        					}
        				}

        				group_outros();

        				for (i = each_value.length; i < each_blocks.length; i += 1) {
        					out(i);
        				}

        				check_outros();
        			}

        			if (!current || dirty & /*dateTimeString*/ 1) set_data(t1, /*dateTimeString*/ ctx[0]);
        		},
        		i(local) {
        			if (current) return;

        			for (let i = 0; i < each_value.length; i += 1) {
        				transition_in(each_blocks[i]);
        			}

        			add_render_callback(() => {
        				if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, true);
        				div_transition.run(1);
        			});

        			current = true;
        		},
        		o(local) {
        			each_blocks = each_blocks.filter(Boolean);

        			for (let i = 0; i < each_blocks.length; i += 1) {
        				transition_out(each_blocks[i]);
        			}

        			if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, false);
        			div_transition.run(0);
        			current = false;
        		},
        		d(detaching) {
        			if (detaching) detach(div);
        			destroy_each(each_blocks, detaching);
        			if (detaching && div_transition) div_transition.end();
        		}
        	};
        }

        // (41:4) {#each $trays as tray}
        function create_each_block$1(ctx) {
        	let traymenu;
        	let current;
        	traymenu = new TrayMenu({ props: { tray: /*tray*/ ctx[9] } });

        	return {
        		c() {
        			create_component(traymenu.$$.fragment);
        		},
        		m(target, anchor) {
        			mount_component(traymenu, target, anchor);
        			current = true;
        		},
        		p(ctx, dirty) {
        			const traymenu_changes = {};
        			if (dirty & /*$trays*/ 4) traymenu_changes.tray = /*tray*/ ctx[9];
        			traymenu.$set(traymenu_changes);
        		},
        		i(local) {
        			if (current) return;
        			transition_in(traymenu.$$.fragment, local);
        			current = true;
        		},
        		o(local) {
        			transition_out(traymenu.$$.fragment, local);
        			current = false;
        		},
        		d(detaching) {
        			destroy_component(traymenu, detaching);
        		}
        	};
        }

        function create_fragment$3(ctx) {
        	let if_block_anchor;
        	let current;
        	let mounted;
        	let dispose;
        	let if_block = /*$menuVisible*/ ctx[1] && create_if_block$3(ctx);

        	return {
        		c() {
        			if (if_block) if_block.c();
        			if_block_anchor = empty();
        		},
        		m(target, anchor) {
        			if (if_block) if_block.m(target, anchor);
        			insert(target, if_block_anchor, anchor);
        			current = true;

        			if (!mounted) {
        				dispose = listen(window, "keydown", /*handleKeydown*/ ctx[3]);
        				mounted = true;
        			}
        		},
        		p(ctx, [dirty]) {
        			if (/*$menuVisible*/ ctx[1]) {
        				if (if_block) {
        					if_block.p(ctx, dirty);

        					if (dirty & /*$menuVisible*/ 2) {
        						transition_in(if_block, 1);
        					}
        				} else {
        					if_block = create_if_block$3(ctx);
        					if_block.c();
        					transition_in(if_block, 1);
        					if_block.m(if_block_anchor.parentNode, if_block_anchor);
        				}
        			} else if (if_block) {
        				group_outros();

        				transition_out(if_block, 1, 1, () => {
        					if_block = null;
        				});

        				check_outros();
        			}
        		},
        		i(local) {
        			if (current) return;
        			transition_in(if_block);
        			current = true;
        		},
        		o(local) {
        			transition_out(if_block);
        			current = false;
        		},
        		d(detaching) {
        			if (if_block) if_block.d(detaching);
        			if (detaching) detach(if_block_anchor);
        			mounted = false;
        			dispose();
        		}
        	};
        }

        function instance$3($$self, $$props, $$invalidate) {
        	let day;
        	let dom;
        	let mon;
        	let currentTime;
        	let dateTimeString;
        	let $menuVisible;
        	let $trays;
        	component_subscribe($$self, menuVisible, $$value => $$invalidate(1, $menuVisible = $$value));
        	component_subscribe($$self, trays, $$value => $$invalidate(2, $trays = $$value));
        	let time = new Date();

        	onMount(() => {
        		const interval = setInterval(
        			() => {
        				$$invalidate(4, time = new Date());
        			},
        			1000
        		);

        		return () => {
        			clearInterval(interval);
        		};
        	});

        	function handleKeydown(e) {
        		// Backtick toggle
        		if (e.keyCode == 192) {
        			menuVisible.update(current => {
        				return !current;
        			});
        		}
        	}

        	$$self.$$.update = () => {
        		if ($$self.$$.dirty & /*time*/ 16) {
        			$$invalidate(5, day = time.toLocaleString("default", { weekday: "short" }));
        		}

        		if ($$self.$$.dirty & /*time*/ 16) {
        			$$invalidate(6, dom = time.getDate());
        		}

        		if ($$self.$$.dirty & /*time*/ 16) {
        			$$invalidate(7, mon = time.toLocaleString("default", { month: "short" }));
        		}

        		if ($$self.$$.dirty & /*time*/ 16) {
        			$$invalidate(8, currentTime = time.toLocaleString("en-US", {
        				hour: "numeric",
        				minute: "numeric",
        				hour12: true
        			}).toLowerCase());
        		}

        		if ($$self.$$.dirty & /*day, dom, mon, currentTime*/ 480) {
        			$$invalidate(0, dateTimeString = `${day} ${dom} ${mon} ${currentTime}`);
        		}
        	};

        	return [
        		dateTimeString,
        		$menuVisible,
        		$trays,
        		handleKeydown,
        		time,
        		day,
        		dom,
        		mon,
        		currentTime
        	];
        }

        class Menubar extends SvelteComponent {
        	constructor(options) {
        		super();
        		if (!document.getElementById("svelte-1i0zb4n-style")) add_css$3();
        		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});
        	}
        }

        /*
         _       __      _ __
        | |     / /___ _(_) /____
        | | /| / / __ `/ / / ___/
        | |/ |/ / /_/ / / (__  )
        |__/|__/\__,_/_/_/____/
        The lightweight framework for web-like apps
        (c) Lea Anthony 2019-present
        */

        let websocket = null;
        let callback = null;
        let connectTimer;

        function StartWebsocket(userCallback) {

        	callback = userCallback;

        	window.onbeforeunload = function() {
        		if( websocket ) {
        			websocket.onclose = function () { };
        			websocket.close();
        			websocket = null;
        		}
        	};

        	// ...and attempt to connect
        	connect();

        }

        function setupIPCBridge() {
        	window.wailsInvoke = (message) => {
        		websocket.send(message);
        	};
        }

        // Handles incoming websocket connections
        function handleConnect() {
        	log('Connected to backend');
        	setupIPCBridge();
        	hideOverlay();
        	clearInterval(connectTimer);
        	websocket.onclose = handleDisconnect;
        	websocket.onmessage = handleMessage;
        }

        // Handles websocket disconnects
        function handleDisconnect() {
        	log('Disconnected from backend');
        	websocket = null;
        	showOverlay();
        	connect();
        }

        // Try to connect to the backend every 1s (default value).
        function connect() {
        	connectTimer = setInterval(function () {
        		if (websocket == null) {
        			websocket = new WebSocket('ws://' + window.location.hostname + ':34115/bridge');
        			websocket.onopen = handleConnect;
        			websocket.onerror = function (e) {
        				e.stopImmediatePropagation();
        				e.stopPropagation();
        				e.preventDefault();
        				websocket = null;
        				return false;
        			};
        		}
        	}, 1000);
        }

        // Adds a script to the Dom.
        // Removes it if second parameter is true.
        function addScript(script, remove) {
        	const s = document.createElement('script');
        	s.setAttribute('type', 'text/javascript');
        	s.textContent = script;
        	document.head.appendChild(s);

        	// Remove internal messages from the DOM
        	if (remove) {
        		s.parentNode.removeChild(s);
        	}
        }

        function handleMessage(message) {
        	// As a bridge we ignore js and css injections
        	switch (message.data[0]) {
        	// Wails library - inject!
        	case 'b':
        		message = message.data.slice(1);
        		addScript(message);
        		log('Loaded Wails Runtime');

        		// We need to now send a message to the backend telling it
        		// we have loaded (System Start)
        		window.wailsInvoke('SS');
        		
        		// Now wails runtime is loaded, wails for the ready event
        		// and callback to the main app
        		// window.wails.Events.On('wails:loaded', function () {
        		if (callback) {
        			log('Notifying application');
        			callback(window.wails);
        		}
        		// });
        		break;
        		// Notifications
        	case 'n':
        		window.wails._.Notify(message.data.slice(1));
        		break;
        		// 	// Binding
        		// case 'b':
        		// 	const binding = message.data.slice(1);
        		// 	//log("Binding: " + binding)
        		// 	window.wails._.NewBinding(binding);
        		// 	break;
        		// 	// Call back
        	case 'c':
        		const callbackData = message.data.slice(1);
        		window.wails._.Callback(callbackData);
        		break;
        		// Tray
        	case 'T':
        		const trayMessage = message.data.slice(1);
        		switch (trayMessage[0]) {
        		case 'S':
        			// Set tray
        			const trayJSON = trayMessage.slice(1);
        			let tray = JSON.parse(trayJSON);
        			setTray(tray);
        			break;
        		case 'U':
        			// Update label
        			const updateTrayLabelJSON = trayMessage.slice(1);
        			let trayLabelData = JSON.parse(updateTrayLabelJSON);
        			updateTrayLabel(trayLabelData);
        			break;
        		case 'D':
        			// Delete Tray Menu
        			const id = trayMessage.slice(1);
        			deleteTrayMenu(id);
        			break;
        		default:
        			log('Unknown tray message: ' + message.data);
        		}
        		break;

        	default:
        		log('Unknown message: ' + message.data);
        	}
        }

        /*
         _       __      _ __
        | |     / /___ _(_) /____
        | | /| / / __ `/ / / ___/
        | |/ |/ / /_/ / / (__  )
        |__/|__/\__,_/_/_/____/
        The lightweight framework for web-like apps
        (c) Lea Anthony 2019-present
        */

        function setupMenuBar() {
        	new Menubar({
        		target: document.body,
        	});
        }

        // Sets up the overlay
        function setupOverlay() {
        	new Overlay({
        		target: document.body,
        		anchor: document.querySelector('#wails-bridge'),
        	});
        }

        function InitBridge(callback) {

        	setupMenuBar();

        	// Setup the overlay
        	setupOverlay();

        	// Start by showing the overlay...
        	showOverlay();

        	// ...and attempt to connect
        	StartWebsocket(callback);
        }

        exports.InitBridge = InitBridge;

        Object.defineProperty(exports, '__esModule', { value: true });

    })));
    }(bridge$1, bridge$1.exports));

    /*
     _       __      _ __    
    | |     / /___ _(_) /____
    | | /| / / __ `/ / / ___/
    | |/ |/ / /_/ / / (__  ) 
    |__/|__/\__,_/_/_/____/  
    The lightweight framework for web-like apps
    (c) Lea Anthony 2019-present
    */

    /* jshint esversion: 6 */

    const bridge = bridge$1.exports;

    /**
     * ready will execute the callback when Wails has loaded
     * and initialised.
     *
     * @param {function} callback
     */
    function ready(callback) {

    	// If window.wails exists, we are ready
    	if( window.wails ) {
    		return callback();
    	}

    	// If not we need to setup the bridge
    	bridge.InitBridge(callback);
    }

    var init = {
    	ready: ready,
    };

    /*
     _       __      _ __    
    | |     / /___ _(_) /____
    | | /| / / __ `/ / / ___/
    | |/ |/ / /_/ / / (__  ) 
    |__/|__/\__,_/_/_/____/  
    The lightweight framework for web-like apps
    (c) Lea Anthony 2019-present
    */

    /* jshint esversion: 6 */

    const Events$1 = events;

    /**
     * Registers an event listener that will be invoked when the user changes the
     * desktop theme (light mode / dark mode). The callback receives a booleanean which
     * indicates if dark mode is enabled.
     *
     * @export
     * @param {function} callback The callback to invoke on theme change
     */
    function OnThemeChange(callback) {
    	Events$1.On("wails:system:themechange", callback);
    }

    /**
     * Checks if dark mode is curently enabled.
     *
     * @export
     * @returns {Promise}
     */
    function DarkModeEnabled() {
    	return window.wails.System.IsDarkMode.get();
    }

    /**
     * Mac Application Config
     * @typedef {Object} MacAppConfig
     * @param {MacTitleBar} TitleBar - The window's titlebar configuration
     */

     /**
     * Mac Title Bar Config
     * Check out https://github.com/lukakerr/NSWindowStyles for some examples of these settings
     * @typedef {Object} MacTitleBar
     * @param {boolean} TitleBarAppearsTransparent - NSWindow.titleBarAppearsTransparent
     * @param {boolean} HideTitle - NSWindow.hideTitle
     * @param {boolean} HideTitleBar - NSWindow.hideTitleBar
     * @param {boolean} FullSizeContent - Makes the webview portion of the window the full size of the window, even over the titlebar
     * @param {boolean} UseToolbar - Set true to add a blank toolbar to the window (makes the title bar larger)
     * @param {boolean} HideToolbarSeparator - Set true to remove the separator between the toolbar and the main content area
     * 
     */

    /**
     * The application configuration
     * 
     * @typedef {Object} AppConfig
     * @param {string} Title - Application Title
     * @param {number} Width - Window Width
     * @param {number} Height - Window Height
     * @param {boolean} DisableResize - True if resize is disabled
     * @param {boolean} Fullscreen - App started in fullscreen
     * @param {number} MinWidth - Window Minimum Width
     * @param {number} MinHeight - Window Minimum Height
     * @param {number} MaxWidth - Window Maximum Width
     * @param {number} MaxHeight - Window Maximum Height
     * @param {boolean} StartHidden - Start with window hidden
     * @param {boolean} DevTools - Enables the window devtools
     * @param {number} RBGA - The initial window colour. Convert to hex then it'll mean 0xRRGGBBAA
     * @param {MacAppConfig} [Mac] - Configuration when running on Mac
     * @param {LinuxAppConfig} [Linux] - Configuration when running on Linux
     * @param {WindowsAppConfig} [Windows] - Configuration when running on Windows
     * @param {string} Appearance - The default application appearance. Use the values listed here: https://developer.apple.com/documentation/appkit/nsappearance?language=objc
     * @param {number} WebviewIsTransparent - Makes the background of the webview content transparent. Use this with the Alpha part of the window colour to make parts of your application transparent.
     * @param {number} WindowBackgroundIsTranslucent - Makes the transparent parts of the application window translucent. Example: https://en.wikipedia.org/wiki/MacOS_Big_Sur#/media/File:MacOS_Big_Sur_-_Safari_Extensions_category_in_App_Store.jpg
     * @param {number} LogLevel - The initial log level (lower is more verbose)
     * 
     */

    /**
     * Returns the application configuration.
     *
     * @export
     * @returns {Promise<AppConfig>}
     */
    function AppConfig() {
    	return window.wails.System.AppConfig.get();
    }

    function LogLevel() {
    	return window.wails.System.LogLevel();
    }

    function Platform() {
    	return window.wails.System.Platform();
    }

    function AppType() {
    	return window.wails.System.AppType();
    }

    var system = {
    	OnThemeChange: OnThemeChange,
    	DarkModeEnabled: DarkModeEnabled,
    	LogLevel: LogLevel,
    	Platform: Platform,
    	AppType: AppType,
    	AppConfig: AppConfig,
    };

    /*
     _       __      _ __    
    | |     / /___ _(_) /____
    | | /| / / __ `/ / / ___/
    | |/ |/ / /_/ / / (__  ) 
    |__/|__/\__,_/_/_/____/  
    The lightweight framework for web-like apps
    (c) Lea Anthony 2019-present
    */

    /* jshint esversion: 6 */


    /**
     * Create a new Store with the given name and optional default value
     *
     * @export
     * @param {string} name
     * @param {*} optionalDefault
     */
    function New(name, optionalDefault) {
    	return window.wails.Store.New(name, optionalDefault);
    }

    var store = {
    	New: New,
    };

    /*
     _       __      _ __    
    | |     / /___ _(_) /____
    | | /| / / __ `/ / / ___/
    | |/ |/ / /_/ / / (__  ) 
    |__/|__/\__,_/_/_/____/  
    The lightweight framework for web-like apps
    (c) Lea Anthony 2019-present
    */
    /* jshint esversion: 6 */

    /**
     * Place the window in the center of the screen
     *
     * @export
     */
    function Center() {
    	window.wails.Window.Center();
    }

    /**
     * Set the Size of the window
     *
     * @export
     * @param {number} width
     * @param {number} height
     */
    function SetSize(width, height) {
    	window.wails.Window.SetSize(width, height);
    }

    /**
     * Set the Position of the window
     *
     * @export
     * @param {number} x
     * @param {number} y
     */
    function SetPosition(x, y) {
    	window.wails.Window.SetPosition(x, y);
    }

    /**
     * Hide the Window
     *
     * @export
     */
    function Hide() {
    	window.wails.Window.Hide();
    }

    /**
     * Show the Window
     *
     * @export
     */
    function Show() {
    	window.wails.Window.Show();
    }

    /**
     * Maximise the Window
     *
     * @export
     */
    function Maximise() {
    	window.wails.Window.Maximise();
    }

    /**
     * Unmaximise the Window
     *
     * @export
     */
    function Unmaximise() {
    	window.wails.Window.Unmaximise();
    }

    /**
     * Minimise the Window
     *
     * @export
     */
    function Minimise() {
    	window.wails.Window.Minimise();
    }

    /**
     * Unminimise the Window
     *
     * @export
     */
    function Unminimise() {
    	window.wails.Window.Unminimise();
    }

    /**
     * Close the Window
     *
     * @export
     */
    function Close() {
    	window.wails.Window.Close();
    }

    /**
     * Sets the window title
     *
     * @export
     */
    function SetTitle(title) {
    	window.wails.Window.SetTitle(title);
    }

    /**
     * Makes the window go fullscreen
     *
     * @export
     */
    function Fullscreen() {
    	window.wails.Window.Fullscreen();
    }

    /**
     * Reverts the window from fullscreen
     *
     * @export
     */
    function UnFullscreen() {
    	window.wails.Window.UnFullscreen();
    }

    var window$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        Center: Center,
        SetSize: SetSize,
        SetPosition: SetPosition,
        Hide: Hide,
        Show: Show,
        Maximise: Maximise,
        Unmaximise: Unmaximise,
        Minimise: Minimise,
        Unminimise: Unminimise,
        Close: Close,
        SetTitle: SetTitle,
        Fullscreen: Fullscreen,
        UnFullscreen: UnFullscreen
    });

    var require$$7 = /*@__PURE__*/getAugmentedNamespace(window$1);

    /*
     _       __      _ __    
    | |     / /___ _(_) /____
    | | /| / / __ `/ / / ___/
    | |/ |/ / /_/ / / (__  ) 
    |__/|__/\__,_/_/_/____/  
    The lightweight framework for web-like apps
    (c) Lea Anthony 2019-present
    */

    /* jshint esversion: 6 */


    /**
     * Sets the tray icon to the icon referenced by the given ID.
     * Tray icons must follow this convention:
     *   - They must be PNG files
     *   - They must reside in a "trayicons" directory in the project root
     *   - They must have a ".png" extension
     *
     * The icon ID is the name of the file, without the ".png"
     *
     * @export
     * @param {string} trayIconID
     */
    function SetIcon(trayIconID) {
    	window.wails.Tray.SetIcon(trayIconID);
    }

    var tray = {
    	SetIcon: SetIcon,
    };

    /*
     _       __      _ __    
    | |     / /___ _(_) /____
    | | /| / / __ `/ / / ___/
    | |/ |/ / /_/ / / (__  ) 
    |__/|__/\__,_/_/_/____/  
    The lightweight framework for web-like apps
    (c) Lea Anthony 2019-present
    */

    /* jshint esversion: 6 */

    const Log = log;
    const Browser = require$$1;
    const Dialog = require$$2;
    const Events = events;
    const Init = init;
    const System = system;
    const Store = store;
    const Window = require$$7;
    const Tray = tray;

    var main = {
    	Browser: Browser,
    	Dialog: Dialog,
    	Events: Events,
    	ready: Init.ready,
    	Log: Log,
    	System: System,
    	Store: Store,
    	Window: Window,
    	Tray: Tray,
    };

    /* src/App.svelte generated by Svelte v3.42.4 */

    function create_fragment$2(ctx) {
    	let t;
    	let div;
    	let router;
    	let current;
    	router = new Router({});

    	return {
    		c() {
    			t = space();
    			div = element("div");
    			create_component(router.$$.fragment);
    			attr(div, "class", "flex h-full");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    			insert(target, div, anchor);
    			mount_component(router, div, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    			if (detaching) detach(div);
    			destroy_component(router);
    		}
    	};
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init$1(this, options, null, create_fragment$2, safe_not_equal, {});
    	}
    }

    /* src/Homepage.svelte generated by Svelte v3.42.4 */

    function create_fragment$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.innerHTML = `<h2>Octowise</h2>`;
    			attr(div, "class", "px-6 py-3");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function instance($$self) {
    	return [];
    }

    class Homepage extends SvelteComponent {
    	constructor(options) {
    		super();
    		init$1(this, options, instance, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* src/Device.svelte generated by Svelte v3.42.4 */

    function create_fragment(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.innerHTML = `<h2>Device</h2>`;
    			attr(div, "class", "px-6 py-3");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    class Device extends SvelteComponent {
    	constructor(options) {
    		super();
    		init$1(this, options, null, create_fragment, safe_not_equal, {});
    	}
    }

    let app;

    routes.set({
    	'/': Homepage,
    	'/device': Device,
    });

    main.ready(() => {
    	app = new App({
    		target: document.body,
    	});
    });

    var app$1 = app;

    return app$1;

}());
//# sourceMappingURL=main.js.map
