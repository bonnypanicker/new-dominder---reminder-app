/* global __dirname */
'use strict';

// No renderer or native runtime: execute the real TSX with deterministic hook,
// element reconciliation, ref/effect cleanup, and animation completion doubles.
// SWIPE_TEST_SOURCE=head runs the same assertions against git HEAD, in memory.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const filename = path.join(root, 'components', 'SwipeableRow.tsx');
const source = process.env.SWIPE_TEST_SOURCE === 'head'
  ? execFileSync('git', ['show', 'HEAD:components/SwipeableRow.tsx'], { cwd: root, encoding: 'utf8' })
  : fs.readFileSync(filename, 'utf8');
const compiled = ts.transpileModule(source, {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;

function harness(platform = 'android') {
  let current;
  let tree;
  let props;
  let dirty = false;
  let unmounted = false;
  let updatesAfterUnmount = 0;
  const effects = [];
  const timers = [];
  const animations = [];
  const toasts = [];
  const colors = { error: 'red', success: 'green', onError: 'white', onSuccess: 'white' };
  const depsEqual = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  function slot(init) {
    assert.ok(current, 'hooks must execute inside a component');
    const i = current.cursor++;
    return current.hooks[i] || (current.hooks[i] = init());
  }
  const React = {
    createElement(type, input, ...children) {
      const p = { ...input };
      const key = p.key == null ? null : String(p.key);
      delete p.key;
      if (children.length) p.children = children.length === 1 ? children[0] : children;
      return { type, key, props: p };
    },
    // Deliberately render on parent updates, to test state preservation rather
    // than memo bailouts. Hook identity and key/type changes are still modeled.
    memo: fn => fn,
    useRef(value) { return slot(() => ({ current: value })); },
    useState(value) {
      const owner = current;
      const s = slot(() => ({ value: typeof value === 'function' ? value() : value }));
      return [s.value, next => {
        if (!owner.mounted) updatesAfterUnmount++;
        s.value = typeof next === 'function' ? next(s.value) : next;
        dirty = true;
      }];
    },
    useMemo(fn, deps) {
      const s = slot(() => ({ initialized: false }));
      if (!s.initialized || !depsEqual(s.deps, deps)) {
        s.value = fn(); s.deps = deps; s.initialized = true;
      }
      return s.value;
    },
    useCallback(fn, deps) { return React.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const s = slot(() => ({ initialized: false }));
      if (!s.initialized || !depsEqual(s.deps, deps)) {
        effects.push(() => { s.cleanup?.(); s.cleanup = fn(); });
        s.deps = deps; s.initialized = true;
      }
    },
  };
  class Value {
    constructor(value) { this.value = value; this.resets = []; }
    setValue(value) { this.value = value; this.resets.push(value); }
    interpolate({ inputRange, outputRange }) {
      const self = this;
      return { get value() {
        const ratio = (self.value - inputRange[0]) / (inputRange[1] - inputRange[0]);
        return outputRange[0] + ratio * (outputRange[1] - outputRange[0]);
      } };
    }
  }
  function apply(animation) {
    if (animation.kind === 'timing') animation.value.value = animation.config.toValue;
    else animation.children?.forEach(apply);
  }
  const Animated = {
    Value, View: 'Animated.View',
    timing: (value, config) => ({ kind: 'timing', value, config }),
    delay: duration => ({ kind: 'delay', duration }),
    sequence: children => ({ kind: 'sequence', children }),
    parallel(children) {
      const animation = {
        kind: 'parallel', children, stopped: false, callback: null, completion: null,
        start(callback) { this.callback = callback; animations.push(this); },
        finish(finished = true) {
          if (finished) apply(this);
          // Promise capture also allows a throwing HEAD callback to fail the
          // assertion cleanly instead of producing an unhandled rejection.
          this.completion = Promise.resolve().then(() => this.callback({ finished }));
          return this.completion;
        },
        stop() { this.stopped = true; this.finish(false); },
      };
      return animation;
    },
  };
  const noop = () => {};
  const mocks = {
    react: React,
    'react-native': { Animated, View: 'View', Text: 'Text', StyleSheet: { create: s => s },
      Dimensions: { get: () => ({ width: 400 }) }, Platform: { OS: platform } },
    'react-native-gesture-handler': { Swipeable: 'Swipeable' },
    '@expo/vector-icons': { Feather: 'Feather' },
    'expo-haptics': { impactAsync: async () => {}, ImpactFeedbackStyle: { Medium: 'medium' } },
    '@/utils/debugUtils': { useRenderTracking: noop,
      animationConflictDetector: { registerAnimation: noop, unregisterAnimation: noop },
      performanceMonitor: { start: noop, end: noop } },
    '@/hooks/theme-provider': { useThemeColors: () => colors },
    '@/utils/toast': { showToast: message => toasts.push(message) },
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require(name) { assert.ok(Object.hasOwn(mocks, name), `unexpected import: ${name}`); return mocks[name]; },
    setTimeout(fn) { timers.push(fn); return timers.length; },
    clearTimeout: noop, console,
  }, { filename });
  const Component = module.exports.default;

  function dispose(node) {
    if (!node) return;
    node.mounted = false;
    node.hooks?.forEach(s => s.cleanup?.());
    if (node.instance) node.element.props.ref?.(null);
    node.children?.forEach(dispose);
  }
  function reconcile(element, previous) {
    if (element == null || typeof element !== 'object') { dispose(previous); return null; }
    if (previous && (previous.element.type !== element.type || previous.element.key !== element.key)) {
      dispose(previous); previous = null;
    }
    const node = previous || { hooks: [], children: [], mounted: true };
    const oldRef = previous?.element.props.ref;
    node.element = element;
    if (typeof element.type === 'function') {
      const saved = current;
      current = node; node.cursor = 0;
      const output = element.type(element.props);
      current = saved;
      node.children = [reconcile(output, node.children[0])];
    } else {
      if (element.type === 'Swipeable') {
        if (!node.instance) node.instance = { resets: 0, closes: 0,
          reset() { this.resets++; }, close() { this.closes++; } };
        if (!previous || oldRef !== element.props.ref) {
          oldRef?.(null); element.props.ref?.(node.instance);
        }
      }
      const children = [element.props.children].flat().filter(x => x != null && typeof x === 'object');
      const oldChildren = node.children;
      node.children = children.map((child, i) => reconcile(child, oldChildren[i]));
      oldChildren.slice(children.length).forEach(dispose);
    }
    return node;
  }
  function render(next = props) {
    assert.equal(unmounted, false);
    props = next; dirty = false;
    tree = reconcile(React.createElement(Component, props), tree);
    effects.splice(0).forEach(effect => effect());
  }
  function flush() {
    timers.splice(0).forEach(fn => fn());
    if (dirty) render();
  }
  function hosts() {
    const result = [];
    function walk(node) {
      if (!node) return;
      if (typeof node.element.type === 'string') result.push(node);
      node.children.forEach(walk);
    }
    walk(tree); return result;
  }
  return {
    render, flush, animations, toasts,
    get tree() { return tree; },
    get updatesAfterUnmount() { return updatesAfterUnmount; },
    get swipe() { return hosts().find(n => n.element.type === 'Swipeable'); },
    get outer() { return hosts().filter(n => n.element.type === 'Animated.View')[0].element; },
    get inner() { return hosts().filter(n => n.element.type === 'Animated.View')[1].element; },
    measure(height) { this.outer.props.onLayout({ nativeEvent: { layout: { height } } }); flush(); },
    unmount() { dispose(tree); tree = null; unmounted = true; },
  };
}
function baseProps(extra = {}) {
  return { reminder: { id: 'reminder-a', title: 'Original', isCompleted: false },
    children: 'Card', swipeableRefs: { current: new Map() }, ...extra };
}
function values(h) {
  const style = h.inner.props.style;
  return { slide: style.transform[0].translateX, scale: style.transform[1].scaleY,
    opacity: style.opacity };
}
function assertCollapsed(h) {
  assert.equal(h.outer.props.style.overflow, 'hidden');
  assert.equal(h.outer.props.style.height.value, 0);
  assert.equal(h.outer.props.style.marginBottom.value, 0);
  assert.equal(h.inner.props.style.opacity.value, 0);
  assert.equal(h.swipe.element.props.enabled, false);
}

for (const direction of ['left', 'right']) {
  test(`duplicate ${direction} onSwipeableOpen mutates once, including after success`, async () => {
    const h = harness();
    let count = 0;
    const p = baseProps({ [direction === 'right' ? 'onSwipeRight' : 'onSwipeLeft']: () => { count++; } });
    h.render(p);
    const open = h.swipe.element.props.onSwipeableOpen;
    open(direction); open(direction); // same closure, before React can commit state
    h.flush();
    for (const animation of h.animations) await animation.finish();
    assert.equal(count, 1);
    assert.equal(h.animations.length, 1);
    h.swipe.element.props.onSwipeableOpen(direction);
    assert.equal(h.animations.length, 1);
    h.unmount();
  });
}

test('cancelled animation never executes the reminder action', async () => {
  const h = harness();
  let mutations = 0;
  h.render(baseProps({ onSwipeRight: () => mutations++ }));
  h.swipe.element.props.onSwipeableOpen('right'); h.flush();
  await h.animations[0].finish(false);
  assert.equal(mutations, 0);
  assert.deepEqual(h.toasts, []);
  h.unmount();
});

test('unmount stops an active animation and late successful callback cannot mutate', async () => {
  const h = harness();
  let mutations = 0;
  h.render(baseProps({ onSwipeRight: () => mutations++ }));
  h.swipe.element.props.onSwipeableOpen('right'); h.flush();
  const animation = h.animations[0];
  h.unmount();
  await animation.completion;
  // Simulate a native completion already queued when stop/unmount occurred.
  await animation.finish(true);
  assert.equal(mutations, 0);
  assert.equal(animation.stopped, true);
  assert.equal(h.updatesAfterUnmount, 0);
});

for (const platform of ['android', 'ios']) {
  test(`${platform}: measured height collapses and success stays hidden across same-ID parent rerenders`, async () => {
    const h = harness(platform);
    let resolveAction;
    const pending = new Promise(resolve => { resolveAction = resolve; });
    const p = baseProps({ onSwipeRight: () => pending });
    h.render(p);
    assert.equal(h.outer.props.style.height, undefined);
    h.measure(180);
    const originalValues = values(h);
    h.swipe.element.props.onSwipeableOpen('right'); h.flush();
    assert.equal(h.outer.props.style.height.value, 180, 'collapse starts at measured height');
    h.measure(77); // collapse-generated layout must not overwrite the measured height
    assert.equal(h.outer.props.style.height.value, 180);
    const completion = h.animations[0].finish();
    await Promise.resolve();
    assertCollapsed(h);
    h.render({ ...p, reminder: { ...p.reminder, title: 'Parent update while saving' }, children: 'Updated card' });
    assertCollapsed(h);
    resolveAction(); await completion; h.flush();
    h.render({ ...p, reminder: { ...p.reminder, isCompleted: true }, children: 'Completed card' });
    assertCollapsed(h);
    const nextValues = values(h);
    for (const name of Object.keys(originalValues)) assert.equal(nextValues[name], originalValues[name]);
    assert.equal(nextValues.slide.value, 400);
    assert.equal(nextValues.scale.value, 0.95);
    h.unmount();
  });
}

for (const failure of ['rejection', 'synchronous throw']) {
  test(`${failure} restores values, resets Swipeable, shows toast, and allows retry`, async () => {
    const h = harness();
    let calls = 0;
    const p = baseProps({ onSwipeLeft: () => {
      calls++;
      if (calls > 1) return;
      if (failure === 'rejection') {
        const rejected = Promise.reject(new Error('save failed'));
        void rejected.catch(() => {}); // keep ignored HEAD rejection observed
        return rejected;
      }
      throw new Error('save failed');
    } });
    h.render(p); h.measure(190);
    const instance = h.swipe.instance;
    h.swipe.element.props.onSwipeableOpen('left'); h.flush();
    await h.animations[0].finish(); h.flush();
    const v = values(h);
    assert.equal(v.slide.value, 0);
    assert.equal(v.opacity.value, 1);
    assert.equal(v.scale.value, 1);
    assert.equal(h.outer.props.style.height, undefined);
    assert.equal(h.outer.props.style.marginBottom, 5);
    assert.equal(h.outer.props.style.overflow, 'visible');
    assert.equal(h.swipe.element.props.enabled, true);
    assert.equal(instance.resets, 1);
    assert.deepEqual(h.toasts, ['Could not save the reminder change. Please try again.']);
    h.swipe.element.props.onSwipeableOpen('left'); h.flush();
    assert.equal(h.outer.props.style.height.value, 190, 'height value restored to 1');
    await h.animations[1].finish(); h.flush();
    assert.equal(calls, 2);
    assertCollapsed(h);
    h.unmount();
  });
}

test('action rejection after unmount does not reset native values or update state', async () => {
  const h = harness();
  let rejectAction;
  const promise = new Promise((_, reject) => { rejectAction = reject; });
  void promise.catch(() => {}); // HEAD never awaits the action; keep its rejection observed here
  h.render(baseProps({ onSwipeRight: () => promise }));
  h.swipe.element.props.onSwipeableOpen('right'); h.flush();
  const v = values(h);
  const instance = h.swipe.instance;
  const completion = h.animations[0].finish();
  await Promise.resolve();
  h.unmount();
  rejectAction(new Error('late failure'));
  await completion;
  assert.equal(h.updatesAfterUnmount, 0);
  assert.equal(instance.resets, 0);
  assert.equal(v.opacity.value, 0);
  assert.equal(v.slide.value, 400);
  assert.equal(h.toasts.length, 1);
});

test('reminder ID keys the inner component and recycled ID receives fresh state and refs', async () => {
  const h = harness();
  const p = baseProps({ onSwipeRight: () => {} });
  h.render(p);
  assert.equal(h.tree.children[0].element.key, p.reminder.id, 'outer wrapper keys its inner component');
  assert.equal(typeof h.tree.children[0].element.type, 'function');
  const oldInnerType = h.tree.children[0].element.type;
  const oldValue = values(h).opacity;
  h.swipe.element.props.onSwipeableOpen('right'); h.flush();
  await h.animations[0].finish(); h.flush();
  assertCollapsed(h);
  h.render({ ...p, reminder: { ...p.reminder, id: 'reminder-b' } });
  assert.equal(h.tree.children[0].element.type, oldInnerType);
  assert.equal(h.tree.children[0].element.key, 'reminder-b');
  assert.notEqual(values(h).opacity, oldValue);
  assert.equal(values(h).opacity.value, 1);
  assert.equal(h.outer.props.style.height, undefined);
  assert.equal(h.swipe.element.props.enabled, true);
  assert.equal(p.swipeableRefs.current.has('reminder-a'), false);
  assert.equal(p.swipeableRefs.current.get('reminder-b'), h.swipe.instance);
  h.unmount();
  assert.equal(p.swipeableRefs.current.size, 0);
});

test('ref null deregisters its ID without deleting another row; unmount also deregisters', () => {
  const h = harness();
  const p = baseProps();
  const other = { close() {} };
  p.swipeableRefs.current.set('other', other);
  h.render(p);
  assert.equal(p.swipeableRefs.current.get(p.reminder.id), h.swipe.instance);
  const ref = h.swipe.element.props.ref;
  ref(null);
  assert.equal(p.swipeableRefs.current.has(p.reminder.id), false);
  assert.equal(p.swipeableRefs.current.get('other'), other);
  ref(h.swipe.instance);
  h.unmount();
  assert.equal(p.swipeableRefs.current.has(p.reminder.id), false);
  assert.equal(p.swipeableRefs.current.get('other'), other);
});
