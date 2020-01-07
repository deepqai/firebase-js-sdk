/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { assert, stringify } from '@firebase/util';
import { MIN_NAME, MAX_NAME } from '../util/util';
import { KEY_INDEX } from '../snap/indexes/KeyIndex';
import { PRIORITY_INDEX } from '../snap/indexes/PriorityIndex';
import { VALUE_INDEX } from '../snap/indexes/ValueIndex';
import { PathIndex } from '../snap/indexes/PathIndex';
import { IndexedFilter } from './filter/IndexedFilter';
import { LimitedFilter } from './filter/LimitedFilter';
import { RangedFilter } from './filter/RangedFilter';
import { NodeFilter } from './filter/NodeFilter';
import { Index } from '../snap/indexes/Index';

/**
 * This class is an immutable-from-the-public-api struct containing a set of query parameters defining a
 * range to be returned for a particular location. It is assumed that validation of parameters is done at the
 * user-facing API level, so it is not done here.
 * @constructor
 */
export class QueryParams {
  private limitSet_ = false;
  private startSet_ = false;
  private startNameSet_ = false;
  private endSet_ = false;
  private endNameSet_ = false;
  private findSet_ = false;
  private aggregateSet_ = false;

  private limit_ = 0;
  private viewFrom_ = '';
  private indexStartValue_: unknown | null = null;
  private indexStartName_ = '';
  private indexEndValue_: unknown | null = null;
  private indexEndName_ = '';
  private findFilter_: unknown | null = null;
  private findOption_: unknown | null = null;
  private aggregatePipeline_: unknown | null = null;

  private index_ = PRIORITY_INDEX;

  /**
   * Wire Protocol Constants
   * @const
   * @enum {string}
   * @private
   */
  private static readonly WIRE_PROTOCOL_CONSTANTS_ = {
    INDEX_START_VALUE: 'sp',
    INDEX_START_NAME: 'sn',
    INDEX_END_VALUE: 'ep',
    INDEX_END_NAME: 'en',
    LIMIT: 'l',
    VIEW_FROM: 'vf',
    VIEW_FROM_LEFT: 'l',
    VIEW_FROM_RIGHT: 'r',
    INDEX: 'i',
    FIND_FILTER: 'f',
    FIND_OPTION: 'p',
    AGGREGATE_PIPELINE: 'a'
  };

  /**
   * REST Query Constants
   * @const
   * @enum {string}
   * @private
   */
  private static readonly REST_QUERY_CONSTANTS_ = {
    ORDER_BY: 'orderBy',
    PRIORITY_INDEX: '$priority',
    VALUE_INDEX: '$value',
    KEY_INDEX: '$key',
    START_AT: 'startAt',
    END_AT: 'endAt',
    LIMIT_TO_FIRST: 'limitToFirst',
    LIMIT_TO_LAST: 'limitToLast'
  };

  /**
   * Default, empty query parameters
   * @type {!QueryParams}
   * @const
   */
  static readonly DEFAULT = new QueryParams();

  /**
   * @return {boolean}
   */
  hasStart(): boolean {
    return this.startSet_;
  }

  /**
   * @return {boolean} True if it would return from left.
   */
  isViewFromLeft(): boolean {
    if (this.viewFrom_ === '') {
      // limit(), rather than limitToFirst or limitToLast was called.
      // This means that only one of startSet_ and endSet_ is true. Use them
      // to calculate which side of the view to anchor to. If neither is set,
      // anchor to the end.
      return this.startSet_;
    } else {
      return (
        this.viewFrom_ === QueryParams.WIRE_PROTOCOL_CONSTANTS_.VIEW_FROM_LEFT
      );
    }
  }

  /**
   * Only valid to call if hasStart() returns true
   * @return {*}
   */
  getIndexStartValue(): unknown {
    assert(this.startSet_, 'Only valid if start has been set');
    return this.indexStartValue_;
  }

  /**
   * Only valid to call if hasStart() returns true.
   * Returns the starting key name for the range defined by these query parameters
   * @return {!string}
   */
  getIndexStartName(): string {
    assert(this.startSet_, 'Only valid if start has been set');
    if (this.startNameSet_) {
      return this.indexStartName_;
    } else {
      return MIN_NAME;
    }
  }

  /**
   * @return {boolean}
   */
  hasEnd(): boolean {
    return this.endSet_;
  }

  /**
   * @return {boolean}
   */
  hasMongo(): boolean {
    return this.findSet_ || this.aggregateSet_;
  }

  /**
   * Only valid to call if hasEnd() returns true.
   * @return {*}
   */
  getIndexEndValue(): unknown {
    assert(this.endSet_, 'Only valid if end has been set');
    return this.indexEndValue_;
  }

  /**
   * Only valid to call if hasEnd() returns true.
   * Returns the end key name for the range defined by these query parameters
   * @return {!string}
   */
  getIndexEndName(): string {
    assert(this.endSet_, 'Only valid if end has been set');
    if (this.endNameSet_) {
      return this.indexEndName_;
    } else {
      return MAX_NAME;
    }
  }

