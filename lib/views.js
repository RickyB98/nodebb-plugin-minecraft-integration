"use strict";

var NodeBB = require('./nodebb'),
	Config = require('./config'),
	fs = require('fs'),
	path = require('path'),
	async = require('async'),
	Views = { };

Views.getWidgets = function (widgets, next) {
	var _widgets = [
		{
			widget: "widgetMCDynmapMiniMap",
			name: "Dynmap Mini Map",
			description: "Shows a small Map.",
			content: 'admin/adminWidgetMCDynmapMiniMap.tpl'
		},
		{
			widget: "widgetMCOnlinePlayersGraph",
			name: "Minecraft Online Players Graph",
			description: "Shows a graph showing online players over time.",
			content: 'admin/adminWidgetMCOnlinePlayersGraph.tpl'
		},
		{
			widget: "widgetMCOnlinePlayersGrid",
			name: "Minecraft Online Players Grid",
			description: "Shows the avatars of online players.",
			content: 'admin/adminWidgetMCOnlinePlayersGrid.tpl'
		},
		{
			widget: "widgetMCServerStatus",
			name: "Minecraft Server Status",
			description: "Lists information on a Minecraft server.",
			content: 'admin/adminWidgetMCServerStatus.tpl'
		},
		{
			widget: "widgetMCTopPlayersGraph",
			name: "Minecraft Top Players Graph",
			description: "A graphic chart (Pie, Donut, or Bar) representing the top players' approximate play time.",
			content: 'admin/adminWidgetMCTopPlayersGraph.tpl'
		},
		{
			widget: "widgetMCTopPlayersList",
			name: "Minecraft Top Players List",
			description: "Lists avatars of players sorted by their approximate play time.",
			content: 'admin/adminWidgetMCTopPlayersList.tpl'
		}
	];

	async.each(_widgets, function (widget, next) {
		NodeBB.app.render(widget.content, {servers: Config.getServers()}, function (err, content) {
			widget.content = content;
			next();
		});
	}, function (err) {
		widgets = widgets.concat(_widgets);
		next(null, widgets);
	});
};

module.exports = Views;