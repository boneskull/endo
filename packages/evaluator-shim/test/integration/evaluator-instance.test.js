import tap from 'tap';
import sinon from 'sinon';
import Evaluator from '../../src/main.js';
import stubFunctionConstructors from '../stubFunctionConstructors.js';

const { test } = tap;

test('Evaluator instance', t => {
  t.plan(9);

  // Mimic repairFunctions.
  stubFunctionConstructors(sinon);

  const e = new Evaluator();

  t.equals(typeof e, 'object', 'typeof');
  t.ok(e instanceof Evaluator, 'instanceof');
  t.equals(e.constructor, Evaluator, 'function Evaluator() { [shim code] }');

  t.equals(
    Object.getPrototypeOf(e),
    Evaluator.prototype,
    'Object.getPrototypeOf()',
  );
  t.ok(
    // eslint-disable-next-line no-prototype-builtins
    Evaluator.prototype.isPrototypeOf(e),
    'Evaluator.prototype.isPrototypeOf()',
  );

  t.equals(e.toString(), '[object Evaluator]', 'toString()');
  t.equals(e[Symbol.toStringTag], undefined, '"Symbol.toStringTag" property');

  t.deepEqual(Reflect.ownKeys(e), [], 'static properties');
  t.deepEqual(
    Reflect.ownKeys(Object.getPrototypeOf(e)).sort(),
    ['constructor', 'evaluate', 'global', 'toString'].sort(),
    'prototype properties',
  );

  sinon.restore();
});