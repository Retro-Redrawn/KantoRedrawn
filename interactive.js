/*
*   Retro Redrawn 
*   -- Interactive Script
*
*   Backend operations of the Redrawn Viewer. 
*   Uses Implementation script for data related to a particular implementation.
*
*   Dependencies: RedrawnArtistDataUtils.js, ArtistData.js (https://vulture-boy.github.io/Retro-Redrawn-Data/)
*
*   Authors: Jerky, Tyson Moll (vvvvvvv)
*
*   Contributors: dodocommando
*
*   Created in 2023
*/

// Core
var app = null;
var loading = true; // Whether data is being loaded (e.g. images)
var layersLoaded = 0;

// Navigation
var zoomLevel = 1; // must be whole number
var zoomMin = 0.25;
var zoomMax = 4;
var currentZoom = 1; //lerp
var zoomCenter = {x: 0, y: 0}; // must be whole numbers
var currentPos = {x: 0, y: 0}; //lerp

// Map
const NEW_STYLE_NAME = 'new';
const OLD_STYLE_NAME = 'old';
var activeAreas = redrawnLayers[activeLayerIndex].areas;  // Active array of areas (and initial area)
var layerCount = redrawnLayers.length;  // Total number of layers
var canvasDimensions = redrawnLayers[activeLayerIndex].canvasSize; // Dimension of active canvas
var map = null;
var mapImages = null;
var mapZones = null;
var currentMapStyle = NEW_STYLE_NAME;
var viewport = null;
var bordersDisabled = false;

// Auto Highlight
var autoHighlight = true;
var highlightedArea = null;

// Filters
var blurFilter = null;      // Motion blue used when zooming
var bulgeFilter = null;
var colorFilter = null;      // Used for fade-to-black sequences (e.g. in tour mode)

// Interaction
var mouseDown = false;
var dragging = false;
var dragVelocity = { x: 0, y: 0 };
var zoomMousePos = { x: 0, y: 0 };
var previousTouch = null;
var previousPinchDistance = 0;
var pinchForTick = null;

// Tour
var tourMode = false;
var tourTransition = false;
var areasToTour = [];
var tourFadeTimer = 100;

// Camera movement
var _defaultCameraSpeed = 0.008;
var _defaultTourCameraSpeed = 0.002;
var cameraSpeed = _defaultCameraSpeed;
var tourCameraSpeed = _defaultTourCameraSpeed;

var cameraAnimation = {
    speed: cameraSpeed,
    playing: false,
    progress: 0,
    startPos: {x: 0, y:0 },
    endPos: {x: 0, y: 0},
    startZoom: 1,
    endZoom: 1,
    easing: true
}

// Layers
var layerNewImages = fillWithArrays(Array.apply(null, Array(layerCount)));    // Array of length matching Layer Names
var layerOldImages = fillWithArrays(Array.apply(null, Array(layerCount)));
var redrawImages = [layerNewImages, layerOldImages];
var redrawsCount = redrawImages.length;    // Total number of redraw layers

// Start up
loadImages()
window.addEventListener('wheel', onMouseWheel);
window.addEventListener('resize', onResize);
window.addEventListener('keydown', onKeyDown);
//

/** Loads new & old images pertaining to a single layer.
 * 
 * @param {Array} areaArray Array of areas particular to a layer.
 * @param {Array} areaImageArray Array of images tied to areas in a layer.
 * @param {Array} areaOldImageArray Array of old versions of images tied to a layer.
 * @param {string} layerSubfolder Subfolder directory name of the layer's new & old images.
*/
function loadLayer (areaArray, areaImageArray, areaOldImageArray, layerSubfolder) {
    for (var i = 0; i < areaArray.length; i++) 
    {
        var area = areaArray[i];

        // Load new images
        var img = new Image();
        img.src = createImageLink(layerSubfolder, NEW_STYLE_NAME, area.ident);
        checkImageLoaded(img, function () { onAreaImageLoaded(areaImageArray); });
        areaImageArray.push(img);
        
        // Load old images
        var oldimg = new Image();
        oldimg.src = createImageLink(layerSubfolder, OLD_STYLE_NAME, area.ident);
        checkImageLoaded(oldimg, function () { onAreaImageLoaded(areaImageArray); });
        areaOldImageArray.push(oldimg);
    }
}

/** Produces an image link from area details. */
function createImageLink (layerName, mapStyle, areaName) {

    var link = `img/${layerName}/${mapStyle}/${areaName}`;
    link += `.png`; 
    
    return link;
}

/** Loads all new & old images pertaining to each layer */
function loadImages () {

    for (var i = 0; i < layerCount; i++) {

        // Need areas in the layer to load images
        if (redrawnLayers[i].areas.length != 0) {
            loadLayer(redrawnLayers[i].areas, layerNewImages[i], layerOldImages[i], redrawnLayers[i].name);
        }
        else {
            redrawsCount -= 2;   // Ignore & subtract from this var, otherwise will never finish loading.
            // TODO: fix magic number reference
        }
    }
}

