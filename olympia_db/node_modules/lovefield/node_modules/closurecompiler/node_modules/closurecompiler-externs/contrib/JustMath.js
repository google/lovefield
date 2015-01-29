/*
 * Copyright 2012 The Closure Compiler Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Externs for JustMath.js.
 * @see https://github.com/dcodeIO/JustMath.js
 * @externs
 */

/**
 BEGIN_NODE_INCLUDE
 var JustMath = require('justmath');
 END_NODE_INCLUDE
 */

/**
 * @type {Object.<string,*>}
 */
var JustMath = {};

/**
 * @type {number}
 * @const
 */
JustMath.PI = Math.PI;

/**
 * @type {number}
 * @const
 */
JustMath.SQRT2 = Math.SQRT2;

/**
 * @type {number}
 * @const
 */
JustMath.SQRT1_2 = Math.SQRT1_2;

/**
 * @param {number} n
 * @return {number}
 * @nosideeffects
 */
JustMath.abs = function(n) {};

/**
 * @param {number} n
 * @param {number} m
 * @return {number}
 * @nosideeffects
 */
JustMath.min = function(n, m) {};

/**
 * @param {number} n
 * @param {number} m
 * @return {number}
 * @nosideeffects
 */
JustMath.max = function(n, m) {};

/**
 * @param {number} n
 * @return {number}
 * @nosideeffects
 */
JustMath.floor = function(n) {};

/**
 * @param {number} n
 * @return {number}
 * @nosideeffects
 */
JustMath.ceil = function(n) {};

/**
 * @param {number} n
 * @return {number}
 * @nosideeffects
 */
JustMath.round = function(n) {};

/**
 * @param {number} n
 * @return {number}
 * @nosideeffects
 */
JustMath.sqrt = function(n) {};

/**
 * @param {number} n
 * @return {number}
 * @nosideeffects
 */
JustMath.sq = function(n) {};

/**
 * @param {number} n
 * @param {number} p
 * @return {number}
 * @nosideeffects
 */
JustMath.pow = function(n, p) {};

/**
 * @param {number} a
 * @return {number}
 * @nosideeffects
 */
JustMath.sin = function(a) {};

/**
 * @param {number} a
 * @return {number}
 * @nosideeffects
 */
JustMath.cos = function(a) {};

/**
 * @param {number} a
 * @return {number}
 * @nosideeffects
 */
JustMath.tan = function(a) {};

/**
 * @param {number} a
 * @return {number}
 * @nosideeffects
 */
JustMath.cot = function(a) {};

/**
 * @param {number} n
 * @return {number}
 * @nosideeffects
 */
JustMath.asin = function(n) {};

/**
 * @param {number} n
 * @return {number}
 * @nosideeffects
 */
JustMath.acos = function(n) {};

/**
 * @param {number} n
 * @return {number}
 * @nosideeffects
 */
JustMath.atan = function(n) {};

/**
 * @param {number} y
 * @param {number} x
 * @return {number}
 * @nosideeffects
 */
JustMath.atan2 = function(y, x) {};

/**
 * @return {number}
 * @nosideeffects
 */
JustMath.random = function() {};

/**
 * @param {!JustMath.Vec2|number} vOrX
 * @param {number=} y
 * @constructor
 */
JustMath.Vec2 = function(vOrX, y) {};

/**
 * @return {!JustMath.Vec2}
 * @nosideeffects
 */
JustMath.Vec2.prototype.clone = function() {};

/**
 * @return {!JustMath.Vec2}
 * @nosideeffects
 */
JustMath.Vec2.prototype.copy = function() {};

/**
 * @return {number}
 * @nosideeffects
 */
JustMath.Vec2.prototype.getX = function() {};

/**
 * @return {number}
 * @nosideeffects
 */
JustMath.Vec2.prototype.getY = function() {};

/**
 * @return {{x: number, y: number}}
 * @nosideeffects
 */
