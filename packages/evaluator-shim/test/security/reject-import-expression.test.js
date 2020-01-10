import tap from 'tap';
import sinon from 'sinon';
import Evaluator from '../../src/main.js';
import stubFunctionConstructors from '../stubFunctionConstructors.js';

const { test } = tap;

test('reject import expressions in evaluate', t => {
  t.plan(9);

  // Mimic repairFunctions.
  stubFunctionConstructors(sinon);

  const e = new Evaluator();

  function wrap(s) {
    return `
      function name() {
        ${s};
        return a;
      }`;
  }

  const safe = `const a = 1`;
  const safe2 = `const a = notimport('evil')`;
  const safe3 = `const a = importnot('evil')`;

  const obvious = `const a = import('evil')`;
  const whitespace = `const a = import ('evil')`;
  const comment = `const a = import/*hah*/('evil')`;
  const doubleSlashComment = `const a = import // hah\n('evil')`;
  const newline = `const a = import\n('evil')`;
  const multiline = `\nimport('a')\nimport('b')`;

  t.doesNotThrow(() => e.evaluate(wrap(safe)), SyntaxError, 'safe');
  t.doesNotThrow(() => e.evaluate(wrap(safe2)), SyntaxError, 'safe2');
  t.doesNotThrow(() => e.evaluate(wrap(safe3)), SyntaxError, 'safe3');
  t.throws(() => e.evaluate(wrap(obvious)), SyntaxError, 'obvious');
  t.throws(() => e.evaluate(wrap(whitespace)), SyntaxError, 'whitespace');
  t.throws(() => e.evaluate(wrap(comment)), SyntaxError, 'comment');
  t.throws(
    () => e.evaluate(wrap(doubleSlashComment)),
    SyntaxError,
    'doubleSlashComment',
  );
  t.throws(() => e.evaluate(wrap(newline)), SyntaxError, 'newline');
  t.throws(() => e.evaluate(wrap(multiline)), SyntaxError, 'multiline');

  sinon.restore();
});

test('reject import expressions in Function', t => {
  t.plan(9);

  // Mimic repairFunctions.
  stubFunctionConstructors(sinon);

  const e = new Evaluator();

  function wrap(s) {
    return `new Function("${s}; return a;")`;
  }

  const safe = `const a = 1`;
  const safe2 = `const a = notimport('evil')`;
  const safe3 = `const a = importnot('evil')`;

  const obvious = `const a = import('evil')`;
  const whitespace = `const a = import ('evil')`;
  const comment = `const a = import/*hah*/('evil')`;
  const doubleSlashComment = `const a = import // hah\n('evil')`;
  const newline = `const a = import\n('evil')`;
  const multiline = `\nimport('a')\nimport('b')`;

  t.doesNotThrow(() => e.evaluate(wrap(safe)), SyntaxError, 'safe');
  t.doesNotThrow(() => e.evaluate(wrap(safe2)), SyntaxError, 'safe2');
  t.doesNotThrow(() => e.evaluate(wrap(safe3)), SyntaxError, 'safe3');
  t.throws(() => e.evaluate(wrap(obvious)), SyntaxError, 'obvious');
  t.throws(() => e.evaluate(wrap(whitespace)), SyntaxError, 'whitespace');
  t.throws(() => e.evaluate(wrap(comment)), SyntaxError, 'comment');
  t.throws(
    () => e.evaluate(wrap(doubleSlashComment)),
    SyntaxError,
    'doubleSlashComment',
  );
  t.throws(() => e.evaluate(wrap(newline)), SyntaxError, 'newline');
  t.throws(() => e.evaluate(wrap(multiline)), SyntaxError, 'multiline');

  sinon.restore();
});