/** Callback triggered when an image is loaded; checks if images in the layer are done loading. */
function onAreaImageLoaded (areaImageArray) {
    var loadedImages = areaImageArray.filter(x => x.complete).length
    document.querySelector('.loading-bar__inner').style.width = `${(loadedImages / areaImageArray.length) * 100}%`
    if (loadedImages === areaImageArray.length && loading) {
        layersLoaded += 1;
        if (layersLoaded >= redrawsCount) {
            completeLoading();
        }
    }
}

//Check if the image is properly loaded and rendered, .complete does not mean it is rendered and the size is might be set incorrectly
function checkImageLoaded(img, callback) {
    img.onload = function () {
        if (img.naturalHeight > 0 && img.naturalWidth > 0) callback();
        var counter = 0;
        var interval = setInterval(function () {
            counter++;
            if ((img.naturalHeight > 0 && img.naturalWidth > 0) || counter >= 20) {
                clearInterval(interval);
                callback();
            }
        }, 500);
    };
    img.onerror = function() {
        callback();
    };
}

/** Completes the loading process. */
function completeLoading () {
    loading = false;

    // Deactivate loading element
    document.querySelector('#loading').classList.remove('active');
    if (window.innerWidth < 768) {  // Hide the menu if screen is not wide enough
        toggleMenu();
    }

    init();
}

/** Initializes the canvas and its content. */
function init () {

    // Construct the PIXI canvas with pixel perfect settings
    try {
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST     // Nearest neighbour scaling
        app = new PIXI.Application({ width: window.innerWidth, height: window.innerHeight, antialias: false, view: document.querySelector('#canvas'), autoResize: true });
        globalThis.__PIXI_APP__ = app; 
    } catch (error) {
        // alert('Application cannot start - Please ensure Hardware Acceleration is enabled on your web browser.')
        // document.querySelector('#error').innerHTML =  '<p>Application cannot start - Please ensure Hardware Acceleration is enabled on your web browser.</p><a>View full image</a>'
        document.querySelector('#error').innerHTML =  '<p>Application cannot start - Please ensure Hardware Acceleration is enabled on your web browser.</p>'
        document.querySelector('#error').classList.add('active')
    }

    // Prepare the canvas display
    setupCanvas();

    // Select & focus on a random area & open it in DOM
    var startingArea = activeAreas[Math.floor(Math.random() * activeAreas.length)]
    focusOnArea(startingArea)
    openAreaInDOM(startingArea)

    // Advance an animation frame
    requestAnimationFrame(tick)
}

/** Prepares the canvas display */ 
function setupCanvas () {
    app.stage.removeChildren()

    // Establish PIXI containers
    map = new PIXI.Container()
    map.name = "Map";
    mapImages = new PIXI.Container()
    mapImages.name = "Map Images"
    mapZones = new PIXI.Container()
    mapZones.name = "Map Zones" 
    viewport = new PIXI.Container({width: window.innerWidth, height: window.innerHeight})
    viewport.name = "Viewport"

    buildMap()
    var mapbg = new PIXI.TilingSprite(new PIXI.Texture.from(GRID_CELL_IMAGE), canvasDimensions.width, canvasDimensions.height)
    mapbg.name = "Map Background"
    mapbg.zIndex = -1
    map.addChild(mapbg)
    map.addChild(mapImages)
    map.addChild(mapZones)
    var background = new PIXI.Graphics()
    background.name = "Background Fill"
    //background.beginFill(0x333333)
    background.beginFill(0x00000)
    background.drawRect(0,0,window.innerWidth, window.innerHeight)
    background.endFill()
    // var background = new PIXI.TilingSprite(new PIXI.Texture.from('grid_test.png'), window.innerWidth, window.innerHeight)
    viewport.addChild(background)
    viewport.addChild(map)
    app.stage.addChild(viewport)

    map.interactive = true
    viewport.interactive = true

    // Establish navigation listeners
    viewport.on('pointerdown', onDragStart)
    viewport.on('pointerup', onDragEnd)
    viewport.on('click', onClick)
    viewport.on('pointerupoutside', onDragEnd)
    viewport.on('pointermove', onDragMove)

    setUpAreas()

    // Prepare filters
    blurFilter = new PIXI.filters.ZoomBlurFilter()
    bulgeFilter = new PIXI.filters.BulgePinchFilter()
    colorFilter = new PIXI.filters.AlphaFilter()

    // Set default position/zoom
    map.scale.set(zoomMin)
    map.x = -((map.width) - (window.innerWidth / 2)) * map.scale.x
    map.y = -((map.height) - (window.innerHeight / 2)) * map.scale.x

    zoomCenter.x = map.x
    currentPos.x = map.x
    currentPos.y = map.y
    zoomCenter.y = map.y
}

function buildMap () {
    while (mapImages.children[0]) { 
        mapImages.removeChild(mapImages.children[0]);
    }
    for (var i = 0; i < activeAreas.length; i++) {

        // Get area image
        var area = activeAreas[i];
        var src = createImageLink(redrawnLayers[activeLayerIndex].name, currentMapStyle, area.ident);

        var sprite = new PIXI.Sprite.from(src);
        
        sprite.name = `AREA: ${redrawnLayers[activeLayerIndex].name} (${currentMapStyle}) - ${area.ident}`;

        // Apply offset to new versions (always relative to old versions)
        if (currentMapStyle === NEW_STYLE_NAME) {
            sprite.position.set(area.point.x + area.offset.x, area.point.y + area.offset.y)
        } else {
            sprite.position.set(area.point.x, area.point.y)
        }
        mapImages.addChild(sprite)
    }
}

