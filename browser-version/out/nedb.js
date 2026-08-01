var nedb = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // browser-version/.browser-build/lib/customUtils.js
  var require_customUtils = __commonJS({
    "browser-version/.browser-build/lib/customUtils.js"(exports, module) {
      function randomBytes(size) {
        const bytes = [];
        let r;
        for (let i = 0; i < size; i++) {
          if ((i & 3) === 0) {
            r = Math.random() * 4294967296;
          }
          bytes.push(r >>> ((i & 3) << 3) & 255);
        }
        return bytes;
      }
      function byteArrayToBase64(uint8) {
        const lookup = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        const extraBytes = uint8.length % 3;
        let output = "";
        const tripletToBase64 = (num) => {
          return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
        };
        const length = uint8.length - extraBytes;
        for (let i = 0; i < length; i += 3) {
          const temp2 = (uint8[i] << 16) + (uint8[i + 1] << 8) + uint8[i + 2];
          output += tripletToBase64(temp2);
        }
        let temp;
        switch (extraBytes) {
          case 1:
            temp = uint8[uint8.length - 1];
            output += lookup[temp >> 2];
            output += lookup[temp << 4 & 63];
            output += "==";
            break;
          case 2:
            temp = (uint8[uint8.length - 2] << 8) + uint8[uint8.length - 1];
            output += lookup[temp >> 10];
            output += lookup[temp >> 4 & 63];
            output += lookup[temp << 2 & 63];
            output += "=";
            break;
        }
        return output;
      }
      function uid(len) {
        return byteArrayToBase64(randomBytes(Math.ceil(Math.max(8, len * 2)))).replace(/[+\/]/g, "").slice(0, len);
      }
      module.exports.uid = uid;
    }
  });

  // browser-version/.browser-build/lib/model.js
  var require_model = __commonJS({
    "browser-version/.browser-build/lib/model.js"(exports, module) {
      var modifierFunctions = {};
      var lastStepModifierFunctions = {};
      var comparisonFunctions = {};
      var logicalOperators = {};
      var arrayComparisonFunctions = {};
      function checkKey(k, v) {
        if (typeof k === "number") {
          k = k.toString();
        }
        if (k[0] === "$" && !(k === "$$date" && typeof v === "number") && !(k === "$$deleted" && v === true) && !(k === "$$indexCreated") && !(k === "$$indexRemoved")) {
          throw new Error("Field names cannot begin with the $ character");
        }
        if (k.includes(".")) {
          throw new Error("Field names cannot contain a .");
        }
      }
      function checkObject(obj) {
        if (Array.isArray(obj)) {
          for (const o of obj) {
            checkObject(o);
          }
        }
        if (typeof obj === "object" && obj !== null) {
          for (const k of Object.keys(obj)) {
            checkKey(k, obj[k]);
            checkObject(obj[k]);
          }
        }
      }
      function serialize(obj) {
        return JSON.stringify(obj, function(k, v) {
          checkKey(k, v);
          if (v === void 0) {
            return void 0;
          }
          if (v === null) {
            return null;
          }
          if (typeof this[k]?.getTime === "function") {
            return { $$date: this[k].getTime() };
          }
          return v;
        });
      }
      function deserialize(rawData) {
        return JSON.parse(rawData, (k, v) => {
          if (k === "$$date") {
            return new Date(v);
          }
          if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
            return v;
          }
          if (v?.$$date) {
            return v.$$date;
          }
          return v;
        });
      }
      function deepCopy(obj, strictKeys) {
        if (typeof obj === "boolean" || typeof obj === "number" || typeof obj === "string" || obj === null || obj instanceof Date) {
          return obj;
        }
        if (Array.isArray(obj)) {
          return obj.map((o) => deepCopy(o, strictKeys));
        }
        if (typeof obj === "object") {
          const res = {};
          for (const k of Object.keys(obj)) {
            if (!strictKeys || k[0] !== "$" && !k.includes(".")) {
              res[k] = deepCopy(obj[k], strictKeys);
            }
          }
          return res;
        }
        return void 0;
      }
      function isPrimitiveType(obj) {
        return typeof obj === "boolean" || typeof obj === "number" || typeof obj === "string" || obj === null || obj instanceof Date || Array.isArray(obj);
      }
      function compareNSB(a, b) {
        if (a < b) {
          return -1;
        }
        if (a > b) {
          return 1;
        }
        return 0;
      }
      function compareArrays(a, b) {
        const minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
          const comp = compareThings(a[i], b[i]);
          if (comp !== 0) {
            return comp;
          }
        }
        return compareNSB(a.length, b.length);
      }
      function compareThings(a, b, _compareStrings) {
        const compareStrings = _compareStrings ?? compareNSB;
        if (a === void 0) {
          return b === void 0 ? 0 : -1;
        }
        if (b === void 0) {
          return a === void 0 ? 0 : 1;
        }
        if (a === null) {
          return b === null ? 0 : -1;
        }
        if (b === null) {
          return a === null ? 0 : 1;
        }
        if (typeof a === "number") {
          return typeof b === "number" ? compareNSB(a, b) : -1;
        }
        if (typeof b === "number") {
          return typeof a === "number" ? compareNSB(a, b) : 1;
        }
        if (typeof a === "string") {
          return typeof b === "string" ? compareStrings(a, b) : -1;
        }
        if (typeof b === "string") {
          return typeof a === "string" ? compareStrings(a, b) : 1;
        }
        if (typeof a === "boolean") {
          return typeof b === "boolean" ? compareNSB(a, b) : -1;
        }
        if (typeof b === "boolean") {
          return typeof a === "boolean" ? compareNSB(a, b) : 1;
        }
        if (a instanceof Date) {
          return b instanceof Date ? compareNSB(a.getTime(), b.getTime()) : -1;
        }
        if (b instanceof Date) {
          return a instanceof Date ? compareNSB(a.getTime(), b.getTime()) : 1;
        }
        if (Array.isArray(a)) {
          return Array.isArray(b) ? compareArrays(a, b) : -1;
        }
        if (Array.isArray(b)) {
          return Array.isArray(a) ? compareArrays(a, b) : 1;
        }
        const aKeys = Object.keys(a).sort();
        const bKeys = Object.keys(b).sort();
        const minLen = Math.min(aKeys.length, bKeys.length);
        for (let i = 0; i < minLen; i++) {
          const comp = compareThings(a[aKeys[i]], b[bKeys[i]]);
          if (comp !== 0) {
            return comp;
          }
        }
        return compareNSB(aKeys.length, bKeys.length);
      }
      lastStepModifierFunctions.$set = function(obj, field, value) {
        obj[field] = value;
      };
      lastStepModifierFunctions.$unset = function(obj, field, value) {
        delete obj[field];
      };
      lastStepModifierFunctions.$push = function(obj, field, value) {
        if (!Object.hasOwn(obj, field)) {
          obj[field] = [];
        }
        if (!Array.isArray(obj[field])) {
          throw new Error("Can't $push an element on non-array values");
        }
        if (value !== null && typeof value === "object" && value.$slice && value.$each === void 0) {
          value.$each = [];
        }
        if (value !== null && typeof value === "object" && value.$each) {
          if (Object.keys(value).length >= 3 || Object.keys(value).length === 2 && value.$slice === void 0) {
            throw new Error("Can only use $slice in conjunction with $each when $push to array");
          }
          if (!Array.isArray(value.$each)) {
            throw new Error("$each requires an array value");
          }
          for (const v of value.$each) {
            obj[field].push(v);
          }
          if (value.$slice === void 0 || typeof value.$slice !== "number") {
            return;
          }
          if (value.$slice === 0) {
            obj[field] = [];
          } else {
            const n = obj[field].length;
            let start, end;
            if (value.$slice < 0) {
              start = Math.max(0, n + value.$slice);
              end = n;
            } else {
              start = 0;
              end = Math.min(n, value.$slice);
            }
            obj[field] = obj[field].slice(start, end);
          }
        } else {
          obj[field].push(value);
        }
      };
      lastStepModifierFunctions.$addToSet = function(obj, field, value) {
        if (!Object.hasOwn(obj, field)) {
          obj[field] = [];
        }
        if (!Array.isArray(obj[field])) {
          throw new Error("Can't $addToSet an element on non-array values");
        }
        if (value !== null && typeof value === "object" && value.$each) {
          if (Object.keys(value).length > 1) {
            throw new Error("Can't use another field in conjunction with $each");
          }
          if (!Array.isArray(value.$each)) {
            throw new Error("$each requires an array value");
          }
          for (const v of value.$each) {
            lastStepModifierFunctions.$addToSet(obj, field, v);
          }
        } else {
          let addToSet = true;
          for (const v of obj[field]) {
            if (compareThings(v, value) === 0) {
              addToSet = false;
            }
          }
          if (addToSet) {
            obj[field].push(value);
          }
        }
      };
      lastStepModifierFunctions.$pop = function(obj, field, value) {
        if (!Array.isArray(obj[field])) {
          throw new Error("Can't $pop an element from non-array values");
        }
        if (typeof value !== "number") {
          throw new Error(`${value} isn't an integer, can't use it with $pop`);
        }
        if (value === 0) {
          return;
        }
        if (value > 0) {
          obj[field] = obj[field].slice(0, obj[field].length - 1);
        } else {
          obj[field] = obj[field].slice(1);
        }
      };
      lastStepModifierFunctions.$pull = function(obj, field, value) {
        if (!Array.isArray(obj[field])) {
          throw new Error("Can't $pull an element from non-array values");
        }
        const arr = obj[field];
        for (let i = arr.length - 1; i >= 0; i--) {
          if (match(arr[i], value)) {
            arr.splice(i, 1);
          }
        }
      };
      lastStepModifierFunctions.$inc = function(obj, field, value) {
        if (typeof value !== "number") {
          throw new Error(`${value} must be a number`);
        }
        if (typeof obj[field] !== "number") {
          if (!Object.hasOwn(obj, field)) {
            obj[field] = value;
          } else {
            throw new Error("Don't use the $inc modifier on non-number fields");
          }
        } else {
          obj[field] += value;
        }
      };
      lastStepModifierFunctions.$max = function(obj, field, value) {
        if (obj[field] === void 0) {
          obj[field] = value;
        } else if (value > obj[field]) {
          obj[field] = value;
        }
      };
      lastStepModifierFunctions.$min = function(obj, field, value) {
        if (obj[field] === void 0) {
          obj[field] = value;
        } else if (value < obj[field]) {
          obj[field] = value;
        }
      };
      function createModifierFunction(modifier) {
        return function(obj, field, value) {
          const fieldParts = typeof field === "string" ? field.split(".") : field;
          if (fieldParts.length === 1) {
            lastStepModifierFunctions[modifier](obj, field, value);
          } else {
            if (obj[fieldParts[0]] === void 0) {
              if (modifier === "$unset") {
                return;
              }
              obj[fieldParts[0]] = {};
            }
            modifierFunctions[modifier](obj[fieldParts[0]], fieldParts.slice(1), value);
          }
        };
      }
      for (const modifier of Object.keys(lastStepModifierFunctions)) {
        modifierFunctions[modifier] = createModifierFunction(modifier);
      }
      function modify(obj, updateQuery) {
        const keys = Object.keys(updateQuery);
        const firstChars = keys.map((item) => item[0]);
        const dollarFirstChars = firstChars.filter((c) => c === "$");
        let newDoc, modifiers;
        if (keys.includes("_id") && updateQuery._id !== obj._id) {
          throw new Error("You cannot change a document's _id");
        }
        if (dollarFirstChars.length !== 0 && dollarFirstChars.length !== firstChars.length) {
          throw new Error("You cannot mix modifiers and normal fields");
        }
        if (dollarFirstChars.length === 0) {
          newDoc = deepCopy(updateQuery);
          newDoc._id = obj._id;
        } else {
          modifiers = keys;
          newDoc = deepCopy(obj);
          for (const m of modifiers) {
            if (!modifierFunctions[m]) {
              throw new Error(`Unknown modifier ${m}`);
            }
            if (typeof updateQuery[m] !== "object") {
              throw new Error(`Modifier ${m}'s argument must be an object`);
            }
            for (const k of Object.keys(updateQuery[m])) {
              modifierFunctions[m](newDoc, k, updateQuery[m][k]);
            }
          }
        }
        checkObject(newDoc);
        if (obj._id !== newDoc._id) {
          throw new Error("You can't change a document's _id");
        }
        return newDoc;
      }
      function getDotValue(obj, field) {
        const fieldParts = typeof field === "string" ? field.split(".") : field;
        if (!obj) {
          return void 0;
        }
        if (fieldParts.length === 0) {
          return obj;
        }
        if (fieldParts.length === 1) {
          return obj[fieldParts[0]];
        }
        if (Array.isArray(obj[fieldParts[0]])) {
          const i = parseInt(fieldParts[1], 10);
          if (typeof i === "number" && !isNaN(i)) {
            return getDotValue(obj[fieldParts[0]][i], fieldParts.slice(2));
          }
          const objs = [];
          for (let j = 0; j < obj[fieldParts[0]].length; j++) {
            objs.push(getDotValue(obj[fieldParts[0]][j], fieldParts.slice(1)));
          }
          return objs;
        } else {
          return getDotValue(obj[fieldParts[0]], fieldParts.slice(1));
        }
      }
      function areThingsEqual(a, b) {
        if (a === null || typeof a === "string" || typeof a === "boolean" || typeof a === "number" || b === null || typeof b === "string" || typeof b === "boolean" || typeof b === "number") {
          return a === b;
        }
        if (a instanceof Date || b instanceof Date) {
          return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
        }
        if (!(Array.isArray(a) && Array.isArray(b)) && (Array.isArray(a) || Array.isArray(b)) || a === void 0 || b === void 0) {
          return false;
        }
        let aKeys, bKeys;
        try {
          aKeys = Object.keys(a);
          bKeys = Object.keys(b);
        } catch (e) {
          return false;
        }
        if (aKeys.length !== bKeys.length) {
          return false;
        }
        for (const k of aKeys) {
          if (!bKeys.includes(k)) {
            return false;
          }
          if (!areThingsEqual(a[k], b[k])) {
            return false;
          }
        }
        return true;
      }
      function areComparable(a, b) {
        if (typeof a !== "string" && typeof a !== "number" && !(a instanceof Date) && typeof b !== "string" && typeof b !== "number" && !(b instanceof Date)) {
          return false;
        }
        if (typeof a !== typeof b) {
          return false;
        }
        return true;
      }
      comparisonFunctions.$lt = function(a, b) {
        return areComparable(a, b) && a < b;
      };
      comparisonFunctions.$lte = function(a, b) {
        return areComparable(a, b) && a <= b;
      };
      comparisonFunctions.$gt = function(a, b) {
        return areComparable(a, b) && a > b;
      };
      comparisonFunctions.$gte = function(a, b) {
        return areComparable(a, b) && a >= b;
      };
      comparisonFunctions.$ne = function(a, b) {
        if (a === void 0) {
          return true;
        }
        return !areThingsEqual(a, b);
      };
      comparisonFunctions.$in = function(a, b) {
        if (!Array.isArray(b)) {
          throw new Error("$in operator called with a non-array");
        }
        for (const item of b) {
          if (areThingsEqual(a, item)) {
            return true;
          }
        }
        return false;
      };
      comparisonFunctions.$nin = function(a, b) {
        if (!Array.isArray(b)) {
          throw new Error("$nin operator called with a non-array");
        }
        return !comparisonFunctions.$in(a, b);
      };
      comparisonFunctions.$regex = function(a, b) {
        if (!(b instanceof RegExp)) {
          throw new Error("$regex operator called with non regular expression");
        }
        if (typeof a !== "string") {
          return false;
        }
        return b.test(a);
      };
      comparisonFunctions.$exists = function(value, exists) {
        if (exists || exists === "") {
          exists = true;
        } else {
          exists = false;
        }
        if (value === void 0) {
          return !exists;
        }
        return exists;
      };
      comparisonFunctions.$size = function(obj, value) {
        if (!Array.isArray(obj)) {
          return false;
        }
        if (value % 1 !== 0) {
          throw new Error("$size operator called without an integer");
        }
        return obj.length === value;
      };
      comparisonFunctions.$elemMatch = function(obj, value) {
        if (!Array.isArray(obj)) {
          return false;
        }
        for (let i = obj.length - 1; i >= 0; i--) {
          if (match(obj[i], value)) {
            return true;
          }
        }
        return false;
      };
      arrayComparisonFunctions.$size = true;
      arrayComparisonFunctions.$elemMatch = true;
      logicalOperators.$or = function(obj, query) {
        if (!Array.isArray(query)) {
          throw new Error("$or operator used without an array");
        }
        for (const q of query) {
          if (match(obj, q)) {
            return true;
          }
        }
        return false;
      };
      logicalOperators.$and = function(obj, query) {
        if (!Array.isArray(query)) {
          throw new Error("$and operator used without an array");
        }
        for (const q of query) {
          if (!match(obj, q)) {
            return false;
          }
        }
        return true;
      };
      logicalOperators.$not = function(obj, query) {
        return !match(obj, query);
      };
      logicalOperators.$where = function(obj, fn) {
        if (typeof fn !== "function") {
          throw new Error("$where operator used without a function");
        }
        const result = fn.call(obj);
        if (typeof result !== "boolean") {
          throw new Error("$where function must return boolean");
        }
        return result;
      };
      function match(obj, query) {
        const queryKeys = Object.keys(query);
        if (isPrimitiveType(obj) || isPrimitiveType(query)) {
          return matchQueryPart({ needAKey: obj }, "needAKey", query);
        }
        for (const queryKey of queryKeys) {
          const queryValue = query[queryKey];
          if (queryKey[0] === "$") {
            if (!logicalOperators[queryKey]) {
              throw new Error(`Unknown logical operator ${queryKey}`);
            }
            if (!logicalOperators[queryKey](obj, queryValue)) {
              return false;
            }
          } else {
            if (!matchQueryPart(obj, queryKey, queryValue)) {
              return false;
            }
          }
        }
        return true;
      }
      function matchQueryPart(obj, queryKey, queryValue, treatObjAsValue) {
        const objValue = getDotValue(obj, queryKey);
        let keys, firstChars, dollarFirstChars;
        if (Array.isArray(objValue) && !treatObjAsValue) {
          if (Array.isArray(queryValue)) {
            return matchQueryPart(obj, queryKey, queryValue, true);
          }
          if (queryValue !== null && typeof queryValue === "object" && !(queryValue instanceof RegExp)) {
            keys = Object.keys(queryValue);
            for (const k of keys) {
              if (arrayComparisonFunctions[k]) {
                return matchQueryPart(obj, queryKey, queryValue, true);
              }
            }
          }
          for (const item of objValue) {
            if (matchQueryPart({ k: item }, "k", queryValue)) {
              return true;
            }
          }
          return false;
        }
        if (queryValue !== null && typeof queryValue === "object" && !(queryValue instanceof RegExp) && !Array.isArray(queryValue)) {
          keys = Object.keys(queryValue);
          firstChars = keys.map((item) => item[0]);
          dollarFirstChars = firstChars.filter((c) => c === "$");
          if (dollarFirstChars.length !== 0 && dollarFirstChars.length !== firstChars.length) {
            throw new Error("You cannot mix operators and normal fields");
          }
          if (dollarFirstChars.length > 0) {
            for (const k of keys) {
              if (!comparisonFunctions[k]) {
                throw new Error(`Unknown comparison function ${k}`);
              }
              if (!comparisonFunctions[k](objValue, queryValue[k])) {
                return false;
              }
            }
            return true;
          }
        }
        if (queryValue instanceof RegExp) {
          return comparisonFunctions.$regex(objValue, queryValue);
        }
        if (!areThingsEqual(objValue, queryValue)) {
          return false;
        }
        return true;
      }
      module.exports.serialize = serialize;
      module.exports.deserialize = deserialize;
      module.exports.deepCopy = deepCopy;
      module.exports.checkObject = checkObject;
      module.exports.isPrimitiveType = isPrimitiveType;
      module.exports.modify = modify;
      module.exports.getDotValue = getDotValue;
      module.exports.match = match;
      module.exports.areThingsEqual = areThingsEqual;
      module.exports.compareThings = compareThings;
    }
  });

  // browser-version/.browser-build/lib/executor.js
  var require_executor = __commonJS({
    "browser-version/.browser-build/lib/executor.js"(exports, module) {
      function invokeUserCallback(fn, args) {
        try {
          fn.apply(null, args);
        } catch (err) {
          process.nextTick(function() {
            throw err;
          });
        }
      }
      var Executor = class {
        constructor() {
          this.buffer = [];
          this.ready = false;
          this.queueRunning = false;
          this.queue = [];
        }
        /**
         * Internal: process the queue sequentially
         */
        _processQueue() {
          if (this.queueRunning) {
            return;
          }
          this.queueRunning = true;
          const runNext = () => {
            if (this.queue.length === 0) {
              this.queueRunning = false;
              return;
            }
            const task = this.queue.shift();
            const args = [...task.arguments];
            const lastArg = args[args.length - 1];
            const complete = () => process.nextTick(runNext);
            if (typeof lastArg === "function") {
              args[args.length - 1] = function(...cbArgs) {
                invokeUserCallback(lastArg, cbArgs);
                complete();
              };
            } else if (!lastArg && args.length !== 0) {
              args[args.length - 1] = function() {
                complete();
              };
            } else {
              args.push(function() {
                complete();
              });
            }
            task.fn.apply(task.this, args);
          };
          runNext();
        }
        /**
         * If executor is ready, queue task (and process it immediately if executor was idle)
         * If not, buffer task for later processing
         * @param {Object} task
         * task.this - Object to use as this
         * task.fn - Function to execute
         * task.arguments - Array of arguments
         * @param {Boolean} forceQueuing Optional (defaults to false) force executor to queue task even if it is not ready
         */
        push(task, forceQueuing) {
          if (this.ready || forceQueuing) {
            this.queue.push(task);
            this._processQueue();
          } else {
            this.buffer.push(task);
          }
        }
        /**
         * Queue all tasks in buffer (in the same order they came in)
         * Automatically sets executor as ready
         */
        processBuffer() {
          this.ready = true;
          this.queue.push(...this.buffer);
          this.buffer = [];
          this._processQueue();
        }
      };
      module.exports = Executor;
    }
  });

  // node_modules/binary-search-tree/lib/customUtils.js
  var require_customUtils2 = __commonJS({
    "node_modules/binary-search-tree/lib/customUtils.js"(exports, module) {
      function getRandomArray(n) {
        var res, next;
        if (n === 0) {
          return [];
        }
        if (n === 1) {
          return [0];
        }
        res = getRandomArray(n - 1);
        next = Math.floor(Math.random() * n);
        res.splice(next, 0, n - 1);
        return res;
      }
      module.exports.getRandomArray = getRandomArray;
      function defaultCompareKeysFunction(a, b) {
        if (a < b) {
          return -1;
        }
        if (a > b) {
          return 1;
        }
        if (a === b) {
          return 0;
        }
        var err = new Error("Couldn't compare elements");
        err.a = a;
        err.b = b;
        throw err;
      }
      module.exports.defaultCompareKeysFunction = defaultCompareKeysFunction;
      function defaultCheckValueEquality(a, b) {
        return a === b;
      }
      module.exports.defaultCheckValueEquality = defaultCheckValueEquality;
    }
  });

  // node_modules/binary-search-tree/lib/bst.js
  var require_bst = __commonJS({
    "node_modules/binary-search-tree/lib/bst.js"(exports, module) {
      var customUtils = require_customUtils2();
      function BinarySearchTree(options) {
        options = options || {};
        this.left = null;
        this.right = null;
        this.parent = options.parent !== void 0 ? options.parent : null;
        if (options.hasOwnProperty("key")) {
          this.key = options.key;
        }
        this.data = options.hasOwnProperty("value") ? [options.value] : [];
        this.unique = options.unique || false;
        this.compareKeys = options.compareKeys || customUtils.defaultCompareKeysFunction;
        this.checkValueEquality = options.checkValueEquality || customUtils.defaultCheckValueEquality;
      }
      BinarySearchTree.prototype.getMaxKeyDescendant = function() {
        if (this.right) {
          return this.right.getMaxKeyDescendant();
        } else {
          return this;
        }
      };
      BinarySearchTree.prototype.getMaxKey = function() {
        return this.getMaxKeyDescendant().key;
      };
      BinarySearchTree.prototype.getMinKeyDescendant = function() {
        if (this.left) {
          return this.left.getMinKeyDescendant();
        } else {
          return this;
        }
      };
      BinarySearchTree.prototype.getMinKey = function() {
        return this.getMinKeyDescendant().key;
      };
      BinarySearchTree.prototype.checkAllNodesFullfillCondition = function(test) {
        if (!this.hasOwnProperty("key")) {
          return;
        }
        test(this.key, this.data);
        if (this.left) {
          this.left.checkAllNodesFullfillCondition(test);
        }
        if (this.right) {
          this.right.checkAllNodesFullfillCondition(test);
        }
      };
      BinarySearchTree.prototype.checkNodeOrdering = function() {
        var self2 = this;
        if (!this.hasOwnProperty("key")) {
          return;
        }
        if (this.left) {
          this.left.checkAllNodesFullfillCondition(function(k) {
            if (self2.compareKeys(k, self2.key) >= 0) {
              throw new Error("Tree with root " + self2.key + " is not a binary search tree");
            }
          });
          this.left.checkNodeOrdering();
        }
        if (this.right) {
          this.right.checkAllNodesFullfillCondition(function(k) {
            if (self2.compareKeys(k, self2.key) <= 0) {
              throw new Error("Tree with root " + self2.key + " is not a binary search tree");
            }
          });
          this.right.checkNodeOrdering();
        }
      };
      BinarySearchTree.prototype.checkInternalPointers = function() {
        if (this.left) {
          if (this.left.parent !== this) {
            throw new Error("Parent pointer broken for key " + this.key);
          }
          this.left.checkInternalPointers();
        }
        if (this.right) {
          if (this.right.parent !== this) {
            throw new Error("Parent pointer broken for key " + this.key);
          }
          this.right.checkInternalPointers();
        }
      };
      BinarySearchTree.prototype.checkIsBST = function() {
        this.checkNodeOrdering();
        this.checkInternalPointers();
        if (this.parent) {
          throw new Error("The root shouldn't have a parent");
        }
      };
      BinarySearchTree.prototype.getNumberOfKeys = function() {
        var res;
        if (!this.hasOwnProperty("key")) {
          return 0;
        }
        res = 1;
        if (this.left) {
          res += this.left.getNumberOfKeys();
        }
        if (this.right) {
          res += this.right.getNumberOfKeys();
        }
        return res;
      };
      BinarySearchTree.prototype.createSimilar = function(options) {
        options = options || {};
        options.unique = this.unique;
        options.compareKeys = this.compareKeys;
        options.checkValueEquality = this.checkValueEquality;
        return new this.constructor(options);
      };
      BinarySearchTree.prototype.createLeftChild = function(options) {
        var leftChild = this.createSimilar(options);
        leftChild.parent = this;
        this.left = leftChild;
        return leftChild;
      };
      BinarySearchTree.prototype.createRightChild = function(options) {
        var rightChild = this.createSimilar(options);
        rightChild.parent = this;
        this.right = rightChild;
        return rightChild;
      };
      BinarySearchTree.prototype.insert = function(key, value) {
        if (!this.hasOwnProperty("key")) {
          this.key = key;
          this.data.push(value);
          return;
        }
        if (this.compareKeys(this.key, key) === 0) {
          if (this.unique) {
            var err = new Error("Can't insert key " + key + ", it violates the unique constraint");
            err.key = key;
            err.errorType = "uniqueViolated";
            throw err;
          } else {
            this.data.push(value);
          }
          return;
        }
        if (this.compareKeys(key, this.key) < 0) {
          if (this.left) {
            this.left.insert(key, value);
          } else {
            this.createLeftChild({ key, value });
          }
        } else {
          if (this.right) {
            this.right.insert(key, value);
          } else {
            this.createRightChild({ key, value });
          }
        }
      };
      BinarySearchTree.prototype.search = function(key) {
        if (!this.hasOwnProperty("key")) {
          return [];
        }
        if (this.compareKeys(this.key, key) === 0) {
          return this.data;
        }
        if (this.compareKeys(key, this.key) < 0) {
          if (this.left) {
            return this.left.search(key);
          } else {
            return [];
          }
        } else {
          if (this.right) {
            return this.right.search(key);
          } else {
            return [];
          }
        }
      };
      BinarySearchTree.prototype.getLowerBoundMatcher = function(query) {
        var self2 = this;
        if (!query.hasOwnProperty("$gt") && !query.hasOwnProperty("$gte")) {
          return function() {
            return true;
          };
        }
        if (query.hasOwnProperty("$gt") && query.hasOwnProperty("$gte")) {
          if (self2.compareKeys(query.$gte, query.$gt) === 0) {
            return function(key) {
              return self2.compareKeys(key, query.$gt) > 0;
            };
          }
          if (self2.compareKeys(query.$gte, query.$gt) > 0) {
            return function(key) {
              return self2.compareKeys(key, query.$gte) >= 0;
            };
          } else {
            return function(key) {
              return self2.compareKeys(key, query.$gt) > 0;
            };
          }
        }
        if (query.hasOwnProperty("$gt")) {
          return function(key) {
            return self2.compareKeys(key, query.$gt) > 0;
          };
        } else {
          return function(key) {
            return self2.compareKeys(key, query.$gte) >= 0;
          };
        }
      };
      BinarySearchTree.prototype.getUpperBoundMatcher = function(query) {
        var self2 = this;
        if (!query.hasOwnProperty("$lt") && !query.hasOwnProperty("$lte")) {
          return function() {
            return true;
          };
        }
        if (query.hasOwnProperty("$lt") && query.hasOwnProperty("$lte")) {
          if (self2.compareKeys(query.$lte, query.$lt) === 0) {
            return function(key) {
              return self2.compareKeys(key, query.$lt) < 0;
            };
          }
          if (self2.compareKeys(query.$lte, query.$lt) < 0) {
            return function(key) {
              return self2.compareKeys(key, query.$lte) <= 0;
            };
          } else {
            return function(key) {
              return self2.compareKeys(key, query.$lt) < 0;
            };
          }
        }
        if (query.hasOwnProperty("$lt")) {
          return function(key) {
            return self2.compareKeys(key, query.$lt) < 0;
          };
        } else {
          return function(key) {
            return self2.compareKeys(key, query.$lte) <= 0;
          };
        }
      };
      function append(array, toAppend) {
        var i;
        for (i = 0; i < toAppend.length; i += 1) {
          array.push(toAppend[i]);
        }
      }
      BinarySearchTree.prototype.betweenBounds = function(query, lbm, ubm) {
        var res = [];
        if (!this.hasOwnProperty("key")) {
          return [];
        }
        lbm = lbm || this.getLowerBoundMatcher(query);
        ubm = ubm || this.getUpperBoundMatcher(query);
        if (lbm(this.key) && this.left) {
          append(res, this.left.betweenBounds(query, lbm, ubm));
        }
        if (lbm(this.key) && ubm(this.key)) {
          append(res, this.data);
        }
        if (ubm(this.key) && this.right) {
          append(res, this.right.betweenBounds(query, lbm, ubm));
        }
        return res;
      };
      BinarySearchTree.prototype.deleteIfLeaf = function() {
        if (this.left || this.right) {
          return false;
        }
        if (!this.parent) {
          delete this.key;
          this.data = [];
          return true;
        }
        if (this.parent.left === this) {
          this.parent.left = null;
        } else {
          this.parent.right = null;
        }
        return true;
      };
      BinarySearchTree.prototype.deleteIfOnlyOneChild = function() {
        var child;
        if (this.left && !this.right) {
          child = this.left;
        }
        if (!this.left && this.right) {
          child = this.right;
        }
        if (!child) {
          return false;
        }
        if (!this.parent) {
          this.key = child.key;
          this.data = child.data;
          this.left = null;
          if (child.left) {
            this.left = child.left;
            child.left.parent = this;
          }
          this.right = null;
          if (child.right) {
            this.right = child.right;
            child.right.parent = this;
          }
          return true;
        }
        if (this.parent.left === this) {
          this.parent.left = child;
          child.parent = this.parent;
        } else {
          this.parent.right = child;
          child.parent = this.parent;
        }
        return true;
      };
      BinarySearchTree.prototype.delete = function(key, value) {
        var newData = [], replaceWith, self2 = this;
        if (!this.hasOwnProperty("key")) {
          return;
        }
        if (this.compareKeys(key, this.key) < 0) {
          if (this.left) {
            this.left.delete(key, value);
          }
          return;
        }
        if (this.compareKeys(key, this.key) > 0) {
          if (this.right) {
            this.right.delete(key, value);
          }
          return;
        }
        if (!this.compareKeys(key, this.key) === 0) {
          return;
        }
        if (this.data.length > 1 && value !== void 0) {
          this.data.forEach(function(d) {
            if (!self2.checkValueEquality(d, value)) {
              newData.push(d);
            }
          });
          self2.data = newData;
          return;
        }
        if (this.deleteIfLeaf()) {
          return;
        }
        if (this.deleteIfOnlyOneChild()) {
          return;
        }
        if (Math.random() >= 0.5) {
          replaceWith = this.left.getMaxKeyDescendant();
          this.key = replaceWith.key;
          this.data = replaceWith.data;
          if (this === replaceWith.parent) {
            this.left = replaceWith.left;
            if (replaceWith.left) {
              replaceWith.left.parent = replaceWith.parent;
            }
          } else {
            replaceWith.parent.right = replaceWith.left;
            if (replaceWith.left) {
              replaceWith.left.parent = replaceWith.parent;
            }
          }
        } else {
          replaceWith = this.right.getMinKeyDescendant();
          this.key = replaceWith.key;
          this.data = replaceWith.data;
          if (this === replaceWith.parent) {
            this.right = replaceWith.right;
            if (replaceWith.right) {
              replaceWith.right.parent = replaceWith.parent;
            }
          } else {
            replaceWith.parent.left = replaceWith.right;
            if (replaceWith.right) {
              replaceWith.right.parent = replaceWith.parent;
            }
          }
        }
      };
      BinarySearchTree.prototype.executeOnEveryNode = function(fn) {
        if (this.left) {
          this.left.executeOnEveryNode(fn);
        }
        fn(this);
        if (this.right) {
          this.right.executeOnEveryNode(fn);
        }
      };
      BinarySearchTree.prototype.prettyPrint = function(printData, spacing) {
        spacing = spacing || "";
        console.log(spacing + "* " + this.key);
        if (printData) {
          console.log(spacing + "* " + this.data);
        }
        if (!this.left && !this.right) {
          return;
        }
        if (this.left) {
          this.left.prettyPrint(printData, spacing + "  ");
        } else {
          console.log(spacing + "  *");
        }
        if (this.right) {
          this.right.prettyPrint(printData, spacing + "  ");
        } else {
          console.log(spacing + "  *");
        }
      };
      module.exports = BinarySearchTree;
    }
  });

  // node_modules/has-symbols/shams.js
  var require_shams = __commonJS({
    "node_modules/has-symbols/shams.js"(exports, module) {
      "use strict";
      module.exports = function hasSymbols() {
        if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
          return false;
        }
        if (typeof Symbol.iterator === "symbol") {
          return true;
        }
        var obj = {};
        var sym = /* @__PURE__ */ Symbol("test");
        var symObj = Object(sym);
        if (typeof sym === "string") {
          return false;
        }
        if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
          return false;
        }
        if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
          return false;
        }
        var symVal = 42;
        obj[sym] = symVal;
        for (var _ in obj) {
          return false;
        }
        if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
          return false;
        }
        if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
          return false;
        }
        var syms = Object.getOwnPropertySymbols(obj);
        if (syms.length !== 1 || syms[0] !== sym) {
          return false;
        }
        if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
          return false;
        }
        if (typeof Object.getOwnPropertyDescriptor === "function") {
          var descriptor = (
            /** @type {PropertyDescriptor} */
            Object.getOwnPropertyDescriptor(obj, sym)
          );
          if (descriptor.value !== symVal || descriptor.enumerable !== true) {
            return false;
          }
        }
        return true;
      };
    }
  });

  // node_modules/has-tostringtag/shams.js
  var require_shams2 = __commonJS({
    "node_modules/has-tostringtag/shams.js"(exports, module) {
      "use strict";
      var hasSymbols = require_shams();
      module.exports = function hasToStringTagShams() {
        return hasSymbols() && !!Symbol.toStringTag;
      };
    }
  });

  // node_modules/es-object-atoms/index.js
  var require_es_object_atoms = __commonJS({
    "node_modules/es-object-atoms/index.js"(exports, module) {
      "use strict";
      module.exports = Object;
    }
  });

  // node_modules/es-errors/index.js
  var require_es_errors = __commonJS({
    "node_modules/es-errors/index.js"(exports, module) {
      "use strict";
      module.exports = Error;
    }
  });

  // node_modules/es-errors/eval.js
  var require_eval = __commonJS({
    "node_modules/es-errors/eval.js"(exports, module) {
      "use strict";
      module.exports = EvalError;
    }
  });

  // node_modules/es-errors/range.js
  var require_range = __commonJS({
    "node_modules/es-errors/range.js"(exports, module) {
      "use strict";
      module.exports = RangeError;
    }
  });

  // node_modules/es-errors/ref.js
  var require_ref = __commonJS({
    "node_modules/es-errors/ref.js"(exports, module) {
      "use strict";
      module.exports = ReferenceError;
    }
  });

  // node_modules/es-errors/syntax.js
  var require_syntax = __commonJS({
    "node_modules/es-errors/syntax.js"(exports, module) {
      "use strict";
      module.exports = SyntaxError;
    }
  });

  // node_modules/es-errors/type.js
  var require_type = __commonJS({
    "node_modules/es-errors/type.js"(exports, module) {
      "use strict";
      module.exports = TypeError;
    }
  });

  // node_modules/es-errors/uri.js
  var require_uri = __commonJS({
    "node_modules/es-errors/uri.js"(exports, module) {
      "use strict";
      module.exports = URIError;
    }
  });

  // node_modules/math-intrinsics/abs.js
  var require_abs = __commonJS({
    "node_modules/math-intrinsics/abs.js"(exports, module) {
      "use strict";
      module.exports = Math.abs;
    }
  });

  // node_modules/math-intrinsics/floor.js
  var require_floor = __commonJS({
    "node_modules/math-intrinsics/floor.js"(exports, module) {
      "use strict";
      module.exports = Math.floor;
    }
  });

  // node_modules/math-intrinsics/max.js
  var require_max = __commonJS({
    "node_modules/math-intrinsics/max.js"(exports, module) {
      "use strict";
      module.exports = Math.max;
    }
  });

  // node_modules/math-intrinsics/min.js
  var require_min = __commonJS({
    "node_modules/math-intrinsics/min.js"(exports, module) {
      "use strict";
      module.exports = Math.min;
    }
  });

  // node_modules/math-intrinsics/pow.js
  var require_pow = __commonJS({
    "node_modules/math-intrinsics/pow.js"(exports, module) {
      "use strict";
      module.exports = Math.pow;
    }
  });

  // node_modules/math-intrinsics/round.js
  var require_round = __commonJS({
    "node_modules/math-intrinsics/round.js"(exports, module) {
      "use strict";
      module.exports = Math.round;
    }
  });

  // node_modules/math-intrinsics/isNaN.js
  var require_isNaN = __commonJS({
    "node_modules/math-intrinsics/isNaN.js"(exports, module) {
      "use strict";
      module.exports = Number.isNaN || function isNaN2(a) {
        return a !== a;
      };
    }
  });

  // node_modules/math-intrinsics/sign.js
  var require_sign = __commonJS({
    "node_modules/math-intrinsics/sign.js"(exports, module) {
      "use strict";
      var $isNaN = require_isNaN();
      module.exports = function sign(number) {
        if ($isNaN(number) || number === 0) {
          return number;
        }
        return number < 0 ? -1 : 1;
      };
    }
  });

  // node_modules/gopd/gOPD.js
  var require_gOPD = __commonJS({
    "node_modules/gopd/gOPD.js"(exports, module) {
      "use strict";
      module.exports = Object.getOwnPropertyDescriptor;
    }
  });

  // node_modules/gopd/index.js
  var require_gopd = __commonJS({
    "node_modules/gopd/index.js"(exports, module) {
      "use strict";
      var $gOPD = require_gOPD();
      if ($gOPD) {
        try {
          $gOPD([], "length");
        } catch (e) {
          $gOPD = null;
        }
      }
      module.exports = $gOPD;
    }
  });

  // node_modules/es-define-property/index.js
  var require_es_define_property = __commonJS({
    "node_modules/es-define-property/index.js"(exports, module) {
      "use strict";
      var $defineProperty = Object.defineProperty || false;
      if ($defineProperty) {
        try {
          $defineProperty({}, "a", { value: 1 });
        } catch (e) {
          $defineProperty = false;
        }
      }
      module.exports = $defineProperty;
    }
  });

  // node_modules/has-symbols/index.js
  var require_has_symbols = __commonJS({
    "node_modules/has-symbols/index.js"(exports, module) {
      "use strict";
      var origSymbol = typeof Symbol !== "undefined" && Symbol;
      var hasSymbolSham = require_shams();
      module.exports = function hasNativeSymbols() {
        if (typeof origSymbol !== "function") {
          return false;
        }
        if (typeof Symbol !== "function") {
          return false;
        }
        if (typeof origSymbol("foo") !== "symbol") {
          return false;
        }
        if (typeof /* @__PURE__ */ Symbol("bar") !== "symbol") {
          return false;
        }
        return hasSymbolSham();
      };
    }
  });

  // node_modules/get-proto/Reflect.getPrototypeOf.js
  var require_Reflect_getPrototypeOf = __commonJS({
    "node_modules/get-proto/Reflect.getPrototypeOf.js"(exports, module) {
      "use strict";
      module.exports = typeof Reflect !== "undefined" && Reflect.getPrototypeOf || null;
    }
  });

  // node_modules/get-proto/Object.getPrototypeOf.js
  var require_Object_getPrototypeOf = __commonJS({
    "node_modules/get-proto/Object.getPrototypeOf.js"(exports, module) {
      "use strict";
      var $Object = require_es_object_atoms();
      module.exports = $Object.getPrototypeOf || null;
    }
  });

  // node_modules/function-bind/implementation.js
  var require_implementation = __commonJS({
    "node_modules/function-bind/implementation.js"(exports, module) {
      "use strict";
      var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
      var toStr = Object.prototype.toString;
      var max = Math.max;
      var funcType = "[object Function]";
      var concatty = function concatty2(a, b) {
        var arr = [];
        for (var i = 0; i < a.length; i += 1) {
          arr[i] = a[i];
        }
        for (var j = 0; j < b.length; j += 1) {
          arr[j + a.length] = b[j];
        }
        return arr;
      };
      var slicy = function slicy2(arrLike, offset) {
        var arr = [];
        for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) {
          arr[j] = arrLike[i];
        }
        return arr;
      };
      var joiny = function(arr, joiner) {
        var str = "";
        for (var i = 0; i < arr.length; i += 1) {
          str += arr[i];
          if (i + 1 < arr.length) {
            str += joiner;
          }
        }
        return str;
      };
      module.exports = function bind(that) {
        var target = this;
        if (typeof target !== "function" || toStr.apply(target) !== funcType) {
          throw new TypeError(ERROR_MESSAGE + target);
        }
        var args = slicy(arguments, 1);
        var bound;
        var binder = function() {
          if (this instanceof bound) {
            var result = target.apply(
              this,
              concatty(args, arguments)
            );
            if (Object(result) === result) {
              return result;
            }
            return this;
          }
          return target.apply(
            that,
            concatty(args, arguments)
          );
        };
        var boundLength = max(0, target.length - args.length);
        var boundArgs = [];
        for (var i = 0; i < boundLength; i++) {
          boundArgs[i] = "$" + i;
        }
        bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
        if (target.prototype) {
          var Empty = function Empty2() {
          };
          Empty.prototype = target.prototype;
          bound.prototype = new Empty();
          Empty.prototype = null;
        }
        return bound;
      };
    }
  });

  // node_modules/function-bind/index.js
  var require_function_bind = __commonJS({
    "node_modules/function-bind/index.js"(exports, module) {
      "use strict";
      var implementation = require_implementation();
      module.exports = Function.prototype.bind || implementation;
    }
  });

  // node_modules/call-bind-apply-helpers/functionCall.js
  var require_functionCall = __commonJS({
    "node_modules/call-bind-apply-helpers/functionCall.js"(exports, module) {
      "use strict";
      module.exports = Function.prototype.call;
    }
  });

  // node_modules/call-bind-apply-helpers/functionApply.js
  var require_functionApply = __commonJS({
    "node_modules/call-bind-apply-helpers/functionApply.js"(exports, module) {
      "use strict";
      module.exports = Function.prototype.apply;
    }
  });

  // node_modules/call-bind-apply-helpers/reflectApply.js
  var require_reflectApply = __commonJS({
    "node_modules/call-bind-apply-helpers/reflectApply.js"(exports, module) {
      "use strict";
      module.exports = typeof Reflect !== "undefined" && Reflect && Reflect.apply;
    }
  });

  // node_modules/call-bind-apply-helpers/actualApply.js
  var require_actualApply = __commonJS({
    "node_modules/call-bind-apply-helpers/actualApply.js"(exports, module) {
      "use strict";
      var bind = require_function_bind();
      var $apply = require_functionApply();
      var $call = require_functionCall();
      var $reflectApply = require_reflectApply();
      module.exports = $reflectApply || bind.call($call, $apply);
    }
  });

  // node_modules/call-bind-apply-helpers/index.js
  var require_call_bind_apply_helpers = __commonJS({
    "node_modules/call-bind-apply-helpers/index.js"(exports, module) {
      "use strict";
      var bind = require_function_bind();
      var $TypeError = require_type();
      var $call = require_functionCall();
      var $actualApply = require_actualApply();
      module.exports = function callBindBasic(args) {
        if (args.length < 1 || typeof args[0] !== "function") {
          throw new $TypeError("a function is required");
        }
        return $actualApply(bind, $call, args);
      };
    }
  });

  // node_modules/dunder-proto/get.js
  var require_get = __commonJS({
    "node_modules/dunder-proto/get.js"(exports, module) {
      "use strict";
      var callBind = require_call_bind_apply_helpers();
      var gOPD = require_gopd();
      var hasProtoAccessor;
      try {
        hasProtoAccessor = /** @type {{ __proto__?: typeof Array.prototype }} */
        [].__proto__ === Array.prototype;
      } catch (e) {
        if (!e || typeof e !== "object" || !("code" in e) || e.code !== "ERR_PROTO_ACCESS") {
          throw e;
        }
      }
      var desc = !!hasProtoAccessor && gOPD && gOPD(
        Object.prototype,
        /** @type {keyof typeof Object.prototype} */
        "__proto__"
      );
      var $Object = Object;
      var $getPrototypeOf = $Object.getPrototypeOf;
      module.exports = desc && typeof desc.get === "function" ? callBind([desc.get]) : typeof $getPrototypeOf === "function" ? (
        /** @type {import('./get')} */
        function getDunder(value) {
          return $getPrototypeOf(value == null ? value : $Object(value));
        }
      ) : false;
    }
  });

  // node_modules/get-proto/index.js
  var require_get_proto = __commonJS({
    "node_modules/get-proto/index.js"(exports, module) {
      "use strict";
      var reflectGetProto = require_Reflect_getPrototypeOf();
      var originalGetProto = require_Object_getPrototypeOf();
      var getDunderProto = require_get();
      module.exports = reflectGetProto ? function getProto(O) {
        return reflectGetProto(O);
      } : originalGetProto ? function getProto(O) {
        if (!O || typeof O !== "object" && typeof O !== "function") {
          throw new TypeError("getProto: not an object");
        }
        return originalGetProto(O);
      } : getDunderProto ? function getProto(O) {
        return getDunderProto(O);
      } : null;
    }
  });

  // node_modules/hasown/index.js
  var require_hasown = __commonJS({
    "node_modules/hasown/index.js"(exports, module) {
      "use strict";
      var call = Function.prototype.call;
      var $hasOwn = Object.prototype.hasOwnProperty;
      var bind = require_function_bind();
      module.exports = bind.call(call, $hasOwn);
    }
  });

  // node_modules/get-intrinsic/index.js
  var require_get_intrinsic = __commonJS({
    "node_modules/get-intrinsic/index.js"(exports, module) {
      "use strict";
      var undefined2;
      var $Object = require_es_object_atoms();
      var $Error = require_es_errors();
      var $EvalError = require_eval();
      var $RangeError = require_range();
      var $ReferenceError = require_ref();
      var $SyntaxError = require_syntax();
      var $TypeError = require_type();
      var $URIError = require_uri();
      var abs = require_abs();
      var floor = require_floor();
      var max = require_max();
      var min = require_min();
      var pow = require_pow();
      var round = require_round();
      var sign = require_sign();
      var $Function = Function;
      var getEvalledConstructor = function(expressionSyntax) {
        try {
          return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
        } catch (e) {
        }
      };
      var $gOPD = require_gopd();
      var $defineProperty = require_es_define_property();
      var throwTypeError = function() {
        throw new $TypeError();
      };
      var ThrowTypeError = $gOPD ? (function() {
        try {
          arguments.callee;
          return throwTypeError;
        } catch (calleeThrows) {
          try {
            return $gOPD(arguments, "callee").get;
          } catch (gOPDthrows) {
            return throwTypeError;
          }
        }
      })() : throwTypeError;
      var hasSymbols = require_has_symbols()();
      var getProto = require_get_proto();
      var $ObjectGPO = require_Object_getPrototypeOf();
      var $ReflectGPO = require_Reflect_getPrototypeOf();
      var $apply = require_functionApply();
      var $call = require_functionCall();
      var needsEval = {};
      var TypedArray = typeof Uint8Array === "undefined" || !getProto ? undefined2 : getProto(Uint8Array);
      var INTRINSICS = {
        __proto__: null,
        "%AggregateError%": typeof AggregateError === "undefined" ? undefined2 : AggregateError,
        "%Array%": Array,
        "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined2 : ArrayBuffer,
        "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined2,
        "%AsyncFromSyncIteratorPrototype%": undefined2,
        "%AsyncFunction%": needsEval,
        "%AsyncGenerator%": needsEval,
        "%AsyncGeneratorFunction%": needsEval,
        "%AsyncIteratorPrototype%": needsEval,
        "%Atomics%": typeof Atomics === "undefined" ? undefined2 : Atomics,
        "%BigInt%": typeof BigInt === "undefined" ? undefined2 : BigInt,
        "%BigInt64Array%": typeof BigInt64Array === "undefined" ? undefined2 : BigInt64Array,
        "%BigUint64Array%": typeof BigUint64Array === "undefined" ? undefined2 : BigUint64Array,
        "%Boolean%": Boolean,
        "%DataView%": typeof DataView === "undefined" ? undefined2 : DataView,
        "%Date%": Date,
        "%decodeURI%": decodeURI,
        "%decodeURIComponent%": decodeURIComponent,
        "%encodeURI%": encodeURI,
        "%encodeURIComponent%": encodeURIComponent,
        "%Error%": $Error,
        "%eval%": eval,
        // eslint-disable-line no-eval
        "%EvalError%": $EvalError,
        "%Float16Array%": typeof Float16Array === "undefined" ? undefined2 : Float16Array,
        "%Float32Array%": typeof Float32Array === "undefined" ? undefined2 : Float32Array,
        "%Float64Array%": typeof Float64Array === "undefined" ? undefined2 : Float64Array,
        "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? undefined2 : FinalizationRegistry,
        "%Function%": $Function,
        "%GeneratorFunction%": needsEval,
        "%Int8Array%": typeof Int8Array === "undefined" ? undefined2 : Int8Array,
        "%Int16Array%": typeof Int16Array === "undefined" ? undefined2 : Int16Array,
        "%Int32Array%": typeof Int32Array === "undefined" ? undefined2 : Int32Array,
        "%isFinite%": isFinite,
        "%isNaN%": isNaN,
        "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined2,
        "%JSON%": typeof JSON === "object" ? JSON : undefined2,
        "%Map%": typeof Map === "undefined" ? undefined2 : Map,
        "%MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Map())[Symbol.iterator]()),
        "%Math%": Math,
        "%Number%": Number,
        "%Object%": $Object,
        "%Object.getOwnPropertyDescriptor%": $gOPD,
        "%parseFloat%": parseFloat,
        "%parseInt%": parseInt,
        "%Promise%": typeof Promise === "undefined" ? undefined2 : Promise,
        "%Proxy%": typeof Proxy === "undefined" ? undefined2 : Proxy,
        "%RangeError%": $RangeError,
        "%ReferenceError%": $ReferenceError,
        "%Reflect%": typeof Reflect === "undefined" ? undefined2 : Reflect,
        "%RegExp%": RegExp,
        "%Set%": typeof Set === "undefined" ? undefined2 : Set,
        "%SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Set())[Symbol.iterator]()),
        "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined2 : SharedArrayBuffer,
        "%String%": String,
        "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined2,
        "%Symbol%": hasSymbols ? Symbol : undefined2,
        "%SyntaxError%": $SyntaxError,
        "%ThrowTypeError%": ThrowTypeError,
        "%TypedArray%": TypedArray,
        "%TypeError%": $TypeError,
        "%Uint8Array%": typeof Uint8Array === "undefined" ? undefined2 : Uint8Array,
        "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined2 : Uint8ClampedArray,
        "%Uint16Array%": typeof Uint16Array === "undefined" ? undefined2 : Uint16Array,
        "%Uint32Array%": typeof Uint32Array === "undefined" ? undefined2 : Uint32Array,
        "%URIError%": $URIError,
        "%WeakMap%": typeof WeakMap === "undefined" ? undefined2 : WeakMap,
        "%WeakRef%": typeof WeakRef === "undefined" ? undefined2 : WeakRef,
        "%WeakSet%": typeof WeakSet === "undefined" ? undefined2 : WeakSet,
        "%Function.prototype.call%": $call,
        "%Function.prototype.apply%": $apply,
        "%Object.defineProperty%": $defineProperty,
        "%Object.getPrototypeOf%": $ObjectGPO,
        "%Math.abs%": abs,
        "%Math.floor%": floor,
        "%Math.max%": max,
        "%Math.min%": min,
        "%Math.pow%": pow,
        "%Math.round%": round,
        "%Math.sign%": sign,
        "%Reflect.getPrototypeOf%": $ReflectGPO
      };
      if (getProto) {
        try {
          null.error;
        } catch (e) {
          errorProto = getProto(getProto(e));
          INTRINSICS["%Error.prototype%"] = errorProto;
        }
      }
      var errorProto;
      var doEval = function doEval2(name) {
        var value;
        if (name === "%AsyncFunction%") {
          value = getEvalledConstructor("async function () {}");
        } else if (name === "%GeneratorFunction%") {
          value = getEvalledConstructor("function* () {}");
        } else if (name === "%AsyncGeneratorFunction%") {
          value = getEvalledConstructor("async function* () {}");
        } else if (name === "%AsyncGenerator%") {
          var fn = doEval2("%AsyncGeneratorFunction%");
          if (fn) {
            value = fn.prototype;
          }
        } else if (name === "%AsyncIteratorPrototype%") {
          var gen = doEval2("%AsyncGenerator%");
          if (gen && getProto) {
            value = getProto(gen.prototype);
          }
        }
        INTRINSICS[name] = value;
        return value;
      };
      var LEGACY_ALIASES = {
        __proto__: null,
        "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
        "%ArrayPrototype%": ["Array", "prototype"],
        "%ArrayProto_entries%": ["Array", "prototype", "entries"],
        "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
        "%ArrayProto_keys%": ["Array", "prototype", "keys"],
        "%ArrayProto_values%": ["Array", "prototype", "values"],
        "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
        "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
        "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
        "%BooleanPrototype%": ["Boolean", "prototype"],
        "%DataViewPrototype%": ["DataView", "prototype"],
        "%DatePrototype%": ["Date", "prototype"],
        "%ErrorPrototype%": ["Error", "prototype"],
        "%EvalErrorPrototype%": ["EvalError", "prototype"],
        "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
        "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
        "%FunctionPrototype%": ["Function", "prototype"],
        "%Generator%": ["GeneratorFunction", "prototype"],
        "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
        "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
        "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
        "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
        "%JSONParse%": ["JSON", "parse"],
        "%JSONStringify%": ["JSON", "stringify"],
        "%MapPrototype%": ["Map", "prototype"],
        "%NumberPrototype%": ["Number", "prototype"],
        "%ObjectPrototype%": ["Object", "prototype"],
        "%ObjProto_toString%": ["Object", "prototype", "toString"],
        "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
        "%PromisePrototype%": ["Promise", "prototype"],
        "%PromiseProto_then%": ["Promise", "prototype", "then"],
        "%Promise_all%": ["Promise", "all"],
        "%Promise_reject%": ["Promise", "reject"],
        "%Promise_resolve%": ["Promise", "resolve"],
        "%RangeErrorPrototype%": ["RangeError", "prototype"],
        "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
        "%RegExpPrototype%": ["RegExp", "prototype"],
        "%SetPrototype%": ["Set", "prototype"],
        "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
        "%StringPrototype%": ["String", "prototype"],
        "%SymbolPrototype%": ["Symbol", "prototype"],
        "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
        "%TypedArrayPrototype%": ["TypedArray", "prototype"],
        "%TypeErrorPrototype%": ["TypeError", "prototype"],
        "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
        "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
        "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
        "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
        "%URIErrorPrototype%": ["URIError", "prototype"],
        "%WeakMapPrototype%": ["WeakMap", "prototype"],
        "%WeakSetPrototype%": ["WeakSet", "prototype"]
      };
      var bind = require_function_bind();
      var hasOwn = require_hasown();
      var $concat = bind.call($call, Array.prototype.concat);
      var $spliceApply = bind.call($apply, Array.prototype.splice);
      var $replace = bind.call($call, String.prototype.replace);
      var $strSlice = bind.call($call, String.prototype.slice);
      var $exec = bind.call($call, RegExp.prototype.exec);
      var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
      var reEscapeChar = /\\(\\)?/g;
      var stringToPath = function stringToPath2(string) {
        var first = $strSlice(string, 0, 1);
        var last = $strSlice(string, -1);
        if (first === "%" && last !== "%") {
          throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
        } else if (last === "%" && first !== "%") {
          throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
        }
        var result = [];
        $replace(string, rePropName, function(match, number, quote, subString) {
          result[result.length] = quote ? $replace(subString, reEscapeChar, "$1") : number || match;
        });
        return result;
      };
      var getBaseIntrinsic = function getBaseIntrinsic2(name, allowMissing) {
        var intrinsicName = name;
        var alias;
        if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
          alias = LEGACY_ALIASES[intrinsicName];
          intrinsicName = "%" + alias[0] + "%";
        }
        if (hasOwn(INTRINSICS, intrinsicName)) {
          var value = INTRINSICS[intrinsicName];
          if (value === needsEval) {
            value = doEval(intrinsicName);
          }
          if (typeof value === "undefined" && !allowMissing) {
            throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
          }
          return {
            alias,
            name: intrinsicName,
            value
          };
        }
        throw new $SyntaxError("intrinsic " + name + " does not exist!");
      };
      module.exports = function GetIntrinsic(name, allowMissing) {
        if (typeof name !== "string" || name.length === 0) {
          throw new $TypeError("intrinsic name must be a non-empty string");
        }
        if (arguments.length > 1 && typeof allowMissing !== "boolean") {
          throw new $TypeError('"allowMissing" argument must be a boolean');
        }
        if ($exec(/^%?[^%]*%?$/, name) === null) {
          throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
        }
        var parts = stringToPath(name);
        var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
        var intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
        var intrinsicRealName = intrinsic.name;
        var value = intrinsic.value;
        var skipFurtherCaching = false;
        var alias = intrinsic.alias;
        if (alias) {
          intrinsicBaseName = alias[0];
          $spliceApply(parts, $concat([0, 1], alias));
        }
        for (var i = 1, isOwn = true; i < parts.length; i += 1) {
          var part = parts[i];
          var first = $strSlice(part, 0, 1);
          var last = $strSlice(part, -1);
          if ((first === '"' || first === "'" || first === "`" || (last === '"' || last === "'" || last === "`")) && first !== last) {
            throw new $SyntaxError("property names with quotes must have matching quotes");
          }
          if (part === "constructor" || !isOwn) {
            skipFurtherCaching = true;
          }
          intrinsicBaseName += "." + part;
          intrinsicRealName = "%" + intrinsicBaseName + "%";
          if (hasOwn(INTRINSICS, intrinsicRealName)) {
            value = INTRINSICS[intrinsicRealName];
          } else if (value != null) {
            if (!(part in value)) {
              if (!allowMissing) {
                throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
              }
              return void undefined2;
            }
            if ($gOPD && i + 1 >= parts.length) {
              var desc = $gOPD(value, part);
              isOwn = !!desc;
              if (isOwn && "get" in desc && !("originalValue" in desc.get)) {
                value = desc.get;
              } else {
                value = value[part];
              }
            } else {
              isOwn = hasOwn(value, part);
              value = value[part];
            }
            if (isOwn && !skipFurtherCaching) {
              INTRINSICS[intrinsicRealName] = value;
            }
          }
        }
        return value;
      };
    }
  });

  // node_modules/call-bound/index.js
  var require_call_bound = __commonJS({
    "node_modules/call-bound/index.js"(exports, module) {
      "use strict";
      var GetIntrinsic = require_get_intrinsic();
      var callBindBasic = require_call_bind_apply_helpers();
      var $indexOf = callBindBasic([GetIntrinsic("%String.prototype.indexOf%")]);
      module.exports = function callBoundIntrinsic(name, allowMissing) {
        var intrinsic = (
          /** @type {(this: unknown, ...args: unknown[]) => unknown} */
          GetIntrinsic(name, !!allowMissing)
        );
        if (typeof intrinsic === "function" && $indexOf(name, ".prototype.") > -1) {
          return callBindBasic(
            /** @type {const} */
            [intrinsic]
          );
        }
        return intrinsic;
      };
    }
  });

  // node_modules/is-arguments/index.js
  var require_is_arguments = __commonJS({
    "node_modules/is-arguments/index.js"(exports, module) {
      "use strict";
      var hasToStringTag = require_shams2()();
      var callBound = require_call_bound();
      var $toString = callBound("Object.prototype.toString");
      var isStandardArguments = function isArguments(value) {
        if (hasToStringTag && value && typeof value === "object" && Symbol.toStringTag in value) {
          return false;
        }
        return $toString(value) === "[object Arguments]";
      };
      var isLegacyArguments = function isArguments(value) {
        if (isStandardArguments(value)) {
          return true;
        }
        return value !== null && typeof value === "object" && "length" in value && typeof value.length === "number" && value.length >= 0 && $toString(value) !== "[object Array]" && "callee" in value && $toString(value.callee) === "[object Function]";
      };
      var supportsStandardArguments = (function() {
        return isStandardArguments(arguments);
      })();
      isStandardArguments.isLegacyArguments = isLegacyArguments;
      module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;
    }
  });

  // node_modules/is-regex/index.js
  var require_is_regex = __commonJS({
    "node_modules/is-regex/index.js"(exports, module) {
      "use strict";
      var callBound = require_call_bound();
      var hasToStringTag = require_shams2()();
      var hasOwn = require_hasown();
      var gOPD = require_gopd();
      var fn;
      if (hasToStringTag) {
        $exec = callBound("RegExp.prototype.exec");
        isRegexMarker = {};
        throwRegexMarker = function() {
          throw isRegexMarker;
        };
        badStringifier = {
          toString: throwRegexMarker,
          valueOf: throwRegexMarker
        };
        if (typeof Symbol.toPrimitive === "symbol") {
          badStringifier[Symbol.toPrimitive] = throwRegexMarker;
        }
        fn = function isRegex(value) {
          if (!value || typeof value !== "object") {
            return false;
          }
          var descriptor = (
            /** @type {NonNullable<typeof gOPD>} */
            gOPD(
              /** @type {{ lastIndex?: unknown }} */
              value,
              "lastIndex"
            )
          );
          var hasLastIndexDataProperty = descriptor && hasOwn(descriptor, "value");
          if (!hasLastIndexDataProperty) {
            return false;
          }
          try {
            $exec(
              value,
              /** @type {string} */
              /** @type {unknown} */
              badStringifier
            );
          } catch (e) {
            return e === isRegexMarker;
          }
        };
      } else {
        $toString = callBound("Object.prototype.toString");
        regexClass = "[object RegExp]";
        fn = function isRegex(value) {
          if (!value || typeof value !== "object" && typeof value !== "function") {
            return false;
          }
          return $toString(value) === regexClass;
        };
      }
      var $exec;
      var isRegexMarker;
      var throwRegexMarker;
      var badStringifier;
      var $toString;
      var regexClass;
      module.exports = fn;
    }
  });

  // node_modules/safe-regex-test/index.js
  var require_safe_regex_test = __commonJS({
    "node_modules/safe-regex-test/index.js"(exports, module) {
      "use strict";
      var callBound = require_call_bound();
      var isRegex = require_is_regex();
      var $exec = callBound("RegExp.prototype.exec");
      var $TypeError = require_type();
      module.exports = function regexTester(regex) {
        if (!isRegex(regex)) {
          throw new $TypeError("`regex` must be a RegExp");
        }
        return function test(s) {
          return $exec(regex, s) !== null;
        };
      };
    }
  });

  // node_modules/generator-function/index.js
  var require_generator_function = __commonJS({
    "node_modules/generator-function/index.js"(exports, module) {
      "use strict";
      var cached = (
        /** @type {GeneratorFunctionConstructor} */
        function* () {
        }.constructor
      );
      module.exports = () => cached;
    }
  });

  // node_modules/is-generator-function/index.js
  var require_is_generator_function = __commonJS({
    "node_modules/is-generator-function/index.js"(exports, module) {
      "use strict";
      var callBound = require_call_bound();
      var safeRegexTest = require_safe_regex_test();
      var isFnRegex = safeRegexTest(/^\s*(?:function)?\*/);
      var hasToStringTag = require_shams2()();
      var getProto = require_get_proto();
      var toStr = callBound("Object.prototype.toString");
      var fnToStr = callBound("Function.prototype.toString");
      var getGeneratorFunction = require_generator_function();
      module.exports = function isGeneratorFunction(fn) {
        if (typeof fn !== "function") {
          return false;
        }
        if (isFnRegex(fnToStr(fn))) {
          return true;
        }
        if (!hasToStringTag) {
          var str = toStr(fn);
          return str === "[object GeneratorFunction]";
        }
        if (!getProto) {
          return false;
        }
        var GeneratorFunction = getGeneratorFunction();
        return GeneratorFunction && getProto(fn) === GeneratorFunction.prototype;
      };
    }
  });

  // node_modules/is-callable/index.js
  var require_is_callable = __commonJS({
    "node_modules/is-callable/index.js"(exports, module) {
      "use strict";
      var fnToStr = Function.prototype.toString;
      var reflectApply = typeof Reflect === "object" && Reflect !== null && Reflect.apply;
      var badArrayLike;
      var isCallableMarker;
      if (typeof reflectApply === "function" && typeof Object.defineProperty === "function") {
        try {
          badArrayLike = Object.defineProperty({}, "length", {
            get: function() {
              throw isCallableMarker;
            }
          });
          isCallableMarker = {};
          reflectApply(function() {
            throw 42;
          }, null, badArrayLike);
        } catch (_) {
          if (_ !== isCallableMarker) {
            reflectApply = null;
          }
        }
      } else {
        reflectApply = null;
      }
      var constructorRegex = /^\s*class\b/;
      var isES6ClassFn = function isES6ClassFunction(value) {
        try {
          var fnStr = fnToStr.call(value);
          return constructorRegex.test(fnStr);
        } catch (e) {
          return false;
        }
      };
      var tryFunctionObject = function tryFunctionToStr(value) {
        try {
          if (isES6ClassFn(value)) {
            return false;
          }
          fnToStr.call(value);
          return true;
        } catch (e) {
          return false;
        }
      };
      var toStr = Object.prototype.toString;
      var objectClass = "[object Object]";
      var fnClass = "[object Function]";
      var genClass = "[object GeneratorFunction]";
      var ddaClass = "[object HTMLAllCollection]";
      var ddaClass2 = "[object HTML document.all class]";
      var ddaClass3 = "[object HTMLCollection]";
      var hasToStringTag = typeof Symbol === "function" && !!Symbol.toStringTag;
      var isIE68 = !(0 in [,]);
      var isDDA = function isDocumentDotAll() {
        return false;
      };
      if (typeof document === "object") {
        all = document.all;
        if (toStr.call(all) === toStr.call(document.all)) {
          isDDA = function isDocumentDotAll(value) {
            if ((isIE68 || !value) && (typeof value === "undefined" || typeof value === "object")) {
              try {
                var str = toStr.call(value);
                return (str === ddaClass || str === ddaClass2 || str === ddaClass3 || str === objectClass) && value("") == null;
              } catch (e) {
              }
            }
            return false;
          };
        }
      }
      var all;
      module.exports = reflectApply ? function isCallable(value) {
        if (isDDA(value)) {
          return true;
        }
        if (!value) {
          return false;
        }
        if (typeof value !== "function" && typeof value !== "object") {
          return false;
        }
        try {
          reflectApply(value, null, badArrayLike);
        } catch (e) {
          if (e !== isCallableMarker) {
            return false;
          }
        }
        return !isES6ClassFn(value) && tryFunctionObject(value);
      } : function isCallable(value) {
        if (isDDA(value)) {
          return true;
        }
        if (!value) {
          return false;
        }
        if (typeof value !== "function" && typeof value !== "object") {
          return false;
        }
        if (hasToStringTag) {
          return tryFunctionObject(value);
        }
        if (isES6ClassFn(value)) {
          return false;
        }
        var strClass = toStr.call(value);
        if (strClass !== fnClass && strClass !== genClass && !/^\[object HTML/.test(strClass)) {
          return false;
        }
        return tryFunctionObject(value);
      };
    }
  });

  // node_modules/for-each/index.js
  var require_for_each = __commonJS({
    "node_modules/for-each/index.js"(exports, module) {
      "use strict";
      var isCallable = require_is_callable();
      var toStr = Object.prototype.toString;
      var hasOwnProperty = Object.prototype.hasOwnProperty;
      var forEachArray = function forEachArray2(array, iterator, receiver) {
        for (var i = 0, len = array.length; i < len; i++) {
          if (hasOwnProperty.call(array, i)) {
            if (receiver == null) {
              iterator(array[i], i, array);
            } else {
              iterator.call(receiver, array[i], i, array);
            }
          }
        }
      };
      var forEachString = function forEachString2(string, iterator, receiver) {
        for (var i = 0, len = string.length; i < len; i++) {
          if (receiver == null) {
            iterator(string.charAt(i), i, string);
          } else {
            iterator.call(receiver, string.charAt(i), i, string);
          }
        }
      };
      var forEachObject = function forEachObject2(object, iterator, receiver) {
        for (var k in object) {
          if (hasOwnProperty.call(object, k)) {
            if (receiver == null) {
              iterator(object[k], k, object);
            } else {
              iterator.call(receiver, object[k], k, object);
            }
          }
        }
      };
      function isArray(x) {
        return toStr.call(x) === "[object Array]";
      }
      module.exports = function forEach(list, iterator, thisArg) {
        if (!isCallable(iterator)) {
          throw new TypeError("iterator must be a function");
        }
        var receiver;
        if (arguments.length >= 3) {
          receiver = thisArg;
        }
        if (isArray(list)) {
          forEachArray(list, iterator, receiver);
        } else if (typeof list === "string") {
          forEachString(list, iterator, receiver);
        } else {
          forEachObject(list, iterator, receiver);
        }
      };
    }
  });

  // node_modules/possible-typed-array-names/index.js
  var require_possible_typed_array_names = __commonJS({
    "node_modules/possible-typed-array-names/index.js"(exports, module) {
      "use strict";
      module.exports = [
        "Float16Array",
        "Float32Array",
        "Float64Array",
        "Int8Array",
        "Int16Array",
        "Int32Array",
        "Uint8Array",
        "Uint8ClampedArray",
        "Uint16Array",
        "Uint32Array",
        "BigInt64Array",
        "BigUint64Array"
      ];
    }
  });

  // node_modules/available-typed-arrays/index.js
  var require_available_typed_arrays = __commonJS({
    "node_modules/available-typed-arrays/index.js"(exports, module) {
      "use strict";
      var possibleNames = require_possible_typed_array_names();
      var g = typeof globalThis === "undefined" ? global : globalThis;
      module.exports = function availableTypedArrays() {
        var out = [];
        for (var i = 0; i < possibleNames.length; i++) {
          if (typeof g[possibleNames[i]] === "function") {
            out[out.length] = possibleNames[i];
          }
        }
        return out;
      };
    }
  });

  // node_modules/define-data-property/index.js
  var require_define_data_property = __commonJS({
    "node_modules/define-data-property/index.js"(exports, module) {
      "use strict";
      var $defineProperty = require_es_define_property();
      var $SyntaxError = require_syntax();
      var $TypeError = require_type();
      var gopd = require_gopd();
      module.exports = function defineDataProperty(obj, property, value) {
        if (!obj || typeof obj !== "object" && typeof obj !== "function") {
          throw new $TypeError("`obj` must be an object or a function`");
        }
        if (typeof property !== "string" && typeof property !== "symbol") {
          throw new $TypeError("`property` must be a string or a symbol`");
        }
        if (arguments.length > 3 && typeof arguments[3] !== "boolean" && arguments[3] !== null) {
          throw new $TypeError("`nonEnumerable`, if provided, must be a boolean or null");
        }
        if (arguments.length > 4 && typeof arguments[4] !== "boolean" && arguments[4] !== null) {
          throw new $TypeError("`nonWritable`, if provided, must be a boolean or null");
        }
        if (arguments.length > 5 && typeof arguments[5] !== "boolean" && arguments[5] !== null) {
          throw new $TypeError("`nonConfigurable`, if provided, must be a boolean or null");
        }
        if (arguments.length > 6 && typeof arguments[6] !== "boolean") {
          throw new $TypeError("`loose`, if provided, must be a boolean");
        }
        var nonEnumerable = arguments.length > 3 ? arguments[3] : null;
        var nonWritable = arguments.length > 4 ? arguments[4] : null;
        var nonConfigurable = arguments.length > 5 ? arguments[5] : null;
        var loose = arguments.length > 6 ? arguments[6] : false;
        var desc = !!gopd && gopd(obj, property);
        if ($defineProperty) {
          $defineProperty(obj, property, {
            configurable: nonConfigurable === null && desc ? desc.configurable : !nonConfigurable,
            enumerable: nonEnumerable === null && desc ? desc.enumerable : !nonEnumerable,
            value,
            writable: nonWritable === null && desc ? desc.writable : !nonWritable
          });
        } else if (loose || !nonEnumerable && !nonWritable && !nonConfigurable) {
          obj[property] = value;
        } else {
          throw new $SyntaxError("This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.");
        }
      };
    }
  });

  // node_modules/has-property-descriptors/index.js
  var require_has_property_descriptors = __commonJS({
    "node_modules/has-property-descriptors/index.js"(exports, module) {
      "use strict";
      var $defineProperty = require_es_define_property();
      var hasPropertyDescriptors = function hasPropertyDescriptors2() {
        return !!$defineProperty;
      };
      hasPropertyDescriptors.hasArrayLengthDefineBug = function hasArrayLengthDefineBug() {
        if (!$defineProperty) {
          return null;
        }
        try {
          return $defineProperty([], "length", { value: 1 }).length !== 1;
        } catch (e) {
          return true;
        }
      };
      module.exports = hasPropertyDescriptors;
    }
  });

  // node_modules/set-function-length/index.js
  var require_set_function_length = __commonJS({
    "node_modules/set-function-length/index.js"(exports, module) {
      "use strict";
      var GetIntrinsic = require_get_intrinsic();
      var define2 = require_define_data_property();
      var hasDescriptors = require_has_property_descriptors()();
      var gOPD = require_gopd();
      var $TypeError = require_type();
      var $floor = GetIntrinsic("%Math.floor%");
      module.exports = function setFunctionLength(fn, length) {
        if (typeof fn !== "function") {
          throw new $TypeError("`fn` is not a function");
        }
        if (typeof length !== "number" || length < 0 || length > 4294967295 || $floor(length) !== length) {
          throw new $TypeError("`length` must be a positive 32-bit integer");
        }
        var loose = arguments.length > 2 && !!arguments[2];
        var functionLengthIsConfigurable = true;
        var functionLengthIsWritable = true;
        if ("length" in fn && gOPD) {
          var desc = gOPD(fn, "length");
          if (desc && !desc.configurable) {
            functionLengthIsConfigurable = false;
          }
          if (desc && !desc.writable) {
            functionLengthIsWritable = false;
          }
        }
        if (functionLengthIsConfigurable || functionLengthIsWritable || !loose) {
          if (hasDescriptors) {
            define2(
              /** @type {Parameters<define>[0]} */
              fn,
              "length",
              length,
              true,
              true
            );
          } else {
            define2(
              /** @type {Parameters<define>[0]} */
              fn,
              "length",
              length
            );
          }
        }
        return fn;
      };
    }
  });

  // node_modules/call-bind-apply-helpers/applyBind.js
  var require_applyBind = __commonJS({
    "node_modules/call-bind-apply-helpers/applyBind.js"(exports, module) {
      "use strict";
      var bind = require_function_bind();
      var $apply = require_functionApply();
      var actualApply = require_actualApply();
      module.exports = function applyBind() {
        return actualApply(bind, $apply, arguments);
      };
    }
  });

  // node_modules/call-bind/index.js
  var require_call_bind = __commonJS({
    "node_modules/call-bind/index.js"(exports, module) {
      "use strict";
      var setFunctionLength = require_set_function_length();
      var $defineProperty = require_es_define_property();
      var callBindBasic = require_call_bind_apply_helpers();
      var applyBind = require_applyBind();
      module.exports = function callBind(originalFunction) {
        var func = callBindBasic(arguments);
        var adjustedLength = 1 + originalFunction.length - (arguments.length - 1);
        return setFunctionLength(
          func,
          adjustedLength > 0 ? adjustedLength : 0,
          true
        );
      };
      if ($defineProperty) {
        $defineProperty(module.exports, "apply", { value: applyBind });
      } else {
        module.exports.apply = applyBind;
      }
    }
  });

  // node_modules/which-typed-array/index.js
  var require_which_typed_array = __commonJS({
    "node_modules/which-typed-array/index.js"(exports, module) {
      "use strict";
      var forEach = require_for_each();
      var availableTypedArrays = require_available_typed_arrays();
      var callBind = require_call_bind();
      var callBound = require_call_bound();
      var gOPD = require_gopd();
      var getProto = require_get_proto();
      var $toString = callBound("Object.prototype.toString");
      var hasToStringTag = require_shams2()();
      var g = typeof globalThis === "undefined" ? global : globalThis;
      var typedArrays = availableTypedArrays();
      var $slice = callBound("String.prototype.slice");
      var $indexOf = callBound("Array.prototype.indexOf", true) || function indexOf(array, value) {
        for (var i = 0; i < array.length; i += 1) {
          if (array[i] === value) {
            return i;
          }
        }
        return -1;
      };
      var cache = { __proto__: null };
      if (hasToStringTag && gOPD && getProto) {
        forEach(typedArrays, function(typedArray) {
          var arr = new g[typedArray]();
          if (Symbol.toStringTag in arr && getProto) {
            var proto = getProto(arr);
            var descriptor = gOPD(proto, Symbol.toStringTag);
            if (!descriptor && proto) {
              var superProto = getProto(proto);
              descriptor = gOPD(superProto, Symbol.toStringTag);
            }
            if (descriptor && descriptor.get) {
              var bound = callBind(descriptor.get);
              cache[
                /** @type {`$${TypedArrayName}`} */
                "$" + typedArray
              ] = bound;
            }
          }
        });
      } else {
        forEach(typedArrays, function(typedArray) {
          var arr = new g[typedArray]();
          var fn = arr.slice || arr.set;
          if (fn) {
            var bound = (
              /** @type {BoundSlice | BoundSet} */
              // @ts-expect-error TODO FIXME
              callBind(fn)
            );
            cache[
              /** @type {`$${TypedArrayName}`} */
              "$" + typedArray
            ] = bound;
          }
        });
      }
      function tryTypedArrays(value) {
        var found = false;
        forEach(
          /** @type {Record<`$${TypedArrayName}`, Getter>} */
          cache,
          /** @param {Getter} getter @param {`$${TypedArrayName}`} typedArray */
          function(getter, typedArray) {
            if (!found) {
              try {
                if ("$" + getter(value) === typedArray) {
                  found = /** @type {TypedArrayName} */
                  $slice(typedArray, 1);
                }
              } catch (e) {
              }
            }
          }
        );
        return found;
      }
      function trySlices(value) {
        var found = false;
        forEach(
          /** @type {Record<`$${TypedArrayName}`, Getter>} */
          cache,
          /** @param {Getter} getter @param {`$${TypedArrayName}`} name */
          function(getter, name) {
            if (!found) {
              try {
                getter(value);
                found = /** @type {TypedArrayName} */
                $slice(name, 1);
              } catch (e) {
              }
            }
          }
        );
        return found;
      }
      function isTATag(tag) {
        return $indexOf(typedArrays, tag) > -1;
      }
      module.exports = function whichTypedArray(value) {
        if (!value || typeof value !== "object") {
          return false;
        }
        if (!hasToStringTag) {
          var tag = $slice($toString(value), 8, -1);
          if (isTATag(tag)) {
            return tag;
          }
          if (tag !== "Object") {
            return false;
          }
          return trySlices(value);
        }
        if (!gOPD) {
          return null;
        }
        return tryTypedArrays(value);
      };
    }
  });

  // node_modules/is-typed-array/index.js
  var require_is_typed_array = __commonJS({
    "node_modules/is-typed-array/index.js"(exports, module) {
      "use strict";
      var whichTypedArray = require_which_typed_array();
      module.exports = function isTypedArray(value) {
        return !!whichTypedArray(value);
      };
    }
  });

  // node_modules/util/support/types.js
  var require_types = __commonJS({
    "node_modules/util/support/types.js"(exports) {
      "use strict";
      var isArgumentsObject = require_is_arguments();
      var isGeneratorFunction = require_is_generator_function();
      var whichTypedArray = require_which_typed_array();
      var isTypedArray = require_is_typed_array();
      function uncurryThis(f) {
        return f.call.bind(f);
      }
      var BigIntSupported = typeof BigInt !== "undefined";
      var SymbolSupported = typeof Symbol !== "undefined";
      var ObjectToString = uncurryThis(Object.prototype.toString);
      var numberValue = uncurryThis(Number.prototype.valueOf);
      var stringValue = uncurryThis(String.prototype.valueOf);
      var booleanValue = uncurryThis(Boolean.prototype.valueOf);
      if (BigIntSupported) {
        bigIntValue = uncurryThis(BigInt.prototype.valueOf);
      }
      var bigIntValue;
      if (SymbolSupported) {
        symbolValue = uncurryThis(Symbol.prototype.valueOf);
      }
      var symbolValue;
      function checkBoxedPrimitive(value, prototypeValueOf) {
        if (typeof value !== "object") {
          return false;
        }
        try {
          prototypeValueOf(value);
          return true;
        } catch (e) {
          return false;
        }
      }
      exports.isArgumentsObject = isArgumentsObject;
      exports.isGeneratorFunction = isGeneratorFunction;
      exports.isTypedArray = isTypedArray;
      function isPromise(input) {
        return typeof Promise !== "undefined" && input instanceof Promise || input !== null && typeof input === "object" && typeof input.then === "function" && typeof input.catch === "function";
      }
      exports.isPromise = isPromise;
      function isArrayBufferView(value) {
        if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
          return ArrayBuffer.isView(value);
        }
        return isTypedArray(value) || isDataView(value);
      }
      exports.isArrayBufferView = isArrayBufferView;
      function isUint8Array(value) {
        return whichTypedArray(value) === "Uint8Array";
      }
      exports.isUint8Array = isUint8Array;
      function isUint8ClampedArray(value) {
        return whichTypedArray(value) === "Uint8ClampedArray";
      }
      exports.isUint8ClampedArray = isUint8ClampedArray;
      function isUint16Array(value) {
        return whichTypedArray(value) === "Uint16Array";
      }
      exports.isUint16Array = isUint16Array;
      function isUint32Array(value) {
        return whichTypedArray(value) === "Uint32Array";
      }
      exports.isUint32Array = isUint32Array;
      function isInt8Array(value) {
        return whichTypedArray(value) === "Int8Array";
      }
      exports.isInt8Array = isInt8Array;
      function isInt16Array(value) {
        return whichTypedArray(value) === "Int16Array";
      }
      exports.isInt16Array = isInt16Array;
      function isInt32Array(value) {
        return whichTypedArray(value) === "Int32Array";
      }
      exports.isInt32Array = isInt32Array;
      function isFloat32Array(value) {
        return whichTypedArray(value) === "Float32Array";
      }
      exports.isFloat32Array = isFloat32Array;
      function isFloat64Array(value) {
        return whichTypedArray(value) === "Float64Array";
      }
      exports.isFloat64Array = isFloat64Array;
      function isBigInt64Array(value) {
        return whichTypedArray(value) === "BigInt64Array";
      }
      exports.isBigInt64Array = isBigInt64Array;
      function isBigUint64Array(value) {
        return whichTypedArray(value) === "BigUint64Array";
      }
      exports.isBigUint64Array = isBigUint64Array;
      function isMapToString(value) {
        return ObjectToString(value) === "[object Map]";
      }
      isMapToString.working = typeof Map !== "undefined" && isMapToString(/* @__PURE__ */ new Map());
      function isMap(value) {
        if (typeof Map === "undefined") {
          return false;
        }
        return isMapToString.working ? isMapToString(value) : value instanceof Map;
      }
      exports.isMap = isMap;
      function isSetToString(value) {
        return ObjectToString(value) === "[object Set]";
      }
      isSetToString.working = typeof Set !== "undefined" && isSetToString(/* @__PURE__ */ new Set());
      function isSet(value) {
        if (typeof Set === "undefined") {
          return false;
        }
        return isSetToString.working ? isSetToString(value) : value instanceof Set;
      }
      exports.isSet = isSet;
      function isWeakMapToString(value) {
        return ObjectToString(value) === "[object WeakMap]";
      }
      isWeakMapToString.working = typeof WeakMap !== "undefined" && isWeakMapToString(/* @__PURE__ */ new WeakMap());
      function isWeakMap(value) {
        if (typeof WeakMap === "undefined") {
          return false;
        }
        return isWeakMapToString.working ? isWeakMapToString(value) : value instanceof WeakMap;
      }
      exports.isWeakMap = isWeakMap;
      function isWeakSetToString(value) {
        return ObjectToString(value) === "[object WeakSet]";
      }
      isWeakSetToString.working = typeof WeakSet !== "undefined" && isWeakSetToString(/* @__PURE__ */ new WeakSet());
      function isWeakSet(value) {
        return isWeakSetToString(value);
      }
      exports.isWeakSet = isWeakSet;
      function isArrayBufferToString(value) {
        return ObjectToString(value) === "[object ArrayBuffer]";
      }
      isArrayBufferToString.working = typeof ArrayBuffer !== "undefined" && isArrayBufferToString(new ArrayBuffer());
      function isArrayBuffer(value) {
        if (typeof ArrayBuffer === "undefined") {
          return false;
        }
        return isArrayBufferToString.working ? isArrayBufferToString(value) : value instanceof ArrayBuffer;
      }
      exports.isArrayBuffer = isArrayBuffer;
      function isDataViewToString(value) {
        return ObjectToString(value) === "[object DataView]";
      }
      isDataViewToString.working = typeof ArrayBuffer !== "undefined" && typeof DataView !== "undefined" && isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1));
      function isDataView(value) {
        if (typeof DataView === "undefined") {
          return false;
        }
        return isDataViewToString.working ? isDataViewToString(value) : value instanceof DataView;
      }
      exports.isDataView = isDataView;
      var SharedArrayBufferCopy = typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : void 0;
      function isSharedArrayBufferToString(value) {
        return ObjectToString(value) === "[object SharedArrayBuffer]";
      }
      function isSharedArrayBuffer(value) {
        if (typeof SharedArrayBufferCopy === "undefined") {
          return false;
        }
        if (typeof isSharedArrayBufferToString.working === "undefined") {
          isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy());
        }
        return isSharedArrayBufferToString.working ? isSharedArrayBufferToString(value) : value instanceof SharedArrayBufferCopy;
      }
      exports.isSharedArrayBuffer = isSharedArrayBuffer;
      function isAsyncFunction(value) {
        return ObjectToString(value) === "[object AsyncFunction]";
      }
      exports.isAsyncFunction = isAsyncFunction;
      function isMapIterator(value) {
        return ObjectToString(value) === "[object Map Iterator]";
      }
      exports.isMapIterator = isMapIterator;
      function isSetIterator(value) {
        return ObjectToString(value) === "[object Set Iterator]";
      }
      exports.isSetIterator = isSetIterator;
      function isGeneratorObject(value) {
        return ObjectToString(value) === "[object Generator]";
      }
      exports.isGeneratorObject = isGeneratorObject;
      function isWebAssemblyCompiledModule(value) {
        return ObjectToString(value) === "[object WebAssembly.Module]";
      }
      exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;
      function isNumberObject(value) {
        return checkBoxedPrimitive(value, numberValue);
      }
      exports.isNumberObject = isNumberObject;
      function isStringObject(value) {
        return checkBoxedPrimitive(value, stringValue);
      }
      exports.isStringObject = isStringObject;
      function isBooleanObject(value) {
        return checkBoxedPrimitive(value, booleanValue);
      }
      exports.isBooleanObject = isBooleanObject;
      function isBigIntObject(value) {
        return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
      }
      exports.isBigIntObject = isBigIntObject;
      function isSymbolObject(value) {
        return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
      }
      exports.isSymbolObject = isSymbolObject;
      function isBoxedPrimitive(value) {
        return isNumberObject(value) || isStringObject(value) || isBooleanObject(value) || isBigIntObject(value) || isSymbolObject(value);
      }
      exports.isBoxedPrimitive = isBoxedPrimitive;
      function isAnyArrayBuffer(value) {
        return typeof Uint8Array !== "undefined" && (isArrayBuffer(value) || isSharedArrayBuffer(value));
      }
      exports.isAnyArrayBuffer = isAnyArrayBuffer;
      ["isProxy", "isExternal", "isModuleNamespaceObject"].forEach(function(method) {
        Object.defineProperty(exports, method, {
          enumerable: false,
          value: function() {
            throw new Error(method + " is not supported in userland");
          }
        });
      });
    }
  });

  // node_modules/util/support/isBufferBrowser.js
  var require_isBufferBrowser = __commonJS({
    "node_modules/util/support/isBufferBrowser.js"(exports, module) {
      module.exports = function isBuffer(arg) {
        return arg && typeof arg === "object" && typeof arg.copy === "function" && typeof arg.fill === "function" && typeof arg.readUInt8 === "function";
      };
    }
  });

  // node_modules/inherits/inherits_browser.js
  var require_inherits_browser = __commonJS({
    "node_modules/inherits/inherits_browser.js"(exports, module) {
      if (typeof Object.create === "function") {
        module.exports = function inherits(ctor, superCtor) {
          if (superCtor) {
            ctor.super_ = superCtor;
            ctor.prototype = Object.create(superCtor.prototype, {
              constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
              }
            });
          }
        };
      } else {
        module.exports = function inherits(ctor, superCtor) {
          if (superCtor) {
            ctor.super_ = superCtor;
            var TempCtor = function() {
            };
            TempCtor.prototype = superCtor.prototype;
            ctor.prototype = new TempCtor();
            ctor.prototype.constructor = ctor;
          }
        };
      }
    }
  });

  // node_modules/util/util.js
  var require_util = __commonJS({
    "node_modules/util/util.js"(exports) {
      var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors || function getOwnPropertyDescriptors2(obj) {
        var keys = Object.keys(obj);
        var descriptors = {};
        for (var i = 0; i < keys.length; i++) {
          descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
        }
        return descriptors;
      };
      var formatRegExp = /%[sdj%]/g;
      exports.format = function(f) {
        if (!isString(f)) {
          var objects = [];
          for (var i = 0; i < arguments.length; i++) {
            objects.push(inspect(arguments[i]));
          }
          return objects.join(" ");
        }
        var i = 1;
        var args = arguments;
        var len = args.length;
        var str = String(f).replace(formatRegExp, function(x2) {
          if (x2 === "%%") return "%";
          if (i >= len) return x2;
          switch (x2) {
            case "%s":
              return String(args[i++]);
            case "%d":
              return Number(args[i++]);
            case "%j":
              try {
                return JSON.stringify(args[i++]);
              } catch (_) {
                return "[Circular]";
              }
            default:
              return x2;
          }
        });
        for (var x = args[i]; i < len; x = args[++i]) {
          if (isNull(x) || !isObject(x)) {
            str += " " + x;
          } else {
            str += " " + inspect(x);
          }
        }
        return str;
      };
      exports.deprecate = function(fn, msg) {
        if (typeof process !== "undefined" && process.noDeprecation === true) {
          return fn;
        }
        if (typeof process === "undefined") {
          return function() {
            return exports.deprecate(fn, msg).apply(this, arguments);
          };
        }
        var warned = false;
        function deprecated() {
          if (!warned) {
            if (process.throwDeprecation) {
              throw new Error(msg);
            } else if (process.traceDeprecation) {
              console.trace(msg);
            } else {
              console.error(msg);
            }
            warned = true;
          }
          return fn.apply(this, arguments);
        }
        return deprecated;
      };
      var debugs = {};
      var debugEnvRegex = /^$/;
      if (process.env.NODE_DEBUG) {
        debugEnv = process.env.NODE_DEBUG;
        debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".*").replace(/,/g, "$|^").toUpperCase();
        debugEnvRegex = new RegExp("^" + debugEnv + "$", "i");
      }
      var debugEnv;
      exports.debuglog = function(set) {
        set = set.toUpperCase();
        if (!debugs[set]) {
          if (debugEnvRegex.test(set)) {
            var pid = process.pid;
            debugs[set] = function() {
              var msg = exports.format.apply(exports, arguments);
              console.error("%s %d: %s", set, pid, msg);
            };
          } else {
            debugs[set] = function() {
            };
          }
        }
        return debugs[set];
      };
      function inspect(obj, opts) {
        var ctx = {
          seen: [],
          stylize: stylizeNoColor
        };
        if (arguments.length >= 3) ctx.depth = arguments[2];
        if (arguments.length >= 4) ctx.colors = arguments[3];
        if (isBoolean(opts)) {
          ctx.showHidden = opts;
        } else if (opts) {
          exports._extend(ctx, opts);
        }
        if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
        if (isUndefined(ctx.depth)) ctx.depth = 2;
        if (isUndefined(ctx.colors)) ctx.colors = false;
        if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
        if (ctx.colors) ctx.stylize = stylizeWithColor;
        return formatValue(ctx, obj, ctx.depth);
      }
      exports.inspect = inspect;
      inspect.colors = {
        "bold": [1, 22],
        "italic": [3, 23],
        "underline": [4, 24],
        "inverse": [7, 27],
        "white": [37, 39],
        "grey": [90, 39],
        "black": [30, 39],
        "blue": [34, 39],
        "cyan": [36, 39],
        "green": [32, 39],
        "magenta": [35, 39],
        "red": [31, 39],
        "yellow": [33, 39]
      };
      inspect.styles = {
        "special": "cyan",
        "number": "yellow",
        "boolean": "yellow",
        "undefined": "grey",
        "null": "bold",
        "string": "green",
        "date": "magenta",
        // "name": intentionally not styling
        "regexp": "red"
      };
      function stylizeWithColor(str, styleType) {
        var style = inspect.styles[styleType];
        if (style) {
          return "\x1B[" + inspect.colors[style][0] + "m" + str + "\x1B[" + inspect.colors[style][1] + "m";
        } else {
          return str;
        }
      }
      function stylizeNoColor(str, styleType) {
        return str;
      }
      function arrayToHash(array) {
        var hash = {};
        array.forEach(function(val, idx) {
          hash[val] = true;
        });
        return hash;
      }
      function formatValue(ctx, value, recurseTimes) {
        if (ctx.customInspect && value && isFunction(value.inspect) && // Filter out the util module, it's inspect function is special
        value.inspect !== exports.inspect && // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
          var ret = value.inspect(recurseTimes, ctx);
          if (!isString(ret)) {
            ret = formatValue(ctx, ret, recurseTimes);
          }
          return ret;
        }
        var primitive = formatPrimitive(ctx, value);
        if (primitive) {
          return primitive;
        }
        var keys = Object.keys(value);
        var visibleKeys = arrayToHash(keys);
        if (ctx.showHidden) {
          keys = Object.getOwnPropertyNames(value);
        }
        if (isError(value) && (keys.indexOf("message") >= 0 || keys.indexOf("description") >= 0)) {
          return formatError(value);
        }
        if (keys.length === 0) {
          if (isFunction(value)) {
            var name = value.name ? ": " + value.name : "";
            return ctx.stylize("[Function" + name + "]", "special");
          }
          if (isRegExp(value)) {
            return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
          }
          if (isDate(value)) {
            return ctx.stylize(Date.prototype.toString.call(value), "date");
          }
          if (isError(value)) {
            return formatError(value);
          }
        }
        var base = "", array = false, braces = ["{", "}"];
        if (isArray(value)) {
          array = true;
          braces = ["[", "]"];
        }
        if (isFunction(value)) {
          var n = value.name ? ": " + value.name : "";
          base = " [Function" + n + "]";
        }
        if (isRegExp(value)) {
          base = " " + RegExp.prototype.toString.call(value);
        }
        if (isDate(value)) {
          base = " " + Date.prototype.toUTCString.call(value);
        }
        if (isError(value)) {
          base = " " + formatError(value);
        }
        if (keys.length === 0 && (!array || value.length == 0)) {
          return braces[0] + base + braces[1];
        }
        if (recurseTimes < 0) {
          if (isRegExp(value)) {
            return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
          } else {
            return ctx.stylize("[Object]", "special");
          }
        }
        ctx.seen.push(value);
        var output;
        if (array) {
          output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
        } else {
          output = keys.map(function(key) {
            return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
          });
        }
        ctx.seen.pop();
        return reduceToSingleString(output, base, braces);
      }
      function formatPrimitive(ctx, value) {
        if (isUndefined(value))
          return ctx.stylize("undefined", "undefined");
        if (isString(value)) {
          var simple = "'" + JSON.stringify(value).replace(/^"|"$/g, "").replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
          return ctx.stylize(simple, "string");
        }
        if (isNumber(value))
          return ctx.stylize("" + value, "number");
        if (isBoolean(value))
          return ctx.stylize("" + value, "boolean");
        if (isNull(value))
          return ctx.stylize("null", "null");
      }
      function formatError(value) {
        return "[" + Error.prototype.toString.call(value) + "]";
      }
      function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
        var output = [];
        for (var i = 0, l = value.length; i < l; ++i) {
          if (hasOwnProperty(value, String(i))) {
            output.push(formatProperty(
              ctx,
              value,
              recurseTimes,
              visibleKeys,
              String(i),
              true
            ));
          } else {
            output.push("");
          }
        }
        keys.forEach(function(key) {
          if (!key.match(/^\d+$/)) {
            output.push(formatProperty(
              ctx,
              value,
              recurseTimes,
              visibleKeys,
              key,
              true
            ));
          }
        });
        return output;
      }
      function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
        var name, str, desc;
        desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
        if (desc.get) {
          if (desc.set) {
            str = ctx.stylize("[Getter/Setter]", "special");
          } else {
            str = ctx.stylize("[Getter]", "special");
          }
        } else {
          if (desc.set) {
            str = ctx.stylize("[Setter]", "special");
          }
        }
        if (!hasOwnProperty(visibleKeys, key)) {
          name = "[" + key + "]";
        }
        if (!str) {
          if (ctx.seen.indexOf(desc.value) < 0) {
            if (isNull(recurseTimes)) {
              str = formatValue(ctx, desc.value, null);
            } else {
              str = formatValue(ctx, desc.value, recurseTimes - 1);
            }
            if (str.indexOf("\n") > -1) {
              if (array) {
                str = str.split("\n").map(function(line) {
                  return "  " + line;
                }).join("\n").slice(2);
              } else {
                str = "\n" + str.split("\n").map(function(line) {
                  return "   " + line;
                }).join("\n");
              }
            }
          } else {
            str = ctx.stylize("[Circular]", "special");
          }
        }
        if (isUndefined(name)) {
          if (array && key.match(/^\d+$/)) {
            return str;
          }
          name = JSON.stringify("" + key);
          if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
            name = name.slice(1, -1);
            name = ctx.stylize(name, "name");
          } else {
            name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
            name = ctx.stylize(name, "string");
          }
        }
        return name + ": " + str;
      }
      function reduceToSingleString(output, base, braces) {
        var numLinesEst = 0;
        var length = output.reduce(function(prev, cur) {
          numLinesEst++;
          if (cur.indexOf("\n") >= 0) numLinesEst++;
          return prev + cur.replace(/\u001b\[\d\d?m/g, "").length + 1;
        }, 0);
        if (length > 60) {
          return braces[0] + (base === "" ? "" : base + "\n ") + " " + output.join(",\n  ") + " " + braces[1];
        }
        return braces[0] + base + " " + output.join(", ") + " " + braces[1];
      }
      exports.types = require_types();
      function isArray(ar) {
        return Array.isArray(ar);
      }
      exports.isArray = isArray;
      function isBoolean(arg) {
        return typeof arg === "boolean";
      }
      exports.isBoolean = isBoolean;
      function isNull(arg) {
        return arg === null;
      }
      exports.isNull = isNull;
      function isNullOrUndefined(arg) {
        return arg == null;
      }
      exports.isNullOrUndefined = isNullOrUndefined;
      function isNumber(arg) {
        return typeof arg === "number";
      }
      exports.isNumber = isNumber;
      function isString(arg) {
        return typeof arg === "string";
      }
      exports.isString = isString;
      function isSymbol(arg) {
        return typeof arg === "symbol";
      }
      exports.isSymbol = isSymbol;
      function isUndefined(arg) {
        return arg === void 0;
      }
      exports.isUndefined = isUndefined;
      function isRegExp(re) {
        return isObject(re) && objectToString(re) === "[object RegExp]";
      }
      exports.isRegExp = isRegExp;
      exports.types.isRegExp = isRegExp;
      function isObject(arg) {
        return typeof arg === "object" && arg !== null;
      }
      exports.isObject = isObject;
      function isDate(d) {
        return isObject(d) && objectToString(d) === "[object Date]";
      }
      exports.isDate = isDate;
      exports.types.isDate = isDate;
      function isError(e) {
        return isObject(e) && (objectToString(e) === "[object Error]" || e instanceof Error);
      }
      exports.isError = isError;
      exports.types.isNativeError = isError;
      function isFunction(arg) {
        return typeof arg === "function";
      }
      exports.isFunction = isFunction;
      function isPrimitive(arg) {
        return arg === null || typeof arg === "boolean" || typeof arg === "number" || typeof arg === "string" || typeof arg === "symbol" || // ES6 symbol
        typeof arg === "undefined";
      }
      exports.isPrimitive = isPrimitive;
      exports.isBuffer = require_isBufferBrowser();
      function objectToString(o) {
        return Object.prototype.toString.call(o);
      }
      function pad(n) {
        return n < 10 ? "0" + n.toString(10) : n.toString(10);
      }
      var months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ];
      function timestamp() {
        var d = /* @__PURE__ */ new Date();
        var time = [
          pad(d.getHours()),
          pad(d.getMinutes()),
          pad(d.getSeconds())
        ].join(":");
        return [d.getDate(), months[d.getMonth()], time].join(" ");
      }
      exports.log = function() {
        console.log("%s - %s", timestamp(), exports.format.apply(exports, arguments));
      };
      exports.inherits = require_inherits_browser();
      exports._extend = function(origin, add) {
        if (!add || !isObject(add)) return origin;
        var keys = Object.keys(add);
        var i = keys.length;
        while (i--) {
          origin[keys[i]] = add[keys[i]];
        }
        return origin;
      };
      function hasOwnProperty(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
      }
      var kCustomPromisifiedSymbol = typeof Symbol !== "undefined" ? /* @__PURE__ */ Symbol("util.promisify.custom") : void 0;
      exports.promisify = function promisify(original) {
        if (typeof original !== "function")
          throw new TypeError('The "original" argument must be of type Function');
        if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
          var fn = original[kCustomPromisifiedSymbol];
          if (typeof fn !== "function") {
            throw new TypeError('The "util.promisify.custom" argument must be of type Function');
          }
          Object.defineProperty(fn, kCustomPromisifiedSymbol, {
            value: fn,
            enumerable: false,
            writable: false,
            configurable: true
          });
          return fn;
        }
        function fn() {
          var promiseResolve, promiseReject;
          var promise = new Promise(function(resolve, reject) {
            promiseResolve = resolve;
            promiseReject = reject;
          });
          var args = [];
          for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
          }
          args.push(function(err, value) {
            if (err) {
              promiseReject(err);
            } else {
              promiseResolve(value);
            }
          });
          try {
            original.apply(this, args);
          } catch (err) {
            promiseReject(err);
          }
          return promise;
        }
        Object.setPrototypeOf(fn, Object.getPrototypeOf(original));
        if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
          value: fn,
          enumerable: false,
          writable: false,
          configurable: true
        });
        return Object.defineProperties(
          fn,
          getOwnPropertyDescriptors(original)
        );
      };
      exports.promisify.custom = kCustomPromisifiedSymbol;
      function callbackifyOnRejected(reason, cb) {
        if (!reason) {
          var newReason = new Error("Promise was rejected with a falsy value");
          newReason.reason = reason;
          reason = newReason;
        }
        return cb(reason);
      }
      function callbackify(original) {
        if (typeof original !== "function") {
          throw new TypeError('The "original" argument must be of type Function');
        }
        function callbackified() {
          var args = [];
          for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
          }
          var maybeCb = args.pop();
          if (typeof maybeCb !== "function") {
            throw new TypeError("The last argument must be of type Function");
          }
          var self2 = this;
          var cb = function() {
            return maybeCb.apply(self2, arguments);
          };
          original.apply(this, args).then(
            function(ret) {
              process.nextTick(cb.bind(null, null, ret));
            },
            function(rej) {
              process.nextTick(callbackifyOnRejected.bind(null, rej, cb));
            }
          );
        }
        Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
        Object.defineProperties(
          callbackified,
          getOwnPropertyDescriptors(original)
        );
        return callbackified;
      }
      exports.callbackify = callbackify;
    }
  });

  // node_modules/binary-search-tree/node_modules/underscore/underscore.js
  var require_underscore = __commonJS({
    "node_modules/binary-search-tree/node_modules/underscore/underscore.js"(exports, module) {
      (function() {
        var root = this;
        var previousUnderscore = root._;
        var breaker = {};
        var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;
        var push = ArrayProto.push, slice = ArrayProto.slice, concat = ArrayProto.concat, toString = ObjProto.toString, hasOwnProperty = ObjProto.hasOwnProperty;
        var nativeForEach = ArrayProto.forEach, nativeMap = ArrayProto.map, nativeReduce = ArrayProto.reduce, nativeReduceRight = ArrayProto.reduceRight, nativeFilter = ArrayProto.filter, nativeEvery = ArrayProto.every, nativeSome = ArrayProto.some, nativeIndexOf = ArrayProto.indexOf, nativeLastIndexOf = ArrayProto.lastIndexOf, nativeIsArray = Array.isArray, nativeKeys = Object.keys, nativeBind = FuncProto.bind;
        var _ = function(obj) {
          if (obj instanceof _) return obj;
          if (!(this instanceof _)) return new _(obj);
          this._wrapped = obj;
        };
        if (typeof exports !== "undefined") {
          if (typeof module !== "undefined" && module.exports) {
            exports = module.exports = _;
          }
          exports._ = _;
        } else {
          root._ = _;
        }
        _.VERSION = "1.4.4";
        var each = _.each = _.forEach = function(obj, iterator, context) {
          if (obj == null) return;
          if (nativeForEach && obj.forEach === nativeForEach) {
            obj.forEach(iterator, context);
          } else if (obj.length === +obj.length) {
            for (var i = 0, l = obj.length; i < l; i++) {
              if (iterator.call(context, obj[i], i, obj) === breaker) return;
            }
          } else {
            for (var key in obj) {
              if (_.has(obj, key)) {
                if (iterator.call(context, obj[key], key, obj) === breaker) return;
              }
            }
          }
        };
        _.map = _.collect = function(obj, iterator, context) {
          var results = [];
          if (obj == null) return results;
          if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
          each(obj, function(value, index, list) {
            results[results.length] = iterator.call(context, value, index, list);
          });
          return results;
        };
        var reduceError = "Reduce of empty array with no initial value";
        _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
          var initial = arguments.length > 2;
          if (obj == null) obj = [];
          if (nativeReduce && obj.reduce === nativeReduce) {
            if (context) iterator = _.bind(iterator, context);
            return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
          }
          each(obj, function(value, index, list) {
            if (!initial) {
              memo = value;
              initial = true;
            } else {
              memo = iterator.call(context, memo, value, index, list);
            }
          });
          if (!initial) throw new TypeError(reduceError);
          return memo;
        };
        _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
          var initial = arguments.length > 2;
          if (obj == null) obj = [];
          if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
            if (context) iterator = _.bind(iterator, context);
            return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
          }
          var length = obj.length;
          if (length !== +length) {
            var keys = _.keys(obj);
            length = keys.length;
          }
          each(obj, function(value, index, list) {
            index = keys ? keys[--length] : --length;
            if (!initial) {
              memo = obj[index];
              initial = true;
            } else {
              memo = iterator.call(context, memo, obj[index], index, list);
            }
          });
          if (!initial) throw new TypeError(reduceError);
          return memo;
        };
        _.find = _.detect = function(obj, iterator, context) {
          var result2;
          any(obj, function(value, index, list) {
            if (iterator.call(context, value, index, list)) {
              result2 = value;
              return true;
            }
          });
          return result2;
        };
        _.filter = _.select = function(obj, iterator, context) {
          var results = [];
          if (obj == null) return results;
          if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
          each(obj, function(value, index, list) {
            if (iterator.call(context, value, index, list)) results[results.length] = value;
          });
          return results;
        };
        _.reject = function(obj, iterator, context) {
          return _.filter(obj, function(value, index, list) {
            return !iterator.call(context, value, index, list);
          }, context);
        };
        _.every = _.all = function(obj, iterator, context) {
          iterator || (iterator = _.identity);
          var result2 = true;
          if (obj == null) return result2;
          if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
          each(obj, function(value, index, list) {
            if (!(result2 = result2 && iterator.call(context, value, index, list))) return breaker;
          });
          return !!result2;
        };
        var any = _.some = _.any = function(obj, iterator, context) {
          iterator || (iterator = _.identity);
          var result2 = false;
          if (obj == null) return result2;
          if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
          each(obj, function(value, index, list) {
            if (result2 || (result2 = iterator.call(context, value, index, list))) return breaker;
          });
          return !!result2;
        };
        _.contains = _.include = function(obj, target) {
          if (obj == null) return false;
          if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
          return any(obj, function(value) {
            return value === target;
          });
        };
        _.invoke = function(obj, method) {
          var args = slice.call(arguments, 2);
          var isFunc = _.isFunction(method);
          return _.map(obj, function(value) {
            return (isFunc ? method : value[method]).apply(value, args);
          });
        };
        _.pluck = function(obj, key) {
          return _.map(obj, function(value) {
            return value[key];
          });
        };
        _.where = function(obj, attrs, first) {
          if (_.isEmpty(attrs)) return first ? null : [];
          return _[first ? "find" : "filter"](obj, function(value) {
            for (var key in attrs) {
              if (attrs[key] !== value[key]) return false;
            }
            return true;
          });
        };
        _.findWhere = function(obj, attrs) {
          return _.where(obj, attrs, true);
        };
        _.max = function(obj, iterator, context) {
          if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
            return Math.max.apply(Math, obj);
          }
          if (!iterator && _.isEmpty(obj)) return -Infinity;
          var result2 = { computed: -Infinity, value: -Infinity };
          each(obj, function(value, index, list) {
            var computed = iterator ? iterator.call(context, value, index, list) : value;
            computed >= result2.computed && (result2 = { value, computed });
          });
          return result2.value;
        };
        _.min = function(obj, iterator, context) {
          if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
            return Math.min.apply(Math, obj);
          }
          if (!iterator && _.isEmpty(obj)) return Infinity;
          var result2 = { computed: Infinity, value: Infinity };
          each(obj, function(value, index, list) {
            var computed = iterator ? iterator.call(context, value, index, list) : value;
            computed < result2.computed && (result2 = { value, computed });
          });
          return result2.value;
        };
        _.shuffle = function(obj) {
          var rand;
          var index = 0;
          var shuffled = [];
          each(obj, function(value) {
            rand = _.random(index++);
            shuffled[index - 1] = shuffled[rand];
            shuffled[rand] = value;
          });
          return shuffled;
        };
        var lookupIterator = function(value) {
          return _.isFunction(value) ? value : function(obj) {
            return obj[value];
          };
        };
        _.sortBy = function(obj, value, context) {
          var iterator = lookupIterator(value);
          return _.pluck(_.map(obj, function(value2, index, list) {
            return {
              value: value2,
              index,
              criteria: iterator.call(context, value2, index, list)
            };
          }).sort(function(left, right) {
            var a = left.criteria;
            var b = right.criteria;
            if (a !== b) {
              if (a > b || a === void 0) return 1;
              if (a < b || b === void 0) return -1;
            }
            return left.index < right.index ? -1 : 1;
          }), "value");
        };
        var group = function(obj, value, context, behavior) {
          var result2 = {};
          var iterator = lookupIterator(value || _.identity);
          each(obj, function(value2, index) {
            var key = iterator.call(context, value2, index, obj);
            behavior(result2, key, value2);
          });
          return result2;
        };
        _.groupBy = function(obj, value, context) {
          return group(obj, value, context, function(result2, key, value2) {
            (_.has(result2, key) ? result2[key] : result2[key] = []).push(value2);
          });
        };
        _.countBy = function(obj, value, context) {
          return group(obj, value, context, function(result2, key) {
            if (!_.has(result2, key)) result2[key] = 0;
            result2[key]++;
          });
        };
        _.sortedIndex = function(array, obj, iterator, context) {
          iterator = iterator == null ? _.identity : lookupIterator(iterator);
          var value = iterator.call(context, obj);
          var low = 0, high = array.length;
          while (low < high) {
            var mid = low + high >>> 1;
            iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
          }
          return low;
        };
        _.toArray = function(obj) {
          if (!obj) return [];
          if (_.isArray(obj)) return slice.call(obj);
          if (obj.length === +obj.length) return _.map(obj, _.identity);
          return _.values(obj);
        };
        _.size = function(obj) {
          if (obj == null) return 0;
          return obj.length === +obj.length ? obj.length : _.keys(obj).length;
        };
        _.first = _.head = _.take = function(array, n, guard) {
          if (array == null) return void 0;
          return n != null && !guard ? slice.call(array, 0, n) : array[0];
        };
        _.initial = function(array, n, guard) {
          return slice.call(array, 0, array.length - (n == null || guard ? 1 : n));
        };
        _.last = function(array, n, guard) {
          if (array == null) return void 0;
          if (n != null && !guard) {
            return slice.call(array, Math.max(array.length - n, 0));
          } else {
            return array[array.length - 1];
          }
        };
        _.rest = _.tail = _.drop = function(array, n, guard) {
          return slice.call(array, n == null || guard ? 1 : n);
        };
        _.compact = function(array) {
          return _.filter(array, _.identity);
        };
        var flatten = function(input, shallow, output) {
          each(input, function(value) {
            if (_.isArray(value)) {
              shallow ? push.apply(output, value) : flatten(value, shallow, output);
            } else {
              output.push(value);
            }
          });
          return output;
        };
        _.flatten = function(array, shallow) {
          return flatten(array, shallow, []);
        };
        _.without = function(array) {
          return _.difference(array, slice.call(arguments, 1));
        };
        _.uniq = _.unique = function(array, isSorted, iterator, context) {
          if (_.isFunction(isSorted)) {
            context = iterator;
            iterator = isSorted;
            isSorted = false;
          }
          var initial = iterator ? _.map(array, iterator, context) : array;
          var results = [];
          var seen = [];
          each(initial, function(value, index) {
            if (isSorted ? !index || seen[seen.length - 1] !== value : !_.contains(seen, value)) {
              seen.push(value);
              results.push(array[index]);
            }
          });
          return results;
        };
        _.union = function() {
          return _.uniq(concat.apply(ArrayProto, arguments));
        };
        _.intersection = function(array) {
          var rest = slice.call(arguments, 1);
          return _.filter(_.uniq(array), function(item) {
            return _.every(rest, function(other) {
              return _.indexOf(other, item) >= 0;
            });
          });
        };
        _.difference = function(array) {
          var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
          return _.filter(array, function(value) {
            return !_.contains(rest, value);
          });
        };
        _.zip = function() {
          var args = slice.call(arguments);
          var length = _.max(_.pluck(args, "length"));
          var results = new Array(length);
          for (var i = 0; i < length; i++) {
            results[i] = _.pluck(args, "" + i);
          }
          return results;
        };
        _.object = function(list, values) {
          if (list == null) return {};
          var result2 = {};
          for (var i = 0, l = list.length; i < l; i++) {
            if (values) {
              result2[list[i]] = values[i];
            } else {
              result2[list[i][0]] = list[i][1];
            }
          }
          return result2;
        };
        _.indexOf = function(array, item, isSorted) {
          if (array == null) return -1;
          var i = 0, l = array.length;
          if (isSorted) {
            if (typeof isSorted == "number") {
              i = isSorted < 0 ? Math.max(0, l + isSorted) : isSorted;
            } else {
              i = _.sortedIndex(array, item);
              return array[i] === item ? i : -1;
            }
          }
          if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
          for (; i < l; i++) if (array[i] === item) return i;
          return -1;
        };
        _.lastIndexOf = function(array, item, from) {
          if (array == null) return -1;
          var hasIndex = from != null;
          if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
            return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
          }
          var i = hasIndex ? from : array.length;
          while (i--) if (array[i] === item) return i;
          return -1;
        };
        _.range = function(start, stop, step) {
          if (arguments.length <= 1) {
            stop = start || 0;
            start = 0;
          }
          step = arguments[2] || 1;
          var len = Math.max(Math.ceil((stop - start) / step), 0);
          var idx = 0;
          var range = new Array(len);
          while (idx < len) {
            range[idx++] = start;
            start += step;
          }
          return range;
        };
        _.bind = function(func, context) {
          if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
          var args = slice.call(arguments, 2);
          return function() {
            return func.apply(context, args.concat(slice.call(arguments)));
          };
        };
        _.partial = function(func) {
          var args = slice.call(arguments, 1);
          return function() {
            return func.apply(this, args.concat(slice.call(arguments)));
          };
        };
        _.bindAll = function(obj) {
          var funcs = slice.call(arguments, 1);
          if (funcs.length === 0) funcs = _.functions(obj);
          each(funcs, function(f) {
            obj[f] = _.bind(obj[f], obj);
          });
          return obj;
        };
        _.memoize = function(func, hasher) {
          var memo = {};
          hasher || (hasher = _.identity);
          return function() {
            var key = hasher.apply(this, arguments);
            return _.has(memo, key) ? memo[key] : memo[key] = func.apply(this, arguments);
          };
        };
        _.delay = function(func, wait) {
          var args = slice.call(arguments, 2);
          return setTimeout(function() {
            return func.apply(null, args);
          }, wait);
        };
        _.defer = function(func) {
          return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
        };
        _.throttle = function(func, wait) {
          var context, args, timeout, result2;
          var previous = 0;
          var later = function() {
            previous = /* @__PURE__ */ new Date();
            timeout = null;
            result2 = func.apply(context, args);
          };
          return function() {
            var now = /* @__PURE__ */ new Date();
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0) {
              clearTimeout(timeout);
              timeout = null;
              previous = now;
              result2 = func.apply(context, args);
            } else if (!timeout) {
              timeout = setTimeout(later, remaining);
            }
            return result2;
          };
        };
        _.debounce = function(func, wait, immediate) {
          var timeout, result2;
          return function() {
            var context = this, args = arguments;
            var later = function() {
              timeout = null;
              if (!immediate) result2 = func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) result2 = func.apply(context, args);
            return result2;
          };
        };
        _.once = function(func) {
          var ran = false, memo;
          return function() {
            if (ran) return memo;
            ran = true;
            memo = func.apply(this, arguments);
            func = null;
            return memo;
          };
        };
        _.wrap = function(func, wrapper) {
          return function() {
            var args = [func];
            push.apply(args, arguments);
            return wrapper.apply(this, args);
          };
        };
        _.compose = function() {
          var funcs = arguments;
          return function() {
            var args = arguments;
            for (var i = funcs.length - 1; i >= 0; i--) {
              args = [funcs[i].apply(this, args)];
            }
            return args[0];
          };
        };
        _.after = function(times, func) {
          if (times <= 0) return func();
          return function() {
            if (--times < 1) {
              return func.apply(this, arguments);
            }
          };
        };
        _.keys = nativeKeys || function(obj) {
          if (obj !== Object(obj)) throw new TypeError("Invalid object");
          var keys = [];
          for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
          return keys;
        };
        _.values = function(obj) {
          var values = [];
          for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
          return values;
        };
        _.pairs = function(obj) {
          var pairs = [];
          for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
          return pairs;
        };
        _.invert = function(obj) {
          var result2 = {};
          for (var key in obj) if (_.has(obj, key)) result2[obj[key]] = key;
          return result2;
        };
        _.functions = _.methods = function(obj) {
          var names = [];
          for (var key in obj) {
            if (_.isFunction(obj[key])) names.push(key);
          }
          return names.sort();
        };
        _.extend = function(obj) {
          each(slice.call(arguments, 1), function(source) {
            if (source) {
              for (var prop in source) {
                obj[prop] = source[prop];
              }
            }
          });
          return obj;
        };
        _.pick = function(obj) {
          var copy = {};
          var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
          each(keys, function(key) {
            if (key in obj) copy[key] = obj[key];
          });
          return copy;
        };
        _.omit = function(obj) {
          var copy = {};
          var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
          for (var key in obj) {
            if (!_.contains(keys, key)) copy[key] = obj[key];
          }
          return copy;
        };
        _.defaults = function(obj) {
          each(slice.call(arguments, 1), function(source) {
            if (source) {
              for (var prop in source) {
                if (obj[prop] == null) obj[prop] = source[prop];
              }
            }
          });
          return obj;
        };
        _.clone = function(obj) {
          if (!_.isObject(obj)) return obj;
          return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
        };
        _.tap = function(obj, interceptor) {
          interceptor(obj);
          return obj;
        };
        var eq = function(a, b, aStack, bStack) {
          if (a === b) return a !== 0 || 1 / a == 1 / b;
          if (a == null || b == null) return a === b;
          if (a instanceof _) a = a._wrapped;
          if (b instanceof _) b = b._wrapped;
          var className = toString.call(a);
          if (className != toString.call(b)) return false;
          switch (className) {
            // Strings, numbers, dates, and booleans are compared by value.
            case "[object String]":
              return a == String(b);
            case "[object Number]":
              return a != +a ? b != +b : a == 0 ? 1 / a == 1 / b : a == +b;
            case "[object Date]":
            case "[object Boolean]":
              return +a == +b;
            // RegExps are compared by their source patterns and flags.
            case "[object RegExp]":
              return a.source == b.source && a.global == b.global && a.multiline == b.multiline && a.ignoreCase == b.ignoreCase;
          }
          if (typeof a != "object" || typeof b != "object") return false;
          var length = aStack.length;
          while (length--) {
            if (aStack[length] == a) return bStack[length] == b;
          }
          aStack.push(a);
          bStack.push(b);
          var size = 0, result2 = true;
          if (className == "[object Array]") {
            size = a.length;
            result2 = size == b.length;
            if (result2) {
              while (size--) {
                if (!(result2 = eq(a[size], b[size], aStack, bStack))) break;
              }
            }
          } else {
            var aCtor = a.constructor, bCtor = b.constructor;
            if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor && _.isFunction(bCtor) && bCtor instanceof bCtor)) {
              return false;
            }
            for (var key in a) {
              if (_.has(a, key)) {
                size++;
                if (!(result2 = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
              }
            }
            if (result2) {
              for (key in b) {
                if (_.has(b, key) && !size--) break;
              }
              result2 = !size;
            }
          }
          aStack.pop();
          bStack.pop();
          return result2;
        };
        _.isEqual = function(a, b) {
          return eq(a, b, [], []);
        };
        _.isEmpty = function(obj) {
          if (obj == null) return true;
          if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
          for (var key in obj) if (_.has(obj, key)) return false;
          return true;
        };
        _.isElement = function(obj) {
          return !!(obj && obj.nodeType === 1);
        };
        _.isArray = nativeIsArray || function(obj) {
          return toString.call(obj) == "[object Array]";
        };
        _.isObject = function(obj) {
          return obj === Object(obj);
        };
        each(["Arguments", "Function", "String", "Number", "Date", "RegExp"], function(name) {
          _["is" + name] = function(obj) {
            return toString.call(obj) == "[object " + name + "]";
          };
        });
        if (!_.isArguments(arguments)) {
          _.isArguments = function(obj) {
            return !!(obj && _.has(obj, "callee"));
          };
        }
        if (typeof /./ !== "function") {
          _.isFunction = function(obj) {
            return typeof obj === "function";
          };
        }
        _.isFinite = function(obj) {
          return isFinite(obj) && !isNaN(parseFloat(obj));
        };
        _.isNaN = function(obj) {
          return _.isNumber(obj) && obj != +obj;
        };
        _.isBoolean = function(obj) {
          return obj === true || obj === false || toString.call(obj) == "[object Boolean]";
        };
        _.isNull = function(obj) {
          return obj === null;
        };
        _.isUndefined = function(obj) {
          return obj === void 0;
        };
        _.has = function(obj, key) {
          return hasOwnProperty.call(obj, key);
        };
        _.noConflict = function() {
          root._ = previousUnderscore;
          return this;
        };
        _.identity = function(value) {
          return value;
        };
        _.times = function(n, iterator, context) {
          var accum = Array(n);
          for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
          return accum;
        };
        _.random = function(min, max) {
          if (max == null) {
            max = min;
            min = 0;
          }
          return min + Math.floor(Math.random() * (max - min + 1));
        };
        var entityMap = {
          escape: {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#x27;",
            "/": "&#x2F;"
          }
        };
        entityMap.unescape = _.invert(entityMap.escape);
        var entityRegexes = {
          escape: new RegExp("[" + _.keys(entityMap.escape).join("") + "]", "g"),
          unescape: new RegExp("(" + _.keys(entityMap.unescape).join("|") + ")", "g")
        };
        _.each(["escape", "unescape"], function(method) {
          _[method] = function(string) {
            if (string == null) return "";
            return ("" + string).replace(entityRegexes[method], function(match) {
              return entityMap[method][match];
            });
          };
        });
        _.result = function(object, property) {
          if (object == null) return null;
          var value = object[property];
          return _.isFunction(value) ? value.call(object) : value;
        };
        _.mixin = function(obj) {
          each(_.functions(obj), function(name) {
            var func = _[name] = obj[name];
            _.prototype[name] = function() {
              var args = [this._wrapped];
              push.apply(args, arguments);
              return result.call(this, func.apply(_, args));
            };
          });
        };
        var idCounter = 0;
        _.uniqueId = function(prefix) {
          var id = ++idCounter + "";
          return prefix ? prefix + id : id;
        };
        _.templateSettings = {
          evaluate: /<%([\s\S]+?)%>/g,
          interpolate: /<%=([\s\S]+?)%>/g,
          escape: /<%-([\s\S]+?)%>/g
        };
        var noMatch = /(.)^/;
        var escapes = {
          "'": "'",
          "\\": "\\",
          "\r": "r",
          "\n": "n",
          "	": "t",
          "\u2028": "u2028",
          "\u2029": "u2029"
        };
        var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
        _.template = function(text, data, settings) {
          var render;
          settings = _.defaults({}, settings, _.templateSettings);
          var matcher = new RegExp([
            (settings.escape || noMatch).source,
            (settings.interpolate || noMatch).source,
            (settings.evaluate || noMatch).source
          ].join("|") + "|$", "g");
          var index = 0;
          var source = "__p+='";
          text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
            source += text.slice(index, offset).replace(escaper, function(match2) {
              return "\\" + escapes[match2];
            });
            if (escape) {
              source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
            }
            if (interpolate) {
              source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
            }
            if (evaluate) {
              source += "';\n" + evaluate + "\n__p+='";
            }
            index = offset + match.length;
            return match;
          });
          source += "';\n";
          if (!settings.variable) source = "with(obj||{}){\n" + source + "}\n";
          source = "var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\n" + source + "return __p;\n";
          try {
            render = new Function(settings.variable || "obj", "_", source);
          } catch (e) {
            e.source = source;
            throw e;
          }
          if (data) return render(data, _);
          var template = function(data2) {
            return render.call(this, data2, _);
          };
          template.source = "function(" + (settings.variable || "obj") + "){\n" + source + "}";
          return template;
        };
        _.chain = function(obj) {
          return _(obj).chain();
        };
        var result = function(obj) {
          return this._chain ? _(obj).chain() : obj;
        };
        _.mixin(_);
        each(["pop", "push", "reverse", "shift", "sort", "splice", "unshift"], function(name) {
          var method = ArrayProto[name];
          _.prototype[name] = function() {
            var obj = this._wrapped;
            method.apply(obj, arguments);
            if ((name == "shift" || name == "splice") && obj.length === 0) delete obj[0];
            return result.call(this, obj);
          };
        });
        each(["concat", "join", "slice"], function(name) {
          var method = ArrayProto[name];
          _.prototype[name] = function() {
            return result.call(this, method.apply(this._wrapped, arguments));
          };
        });
        _.extend(_.prototype, {
          // Start chaining a wrapped Underscore object.
          chain: function() {
            this._chain = true;
            return this;
          },
          // Extracts the result from a wrapped and chained object.
          value: function() {
            return this._wrapped;
          }
        });
      }).call(exports);
    }
  });

  // node_modules/binary-search-tree/lib/avltree.js
  var require_avltree = __commonJS({
    "node_modules/binary-search-tree/lib/avltree.js"(exports, module) {
      var BinarySearchTree = require_bst();
      var customUtils = require_customUtils2();
      var util = require_util();
      var _ = require_underscore();
      function AVLTree(options) {
        this.tree = new _AVLTree(options);
      }
      function _AVLTree(options) {
        options = options || {};
        this.left = null;
        this.right = null;
        this.parent = options.parent !== void 0 ? options.parent : null;
        if (options.hasOwnProperty("key")) {
          this.key = options.key;
        }
        this.data = options.hasOwnProperty("value") ? [options.value] : [];
        this.unique = options.unique || false;
        this.compareKeys = options.compareKeys || customUtils.defaultCompareKeysFunction;
        this.checkValueEquality = options.checkValueEquality || customUtils.defaultCheckValueEquality;
      }
      util.inherits(_AVLTree, BinarySearchTree);
      AVLTree._AVLTree = _AVLTree;
      _AVLTree.prototype.checkHeightCorrect = function() {
        var leftH, rightH;
        if (!this.hasOwnProperty("key")) {
          return;
        }
        if (this.left && this.left.height === void 0) {
          throw new Error("Undefined height for node " + this.left.key);
        }
        if (this.right && this.right.height === void 0) {
          throw new Error("Undefined height for node " + this.right.key);
        }
        if (this.height === void 0) {
          throw new Error("Undefined height for node " + this.key);
        }
        leftH = this.left ? this.left.height : 0;
        rightH = this.right ? this.right.height : 0;
        if (this.height !== 1 + Math.max(leftH, rightH)) {
          throw new Error("Height constraint failed for node " + this.key);
        }
        if (this.left) {
          this.left.checkHeightCorrect();
        }
        if (this.right) {
          this.right.checkHeightCorrect();
        }
      };
      _AVLTree.prototype.balanceFactor = function() {
        var leftH = this.left ? this.left.height : 0, rightH = this.right ? this.right.height : 0;
        return leftH - rightH;
      };
      _AVLTree.prototype.checkBalanceFactors = function() {
        if (Math.abs(this.balanceFactor()) > 1) {
          throw new Error("Tree is unbalanced at node " + this.key);
        }
        if (this.left) {
          this.left.checkBalanceFactors();
        }
        if (this.right) {
          this.right.checkBalanceFactors();
        }
      };
      _AVLTree.prototype.checkIsAVLT = function() {
        _AVLTree.super_.prototype.checkIsBST.call(this);
        this.checkHeightCorrect();
        this.checkBalanceFactors();
      };
      AVLTree.prototype.checkIsAVLT = function() {
        this.tree.checkIsAVLT();
      };
      _AVLTree.prototype.rightRotation = function() {
        var q = this, p = this.left, b, ah, bh, ch;
        if (!p) {
          return this;
        }
        b = p.right;
        if (q.parent) {
          p.parent = q.parent;
          if (q.parent.left === q) {
            q.parent.left = p;
          } else {
            q.parent.right = p;
          }
        } else {
          p.parent = null;
        }
        p.right = q;
        q.parent = p;
        q.left = b;
        if (b) {
          b.parent = q;
        }
        ah = p.left ? p.left.height : 0;
        bh = b ? b.height : 0;
        ch = q.right ? q.right.height : 0;
        q.height = Math.max(bh, ch) + 1;
        p.height = Math.max(ah, q.height) + 1;
        return p;
      };
      _AVLTree.prototype.leftRotation = function() {
        var p = this, q = this.right, b, ah, bh, ch;
        if (!q) {
          return this;
        }
        b = q.left;
        if (p.parent) {
          q.parent = p.parent;
          if (p.parent.left === p) {
            p.parent.left = q;
          } else {
            p.parent.right = q;
          }
        } else {
          q.parent = null;
        }
        q.left = p;
        p.parent = q;
        p.right = b;
        if (b) {
          b.parent = p;
        }
        ah = p.left ? p.left.height : 0;
        bh = b ? b.height : 0;
        ch = q.right ? q.right.height : 0;
        p.height = Math.max(ah, bh) + 1;
        q.height = Math.max(ch, p.height) + 1;
        return q;
      };
      _AVLTree.prototype.rightTooSmall = function() {
        if (this.balanceFactor() <= 1) {
          return this;
        }
        if (this.left.balanceFactor() < 0) {
          this.left.leftRotation();
        }
        return this.rightRotation();
      };
      _AVLTree.prototype.leftTooSmall = function() {
        if (this.balanceFactor() >= -1) {
          return this;
        }
        if (this.right.balanceFactor() > 0) {
          this.right.rightRotation();
        }
        return this.leftRotation();
      };
      _AVLTree.prototype.rebalanceAlongPath = function(path) {
        var newRoot = this, rotated, i;
        if (!this.hasOwnProperty("key")) {
          delete this.height;
          return this;
        }
        for (i = path.length - 1; i >= 0; i -= 1) {
          path[i].height = 1 + Math.max(path[i].left ? path[i].left.height : 0, path[i].right ? path[i].right.height : 0);
          if (path[i].balanceFactor() > 1) {
            rotated = path[i].rightTooSmall();
            if (i === 0) {
              newRoot = rotated;
            }
          }
          if (path[i].balanceFactor() < -1) {
            rotated = path[i].leftTooSmall();
            if (i === 0) {
              newRoot = rotated;
            }
          }
        }
        return newRoot;
      };
      _AVLTree.prototype.insert = function(key, value) {
        var insertPath = [], currentNode = this;
        if (!this.hasOwnProperty("key")) {
          this.key = key;
          this.data.push(value);
          this.height = 1;
          return this;
        }
        while (true) {
          if (currentNode.compareKeys(currentNode.key, key) === 0) {
            if (currentNode.unique) {
              var err = new Error("Can't insert key " + key + ", it violates the unique constraint");
              err.key = key;
              err.errorType = "uniqueViolated";
              throw err;
            } else {
              currentNode.data.push(value);
            }
            return this;
          }
          insertPath.push(currentNode);
          if (currentNode.compareKeys(key, currentNode.key) < 0) {
            if (!currentNode.left) {
              insertPath.push(currentNode.createLeftChild({ key, value }));
              break;
            } else {
              currentNode = currentNode.left;
            }
          } else {
            if (!currentNode.right) {
              insertPath.push(currentNode.createRightChild({ key, value }));
              break;
            } else {
              currentNode = currentNode.right;
            }
          }
        }
        return this.rebalanceAlongPath(insertPath);
      };
      AVLTree.prototype.insert = function(key, value) {
        var newTree = this.tree.insert(key, value);
        if (newTree) {
          this.tree = newTree;
        }
      };
      _AVLTree.prototype.delete = function(key, value) {
        var newData = [], replaceWith, self2 = this, currentNode = this, deletePath = [];
        if (!this.hasOwnProperty("key")) {
          return this;
        }
        while (true) {
          if (currentNode.compareKeys(key, currentNode.key) === 0) {
            break;
          }
          deletePath.push(currentNode);
          if (currentNode.compareKeys(key, currentNode.key) < 0) {
            if (currentNode.left) {
              currentNode = currentNode.left;
            } else {
              return this;
            }
          } else {
            if (currentNode.right) {
              currentNode = currentNode.right;
            } else {
              return this;
            }
          }
        }
        if (currentNode.data.length > 1 && value) {
          currentNode.data.forEach(function(d) {
            if (!currentNode.checkValueEquality(d, value)) {
              newData.push(d);
            }
          });
          currentNode.data = newData;
          return this;
        }
        if (!currentNode.left && !currentNode.right) {
          if (currentNode === this) {
            delete currentNode.key;
            currentNode.data = [];
            delete currentNode.height;
            return this;
          } else {
            if (currentNode.parent.left === currentNode) {
              currentNode.parent.left = null;
            } else {
              currentNode.parent.right = null;
            }
            return this.rebalanceAlongPath(deletePath);
          }
        }
        if (!currentNode.left || !currentNode.right) {
          replaceWith = currentNode.left ? currentNode.left : currentNode.right;
          if (currentNode === this) {
            replaceWith.parent = null;
            return replaceWith;
          } else {
            if (currentNode.parent.left === currentNode) {
              currentNode.parent.left = replaceWith;
              replaceWith.parent = currentNode.parent;
            } else {
              currentNode.parent.right = replaceWith;
              replaceWith.parent = currentNode.parent;
            }
            return this.rebalanceAlongPath(deletePath);
          }
        }
        deletePath.push(currentNode);
        replaceWith = currentNode.left;
        if (!replaceWith.right) {
          currentNode.key = replaceWith.key;
          currentNode.data = replaceWith.data;
          currentNode.left = replaceWith.left;
          if (replaceWith.left) {
            replaceWith.left.parent = currentNode;
          }
          return this.rebalanceAlongPath(deletePath);
        }
        while (true) {
          if (replaceWith.right) {
            deletePath.push(replaceWith);
            replaceWith = replaceWith.right;
          } else {
            break;
          }
        }
        currentNode.key = replaceWith.key;
        currentNode.data = replaceWith.data;
        replaceWith.parent.right = replaceWith.left;
        if (replaceWith.left) {
          replaceWith.left.parent = replaceWith.parent;
        }
        return this.rebalanceAlongPath(deletePath);
      };
      AVLTree.prototype.delete = function(key, value) {
        var newTree = this.tree.delete(key, value);
        if (newTree) {
          this.tree = newTree;
        }
      };
      ["getNumberOfKeys", "search", "betweenBounds", "prettyPrint", "executeOnEveryNode"].forEach(function(fn) {
        AVLTree.prototype[fn] = function() {
          return this.tree[fn].apply(this.tree, arguments);
        };
      });
      module.exports = AVLTree;
    }
  });

  // node_modules/binary-search-tree/index.js
  var require_binary_search_tree = __commonJS({
    "node_modules/binary-search-tree/index.js"(exports, module) {
      module.exports.BinarySearchTree = require_bst();
      module.exports.AVLTree = require_avltree();
    }
  });

  // browser-version/.browser-build/lib/indexes.js
  var require_indexes = __commonJS({
    "browser-version/.browser-build/lib/indexes.js"(exports, module) {
      var BinarySearchTree = require_binary_search_tree().AVLTree;
      var model = require_model();
      function checkValueEquality(a, b) {
        return a === b;
      }
      function projectForUnique(elt) {
        if (elt === null) {
          return "$null";
        }
        if (typeof elt === "string") {
          return `$string${elt}`;
        }
        if (typeof elt === "boolean") {
          return `$boolean${elt}`;
        }
        if (typeof elt === "number") {
          return `$number${elt}`;
        }
        if (Array.isArray(elt)) {
          return `$date${elt.getTime()}`;
        }
        return elt;
      }
      function uniqFast(arr, keyFn) {
        const seen = /* @__PURE__ */ new Set();
        const result = [];
        for (const item of arr) {
          const k = keyFn(item);
          if (!seen.has(k)) {
            seen.add(k);
            result.push(item);
          }
        }
        return result;
      }
      var Index = class {
        constructor(options) {
          this.fieldName = options.fieldName;
          this.unique = options.unique ?? false;
          this.sparse = options.sparse ?? false;
          this.treeOptions = { unique: this.unique, compareKeys: model.compareThings, checkValueEquality };
          this.reset();
        }
        /**
         * Reset an index
         * @param {Document or Array of documents} newData Optional
         */
        reset(newData) {
          this.tree = new BinarySearchTree(this.treeOptions);
          if (newData) {
            this.insert(newData);
          }
        }
        /**
         * Insert a new document in the index
         * O(log(n))
         */
        insert(doc) {
          if (Array.isArray(doc)) {
            this.insertMultipleDocs(doc);
            return;
          }
          const key = model.getDotValue(doc, this.fieldName);
          if (key === void 0 && this.sparse) {
            return;
          }
          if (!Array.isArray(key)) {
            this.tree.insert(key, doc);
          } else {
            const keys = uniqFast(key, projectForUnique);
            let failingI, error;
            for (let i = 0; i < keys.length; i++) {
              try {
                this.tree.insert(keys[i], doc);
              } catch (e) {
                error = e;
                failingI = i;
                break;
              }
            }
            if (error) {
              for (let i = 0; i < failingI; i++) {
                this.tree.delete(keys[i], doc);
              }
              throw error;
            }
          }
        }
        /**
         * Insert an array of documents in the index
         * @API private
         */
        insertMultipleDocs(docs) {
          let failingI, error;
          for (let i = 0; i < docs.length; i++) {
            try {
              this.insert(docs[i]);
            } catch (e) {
              error = e;
              failingI = i;
              break;
            }
          }
          if (error) {
            for (let i = 0; i < failingI; i++) {
              this.remove(docs[i]);
            }
            throw error;
          }
        }
        /**
         * Remove a document from the index
         * O(log(n))
         */
        remove(doc) {
          if (Array.isArray(doc)) {
            doc.forEach((d) => this.remove(d));
            return;
          }
          const key = model.getDotValue(doc, this.fieldName);
          if (key === void 0 && this.sparse) {
            return;
          }
          if (!Array.isArray(key)) {
            this.tree.delete(key, doc);
          } else {
            uniqFast(key, projectForUnique).forEach((_key) => {
              this.tree.delete(_key, doc);
            });
          }
        }
        /**
         * Update a document in the index
         * Naive implementation, still O(log(n))
         */
        update(oldDoc, newDoc) {
          if (Array.isArray(oldDoc)) {
            this.updateMultipleDocs(oldDoc);
            return;
          }
          this.remove(oldDoc);
          try {
            this.insert(newDoc);
          } catch (e) {
            this.insert(oldDoc);
            throw e;
          }
        }
        /**
         * Update multiple documents in the index
         * @API private
         */
        updateMultipleDocs(pairs) {
          let failingI, error;
          for (let i = 0; i < pairs.length; i++) {
            this.remove(pairs[i].oldDoc);
          }
          for (let i = 0; i < pairs.length; i++) {
            try {
              this.insert(pairs[i].newDoc);
            } catch (e) {
              error = e;
              failingI = i;
              break;
            }
          }
          if (error) {
            for (let i = 0; i < failingI; i++) {
              this.remove(pairs[i].newDoc);
            }
            for (const pair of pairs) {
              this.insert(pair.oldDoc);
            }
            throw error;
          }
        }
        /**
         * Revert an update
         */
        revertUpdate(oldDoc, newDoc) {
          if (!Array.isArray(oldDoc)) {
            this.update(newDoc, oldDoc);
          } else {
            const revert = oldDoc.map((pair) => ({ oldDoc: pair.newDoc, newDoc: pair.oldDoc }));
            this.update(revert);
          }
        }
        /**
         * Get all documents in index whose key matches value
         */
        getMatching(value) {
          if (!Array.isArray(value)) {
            return this.tree.search(value);
          }
          const resultMap = /* @__PURE__ */ new Map();
          for (const v of value) {
            for (const doc of this.getMatching(v)) {
              resultMap.set(doc._id, doc);
            }
          }
          return [...resultMap.values()];
        }
        /**
         * Get all documents in index whose key is between bounds
         */
        getBetweenBounds(query) {
          return this.tree.betweenBounds(query);
        }
        /**
         * Get all elements in the index
         */
        getAll() {
          const res = [];
          this.tree.executeOnEveryNode((node) => {
            for (let i = 0; i < node.data.length; i++) {
              res.push(node.data[i]);
            }
          });
          return res;
        }
      };
      module.exports = Index;
    }
  });

  // node_modules/localforage/dist/localforage.js
  var require_localforage = __commonJS({
    "node_modules/localforage/dist/localforage.js"(exports, module) {
      (function(f) {
        if (typeof exports === "object" && typeof module !== "undefined") {
          module.exports = f();
        } else if (typeof define === "function" && define.amd) {
          define([], f);
        } else {
          var g;
          if (typeof window !== "undefined") {
            g = window;
          } else if (typeof global !== "undefined") {
            g = global;
          } else if (typeof self !== "undefined") {
            g = self;
          } else {
            g = this;
          }
          g.localforage = f();
        }
      })(function() {
        var define2, module2, exports2;
        return (function e(t, n, r) {
          function s(o2, u) {
            if (!n[o2]) {
              if (!t[o2]) {
                var a = typeof __require == "function" && __require;
                if (!u && a) return a(o2, true);
                if (i) return i(o2, true);
                var f = new Error("Cannot find module '" + o2 + "'");
                throw f.code = "MODULE_NOT_FOUND", f;
              }
              var l = n[o2] = { exports: {} };
              t[o2][0].call(l.exports, function(e2) {
                var n2 = t[o2][1][e2];
                return s(n2 ? n2 : e2);
              }, l, l.exports, e, t, n, r);
            }
            return n[o2].exports;
          }
          var i = typeof __require == "function" && __require;
          for (var o = 0; o < r.length; o++) s(r[o]);
          return s;
        })({ 1: [function(_dereq_, module3, exports3) {
          (function(global2) {
            "use strict";
            var Mutation = global2.MutationObserver || global2.WebKitMutationObserver;
            var scheduleDrain;
            {
              if (Mutation) {
                var called = 0;
                var observer = new Mutation(nextTick);
                var element = global2.document.createTextNode("");
                observer.observe(element, {
                  characterData: true
                });
                scheduleDrain = function() {
                  element.data = called = ++called % 2;
                };
              } else if (!global2.setImmediate && typeof global2.MessageChannel !== "undefined") {
                var channel = new global2.MessageChannel();
                channel.port1.onmessage = nextTick;
                scheduleDrain = function() {
                  channel.port2.postMessage(0);
                };
              } else if ("document" in global2 && "onreadystatechange" in global2.document.createElement("script")) {
                scheduleDrain = function() {
                  var scriptEl = global2.document.createElement("script");
                  scriptEl.onreadystatechange = function() {
                    nextTick();
                    scriptEl.onreadystatechange = null;
                    scriptEl.parentNode.removeChild(scriptEl);
                    scriptEl = null;
                  };
                  global2.document.documentElement.appendChild(scriptEl);
                };
              } else {
                scheduleDrain = function() {
                  setTimeout(nextTick, 0);
                };
              }
            }
            var draining;
            var queue = [];
            function nextTick() {
              draining = true;
              var i, oldQueue;
              var len = queue.length;
              while (len) {
                oldQueue = queue;
                queue = [];
                i = -1;
                while (++i < len) {
                  oldQueue[i]();
                }
                len = queue.length;
              }
              draining = false;
            }
            module3.exports = immediate;
            function immediate(task) {
              if (queue.push(task) === 1 && !draining) {
                scheduleDrain();
              }
            }
          }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
        }, {}], 2: [function(_dereq_, module3, exports3) {
          "use strict";
          var immediate = _dereq_(1);
          function INTERNAL() {
          }
          var handlers = {};
          var REJECTED = ["REJECTED"];
          var FULFILLED = ["FULFILLED"];
          var PENDING = ["PENDING"];
          module3.exports = Promise2;
          function Promise2(resolver) {
            if (typeof resolver !== "function") {
              throw new TypeError("resolver must be a function");
            }
            this.state = PENDING;
            this.queue = [];
            this.outcome = void 0;
            if (resolver !== INTERNAL) {
              safelyResolveThenable(this, resolver);
            }
          }
          Promise2.prototype["catch"] = function(onRejected) {
            return this.then(null, onRejected);
          };
          Promise2.prototype.then = function(onFulfilled, onRejected) {
            if (typeof onFulfilled !== "function" && this.state === FULFILLED || typeof onRejected !== "function" && this.state === REJECTED) {
              return this;
            }
            var promise = new this.constructor(INTERNAL);
            if (this.state !== PENDING) {
              var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
              unwrap(promise, resolver, this.outcome);
            } else {
              this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
            }
            return promise;
          };
          function QueueItem(promise, onFulfilled, onRejected) {
            this.promise = promise;
            if (typeof onFulfilled === "function") {
              this.onFulfilled = onFulfilled;
              this.callFulfilled = this.otherCallFulfilled;
            }
            if (typeof onRejected === "function") {
              this.onRejected = onRejected;
              this.callRejected = this.otherCallRejected;
            }
          }
          QueueItem.prototype.callFulfilled = function(value) {
            handlers.resolve(this.promise, value);
          };
          QueueItem.prototype.otherCallFulfilled = function(value) {
            unwrap(this.promise, this.onFulfilled, value);
          };
          QueueItem.prototype.callRejected = function(value) {
            handlers.reject(this.promise, value);
          };
          QueueItem.prototype.otherCallRejected = function(value) {
            unwrap(this.promise, this.onRejected, value);
          };
          function unwrap(promise, func, value) {
            immediate(function() {
              var returnValue;
              try {
                returnValue = func(value);
              } catch (e) {
                return handlers.reject(promise, e);
              }
              if (returnValue === promise) {
                handlers.reject(promise, new TypeError("Cannot resolve promise with itself"));
              } else {
                handlers.resolve(promise, returnValue);
              }
            });
          }
          handlers.resolve = function(self2, value) {
            var result = tryCatch(getThen, value);
            if (result.status === "error") {
              return handlers.reject(self2, result.value);
            }
            var thenable = result.value;
            if (thenable) {
              safelyResolveThenable(self2, thenable);
            } else {
              self2.state = FULFILLED;
              self2.outcome = value;
              var i = -1;
              var len = self2.queue.length;
              while (++i < len) {
                self2.queue[i].callFulfilled(value);
              }
            }
            return self2;
          };
          handlers.reject = function(self2, error) {
            self2.state = REJECTED;
            self2.outcome = error;
            var i = -1;
            var len = self2.queue.length;
            while (++i < len) {
              self2.queue[i].callRejected(error);
            }
            return self2;
          };
          function getThen(obj) {
            var then = obj && obj.then;
            if (obj && (typeof obj === "object" || typeof obj === "function") && typeof then === "function") {
              return function appyThen() {
                then.apply(obj, arguments);
              };
            }
          }
          function safelyResolveThenable(self2, thenable) {
            var called = false;
            function onError(value) {
              if (called) {
                return;
              }
              called = true;
              handlers.reject(self2, value);
            }
            function onSuccess(value) {
              if (called) {
                return;
              }
              called = true;
              handlers.resolve(self2, value);
            }
            function tryToUnwrap() {
              thenable(onSuccess, onError);
            }
            var result = tryCatch(tryToUnwrap);
            if (result.status === "error") {
              onError(result.value);
            }
          }
          function tryCatch(func, value) {
            var out = {};
            try {
              out.value = func(value);
              out.status = "success";
            } catch (e) {
              out.status = "error";
              out.value = e;
            }
            return out;
          }
          Promise2.resolve = resolve;
          function resolve(value) {
            if (value instanceof this) {
              return value;
            }
            return handlers.resolve(new this(INTERNAL), value);
          }
          Promise2.reject = reject;
          function reject(reason) {
            var promise = new this(INTERNAL);
            return handlers.reject(promise, reason);
          }
          Promise2.all = all;
          function all(iterable) {
            var self2 = this;
            if (Object.prototype.toString.call(iterable) !== "[object Array]") {
              return this.reject(new TypeError("must be an array"));
            }
            var len = iterable.length;
            var called = false;
            if (!len) {
              return this.resolve([]);
            }
            var values = new Array(len);
            var resolved = 0;
            var i = -1;
            var promise = new this(INTERNAL);
            while (++i < len) {
              allResolver(iterable[i], i);
            }
            return promise;
            function allResolver(value, i2) {
              self2.resolve(value).then(resolveFromAll, function(error) {
                if (!called) {
                  called = true;
                  handlers.reject(promise, error);
                }
              });
              function resolveFromAll(outValue) {
                values[i2] = outValue;
                if (++resolved === len && !called) {
                  called = true;
                  handlers.resolve(promise, values);
                }
              }
            }
          }
          Promise2.race = race;
          function race(iterable) {
            var self2 = this;
            if (Object.prototype.toString.call(iterable) !== "[object Array]") {
              return this.reject(new TypeError("must be an array"));
            }
            var len = iterable.length;
            var called = false;
            if (!len) {
              return this.resolve([]);
            }
            var i = -1;
            var promise = new this(INTERNAL);
            while (++i < len) {
              resolver(iterable[i]);
            }
            return promise;
            function resolver(value) {
              self2.resolve(value).then(function(response) {
                if (!called) {
                  called = true;
                  handlers.resolve(promise, response);
                }
              }, function(error) {
                if (!called) {
                  called = true;
                  handlers.reject(promise, error);
                }
              });
            }
          }
        }, { "1": 1 }], 3: [function(_dereq_, module3, exports3) {
          (function(global2) {
            "use strict";
            if (typeof global2.Promise !== "function") {
              global2.Promise = _dereq_(2);
            }
          }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
        }, { "2": 2 }], 4: [function(_dereq_, module3, exports3) {
          "use strict";
          var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
            return typeof obj;
          } : function(obj) {
            return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
          };
          function _classCallCheck(instance, Constructor) {
            if (!(instance instanceof Constructor)) {
              throw new TypeError("Cannot call a class as a function");
            }
          }
          function getIDB() {
            try {
              if (typeof indexedDB !== "undefined") {
                return indexedDB;
              }
              if (typeof webkitIndexedDB !== "undefined") {
                return webkitIndexedDB;
              }
              if (typeof mozIndexedDB !== "undefined") {
                return mozIndexedDB;
              }
              if (typeof OIndexedDB !== "undefined") {
                return OIndexedDB;
              }
              if (typeof msIndexedDB !== "undefined") {
                return msIndexedDB;
              }
            } catch (e) {
              return;
            }
          }
          var idb = getIDB();
          function isIndexedDBValid() {
            try {
              if (!idb || !idb.open) {
                return false;
              }
              var isSafari = typeof openDatabase !== "undefined" && /(Safari|iPhone|iPad|iPod)/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !/BlackBerry/.test(navigator.platform);
              var hasFetch = typeof fetch === "function" && fetch.toString().indexOf("[native code") !== -1;
              return (!isSafari || hasFetch) && typeof indexedDB !== "undefined" && // some outdated implementations of IDB that appear on Samsung
              // and HTC Android devices <4.4 are missing IDBKeyRange
              // See: https://github.com/mozilla/localForage/issues/128
              // See: https://github.com/mozilla/localForage/issues/272
              typeof IDBKeyRange !== "undefined";
            } catch (e) {
              return false;
            }
          }
          function createBlob(parts, properties) {
            parts = parts || [];
            properties = properties || {};
            try {
              return new Blob(parts, properties);
            } catch (e) {
              if (e.name !== "TypeError") {
                throw e;
              }
              var Builder = typeof BlobBuilder !== "undefined" ? BlobBuilder : typeof MSBlobBuilder !== "undefined" ? MSBlobBuilder : typeof MozBlobBuilder !== "undefined" ? MozBlobBuilder : WebKitBlobBuilder;
              var builder = new Builder();
              for (var i = 0; i < parts.length; i += 1) {
                builder.append(parts[i]);
              }
              return builder.getBlob(properties.type);
            }
          }
          if (typeof Promise === "undefined") {
            _dereq_(3);
          }
          var Promise$1 = Promise;
          function executeCallback(promise, callback) {
            if (callback) {
              promise.then(function(result) {
                callback(null, result);
              }, function(error) {
                callback(error);
              });
            }
          }
          function executeTwoCallbacks(promise, callback, errorCallback) {
            if (typeof callback === "function") {
              promise.then(callback);
            }
            if (typeof errorCallback === "function") {
              promise["catch"](errorCallback);
            }
          }
          function normalizeKey(key2) {
            if (typeof key2 !== "string") {
              console.warn(key2 + " used as a key, but it is not a string.");
              key2 = String(key2);
            }
            return key2;
          }
          function getCallback() {
            if (arguments.length && typeof arguments[arguments.length - 1] === "function") {
              return arguments[arguments.length - 1];
            }
          }
          var DETECT_BLOB_SUPPORT_STORE = "local-forage-detect-blob-support";
          var supportsBlobs = void 0;
          var dbContexts = {};
          var toString = Object.prototype.toString;
          var READ_ONLY = "readonly";
          var READ_WRITE = "readwrite";
          function _binStringToArrayBuffer(bin) {
            var length2 = bin.length;
            var buf = new ArrayBuffer(length2);
            var arr = new Uint8Array(buf);
            for (var i = 0; i < length2; i++) {
              arr[i] = bin.charCodeAt(i);
            }
            return buf;
          }
          function _checkBlobSupportWithoutCaching(idb2) {
            return new Promise$1(function(resolve) {
              var txn = idb2.transaction(DETECT_BLOB_SUPPORT_STORE, READ_WRITE);
              var blob = createBlob([""]);
              txn.objectStore(DETECT_BLOB_SUPPORT_STORE).put(blob, "key");
              txn.onabort = function(e) {
                e.preventDefault();
                e.stopPropagation();
                resolve(false);
              };
              txn.oncomplete = function() {
                var matchedChrome = navigator.userAgent.match(/Chrome\/(\d+)/);
                var matchedEdge = navigator.userAgent.match(/Edge\//);
                resolve(matchedEdge || !matchedChrome || parseInt(matchedChrome[1], 10) >= 43);
              };
            })["catch"](function() {
              return false;
            });
          }
          function _checkBlobSupport(idb2) {
            if (typeof supportsBlobs === "boolean") {
              return Promise$1.resolve(supportsBlobs);
            }
            return _checkBlobSupportWithoutCaching(idb2).then(function(value) {
              supportsBlobs = value;
              return supportsBlobs;
            });
          }
          function _deferReadiness(dbInfo) {
            var dbContext = dbContexts[dbInfo.name];
            var deferredOperation = {};
            deferredOperation.promise = new Promise$1(function(resolve, reject) {
              deferredOperation.resolve = resolve;
              deferredOperation.reject = reject;
            });
            dbContext.deferredOperations.push(deferredOperation);
            if (!dbContext.dbReady) {
              dbContext.dbReady = deferredOperation.promise;
            } else {
              dbContext.dbReady = dbContext.dbReady.then(function() {
                return deferredOperation.promise;
              });
            }
          }
          function _advanceReadiness(dbInfo) {
            var dbContext = dbContexts[dbInfo.name];
            var deferredOperation = dbContext.deferredOperations.pop();
            if (deferredOperation) {
              deferredOperation.resolve();
              return deferredOperation.promise;
            }
          }
          function _rejectReadiness(dbInfo, err) {
            var dbContext = dbContexts[dbInfo.name];
            var deferredOperation = dbContext.deferredOperations.pop();
            if (deferredOperation) {
              deferredOperation.reject(err);
              return deferredOperation.promise;
            }
          }
          function _getConnection(dbInfo, upgradeNeeded) {
            return new Promise$1(function(resolve, reject) {
              dbContexts[dbInfo.name] = dbContexts[dbInfo.name] || createDbContext();
              if (dbInfo.db) {
                if (upgradeNeeded) {
                  _deferReadiness(dbInfo);
                  dbInfo.db.close();
                } else {
                  return resolve(dbInfo.db);
                }
              }
              var dbArgs = [dbInfo.name];
              if (upgradeNeeded) {
                dbArgs.push(dbInfo.version);
              }
              var openreq = idb.open.apply(idb, dbArgs);
              if (upgradeNeeded) {
                openreq.onupgradeneeded = function(e) {
                  var db = openreq.result;
                  try {
                    db.createObjectStore(dbInfo.storeName);
                    if (e.oldVersion <= 1) {
                      db.createObjectStore(DETECT_BLOB_SUPPORT_STORE);
                    }
                  } catch (ex) {
                    if (ex.name === "ConstraintError") {
                      console.warn('The database "' + dbInfo.name + '" has been upgraded from version ' + e.oldVersion + " to version " + e.newVersion + ', but the storage "' + dbInfo.storeName + '" already exists.');
                    } else {
                      throw ex;
                    }
                  }
                };
              }
              openreq.onerror = function(e) {
                e.preventDefault();
                reject(openreq.error);
              };
              openreq.onsuccess = function() {
                var db = openreq.result;
                db.onversionchange = function(e) {
                  e.target.close();
                };
                resolve(db);
                _advanceReadiness(dbInfo);
              };
            });
          }
          function _getOriginalConnection(dbInfo) {
            return _getConnection(dbInfo, false);
          }
          function _getUpgradedConnection(dbInfo) {
            return _getConnection(dbInfo, true);
          }
          function _isUpgradeNeeded(dbInfo, defaultVersion) {
            if (!dbInfo.db) {
              return true;
            }
            var isNewStore = !dbInfo.db.objectStoreNames.contains(dbInfo.storeName);
            var isDowngrade = dbInfo.version < dbInfo.db.version;
            var isUpgrade = dbInfo.version > dbInfo.db.version;
            if (isDowngrade) {
              if (dbInfo.version !== defaultVersion) {
                console.warn('The database "' + dbInfo.name + `" can't be downgraded from version ` + dbInfo.db.version + " to version " + dbInfo.version + ".");
              }
              dbInfo.version = dbInfo.db.version;
            }
            if (isUpgrade || isNewStore) {
              if (isNewStore) {
                var incVersion = dbInfo.db.version + 1;
                if (incVersion > dbInfo.version) {
                  dbInfo.version = incVersion;
                }
              }
              return true;
            }
            return false;
          }
          function _encodeBlob(blob) {
            return new Promise$1(function(resolve, reject) {
              var reader = new FileReader();
              reader.onerror = reject;
              reader.onloadend = function(e) {
                var base64 = btoa(e.target.result || "");
                resolve({
                  __local_forage_encoded_blob: true,
                  data: base64,
                  type: blob.type
                });
              };
              reader.readAsBinaryString(blob);
            });
          }
          function _decodeBlob(encodedBlob) {
            var arrayBuff = _binStringToArrayBuffer(atob(encodedBlob.data));
            return createBlob([arrayBuff], { type: encodedBlob.type });
          }
          function _isEncodedBlob(value) {
            return value && value.__local_forage_encoded_blob;
          }
          function _fullyReady(callback) {
            var self2 = this;
            var promise = self2._initReady().then(function() {
              var dbContext = dbContexts[self2._dbInfo.name];
              if (dbContext && dbContext.dbReady) {
                return dbContext.dbReady;
              }
            });
            executeTwoCallbacks(promise, callback, callback);
            return promise;
          }
          function _tryReconnect(dbInfo) {
            _deferReadiness(dbInfo);
            var dbContext = dbContexts[dbInfo.name];
            var forages = dbContext.forages;
            for (var i = 0; i < forages.length; i++) {
              var forage = forages[i];
              if (forage._dbInfo.db) {
                forage._dbInfo.db.close();
                forage._dbInfo.db = null;
              }
            }
            dbInfo.db = null;
            return _getOriginalConnection(dbInfo).then(function(db) {
              dbInfo.db = db;
              if (_isUpgradeNeeded(dbInfo)) {
                return _getUpgradedConnection(dbInfo);
              }
              return db;
            }).then(function(db) {
              dbInfo.db = dbContext.db = db;
              for (var i2 = 0; i2 < forages.length; i2++) {
                forages[i2]._dbInfo.db = db;
              }
            })["catch"](function(err) {
              _rejectReadiness(dbInfo, err);
              throw err;
            });
          }
          function createTransaction(dbInfo, mode, callback, retries) {
            if (retries === void 0) {
              retries = 1;
            }
            try {
              var tx = dbInfo.db.transaction(dbInfo.storeName, mode);
              callback(null, tx);
            } catch (err) {
              if (retries > 0 && (!dbInfo.db || err.name === "InvalidStateError" || err.name === "NotFoundError")) {
                return Promise$1.resolve().then(function() {
                  if (!dbInfo.db || err.name === "NotFoundError" && !dbInfo.db.objectStoreNames.contains(dbInfo.storeName) && dbInfo.version <= dbInfo.db.version) {
                    if (dbInfo.db) {
                      dbInfo.version = dbInfo.db.version + 1;
                    }
                    return _getUpgradedConnection(dbInfo);
                  }
                }).then(function() {
                  return _tryReconnect(dbInfo).then(function() {
                    createTransaction(dbInfo, mode, callback, retries - 1);
                  });
                })["catch"](callback);
              }
              callback(err);
            }
          }
          function createDbContext() {
            return {
              // Running localForages sharing a database.
              forages: [],
              // Shared database.
              db: null,
              // Database readiness (promise).
              dbReady: null,
              // Deferred operations on the database.
              deferredOperations: []
            };
          }
          function _initStorage(options) {
            var self2 = this;
            var dbInfo = {
              db: null
            };
            if (options) {
              for (var i in options) {
                dbInfo[i] = options[i];
              }
            }
            var dbContext = dbContexts[dbInfo.name];
            if (!dbContext) {
              dbContext = createDbContext();
              dbContexts[dbInfo.name] = dbContext;
            }
            dbContext.forages.push(self2);
            if (!self2._initReady) {
              self2._initReady = self2.ready;
              self2.ready = _fullyReady;
            }
            var initPromises = [];
            function ignoreErrors() {
              return Promise$1.resolve();
            }
            for (var j = 0; j < dbContext.forages.length; j++) {
              var forage = dbContext.forages[j];
              if (forage !== self2) {
                initPromises.push(forage._initReady()["catch"](ignoreErrors));
              }
            }
            var forages = dbContext.forages.slice(0);
            return Promise$1.all(initPromises).then(function() {
              dbInfo.db = dbContext.db;
              return _getOriginalConnection(dbInfo);
            }).then(function(db) {
              dbInfo.db = db;
              if (_isUpgradeNeeded(dbInfo, self2._defaultConfig.version)) {
                return _getUpgradedConnection(dbInfo);
              }
              return db;
            }).then(function(db) {
              dbInfo.db = dbContext.db = db;
              self2._dbInfo = dbInfo;
              for (var k = 0; k < forages.length; k++) {
                var forage2 = forages[k];
                if (forage2 !== self2) {
                  forage2._dbInfo.db = dbInfo.db;
                  forage2._dbInfo.version = dbInfo.version;
                }
              }
            });
          }
          function getItem(key2, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_ONLY, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var req = store.get(key2);
                    req.onsuccess = function() {
                      var value = req.result;
                      if (value === void 0) {
                        value = null;
                      }
                      if (_isEncodedBlob(value)) {
                        value = _decodeBlob(value);
                      }
                      resolve(value);
                    };
                    req.onerror = function() {
                      reject(req.error);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function iterate(iterator, callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_ONLY, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var req = store.openCursor();
                    var iterationNumber = 1;
                    req.onsuccess = function() {
                      var cursor = req.result;
                      if (cursor) {
                        var value = cursor.value;
                        if (_isEncodedBlob(value)) {
                          value = _decodeBlob(value);
                        }
                        var result = iterator(value, cursor.key, iterationNumber++);
                        if (result !== void 0) {
                          resolve(result);
                        } else {
                          cursor["continue"]();
                        }
                      } else {
                        resolve();
                      }
                    };
                    req.onerror = function() {
                      reject(req.error);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function setItem(key2, value, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = new Promise$1(function(resolve, reject) {
              var dbInfo;
              self2.ready().then(function() {
                dbInfo = self2._dbInfo;
                if (toString.call(value) === "[object Blob]") {
                  return _checkBlobSupport(dbInfo.db).then(function(blobSupport) {
                    if (blobSupport) {
                      return value;
                    }
                    return _encodeBlob(value);
                  });
                }
                return value;
              }).then(function(value2) {
                createTransaction(self2._dbInfo, READ_WRITE, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    if (value2 === null) {
                      value2 = void 0;
                    }
                    var req = store.put(value2, key2);
                    transaction.oncomplete = function() {
                      if (value2 === void 0) {
                        value2 = null;
                      }
                      resolve(value2);
                    };
                    transaction.onabort = transaction.onerror = function() {
                      var err2 = req.error ? req.error : req.transaction.error;
                      reject(err2);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function removeItem(key2, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_WRITE, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var req = store["delete"](key2);
                    transaction.oncomplete = function() {
                      resolve();
                    };
                    transaction.onerror = function() {
                      reject(req.error);
                    };
                    transaction.onabort = function() {
                      var err2 = req.error ? req.error : req.transaction.error;
                      reject(err2);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function clear(callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_WRITE, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var req = store.clear();
                    transaction.oncomplete = function() {
                      resolve();
                    };
                    transaction.onabort = transaction.onerror = function() {
                      var err2 = req.error ? req.error : req.transaction.error;
                      reject(err2);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function length(callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_ONLY, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var req = store.count();
                    req.onsuccess = function() {
                      resolve(req.result);
                    };
                    req.onerror = function() {
                      reject(req.error);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function key(n, callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              if (n < 0) {
                resolve(null);
                return;
              }
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_ONLY, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var advanced = false;
                    var req = store.openKeyCursor();
                    req.onsuccess = function() {
                      var cursor = req.result;
                      if (!cursor) {
                        resolve(null);
                        return;
                      }
                      if (n === 0) {
                        resolve(cursor.key);
                      } else {
                        if (!advanced) {
                          advanced = true;
                          cursor.advance(n);
                        } else {
                          resolve(cursor.key);
                        }
                      }
                    };
                    req.onerror = function() {
                      reject(req.error);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function keys(callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_ONLY, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var req = store.openKeyCursor();
                    var keys2 = [];
                    req.onsuccess = function() {
                      var cursor = req.result;
                      if (!cursor) {
                        resolve(keys2);
                        return;
                      }
                      keys2.push(cursor.key);
                      cursor["continue"]();
                    };
                    req.onerror = function() {
                      reject(req.error);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function dropInstance(options, callback) {
            callback = getCallback.apply(this, arguments);
            var currentConfig = this.config();
            options = typeof options !== "function" && options || {};
            if (!options.name) {
              options.name = options.name || currentConfig.name;
              options.storeName = options.storeName || currentConfig.storeName;
            }
            var self2 = this;
            var promise;
            if (!options.name) {
              promise = Promise$1.reject("Invalid arguments");
            } else {
              var isCurrentDb = options.name === currentConfig.name && self2._dbInfo.db;
              var dbPromise = isCurrentDb ? Promise$1.resolve(self2._dbInfo.db) : _getOriginalConnection(options).then(function(db) {
                var dbContext = dbContexts[options.name];
                var forages = dbContext.forages;
                dbContext.db = db;
                for (var i = 0; i < forages.length; i++) {
                  forages[i]._dbInfo.db = db;
                }
                return db;
              });
              if (!options.storeName) {
                promise = dbPromise.then(function(db) {
                  _deferReadiness(options);
                  var dbContext = dbContexts[options.name];
                  var forages = dbContext.forages;
                  db.close();
                  for (var i = 0; i < forages.length; i++) {
                    var forage = forages[i];
                    forage._dbInfo.db = null;
                  }
                  var dropDBPromise = new Promise$1(function(resolve, reject) {
                    var req = idb.deleteDatabase(options.name);
                    req.onerror = function() {
                      var db2 = req.result;
                      if (db2) {
                        db2.close();
                      }
                      reject(req.error);
                    };
                    req.onblocked = function() {
                      console.warn('dropInstance blocked for database "' + options.name + '" until all open connections are closed');
                    };
                    req.onsuccess = function() {
                      var db2 = req.result;
                      if (db2) {
                        db2.close();
                      }
                      resolve(db2);
                    };
                  });
                  return dropDBPromise.then(function(db2) {
                    dbContext.db = db2;
                    for (var i2 = 0; i2 < forages.length; i2++) {
                      var _forage = forages[i2];
                      _advanceReadiness(_forage._dbInfo);
                    }
                  })["catch"](function(err) {
                    (_rejectReadiness(options, err) || Promise$1.resolve())["catch"](function() {
                    });
                    throw err;
                  });
                });
              } else {
                promise = dbPromise.then(function(db) {
                  if (!db.objectStoreNames.contains(options.storeName)) {
                    return;
                  }
                  var newVersion = db.version + 1;
                  _deferReadiness(options);
                  var dbContext = dbContexts[options.name];
                  var forages = dbContext.forages;
                  db.close();
                  for (var i = 0; i < forages.length; i++) {
                    var forage = forages[i];
                    forage._dbInfo.db = null;
                    forage._dbInfo.version = newVersion;
                  }
                  var dropObjectPromise = new Promise$1(function(resolve, reject) {
                    var req = idb.open(options.name, newVersion);
                    req.onerror = function(err) {
                      var db2 = req.result;
                      db2.close();
                      reject(err);
                    };
                    req.onupgradeneeded = function() {
                      var db2 = req.result;
                      db2.deleteObjectStore(options.storeName);
                    };
                    req.onsuccess = function() {
                      var db2 = req.result;
                      db2.close();
                      resolve(db2);
                    };
                  });
                  return dropObjectPromise.then(function(db2) {
                    dbContext.db = db2;
                    for (var j = 0; j < forages.length; j++) {
                      var _forage2 = forages[j];
                      _forage2._dbInfo.db = db2;
                      _advanceReadiness(_forage2._dbInfo);
                    }
                  })["catch"](function(err) {
                    (_rejectReadiness(options, err) || Promise$1.resolve())["catch"](function() {
                    });
                    throw err;
                  });
                });
              }
            }
            executeCallback(promise, callback);
            return promise;
          }
          var asyncStorage = {
            _driver: "asyncStorage",
            _initStorage,
            _support: isIndexedDBValid(),
            iterate,
            getItem,
            setItem,
            removeItem,
            clear,
            length,
            key,
            keys,
            dropInstance
          };
          function isWebSQLValid() {
            return typeof openDatabase === "function";
          }
          var BASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
          var BLOB_TYPE_PREFIX = "~~local_forage_type~";
          var BLOB_TYPE_PREFIX_REGEX = /^~~local_forage_type~([^~]+)~/;
          var SERIALIZED_MARKER = "__lfsc__:";
          var SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;
          var TYPE_ARRAYBUFFER = "arbf";
          var TYPE_BLOB = "blob";
          var TYPE_INT8ARRAY = "si08";
          var TYPE_UINT8ARRAY = "ui08";
          var TYPE_UINT8CLAMPEDARRAY = "uic8";
          var TYPE_INT16ARRAY = "si16";
          var TYPE_INT32ARRAY = "si32";
          var TYPE_UINT16ARRAY = "ur16";
          var TYPE_UINT32ARRAY = "ui32";
          var TYPE_FLOAT32ARRAY = "fl32";
          var TYPE_FLOAT64ARRAY = "fl64";
          var TYPE_SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER_LENGTH + TYPE_ARRAYBUFFER.length;
          var toString$1 = Object.prototype.toString;
          function stringToBuffer(serializedString) {
            var bufferLength = serializedString.length * 0.75;
            var len = serializedString.length;
            var i;
            var p = 0;
            var encoded1, encoded2, encoded3, encoded4;
            if (serializedString[serializedString.length - 1] === "=") {
              bufferLength--;
              if (serializedString[serializedString.length - 2] === "=") {
                bufferLength--;
              }
            }
            var buffer = new ArrayBuffer(bufferLength);
            var bytes = new Uint8Array(buffer);
            for (i = 0; i < len; i += 4) {
              encoded1 = BASE_CHARS.indexOf(serializedString[i]);
              encoded2 = BASE_CHARS.indexOf(serializedString[i + 1]);
              encoded3 = BASE_CHARS.indexOf(serializedString[i + 2]);
              encoded4 = BASE_CHARS.indexOf(serializedString[i + 3]);
              bytes[p++] = encoded1 << 2 | encoded2 >> 4;
              bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
              bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
            }
            return buffer;
          }
          function bufferToString(buffer) {
            var bytes = new Uint8Array(buffer);
            var base64String = "";
            var i;
            for (i = 0; i < bytes.length; i += 3) {
              base64String += BASE_CHARS[bytes[i] >> 2];
              base64String += BASE_CHARS[(bytes[i] & 3) << 4 | bytes[i + 1] >> 4];
              base64String += BASE_CHARS[(bytes[i + 1] & 15) << 2 | bytes[i + 2] >> 6];
              base64String += BASE_CHARS[bytes[i + 2] & 63];
            }
            if (bytes.length % 3 === 2) {
              base64String = base64String.substring(0, base64String.length - 1) + "=";
            } else if (bytes.length % 3 === 1) {
              base64String = base64String.substring(0, base64String.length - 2) + "==";
            }
            return base64String;
          }
          function serialize(value, callback) {
            var valueType = "";
            if (value) {
              valueType = toString$1.call(value);
            }
            if (value && (valueType === "[object ArrayBuffer]" || value.buffer && toString$1.call(value.buffer) === "[object ArrayBuffer]")) {
              var buffer;
              var marker = SERIALIZED_MARKER;
              if (value instanceof ArrayBuffer) {
                buffer = value;
                marker += TYPE_ARRAYBUFFER;
              } else {
                buffer = value.buffer;
                if (valueType === "[object Int8Array]") {
                  marker += TYPE_INT8ARRAY;
                } else if (valueType === "[object Uint8Array]") {
                  marker += TYPE_UINT8ARRAY;
                } else if (valueType === "[object Uint8ClampedArray]") {
                  marker += TYPE_UINT8CLAMPEDARRAY;
                } else if (valueType === "[object Int16Array]") {
                  marker += TYPE_INT16ARRAY;
                } else if (valueType === "[object Uint16Array]") {
                  marker += TYPE_UINT16ARRAY;
                } else if (valueType === "[object Int32Array]") {
                  marker += TYPE_INT32ARRAY;
                } else if (valueType === "[object Uint32Array]") {
                  marker += TYPE_UINT32ARRAY;
                } else if (valueType === "[object Float32Array]") {
                  marker += TYPE_FLOAT32ARRAY;
                } else if (valueType === "[object Float64Array]") {
                  marker += TYPE_FLOAT64ARRAY;
                } else {
                  callback(new Error("Failed to get type for BinaryArray"));
                }
              }
              callback(marker + bufferToString(buffer));
            } else if (valueType === "[object Blob]") {
              var fileReader = new FileReader();
              fileReader.onload = function() {
                var str = BLOB_TYPE_PREFIX + value.type + "~" + bufferToString(this.result);
                callback(SERIALIZED_MARKER + TYPE_BLOB + str);
              };
              fileReader.readAsArrayBuffer(value);
            } else {
              try {
                callback(JSON.stringify(value));
              } catch (e) {
                console.error("Couldn't convert value into a JSON string: ", value);
                callback(null, e);
              }
            }
          }
          function deserialize(value) {
            if (value.substring(0, SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
              return JSON.parse(value);
            }
            var serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
            var type = value.substring(SERIALIZED_MARKER_LENGTH, TYPE_SERIALIZED_MARKER_LENGTH);
            var blobType;
            if (type === TYPE_BLOB && BLOB_TYPE_PREFIX_REGEX.test(serializedString)) {
              var matcher = serializedString.match(BLOB_TYPE_PREFIX_REGEX);
              blobType = matcher[1];
              serializedString = serializedString.substring(matcher[0].length);
            }
            var buffer = stringToBuffer(serializedString);
            switch (type) {
              case TYPE_ARRAYBUFFER:
                return buffer;
              case TYPE_BLOB:
                return createBlob([buffer], { type: blobType });
              case TYPE_INT8ARRAY:
                return new Int8Array(buffer);
              case TYPE_UINT8ARRAY:
                return new Uint8Array(buffer);
              case TYPE_UINT8CLAMPEDARRAY:
                return new Uint8ClampedArray(buffer);
              case TYPE_INT16ARRAY:
                return new Int16Array(buffer);
              case TYPE_UINT16ARRAY:
                return new Uint16Array(buffer);
              case TYPE_INT32ARRAY:
                return new Int32Array(buffer);
              case TYPE_UINT32ARRAY:
                return new Uint32Array(buffer);
              case TYPE_FLOAT32ARRAY:
                return new Float32Array(buffer);
              case TYPE_FLOAT64ARRAY:
                return new Float64Array(buffer);
              default:
                throw new Error("Unkown type: " + type);
            }
          }
          var localforageSerializer = {
            serialize,
            deserialize,
            stringToBuffer,
            bufferToString
          };
          function createDbTable(t, dbInfo, callback, errorCallback) {
            t.executeSql("CREATE TABLE IF NOT EXISTS " + dbInfo.storeName + " (id INTEGER PRIMARY KEY, key unique, value)", [], callback, errorCallback);
          }
          function _initStorage$1(options) {
            var self2 = this;
            var dbInfo = {
              db: null
            };
            if (options) {
              for (var i in options) {
                dbInfo[i] = typeof options[i] !== "string" ? options[i].toString() : options[i];
              }
            }
            var dbInfoPromise = new Promise$1(function(resolve, reject) {
              try {
                dbInfo.db = openDatabase(dbInfo.name, String(dbInfo.version), dbInfo.description, dbInfo.size);
              } catch (e) {
                return reject(e);
              }
              dbInfo.db.transaction(function(t) {
                createDbTable(t, dbInfo, function() {
                  self2._dbInfo = dbInfo;
                  resolve();
                }, function(t2, error) {
                  reject(error);
                });
              }, reject);
            });
            dbInfo.serializer = localforageSerializer;
            return dbInfoPromise;
          }
          function tryExecuteSql(t, dbInfo, sqlStatement, args, callback, errorCallback) {
            t.executeSql(sqlStatement, args, callback, function(t2, error) {
              if (error.code === error.SYNTAX_ERR) {
                t2.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [dbInfo.storeName], function(t3, results) {
                  if (!results.rows.length) {
                    createDbTable(t3, dbInfo, function() {
                      t3.executeSql(sqlStatement, args, callback, errorCallback);
                    }, errorCallback);
                  } else {
                    errorCallback(t3, error);
                  }
                }, errorCallback);
              } else {
                errorCallback(t2, error);
              }
            }, errorCallback);
          }
          function getItem$1(key2, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "SELECT * FROM " + dbInfo.storeName + " WHERE key = ? LIMIT 1", [key2], function(t2, results) {
                    var result = results.rows.length ? results.rows.item(0).value : null;
                    if (result) {
                      result = dbInfo.serializer.deserialize(result);
                    }
                    resolve(result);
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function iterate$1(iterator, callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "SELECT * FROM " + dbInfo.storeName, [], function(t2, results) {
                    var rows = results.rows;
                    var length2 = rows.length;
                    for (var i = 0; i < length2; i++) {
                      var item = rows.item(i);
                      var result = item.value;
                      if (result) {
                        result = dbInfo.serializer.deserialize(result);
                      }
                      result = iterator(result, item.key, i + 1);
                      if (result !== void 0) {
                        resolve(result);
                        return;
                      }
                    }
                    resolve();
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function _setItem(key2, value, callback, retriesLeft) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                if (value === void 0) {
                  value = null;
                }
                var originalValue = value;
                var dbInfo = self2._dbInfo;
                dbInfo.serializer.serialize(value, function(value2, error) {
                  if (error) {
                    reject(error);
                  } else {
                    dbInfo.db.transaction(function(t) {
                      tryExecuteSql(t, dbInfo, "INSERT OR REPLACE INTO " + dbInfo.storeName + " (key, value) VALUES (?, ?)", [key2, value2], function() {
                        resolve(originalValue);
                      }, function(t2, error2) {
                        reject(error2);
                      });
                    }, function(sqlError) {
                      if (sqlError.code === sqlError.QUOTA_ERR) {
                        if (retriesLeft > 0) {
                          resolve(_setItem.apply(self2, [key2, originalValue, callback, retriesLeft - 1]));
                          return;
                        }
                        reject(sqlError);
                      }
                    });
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function setItem$1(key2, value, callback) {
            return _setItem.apply(this, [key2, value, callback, 1]);
          }
          function removeItem$1(key2, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "DELETE FROM " + dbInfo.storeName + " WHERE key = ?", [key2], function() {
                    resolve();
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function clear$1(callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "DELETE FROM " + dbInfo.storeName, [], function() {
                    resolve();
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function length$1(callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "SELECT COUNT(key) as c FROM " + dbInfo.storeName, [], function(t2, results) {
                    var result = results.rows.item(0).c;
                    resolve(result);
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function key$1(n, callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "SELECT key FROM " + dbInfo.storeName + " WHERE id = ? LIMIT 1", [n + 1], function(t2, results) {
                    var result = results.rows.length ? results.rows.item(0).key : null;
                    resolve(result);
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function keys$1(callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "SELECT key FROM " + dbInfo.storeName, [], function(t2, results) {
                    var keys2 = [];
                    for (var i = 0; i < results.rows.length; i++) {
                      keys2.push(results.rows.item(i).key);
                    }
                    resolve(keys2);
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function getAllStoreNames(db) {
            return new Promise$1(function(resolve, reject) {
              db.transaction(function(t) {
                t.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name <> '__WebKitDatabaseInfoTable__'", [], function(t2, results) {
                  var storeNames = [];
                  for (var i = 0; i < results.rows.length; i++) {
                    storeNames.push(results.rows.item(i).name);
                  }
                  resolve({
                    db,
                    storeNames
                  });
                }, function(t2, error) {
                  reject(error);
                });
              }, function(sqlError) {
                reject(sqlError);
              });
            });
          }
          function dropInstance$1(options, callback) {
            callback = getCallback.apply(this, arguments);
            var currentConfig = this.config();
            options = typeof options !== "function" && options || {};
            if (!options.name) {
              options.name = options.name || currentConfig.name;
              options.storeName = options.storeName || currentConfig.storeName;
            }
            var self2 = this;
            var promise;
            if (!options.name) {
              promise = Promise$1.reject("Invalid arguments");
            } else {
              promise = new Promise$1(function(resolve) {
                var db;
                if (options.name === currentConfig.name) {
                  db = self2._dbInfo.db;
                } else {
                  db = openDatabase(options.name, "", "", 0);
                }
                if (!options.storeName) {
                  resolve(getAllStoreNames(db));
                } else {
                  resolve({
                    db,
                    storeNames: [options.storeName]
                  });
                }
              }).then(function(operationInfo) {
                return new Promise$1(function(resolve, reject) {
                  operationInfo.db.transaction(function(t) {
                    function dropTable(storeName) {
                      return new Promise$1(function(resolve2, reject2) {
                        t.executeSql("DROP TABLE IF EXISTS " + storeName, [], function() {
                          resolve2();
                        }, function(t2, error) {
                          reject2(error);
                        });
                      });
                    }
                    var operations = [];
                    for (var i = 0, len = operationInfo.storeNames.length; i < len; i++) {
                      operations.push(dropTable(operationInfo.storeNames[i]));
                    }
                    Promise$1.all(operations).then(function() {
                      resolve();
                    })["catch"](function(e) {
                      reject(e);
                    });
                  }, function(sqlError) {
                    reject(sqlError);
                  });
                });
              });
            }
            executeCallback(promise, callback);
            return promise;
          }
          var webSQLStorage = {
            _driver: "webSQLStorage",
            _initStorage: _initStorage$1,
            _support: isWebSQLValid(),
            iterate: iterate$1,
            getItem: getItem$1,
            setItem: setItem$1,
            removeItem: removeItem$1,
            clear: clear$1,
            length: length$1,
            key: key$1,
            keys: keys$1,
            dropInstance: dropInstance$1
          };
          function isLocalStorageValid() {
            try {
              return typeof localStorage !== "undefined" && "setItem" in localStorage && // in IE8 typeof localStorage.setItem === 'object'
              !!localStorage.setItem;
            } catch (e) {
              return false;
            }
          }
          function _getKeyPrefix(options, defaultConfig) {
            var keyPrefix = options.name + "/";
            if (options.storeName !== defaultConfig.storeName) {
              keyPrefix += options.storeName + "/";
            }
            return keyPrefix;
          }
          function checkIfLocalStorageThrows() {
            var localStorageTestKey = "_localforage_support_test";
            try {
              localStorage.setItem(localStorageTestKey, true);
              localStorage.removeItem(localStorageTestKey);
              return false;
            } catch (e) {
              return true;
            }
          }
          function _isLocalStorageUsable() {
            return !checkIfLocalStorageThrows() || localStorage.length > 0;
          }
          function _initStorage$2(options) {
            var self2 = this;
            var dbInfo = {};
            if (options) {
              for (var i in options) {
                dbInfo[i] = options[i];
              }
            }
            dbInfo.keyPrefix = _getKeyPrefix(options, self2._defaultConfig);
            if (!_isLocalStorageUsable()) {
              return Promise$1.reject();
            }
            self2._dbInfo = dbInfo;
            dbInfo.serializer = localforageSerializer;
            return Promise$1.resolve();
          }
          function clear$2(callback) {
            var self2 = this;
            var promise = self2.ready().then(function() {
              var keyPrefix = self2._dbInfo.keyPrefix;
              for (var i = localStorage.length - 1; i >= 0; i--) {
                var key2 = localStorage.key(i);
                if (key2.indexOf(keyPrefix) === 0) {
                  localStorage.removeItem(key2);
                }
              }
            });
            executeCallback(promise, callback);
            return promise;
          }
          function getItem$2(key2, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = self2.ready().then(function() {
              var dbInfo = self2._dbInfo;
              var result = localStorage.getItem(dbInfo.keyPrefix + key2);
              if (result) {
                result = dbInfo.serializer.deserialize(result);
              }
              return result;
            });
            executeCallback(promise, callback);
            return promise;
          }
          function iterate$2(iterator, callback) {
            var self2 = this;
            var promise = self2.ready().then(function() {
              var dbInfo = self2._dbInfo;
              var keyPrefix = dbInfo.keyPrefix;
              var keyPrefixLength = keyPrefix.length;
              var length2 = localStorage.length;
              var iterationNumber = 1;
              for (var i = 0; i < length2; i++) {
                var key2 = localStorage.key(i);
                if (key2.indexOf(keyPrefix) !== 0) {
                  continue;
                }
                var value = localStorage.getItem(key2);
                if (value) {
                  value = dbInfo.serializer.deserialize(value);
                }
                value = iterator(value, key2.substring(keyPrefixLength), iterationNumber++);
                if (value !== void 0) {
                  return value;
                }
              }
            });
            executeCallback(promise, callback);
            return promise;
          }
          function key$2(n, callback) {
            var self2 = this;
            var promise = self2.ready().then(function() {
              var dbInfo = self2._dbInfo;
              var result;
              try {
                result = localStorage.key(n);
              } catch (error) {
                result = null;
              }
              if (result) {
                result = result.substring(dbInfo.keyPrefix.length);
              }
              return result;
            });
            executeCallback(promise, callback);
            return promise;
          }
          function keys$2(callback) {
            var self2 = this;
            var promise = self2.ready().then(function() {
              var dbInfo = self2._dbInfo;
              var length2 = localStorage.length;
              var keys2 = [];
              for (var i = 0; i < length2; i++) {
                var itemKey = localStorage.key(i);
                if (itemKey.indexOf(dbInfo.keyPrefix) === 0) {
                  keys2.push(itemKey.substring(dbInfo.keyPrefix.length));
                }
              }
              return keys2;
            });
            executeCallback(promise, callback);
            return promise;
          }
          function length$2(callback) {
            var self2 = this;
            var promise = self2.keys().then(function(keys2) {
              return keys2.length;
            });
            executeCallback(promise, callback);
            return promise;
          }
          function removeItem$2(key2, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = self2.ready().then(function() {
              var dbInfo = self2._dbInfo;
              localStorage.removeItem(dbInfo.keyPrefix + key2);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function setItem$2(key2, value, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = self2.ready().then(function() {
              if (value === void 0) {
                value = null;
              }
              var originalValue = value;
              return new Promise$1(function(resolve, reject) {
                var dbInfo = self2._dbInfo;
                dbInfo.serializer.serialize(value, function(value2, error) {
                  if (error) {
                    reject(error);
                  } else {
                    try {
                      localStorage.setItem(dbInfo.keyPrefix + key2, value2);
                      resolve(originalValue);
                    } catch (e) {
                      if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED") {
                        reject(e);
                      }
                      reject(e);
                    }
                  }
                });
              });
            });
            executeCallback(promise, callback);
            return promise;
          }
          function dropInstance$2(options, callback) {
            callback = getCallback.apply(this, arguments);
            options = typeof options !== "function" && options || {};
            if (!options.name) {
              var currentConfig = this.config();
              options.name = options.name || currentConfig.name;
              options.storeName = options.storeName || currentConfig.storeName;
            }
            var self2 = this;
            var promise;
            if (!options.name) {
              promise = Promise$1.reject("Invalid arguments");
            } else {
              promise = new Promise$1(function(resolve) {
                if (!options.storeName) {
                  resolve(options.name + "/");
                } else {
                  resolve(_getKeyPrefix(options, self2._defaultConfig));
                }
              }).then(function(keyPrefix) {
                for (var i = localStorage.length - 1; i >= 0; i--) {
                  var key2 = localStorage.key(i);
                  if (key2.indexOf(keyPrefix) === 0) {
                    localStorage.removeItem(key2);
                  }
                }
              });
            }
            executeCallback(promise, callback);
            return promise;
          }
          var localStorageWrapper = {
            _driver: "localStorageWrapper",
            _initStorage: _initStorage$2,
            _support: isLocalStorageValid(),
            iterate: iterate$2,
            getItem: getItem$2,
            setItem: setItem$2,
            removeItem: removeItem$2,
            clear: clear$2,
            length: length$2,
            key: key$2,
            keys: keys$2,
            dropInstance: dropInstance$2
          };
          var sameValue = function sameValue2(x, y) {
            return x === y || typeof x === "number" && typeof y === "number" && isNaN(x) && isNaN(y);
          };
          var includes = function includes2(array, searchElement) {
            var len = array.length;
            var i = 0;
            while (i < len) {
              if (sameValue(array[i], searchElement)) {
                return true;
              }
              i++;
            }
            return false;
          };
          var isArray = Array.isArray || function(arg) {
            return Object.prototype.toString.call(arg) === "[object Array]";
          };
          var DefinedDrivers = {};
          var DriverSupport = {};
          var DefaultDrivers = {
            INDEXEDDB: asyncStorage,
            WEBSQL: webSQLStorage,
            LOCALSTORAGE: localStorageWrapper
          };
          var DefaultDriverOrder = [DefaultDrivers.INDEXEDDB._driver, DefaultDrivers.WEBSQL._driver, DefaultDrivers.LOCALSTORAGE._driver];
          var OptionalDriverMethods = ["dropInstance"];
          var LibraryMethods = ["clear", "getItem", "iterate", "key", "keys", "length", "removeItem", "setItem"].concat(OptionalDriverMethods);
          var DefaultConfig = {
            description: "",
            driver: DefaultDriverOrder.slice(),
            name: "localforage",
            // Default DB size is _JUST UNDER_ 5MB, as it's the highest size
            // we can use without a prompt.
            size: 4980736,
            storeName: "keyvaluepairs",
            version: 1
          };
          function callWhenReady(localForageInstance, libraryMethod) {
            localForageInstance[libraryMethod] = function() {
              var _args = arguments;
              return localForageInstance.ready().then(function() {
                return localForageInstance[libraryMethod].apply(localForageInstance, _args);
              });
            };
          }
          function extend() {
            for (var i = 1; i < arguments.length; i++) {
              var arg = arguments[i];
              if (arg) {
                for (var _key in arg) {
                  if (arg.hasOwnProperty(_key)) {
                    if (isArray(arg[_key])) {
                      arguments[0][_key] = arg[_key].slice();
                    } else {
                      arguments[0][_key] = arg[_key];
                    }
                  }
                }
              }
            }
            return arguments[0];
          }
          var LocalForage = (function() {
            function LocalForage2(options) {
              _classCallCheck(this, LocalForage2);
              for (var driverTypeKey in DefaultDrivers) {
                if (DefaultDrivers.hasOwnProperty(driverTypeKey)) {
                  var driver = DefaultDrivers[driverTypeKey];
                  var driverName = driver._driver;
                  this[driverTypeKey] = driverName;
                  if (!DefinedDrivers[driverName]) {
                    this.defineDriver(driver);
                  }
                }
              }
              this._defaultConfig = extend({}, DefaultConfig);
              this._config = extend({}, this._defaultConfig, options);
              this._driverSet = null;
              this._initDriver = null;
              this._ready = false;
              this._dbInfo = null;
              this._wrapLibraryMethodsWithReady();
              this.setDriver(this._config.driver)["catch"](function() {
              });
            }
            LocalForage2.prototype.config = function config(options) {
              if ((typeof options === "undefined" ? "undefined" : _typeof(options)) === "object") {
                if (this._ready) {
                  return new Error("Can't call config() after localforage has been used.");
                }
                for (var i in options) {
                  if (i === "storeName") {
                    options[i] = options[i].replace(/\W/g, "_");
                  }
                  if (i === "version" && typeof options[i] !== "number") {
                    return new Error("Database version must be a number.");
                  }
                  this._config[i] = options[i];
                }
                if ("driver" in options && options.driver) {
                  return this.setDriver(this._config.driver);
                }
                return true;
              } else if (typeof options === "string") {
                return this._config[options];
              } else {
                return this._config;
              }
            };
            LocalForage2.prototype.defineDriver = function defineDriver(driverObject, callback, errorCallback) {
              var promise = new Promise$1(function(resolve, reject) {
                try {
                  var driverName = driverObject._driver;
                  var complianceError = new Error("Custom driver not compliant; see https://mozilla.github.io/localForage/#definedriver");
                  if (!driverObject._driver) {
                    reject(complianceError);
                    return;
                  }
                  var driverMethods = LibraryMethods.concat("_initStorage");
                  for (var i = 0, len = driverMethods.length; i < len; i++) {
                    var driverMethodName = driverMethods[i];
                    var isRequired = !includes(OptionalDriverMethods, driverMethodName);
                    if ((isRequired || driverObject[driverMethodName]) && typeof driverObject[driverMethodName] !== "function") {
                      reject(complianceError);
                      return;
                    }
                  }
                  var configureMissingMethods = function configureMissingMethods2() {
                    var methodNotImplementedFactory = function methodNotImplementedFactory2(methodName) {
                      return function() {
                        var error = new Error("Method " + methodName + " is not implemented by the current driver");
                        var promise2 = Promise$1.reject(error);
                        executeCallback(promise2, arguments[arguments.length - 1]);
                        return promise2;
                      };
                    };
                    for (var _i = 0, _len = OptionalDriverMethods.length; _i < _len; _i++) {
                      var optionalDriverMethod = OptionalDriverMethods[_i];
                      if (!driverObject[optionalDriverMethod]) {
                        driverObject[optionalDriverMethod] = methodNotImplementedFactory(optionalDriverMethod);
                      }
                    }
                  };
                  configureMissingMethods();
                  var setDriverSupport = function setDriverSupport2(support) {
                    if (DefinedDrivers[driverName]) {
                      console.info("Redefining LocalForage driver: " + driverName);
                    }
                    DefinedDrivers[driverName] = driverObject;
                    DriverSupport[driverName] = support;
                    resolve();
                  };
                  if ("_support" in driverObject) {
                    if (driverObject._support && typeof driverObject._support === "function") {
                      driverObject._support().then(setDriverSupport, reject);
                    } else {
                      setDriverSupport(!!driverObject._support);
                    }
                  } else {
                    setDriverSupport(true);
                  }
                } catch (e) {
                  reject(e);
                }
              });
              executeTwoCallbacks(promise, callback, errorCallback);
              return promise;
            };
            LocalForage2.prototype.driver = function driver() {
              return this._driver || null;
            };
            LocalForage2.prototype.getDriver = function getDriver(driverName, callback, errorCallback) {
              var getDriverPromise = DefinedDrivers[driverName] ? Promise$1.resolve(DefinedDrivers[driverName]) : Promise$1.reject(new Error("Driver not found."));
              executeTwoCallbacks(getDriverPromise, callback, errorCallback);
              return getDriverPromise;
            };
            LocalForage2.prototype.getSerializer = function getSerializer(callback) {
              var serializerPromise = Promise$1.resolve(localforageSerializer);
              executeTwoCallbacks(serializerPromise, callback);
              return serializerPromise;
            };
            LocalForage2.prototype.ready = function ready(callback) {
              var self2 = this;
              var promise = self2._driverSet.then(function() {
                if (self2._ready === null) {
                  self2._ready = self2._initDriver();
                }
                return self2._ready;
              });
              executeTwoCallbacks(promise, callback, callback);
              return promise;
            };
            LocalForage2.prototype.setDriver = function setDriver(drivers, callback, errorCallback) {
              var self2 = this;
              if (!isArray(drivers)) {
                drivers = [drivers];
              }
              var supportedDrivers = this._getSupportedDrivers(drivers);
              function setDriverToConfig() {
                self2._config.driver = self2.driver();
              }
              function extendSelfWithDriver(driver) {
                self2._extend(driver);
                setDriverToConfig();
                self2._ready = self2._initStorage(self2._config);
                return self2._ready;
              }
              function initDriver(supportedDrivers2) {
                return function() {
                  var currentDriverIndex = 0;
                  function driverPromiseLoop() {
                    while (currentDriverIndex < supportedDrivers2.length) {
                      var driverName = supportedDrivers2[currentDriverIndex];
                      currentDriverIndex++;
                      self2._dbInfo = null;
                      self2._ready = null;
                      return self2.getDriver(driverName).then(extendSelfWithDriver)["catch"](driverPromiseLoop);
                    }
                    setDriverToConfig();
                    var error = new Error("No available storage method found.");
                    self2._driverSet = Promise$1.reject(error);
                    return self2._driverSet;
                  }
                  return driverPromiseLoop();
                };
              }
              var oldDriverSetDone = this._driverSet !== null ? this._driverSet["catch"](function() {
                return Promise$1.resolve();
              }) : Promise$1.resolve();
              this._driverSet = oldDriverSetDone.then(function() {
                var driverName = supportedDrivers[0];
                self2._dbInfo = null;
                self2._ready = null;
                return self2.getDriver(driverName).then(function(driver) {
                  self2._driver = driver._driver;
                  setDriverToConfig();
                  self2._wrapLibraryMethodsWithReady();
                  self2._initDriver = initDriver(supportedDrivers);
                });
              })["catch"](function() {
                setDriverToConfig();
                var error = new Error("No available storage method found.");
                self2._driverSet = Promise$1.reject(error);
                return self2._driverSet;
              });
              executeTwoCallbacks(this._driverSet, callback, errorCallback);
              return this._driverSet;
            };
            LocalForage2.prototype.supports = function supports(driverName) {
              return !!DriverSupport[driverName];
            };
            LocalForage2.prototype._extend = function _extend(libraryMethodsAndProperties) {
              extend(this, libraryMethodsAndProperties);
            };
            LocalForage2.prototype._getSupportedDrivers = function _getSupportedDrivers(drivers) {
              var supportedDrivers = [];
              for (var i = 0, len = drivers.length; i < len; i++) {
                var driverName = drivers[i];
                if (this.supports(driverName)) {
                  supportedDrivers.push(driverName);
                }
              }
              return supportedDrivers;
            };
            LocalForage2.prototype._wrapLibraryMethodsWithReady = function _wrapLibraryMethodsWithReady() {
              for (var i = 0, len = LibraryMethods.length; i < len; i++) {
                callWhenReady(this, LibraryMethods[i]);
              }
            };
            LocalForage2.prototype.createInstance = function createInstance(options) {
              return new LocalForage2(options);
            };
            return LocalForage2;
          })();
          var localforage_js = new LocalForage();
          module3.exports = localforage_js;
        }, { "3": 3 }] }, {}, [4])(4);
      });
    }
  });

  // browser-version/.browser-build/lib/storage.js
  var require_storage = __commonJS({
    "browser-version/.browser-build/lib/storage.js"(exports, module) {
      var localforage = require_localforage();
      localforage.config({
        name: "NeDB",
        storeName: "nedbdata"
      });
      function exists(filename, callback) {
        localforage.getItem(filename, (err, value) => {
          if (value !== null) {
            return callback(true);
          } else {
            return callback(false);
          }
        });
      }
      function rename(filename, newFilename, callback) {
        localforage.getItem(filename, (err, value) => {
          if (value === null) {
            localforage.removeItem(newFilename, () => callback());
          } else {
            localforage.setItem(newFilename, value, () => {
              localforage.removeItem(filename, () => callback());
            });
          }
        });
      }
      function writeFile(filename, contents, options, callback) {
        if (typeof options === "function") {
          callback = options;
        }
        localforage.setItem(filename, contents, () => callback());
      }
      function appendFile(filename, toAppend, options, callback) {
        if (typeof options === "function") {
          callback = options;
        }
        localforage.getItem(filename, (err, contents) => {
          contents = contents || "";
          contents += toAppend;
          localforage.setItem(filename, contents, () => callback());
        });
      }
      function readFile(filename, options, callback) {
        if (typeof options === "function") {
          callback = options;
        }
        localforage.getItem(filename, (err, contents) => callback(null, contents || ""));
      }
      function unlink(filename, callback) {
        localforage.removeItem(filename, () => callback());
      }
      function mkdirp(dir, callback) {
        return callback();
      }
      function ensureDatafileIntegrity(filename, callback) {
        return callback(null);
      }
      module.exports.exists = exists;
      module.exports.rename = rename;
      module.exports.writeFile = writeFile;
      module.exports.crashSafeWriteFile = writeFile;
      module.exports.appendFile = appendFile;
      module.exports.readFile = readFile;
      module.exports.unlink = unlink;
      module.exports.mkdirp = mkdirp;
      module.exports.ensureDatafileIntegrity = ensureDatafileIntegrity;
    }
  });

  // node_modules/path-browserify/index.js
  var require_path_browserify = __commonJS({
    "node_modules/path-browserify/index.js"(exports, module) {
      "use strict";
      function assertPath(path) {
        if (typeof path !== "string") {
          throw new TypeError("Path must be a string. Received " + JSON.stringify(path));
        }
      }
      function normalizeStringPosix(path, allowAboveRoot) {
        var res = "";
        var lastSegmentLength = 0;
        var lastSlash = -1;
        var dots = 0;
        var code;
        for (var i = 0; i <= path.length; ++i) {
          if (i < path.length)
            code = path.charCodeAt(i);
          else if (code === 47)
            break;
          else
            code = 47;
          if (code === 47) {
            if (lastSlash === i - 1 || dots === 1) {
            } else if (lastSlash !== i - 1 && dots === 2) {
              if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
                if (res.length > 2) {
                  var lastSlashIndex = res.lastIndexOf("/");
                  if (lastSlashIndex !== res.length - 1) {
                    if (lastSlashIndex === -1) {
                      res = "";
                      lastSegmentLength = 0;
                    } else {
                      res = res.slice(0, lastSlashIndex);
                      lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
                    }
                    lastSlash = i;
                    dots = 0;
                    continue;
                  }
                } else if (res.length === 2 || res.length === 1) {
                  res = "";
                  lastSegmentLength = 0;
                  lastSlash = i;
                  dots = 0;
                  continue;
                }
              }
              if (allowAboveRoot) {
                if (res.length > 0)
                  res += "/..";
                else
                  res = "..";
                lastSegmentLength = 2;
              }
            } else {
              if (res.length > 0)
                res += "/" + path.slice(lastSlash + 1, i);
              else
                res = path.slice(lastSlash + 1, i);
              lastSegmentLength = i - lastSlash - 1;
            }
            lastSlash = i;
            dots = 0;
          } else if (code === 46 && dots !== -1) {
            ++dots;
          } else {
            dots = -1;
          }
        }
        return res;
      }
      function _format(sep, pathObject) {
        var dir = pathObject.dir || pathObject.root;
        var base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
        if (!dir) {
          return base;
        }
        if (dir === pathObject.root) {
          return dir + base;
        }
        return dir + sep + base;
      }
      var posix = {
        // path.resolve([from ...], to)
        resolve: function resolve() {
          var resolvedPath = "";
          var resolvedAbsolute = false;
          var cwd;
          for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
            var path;
            if (i >= 0)
              path = arguments[i];
            else {
              if (cwd === void 0)
                cwd = process.cwd();
              path = cwd;
            }
            assertPath(path);
            if (path.length === 0) {
              continue;
            }
            resolvedPath = path + "/" + resolvedPath;
            resolvedAbsolute = path.charCodeAt(0) === 47;
          }
          resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);
          if (resolvedAbsolute) {
            if (resolvedPath.length > 0)
              return "/" + resolvedPath;
            else
              return "/";
          } else if (resolvedPath.length > 0) {
            return resolvedPath;
          } else {
            return ".";
          }
        },
        normalize: function normalize(path) {
          assertPath(path);
          if (path.length === 0) return ".";
          var isAbsolute = path.charCodeAt(0) === 47;
          var trailingSeparator = path.charCodeAt(path.length - 1) === 47;
          path = normalizeStringPosix(path, !isAbsolute);
          if (path.length === 0 && !isAbsolute) path = ".";
          if (path.length > 0 && trailingSeparator) path += "/";
          if (isAbsolute) return "/" + path;
          return path;
        },
        isAbsolute: function isAbsolute(path) {
          assertPath(path);
          return path.length > 0 && path.charCodeAt(0) === 47;
        },
        join: function join() {
          if (arguments.length === 0)
            return ".";
          var joined;
          for (var i = 0; i < arguments.length; ++i) {
            var arg = arguments[i];
            assertPath(arg);
            if (arg.length > 0) {
              if (joined === void 0)
                joined = arg;
              else
                joined += "/" + arg;
            }
          }
          if (joined === void 0)
            return ".";
          return posix.normalize(joined);
        },
        relative: function relative(from, to) {
          assertPath(from);
          assertPath(to);
          if (from === to) return "";
          from = posix.resolve(from);
          to = posix.resolve(to);
          if (from === to) return "";
          var fromStart = 1;
          for (; fromStart < from.length; ++fromStart) {
            if (from.charCodeAt(fromStart) !== 47)
              break;
          }
          var fromEnd = from.length;
          var fromLen = fromEnd - fromStart;
          var toStart = 1;
          for (; toStart < to.length; ++toStart) {
            if (to.charCodeAt(toStart) !== 47)
              break;
          }
          var toEnd = to.length;
          var toLen = toEnd - toStart;
          var length = fromLen < toLen ? fromLen : toLen;
          var lastCommonSep = -1;
          var i = 0;
          for (; i <= length; ++i) {
            if (i === length) {
              if (toLen > length) {
                if (to.charCodeAt(toStart + i) === 47) {
                  return to.slice(toStart + i + 1);
                } else if (i === 0) {
                  return to.slice(toStart + i);
                }
              } else if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === 47) {
                  lastCommonSep = i;
                } else if (i === 0) {
                  lastCommonSep = 0;
                }
              }
              break;
            }
            var fromCode = from.charCodeAt(fromStart + i);
            var toCode = to.charCodeAt(toStart + i);
            if (fromCode !== toCode)
              break;
            else if (fromCode === 47)
              lastCommonSep = i;
          }
          var out = "";
          for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
            if (i === fromEnd || from.charCodeAt(i) === 47) {
              if (out.length === 0)
                out += "..";
              else
                out += "/..";
            }
          }
          if (out.length > 0)
            return out + to.slice(toStart + lastCommonSep);
          else {
            toStart += lastCommonSep;
            if (to.charCodeAt(toStart) === 47)
              ++toStart;
            return to.slice(toStart);
          }
        },
        _makeLong: function _makeLong(path) {
          return path;
        },
        dirname: function dirname(path) {
          assertPath(path);
          if (path.length === 0) return ".";
          var code = path.charCodeAt(0);
          var hasRoot = code === 47;
          var end = -1;
          var matchedSlash = true;
          for (var i = path.length - 1; i >= 1; --i) {
            code = path.charCodeAt(i);
            if (code === 47) {
              if (!matchedSlash) {
                end = i;
                break;
              }
            } else {
              matchedSlash = false;
            }
          }
          if (end === -1) return hasRoot ? "/" : ".";
          if (hasRoot && end === 1) return "//";
          return path.slice(0, end);
        },
        basename: function basename(path, ext) {
          if (ext !== void 0 && typeof ext !== "string") throw new TypeError('"ext" argument must be a string');
          assertPath(path);
          var start = 0;
          var end = -1;
          var matchedSlash = true;
          var i;
          if (ext !== void 0 && ext.length > 0 && ext.length <= path.length) {
            if (ext.length === path.length && ext === path) return "";
            var extIdx = ext.length - 1;
            var firstNonSlashEnd = -1;
            for (i = path.length - 1; i >= 0; --i) {
              var code = path.charCodeAt(i);
              if (code === 47) {
                if (!matchedSlash) {
                  start = i + 1;
                  break;
                }
              } else {
                if (firstNonSlashEnd === -1) {
                  matchedSlash = false;
                  firstNonSlashEnd = i + 1;
                }
                if (extIdx >= 0) {
                  if (code === ext.charCodeAt(extIdx)) {
                    if (--extIdx === -1) {
                      end = i;
                    }
                  } else {
                    extIdx = -1;
                    end = firstNonSlashEnd;
                  }
                }
              }
            }
            if (start === end) end = firstNonSlashEnd;
            else if (end === -1) end = path.length;
            return path.slice(start, end);
          } else {
            for (i = path.length - 1; i >= 0; --i) {
              if (path.charCodeAt(i) === 47) {
                if (!matchedSlash) {
                  start = i + 1;
                  break;
                }
              } else if (end === -1) {
                matchedSlash = false;
                end = i + 1;
              }
            }
            if (end === -1) return "";
            return path.slice(start, end);
          }
        },
        extname: function extname(path) {
          assertPath(path);
          var startDot = -1;
          var startPart = 0;
          var end = -1;
          var matchedSlash = true;
          var preDotState = 0;
          for (var i = path.length - 1; i >= 0; --i) {
            var code = path.charCodeAt(i);
            if (code === 47) {
              if (!matchedSlash) {
                startPart = i + 1;
                break;
              }
              continue;
            }
            if (end === -1) {
              matchedSlash = false;
              end = i + 1;
            }
            if (code === 46) {
              if (startDot === -1)
                startDot = i;
              else if (preDotState !== 1)
                preDotState = 1;
            } else if (startDot !== -1) {
              preDotState = -1;
            }
          }
          if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
          preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
          preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
            return "";
          }
          return path.slice(startDot, end);
        },
        format: function format(pathObject) {
          if (pathObject === null || typeof pathObject !== "object") {
            throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
          }
          return _format("/", pathObject);
        },
        parse: function parse(path) {
          assertPath(path);
          var ret = { root: "", dir: "", base: "", ext: "", name: "" };
          if (path.length === 0) return ret;
          var code = path.charCodeAt(0);
          var isAbsolute = code === 47;
          var start;
          if (isAbsolute) {
            ret.root = "/";
            start = 1;
          } else {
            start = 0;
          }
          var startDot = -1;
          var startPart = 0;
          var end = -1;
          var matchedSlash = true;
          var i = path.length - 1;
          var preDotState = 0;
          for (; i >= start; --i) {
            code = path.charCodeAt(i);
            if (code === 47) {
              if (!matchedSlash) {
                startPart = i + 1;
                break;
              }
              continue;
            }
            if (end === -1) {
              matchedSlash = false;
              end = i + 1;
            }
            if (code === 46) {
              if (startDot === -1) startDot = i;
              else if (preDotState !== 1) preDotState = 1;
            } else if (startDot !== -1) {
              preDotState = -1;
            }
          }
          if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
          preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
          preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
            if (end !== -1) {
              if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);
              else ret.base = ret.name = path.slice(startPart, end);
            }
          } else {
            if (startPart === 0 && isAbsolute) {
              ret.name = path.slice(1, startDot);
              ret.base = path.slice(1, end);
            } else {
              ret.name = path.slice(startPart, startDot);
              ret.base = path.slice(startPart, end);
            }
            ret.ext = path.slice(startDot, end);
          }
          if (startPart > 0) ret.dir = path.slice(0, startPart - 1);
          else if (isAbsolute) ret.dir = "/";
          return ret;
        },
        sep: "/",
        delimiter: ":",
        win32: null,
        posix: null
      };
      posix.posix = posix;
      module.exports = posix;
    }
  });

  // browser-version/.browser-build/lib/persistence.js
  var require_persistence = __commonJS({
    "browser-version/.browser-build/lib/persistence.js"(exports, module) {
      var storage = require_storage();
      var path = require_path_browserify();
      var model = require_model();
      var customUtils = require_customUtils();
      var Index = require_indexes();
      var Persistence = class _Persistence {
        /**
         * Create a new Persistence object for database options.db
         * @param {Datastore} options.db
         * @param {Boolean} options.nodeWebkitAppName Optional, deprecated
         */
        constructor(options) {
          this.db = options.db;
          this.inMemoryOnly = this.db.inMemoryOnly;
          this.filename = this.db.filename;
          this.corruptAlertThreshold = options.corruptAlertThreshold ?? 0.1;
          if (!this.inMemoryOnly && this.filename?.endsWith("~")) {
            throw new Error("The datafile name can't end with a ~, which is reserved for crash safe backup files");
          }
          if (options.afterSerialization && !options.beforeDeserialization) {
            throw new Error("Serialization hook defined but deserialization hook undefined, cautiously refusing to start NeDB to prevent dataloss");
          }
          if (!options.afterSerialization && options.beforeDeserialization) {
            throw new Error("Serialization hook undefined but deserialization hook defined, cautiously refusing to start NeDB to prevent dataloss");
          }
          this.afterSerialization = options.afterSerialization ?? ((s) => s);
          this.beforeDeserialization = options.beforeDeserialization ?? ((s) => s);
          for (let i = 1; i < 30; i++) {
            for (let j = 0; j < 10; j++) {
              const randomString = customUtils.uid(i);
              if (this.beforeDeserialization(this.afterSerialization(randomString)) !== randomString) {
                throw new Error("beforeDeserialization is not the reverse of afterSerialization, cautiously refusing to start NeDB to prevent dataloss");
              }
            }
          }
          if (this.filename && options.nodeWebkitAppName) {
            console.log("==================================================================");
            console.log("WARNING: The nodeWebkitAppName option is deprecated");
            console.log("To get the path to the directory where Node Webkit stores the data");
            console.log("for your app, use the internal nw.gui module like this");
            console.log("require('nw.gui').App.dataPath");
            console.log("See https://github.com/rogerwang/node-webkit/issues/500");
            console.log("==================================================================");
            this.filename = _Persistence.getNWAppFilename(options.nodeWebkitAppName, this.filename);
          }
        }
        /**
         * Persist cached database
         * This serves as a compaction function
         */
        persistCachedDatabase(cb = () => {
        }) {
          if (this.inMemoryOnly) {
            return cb(null);
          }
          const lines = [];
          for (const doc of this.db.getAllData()) {
            lines.push(this.afterSerialization(model.serialize(doc)));
          }
          for (const [fieldName, index] of Object.entries(this.db.indexes)) {
            if (fieldName !== "_id") {
              lines.push(this.afterSerialization(model.serialize({
                $$indexCreated: {
                  fieldName,
                  unique: index.unique,
                  sparse: index.sparse
                }
              })));
            }
          }
          const toPersist = lines.join("\n") + (lines.length ? "\n" : "");
          storage.crashSafeWriteFile(this.filename, toPersist, function(err) {
            if (err) {
              return cb(err);
            }
            this.db.emit("compaction.done");
            return cb(null);
          }.bind(this));
        }
        /**
         * Queue a rewrite of the datafile
         */
        compactDatafile() {
          this.db.executor.push({ this: this, fn: this.persistCachedDatabase, arguments: [] });
        }
        /**
         * Set automatic compaction every interval ms
         */
        setAutocompactionInterval(interval) {
          const minInterval = 5e3;
          const realInterval = Math.max(interval || 0, minInterval);
          this.stopAutocompaction();
          this.autocompactionIntervalId = setInterval(() => this.compactDatafile(), realInterval);
        }
        /**
         * Stop autocompaction
         */
        stopAutocompaction() {
          if (this.autocompactionIntervalId) {
            clearInterval(this.autocompactionIntervalId);
          }
        }
        /**
         * Persist new state for the given newDocs (can be insertion, update or removal)
         * Use an append-only format
         */
        persistNewState(newDocs, cb = () => {
        }) {
          if (this.inMemoryOnly) {
            return cb(null);
          }
          const lines = newDocs.map((doc) => this.afterSerialization(model.serialize(doc)));
          const toPersist = lines.join("\n") + (lines.length ? "\n" : "");
          if (toPersist.length === 0) {
            return cb(null);
          }
          storage.appendFile(this.filename, toPersist, "utf8", (err) => {
            return cb(err);
          });
        }
        /**
         * From a database's raw data, return the corresponding
         * machine understandable collection
         */
        treatRawData(rawData) {
          const data = rawData.split("\n");
          const dataById = /* @__PURE__ */ new Map();
          const tdata = [];
          const indexes = {};
          let corruptItems = -1;
          for (const line of data) {
            try {
              const doc = model.deserialize(this.beforeDeserialization(line));
              if (doc._id) {
                if (doc.$$deleted === true) {
                  dataById.delete(doc._id);
                } else {
                  dataById.set(doc._id, doc);
                }
              } else if (doc.$$indexCreated?.fieldName !== void 0) {
                indexes[doc.$$indexCreated.fieldName] = doc.$$indexCreated;
              } else if (typeof doc.$$indexRemoved === "string") {
                delete indexes[doc.$$indexRemoved];
              }
            } catch (e) {
              corruptItems += 1;
            }
          }
          if (data.length > 0 && corruptItems / data.length > this.corruptAlertThreshold) {
            throw new Error(`More than ${Math.floor(100 * this.corruptAlertThreshold)}% of the data file is corrupt, the wrong beforeDeserialization hook may be used. Cautiously refusing to start NeDB to prevent dataloss`);
          }
          for (const doc of dataById.values()) {
            tdata.push(doc);
          }
          return { data: tdata, indexes };
        }
        /**
         * Load the database
         */
        loadDatabase(cb = () => {
        }) {
          this.db.resetIndexes();
          if (this.inMemoryOnly) {
            return cb(null);
          }
          _Persistence.ensureDirectoryExists(path.dirname(this.filename), (err) => {
            if (err) {
              return cb(err);
            }
            storage.ensureDatafileIntegrity(this.filename, (err2) => {
              if (err2) {
                return cb(err2);
              }
              storage.readFile(this.filename, "utf8", (err3, rawData) => {
                if (err3) {
                  return cb(err3);
                }
                let treatedData;
                try {
                  treatedData = this.treatRawData(rawData);
                } catch (e) {
                  return cb(e);
                }
                for (const [key, indexData] of Object.entries(treatedData.indexes)) {
                  this.db.indexes[key] = new Index(indexData);
                }
                try {
                  this.db.resetIndexes(treatedData.data);
                } catch (e) {
                  this.db.resetIndexes();
                  return cb(e);
                }
                this.db.persistence.persistCachedDatabase((err4) => {
                  if (err4) {
                    return cb(err4);
                  }
                  this.db.executor.processBuffer();
                  return cb(null);
                });
              });
            });
          });
        }
        /**
         * Check if a directory exists and create it on the fly if it is not the case
         */
        static ensureDirectoryExists(dir, cb = () => {
        }) {
          storage.mkdirp(dir, (err) => cb(err));
        }
        /**
         * Return the path the datafile if the given filename is relative to NW app data dir
         */
        static getNWAppFilename(appName, relativeFilename) {
          let home;
          switch (process.platform) {
            case "win32":
            case "win64":
              home = process.env.LOCALAPPDATA || process.env.APPDATA;
              if (!home) {
                throw new Error("Couldn't find the base application data folder");
              }
              home = path.join(home, appName);
              break;
            case "darwin":
              home = process.env.HOME;
              if (!home) {
                throw new Error("Couldn't find the base application data directory");
              }
              home = path.join(home, "Library", "Application Support", appName);
              break;
            case "linux":
              home = process.env.HOME;
              if (!home) {
                throw new Error("Couldn't find the base application data directory");
              }
              home = path.join(home, ".config", appName);
              break;
            default:
              throw new Error(`Can't use the Node Webkit relative path for platform ${process.platform}`);
          }
          return path.join(home, "nedb-data", relativeFilename);
        }
      };
      module.exports = Persistence;
    }
  });

  // browser-version/.browser-build/lib/cursor.js
  var require_cursor = __commonJS({
    "browser-version/.browser-build/lib/cursor.js"(exports, module) {
      var model = require_model();
      var Cursor = class {
        /**
         * Create a new cursor for this collection
         * @param {Datastore} db - The datastore this cursor is bound to
         * @param {Query} query - The query this cursor will operate on
         * @param {Function} execFn - Handler to be executed after cursor has found the results
         */
        constructor(db, query, execFn) {
          this.db = db;
          this.query = query || {};
          if (execFn) {
            this.execFn = execFn;
          }
        }
        /**
         * Set a limit to the number of results
         */
        limit(limit) {
          this._limit = limit;
          return this;
        }
        /**
         * Skip a the number of results
         */
        skip(skip) {
          this._skip = skip;
          return this;
        }
        /**
         * Sort results of the query
         * @param {SortQuery} sortQuery - SortQuery is { field: order }, field can use the dot-notation, order is 1 for ascending and -1 for descending
         */
        sort(sortQuery) {
          this._sort = sortQuery;
          return this;
        }
        /**
         * Add the use of a projection
         * @param {Object} projection - MongoDB-style projection
         */
        projection(projection) {
          this._projection = projection;
          return this;
        }
        /**
         * Apply the projection
         */
        project(candidates) {
          if (this._projection === void 0 || Object.keys(this._projection).length === 0) {
            return candidates;
          }
          const keepId = this._projection._id !== 0;
          const projWithoutId = {};
          for (const [k, v] of Object.entries(this._projection)) {
            if (k !== "_id") {
              projWithoutId[k] = v;
            }
          }
          const keys = Object.keys(projWithoutId);
          let action;
          for (const k of keys) {
            if (action !== void 0 && projWithoutId[k] !== action) {
              throw new Error("Can't both keep and omit fields except for _id");
            }
            action = projWithoutId[k];
          }
          return candidates.map((candidate) => {
            if (action === 1) {
              const toPush = {};
              for (const k of keys) {
                const val = model.getDotValue(candidate, k);
                if (val === void 0) {
                  continue;
                }
                const parts = k.split(".");
                let target = toPush;
                for (let p = 0; p < parts.length - 1; p++) {
                  if (typeof target[parts[p]] !== "object" || target[parts[p]] === null) {
                    target[parts[p]] = {};
                  }
                  target = target[parts[p]];
                }
                target[parts[parts.length - 1]] = val;
              }
              if (keepId) {
                toPush._id = candidate._id;
              } else {
                delete toPush._id;
              }
              return toPush;
            } else {
              const $unset = {};
              for (const k of keys) {
                $unset[k] = true;
              }
              const result = model.modify(candidate, { $unset });
              if (keepId) {
                result._id = candidate._id;
              } else {
                delete result._id;
              }
              return result;
            }
          });
        }
        /**
         * Get all matching elements
         * This is an internal function, use exec which uses the executor
         *
         * @param {Function} _callback - Signature: err, results
         */
        _exec(_callback) {
          const self2 = this;
          const callback = (error, res) => {
            if (self2.execFn) {
              return self2.execFn(error, res, _callback);
            } else {
              return _callback(error, res);
            }
          };
          this.db.getCandidates(this.query, (err, candidates) => {
            if (err) {
              return callback(err);
            }
            let res = [];
            try {
              if (!self2._sort) {
                let added = 0, skipped = 0;
                for (const candidate of candidates) {
                  if (model.match(candidate, self2.query)) {
                    if (self2._skip && self2._skip > skipped) {
                      skipped += 1;
                    } else {
                      res.push(candidate);
                      added += 1;
                      if (self2._limit && self2._limit <= added) {
                        break;
                      }
                    }
                  }
                }
              } else {
                for (const candidate of candidates) {
                  if (model.match(candidate, self2.query)) {
                    res.push(candidate);
                  }
                }
              }
            } catch (err2) {
              return callback(err2);
            }
            if (self2._sort) {
              const criteria = Object.entries(self2._sort).map(([key, direction]) => ({ key, direction }));
              res.sort((a, b) => {
                for (const { key, direction } of criteria) {
                  const compare = direction * model.compareThings(
                    model.getDotValue(a, key),
                    model.getDotValue(b, key),
                    self2.db.compareStrings
                  );
                  if (compare !== 0) {
                    return compare;
                  }
                }
                return 0;
              });
              const limit = self2._limit || res.length;
              const skip = self2._skip || 0;
              res = res.slice(skip, skip + limit);
            }
            try {
              res = self2.project(res);
            } catch (e) {
              return callback(e, void 0);
            }
            return callback(null, res);
          });
        }
        exec(...args) {
          this.db.executor.push({ this: this, fn: this._exec, arguments: args });
        }
        /**
         * Make Cursor thenable so it can be awaited directly
         * This allows: const docs = await db.find({}).sort({ age: -1 }).limit(10);
         */
        then(resolve, reject) {
          return new Promise((res, rej) => {
            this.exec((err, result) => {
              if (err) {
                return rej(err);
              }
              res(result);
            });
          }).then(resolve, reject);
        }
        catch(reject) {
          return this.then().catch(reject);
        }
      };
      module.exports = Cursor;
    }
  });

  // node_modules/events/events.js
  var require_events = __commonJS({
    "node_modules/events/events.js"(exports, module) {
      "use strict";
      var R = typeof Reflect === "object" ? Reflect : null;
      var ReflectApply = R && typeof R.apply === "function" ? R.apply : function ReflectApply2(target, receiver, args) {
        return Function.prototype.apply.call(target, receiver, args);
      };
      var ReflectOwnKeys;
      if (R && typeof R.ownKeys === "function") {
        ReflectOwnKeys = R.ownKeys;
      } else if (Object.getOwnPropertySymbols) {
        ReflectOwnKeys = function ReflectOwnKeys2(target) {
          return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
        };
      } else {
        ReflectOwnKeys = function ReflectOwnKeys2(target) {
          return Object.getOwnPropertyNames(target);
        };
      }
      function ProcessEmitWarning(warning) {
        if (console && console.warn) console.warn(warning);
      }
      var NumberIsNaN = Number.isNaN || function NumberIsNaN2(value) {
        return value !== value;
      };
      function EventEmitter() {
        EventEmitter.init.call(this);
      }
      module.exports = EventEmitter;
      module.exports.once = once;
      EventEmitter.EventEmitter = EventEmitter;
      EventEmitter.prototype._events = void 0;
      EventEmitter.prototype._eventsCount = 0;
      EventEmitter.prototype._maxListeners = void 0;
      var defaultMaxListeners = 10;
      function checkListener(listener) {
        if (typeof listener !== "function") {
          throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
        }
      }
      Object.defineProperty(EventEmitter, "defaultMaxListeners", {
        enumerable: true,
        get: function() {
          return defaultMaxListeners;
        },
        set: function(arg) {
          if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
            throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + ".");
          }
          defaultMaxListeners = arg;
        }
      });
      EventEmitter.init = function() {
        if (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) {
          this._events = /* @__PURE__ */ Object.create(null);
          this._eventsCount = 0;
        }
        this._maxListeners = this._maxListeners || void 0;
      };
      EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
        if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) {
          throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + ".");
        }
        this._maxListeners = n;
        return this;
      };
      function _getMaxListeners(that) {
        if (that._maxListeners === void 0)
          return EventEmitter.defaultMaxListeners;
        return that._maxListeners;
      }
      EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
        return _getMaxListeners(this);
      };
      EventEmitter.prototype.emit = function emit(type) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var doError = type === "error";
        var events = this._events;
        if (events !== void 0)
          doError = doError && events.error === void 0;
        else if (!doError)
          return false;
        if (doError) {
          var er;
          if (args.length > 0)
            er = args[0];
          if (er instanceof Error) {
            throw er;
          }
          var err = new Error("Unhandled error." + (er ? " (" + er.message + ")" : ""));
          err.context = er;
          throw err;
        }
        var handler = events[type];
        if (handler === void 0)
          return false;
        if (typeof handler === "function") {
          ReflectApply(handler, this, args);
        } else {
          var len = handler.length;
          var listeners = arrayClone(handler, len);
          for (var i = 0; i < len; ++i)
            ReflectApply(listeners[i], this, args);
        }
        return true;
      };
      function _addListener(target, type, listener, prepend) {
        var m;
        var events;
        var existing;
        checkListener(listener);
        events = target._events;
        if (events === void 0) {
          events = target._events = /* @__PURE__ */ Object.create(null);
          target._eventsCount = 0;
        } else {
          if (events.newListener !== void 0) {
            target.emit(
              "newListener",
              type,
              listener.listener ? listener.listener : listener
            );
            events = target._events;
          }
          existing = events[type];
        }
        if (existing === void 0) {
          existing = events[type] = listener;
          ++target._eventsCount;
        } else {
          if (typeof existing === "function") {
            existing = events[type] = prepend ? [listener, existing] : [existing, listener];
          } else if (prepend) {
            existing.unshift(listener);
          } else {
            existing.push(listener);
          }
          m = _getMaxListeners(target);
          if (m > 0 && existing.length > m && !existing.warned) {
            existing.warned = true;
            var w = new Error("Possible EventEmitter memory leak detected. " + existing.length + " " + String(type) + " listeners added. Use emitter.setMaxListeners() to increase limit");
            w.name = "MaxListenersExceededWarning";
            w.emitter = target;
            w.type = type;
            w.count = existing.length;
            ProcessEmitWarning(w);
          }
        }
        return target;
      }
      EventEmitter.prototype.addListener = function addListener(type, listener) {
        return _addListener(this, type, listener, false);
      };
      EventEmitter.prototype.on = EventEmitter.prototype.addListener;
      EventEmitter.prototype.prependListener = function prependListener(type, listener) {
        return _addListener(this, type, listener, true);
      };
      function onceWrapper() {
        if (!this.fired) {
          this.target.removeListener(this.type, this.wrapFn);
          this.fired = true;
          if (arguments.length === 0)
            return this.listener.call(this.target);
          return this.listener.apply(this.target, arguments);
        }
      }
      function _onceWrap(target, type, listener) {
        var state = { fired: false, wrapFn: void 0, target, type, listener };
        var wrapped = onceWrapper.bind(state);
        wrapped.listener = listener;
        state.wrapFn = wrapped;
        return wrapped;
      }
      EventEmitter.prototype.once = function once2(type, listener) {
        checkListener(listener);
        this.on(type, _onceWrap(this, type, listener));
        return this;
      };
      EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
        checkListener(listener);
        this.prependListener(type, _onceWrap(this, type, listener));
        return this;
      };
      EventEmitter.prototype.removeListener = function removeListener(type, listener) {
        var list, events, position, i, originalListener;
        checkListener(listener);
        events = this._events;
        if (events === void 0)
          return this;
        list = events[type];
        if (list === void 0)
          return this;
        if (list === listener || list.listener === listener) {
          if (--this._eventsCount === 0)
            this._events = /* @__PURE__ */ Object.create(null);
          else {
            delete events[type];
            if (events.removeListener)
              this.emit("removeListener", type, list.listener || listener);
          }
        } else if (typeof list !== "function") {
          position = -1;
          for (i = list.length - 1; i >= 0; i--) {
            if (list[i] === listener || list[i].listener === listener) {
              originalListener = list[i].listener;
              position = i;
              break;
            }
          }
          if (position < 0)
            return this;
          if (position === 0)
            list.shift();
          else {
            spliceOne(list, position);
          }
          if (list.length === 1)
            events[type] = list[0];
          if (events.removeListener !== void 0)
            this.emit("removeListener", type, originalListener || listener);
        }
        return this;
      };
      EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
      EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
        var listeners, events, i;
        events = this._events;
        if (events === void 0)
          return this;
        if (events.removeListener === void 0) {
          if (arguments.length === 0) {
            this._events = /* @__PURE__ */ Object.create(null);
            this._eventsCount = 0;
          } else if (events[type] !== void 0) {
            if (--this._eventsCount === 0)
              this._events = /* @__PURE__ */ Object.create(null);
            else
              delete events[type];
          }
          return this;
        }
        if (arguments.length === 0) {
          var keys = Object.keys(events);
          var key;
          for (i = 0; i < keys.length; ++i) {
            key = keys[i];
            if (key === "removeListener") continue;
            this.removeAllListeners(key);
          }
          this.removeAllListeners("removeListener");
          this._events = /* @__PURE__ */ Object.create(null);
          this._eventsCount = 0;
          return this;
        }
        listeners = events[type];
        if (typeof listeners === "function") {
          this.removeListener(type, listeners);
        } else if (listeners !== void 0) {
          for (i = listeners.length - 1; i >= 0; i--) {
            this.removeListener(type, listeners[i]);
          }
        }
        return this;
      };
      function _listeners(target, type, unwrap) {
        var events = target._events;
        if (events === void 0)
          return [];
        var evlistener = events[type];
        if (evlistener === void 0)
          return [];
        if (typeof evlistener === "function")
          return unwrap ? [evlistener.listener || evlistener] : [evlistener];
        return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
      }
      EventEmitter.prototype.listeners = function listeners(type) {
        return _listeners(this, type, true);
      };
      EventEmitter.prototype.rawListeners = function rawListeners(type) {
        return _listeners(this, type, false);
      };
      EventEmitter.listenerCount = function(emitter, type) {
        if (typeof emitter.listenerCount === "function") {
          return emitter.listenerCount(type);
        } else {
          return listenerCount.call(emitter, type);
        }
      };
      EventEmitter.prototype.listenerCount = listenerCount;
      function listenerCount(type) {
        var events = this._events;
        if (events !== void 0) {
          var evlistener = events[type];
          if (typeof evlistener === "function") {
            return 1;
          } else if (evlistener !== void 0) {
            return evlistener.length;
          }
        }
        return 0;
      }
      EventEmitter.prototype.eventNames = function eventNames() {
        return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
      };
      function arrayClone(arr, n) {
        var copy = new Array(n);
        for (var i = 0; i < n; ++i)
          copy[i] = arr[i];
        return copy;
      }
      function spliceOne(list, index) {
        for (; index + 1 < list.length; index++)
          list[index] = list[index + 1];
        list.pop();
      }
      function unwrapListeners(arr) {
        var ret = new Array(arr.length);
        for (var i = 0; i < ret.length; ++i) {
          ret[i] = arr[i].listener || arr[i];
        }
        return ret;
      }
      function once(emitter, name) {
        return new Promise(function(resolve, reject) {
          function errorListener(err) {
            emitter.removeListener(name, resolver);
            reject(err);
          }
          function resolver() {
            if (typeof emitter.removeListener === "function") {
              emitter.removeListener("error", errorListener);
            }
            resolve([].slice.call(arguments));
          }
          ;
          eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
          if (name !== "error") {
            addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
          }
        });
      }
      function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
        if (typeof emitter.on === "function") {
          eventTargetAgnosticAddListener(emitter, "error", handler, flags);
        }
      }
      function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
        if (typeof emitter.on === "function") {
          if (flags.once) {
            emitter.once(name, listener);
          } else {
            emitter.on(name, listener);
          }
        } else if (typeof emitter.addEventListener === "function") {
          emitter.addEventListener(name, function wrapListener(arg) {
            if (flags.once) {
              emitter.removeEventListener(name, wrapListener);
            }
            listener(arg);
          });
        } else {
          throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
        }
      }
    }
  });

  // browser-version/.browser-build/lib/stream.js
  var require_stream = __commonJS({
    "browser-version/.browser-build/lib/stream.js"(exports, module) {
      module.exports = { streamMixins: {} };
    }
  });

  // browser-version/.browser-build/lib/datastore.js
  var require_datastore = __commonJS({
    "browser-version/.browser-build/lib/datastore.js"(exports, module) {
      var customUtils = require_customUtils();
      var model = require_model();
      var Executor = require_executor();
      var Index = require_indexes();
      var Persistence = require_persistence();
      var Cursor = require_cursor();
      var EventEmitter = require_events().EventEmitter;
      var { streamMixins } = require_stream();
      function intersection(a, b) {
        return a.filter((x) => b.includes(x));
      }
      var Datastore = class extends EventEmitter {
        constructor(options) {
          super();
          let onload;
          if (typeof options === "string") {
            this.filename = options || null;
            this.inMemoryOnly = !options;
            this.autoload = false;
            this.timestampData = false;
          } else {
            const {
              filename,
              inMemoryOnly = false,
              autoload = false,
              timestampData = false,
              nodeWebkitAppName,
              afterSerialization,
              beforeDeserialization,
              corruptAlertThreshold,
              compareStrings,
              onload: _onload
            } = options || {};
            onload = _onload;
            if (!filename || typeof filename !== "string" || filename.length === 0) {
              this.filename = null;
              this.inMemoryOnly = true;
            } else {
              this.filename = filename;
              this.inMemoryOnly = inMemoryOnly;
            }
            this.autoload = autoload;
            this.timestampData = timestampData;
            this.compareStrings = compareStrings;
            this.persistence = new Persistence({
              db: this,
              nodeWebkitAppName,
              afterSerialization,
              beforeDeserialization,
              corruptAlertThreshold
            });
          }
          this.executor = new Executor();
          if (this.inMemoryOnly) {
            this.executor.ready = true;
          }
          this.indexes = {};
          this.indexes._id = new Index({ fieldName: "_id", unique: true });
          this.ttlIndexes = {};
          if (this.autoload) {
            this.loadDatabase(onload || function(err) {
              if (err) {
                throw err;
              }
            });
          }
        }
        /**
         * Load the database from the datafile
         */
        loadDatabase(cb) {
          if (cb) {
            this.executor.push({ this: this.persistence, fn: this.persistence.loadDatabase, arguments }, true);
            return void 0;
          }
          return new Promise((resolve, reject) => {
            this.executor.push({
              this: this.persistence,
              fn: this.persistence.loadDatabase,
              arguments: [function(err, result) {
                if (err) return reject(err);
                resolve(result);
              }]
            }, true);
          });
        }
        /**
         * Get an array of all the data in the database
         */
        getAllData() {
          return this.indexes._id.getAll();
        }
        /**
         * Reset all currently defined indexes
         */
        resetIndexes(newData) {
          for (const key of Object.keys(this.indexes)) {
            this.indexes[key].reset(newData);
          }
        }
        /**
         * Ensure an index is kept for this field
         * @param {String} options.fieldName
         * @param {Boolean} options.unique
         * @param {Boolean} options.sparse
         * @param {Number} options.expireAfterSeconds
         * @param {Function} cb Optional callback, signature: err
         */
        ensureIndex(options, cb = () => {
        }) {
          options = options || {};
          if (!options.fieldName) {
            const err = new Error("Cannot create an index without a fieldName");
            err.missingFieldName = true;
            return cb(err);
          }
          if (this.indexes[options.fieldName]) {
            return cb(null);
          }
          this.indexes[options.fieldName] = new Index(options);
          if (options.expireAfterSeconds !== void 0) {
            this.ttlIndexes[options.fieldName] = options.expireAfterSeconds;
          }
          try {
            this.indexes[options.fieldName].insert(this.getAllData());
          } catch (e) {
            delete this.indexes[options.fieldName];
            return cb(e);
          }
          this.persistence.persistNewState([{ $$indexCreated: options }], (err) => {
            if (err) {
              return cb(err);
            }
            return cb(null);
          });
        }
        /**
         * Remove an index
         * @param {String} fieldName
         * @param {Function} cb Optional callback, signature: err
         */
        removeIndex(fieldName, cb = () => {
        }) {
          delete this.indexes[fieldName];
          this.persistence.persistNewState([{ $$indexRemoved: fieldName }], (err) => {
            if (err) {
              return cb(err);
            }
            return cb(null);
          });
        }
        /**
         * Add one or several document(s) to all indexes
         */
        addToIndexes(doc) {
          let failingIndex, error;
          const keys = Object.keys(this.indexes);
          for (let i = 0; i < keys.length; i++) {
            try {
              this.indexes[keys[i]].insert(doc);
            } catch (e) {
              failingIndex = i;
              error = e;
              break;
            }
          }
          if (error) {
            for (let i = 0; i < failingIndex; i++) {
              this.indexes[keys[i]].remove(doc);
            }
            throw error;
          }
        }
        /**
         * Remove one or several document(s) from all indexes
         */
        removeFromIndexes(doc) {
          for (const key of Object.keys(this.indexes)) {
            this.indexes[key].remove(doc);
          }
        }
        /**
         * Update one or several documents in all indexes
         */
        updateIndexes(oldDoc, newDoc) {
          let failingIndex, error;
          const keys = Object.keys(this.indexes);
          for (let i = 0; i < keys.length; i++) {
            try {
              this.indexes[keys[i]].update(oldDoc, newDoc);
            } catch (e) {
              failingIndex = i;
              error = e;
              break;
            }
          }
          if (error) {
            for (let i = 0; i < failingIndex; i++) {
              this.indexes[keys[i]].revertUpdate(oldDoc, newDoc);
            }
            throw error;
          }
        }
        /**
         * Return the list of candidates for a given query
         */
        getCandidates(query, dontExpireStaleDocs, callback) {
          if (typeof dontExpireStaleDocs === "function") {
            callback = dontExpireStaleDocs;
            dontExpireStaleDocs = false;
          }
          const indexNames = Object.keys(this.indexes);
          let docs;
          let usableQueryKeys = [];
          for (const k of Object.keys(query)) {
            if (typeof query[k] === "string" || typeof query[k] === "number" || typeof query[k] === "boolean" || query[k] instanceof Date || query[k] === null) {
              usableQueryKeys.push(k);
            }
          }
          usableQueryKeys = intersection(usableQueryKeys, indexNames);
          if (usableQueryKeys.length > 0) {
            docs = this.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]]);
          }
          if (!docs) {
            usableQueryKeys = [];
            for (const k of Object.keys(query)) {
              if (query[k]?.$in !== void 0) {
                usableQueryKeys.push(k);
              }
            }
            usableQueryKeys = intersection(usableQueryKeys, indexNames);
            if (usableQueryKeys.length > 0) {
              docs = this.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]].$in);
            }
          }
          if (!docs) {
            usableQueryKeys = [];
            for (const k of Object.keys(query)) {
              const qk = query[k];
              if (qk && (qk.$lt !== void 0 || qk.$lte !== void 0 || qk.$gt !== void 0 || qk.$gte !== void 0)) {
                usableQueryKeys.push(k);
              }
            }
            usableQueryKeys = intersection(usableQueryKeys, indexNames);
            if (usableQueryKeys.length > 0) {
              docs = this.indexes[usableQueryKeys[0]].getBetweenBounds(query[usableQueryKeys[0]]);
            }
          }
          if (!docs) {
            docs = this.getAllData();
          }
          if (dontExpireStaleDocs) {
            return callback(null, docs);
          }
          const expiredDocsIds = [];
          const validDocs = [];
          const ttlFieldNames = Object.keys(this.ttlIndexes);
          for (const doc of docs) {
            let valid = true;
            for (const fn of ttlFieldNames) {
              if (doc[fn] !== void 0 && doc[fn] instanceof Date && Date.now() > doc[fn].getTime() + this.ttlIndexes[fn] * 1e3) {
                valid = false;
              }
            }
            if (valid) {
              validDocs.push(doc);
            } else {
              expiredDocsIds.push(doc._id);
            }
          }
          const removeExpired = (ids, idx, done) => {
            if (idx >= ids.length) {
              return done(null);
            }
            this._remove({ _id: ids[idx] }, {}, (err) => {
              if (err) {
                return done(err);
              }
              removeExpired(ids, idx + 1, done);
            });
          };
          removeExpired(expiredDocsIds, 0, (err) => {
            if (err) {
              return callback(err);
            }
            return callback(null, validDocs);
          });
        }
        /**
         * Insert a new document
         * @api private
         */
        _insert(newDoc, cb = () => {
        }) {
          let preparedDoc;
          try {
            preparedDoc = this.prepareDocumentForInsertion(newDoc);
            this._insertInCache(preparedDoc);
          } catch (e) {
            return cb(e);
          }
          const docsToPersist = Array.isArray(preparedDoc) ? preparedDoc : [preparedDoc];
          this.persistence.persistNewState(docsToPersist, (err) => {
            if (err) {
              return cb(err);
            }
            return cb(null, model.deepCopy(preparedDoc));
          });
        }
        /**
         * Create a new _id that's not already in use
         */
        createNewId() {
          let tentativeId = customUtils.uid(16);
          if (this.indexes._id.getMatching(tentativeId).length > 0) {
            tentativeId = this.createNewId();
          }
          return tentativeId;
        }
        /**
         * Prepare a document for insertion
         * @api private
         */
        prepareDocumentForInsertion(newDoc) {
          if (Array.isArray(newDoc)) {
            return newDoc.map((doc) => this.prepareDocumentForInsertion(doc));
          }
          const preparedDoc = model.deepCopy(newDoc);
          if (preparedDoc._id === void 0) {
            preparedDoc._id = this.createNewId();
          }
          const now = /* @__PURE__ */ new Date();
          if (this.timestampData && preparedDoc.createdAt === void 0) {
            preparedDoc.createdAt = now;
          }
          if (this.timestampData && preparedDoc.updatedAt === void 0) {
            preparedDoc.updatedAt = now;
          }
          model.checkObject(preparedDoc);
          return preparedDoc;
        }
        /**
         * @api private
         */
        _insertInCache(preparedDoc) {
          if (Array.isArray(preparedDoc)) {
            this._insertMultipleDocsInCache(preparedDoc);
          } else {
            this.addToIndexes(preparedDoc);
          }
        }
        /**
         * @api private
         */
        _insertMultipleDocsInCache(preparedDocs) {
          let failingI, error;
          for (let i = 0; i < preparedDocs.length; i++) {
            try {
              this.addToIndexes(preparedDocs[i]);
            } catch (e) {
              error = e;
              failingI = i;
              break;
            }
          }
          if (error) {
            for (let i = 0; i < failingI; i++) {
              this.removeFromIndexes(preparedDocs[i]);
            }
            throw error;
          }
        }
        // --- Public API with Promise support ---
        insert(newDoc, cb) {
          if (cb) {
            this.executor.push({ this: this, fn: this._insert, arguments });
            return void 0;
          }
          return new Promise((resolve, reject) => {
            this.executor.push({
              this: this,
              fn: this._insert,
              arguments: [newDoc, function(err, result) {
                if (err) return reject(err);
                resolve(result);
              }]
            });
          });
        }
        /**
         * Count all documents matching the query
         */
        count(query, callback) {
          const cursor = new Cursor(this, query, (err, docs, cb) => {
            if (err) {
              return cb(err);
            }
            return cb(null, docs.length);
          });
          if (typeof callback === "function") {
            cursor.exec(callback);
            return void 0;
          }
          return cursor;
        }
        /**
         * Find all documents matching the query
         */
        find(query, projection, callback) {
          switch (arguments.length) {
            case 1:
              projection = {};
              break;
            case 2:
              if (typeof projection === "function") {
                callback = projection;
                projection = {};
              }
              break;
          }
          const cursor = new Cursor(this, query, (err, docs, cb) => {
            if (err) {
              return cb(err);
            }
            if (projection && Object.keys(projection).length > 0) {
              return cb(null, docs);
            }
            const res = docs.map((doc) => model.deepCopy(doc));
            return cb(null, res);
          });
          cursor.projection(projection);
          if (typeof callback === "function") {
            cursor.exec(callback);
            return void 0;
          }
          return cursor;
        }
        /**
         * Find one document matching the query
         */
        findOne(query, projection, callback) {
          switch (arguments.length) {
            case 1:
              projection = {};
              break;
            case 2:
              if (typeof projection === "function") {
                callback = projection;
                projection = {};
              }
              break;
          }
          const cursor = new Cursor(this, query, (err, docs, cb) => {
            if (err) {
              return cb(err);
            }
            if (docs.length === 1) {
              return cb(null, model.deepCopy(docs[0]));
            } else {
              return cb(null, null);
            }
          });
          cursor.projection(projection).limit(1);
          if (typeof callback === "function") {
            cursor.exec(callback);
            return void 0;
          }
          return cursor;
        }
        /**
         * Update all docs matching query
         * @api private
         */
        _update(query, updateQuery, options, cb) {
          let callback;
          const self2 = this;
          let numReplaced = 0, multi, upsert;
          if (typeof options === "function") {
            cb = options;
            options = {};
          }
          callback = cb || function() {
          };
          multi = options.multi ?? false;
          upsert = options.upsert ?? false;
          const doUpdate = () => {
            if (!upsert) {
              return performUpdate();
            }
            const cursor = new Cursor(self2, query);
            cursor.limit(1)._exec((err, docs) => {
              if (err) {
                return callback(err);
              }
              if (docs.length === 1) {
                return performUpdate();
              }
              let toBeInserted;
              try {
                model.checkObject(updateQuery);
                toBeInserted = updateQuery;
              } catch (e) {
                try {
                  toBeInserted = model.modify(model.deepCopy(query, true), updateQuery);
                } catch (err2) {
                  return callback(err2);
                }
              }
              return self2._insert(toBeInserted, (err2, newDoc) => {
                if (err2) {
                  return callback(err2);
                }
                return callback(null, 1, newDoc, true);
              });
            });
          };
          const performUpdate = () => {
            let modifiedDoc;
            const modifications = [];
            let createdAt;
            self2.getCandidates(query, (err, candidates) => {
              if (err) {
                return callback(err);
              }
              try {
                for (const candidate of candidates) {
                  if (model.match(candidate, query) && (multi || numReplaced === 0)) {
                    numReplaced += 1;
                    if (self2.timestampData) {
                      createdAt = candidate.createdAt;
                    }
                    modifiedDoc = model.modify(candidate, updateQuery);
                    if (self2.timestampData) {
                      modifiedDoc.createdAt = createdAt;
                      modifiedDoc.updatedAt = /* @__PURE__ */ new Date();
                    }
                    modifications.push({ oldDoc: candidate, newDoc: modifiedDoc });
                  }
                }
              } catch (err2) {
                return callback(err2);
              }
              try {
                self2.updateIndexes(modifications);
              } catch (err3) {
                return callback(err3);
              }
              const updatedDocs = modifications.map((m) => m.newDoc);
              self2.persistence.persistNewState(updatedDocs, (err2) => {
                if (err2) {
                  return callback(err2);
                }
                if (!options.returnUpdatedDocs) {
                  return callback(null, numReplaced);
                }
                const updatedDocsDC = updatedDocs.map((doc) => model.deepCopy(doc));
                if (!multi) {
                  return callback(null, numReplaced, updatedDocsDC[0]);
                }
                return callback(null, numReplaced, updatedDocsDC);
              });
            });
          };
          doUpdate();
        }
        update(query, updateQuery, options, cb) {
          if (typeof options === "function") {
            cb = options;
            options = {};
          }
          if (!options) {
            options = {};
          }
          if (cb) {
            this.executor.push({ this: this, fn: this._update, arguments: [query, updateQuery, options, cb] });
            return void 0;
          }
          return new Promise((resolve, reject) => {
            this.executor.push({
              this: this,
              fn: this._update,
              arguments: [query, updateQuery, options, function(err, numAffected, affectedDocuments, upsert) {
                if (err) return reject(err);
                resolve({ numAffected, affectedDocuments, upsert });
              }]
            });
          });
        }
        /**
         * Remove all docs matching query
         * @api private
         */
        _remove(query, options, cb) {
          let callback;
          const self2 = this;
          let numRemoved = 0;
          const removedDocs = [];
          let multi;
          if (typeof options === "function") {
            cb = options;
            options = {};
          }
          callback = cb || function() {
          };
          multi = options.multi ?? false;
          this.getCandidates(query, true, (err, candidates) => {
            if (err) {
              return callback(err);
            }
            try {
              for (const d of candidates) {
                if (model.match(d, query) && (multi || numRemoved === 0)) {
                  numRemoved += 1;
                  removedDocs.push({ $$deleted: true, _id: d._id });
                  self2.removeFromIndexes(d);
                }
              }
            } catch (err2) {
              return callback(err2);
            }
            self2.persistence.persistNewState(removedDocs, (err2) => {
              if (err2) {
                return callback(err2);
              }
              return callback(null, numRemoved);
            });
          });
        }
        remove(query, options, cb) {
          if (typeof options === "function") {
            cb = options;
            options = {};
          }
          if (!options) {
            options = {};
          }
          if (cb) {
            this.executor.push({ this: this, fn: this._remove, arguments: [query, options, cb] });
            return void 0;
          }
          return new Promise((resolve, reject) => {
            this.executor.push({
              this: this,
              fn: this._remove,
              arguments: [query, options, function(err, numRemoved) {
                if (err) return reject(err);
                resolve({ numRemoved });
              }]
            });
          });
        }
      };
      Object.assign(Datastore.prototype, streamMixins);
      module.exports = Datastore;
    }
  });
  return require_datastore();
})();
/*! Bundled license information:

localforage/dist/localforage.js:
  (*!
      localForage -- Offline Storage, Improved
      Version 1.10.0
      https://localforage.github.io/localForage
      (c) 2013-2017 Mozilla, Apache License 2.0
  *)
*/
