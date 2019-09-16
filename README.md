# PPFinder 3
 This tool uses the same mechanism as the [tillerino bot](https://github.com/Tillerino/Tillerinobot/wiki) to search through your already installed beatmaps with given criteria.
This process is really powerful because some search queries can't be made in the base game not with the bot. 
For example : if you want a map with pp goals set for a friend (to play in a multi lobby maybe) you could not use Tillerino, but PP Finder is the right tool.

## Installation
### Classic installation
-- TODO --
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
+ ar
+ od
+ hp
+ cs
+ mods wanted
+ mods **not** wanted
+ map duration
+ map max combo

And you can order your search results in various ways (PP, PP per minute, PP per note...) in ascending or descending order.

## Language
PP Finder supports multiple languages, in the first release it is possible to choose between **english** and **french** through the settings.
You can help by adding support for your language simply by using one existing `lib/lang` file and editing the texts, then making a pull request.

## Dependencies
PP Finder uses [Ojsama, by Francesco149](https://github.com/Francesco149/ojsama) to parse beatmaps and [Lovefield, by Google](https://github.com/google/lovefield) to store beatmaps' metadatas. The graphical interface is handled by [Electron](https://electronjs.org) and [Vue](https://vuejs.org).
Code-wise, the HTML preprocessor used is [Pug](pugjs.org) and the css preprocessor is [Stylus](http://stylus-lang.com).
I (Geoffrey) am not used enough to Typescript to use it, hence the use of "classic" ECMAScript 9 (2018).
If you wish to contribute, please go ahead. 
