/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



/**
 * @constructor
 *
 * @param {!Function} getXValueFn The function to use for extracting the x-axis
 *     value from a data point.
 * @param {!Function} getYValueFn The function to use for extracting the y-axis
 *     value from a data point.
 * @param {!Array<!Object>} focusInfoConfig Specifies what info to be displayed
 *     in the focus info banner.
 */
var GraphPlotter = function(getXValueFn, getYValueFn, focusInfoConfig) {
  var containerEl = document.getElementById('chart-container');
  var minWidth = 500;
  this.totalWidth = Math.max(minWidth, containerEl.scrollWidth - 100);
  this.totalHeight = 270;
  this.margin = {top: 0, right: 20, bottom: 30, left: 50};

  this.x_ = d3.time.scale().range([0, this.getWidth_()]);
  this.y_ = d3.scale.linear().range([this.getHeight_(), 0]);

  this.getXValue_ = getXValueFn;
  this.getYValue_ = getYValueFn;
  this.focusInfoConfig = focusInfoConfig;
  this.getScaledXValue_ = (function(d) {
    return this.x_(this.getXValue_(d));
  }.bind(this));
  this.getScaledYValue_ = (function(d) {
    return this.y_(this.getYValue_(d));
  }.bind(this));
};


/**
 * @return {number}
 * @private
 */
GraphPlotter.prototype.getWidth_ = function() {
  return this.totalWidth - this.margin.left - this.margin.right;
};


/**
 * @return {number}
 * @private
 */
GraphPlotter.prototype.getHeight_ = function() {
  return this.totalHeight - this.margin.top - this.margin.bottom;
};


/** @private */
GraphPlotter.prototype.clear_ = function() {
  var previousSvg = document.getElementById('chart');
  if (previousSvg != null) {
    previousSvg.remove();
  }
};


/**
 * Draws the graph.
 * @param {!Array<{x: !Date, y: number}>} data
 */
GraphPlotter.prototype.draw = function(data) {
  this.clear_();
  if (data.length == 0) {
    return;
  }

  this.x_.domain(d3.extent(data, this.getXValue_));
  // Extending the y-domain by 3% and 5% in each direction respectively (makes
  // the graph look nicer, by leaving some buffer between the min and max points
  // and the boundary of the drawing area.
  var yDomain = d3.extent(data, this.getYValue_);
  this.y_.domain([
    Math.floor(yDomain[0] * 0.97),
    Math.ceil(yDomain[1] * 1.05)
  ]);

  var svg = d3.select('#chart-container').
      append('svg').
      attr('id', 'chart').
      attr('width', this.totalWidth).
      attr('height', this.totalHeight).
      append('g').
      attr(
          'transform',
          'translate(' + this.margin.left + ',' + this.margin.top + ')');

  this.drawGrid_(svg);
  this.drawAxes_(svg);
  this.drawArea_(svg, data);
  this.drawCurve_(svg, data);
  this.drawDataPoints_(svg, data);
  this.drawMouseOverlay_(svg, data);
};


/**
 * @return {!d3.axisType}
 * @private
 */
GraphPlotter.prototype.createXAxis_ = function() {
  return d3.svg.axis().scale(this.x_).orient('bottom').ticks(5);
};


/**
 * @return {!d3.axisType}
 * @private
 */
GraphPlotter.prototype.createYAxis_ = function() {
  return d3.svg.axis().scale(this.y_).orient('left').ticks(5);
};


/**
 * Draws the background grid.
 * @param {!d3.selection} svg
 * @private
 */
GraphPlotter.prototype.drawGrid_ = function(svg) {
  svg.append('g').
      attr('class', 'grid').
      attr('transform', 'translate(0,' + this.getHeight_() + ')').
      call(this.createXAxis_().
          tickSize(-this.getHeight_(), 0, 0).
          tickFormat(''));
  svg.append('g').
      attr('class', 'grid').
      call(this.createYAxis_().
          tickSize(-this.getWidth_(), 0, 0).
          tickFormat(''));
};


/**
 * Draws the X and Y axes.
 * @param {!d3.selection} svg
 * @private
 */
GraphPlotter.prototype.drawAxes_ = function(svg) {
  // Draw the X Axis
  svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + this.getHeight_() + ')')
      .call(this.createXAxis_());

  // Draw the Y Axis
  svg.append('g')
      .attr('class', 'y axis')
      .call(this.createYAxis_());
};


/**
 * Draws the data curve.
 * @param {!d3.selection} svg
 * @param {!Array<!Object>} data
 * @private
 */
GraphPlotter.prototype.drawArea_ = function(svg, data) {
  var area = d3.svg.area().
      x(this.getScaledXValue_).
      y0(this.getHeight_()).
      y1(this.getScaledYValue_);

  // Add the filled area
  svg.append('path').
      datum(data).
      attr('class', 'area').
      attr('d', area);
};


/**
 * Draws the data curve.
 * @param {!d3.selection} svg
 * @param {!Array<!Object>} data
 * @private
 */
GraphPlotter.prototype.drawCurve_ = function(svg, data) {
  // Define the line
  var line = d3.svg.line().
      x(this.getScaledXValue_).
      y(this.getScaledYValue_);


  // Draw the data curve.
  svg.append('path').
      attr('class', 'line').
      attr('d', line(data));
};


/**
 * Draws the data points (just the points, not the curve).
 * @param {!d3.selection} svg
 * @param {!Array<!Object>} data
 * @private
 */
GraphPlotter.prototype.drawDataPoints_ = function(svg, data) {
  var dataPointsOverlay = svg.append('g').
      attr('class', 'data-points-overlay');
  data.forEach(function(d) {
    dataPointsOverlay.append('circle').
        attr('r', 2.0).
        attr(
            'transform',
            'translate(' + this.getScaledXValue_(d) + ',' +
                this.getScaledYValue_(d) + ')');
  }, this);
};


