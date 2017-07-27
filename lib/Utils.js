"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function spliceOne(arr, index) {
    // manually splice availableRooms array
    // http://jsperf.com/manual-splice
    if (index >= arr.length) {
        return;
    }
    for (var i = index, len = arr.length - 1; i < len; i++) {
        arr[i] = arr[i + 1];
    }
    arr.length = len;
}
exports.spliceOne = spliceOne;
function merge(a, b) {
    for (var key in b) {
        if (b.hasOwnProperty(key)) {
            a[key] = b[key];
        }
    }
    return a;
}
exports.merge = merge;
function logError(err) {
    if (err) {
        console.log(err);
    }
}
exports.logError = logError;
//
// TODO: there is possibly room for improvement on this method
//
// You can see the impact of changes on this benchmark:
// `node --harmony test/benchmark/patch.js`
//
function toJSON(obj) {
    let result;
    if (obj && typeof (obj.toJSON) === "function") {
        result = obj.toJSON();
    }
    else if (obj instanceof Array) {
        result = obj.map((_) => toJSON(_));
    }
    else {
        result = obj;
    }
    if (result && typeof (result) === "object") {
        let copy = Array.isArray(result) ? [] : {};
        for (var k in result) {
            if (typeof (result[k]) !== "function") {
                copy[k] = toJSON(result[k]);
            }
        }
        result = copy;
    }
    return result;
}
exports.toJSON = toJSON;
