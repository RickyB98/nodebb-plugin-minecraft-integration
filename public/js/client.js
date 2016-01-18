// Global
MinecraftIntegration = { templates: { } };

// TODO: This still needs a ton of work.
(function(){

	"use strict";

	console.log("Loading Minecraft Integration...");

	MinecraftIntegration.log = function (memo, object) {

		if (!(config.MinecraftIntegration && config.MinecraftIntegration.debug)) return;

		if (typeof memo === 'object') {
			console.dir(memo);
		}else{
			console.log("[Minecraft Integration] " + memo);
			if (object) console.dir(object);
		}
	};

	MinecraftIntegration.__MIDIR = "/plugins/nodebb-plugin-minecraft-integration/public/";

	// Vault Prefixes
	function addPrefix($el, prefix) {
		$el.find('.username>a').prepend('<span class="prefix">' + prefix + '</span><br>');
		$el.find('[itemprop="author"]').prepend('<span class="prefix">' + prefix + '</span>&nbsp&nbsp');
	}
	function addPrefixes(event, data) {

		if (ajaxify.data.prefixes) {

			$('[data-pid]:not([data-prefix])').each(function () {

				var $el = $(this), prefix = ajaxify.data.prefixes[$el.attr("data-uid")];

				$el.attr("data-prefix", "true");

				if (prefix) return addPrefix($el, prefix);
				if (prefix === null) return;

				socket.emit('plugins.MinecraftIntegration.getPrefix', {uid:$el.attr("data-uid")}, function (err, data) {
					if (data.prefix) addPrefix($el, data.prefix);
				});

			});
		}
	}
	$(window).on('action:posts.loaded',          addPrefixes);
	$(window).on('action:ajaxify.contentLoaded', addPrefixes);

	function getAvatarUrl(name) {
		return "/api/minecraft-integration/avatar/" + name + "/64";
	}

	MinecraftIntegration.getTemplate = function (template, callback) {
		if (MinecraftIntegration.templates[template]) {
			callback(null, MinecraftIntegration.templates[template]);
		}else{
			MinecraftIntegration.log("Getting template: " + template);
			$.get(MinecraftIntegration.__MIDIR + "templates/" + template + "?v=" + config['cache-buster'], function(data) {
				MinecraftIntegration.templates[template] = data;
				MinecraftIntegration.log("Got template: " + MinecraftIntegration.templates[template]);
				callback(null, data);
			});
		}
	};

	// When avatars change, render new effects.
	MinecraftIntegration.setAvatarBorders = function ($widget) {

		var	$avatars = $widget.find('.mi-avatar'),
			$scores  = $widget.find('.score');

		if ($avatars.length === 0) return;
		if ($widget.is(':not([data-colors="on"])')) return;

		var rainbow = getRainbow($widget, $avatars.length > 1 ? $avatars.length - 1 : $avatars.length);

		if (!rainbow) return;

		$avatars.each(function (i, el) {
			$(el).css('border-style', $widget.attr('data-border') || 'none');
			$(el).css('border-color', '#' + rainbow.colourAt(i));
		});

		$scores.each(function (i, el) {
			$(el).css('color', '#' + rainbow.colourAt(i));
		});

	};

	function getRainbow($widget, range) {

		if (!Rainbow) return null;

		var	rainbow = new Rainbow();

		var	colorStart = $widget.attr('data-color-start') || "white",
			colorEnd   = $widget.attr('data-color-end')   || "white";

		colorStart = colorStart.slice(0, 1) === '#' ? colorStart.slice(1) : colorStart;
		colorEnd   = colorEnd.slice(0, 1) === '#'   ? colorEnd.slice(1) : colorStart;

		rainbow.setNumberRange(0, range);
		rainbow.setSpectrum(colorStart, colorEnd);

		return rainbow;

	}

	// Wrap avatar in profile link if user is registered.
	function wrapAvatar($avatar) {
		if (!$avatar.parent().is('a')) {
			socket.emit('plugins.MinecraftIntegration.getRegisteredUser', {id: $avatar.data('uuid')}, function (err, userData) {
				if (!err && userData && userData.userslug) {
					$avatar.wrap('<a href="/user/' + userData.userslug + '"></a>');
				}else{
					$avatar.wrap('<a></a>');
				}
				$avatar.parent().click(function () {
					$('.tooltip').remove();
				});
			});
		}
	}

	// When a new status update is received, refresh widgets that track players.
	// TODO: This does too many things, separate into more functions based on each task.
	MinecraftIntegration.setPlayers = function (data) {

		if (!(data && data.sid !== void 0 && Array.isArray(data.players))) {
			MinecraftIntegration.log("Received invalid status data.");
			MinecraftIntegration.log(data);
			return;
		}

		MinecraftIntegration.getTemplate("partials/playerAvatars.tpl", function (err, avatarTemplate) {

			if (err) return MinecraftIntegration.log(err);
			if (!avatarTemplate) return MinecraftIntegration.log("Avatar Template was null.");

			// Loop widgets with a current players display.
			// TODO: Don't select widgets that have avatars turned off.
			$('[data-widget="mi-status"][data-sid="' + data.sid + '"], [data-widget="mi-players-grid"][data-sid="' + data.sid + '"]').each(function (i, $widget) {

				// Re-wrap
				$widget = $($widget);

				// Update Icon Time
				var	updateTime = data.updateTime || Date.now();
				$widget.find(".mc-statusicon")
					.attr('data-original-title', moment(parseInt(updateTime, 10)).format('MMM Do h:mma'))
					.attr('data-title', moment(parseInt(updateTime, 10)).format('MMM Do h:mma'));

				// Loop avatars and remove players no longer on the server.
				$widget.find('.mi-avatar').each(function (i, el) {

					// Re-wrap
					var $avatar = $(el);

					// If the player's online, return.
					for (var i in data.players) {
						if (data.players[i].id && data.players[i].name) {
							if ($avatar.data('uuid') === data.players[i].id) return;
							MinecraftIntegration.log("Kept " + data.players[i].name);
						}
					}

					// Otherwise, fade it out.
					MinecraftIntegration.log("Fading " + $avatar.attr('data-original-title'));
					if ($avatar.parent().is('a')) $avatar = $avatar.parent();
					$avatar.fadeToggle(600, 'linear', function () {
						$avatar.remove();
					});

				});

				// Track number of players left to add.
				var pendingPlayers = data.players.length;

				// Add players now on the server.
				data.players.forEach(function (player) {

					var found = false;

					$widget.find('.mi-avatar').each(function () {
						var $avatar = $(this);

						if ($avatar.data('uuid') === player.id) {
							found = true;
							MinecraftIntegration.log("Found " + player.name);
						}
					});

					if (!found) {

						var $avatar = $(avatarTemplate
						.replace("{url}", getAvatarUrl(player.name))
						.replace("{players.name}", player.name)
						.replace("{name}", player.name)
						.replace("{styleGlory}", "")
						.replace("{players.glory}", ""));

						$avatar.css("display", "none");
						$avatar.data('uuid', player.id);

						$avatar.appendTo($widget.find('.mi-avatars'));

						// Wrap avatar in profile link if user is registered.
						wrapAvatar($avatar);

						$avatar.load(function(){
							MinecraftIntegration.log("Fading in " + player.name);
							$avatar.fadeIn(600, 'linear');
							if (!--pendingPlayers) MinecraftIntegration.setAvatarBorders($widget);
						});
					}else{
						// Set avatar borders if complete.
						if (!--pendingPlayers) MinecraftIntegration.setAvatarBorders($widget);
					}

				});

				// Set player count text.
				$widget.find(".online-players").text(data.players.length);

				var $popover;

				if ($widget.attr('data-widget') === 'mi-status') {
					$popover = $widget.find('a.fa-plug');
					if ($popover.length && Array.isArray(data.pluginList) && data.pluginList.length) {
						var html = '<table class="table table-plugin-list"><tbody>';

						for (var i = 0; i < data.pluginList.length; i++) {
							html += '<tr><td>' + data.pluginList[i].name + '</td></tr>';
						}

						html += '</tbody></table>';
						$popover.attr('data-content', html);
						$popover.popover({
							container: 'body',
							viewport: { selector: 'body', padding: 20 },
							template: '<div class="popover plugin-list"><div class="arrow"></div><div class="popover-inner"><h1 class="popover-title"></h1><div class="popover-content"><p></p></div></div></div>'
						});
					}

					$popover = $widget.find('a.fa-gavel');
					if ($popover.length && data.modList) {
						var html = '<table class="table table-mod-list"><tbody>';

						for (var i in data.modList) {
							html += '<tr><td>' + data.modList[i].modid + '</td></tr>';
						}

						html += '</tbody></table>';
						$popover.attr('data-content', html);
						$popover.popover({
							container: 'body',
							viewport: { selector: 'body', padding: 20 },
							template: '<div class="popover mod-list"><div class="arrow"></div><div class="popover-inner"><h1 class="popover-title"></h1><div class="popover-content"><p></p></div></div></div>'
						});
					}
				}
			});

			$('[data-widget="mi-top-list"][data-sid="' + data.sid + '"]').each(function (i, $widget) {

				$widget = $($widget);

				var	$avatars = $widget.find('.mi-avatar'),
					pendingPlayers = $avatars.length;

				$avatars.each(function (i, $avatar) {

					$avatar = $($avatar);

					var id = $avatar.data('uuid');

					if (!id) return --pendingPlayers;

					socket.emit('plugins.MinecraftIntegration.getPlayer', {id: id}, function (err, playerData) {

						var playtime = parseInt(playerData.playtime, 10);
						if (playtime > 60) {
							playtime = Math.floor(playtime / 60).toString() + " Hours, " + (playtime % 60).toString();
						}
						$avatar.closest('tr').find('.mi-score').html(playtime);

						if (!--pendingPlayers) MinecraftIntegration.setAvatarBorders($widget);

					});

					wrapAvatar($avatar);

				});

			});
		});
	};

	MinecraftIntegration.addPlayer = function (data) {

		var player = data.player;

		MinecraftIntegration.getTemplate("partials/playerAvatars.tpl", function (err, avatarTemplate) {

			// Asserts
			if (err) return MinecraftIntegration.log(err);
			if (!avatarTemplate) return MinecraftIntegration.log("Avatar Template was null.");

			// Loop widgets with a current players display.
			// TODO: Don't select widgets that have avatars turned off.
			$('[data-widget="mi-status"][data-sid="' + data.sid + '"], [data-widget="mi-players-grid"][data-sid="' + data.sid + '"]').each(function (i, $widget) {

				var $widget = $(this);

				// Add the player only if they are not already listed.
				var found = false;
				$widget.find('.mi-avatar').each(function(){
					if ($(this).data('uuid') === player.id) return found = true;
				});
				if (found) return;

				var $avatar = $(avatarTemplate
				.replace("{url}", getAvatarUrl(player.name))
				.replace("{players.name}", player.name)
				.replace("{name}", player.name)
				.replace("{styleGlory}", "")
				.replace("{players.glory}", ""));

				$avatar.css("display", "none");
				$avatar.data('uuid', player.id);

				$avatar.appendTo($widget.find('.mi-avatars'));

				// Wrap avatar in profile link if user is registered.
				wrapAvatar($avatar);

				$avatar.load(function(){

					$avatar.fadeIn(600, 'linear');
					MinecraftIntegration.setAvatarBorders($widget);

					// Update player count.
					$widget.find(".online-players").text(parseInt($widget.find(".online-players").text(), 10) + 1);

				});

			});

		});
	};

	MinecraftIntegration.removePlayer = function (data) {
		$('[data-sid="' + data.sid + '"]').each(function (i, el) {
			var $widget = $(el);

			switch ($widget.attr('data-widget')) {
				case 'mi-status':
				case 'mi-players-grid':

					// Remove players no longer on the server.
					$widget.find('.mi-avatar').each(function (i, el) {
						var $avatar = $(el);

						if ($avatar.data('uuid') !== data.player.id) return;

						if ($avatar.parent().is('a')) $avatar = $avatar.parent();
						$avatar.fadeToggle(600, 'linear', function () {
							$avatar.remove();
							MinecraftIntegration.setAvatarBorders($widget);
						});
					});

					$widget.find(".online-players").text(parseInt($widget.find(".online-players").text(), 10) - 1);

					$('.tooltip').remove();
				break;
			}
		});
	};

	socket.on('mi.PlayerJoin', function (data) {
		MinecraftIntegration.addPlayer(data);
		MinecraftIntegration.updateCharts(data);
	});

	socket.on('mi.PlayerQuit', function (data) {
		MinecraftIntegration.removePlayer(data);
		MinecraftIntegration.updateCharts(data);
	});

	socket.on('mi.status', function (data) {

		MinecraftIntegration.log("Received Status Ping", data);

		MinecraftIntegration.setPlayers(data);
		MinecraftIntegration.setGraphs(data);

		var $widget = $('[data-sid="' + data.sid + '"]');

		if (parseInt(data.isServerOnline, 10)) {
			$widget.find(".mc-statusicon")
			.addClass("fa-check-circle")
			.addClass("text-success")
			.removeClass("fa-exclamation-circle")
			.removeClass("text-danger");
			$widget.find(".mc-statustext")
			.addClass("text-success")
			.removeClass("text-danger")
			.text("Online");
			$widget.find(".mc-playercount").show();
		}else{
			$widget.find(".mc-statusicon")
			.removeClass("fa-check-circle")
			.removeClass("text-success")
			.addClass("fa-exclamation-circle")
			.addClass("text-danger");
			$widget.find(".mc-statustext")
			.removeClass("text-success")
			.addClass("text-danger")
			.text("Offline");
			$widget.find(".mc-playercount").hide();
		}
	});

	socket.on('mi.PlayerChat', function (data) {
		$('[data-widget="mi-chat"][data-sid="' + data.sid + '"]').each(function (i, $widget) {
			$widget = $($widget);

			$widget.find('div').append("<span>" + data.chat.name + ": " + data.chat.message + "</span><br>");
			$widget.find('div').scrollTop(100000);
		});
	});

	function onPlayerVotes(data)
	{
		MinecraftIntegration.log(data);
	}

	socket.on('mi.PlayerVotes', onPlayerVotes);

	define('admin/plugins/minecraft-integration', function () {
		MinecraftIntegration.init = function () {
			require([MinecraftIntegration.__MIDIR + 'js/acp.js'], function (miACP) {
				miACP.load();
			});
		};

		return MinecraftIntegration;
	});

	$(document).ready(function() {
		var $body = $('body');
		$body.tooltip({
			selector: '.has-tooltip, .mi-avatar',
			container: 'body',
			viewport: { selector: 'body', padding: 20 }
		});
	});

	var rtime = new Date();
	var timeout = false;
	var delta = 300;
	$(window).resize(function() {
		rtime = new Date();
		if (timeout === false) {
			timeout = true;
			setTimeout(resizeend, delta);
		}
	});

	function resizeend() {
		if (new Date() - rtime < delta) {
			setTimeout(resizeend, delta);
		} else {
			timeout = false;
			resizeCanvases();
		}
	}

	function resizeCanvases()
	{
		$('.mi-chart').each(function()
		{
			var	$this   = $(this)
			,	chart   = $this.data('chart')
			,	data    = $this.data('chart-data')
			,	options = $this.data('chart-options');

			if (!chart) return;

			chart.draw(data, options);
		});
	}

	MinecraftIntegration.updateCharts = function (status) {
	};

	// Setup charts
	MinecraftIntegration.setGraphs = function (status) {

		if (!window.google)
		{
			// Require google charts.
			require(['https://www.google.com/jsapi'], function ()
			{
				// Load the Visualization API and the piechart package.
				google.load('visualization', '1.0', {'callback':'console.log();','packages':['corechart']});
				google.setOnLoadCallback(function(){
					setGraphs(status);
				});
			});
		}
		else
		{
			setGraphs(status);
		}
	};

	// Do initial setup.
	$(window).on('action:widgets.loaded', function (event) {

		// Requires
		require([MinecraftIntegration.__MIDIR + 'js/vendor/rainbowvis.js'], function () {

			// Find servers to be setup.
			var sids = [ ];

			// Loop through widget containers.
			$('.mi-container').each(function(){

				var	$this = $(this),
					$parent = $this.parent(),
					sid = $this.attr('data-sid');

				// Add paddings based on container.
				if (!$parent.is('[widget-area]')) {
					$parent.css('padding-top', '0').css('padding-left', '0').css('padding-right', '0').css('padding-bottom', '0');
				}else{
					$parent.css('padding-top', '10px').css('padding-bottom', '10px');
				}

				// If not in server list, add it.
				if (!~sids.indexOf(sid)) sids.push(sid);

			});

			// ???
			resizeCanvases();

			sids.forEach(function (sid) {

				socket.emit('plugins.MinecraftIntegration.getServerStatus', {sid: sid}, function (err, status) {
					if (err || !status) return MinecraftIntegration.log("No Status");
					MinecraftIntegration.log("Got initial status", status);
					MinecraftIntegration.setPlayers(status);
					MinecraftIntegration.setGraphs(status);
				});

				var widgetsChat = $('[data-widget="mi-chat"][data-sid="' + sid + '"]');

				if (widgetsChat.length) {
					socket.emit('plugins.MinecraftIntegration.getChat', {sid: sid}, function (err, data) {
						widgetsChat.each(function (i, $chatwidget) {
							$chatwidget = $($chatwidget);
							var $chatbox    = $chatwidget.find('div');

							for (var i in data.chats) {
								$chatbox.append("<span>" + data.chats[i].name + ": " + data.chats[i].message + "</span><br>");
							}

							$chatwidget.find('button').click(function (e) {

								if (app.user.uid === 0) return;

								var $this = $(this);

								var chatData = {
									sid: $chatwidget.attr('data-sid'),
									name: app.user.username,
									message: $this.parent().prev().children('input').val()
								};

								socket.emit('plugins.MinecraftIntegration.eventWebChat', chatData);

								MinecraftIntegration.log("Sending chat: ", chatData);
								$this.parent().prev().children('input').val('');

							});

							$chatwidget.find('input').keyup(function(e){
								if (app.user.uid === 0) return;
								if(e.keyCode == 13)
								{
									var $this = $(this);

									socket.emit('plugins.MinecraftIntegration.eventWebChat', {sid: $chatwidget.attr('data-sid'), name: app.user.username, message: $this.val()});
									$this.val('');
								}
							});

							$chatbox.scrollTop(100000);
						});
					});
				}
			});

			resizeCanvases();

		});

		require(['https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/1.5.5/clipboard.min.js'], function (Clipboard)
		{
			var	clipboard = new Clipboard('.mi-serveraddresscopy');

			$('.mi-serveraddresscopy')
				.mouseout(function () {
					$(this).tooltip('destroy');
					$(this).removeClass('mi-highlight');
					$(this).prev().removeClass('mi-highlight');
				})
				.mouseenter(function () {
					$(this).addClass('mi-highlight');
					$(this).prev().addClass('mi-highlight');
				})
				.removeClass('hide');

			clipboard.on('success', function(e) {
				e.clearSelection();
				$(e.trigger).tooltip({title:'Copied!',placement:'bottom'});
				$(e.trigger).tooltip('show');
			});
		});
	});

	$(window).on('action:ajaxify.end', function (event, url) {

		url = url.url.split('?')[0].split('#')[0];

		switch (url) {
			case 'admin/extend/widgets':
				require([MinecraftIntegration.__MIDIR + 'js/acp-widgets.js'], function (module) {
					module.init();
				});
				break;
		}
	});

	function humanTime(stamp)
	{
		var	date     = new Date(parseInt(stamp,10))
		,	hours    = date.getHours() < 13 ? (date.getHours() === 0 ? 12 : date.getHours()) : date.getHours() - 12
		,	minutes  = (date.getMinutes() < 10 ? "0" : "") + date.getMinutes()
		,	meridiem = date.getHours() < 12 ? "AM" : "PM";

		return hours + ":" + minutes + " " + meridiem;
	}

	function setGraphs(status)
	{
		$('[data-widget="mi-players-graph"][data-sid="' + status.sid + '"]').each(function (i, widget)
		{
			var	$widget   = $(widget)
			,	$chart    = $widget.find('.mi-chart')
			,	chart     = $chart.data('chart')
			,	fillColor = $widget.attr('data-chart-color-fill') ? $widget.attr('data-chart-color-fill') : "rgba(151,187,205,1)";

			socket.emit('plugins.MinecraftIntegration.getRecentPings', {sid: status.sid}, function (err, pings) {

				if (err) return MinecraftIntegration.log(err);

				var	data = new google.visualization.DataTable();

				data.addColumn('number', 'stamp');
				data.addColumn('number', 'players');
				data.addColumn({type: 'string', role: 'tooltip', 'p': {'html': true}});

				var	i = 1;
				for	(var stamp in pings) {
					var	tooltip = '<div style="padding:2px;padding-bottom:4px;display:inline-block;max-width:'+(6*24)+';width:'+(pings[stamp].players.length*24+5)+'px;">';
					pings[stamp].players.forEach(function(player){
						tooltip += '<img src="/api/minecraft-integration/avatar/'+player.name+'/64" width="24px" height="24px" style="display:inline;">';
					});
					tooltip += '</div>';
					data.addRow([i++, pings[stamp].players.length, tooltip]);
				}

				var options = {
					title: '',
					legend: { position: 'none' },
					hAxis: { textPosition: 'none' },
					vAxis: { textPosition: 'none' },
					chartArea: { width: '100%', height: '90%'},
					tooltip: {isHtml: true},
				};

				chart = new google.visualization.LineChart($chart[0]);

				chart.draw(data, options);

				$chart.data('chart', chart);
				$chart.data('chart-data', data);
				$chart.data('chart-options', options);
			});
		});

		$('[data-widget="mi-tps-graph"][data-sid="' + status.sid + '"]').each(function (i, widget)
		{
			var	$widget   = $(widget)
			,	$chart    = $widget.find('.mi-chart')
			,	chart     = $chart.data('chart')
			,	fillColor = $widget.attr('data-chart-color-fill') ? $widget.attr('data-chart-color-fill') : "rgba(151,187,205,1)";

			socket.emit('plugins.MinecraftIntegration.getRecentPings', {sid: status.sid}, function (err, pings) {

				if (err) return MinecraftIntegration.log(err);

				var	data = new google.visualization.DataTable();

				data.addColumn('string', 'stamp');
				data.addColumn('string', 'tps');

				var i = 0;
				for	(var stamp in pings) {
					data.addRow([humanTime(stamp), pings[stamp].tps]);
				}

				var options = {
					title: '',
					legend: { position: 'none' },
					hAxis: { textPosition: 'none' },
					vAxis: {
						textPosition: 'none',
						maxValue: '20'
						},
					chartArea: { width: '100%', height: '90%'}
				};

				chart = new google.visualization.LineChart($chart[0]);

				chart.draw(data, options);

				$chart.data('chart', chart);
				$chart.data('chart-data', data);
				$chart.data('chart-options', options);

			});

		});

		$('[data-widget="mi-top-graph"][data-sid="' + status.sid + '"]').each(function (i, widget) {
	/*
			var	$widget = $(widget),
				$canvas = $widget.find('.mi-canvas'),
				chart = $canvas.data('chart');

			socket.emit('plugins.MinecraftIntegration.getTopPlayersByPlaytimes', {show: 10}, function (err, players) {

				if (err) return MinecraftIntegration.log(err);
				if (!players.length) return;

				var	data = [ ];

				var rainbow = getRainbow($widget, players.length > 1 ? players.length - 1 : 1);

				var options = {
					responsive: true,
					tooltipTemplate: "<%if (label){%><%=label%><%}%>: <%= value %>"
				};

				if (chart) {

					for (var i in players) {

						if (!chart.segments[i]) continue;

						chart.segments[i].value = parseInt(players[i].playtime, 10);
						chart.segments[i].label = players[i].playername || players[i].name;
						if (rainbow) chart.segments[i].fillColor = '#' + rainbow.colourAt(i);

					}

					chart.update();

				}else{

					for (var i in players) {

						var color = "#5B94DE";
						if (rainbow) color = '#' + rainbow.colourAt(i);

						data.push({
							value: parseInt(players[i].playtime, 10),
							color: color,
							highlight: "#AADDFF",
							label: players[i].playername || players[i].name
						});
					}

					$canvas.data('chart', new Chart($canvas[0].getContext('2d')).Pie(data, options));

				}

			});
	*/
		});
	}
}());
