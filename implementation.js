/*
*   Retro Redrawn 
*   -- Implementation Script
*
*   Frontend data container of the Redrawn Viewer. 
*   Contains implementation data specific to a Redrawn project.
*
*   Author: Tyson Moll (vvvvvvv)
*
*   Created in 2023
*/

//#region Audio

/**
 * Information about audio tracks used by the audio player. 
 * Please set 'player-data-num' in the index.html to the track number you want to play for each player.
 * @type {Array<{title: string, artist: string, audio: string, audio_intro: string}>}
 */
const AUDIO_TRACKS = [
    {
        title: 'Vermilion City',
        artist: 'Pokerus Project',
        audio: 'audio/VermilionCity_PokerusPr.mp3',
        audio_intro: ''
    },
    {
        title: 'Route 12',
        artist: 'Tori Roberts',
        audio: 'audio/Route12_Toribobs.mp3',
        audio_intro: ''
    }
];

//#endregion

//#region Background Images

/**
 * File path to tiled background image for the canvas (use empty string if none)
 * @type {string}
 */
const CANVAS_BACKGROUND_IMAGE = 'img/website/grid_test.png';
/**
 * Hex Color for the window background.
 * @type {int}
 */
const WINDOW_BACKGROUND_COLOR = 0x000000;
/**
 * File path to tiled background image for the window (blank if none)
 * @type {string}
 */
const WINDOW_BACKGROUND_IMAGE = '';
/**
 * Whether to apply motion blur to the full viewport or just the map canvas.
 * @type {boolean}
 */
const MOTIONBLUR_VIEWPORT = false;

//#endregion

//#region Art File Naming

/** 
 * Optional suffix added to new map file names (e.g. '_new' for 'map_name_new.png') 
 * @type {string}
 */
const NEW_SLICE_SUFFIX = '';

/** 
 * Optional suffix added to old map file names (e.g. '_old' for 'map_name_old.png')
 * @type {string}
 */
const OLD_SLICE_SUFFIX = '';

// Layers
/**
 * Currently active layer index (and initial index) 
 * @type {int}
 */
var activeLayerIndex = 0;

//#endregion

//#region Content 

/** 
 * Content layers in the Redrawn 
 * @type {Array<{name: string, canvasSize:{width: int, height: int}, areas: string}>}
 */
const redrawnLayers = [
    {
        name: "kanto",
        canvasSize: {width: 5472, height: 5904},
        areas: kantoAreas
    },
    {
        name: "interior",
        canvasSize: {width: 5504, height: 5744},
        areas: interiorAreas
    },
    {
        name: "sevii",
        canvasSize: {width: 4576, height: 6784},
        areas: seviiAreas
    },
];

//#endregion

//#region  Biomes
/** 
 * Biome Data (Screen icons). 
 * @type {Array<{name: string, ident: string, iconId: string, color: string}>}
 */
const biomes = [
    {
        name: "Town",
        ident: "town",
        iconId: "location_city",
        color: 'rgb(130 94 108)',
    },
    {
        name: "Forest",
        ident: "forest",
        iconId: "park",
        color: 'rgb(94 130 105)',
    },
    {
        name: "Surfing",
        ident: "surfing",
        iconId: "surfing",
        color: 'rgb(108 127 171)',
    },
    {
        name: "Mountain",
        ident: "mountain",
        iconId: "landscape",
        color: 'rgb(130 115 88)',
    },
    {
        name: "Cave",
        ident: "hiking",
        iconId: "hiking",
        color: 'rgb(100 96 127)',
    },
    {
        name: "Home",
        ident: "home",
        iconId: "home",
        color: 'rgb(144 180 188)',
    },
    {
        name: "Storefront",
        ident: "storefront",
        iconId: "storefront",
        color: 'rgb(179 118 118)',
    },
    {
        name: "Factory",
        ident: "factory",
        iconId: "factory",
        color: 'rgb(144 144 144)',
    },
    {
        name: "Apartment",
        ident: "apartment",
        iconId: "apartment",
        color: 'rgb(144 144 144)',
    },
    {
        name: "Warehouse",
        ident: "warehouse",
        iconId: "warehouse",
        color: 'rgb(144 144 144)',
    },
    {
        name: "Train",
        ident: "train",
        iconId: "train",
        color: 'rgb(144 144 144)',
    },
    {
        name: "Subway",
        ident: "subway",
        iconId: "subway",
        color: 'rgb(100 96 127)',
    },
    {
        name: "Trainer Certifier",
        ident: "award_star",
        iconId: "token",
        color: 'rgb(173 163 110)',
    },
    {
        name: "Cruise Ship",
        ident: "directions_boat",
        iconId: "directions_boat",
        color: 'rgb(108 127 171)',
    },
	{
        name: "Bike",
        ident: "bike",
        iconId: "pedal_bike",
        color: 'rgb(128 127 120)',
    },
	{
        name: "Route",
        ident: "route",
        iconId: "grass",
        color: 'rgb(144 183 113)',
    },
];

/** 
 * Directory of image files tied to defined iconIds. 
 * If not defined here, the icon is looked up in the Material Icon library.  
 * See icon list here >> https://fonts.google.com/icons
 * Ideally use 1:1 ratio svg files; image will automatically be resized.
 * @type {Array<{iconId: string, path: string}>}
 */
const iconFiles = [
];

//#endregion