  /**
   * @return {boolean}
   */
  hasLimit(): boolean {
    return this.limitSet_;
  }

  /**
   * @return {boolean} True if a limit has been set and it has been explicitly anchored
   */
  hasAnchoredLimit(): boolean {
    return this.limitSet_ && this.viewFrom_ !== '';
  }

  /**
   * Only valid to call if hasLimit() returns true
   * @return {!number}
   */
  getLimit(): number {
    assert(this.limitSet_, 'Only valid if limit has been set');
    return this.limit_;
  }

  /**
   * @return {!Index}
   */
  getIndex(): Index {
    return this.index_;
  }

  /**
   * @return {!QueryParams}
   * @private
   */
  private copy_(): QueryParams {
    const copy = new QueryParams();
    copy.limitSet_ = this.limitSet_;
    copy.limit_ = this.limit_;
    copy.startSet_ = this.startSet_;
    copy.indexStartValue_ = this.indexStartValue_;
    copy.startNameSet_ = this.startNameSet_;
    copy.findSet_ = this.findSet_;
    copy.indexStartName_ = this.indexStartName_;
    copy.endSet_ = this.endSet_;
    copy.indexEndValue_ = this.indexEndValue_;
    copy.endNameSet_ = this.endNameSet_;
    copy.indexEndName_ = this.indexEndName_;
    copy.index_ = this.index_;
    copy.viewFrom_ = this.viewFrom_;
    copy.findFilter_ = this.findFilter_;
    copy.findOption_ = this.findOption_;
    copy.aggregatePipeline_ = this.aggregatePipeline_;
    return copy;
  }

  /**
   *
   * @param filter
   * @param option
   */
  find(filter: unknown, option?: unknown): QueryParams {
    const newParams = this.copy_();
    if (filter === undefined) {
      filter = null;
    }
    if (option === undefined) {
      option = null;
    }

    newParams.findSet_ = true;
    newParams.findFilter_ = filter;
    newParams.findOption_ = option;
    return newParams;
  }

  /**
   *
   * @param pipeline
   */
  aggregate(pipeline: unknown): QueryParams {
    const newParams = this.copy_();
    if (pipeline === undefined) {
      pipeline = null;
    }

    newParams.aggregateSet_ = true;
    newParams.aggregatePipeline_ = pipeline;
    return newParams;
  }

  /**
   * @param {!number} newLimit
   * @return {!QueryParams}
   */
  limit(newLimit: number): QueryParams {
    const newParams = this.copy_();
    newParams.limitSet_ = true;
    newParams.limit_ = newLimit;
    newParams.viewFrom_ = '';
    return newParams;
  }

  /**
   * @param {!number} newLimit
   * @return {!QueryParams}
   */
  limitToFirst(newLimit: number): QueryParams {
    const newParams = this.copy_();
    newParams.limitSet_ = true;
    newParams.limit_ = newLimit;
    newParams.viewFrom_ = QueryParams.WIRE_PROTOCOL_CONSTANTS_.VIEW_FROM_LEFT;
    return newParams;
  }

  /**
   * @param {!number} newLimit
   * @return {!QueryParams}
   */
  limitToLast(newLimit: number): QueryParams {
    const newParams = this.copy_();
    newParams.limitSet_ = true;
    newParams.limit_ = newLimit;
    newParams.viewFrom_ = QueryParams.WIRE_PROTOCOL_CONSTANTS_.VIEW_FROM_RIGHT;
    return newParams;
  }

  /**
   * @param {*} indexValue
   * @param {?string=} key
   * @return {!QueryParams}
   */
  startAt(indexValue: unknown, key?: string | null): QueryParams {
    const newParams = this.copy_();
    newParams.startSet_ = true;
    if (indexValue === undefined) {
      indexValue = null;
    }
    newParams.indexStartValue_ = indexValue;
    if (key != null) {
      newParams.startNameSet_ = true;
      newParams.indexStartName_ = key;
    } else {
      newParams.startNameSet_ = false;
      newParams.indexStartName_ = '';
    }
    return newParams;
  }

  /**
   * @param {*} indexValue
   * @param {?string=} key
   * @return {!QueryParams}
   */
  endAt(indexValue: unknown, key?: string | null): QueryParams {
    const newParams = this.copy_();
    newParams.endSet_ = true;
    if (indexValue === undefined) {
      indexValue = null;
    }
    newParams.indexEndValue_ = indexValue;
    if (key !== undefined) {
      newParams.endNameSet_ = true;
      newParams.indexEndName_ = key;
    } else {
      newParams.endNameSet_ = false;
      newParams.indexEndName_ = '';
    }
    return newParams;
  }

  /**
   * @param {!Index} index
   * @return {!QueryParams}
   */
  orderBy(index: Index): QueryParams {
    const newParams = this.copy_();
    newParams.index_ = index;
    return newParams;
  }