/**
 * Adds an ovrelay that is used for tracking mouse hovering and displaying the
 * y value at a given point in x.
 * @param {!d3.selection} svg
 * @param {!Array<!Object>} data
 * @private
 */
GraphPlotter.prototype.drawMouseOverlay_ = function(svg, data) {
  var focusOverlay = svg.append('g').
      attr('class', 'focus-overlay').
      style('display', 'none');

  focusOverlay.append('circle').
      attr('r', 4.0);

  focusOverlay.append('line').
      attr('id', 'verticalHighlightLine').
      attr('x1', 0).
      attr('x2', 0).
      attr('y1', this.y_(this.y_.domain()[0])).
      attr('y2', this.y_(this.y_.domain()[1]));

  focusOverlay.append('line').
      attr('id', 'horizontalHighlightLine').
      attr('x1', this.x_(this.x_.domain()[0])).
      attr('x2', this.x_(this.x_.domain()[1])).
      attr('y1', 0).
      attr('y2', 0);

  var focusInfo = new GraphPlotter.FocusInfo_(this, focusOverlay);

  svg.append('rect').
      attr('id', 'overlay').
      attr('width', this.getWidth_()).
      attr('height', this.getHeight_()).
      // Adding mouse events.
      on('mouseover', function() { focusOverlay.style('display', null); }).
      on('mouseout', function() { focusOverlay.style('display', 'none'); }).
      on('mousemove', onMousemove.bind(
          this, document.getElementById('overlay'))).

      // Adding touch events.
      on('touchstart', function() { focusOverlay.style('display', null); }).
      on('touchmove', onMousemove.bind(
          this, document.getElementById('overlay')));

  var bisectDate = d3.bisector(this.getXValue_).left;


  /**
   * @param {!HTMLElement} overlayElement
   * @this {!GraphPlotter}
   */
  function onMousemove(overlayElement) {
    var x0 = this.x_.invert(d3.mouse(overlayElement)[0]);
    var i = Math.min(bisectDate(data, x0, 1), data.length - 1);
    var d0 = data[i - 1];
    var d1 = data[i];
    var d = (x0 - this.getXValue_(d0).getTime() >
        this.getXValue_(d1).getTime() - x0) ? d1 : d0;
    focusOverlay.attr(
        'transform',
        'translate(' + this.getScaledXValue_(d) + ',' +
            this.getScaledYValue_(d) + ')');
    focusOverlay.select('#verticalHighlightLine').
        attr(
            'transform',
            'translate(' + 0 + ',' + (-this.getScaledYValue_(d)) + ')');
    focusOverlay.select('#horizontalHighlightLine').
        attr(
            'transform',
            'translate(' + (-this.getScaledXValue_(d)) + ',' + 0 + ')');
    focusInfo.onMouseMove(d);
  }
};



/**
 * A helper class for rendering extra information about the currently focused
 * point in the graph.
 * @constructor
 * @private
 *
 * @param {!GraphPlotter} graphPlotter The parent graph plotter.
 * @param {!d3.selection} container The element to place the focus information.
 */
GraphPlotter.FocusInfo_ = function(graphPlotter, container) {
  this.graphPlotter_ = graphPlotter;
  this.width_ = 220;
  this.height_ = 140;

  var rowNames = this.graphPlotter_.focusInfoConfig.map(
      function(configEntry) { return configEntry.label; });
  this.tableTemplateEl_ = this.generateTableTemplate_(rowNames);

  this.foreignObject_ = container.append('foreignObject').
      attr('width', this.width_).
      attr('height', this.height_).
      attr('x', 10).
      attr('y', 0);

  this.div_ = this.foreignObject_.append('xhtml:div').
      attr('class', 'focus-info').
      html('<span>An HTML Foreign object</span>');
};


/**
 * Populates the template table with data from the currently focused point.
 * @param {!Object} d The currently focused point.
 * @private
 */
GraphPlotter.FocusInfo_.prototype.populateTableTemplate_ = function(d) {
  var tableRows = Array.prototype.slice.call(
      this.tableTemplateEl_.getElementsByTagName('tr'));

  tableRows.forEach(function(tableRow, index) {
    var valueEl = tableRow.getElementsByTagName('td')[1];
    valueEl.textContent = this.graphPlotter_.focusInfoConfig[index].fn(d);
  }, this);
};


/**
 * Executes whenever a mouse move event is detected.
 * @param {!Object} d The currently focused point.
 */
GraphPlotter.FocusInfo_.prototype.onMouseMove = function(d) {
  this.populateTableTemplate_(d);
  this.div_.html(this.tableTemplateEl_.outerHTML);
  this.foreignObject_.
        attr(
            'transform',
            'translate(' + (-this.graphPlotter_.getScaledXValue_(d)) + ',' +
                (-this.graphPlotter_.getScaledYValue_(d)) + ')');
};


/**
 * Generates the HTML table element that is used for displaying additional
 * information.
 * @param {!Array<string>} rowNames The label of each row.
 * @return {!HTMLElement}
 * @private
 */
GraphPlotter.FocusInfo_.prototype.generateTableTemplate_ = function(rowNames) {
  var tableEl = document.createElement('table');
  var table = d3.select(tableEl);
  var tbody = table.append('tbody');

  rowNames.forEach(function(rowName) {
    var tr = tbody.append('tr');
    tr.append('td').
        attr('class', 'info-label').
        text(rowName);
    tr.append('td').
        attr('class', 'info-value');
  });

  return tableEl;
};
