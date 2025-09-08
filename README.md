# RETRO REDRAWN - Pokemon Redrawn

Repository for the Pokemon Redrawn project.

Developed and refactored by Tyson Moll (https://tysonmoll.ca/). The base code was originally programmed by Jerky (@Hyperjerk) for the Retro Redrawn Kanto and Johto projects.

Artists are credited for their work in the project website (as denoted in the areas.js file).

Official Website: https://retroredrawn.com/
Discord: https://discord.gg/ZN3297XBtU

## Creating a new Redrawn

These instructions are a work in progress. Please reach out to vulture-boy if you run into any issues so that we can clarify the instructions and make the process streamlined for future users.

First, some terminology:
* Area: an image in the viewer that is redrawn, sometimes referred to as Screens or Slices.
* Layer: a collection of Areas to be displayed at the same time.
* Old / New: old generally refers to the original game's images. New usually refers to the redrawn images.

And now, some steps!

1. Clone or Fork the repository to create your own copy. 
    * If you cloned, you may also want to initialize your own repository on Github (etc) with it for version control and potentially hosting.
2. Setup your areas file (open areas.js)
    * This is where individual screens in the project will be defined.
    * Inside the file there are at least one var declarations for an array; these are the Layers. Clean up the array by removing all but one entry in each Layer. Keep as many Layers as you want in the file, but make sure their names are distinct. Alternatively, you can create individual files each containing a unique array name in the format `areas_<name>.js` provided that you include them in the index.html file.
    * We will add content to the individual areas in the array later.
3. Link your areas to your implementation file
    * Open implementation.js and change the contents of redrawnLayers to contain one entry per layer array you setup in Step 2.
    * Set the canvas size to be large enough to contain all the screens you intend to include in the project. You can readjust this later.
    * The 'areas' field shoud match the name of the Layer array corresponding to it that we defined in Step 2.
4. In implementation.js. update the content of the biomes array with as many entries as you'd like.
    * These are used for the iconic display of menu items in the list of redrawn screens
        * name refers to the name of the biome, formatted for reading (i.e. how you would want to read the text)
        * ident refers to the name of the biome, formatted for code (i.e. lowercase, no spaces)
        * iconId is a reference to an icon in Google Material Symbols and Icons, where icons are currently drawn from
        * color is the color of the menu icon.
    * You can also define custom icons by defining elements in the customIcons section with the same itemID as their corresponding biome. Make sure these point to .svg files for best results.
5. Update the content of index.html to reflect your project.
    * In the Header, change the website page name, description,  OG (OpenGraph) image and favicon fields. (The OG image is the image shown in social media thumbnails)
    * Update the Menu Logo to match your project
    * Update the About section with a description relative to your project. Please provide appropriate credit to artists and programmers involved in your project (including those you fork from). 
    * Update the loading bar image.
6. (Optional) Add the layer buttons
    * Not all Redrawn projects use more than one layer, but if you want to include them, reference an applicable project's files and...
    * In index.html's "areaList" div, there are list items for each layer in the project.
        * Change the name provided to the changeLayer function to the name of your layer. Set the class to the same name, and the name in the Span section to the display name.
    * In home.css, find "#layers li button.__" and replace the name of the layer with your own. Update the background image as well.
7. Add areas to the areas.js file (see below)
8. Remove any remaining project-specific image assets and replace with your own once you are done setting up the project.
    * images are stored in the img folder, where screens can be found in folders defined by the redrawnLayers names 
9. Modify the CSS attributes and any webfonts in index.html to further customize the look of your redrawn website

## Adding Areas

You can add an area by adding a new entry to the areas.js file and ensuring that the position defined in the area is complimented by a representative location in the map image. You can use areas.html if you prefer to modify these fields with a GUI interface, though bear in mind any changes made must be exported and applied to areas.js; the project _will not automatically update_.

area.js - Defines location regions and provides credit to artists
- (base array): used to identify the Layer 
    - order: the position of an area screen within the area list. Should be sequential but doesn't need to be ordered.
    - title: Display name for an entry
    - ident: File identity for an entry; should match the file name without the file extension.
    - artist: artist name.
    - artistImageOverride: Name of the artist's avatar filename if the artist name doesn't match it.
    - animation: set to true if this area has a .gif version
    - point: pixel position of the area when displayed. x, y refers to the top-left co-ordinate. width and height are collected automatically from the source image(s) via a shell script (details below) and can be left as 0 for now.
    - offset: used to define an offset position and size for the redrawn version of an area, allowing for oversized redrawns
    - pan: how the tour camera should pan over the image in tour mode (options: vertical, horizontal )
    - type: 'biome' type of the entry; visually styles the list entry 
    - zoom: zoom scale to use when focusing on the area during a tour or when the menu button is clicked.
    - url: URL pointing to the artist's portfolio, social media handle, or link tree
    - post_url: URL of a social media post associated with this entry
 
Unused fields:
- teleporters: list of teleporters connected to the area used to 'warp' between locations and / or layers

### Using the update_area_dimensions shell script

Before publishing the project, we need the width and height values of each element in the areas.js file to be populated. To do so, make sure [ImageMagick is Installed](https://imagemagick.org/script/download.php), restart your computer, open a Bash terminal (e.g. Git Bash), then call `./update_area_dimensions`. Follow the prompts for each detected areas.js file, inputting the folder path to the old images when requested (e.g. `./img/game/old`). 


Why this Matters:

The redrawn projects are capable of getting the width and height directly from the image files, but sometimes these images are cached after the second visit to the site in a way that causes these values to be inaccessible when we need them. Accordingly, we need these values cached to avoid this from happening (until a better solution is available). To this end, we have a shell script that automatically gets the width and height of the base images and pumps them into our areas.js file so that they're always available. 

## Adding Audio

In implementation.js, there is an array called `AUDIO_TRACKS`; you can add the audio clip, artist name, and song name there to have it be usable by the audio player. For each audio player you want, simply duplicate the contents of the `custom-player` class div in the index.html for each player you want, turn off autoplay for all but the first one you want to play, and set the `data-player-num` to the corresponding audio track index. It can be styled with player.css. You can also optionally specify an intro track to play before the music loop.

## Updating the Background

In implementation.js, the Background region has several configs for background display. CANVAS_BACKGROUND_IMAGE is the image used on the canvas, and WINDOW_BACKGROUND_IMAGE is the image used in the background. These are currently set to tile repeatedly. You can also set the color of the background instead of giving it an image. Defining no image is also fine.

## FAQ

__Q: Some of the information on this redrawn is out-of-date!__

_A: You can either create a pull request to update the data or reach out to the project's discord._

__Q: Some of the instructions are unclear or could be improved!__

_A: We welcome feedback and want to make this as user friendly as we can! Please create a pull request or reach out on the project's discord._

__Q: What's the project's license?__

_A: The repository is the work of authors Jerky (HyperJerk) and Tyson Moll under Copyright and is provided on GitHub licensed under the GNU General Public License. Other licenses for this software must be negotiated with both authors. This license applies to all derivative works. The artwork is copyright of their respective artists, all rights reserved. We do not have the authority to license their work but assume the license to display and share their works in the context of this repository and Retro Redrawn._
