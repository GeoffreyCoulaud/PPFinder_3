# PPFinder 3
This tool uses the same mechanism as the [tillerino bot](https://github.com/Tillerino/Tillerinobot/wiki) to search through your already installed beatmaps with given criteria.
This process is really powerful because some search queries can't be made in the base game nor with the bot. 
For example : if you want a map with pp goals set for a friend (to play in a multi lobby maybe) you could not use Tillerino, but PP Finder is the right tool.

## Installation
### Classic installation
Until security and performance fixes are not applied, no "classic" releases will be published. 
Please refer to the security and performance disclaimer section to understand why.

### "Dev friendly" installation
You must have node and git installed on your system.
Clone the repo
```
git clone https://github.com/GeoffreyCoulaud/PPFinder_3
npm install
npm start
```
If you want to rebuild the HTML and CSS, do
```
npm i -g stylus
npm i -g pug
```
Then compile the files in `src/stylus` to `lib/css` and in `src/pug` to `lib/html`

## Searching
The search interface is simple, you can edit these search criterias : 
+ pp
+ stars
+ ar, od, hp, cs
+ mods included
+ mods excluded
+ map duration
+ map max combo

And you can order your search results in various ways (PP, PP per minute, PP per note...) in ascending or descending order.

## Security and performance disclaimer 
As of this current version, you will need a MYSQL server running, with a root user that needs *no password* to connect to it, **which is a bad thing for security concerns**. As of today, PP Finder should only be used as a developper tool until it is ported to an embedded database system, or until it ships a mysql instance that would not interfere with any existing one on the machine.

It hasn't been done for performance reasons, because sqlite would be 2x slower than mysql server or more, which is already really slow to search the database. This is really slow because for each .osu, PP Finder calculates difficulty data for every mod combination in ```src/js/modcombos.js```, and for every one of these combinations, several accuracies. In this version, this means that a single .osu file generates 1 mapmetadata entry, 145 modmetadata entries, and 580 accuraciesmetadata entries which sums up as 726 database entries for a single .osu file.

The problem here is not really inserting speed (which is not that slow) but more searching speed because for one search result, mysql asks once the modsmetadata table then finds the beatmapmetadata entry associated and the 4 accuraciesmetadata associated with the mod. I'm sure you'll understand that this separation of data is surely atomic but not efficient at all.

If you really want to use PP Finder anyway, i advise running XAMPP which is a PHP/MYSQL stack. No need for anything else and you can tweak the database settings or users with phpMyAdmin.

## Language
PP Finder supports multiple languages, in the first release it is possible to choose between **english** and **french** through the settings.
You can help by adding support for your language simply by using one existing `lib/lang` file and editing the texts, then making a pull request.

## Dependencies
PP Finder uses [Ojsama, by Francesco149](https://github.com/Francesco149/ojsama) to parse beatmaps. The graphical interface is handled by [Electron](https://electronjs.org) and [Vue](https://vuejs.org).
Code-wise, the HTML preprocessor used is [Pug](https://pugjs.org) and the css preprocessor is [Stylus](http://stylus-lang.com).
I (Geoffrey) am not used enough to Typescript to use it, hence the use of "classic" ES10.

If you wish to contribute, please go ahead, you can add pull requests, issues, feature requests as much as needed.
This is a hobby project anyway, not even a proof of concept. Be aware that response time from me will be variable as i'm at university right now.