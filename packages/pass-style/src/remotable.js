/// <reference types="ses"/>

import {
  assertChecker,
  canBeMethod,
  hasOwnPropertyOf,
  PASS_STYLE,
  checkTagRecord,
  checkFunctionTagRecord,
  isObject,
  getTag,
} from './passStyle-helpers.js';

/** @typedef {import('./types.js').Checker} Checker */
/** @typedef {import('./types.js').InterfaceSpec} InterfaceSpec */
/** @typedef {import('./types.js').MarshalGetInterfaceOf} MarshalGetInterfaceOf */
/** @typedef {import('./internal-types.js').PassStyleHelper} PassStyleHelper */
/** @typedef {import('./types.js').RemotableObject} Remotable */

const { details: X, Fail, quote: q } = assert;
const { ownKeys } = Reflect;
const { isArray } = Array;
const {
  getPrototypeOf,
  isFrozen,
  prototype: objectPrototype,
  getOwnPropertyDescriptors,
} = Object;

/**
 * @param {InterfaceSpec} iface
 * @param {Checker} [check]
 */
const checkIface = (iface, check) => {
  const reject = !!check && (details => check(false, details));
  return (
    // TODO other possible ifaces, once we have third party veracity
    (typeof iface === 'string' ||
      (reject &&
        reject(
          X`For now, interface ${iface} must be a string; unimplemented`,
        ))) &&
    (iface === 'Remotable' ||
      iface.startsWith('Alleged: ') ||
      iface.startsWith('DebugName: ') ||
      (reject &&
        reject(
          X`For now, iface ${q(
            iface,
          )} must be "Remotable" or begin with "Alleged: " or "DebugName: "; unimplemented`,
        )))
  );
};

/**
 * An `iface` must be pure. Right now it must be a string, which is pure.
 * Later we expect to include some other values that qualify as `PureData`,
 * which is a pass-by-copy superstructure ending only in primitives or
 * empty pass-by-copy composites. No remotables, promises, or errors.
 * We *assume* for now that the pass-by-copy superstructure contains no
 * proxies.
 *
 * @param {InterfaceSpec} iface
 */
export const assertIface = iface => checkIface(iface, assertChecker);
harden(assertIface);

/**
 * @param {object | Function} original
 * @param {Checker} [check]
 * @returns {boolean}
 */
const checkRemotableProtoOf = (original, check) => {
  const reject = !!check && (details => check(false, details));
  isObject(original) ||
    Fail`Remotables must be objects or functions: ${original}`;

  // A valid remotable object must inherit from a "tag record" -- a
  // plain-object prototype consisting of only
  // a `PASS_STYLE` property with value "remotable" and a suitable `Symbol.toStringTag`
  // property. The remotable could inherit directly from such a tag record, or
  // it could inherit from another valid remotable, that therefore itself
  // inherits directly or indirectly from such a tag record.
  //
  // TODO: It would be nice to typedef this shape, but we can't declare a type
  // with PASS_STYLE from JSDoc.
  //
  // @type {{ [PASS_STYLE]: string,
  //          [Symbol.toStringTag]: string,
  //        }}
  //
  const proto = getPrototypeOf(original);
  if (proto === objectPrototype || proto === null) {
    return (
      reject &&
      reject(X`Remotables must be explicitly declared: ${q(original)}`)
    );
  }

  if (typeof original === 'object') {
    const protoProto = getPrototypeOf(proto);
    if (protoProto !== objectPrototype && protoProto !== null) {
      // eslint-disable-next-line no-use-before-define
      return checkRemotable(proto, check);
    }
    if (!checkTagRecord(proto, 'remotable', check)) {
      return false;
    }
  } else if (typeof original === 'function') {
    if (!checkFunctionTagRecord(proto, 'remotable', check)) {
      return false;
    }
  }

  // Typecasts needed due to https://github.com/microsoft/TypeScript/issues/1863
  const passStyleKey = /** @type {unknown} */ (PASS_STYLE);
  const tagKey = /** @type {unknown} */ (Symbol.toStringTag);
  const {
    // checkTagRecord already verified PASS_STYLE and Symbol.toStringTag own data properties.
    [/** @type {string} */ (passStyleKey)]: _passStyleDesc,
    [/** @type {string} */ (tagKey)]: { value: iface },
    ...restDescs
  } = getOwnPropertyDescriptors(proto);

  return (
    (ownKeys(restDescs).length === 0 ||
      (reject &&
        reject(
          X`Unexpected properties on Remotable Proto ${ownKeys(restDescs)}`,
        ))) &&
    checkIface(iface, check)
  );
};

