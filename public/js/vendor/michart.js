define(['./d3.min.js'], function(d3){
	var defaultParams = {
		margin: {top: 0.05, right: 0.05, bottom: 0.05, left: 0.05},
		getValueX: function(d){ return d.timestamp; },
		getValueY: function(d){ return d.tps; },
		minY: 5,
		bufferY: 1,
		maxY: 33,
		type: 'line',
		data: {},
		el: null
	};

	// Chart Object
	function miChart(params, cb) {
		var self = this;
		params = params || {};

		for (var p in defaultParams) { self[p] = params[p] || defaultParams[p] }

		// Conventional padding hack.
		self.el.css("padding-bottom", self.el.data('ratio')*100 + "%");

		make[self.type](self);
	}

	var make = {
		line: lineChart,
		bar: barChart,
		pie: pieChart
	}

	function lineChart(self) {
		self.useConventionalMargins(self);
		self.buildSVG(self);
		self.buildScales();
		self.buildAxis();
		self.drawLine();
		self.drawAxis();

		self.el.find('.axis').css('font-size', self.el.width()/28);
	}

	function barChart(self) {
		self.useConventionalMargins(self);
		self.buildSVG(self);
		self.buildScales();
		self.drawBars();

		self.el.find('.axis').css('font-size', self.el.width()/28);

		self.el.find('.bar').tooltip({
			container: 'body',
			html: true,
			template: '<div class="tooltip michart" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
		});
	}

	function pieChart(self) {
		self.useNoMargins(self);
		self.buildSVG(self);
		self.drawPie(self);

		self.el.find('.arc path').tooltip({
			container: 'body',
			html: true,
			template: '<div class="tooltip michart" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
		});
	}

	miChart.prototype.resize = function(){
		// TODO: Resize components based on new resolution when appropriate.
		return;
	};

	miChart.prototype.marginLeft   = function(){return (this.el.width())*(this.margin.left);};
	miChart.prototype.marginRight  = function(){return (this.el.width())*(this.margin.right);};
	miChart.prototype.marginTop    = function(){console.log(this.margin);return (this.el.width()*this.el.data('ratio'))*(this.margin.top);};
	miChart.prototype.marginBottom = function(){return (this.el.width()*this.el.data('ratio'))*(this.margin.bottom);};

	miChart.prototype.useConventionalMargins = function(self){
		self.width  = (self.el.width())      - self.marginLeft() - self.marginRight();
		self.height = (self.el.width()*self.el.data('ratio')) - self.marginTop() - self.marginBottom();
	};

	miChart.prototype.useNoMargins = function(self){
		self.width  = self.el.width();
		self.height = self.el.width() * self.el.data('ratio');
		self.margin = {left: 0, right: 0, top: 0, bottom: 0};
	};

	miChart.prototype.buildSVG = function(self){
		// Adds the svg canvas
		self.wrapper = d3.select(self.el[0]).classed("michart-container", true).append("svg").classed("michart-content", true);
		self.svg = self.wrapper.append("g");

		self.wrapper
			.attr("preserveAspectRatio", "xMinYMin meet")
			.attr("viewBox", "0 0 " + self.el.width() + " " + (self.el.width()*self.el.data('ratio')));

		self.svg.attr("transform", "translate(" + self.marginLeft() + "," + self.marginTop() + ")");
	};

	miChart.prototype.sizeSVG = function(){
		var self = this;
	};

	miChart.prototype.buildScales = function(){
		var self = this;

		// Create Scales.
		self.xScale = d3.time.scale().range([0, self.width]);
		self.yScale = d3.scale.linear().range([self.height, 0]);

		// Scale the range of the data.
		self.xScale.domain(d3.extent(self.data, self.getValueX));
		self.yScale.domain([0, Math.min(self.maxY, Math.max(d3.max(self.data, self.getValueY) + self.bufferY, self.minY))]);
	};

	miChart.prototype.buildAxis = function(){
		var self = this;

		self.xAxis = d3.svg.axis().scale(self.xScale).orient("bottom").ticks(0);
		self.yAxis = d3.svg.axis().scale(self.yScale).orient("left").ticks(0);
	};

	miChart.prototype.drawLine = function(){
		var self = this;

		// Define the line
		var valueline = d3.svg.line()
			.x(function(d) { return self.xScale(self.getValueX(d)); })
			.y(function(d) { return self.yScale(self.getValueY(d)); });

		var line = self.line = valueline(self.data);

		self.svg.append("path")
			.attr("class", "line")
			.attr("d", line);
	};

	miChart.prototype.drawBars = function(){
		var self = this;

		self.svg.selectAll(".bar")
			.data(self.data)
			.enter().append("rect")
			.attr("class", "bar")
			.attr("x", function(d, i) { return i * (self.width / self.data.length); })
			.attr("width", (self.width - self.marginRight()) / self.data.length)
			.attr("y", function(d) { return self.yScale(self.getValueY(d)); })
			.attr("height", function(d) { return self.height - self.yScale(self.getValueY(d)); })
			.attr("data-toggle", "tooltip")
			.attr("data-placement", "top")
			.attr("title", function(d, i) {
				var players = self.getValueY(d);
				var content = "<b>" + players + " Player" + (players === 1 ? '' : 's') + " Online</b><hr>";
				for (var p in d.players) {
					content += '<img src="' + config.relative_path + '/api/minecraft-integration/avatar/' + d.players[p].name + '/32" width="32" height="32" />';
				}
				return content;
			});
	};

	// TEMP
	var color = d3.scale.ordinal().range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00","#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00","#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

	miChart.prototype.drawPie = function(self){
		var g = self.svg.selectAll(".arc")
			.data(d3.layout.pie().sort(null).value(self.getValueY)(self.data))
			.enter().append("g")
			.attr("class", "arc");

		g.append("path")
			.attr("d", d3.svg.arc().outerRadius(Math.min(self.width, self.height) / 2 - 10).innerRadius(0))
			.style("fill", function(d, i) { return color(i); })
			.attr("data-toggle", "tooltip")
			.attr("data-placement", "top")
			.attr("title", function(d, i) {
				var content = '<b>' + d.data.name + '</b><br><img src="' + config.relative_path + '/api/minecraft-integration/avatar/' + d.data.name + '/32" width="32" height="32" /><br>' + d.data.playtime;
				return content;
			});

		self.svg.attr("transform", "translate(" + self.width/2 + "," + self.height/2 + ")");
	}

	miChart.prototype.drawAxis = function(){
		var self = this;

		// Add the X Axis
		self.svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + self.height + ")")
			.call(self.xAxis);

		// Add the Y Axis
		self.svg.append("g")
			.attr("class", "y axis")
			.attr("transform", "translate(0,0)")
			.call(self.yAxis);
	};

	window.miChart = miChart;

	return miChart;
});
