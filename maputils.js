
function screenToMapPoint(screenPoint, map, currentZoom) {
    return {
        x: (screenPoint.x - map.x) / currentZoom,
        y: (screenPoint.y - map.y) / currentZoom,
    };
}

function getAreaOnPoint(point, activeAreas) {
    for (var i = 0; i < activeAreas.length; i++) {
        var area = activeAreas[i];
        if (point.x > area.point.x &&
            point.y > area.point.y &&
            point.x < area.point.x + area.new_zone.width &&
            point.y < area.point.y + area.new_zone.height) {
            return area;
        }
    }
}
