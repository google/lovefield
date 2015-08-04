/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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
goog.provide('lf.Flags');


/**
 * Makes Lovefield to support in-memory DB only without data persistence.
 * @define {boolean} When set to true, in-memory DB will be created regardless
 *     storeType specified in connect options.
 */
lf.Flags.MEMORY_ONLY = false;


/**
 * Makes Lovefield to assume browser supports all ES6 features Lovefield uses.
 * @define {boolean} When set to true, Lovefield will not use any polyfills of
 *     ES6 features.
 */
lf.Flags.NATIVE_ES6 = false;