  /**
   * @return {!Object}
   */
  getMongoObject(): {} {
    const WIRE_PROTOCOL_CONSTANTS = QueryParams.WIRE_PROTOCOL_CONSTANTS_;
    const obj = {};
    if (this.findSet_) {
      obj[WIRE_PROTOCOL_CONSTANTS.FIND_FILTER] = this.findFilter_;
      obj[WIRE_PROTOCOL_CONSTANTS.FIND_OPTION] = this.findOption_;
    }
    if (this.aggregateSet_) {
      obj[WIRE_PROTOCOL_CONSTANTS.AGGREGATE_PIPELINE] = this.aggregatePipeline_;
    }
    return obj;
  }

  /**
   * @return {!Object}
   */
  getQueryObject(): {} {
    const WIRE_PROTOCOL_CONSTANTS = QueryParams.WIRE_PROTOCOL_CONSTANTS_;
    const obj: { [k: string]: unknown } = {};
    if (this.startSet_) {
      obj[WIRE_PROTOCOL_CONSTANTS.INDEX_START_VALUE] = this.indexStartValue_;
      if (this.startNameSet_) {
        obj[WIRE_PROTOCOL_CONSTANTS.INDEX_START_NAME] = this.indexStartName_;
      }
    }
    if (this.endSet_) {
      obj[WIRE_PROTOCOL_CONSTANTS.INDEX_END_VALUE] = this.indexEndValue_;
      if (this.endNameSet_) {
        obj[WIRE_PROTOCOL_CONSTANTS.INDEX_END_NAME] = this.indexEndName_;
      }
    }
    if (this.limitSet_) {
      obj[WIRE_PROTOCOL_CONSTANTS.LIMIT] = this.limit_;
      let viewFrom = this.viewFrom_;
      if (viewFrom === '') {
        if (this.isViewFromLeft()) {
          viewFrom = WIRE_PROTOCOL_CONSTANTS.VIEW_FROM_LEFT;
        } else {
          viewFrom = WIRE_PROTOCOL_CONSTANTS.VIEW_FROM_RIGHT;
        }
      }
      obj[WIRE_PROTOCOL_CONSTANTS.VIEW_FROM] = viewFrom;
    }
    // For now, priority index is the default, so we only specify if it's some other index
    if (this.index_ !== PRIORITY_INDEX) {
      obj[WIRE_PROTOCOL_CONSTANTS.INDEX] = this.index_.toString();
    }
    return obj;
  }

  /**
   * @return {boolean}
   */
  loadsAllData(): boolean {
    return (
      !(this.startSet_ || this.endSet_ || this.limitSet_) &&
      !this.findSet_ &&
      !this.aggregateSet_
    );
  }

  /**
   * @return {boolean}
   */
  isDefault(): boolean {
    return this.loadsAllData() && this.index_ === PRIORITY_INDEX;
  }

  /**
   * @return {!NodeFilter}
   */
  getNodeFilter(): NodeFilter {
    if (this.loadsAllData()) {
      return new IndexedFilter(this.getIndex());
    } else if (this.hasLimit()) {
      return new LimitedFilter(this);
    } else {
      return new RangedFilter(this);
    }
  }

  /**
   * Returns a set of REST query string parameters representing this query.
   *
   * @return {!Object.<string,*>} query string parameters
   */
  toRestQueryStringParameters(): { [k: string]: string | number } {
    const REST_CONSTANTS = QueryParams.REST_QUERY_CONSTANTS_;
    const qs: { [k: string]: string | number } = {};

    if (this.isDefault()) {
      return qs;
    }

    let orderBy;
    if (this.index_ === PRIORITY_INDEX) {
      orderBy = REST_CONSTANTS.PRIORITY_INDEX;
    } else if (this.index_ === VALUE_INDEX) {
      orderBy = REST_CONSTANTS.VALUE_INDEX;
    } else if (this.index_ === KEY_INDEX) {
      orderBy = REST_CONSTANTS.KEY_INDEX;
    } else {
      assert(this.index_ instanceof PathIndex, 'Unrecognized index type!');
      orderBy = this.index_.toString();
    }
    qs[REST_CONSTANTS.ORDER_BY] = stringify(orderBy);

    if (this.startSet_) {
      qs[REST_CONSTANTS.START_AT] = stringify(this.indexStartValue_);
      if (this.startNameSet_) {
        qs[REST_CONSTANTS.START_AT] += ',' + stringify(this.indexStartName_);
      }
    }

    if (this.endSet_) {
      qs[REST_CONSTANTS.END_AT] = stringify(this.indexEndValue_);
      if (this.endNameSet_) {
        qs[REST_CONSTANTS.END_AT] += ',' + stringify(this.indexEndName_);
      }
    }

    if (this.limitSet_) {
      if (this.isViewFromLeft()) {
        qs[REST_CONSTANTS.LIMIT_TO_FIRST] = this.limit_;
      } else {
        qs[REST_CONSTANTS.LIMIT_TO_LAST] = this.limit_;
      }
    }

    return qs;
  }
}
