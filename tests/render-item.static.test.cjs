/* global __dirname */
'use strict';

// Parse actual app source, without loading Expo or executing the screen.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const filename = path.join(root, 'app', 'index.tsx');
const source = process.env.SWIPE_TEST_SOURCE === 'head'
  ? execFileSync('git', ['show', 'HEAD:app/index.tsx'], { cwd: root, encoding: 'utf8' })
  : fs.readFileSync(filename, 'utf8');
const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function collect(rootNode, predicate) {
  const result = [];
  function visit(node) {
    if (predicate(node)) result.push(node);
    ts.forEachChild(node, visit);
  }
  visit(rootNode);
  return result;
}
const named = (node, name) => node && ts.isIdentifier(node) && node.text === name;

test('FlashList renderItem calls ordinary renderReminderCard, not a nested component type', () => {
  assert.equal(ast.parseDiagnostics.length, 0, 'screen must parse as TSX');
  const declarations = collect(ast, node => ts.isVariableDeclaration(node) && named(node.name, 'renderReminderCard'));
  assert.equal(declarations.length, 1, 'expected one renderReminderCard helper');
  assert.ok(ts.isArrowFunction(declarations[0].initializer) || ts.isFunctionExpression(declarations[0].initializer),
    'helper must be an ordinary function, not memo(...) or another component factory');
  const lists = collect(ast, node => (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && named(node.tagName, 'FlashList'));
  assert.ok(lists.length > 0, 'expected a FlashList');
  for (const list of lists) {
    const attr = list.attributes.properties.find(node => ts.isJsxAttribute(node) && named(node.name, 'renderItem'));
    assert.ok(attr && ts.isJsxExpression(attr.initializer), 'expected an explicit renderItem expression');
    const callback = attr.initializer.expression;
    assert.ok(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback), 'renderItem must be a callback');
    // Current concise arrow returns the helper call directly: no intermediate
    // nested component identity is introduced by the list renderer.
    let body = callback.body;
    while (ts.isParenthesizedExpression(body)) body = body.expression;
    assert.ok(ts.isCallExpression(body) && named(body.expression, 'renderReminderCard'),
      'renderItem must return renderReminderCard(...) directly, not <ReminderCard .../>');
  }
  const jsxHelperUses = collect(ast, node => (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && named(node.tagName, 'renderReminderCard'));
  assert.equal(jsxHelperUses.length, 0, 'helper cannot be used as a JSX component type');
});