/**
 * Keep a weak set of confirmed remotables for marshal performance
 * (without which we would incur a redundant verification in
 * getInterfaceOf).
 * We don't remember rejections because they are possible to correct
 * with e.g. `harden`.
 *
 * @type {WeakSet<Remotable>}
 */
const confirmedRemotables = new WeakSet();

/**
 * @param {Remotable} val
 * @param {Checker} [check]
 * @returns {boolean}
 */
const checkRemotable = (val, check) => {
  if (confirmedRemotables.has(val)) {
    return true;
  }
  const reject = !!check && (details => check(false, details));
  if (!isFrozen(val)) {
    return reject && reject(X`cannot serialize non-frozen objects like ${val}`);
  }
  // eslint-disable-next-line no-use-before-define
  if (!RemotableHelper.canBeValid(val, check)) {
    return false;
  }
  const result = checkRemotableProtoOf(val, check);
  if (result) {
    confirmedRemotables.add(val);
  }
  return result;
};

/** @type {MarshalGetInterfaceOf} */
export const getInterfaceOf = val => {
  if (
    !isObject(val) ||
    val[PASS_STYLE] !== 'remotable' ||
    !checkRemotable(val)
  ) {
    return undefined;
  }
  return getTag(val);
};
harden(getInterfaceOf);

/**
 *
 * @type {PassStyleHelper}
 */
export const RemotableHelper = harden({
  styleName: 'remotable',

  canBeValid: (candidate, check = undefined) => {
    const reject = !!check && (details => check(false, details));
    const validType =
      (isObject(candidate) ||
        (reject &&
          reject(X`cannot serialize non-objects as Remotable ${candidate}`))) &&
      (!isArray(candidate) ||
        (reject &&
          reject(X`cannot serialize arrays as Remotable ${candidate}`)));
    if (!validType) {
      return false;
    }

    const descs = getOwnPropertyDescriptors(candidate);
    if (typeof candidate === 'object') {
      // Every own property (regardless of enumerability)
      // must have a function value.
      return ownKeys(descs).every(key => {
        return (
          // Typecast needed due to https://github.com/microsoft/TypeScript/issues/1863
          (hasOwnPropertyOf(descs[/** @type {string} */ (key)], 'value') ||
            (reject &&
              reject(
                X`cannot serialize Remotables with accessors like ${q(
                  String(key),
                )} in ${candidate}`,
              ))) &&
          ((key === Symbol.toStringTag && checkIface(candidate[key], check)) ||
            ((canBeMethod(candidate[key]) ||
              (reject &&
                reject(
                  X`cannot serialize Remotables with non-methods like ${q(
                    String(key),
                  )} in ${candidate}`,
                ))) &&
              (key !== PASS_STYLE ||
                (reject &&
                  reject(X`A pass-by-remote cannot shadow ${q(PASS_STYLE)}`)))))
        );
      });
    } else if (typeof candidate === 'function') {
      // Far functions cannot be methods, and cannot have methods.
      // They must have exactly expected `.name` and `.length` properties
      const {
        name: nameDesc,
        length: lengthDesc,
        // @ts-ignore TS doesn't like symbols as computed indexes??
        [Symbol.toStringTag]: toStringTagDesc,
        ...restDescs
      } = descs;
      const restKeys = ownKeys(restDescs);
      return (
        ((nameDesc && typeof nameDesc.value === 'string') ||
          (reject &&
            reject(X`Far function name must be a string, in ${candidate}`))) &&
        ((lengthDesc && typeof lengthDesc.value === 'number') ||
          (reject &&
            reject(
              X`Far function length must be a number, in ${candidate}`,
            ))) &&
        (toStringTagDesc === undefined ||
          ((typeof toStringTagDesc.value === 'string' ||
            (reject &&
              reject(
                X`Far function @@toStringTag must be a string, in ${candidate}`,
              ))) &&
            checkIface(toStringTagDesc.value, check))) &&
        (restKeys.length === 0 ||
          (reject &&
            reject(
              X`Far functions unexpected properties besides .name and .length ${restKeys}`,
            )))
      );
    }
    return reject && reject(X`unrecognized typeof ${candidate}`);
  },

  assertValid: candidate => checkRemotable(candidate, assertChecker),

  every: (_passable, _fn) => true,
});
