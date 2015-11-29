"use strict";

var	async = require('async'),

	Backend    = require('../backend'),
	Controller = require('../controller'),
	NodeBB     = require('../nodebb'),
	Utils      = require('../utils');

module.exports = function (API) {

	API.updateServerStatus = function (status, next) {

		var	updateTime = Math.round(Date.now()/60000) * 60000,
			sid = status.sid,
			tps = status.tps;

		status.isServerOnline = 1;
		status.players        = status.players    || [];
		status.pluginList     = status.pluginList || [];
		status.modList        = status.modList    || [];
		status.updateTime     = updateTime;

		// Trim UUIDs to Mojang format.
		status.players.forEach(function(player){
			if (!player.id) return;
			player.id = Utils.trimUUID(player.id);
		});

		// Store the player statistics in the database.
		async.each(status.players, function (player, next) {

			// Skip if no uuid.
			if (!player.id) next();

			// TODO: BungeeCord Support
			// BungeeCord proxies will need their player UUIDs verified, since they run in offline mode.
			// A proper proxy would be running a Spigot derivative with BungeeCord pass-through set, but
			// we can't count on that.

			// Skip if invalid uuid.
			// function verifyUUID(id, next) {
				// Utils.getPlayerNameUsingUUID(id, function (err, name) {
					// if (err) return next(err);
				// });
			// }

			// Utils.getPlayerNameUsingUUID(player.id, function (err, valid) {
				// if (err)
			// });

			// DEPRECIATED: Future versions will track playtime using the Minecraft Plugin or OnTime.
			async.parallel({
				playtime: function (next) {
					NodeBB.db.getObjectField('yuuid:' + player.id, 'lastonline', function (err, data) {
						if (parseInt(data) !== updateTime) {
							NodeBB.db.setObjectField('yuuid:' + player.id, 'lastonline', updateTime);
							NodeBB.db.incrObjectField('yuuid:' + player.id, 'playtime', next);
						}else{
							NodeBB.db.getObjectField('yuuid:' + player.id, 'playtime', next);
						}
					});
				},
				name: async.apply(NodeBB.db.setObjectField, 'yuuid:' + player.id, 'name', player.name)
			}, function (err, results) {
				if (err) {
					console.log('[Minecraft Integration] Error setting player object ' + player.id + ': ' + err);
				}else{
					NodeBB.db.sortedSetAdd('yuuid:playtime', results.playtime || "0", player.id, function (err) {
					});
				}
			});
		});

		async.waterfall([
			async.apply(Controller.sendStatusToUsers, status),
			function (next) {
				// Store lists as stringified objects.
				try {
					status.players = JSON.stringify(status.players);
				}catch(e){
					status.players = '[]';
					console.log("[Minecraft Integration] Error parsing players list: " + e);
				}
				try {
					status.modList = JSON.stringify(status.modList);
				}catch(e){
					status.modList = '[]';
					console.log("[Minecraft Integration] Error parsing mod list: " + e);
				}
				try {
					status.pluginList = JSON.stringify(status.pluginList);
				}catch(e){
					status.pluginList = '[]';
					console.log("[Minecraft Integration] Error parsing plugin list: " + e);
				}
				next();
			},
			async.apply(Backend.updateServerStatus, status)
		], next);

	};

	API.eventPlayerJoin = function (data, next) {

		// Assert parameters.
		if (!(data && data.id && data.name)) return next();

		var	name   = data.name,
			id     = data.id,
			prefix = data.prefix;

		// Update player profile.
		if (!!prefix) {
			console.log("Setting prefix: " + prefix + " for " + name + " (" + id + ")");
			NodeBB.db.setObjectField('yuuid:' + id, 'prefix', Utils.parseFormatCodes(prefix));
		}

		// TODO:
		// I can get rid off all this nonsense by storing players in a set 'mi:server:sid:players'
		// Could use a sortedSet with lexicon stored names, or just a plain set with uuids.

		NodeBB.db.getObjectField('mi:server:' + data.sid, 'players', function (err, players) {
			if (err) return console.log(err);

			var found = false;

			try {
				players = JSON.parse(players);
			}catch(e){
				return console.log(e);
			}

			for (var i in players) {
				if (players[i] === null) continue;
				if (players[i].id === id) found = true;
			}
			if (!found) {
				players.push({id: id, name: name});

				try {
					players = JSON.stringify(players);
				}catch(e){
					return console.log(e);
				}

				Controller.sendPlayerJoinToUsers({sid: data.sid, player: {id: id, name: name}});

				NodeBB.db.setObjectField('mi:server:' + data.sid, 'players', players, function (err) {
					if (err) console.log(err);
					next();
				});
			}else{
				next();
			}
		});

	};

	API.eventPlayerQuit = function (data, next) {

		// Assert parameters.
		if (!(data && data.id && data.name)) return next();

		var	name = data.name,
			id   = data.id;

		NodeBB.db.getObjectField('mi:server:' + data.sid, 'players', function (err, players) {
			if (err) {
				console.log(err);
				return next();
			}

			try {
				players = JSON.parse(players);
			}catch(e){
				console.log(e);
				return next();
			}

			// TODO: Make this part not suck.
			for (var i in players) {
				if (players[i].id === id) {
					players.splice(i, 1);
				};
			}
			try {
				players = JSON.stringify(players);
				NodeBB.db.setObjectField('mi:server:' + data.sid, 'players', players, function (err) {
					if (err) return console.log(err);
				});
				Controller.sendPlayerQuitToUsers({sid: data.sid, player: {id: id, name: name}});
			}catch(e){
				console.log(e);
			}

			return next();
		});
	};

};