/** Switches between Old and New map styles */
function toggleMapStyle () {
    var lastMapStyle = currentMapStyle;

    if (currentMapStyle == NEW_STYLE_NAME) 
        {
            currentMapStyle = OLD_STYLE_NAME;
        }
    else
        {
            currentMapStyle = NEW_STYLE_NAME;
        }

    // Build map if changed
    if (!(lastMapStyle === currentMapStyle)) 
    {
        buildMap();
    }

    updateActiveAreaZone()
}

//** Fetches the current active layer's area images based on the current style */
function getActiveLayerAreaImages(styleOverride = "") {

    // Use current style or override?
    var style = styleOverride === "" ? currentMapStyle : styleOverride;

    if (style === NEW_STYLE_NAME) {
        return layerNewImages[activeLayerIndex];
    }
    if (style == OLD_STYLE_NAME) {
        return layerOldImages[activeLayerIndex];
    }

    log.error("current map style not defined as new or old");
    return null 
}

/** Regenerates all area zones. */
function RegenerateAreaZones() {

    if (!activeAreas) {
        return
    }

    // Cleanup existing zones, if any.
    for (var i = 0; i < mapZones.children.length; i++) {
        var zone = mapZones.children[i];
        zone.destroy();
    }
    mapZones.removeChildren();

    // Generate new zones
    for (var i = 0; i < activeAreas.length; i++) {

        // Prepare PIXI area tile
        var area = activeAreas[i];
        var activeImages = getActiveLayerAreaImages();
        var areaImage = activeImages[i];
        generateAreaZone(area, areaImage);
    }
}

/** Prepares PIXI area tiles and their associated HTML artist information blocks. */
function setUpAreas () {
    if (!activeAreas) {
        return
    }

    // Query the areas list
    var areaList = document.querySelector('#areas')
    areaList.innerHTML = ''

    RegenerateAreaZones();

    // Loop through all active areas
    for (var i = 0; i < activeAreas.length; i++) {

        var area = activeAreas[i];

        // Get biome data
        var backgroundColor = 'rgb(0 0 0)';
        var materialIcon = '';
        for (var j=0; j< biomes.length; j++) {
            let biome = biomes[j];
            if (biome.ident === area.type) {
                backgroundColor = biome.color;
                materialIcon = biome.iconId;
                break;
            }
        }

        // Prep artist image HTML
        var artistData = GetArtistData(area.artistId);
        var artistName = artistData.name;
        var artistUrl = artistData.url;
        var artistImgPath = GetArtistImagePath(artistData);
        var artistImageHTML = '';
    
        if (!(artistImgPath === '')) {
            artistImageHTML = artistUrl ? `<a href="${artistUrl}" target="_blank" title="${artistName}">
                <img src="${artistImgPath}" alt="${artistName}" /></a>` : `<img src="${artistImgPath}" alt="${artistName}" />`;
        }
        
        // Prepare the HTML block corresponding to an area and its associated credts
        var html = 
        `<li class="area" title="${area.title}" style="background-color:${backgroundColor}" onclick="focusOnArea('${area.title}')">
            <div class="area__header" >
                <span class="material-icons">
                    ${materialIcon}
                </span>
                <span>
                    ${area.title}
                </span>
            </div>
            <div class="area__info">
                <div class="area__info__inner">
                    <div class="area__info__img">
                        ${artistImageHTML}
                    </div>
                    <div class="area__info__name">
                        ${artistUrl ? `<a href="${artistUrl}" target="_blank" title="${artistName}">${artistName}</a>` : `<a>${artistName}</a>`}
                        ${area.post_url ? `<a href="${area.post_url}" target="_blank" title="View Post">[View Post]</a>` : ''}
                    </div>
                </div>
            </div>
        </li>`
        areaList.innerHTML += html
    }
}

/** Creates a rectangular fill relative to a PIXIjs graphic (effectively its outline) */
function UpdateFill(graphic, areaBox) {
    if (!bordersDisabled) { // Outline properties
        graphic.beginFill(0xffffff, 0)
        graphic.lineStyle(4, 0xffffff, 0.5, 1, false)
        graphic.drawRect(areaBox.x, areaBox.y, areaBox.width, areaBox.height);
        graphic.endFill()
    }
}

/** Creates PIXI Graphics corresponding to new and old versions of an area. */
function generateAreaZone (area, areaImage) {
    if (!area) { console.error('oopsie, no area'); return }
    if (!areaImage) { console.error('oopsie, no area image'); return }
    var oldZone = new PIXI.Graphics();
    oldZone.name = `ZONE: ${area.ident} (${OLD_STYLE_NAME})`;
    var areaBox = getAreaBox(area, areaImage, OLD_STYLE_NAME);
    UpdateFill(oldZone, areaBox);
    oldZone.alpha = 0;
    area.old_zone = oldZone;
    mapZones.addChild(oldZone);

    var newZone = new PIXI.Graphics();
    newZone.name = `ZONE: ${area.ident} (${NEW_STYLE_NAME})`;
    areaBox = getAreaBox(area, areaImage, NEW_STYLE_NAME);
    UpdateFill(newZone, areaBox);
    newZone.alpha = 0;
    area.new_zone = newZone;
    mapZones.addChild(newZone);
}

