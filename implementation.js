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

// Directories
const GRID_CELL_IMAGE = 'img/website/grid_test.png'; // Tiled background image (blank if none)

// Audio
var bgmTrack = null;

/** Content layers in the Redrawn */
var activeLayerIndex = 0;           // Currently active layer index (and initial index)
var redrawnLayers = [
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
        canvasSize: {width: 4448, height: 6784},
        areas: seviiAreas
    },
];

/** Biome Data (Screen icons) */
var biomes = [
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
