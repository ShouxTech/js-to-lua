
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
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
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
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
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\LibLoader.svelte generated by Svelte v3.48.0 */
    const file$1 = "src\\LibLoader.svelte";

    function create_fragment$1(ctx) {
    	let script_1;
    	let script_1_src_value;

    	const block = {
    		c: function create() {
    			script_1 = element("script");
    			if (!src_url_equal(script_1.src, script_1_src_value = /*src*/ ctx[0])) attr_dev(script_1, "src", script_1_src_value);
    			add_location(script_1, file$1, 29, 4, 766);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, script_1);
    			/*script_1_binding*/ ctx[3](script_1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*src*/ 1 && !src_url_equal(script_1.src, script_1_src_value = /*src*/ ctx[0])) {
    				attr_dev(script_1, "src", script_1_src_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(script_1);
    			/*script_1_binding*/ ctx[3](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LibLoader', slots, []);
    	let { src } = $$props;
    	let { libraryDetectionObject } = $$props;
    	const dispatch = createEventDispatcher();
    	let script;

    	onMount(() => {
    		if (libraryDetectionObject && window && typeof window[libraryDetectionObject] !== 'undefined') {
    			return dispatch('loaded');
    		}

    		script.addEventListener('load', () => {
    			dispatch('loaded');
    		});

    		script.addEventListener('error', event => {
    			dispatch('error');
    		});
    	});

    	const writable_props = ['src', 'libraryDetectionObject'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LibLoader> was created with unknown prop '${key}'`);
    	});

    	function script_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			script = $$value;
    			$$invalidate(1, script);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('src' in $$props) $$invalidate(0, src = $$props.src);
    		if ('libraryDetectionObject' in $$props) $$invalidate(2, libraryDetectionObject = $$props.libraryDetectionObject);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		createEventDispatcher,
    		src,
    		libraryDetectionObject,
    		dispatch,
    		script
    	});

    	$$self.$inject_state = $$props => {
    		if ('src' in $$props) $$invalidate(0, src = $$props.src);
    		if ('libraryDetectionObject' in $$props) $$invalidate(2, libraryDetectionObject = $$props.libraryDetectionObject);
    		if ('script' in $$props) $$invalidate(1, script = $$props.script);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [src, script, libraryDetectionObject, script_1_binding];
    }

    class LibLoader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { src: 0, libraryDetectionObject: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LibLoader",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*src*/ ctx[0] === undefined && !('src' in props)) {
    			console.warn("<LibLoader> was created without expected prop 'src'");
    		}

    		if (/*libraryDetectionObject*/ ctx[2] === undefined && !('libraryDetectionObject' in props)) {
    			console.warn("<LibLoader> was created without expected prop 'libraryDetectionObject'");
    		}
    	}

    	get src() {
    		throw new Error("<LibLoader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error("<LibLoader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get libraryDetectionObject() {
    		throw new Error("<LibLoader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set libraryDetectionObject(value) {
    		throw new Error("<LibLoader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.48.0 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let libloader0;
    	let t0;
    	let libloader1;
    	let t1;
    	let libloader2;
    	let t2;
    	let div0;
    	let t4;
    	let div1;
    	let current;

    	libloader0 = new LibLoader({
    			props: {
    				src: "bundle.js",
    				libraryDetectionObject: "formatText"
    			},
    			$$inline: true
    		});

    	libloader0.$on("loaded", /*initEditors*/ ctx[2]);

    	libloader1 = new LibLoader({
    			props: {
    				src: "transpiler.js",
    				libraryDetectionObject: "Transpiler"
    			},
    			$$inline: true
    		});

    	libloader1.$on("loaded", /*initEditors*/ ctx[2]);

    	libloader2 = new LibLoader({
    			props: {
    				src: "https://pagecdn.io/lib/ace/1.4.6/ace.js",
    				libraryDetectionObject: "ace"
    			},
    			$$inline: true
    		});

    	libloader2.$on("loaded", /*initEditors*/ ctx[2]);

    	const block = {
    		c: function create() {
    			create_component(libloader0.$$.fragment);
    			t0 = space();
    			create_component(libloader1.$$.fragment);
    			t1 = space();
    			create_component(libloader2.$$.fragment);
    			t2 = space();
    			div0 = element("div");

    			div0.textContent = `${`while (true == true) {
	console.log('this works');
}
`}`;

    			t4 = space();
    			div1 = element("div");
    			attr_dev(div0, "id", "js-editor");
    			attr_dev(div0, "class", "svelte-122vu40");
    			add_location(div0, file, 52, 0, 1436);
    			attr_dev(div1, "id", "lua-editor");
    			attr_dev(div1, "class", "svelte-122vu40");
    			add_location(div1, file, 56, 0, 1548);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(libloader0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(libloader1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(libloader2, target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div0, anchor);
    			/*div0_binding*/ ctx[3](div0);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div1, anchor);
    			/*div1_binding*/ ctx[4](div1);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(libloader0.$$.fragment, local);
    			transition_in(libloader1.$$.fragment, local);
    			transition_in(libloader2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(libloader0.$$.fragment, local);
    			transition_out(libloader1.$$.fragment, local);
    			transition_out(libloader2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(libloader0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(libloader1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(libloader2, detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div0);
    			/*div0_binding*/ ctx[3](null);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div1);
    			/*div1_binding*/ ctx[4](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const NUM_DEPS = 3;

    function setupEditor(editorElement, mode) {
    	const editor = ace.edit(editorElement);
    	editor.setTheme('ace/theme/tomorrow_night');
    	editor.session.setMode(mode);
    	editor.setShowPrintMargin(false);
    	editorElement.style.fontSize = '16px';
    	return editor;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let jsEditorElement;
    	let luaEditorElement;
    	let loadedDeps = 0;
    	const PARSE_OPTIONS = { ecmaVersion: 2021 };

    	function initEditors() {
    		loadedDeps++;
    		if (loadedDeps < NUM_DEPS) return; // Used to make sure all dependencies are loaded before initializing editors.
    		const jsEditor = setupEditor(jsEditorElement, 'ace/mode/javascript');
    		const luaEditor = setupEditor(luaEditorElement, 'ace/mode/lua');
    		luaEditor.setReadOnly(true);

    		function transpile() {
    			const code = jsEditor.getValue();

    			try {
    				const ast = acorn.parse(code, PARSE_OPTIONS);
    				const res = Transpiler.transpile(ast);
    				luaEditor.setValue(formatText(res), -1);
    			} catch(err) {
    				luaEditor.setValue(err.message, -1);
    			}
    		}

    		transpile();
    		jsEditor.session.on('change', transpile);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			jsEditorElement = $$value;
    			$$invalidate(0, jsEditorElement);
    		});
    	}

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			luaEditorElement = $$value;
    			$$invalidate(1, luaEditorElement);
    		});
    	}

    	$$self.$capture_state = () => ({
    		LibLoader,
    		jsEditorElement,
    		luaEditorElement,
    		loadedDeps,
    		NUM_DEPS,
    		PARSE_OPTIONS,
    		setupEditor,
    		initEditors
    	});

    	$$self.$inject_state = $$props => {
    		if ('jsEditorElement' in $$props) $$invalidate(0, jsEditorElement = $$props.jsEditorElement);
    		if ('luaEditorElement' in $$props) $$invalidate(1, luaEditorElement = $$props.luaEditorElement);
    		if ('loadedDeps' in $$props) loadedDeps = $$props.loadedDeps;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [jsEditorElement, luaEditorElement, initEditors, div0_binding, div1_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