function hideAreaZone (area) {
    if (!area) { console.error('oopsie, no area'); return }
    area.old_zone.alpha = 0
    area.new_zone.alpha = 0
}

function showAreaZone (area) {
    if (!area) { console.error('oopsie, no area'); return }
    if (currentMapStyle === NEW_STYLE_NAME) {
        area.old_zone.alpha = 0
        area.new_zone.alpha = 1
    } else {
        area.old_zone.alpha = 1
        area.new_zone.alpha = 0
    }
}

function updateActiveAreaZone () {
    var activeArea = getActiveArea()
    if (activeArea) {
        showAreaZone(activeArea.obj)
    }
}

/** Gets the position of an area's box, 
 * with an optional offset applied to 'redrawn' maps to accomodate bleeds and stylistic extensions. 
 * Uses source image for width/height properties.
 * 
 * @param {*} area The struct describing the area.
 * @param {*} areaImage The image used for this area.
 * @param {string} styleOverride Forces the returned box dimensions to be based on a particular style, if defined.
 * */
function getAreaBox (area, areaImage, styleOverride = "") {
    if (!area) { console.error('oopsie, no area'); return }

    // Use current style or override?
    var style = styleOverride === "" ? currentMapStyle : styleOverride;
    
    if (style === NEW_STYLE_NAME) {
        return {x: area.point.x + area.offset.x, y: area.point.y + area.offset.y, width: areaImage.naturalWidth + area.offset.width, height: areaImage.naturalHeight + area.offset.height}
    } else {
        return {x: area.point.x, y: area.point.y, width: areaImage.naturalWidth, height: areaImage.naturalHeight}
    }
}

/** Gets the image associated with the provided area for the active layer. */
function getAreaImage(area, styleOverride = "") {
    var activeImages = getActiveLayerAreaImages(styleOverride);
    var imageIndex = activeAreas.indexOf(area);
    return activeImages[imageIndex];
}

/** Actions peformed on update (each frame). */
function tick () {
    viewport.filters = []
    if (cameraAnimation.progress >= 1) {
        cameraAnimation.playing = false
        cameraAdjustment.progress = 1;
    }
    if (!cameraAnimation.playing) {
        if (zoomLevel !== currentZoom) {
            if (!blurIsDisabled()) {
                viewport.filters = [blurFilter]
            }
            currentZoom = lerp(currentZoom, zoomLevel, 0.2)
            if (Math.abs(zoomLevel - currentZoom) < 0.005) { // Floating point rounding
                currentZoom = zoomLevel
                map.x = currentPos.x = zoomCenter.x; 
                map.y = currentPos.y = zoomCenter.y;
            }
            map.scale.set(currentZoom)

            blurFilter.strength = .2 * (Math.abs((currentZoom - zoomLevel)) / zoomLevel)
            blurFilter.center = [ zoomMousePos.x, zoomMousePos.y ]
        }
        if (!mouseDown && (dragVelocity.x !== 0 || dragVelocity.y !== 0)) {
            if (dragVelocity.x !== 0) {
                map.x += Math.round(dragVelocity.x)
                dragVelocity.x = dragVelocity.x * .9
                if (Math.abs(dragVelocity.x) < 1) { dragVelocity.x = 0 }
            }
            if (dragVelocity.y !== 0) {
                map.y += Math.round(dragVelocity.y)
                dragVelocity.y = dragVelocity.y * .9
                if (Math.abs(dragVelocity.y) < 1) { dragVelocity.y = 0 }
            }
            currentZoom.x = zoomCenter.x = map.x
            currentZoom.y = zoomCenter.y = map.y
        } else if (!mouseDown && (currentPos.x !== zoomCenter.x || currentPos.y !== zoomCenter.y)) {
            var newx = lerp(currentPos.x, zoomCenter.x, 0.2)
            var newy = lerp(currentPos.y, zoomCenter.y, 0.2)
            currentPos = { x: newx, y: newy }
            map.x = currentPos.x
            map.y = currentPos.y
        }
        if (pinchForTick) {
            instantZoom(pinchForTick.factor, pinchForTick.x, pinchForTick.y)
            if (map.scale.x < zoomMax && map.scale.x > zoomMin) {
                if (!blurIsDisabled()) {
                    viewport.filters = [blurFilter]
                }
                blurFilter.strength = .1
                blurFilter.center = [ pinchForTick.x, pinchForTick.y ]
            }
            pinchForTick = null
        }
        checkMapBoundaries()
        checkAutoHighlight()
    } else {

        // Calculate position and scale changes relative to a camera animation adjustment
        cameraAnimation.progress += cameraAnimation.speed
        // cameraAnimation.progress = ((cameraAnimation.progress * 100) + (cameraAnimation.speed * 100)) / 100
        var newScale = cameraAdjustment(cameraAnimation.startZoom, cameraAnimation.endZoom);
        var newPosX = cameraAdjustment(cameraAnimation.startPos.x, cameraAnimation.endPos.x);
        var newPosY = cameraAdjustment(cameraAnimation.startPos.y, cameraAnimation.endPos.y);
        map.scale.set(newScale)
        map.x = newPosX
        map.y = newPosY
    }

    if (tourMode) {
        if ((!cameraAnimation.playing || cameraAnimation.progress > (1 - (cameraAnimation.speed * 100))) && !tourTransition) {
            tourTransition = true
            tourFadeTimer = 100
        }
        if (tourTransition) {
            tourFadeTimer--
            colorFilter.alpha = tourFadeTimer / 100
            // map.alpha = tourFadeTimer / 100
        }
        if (tourTransition && tourFadeTimer <= 0) {
            tourFadeTimer = 0
            colorFilter.alpha = 0
            // map.alpha = 0
            newTourArea()
            tourTransition = false
        }
        if (!tourTransition && colorFilter.alpha < 1) {
            tourFadeTimer++
            colorFilter.alpha += .01
            // map.alpha += .01
        }
    }
    
    requestAnimationFrame(tick)
}

