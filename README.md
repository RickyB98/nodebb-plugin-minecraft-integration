# Minecraft Integration

**For support, visit the project's topic on the NodeBB Forums.**

**[https://community.nodebb.org/topic/3559](https://community.nodebb.org/topic/3559 "NodeBB Forums - Minecraft Integration")**

The Minecraft Integration project aims to reproduce and enhance widgets and features found on sites such as Enjin (XenForo-based) for use on a NodeBB forum.

**This plugin requires the Bukkit plugin [nodebb-integration](https://github.com/yariplus/bukkit-plugin-nodebb-integration/releases/ "Download page for nodebb-integration").**

Compatible with NodeBB v0.9.0 and up.

## Installation

1. Install the forum plugin using the Install Plugins page on the NodeBB Admin control panel.

2. Install the Bukkit plugin [nodebb-integration](https://github.com/yariplus/bukkit-plugin-nodebb-integration/releases/ "Download page for nodebb-integration") on your Minecraft server.

## Setup

After installing the plugin and reloading your NodeBB, go to the **Plugins->Minecraft Integration** page in the Admin control panel and add a new server.

Copy the server's API key.

On your Minecraft server console, enter the command `/nodebb key {APIkey}`

The server will now connect to your forum and send it information every minute or when an event occurs.

### Server Configuration

#### Server Name
This name is used by the plugin to identify the server.

#### Server Address
This is the address users use in game to connect to the server.

#### API Key

This key is used to connect your Minecraft server to the forum.

## Widgets

### Server Status Widget

Shows MOTD, min/max players, version, online player avatars, and other information about the Minecraft server. Displays everything in a pretty table. Custom rows can be added for things such as Mod Pack downloads, donation links, or any other html you wish to add.

![Server Status Widget Sample Image](http://yariplus.x10.mx/images/widgetServerStatus.png "Server Status Widget Sample Image")

### Mini Map Widget

Displays a Dynmap or Overviewer mini-map with configurable start location. (World/MapType/Coordinate).

![Dynmap Mini Map Sample Image](http://yariplus.x10.mx/images/widgetDynmapMiniMap.png "Dynmap Mini Map Sample Image")

### Online Players Graph Widget

A graph showing the number of player on the server recently. (Last 30 pings)

![Online Players Graph Sample Image](http://yariplus.x10.mx/images/widgetOnlinePlayersGraph.png "Online Players Graph Sample Image")

### Online Players Grid Widget

A grid of avatars of players currently on the server.

![Online Players Grid Sample Image](http://yariplus.x10.mx/images/widgetOnlinePlayersGrid.png "Online Players Grid Sample Image")

### Top Players List Widget

Displays user avatars in a list representing the top players' approximate play time.

![Top Players List Sample Image](http://yariplus.x10.mx/images/widgetTopPlayersList.png "Top Players List Sample Image")

### Top Players Graph Widget

A graphic chart (Pie) representing the top players' approximate play time.

![Top Players Graph Sample Image](http://yariplus.x10.mx/images/widgetTopPlayersGraph.png "Top Players Graph Sample Image")

### TPS Graph Widget

A graph showing the servers' recent Ticks per Second.

### Chat Widget

Show the in-game chat in a shoutbox-like widget. Send messages if your forum user is registered.

## Plugin API

Other apps can read data the plugin has collected via it's [API](https://github.com/yariplus/nodebb-plugin-minecraft-integration/wiki/API).

## Features in Development

* Character Profiles - A mini profile for your character.
* Gallery Widget - A selection of user-uploaded screen-shots.
* Server Page - A page just for server data.
* Directory Widget - Display notable character profiles.
* Ping Graph Widget - Display recent server pings.