JustMath.Vec2.prototype.getXY = function() {};

/**
 * @param {!JustMath.Vec2|number} vOrX
 * @param {number=} y
 * @return {!JustMath.Vec2}
 */
JustMath.Vec2.prototype.set = function(vOrX, y) {};

/**
 * @param {!JustMath.Vec2|number} vOrX
 * @param {number=} y
 * @return {!JustMath.Vec2}
 */
JustMath.Vec2.prototype.add = function(vOrX, y) {};

/**
 * @param {!JustMath.Vec2|number} vOrX
 * @param {number=} y
 * @return {!JustMath.Vec2}
 */
JustMath.Vec2.prototype.sub = function(vOrX, y) {};

/**
 * @return {!JustMath.Vec2}
 */
JustMath.Vec2.prototype.inv = function() {};

/**
 * @return {!JustMath.Vec2}
 */
JustMath.Vec2.prototype.ort = function() {};

/**
 * @param {number} factor
 * @return {!JustMath.Vec2}
 */
JustMath.Vec2.prototype.scale = function(factor) {};

/**
 * @param {!JustMath.Vec2} b
 * @return {number}
 */
JustMath.Vec2.prototype.dot = function(b) {};

/**
 * @return {!JustMath.Vec2}
 */
JustMath.Vec2.prototype.norm = function() {};

/**
 * @param {!JustMath.Vec2} b
 * @return {number}
 * @nosideeffects
 */
JustMath.Vec2.prototype.distSq = function(b) {};

/**
 * @param {!JustMath.Vec2} b
 * @return {number}
 * @nosideeffects
 */
JustMath.Vec2.prototype.dist = function(b) {};

/**
 * @return {number}
 * @nosideeffects
 */
JustMath.Vec2.prototype.dir = function() {};

/**
 * @return {number}
 * @nosideeffects
 */
JustMath.Vec2.prototype.magSq = function() {};

/**
 * @return {number}
 * @nosideeffects
 */
JustMath.Vec2.prototype.mag = function() {};

/**
 * @param {number} theta
 * @return {!JustMath.Vec2}
 */
JustMath.Vec2.prototype.rotate = function(theta) {};

/**
 * @param {!JustMath.Vec2} b
 * @return {!JustMath.Vec2}
 */
JustMath.Vec2.prototype.project = function(b) {};

/**
 * @param {!JustMath.Vec2} b
 * @return {!JustMath.Vec2}
 */
JustMath.Vec2.prototype.reject = function(b) {};

/**
 * @param {!JustMath.Vec2} n
 * @return {!JustMath.Vec2}
 */
JustMath.Vec2.prototype.reflect = function(n) {};

/**
 * @param {!JustMath.Vec2} n
 * @param {number} projectFactor
 * @param {number} rejectFactor
 * @return {!JustMath.Vec2}
 */
JustMath.Vec2.prototype.reflectAndScale = function(n, projectFactor, rejectFactor) {};

/**
 * @param {!JustMath.Vec2} p
 * @param {number} percent
 * @return {!JustMath.Vec2}
 */
JustMath.Vec2.prototype.lerp = function(p, percent) {};

/**
 * @param {!JustMath.Vec2} p1
 * @param {!JustMath.Vec2} p2
 * @return {boolean}
 * @nosideeffects
 */
JustMath.Vec2.prototype.inRect = function(p1, p2) {};

/**
 * @param {!JustMath.Vec2} b
 * @return {boolean}
 * @nosideeffects
 */
JustMath.Vec2.prototype.equals = function (b) {};

/**
 * @return {string}
 * @nosideeffects
 */
JustMath.Vec2.prototype.toString = function () {};

/**
 * @param {!JustMath.Vec2} v1
 * @param {!JustMath.Vec2} v2
 * @returns {number}
 * @nosideeffects
 */
JustMath.Vec2.det = function(v1, v2) {};