/** Calculate the current position of a camera adjustment. */
function cameraAdjustment(start, end) {
    return start + ((end - start) * 
        (cameraAnimation.easing ? easeInOutCubic(cameraAnimation.progress) : cameraAnimation.progress) );
}

/** Toggles active state of the menu, focusing on the active area. */
function toggleMenu () {
    var elem = document.querySelector('.menu')
    elem.classList.toggle('active')
    var activeArea = getActiveArea()
    if (activeArea) {
        openAreaInDOM(activeArea.obj)
    }
    
}

/** Opens the menu. */
function openMenu () {
    var elem = document.querySelector('.menu')
    elem.classList.add('active')
    var activeArea = getActiveArea()
    showAreaZone(activeArea.obj)
}

/** Checks DOM if blur is disabled. */
function blurIsDisabled () {
    return document.querySelector('#disableBlur').checked
}

/** Called when the area border visibility DOM is toggled.
 * 
 * @param isHidden {Boolean} whether the border should be hidden.
 */
function onAreaBorderToggled(isHidden) {
    bordersDisabled = isHidden;
    RegenerateAreaZones();
}

/** Callback occurring when a drag action starts. */
function onDragStart () {
    previousTouch = null
    previousPinchDistance = 0
    mouseDown = true
    dragVelocity = { x: 0, y: 0 }
}

/** Callback occurring when a drag action ends. */
function onDragEnd () {
    previousTouch = null
    previousPinchDistance = 0
    mouseDown = false
    dragging = false
}

/** Changes a menu tab. */
function changeTab (n) {
    var tabs = document.querySelectorAll('.menu__tab')
    var elems = document.querySelectorAll('.menu__content >*')
    for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i]
        tab.classList.remove('active')
        elems[i].classList.remove('active')
    }
    tabs[n].classList.add('active')
    elems[n].classList.add('active')
    elems.children
}

function onClick (e) {
    if (!dragging && !cameraAnimation.playing) {
        zoomCenter = { x: Math.round(-(e.data.global.x - map.x) + window.innerWidth / 2), 
                        y: Math.round(-(e.data.global.y - map.y) + window.innerHeight / 2) }
        currentPos = { x: map.x, y: map.y }
        dragVelocity = { x: 0, y: 0 }
    }
}

/** Callback occurring when a drag move occurs */
function onDragMove (e) {
    if (mouseDown && !cameraAnimation.playing) {
        if (e.data.originalEvent.type === 'touchmove' && e.data.originalEvent.touches && e.data.originalEvent.touches.length === 2) {
            var touches = e.data.originalEvent.touches
            var pinchX = touches[0].pageX - touches[1].pageX
            var pinchY = touches[0].pageY - touches[1].pageY
            var currentPinchDistance = Math.sqrt((pinchX * pinchX) + (pinchY * pinchY))
            // console.log(currentPinchDistance, currentPinchDistance > previousPinchDistance ? 'Zoom In' : 'Zoom Out')
            
            if (previousPinchDistance) {
                var diff = Math.abs(currentPinchDistance - previousPinchDistance)
                if (diff > 1) {
                    // Set x and y positions relative to pinch middle
                    if (currentPinchDistance > previousPinchDistance) { // Zoom / Pinch outwards
                        pinchForTick = {
                            factor: 1.06,
                            x: touches[0].pageX - (pinchX / 2),
                            y: touches[0].pageY - (pinchY / 2),
                        }
                    }
                    if (currentPinchDistance < previousPinchDistance) { // Zoom / Pinch inwards
                        pinchForTick = {
                            factor: .94,
                            x: touches[0].pageX - (pinchX / 2),
                            y: touches[0].pageY - (pinchY / 2),
                        }
                    }
                }
                
            }
            previousPinchDistance = currentPinchDistance
        } 
        dragging = true
        var velocityX = 0
        var velocityY = 0
        if (e.data.originalEvent.type === 'touchmove') {
            var touch = e.data.originalEvent.touches[0]
            if (previousTouch && touch) {
                velocityX = touch.pageX - previousTouch.pageX
                velocityY = touch.pageY - previousTouch.pageY
            }
            previousTouch = touch || null
        } else {
            velocityX = e.data.originalEvent.movementX
            velocityY = e.data.originalEvent.movementY
        }
        dragVelocity = { x: velocityX, y: velocityY }
        map.x += dragVelocity.x
        map.y += dragVelocity.y
        zoomCenter = { x: map.x, y: map.y }
        currentPos = zoomCenter
        
        checkMapBoundaries()
    }
}


/** Callback occurring when the mousewheel is rotated.
 * (TODO: would like to support this functionality on the trackpad, too, if it doesn't already)
 * 
 * @param {*} e Event data relating to the mouse wheel action.
 */
function onMouseWheel (e) {

    if (e.target.id === 'canvas') {
        zoomMousePos = { x: e.x, y: e.y }
        if (!mouseDown && !cameraAnimation.playing) {
            var zoomAmount = e.deltaY < 0 ? 2 : .5
            if ((zoomLevel > zoomMin && e.deltaY > 0) || (zoomLevel < zoomMax && e.deltaY < 0)) {
                
                currentPos = {...zoomCenter}
                dragVelocity = { x: 0, y: 0 }

                zoom(zoomAmount, e.x, e.y)
            }
        }
    }
}

/** Prepare to zoom to a particular scale focused around a point. */
function zoom(s,x,y){

    if (currentZoom !== zoomLevel) { 
        map.scale.set(zoomLevel); 
        currentZoom = zoomLevel 
        if (zoomCenter.x || zoomCenter.y) {
            map.x = zoomCenter.x; map.y = zoomCenter.y; 
        }
        
    }

    var worldPos = {x: (x - zoomCenter.x) / zoomLevel, y: (y - zoomCenter.y)/zoomLevel};
    var newScale = {x: zoomLevel * s, y: zoomLevel * s};
    zoomLevel = newScale.x
    checkZoomLimit()
    
    var newScreenPos = {x: (worldPos.x ) * newScale.x + zoomCenter.x, y: (worldPos.y) * newScale.y + zoomCenter.y};

    zoomCenter.x = zoomCenter.x - (newScreenPos.x-x)
    zoomCenter.y = zoomCenter.y - (newScreenPos.y-y)
}

/** Immediately zoom to a particular scale focused around a point. */
function instantZoom(s,x,y){

    // Perform the requested zoom

    var lastZoomLevel = zoomLevel;
    zoom(s,x,y);

    // Don't bother continuing the operation if the zoom level didn't change
    if (lastZoomLevel != zoomLevel) 
    {
        // Immediately lock in the target zoom values
        map.scale.set(zoomLevel)
        currentZoom = zoomLevel
        currentPos = {... zoomCenter}

        // console.log(zoomCenter)

        map.x = zoomCenter.x
        map.y = zoomCenter.y

        checkMapBoundaries()
    }
}

function moveCameraTo (x, y, zoom, camAnimationSpeed, useEasing) {
    dragVelocity.x = dragVelocity.y = 0
    cameraAnimation.speed = camAnimationSpeed
    cameraAnimation.easing = useEasing
    cameraAnimation.startPos = { x: map.x, y: map.y }
    cameraAnimation.startZoom = map.scale.x
    cameraAnimation.endZoom = zoom || cameraAnimation.startZoom

    var position = screenToMap(x,y,zoom)

    cameraAnimation.endPos = { x: position.x, y: position.y }
    cameraAnimation.playing = true
    cameraAnimation.progress = 0
    currentZoom = cameraAnimation.endZoom 
    zoomLevel = cameraAnimation.endZoom
    currentPos.x = cameraAnimation.endPos.x
    zoomCenter.x = cameraAnimation.endPos.x
    currentPos.y = cameraAnimation.endPos.y
    zoomCenter.y = cameraAnimation.endPos.y
}

function snapCameraTo (x, y, zoom) {
    dragVelocity.x = dragVelocity.y = 0

    var position = screenToMap(x,y,zoom)

    currentZoom = zoom 
    zoomLevel = zoom
    map.scale.set(zoom)
    currentPos.x = position.x
    zoomCenter.x = position.x
    currentPos.y = position.y
    zoomCenter.y = position.y
    map.x = position.x
    map.y = position.y
}

/** Focus on a specified area.
 * accepts name string and object
 */
function focusOnArea (a) {
    if (tourMode) {
        endTour()
    }
    var area = a
    if (typeof a === 'string') {
        area = activeAreas.find(x => x.title === a)
    }
    for (var i = 0; i < activeAreas.length; i++) {
        hideAreaZone(activeAreas[i])
    }
    var isGoodToFocus = true
    showAreaZone(area)
    var elems = document.querySelectorAll(`#areas li`)
    if (elems.length > 0) {
        for (var i = 0; i < elems.length; i++) {
            var elem = elems[i]
            if (area.title === elem.title) {
                if (elem.classList.contains('active')) {
                    elem.classList.remove('active')
                    hideAreaZone(area)
                    isGoodToFocus = false
                } else {
                    elem.classList.add('active')
                }
                
            } else {
                elem.classList.remove('active')
            }       
        }
    }
    
    if (isGoodToFocus) {
        var areaImage = getAreaImage(area);
        var box = getAreaBox(area, areaImage);
        moveCameraTo(box.x + Math.floor(box.width / 2), box.y + Math.floor(box.height / 2), area.zoom, cameraSpeed, true);
    }
}

/** Opens an area in the DOM menu of the viewer. */
function openAreaInDOM (a) {
    var area = a
    if (typeof a === 'string') {
        area = activeAreas.find(x => x.title === a)
    }
    var elems = document.querySelectorAll(`.area`)
    if (elems.length > 0) {
        for (var i = 0; i < elems.length; i++) {
            var elem = elems[i]
            if (area.title === elem.title) {
                elem.classList.add('active')
                elem.scrollIntoView()
            } else {
                elem.classList.remove('active')
            }       
        }
    }

    updateMobileArtist(area);

}
function updateMobileArtist(area) {
    
    var artistData = GetArtistData(area.artistId);
    var artistImgPath = GetArtistImagePath(artistData);
    var areaArtist = artistData.name;
    var areaArtistUrl = artistData.url;
    document.querySelector('.artist_mobile').style.display = areaArtist === '' ? 'none' : isMenuOpen() ? 'none' : '';

    var containerName = document.querySelector('.artist_mobile .area__info__name');
    containerName.innerHTML = `
        ${areaArtistUrl ? `<a href="${areaArtistUrl}" target="_blank" title="${areaArtist}">${areaArtist}</a>` : `<a>${areaArtist}</a>`}
        ${area.post_url ? `<a href="${area.post_url}" target="_blank" title="View Post">[View Post]</a>` : ''}
    `;
    var containerImage = document.querySelector('.artist_mobile .area__info__img');
    var a = document.querySelector('.artist_mobile .area__info__img');
    a.innerHTML = `
        ${areaArtistUrl ? `<a href="${areaArtistUrl}" target="_blank" title="${areaArtist}">
                <img src="${artistImgPath}" alt="${areaArtist}" /></a>` : `<img src="${artistImgPath}" alt="${areaArtist}" />`}
    `;
    var image = document.querySelector('.artist_mobile .area__info__img img');

    containerImage.style.display = 'none';
    image.onload = function(){
        containerImage.style.display = '';
    }
    image.onerror = function(){
        containerImage.style.display = 'none';
    };
}

/** Event occurring when a keyboard key is pressed. */
function onKeyDown(evt) {

    if (evt.keyCode == 32) { // Space Bar
        document.querySelector("#mapSelectRedrawn").select();
    }
}

// #region Tour Methods

function toggleTour () {
    if (tourMode) {
        endTour()
    } else {
        initTour()
    }
}

function initTour () {
    const button = document.querySelector('#tourButton')
    button.innerHTML = '<span class="material-icons">stop</span> <span>End Tour</span>'
    button.classList.add('active')
    areasToTour = [...activeAreas]
    tourMode = true
    map.filters = [colorFilter]
    var activeArea = getActiveArea()
    if (activeArea) {
        hideAreaZone(activeArea.obj)
    }
}

function endTour () {
    const button = document.querySelector('#tourButton')
    button.innerHTML = '<span class="material-icons">play_arrow</span> <span>Begin Tour</span>'
    button.classList.remove('active')
    tourMode = false
    tourTransition = false
    tourFadeTimer = 100
    // map.alpha = 1
    colorFilter.alpha = 1
    map.filters = []
    cameraAnimation.playing = false
    var activeArea = getActiveArea()
    if (activeArea) {
        showAreaZone(activeArea.obj)
    }
}

function newTourArea () {
    var rnd = Math.floor(Math.random() * areasToTour.length)
    var area = areasToTour[rnd]
    var box = getAreaBox(area, getAreaImage(area));
    if (!area) { area = activeAreas[0] }
    if (areasToTour.length > 1) {
        areasToTour.splice(rnd, 1)
    } else {
        areasToTour = [...activeAreas]
    }
    openAreaInDOM(area)

    var centerX = (box.x + (box.width / 2))
    var centerY = (box.y + (box.height / 2))

    var startX = centerX
    var startY = centerY
    var endX = centerX
    var endY = centerY

    if (area.pan === 'horizontal') {
        if (box.height * 4 > window.innerHeight) {
            var range =  ((box.height * 4) - window.innerHeight) / 4
            startY = centerY + Math.round((Math.random() * range) - range / 2)
        }
        var range = ((box.width * 4) - window.innerWidth) / 4
        if (range <= 20) { range = 100 }
        startX = centerX + Math.round((Math.random() * range) - range / 2)
        var loop = 0
        while ((Math.abs(startX - endX) < 20 || Math.abs(startX - endX) > 230) && loop < 50) {
            endX = centerX + Math.round((Math.random() * range) - range / 2)
            loop++
        }
        
    }
    if (area.pan === 'vertical') {
        if (box.width * 4 > window.innerWidth) {
            var range = ((box.width * 4) - window.innerWidth) / 4
            startX = centerX + Math.round((Math.random() * range) - range / 2)
        }
        var range = ((box.height * 4) - window.innerHeight) / 4
        if (range <= 20) { range = 100 }
        startY = centerY + Math.round((Math.random() * range) - range / 2)
        var loop = 0
        while ((Math.abs(startY - endY) < 20 || Math.abs(startY - endY) > 230) && loop < 50) {
            endY = centerY + Math.round((Math.random() * range) - range / 2)
            loop++
        }
        
    }

    if (area.pan === 'horizontal') { endY = startY }
    if (area.pan === 'vertical') { endX = startX }

    snapCameraTo(Math.round(startX), Math.round(startY), 4)
    moveCameraTo(endX, endY, zoomMax, tourCameraSpeed, false);
}

// #endregion

/** Applies the closest pixel-perfect zoom level relative to the current zoom. */
function checkZoom () {
    checkZoomLimit();
    if (zoomLevel > 0.5 && zoomLevel < 1) { zoomLevel = 1 }
    if (zoomLevel < 0.5 && zoomLevel > zoomMin) { zoomLevel = 0.5 }
}

/** Caps the zoom level to the zoom extents. */
function checkZoomLimit () {
    if (zoomLevel <= zoomMin) { zoomLevel = zoomMin }
    if (zoomLevel >= zoomMax) { zoomLevel = zoomMax }
}

/** Caps map position to the window inner extents. */
function checkMapBoundaries () {
    if (map.x > Math.floor(window.innerWidth / 2)) { map.x = Math.floor(window.innerWidth / 2) }
    if (map.y > Math.floor(window.innerHeight / 2)) { map.y = Math.floor(window.innerHeight / 2) }
    if (map.x < Math.floor(window.innerWidth / 2) - map.width) { map.x = Math.floor(window.innerWidth / 2) - map.width }
    if (map.y < Math.floor(window.innerHeight / 2) - map.height) { map.y = Math.floor(window.innerHeight / 2) - map.height }
}

function checkAutoHighlight() {
    if (autoHighlight) {
        var mapPosition = screenToMapPoint({ x: app.renderer.width / 2, y: app.renderer.height / 2 }, map, currentZoom);
        if (isMenuOpen()) {
            mapPosition.x += (150 / currentZoom);//Offset when menu is open (which has a fixed width of 300px)
        }
        var area = getAreaOnPoint(mapPosition, activeAreas);
        if (area && highlightedArea != area) {
            // console.log(highlightedArea);
            highlightedArea = area;
            for (var i = 0; i < activeAreas.length; i++) {
                hideAreaZone(activeAreas[i])
            }
            showAreaZone(area);
            openAreaInDOM(area);
        }
    }
}

//#region Math

/** Basic LERP function. */
function lerp (start, end, amt){
    return (1-amt)*start+amt*end
}

function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

//#endregion

/** Fills an array with arrays */
function fillWithArrays(array) {
    for (var i = 0; i < array.length; i++) {
        array[i] = Array.apply(null, Array(0));
    }
    return array;
}

function screenToMap(x, y, zoom) {
    var width = isMenuOpen() ? window.innerWidth + 300 : window.innerWidth 
    var newX = -((x * zoom) - (width / 2))
    var newY = -((y * zoom) - (window.innerHeight / 2))
    return { x: newX, y: newY }
}

function isMenuOpen () {
    var elem = document.querySelector('.menu') 
    return elem.classList.contains('active')
}

function getActiveArea () {
    if (document.querySelector('#areas .area.active')) {
        var elem = document.querySelector('#areas .area.active')
        return { elem , obj: activeAreas.find(x => x.title === elem.title ) }
    }
}

/** Callback occurring when the window is resized. */
function onResize () {
    if(app && app.renderer) app.renderer.resize(window.innerWidth, window.innerHeight);
}

function changeCameraSpeed (e) {
    cameraSpeed = _defaultCameraSpeed * parseFloat(e)
    document.querySelector('#cameraSpeed + small').textContent = `${e}x`
}

function changeTourCameraSpeed (e) {
    tourCameraSpeed = _defaultTourCameraSpeed * parseFloat(e)
    document.querySelector('#tourCameraSpeed + small').textContent = `${e}x`
}

/** Changes the currently active layer.
 * 
 * @param {string} layer String name of the layer to change to.
 */
function changeLayer (layer) {

    // Find and switch layer
    var layerCount = this.layerCount;
    for (var i=0; i< layerCount; i++) {
        if (layer === this.redrawnLayers[i].name) {
            this.activeLayerIndex = i;
            this.activeAreas = this.redrawnLayers[i].areas;
            this.canvasDimensions = this.redrawnLayers[i].canvasSize;
            break;
        }
    }

    // Adjust tab visibility
    const tabs = document.querySelectorAll('#layers li button')
    let activeLayerName = this.redrawnLayers[this.activeLayerIndex].name;
    tabs.forEach((x) => { if (!x.classList.contains(activeLayerName)) {x.classList.remove('active')} else {x.classList.add('active')} })
    this.setupCanvas()
    
    // Adjust canvas focus
    this.focusOnArea(this.activeAreas[Math.floor(Math.random() * layerCount)])
}