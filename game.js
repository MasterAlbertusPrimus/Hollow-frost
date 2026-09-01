/*

* ============================================================
* HOLLOW FROST — GAME
* ============================================================
*
* LEVEL CONFIGURATION
* ============================================================
*
* Normally you do NOT need to change anything here.
*
* The level is selected through:
*
* ```
  game.html?level=1
  ```
*
* or:
*
* ```
  game.html?level=2
  ```
*
* ============================================================
  */

const params = new URLSearchParams(window.location.search);

/*

* Level number from the URL.
*
* If no level is supplied, level 1 is used.
  */
  const LEVEL_NUMBER = Number.parseInt(params.get("level") || "1", 10);

/*

* JSON file containing the level.
  */
  const LEVEL_FILE = `./levels/level_${LEVEL_NUMBER}.json`;

/*

* ============================================================
* LOAD LEVEL
* ============================================================
  */

async function loadLevel() {
try {
const response = await fetch(LEVEL_FILE);
    if (!response.ok) {
        throw new Error(
            `Could not load ${LEVEL_FILE} (${response.status})`
        );
    }

    const WORLD_DATA = await response.json();

    /*
     * Make the loaded level available to the game.
     *
     * Your existing game code can use WORLD_DATA exactly
     * like it previously used LEVEL_1_DATA / LEVEL_2_DATA.
     */
    window.WORLD_DATA = WORLD_DATA;

    /*
     * Optional global information.
     */
    window.CURRENT_LEVEL_NUMBER = LEVEL_NUMBER;

    /*
     * Start the actual game.
     *
     * When we move your existing code into this file,
     * the existing game initialization will go here.
     */
    startGame(WORLD_DATA);

} catch (error) {
    console.error("Hollow Frost level loading error:", error);

    document.body.innerHTML = `
        <div style="
            width:100vw;
            height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            flex-direction:column;
            gap:16px;
            background:#071426;
            color:#e8f4ff;
            font-family:system-ui,sans-serif;
            text-align:center;
        ">
            <h1>Level could not be loaded</h1>

            <p style="color:#9db3d6">
                ${LEVEL_FILE}
            </p>

            <a
                href="./levels.html"
                style="
                    color:#071426;
                    background:#8fd6ff;
                    padding:12px 24px;
                    border-radius:999px;
                    text-decoration:none;
                    font-weight:700;
                "
            >
                Back to Levels
            </a>
        </div>
    `;
}

}

/*

* ============================================================
* GAME INITIALIZATION
* ============================================================
*
* When we move the rest of your existing game.js here,
* this function becomes the entry point.
* ============================================================
  */

function startGame(WORLD_DATA) {

console.log("Loaded Hollow Frost level:", LEVEL_NUMBER);
// Zone name lookup by room-grid coordinate (gx,gy), matching WORLD_DATA's
        // coordinate space (gx*ROOM_W*TILE, gy*ROOM_H*TILE)
        var ZONE_NAMES = {
            '0,0': 'Foothold Caverns',
            '1,0': 'Foothold Caverns',
            '2,0': 'Foothold Caverns',
            '0,1': 'Foothold Caverns',
            '0,2': 'Sunken Hollows',
            '-1,2': 'Sunken Hollows',
            '0,3': 'Sunken Hollows',
            '0,4': 'Sunken Hollows',
            '1,4': 'Ember Depths',
            '2,4': 'Ember Depths',
            '2,3': 'Frozen Spire',
            '2,2': 'Frozen Spire',
            '3,2': 'Frozen Spire'
        };

        (function() {
            var canvas = document.getElementById('c');
            var ctx = canvas.getContext('2d');
            var overlay = document.getElementById('overlay');
            var titleText = document.getElementById('titleText');
            var subText = document.getElementById('subText');
            var legendEl = document.querySelector('#overlay .legend');
            var statLine = document.getElementById('statLine');
            var startBtn = document.getElementById('startBtn');
            var zoneNameEl = document.getElementById('zoneName');
            var livesArea = document.getElementById('livesArea');
            var pickupToast = document.getElementById('pickupToast');
            var mobileControls = document.getElementById('mobileControls');
            var btnLeft = document.getElementById('btnLeft');
            var btnRight = document.getElementById('btnRight');
            var btnJump = document.getElementById('btnJump');
            var btnDash = document.getElementById('btnDash');

            var isTouch = 'ontouchstart' in window;
            if (isTouch) mobileControls.classList.add('show');

            // ============================================================
            // LEVEL EDITOR
            // Secret activation sequence: E D I T
            // ============================================================

            var editorPanel = document.getElementById('editorPanel');
            var editorBadge = document.getElementById('editorModeBadge');
            var editorSelected = document.getElementById('editorSelected');
            var worldDataOutput = document.getElementById('worldDataOutput');
            var copyWorldDataBtn = document.getElementById('copyWorldData');
            var refreshWorldDataBtn = document.getElementById('refreshWorldData');
            var zoomLabel = document.getElementById('zoomLabel');
            var editorFieldsEl = document.getElementById('editorFields');

            var EDIT_SEQUENCE = ['e', 'd', 'i', 't'];
            var editSequence = [];
            var editMode = false;
            var editorDragging = false;
            var editorResizing = false;
            var editorPanning = false;

            var editorDragOffsetX = 0;
            var editorDragOffsetY = 0;
            var editorStartX = 0;
            var editorStartY = 0;
            var editorStartW = 0;
            var editorStartH = 0;
            var editorDragOrig = null;
            var editorRotating = false;
            var editorRotateCenter = null;
            var editorRotateStartAngle = 0;
            var editorRotateStartRot = 0;
            var panStartX = 0,
                panStartY = 0,
                panCamStartX = 0,
                panCamStartY = 0;

            var GRID_SIZE = 8;
            var BASE_ZOOM = 2.4;

            function snap(v) {
                return Math.round(v / GRID_SIZE) * GRID_SIZE;
            }

            // ---- Multi-layer entity editing ----
            // Every layer in WORLD_DATA can be selected/added/deleted/edited.
            // 'box' layers have {x,y,w,h}; 'point' layers are edited via a
            // fixed-size virtual handle centered on {x,y}.
            var LAYER_DEFS = {
                solids: {
                    shape: 'box',
                    rotatable: true,
                    makeDefault: function(cx, cy) {
                        return { x: cx - 16, y: cy - 8, w: 32, h: 16, rot: 0 };
                    }
                },
                platforms: {
                    shape: 'box',
                    rotatable: true,
                    makeDefault: function(cx, cy) {
                        return { x: cx - 32, y: cy - 3, w: 64, h: 6, rot: 0 };
                    }
                },
                spikes: {
                    shape: 'box',
                    rotatable: true,
                    makeDefault: function(cx, cy) {
                        return { x: cx - 8, y: cy - 8, w: 16, h: 16, color: '#ff5c5c', rot: 0 };
                    }
                },
                breakables: {
                    shape: 'box',
                    rotatable: true,
                    makeDefault: function(cx, cy) {
                        return { x: cx - 8, y: cy - 8, w: 16, h: 16, broken: false, rot: 0 };
                    }
                },
                items: {
                    shape: 'point',
                    makeDefault: function(cx, cy) {
                        return { id: 'ability_doubleJump', x: cx, y: cy, taken: false };
                    }
                },
                crystals: {
                    shape: 'point',
                    makeDefault: function(cx, cy) {
                        return { x: cx, y: cy, id: 'c_' + Date.now() };
                    }
                },
                enemies: {
                    shape: 'point',
                    makeDefault: function(cx, cy) {
                        return { type: 'walker', x: cx, y: cy, homeX: cx, range: [cx - 40, cx + 40] };
                    }
                }
            };
            var POINT_HANDLE = 10;

            var currentLayer = 'solids';
            var selectedIndex = -1;

            function currentArray() {
                return WORLD_DATA[currentLayer];
            }

            function entityBox(layer, e) {
                if (layer === 'enemies') {
                    // Enemies are rendered with (x,y) as their sprite's
                    // top-left corner (a 12x12 box), not a center point
                    // like items/crystals - pad it a little for an easier
                    // click target while still tracking the real sprite.
                    var pad = 4;
                    return {
                        x: e.x - pad,
                        y: e.y - pad,
                        w: 12 + pad * 2,
                        h: 12 + pad * 2
                    };
                }
                if (LAYER_DEFS[layer].shape === 'point') {
                    return {
                        x: e.x - POINT_HANDLE,
                        y: e.y - POINT_HANDLE,
                        w: POINT_HANDLE * 2,
                        h: POINT_HANDLE * 2
                    };
                }
                return { x: e.x, y: e.y, w: e.w, h: e.h };
            }

            // Keep the derived runtime state (liveSolids/liveBreakables/enemyState)
            // in sync after an editor edit to whichever layer just changed.
            function syncLayerRuntime(layer) {
                if (layer === 'breakables') {
                    liveBreakables = WORLD_DATA.breakables.map(function(b) {
                        return Object.assign({}, b);
                    });
                }
                if (layer === 'solids' || layer === 'breakables') {
                    rebuildEditorWorld();
                }
                if (layer === 'platforms') {
                    syncAABBList(WORLD_DATA.platforms);
                }
                if (layer === 'spikes') {
                    syncAABBList(WORLD_DATA.spikes);
                }
                if (layer === 'enemies') {
                    resetEnemies();
                }
            }

            function rebuildEditorWorld() {
                liveSolids = WORLD_DATA.solids.slice();

                liveBreakables.forEach(function(b) {
                    if (!b.broken) {
                        liveSolids.push(b);
                    }
                });

                syncAABBList(liveSolids);
                world.solids = liveSolids;
            }

            function updateWorldDataOutput() {
                if (!worldDataOutput) return;

                var output = JSON.parse(JSON.stringify(WORLD_DATA));

                output.solids = WORLD_DATA.solids.map(function(s) {
                    return {
                        x: Math.round(s.x),
                        y: Math.round(s.y),
                        w: Math.round(s.w),
                        h: Math.round(s.h),
                        rot: Math.round(s.rot)
                    };
                });

                worldDataOutput.value = JSON.stringify(output, null, 2);
            }

            function layerSingular(layer) {
                return layer.slice(0, 1).toUpperCase() + layer.slice(1, layer.length - 1);
            }

            function updateSelectedSummary() {
                var arr = currentArray();
                var ent = selectedIndex >= 0 ? arr[selectedIndex] : null;

                if (!ent) {
                    editorSelected.textContent = 'No ' + currentLayer.slice(0, currentLayer.length - 1) + ' selected';
                    return;
                }

                var txt = layerSingular(currentLayer) + ' #' + selectedIndex +
                    '  |  x:' + Math.round(ent.x) + ' y:' + Math.round(ent.y);

                if (ent.w !== undefined) {
                    txt += '  w:' + Math.round(ent.w) + ' h:' + Math.round(ent.h);
                    if (ent.rot) txt += '  rot:' + Math.round(ent.rot) + 'Â°';
                }

                editorSelected.textContent = txt;
            }

            var ROW_IDS = {
                x: 'rowX', y: 'rowY', w: 'rowW', h: 'rowH', rot: 'rowRot',
                itemId: 'rowItemId', crystalId: 'rowCrystalId',
                enemyType: 'rowEnemyType', homeX: 'rowHomeX',
                rangeMin: 'rowRangeMin', rangeMax: 'rowRangeMax',
                color: 'rowColor', broken: 'rowBroken'
            };

            function fieldsForLayer(layer) {
                switch (layer) {
                    case 'solids':
                    case 'platforms':
                        return ['x', 'y', 'w', 'h', 'rot'];
                    case 'spikes':
                        return ['x', 'y', 'w', 'h', 'rot', 'color'];
                    case 'breakables':
                        return ['x', 'y', 'w', 'h', 'rot', 'broken'];
                    case 'items':
                        return ['x', 'y', 'itemId'];
                    case 'crystals':
                        return ['x', 'y', 'crystalId'];
                    case 'enemies':
                        return ['x', 'y', 'enemyType', 'homeX', 'rangeMin', 'rangeMax'];
                }
                return [];
            }

            function setFieldIfNotFocused(id, value) {
                var el = document.getElementById(id);
                if (document.activeElement === el) return;
                el.value = value;
            }

            function refreshEditorUI() {
                updateSelectedSummary();

                var arr = currentArray();
                var ent = selectedIndex >= 0 ? arr[selectedIndex] : null;

                if (!ent) {
                    editorFieldsEl.classList.add('hidden');
                } else {
                    editorFieldsEl.classList.remove('hidden');

                    Object.keys(ROW_IDS).forEach(function(k) {
                        document.getElementById(ROW_IDS[k]).classList.add('hidden');
                    });

                    fieldsForLayer(currentLayer).forEach(function(k) {
                        document.getElementById(ROW_IDS[k]).classList.remove('hidden');
                    });

                    setFieldIfNotFocused('fldX', Math.round(ent.x));
                    setFieldIfNotFocused('fldY', Math.round(ent.y));
                    if (ent.w !== undefined) {
                        setFieldIfNotFocused('fldW', Math.round(ent.w));
                        setFieldIfNotFocused('fldH', Math.round(ent.h));
                        setFieldIfNotFocused('fldRot', Math.round(ent.rot || 0));
                    }
                    if (currentLayer === 'items') setFieldIfNotFocused('fldItemId', ent.id);
                    if (currentLayer === 'crystals') setFieldIfNotFocused('fldCrystalId', ent.id);
                    if (currentLayer === 'enemies') {
                        setFieldIfNotFocused('fldEnemyType', ent.type);
                        setFieldIfNotFocused('fldHomeX', Math.round(ent.homeX));
                        setFieldIfNotFocused('fldRangeMin', Math.round(ent.range[0]));
                        setFieldIfNotFocused('fldRangeMax', Math.round(ent.range[1]));
                    }
                    if (currentLayer === 'spikes') setFieldIfNotFocused('fldColor', ent.color || '#ff5c5c');
                    if (currentLayer === 'breakables') document.getElementById('fldBroken').checked = !!ent.broken;
                }

                updateWorldDataOutput();
            }

            function addEntity() {
                var def = LAYER_DEFS[currentLayer];
                var arr = currentArray();
                var cx = snap(camera.x);
                var cy = snap(camera.y);

                arr.push(def.makeDefault(cx, cy));
                selectedIndex = arr.length - 1;

                syncLayerRuntime(currentLayer);
                refreshEditorUI();
            }

            function deleteSelected() {
                if (selectedIndex < 0) return;

                currentArray().splice(selectedIndex, 1);
                selectedIndex = -1;

                syncLayerRuntime(currentLayer);
                refreshEditorUI();
            }

            function setEditorMode(enabled) {
                editMode = enabled;

                editorPanel.classList.toggle('hidden', !enabled);
                editorBadge.classList.toggle('hidden', !enabled);

                selectedIndex = -1;
                editorDragging = false;
                editorResizing = false;
                editorPanning = false;
                editorRotating = false;

                if (enabled) {
                    // Stop the player moving while editing.
                    keys.left = false;
                    keys.right = false;
                    keys.down = false;
                    keys.jumpHeld = false;
                    keys.dash = false;

                    refreshEditorUI();
                } else {
                    setZoom(BASE_ZOOM);
                    if (player) {
                        camera.x = player.x;
                        camera.y = player.y;
                    }
                }
            }

            function toggleEditor() {
                setEditorMode(!editMode);
            }

            // Convert screen coordinates into world coordinates.
            function editorScreenToWorld(clientX, clientY) {
                var rect = canvas.getBoundingClientRect();

                // Canvas CSS coordinates.
                var sx = clientX - rect.left;
                var sy = clientY - rect.top;

                // draw() uses:
                //
                // translate(vw / 2 - camera.x, vh / 2 - camera.y)
                //
                // where vw = W / ZOOM and vh = H / ZOOM.
                //
                // Therefore:
                var worldX = camera.x + (sx / ZOOM) - (W / ZOOM) / 2;
                var worldY = camera.y + (sy / ZOOM) - (H / ZOOM) / 2;

                return {
                    x: worldX,
                    y: worldY
                };
            }

            function getEntityAt(x, y) {
                var arr = currentArray();

                // Search backwards so later/drawn-on-top entities are selected first.
                for (var i = arr.length - 1; i >= 0; i--) {
                    var b = entityBox(currentLayer, arr[i]);

                    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                        return i;
                    }
                }

                return -1;
            }

            function isOverResizeHandle(x, y, b) {
                var handleSize = 7;

                return (
                    x >= b.x + b.w - handleSize &&
                    x <= b.x + b.w + handleSize &&
                    y >= b.y + b.h - handleSize &&
                    y <= b.y + b.h + handleSize
                );
            }

            // The rotate handle floats a fixed distance "above" the shape's
            // own center, rotated along with it - so it's always reachable
            // regardless of current rotation.
            function rotateHandleDist(s) {
                return Math.max(24, Math.min(s.w, s.h) / 2 + 20);
            }

            function getRotateHandlePos(s) {
                var cx = s.x + s.w / 2;
                var cy = s.y + s.h / 2;
                var rad = (s.rot || 0) * Math.PI / 180;
                var dist = rotateHandleDist(s);

                // Local point (0, -dist) rotated by rad.
                var hx = cx - (-dist) * Math.sin(rad);
                var hy = cy + (-dist) * Math.cos(rad);

                return { x: hx, y: hy, cx: cx, cy: cy };
            }

            function editorMouseDown(e) {
                if (!editMode) return;

                if (e.button === 2) {
                    editorPanning = true;
                    panStartX = e.clientX;
                    panStartY = e.clientY;
                    panCamStartX = camera.x;
                    panCamStartY = camera.y;
                    e.preventDefault();
                    return;
                }

                if (e.button !== 0) return;

                var pos = editorScreenToWorld(e.clientX, e.clientY);
                var arr = currentArray();
                var def = LAYER_DEFS[currentLayer];

                if (selectedIndex >= 0 && arr[selectedIndex] && def.shape === 'box' && def.rotatable) {
                    var rh = getRotateHandlePos(arr[selectedIndex]);
                    var rdx = pos.x - rh.x;
                    var rdy = pos.y - rh.y;

                    // Hit radius is in world units, so it shrinks/grows on
                    // screen with zoom - fine, the handle itself is drawn
                    // in world space too.
                    if (rdx * rdx + rdy * rdy <= 64) {
                        editorRotating = true;
                        editorRotateCenter = { x: rh.cx, y: rh.cy };
                        editorRotateStartAngle = Math.atan2(pos.y - rh.cy, pos.x - rh.cx);
                        editorRotateStartRot = arr[selectedIndex].rot || 0;
                        e.preventDefault();
                        return;
                    }
                }

                if (selectedIndex >= 0 && arr[selectedIndex] && def.shape === 'box') {
                    var box = entityBox(currentLayer, arr[selectedIndex]);

                    if (isOverResizeHandle(pos.x, pos.y, box)) {
                        editorResizing = true;

                        editorStartX = pos.x;
                        editorStartY = pos.y;
                        editorStartW = arr[selectedIndex].w;
                        editorStartH = arr[selectedIndex].h;

                        e.preventDefault();
                        return;
                    }
                }

                var hit = getEntityAt(pos.x, pos.y);

                if (hit >= 0) {
                    selectedIndex = hit;

                    var ent = arr[hit];

                    editorDragging = true;
                    editorDragOffsetX = pos.x - ent.x;
                    editorDragOffsetY = pos.y - ent.y;
                    editorDragOrig = {
                        x: ent.x,
                        y: ent.y,
                        homeX: ent.homeX,
                        range: ent.range ? ent.range.slice() : null
                    };

                    refreshEditorUI();
                    e.preventDefault();
                } else {
                    selectedIndex = -1;
                    editorDragging = false;
                    editorResizing = false;

                    refreshEditorUI();
                }
            }

            function editorMouseMove(e) {
                if (!editMode) return;

                if (editorPanning) {
                    camera.x = panCamStartX - (e.clientX - panStartX) / ZOOM;
                    camera.y = panCamStartY - (e.clientY - panStartY) / ZOOM;
                    e.preventDefault();
                    return;
                }

                if (editorRotating) {
                    if (selectedIndex < 0) return;

                    var rotArr = currentArray();
                    var rotEnt = rotArr[selectedIndex];
                    if (!rotEnt || !editorRotateCenter) return;

                    var rotPos = editorScreenToWorld(e.clientX, e.clientY);
                    var angle = Math.atan2(rotPos.y - editorRotateCenter.y, rotPos.x - editorRotateCenter.x);
                    var deltaDeg = (angle - editorRotateStartAngle) * 180 / Math.PI;
                    var newRot = editorRotateStartRot + deltaDeg;

                    if (!e.altKey) newRot = Math.round(newRot / 15) * 15; // snap to 15Â°

                    rotEnt.rot = ((newRot % 360) + 360) % 360;

                    syncAABB(rotEnt);
                    syncLayerRuntime(currentLayer);
                    refreshEditorUI();
                    e.preventDefault();
                    return;
                }

                if (!editorDragging && !editorResizing) return;
                if (selectedIndex < 0) return;

                var arr = currentArray();
                var ent = arr[selectedIndex];
                if (!ent) return;

                var pos = editorScreenToWorld(e.clientX, e.clientY);
                var doSnap = !e.altKey;

                if (editorDragging) {
                    var nx = pos.x - editorDragOffsetX;
                    var ny = pos.y - editorDragOffsetY;

                    if (doSnap) {
                        nx = snap(nx);
                        ny = snap(ny);
                    }

                    ent.x = nx;
                    ent.y = ny;

                    if (currentLayer === 'enemies' && editorDragOrig) {
                        var totalDx = nx - editorDragOrig.x;
                        ent.homeX = editorDragOrig.homeX + totalDx;
                        ent.range = [
                            editorDragOrig.range[0] + totalDx,
                            editorDragOrig.range[1] + totalDx
                        ];
                    }
                }

                if (editorResizing) {
                    var w = editorStartW + (pos.x - editorStartX);
                    var h = editorStartH + (pos.y - editorStartY);

                    if (doSnap) {
                        w = snap(w);
                        h = snap(h);
                    }

                    ent.w = Math.max(4, w);
                    ent.h = Math.max(4, h);
                }

                syncLayerRuntime(currentLayer);
                refreshEditorUI();
                e.preventDefault();
            }

            function editorMouseUp() {
                editorDragging = false;
                editorResizing = false;
                editorPanning = false;
                editorRotating = false;
                editorRotateCenter = null;
                editorDragOrig = null;
            }

            canvas.addEventListener('mousedown', editorMouseDown);
            window.addEventListener('mousemove', editorMouseMove);
            window.addEventListener('mouseup', editorMouseUp);

            canvas.addEventListener('contextmenu', function(e) {
                if (editMode) e.preventDefault();
            });

            // ---- Zoom ----
            function applyCanvasTransform() {
                ctx.setTransform(DPR * ZOOM, 0, 0, DPR * ZOOM, 0, 0);
            }

            function setZoom(z) {
                ZOOM = Math.max(0.6, Math.min(6, z));
                applyCanvasTransform();
                zoomLabel.textContent = ZOOM.toFixed(1) + 'x';
            }

            canvas.addEventListener('wheel', function(e) {
                if (!editMode) return;
                e.preventDefault();
                setZoom(ZOOM * (e.deltaY < 0 ? 1.1 : 0.9));
            }, { passive: false });

            document.getElementById('zoomInBtn').addEventListener('click', function() {
                setZoom(ZOOM * 1.25);
            });
            document.getElementById('zoomOutBtn').addEventListener('click', function() {
                setZoom(ZOOM / 1.25);
            });

            // ---- Layer tabs ----
            var layerButtons = document.querySelectorAll('.layerBtn');
            for (var lb = 0; lb < layerButtons.length; lb++) {
                layerButtons[lb].addEventListener('click', function() {
                    for (var j = 0; j < layerButtons.length; j++) {
                        layerButtons[j].classList.remove('active');
                    }
                    this.classList.add('active');
                    currentLayer = this.getAttribute('data-layer');
                    selectedIndex = -1;
                    editorDragging = false;
                    editorResizing = false;
                    editorRotating = false;
                    refreshEditorUI();
                });
            }

            // ---- Add / Delete ----
            document.getElementById('addEntityBtn').addEventListener('click', addEntity);
            document.getElementById('deleteEntityBtn').addEventListener('click', deleteSelected);

            // ---- Field inputs ----
            function bindNumberField(id, applyFn) {
                document.getElementById(id).addEventListener('input', function() {
                    if (selectedIndex < 0) return;
                    var v = parseFloat(this.value);
                    if (isNaN(v)) return;
                    applyFn(currentArray()[selectedIndex], v);
                    syncLayerRuntime(currentLayer);
                    updateSelectedSummary();
                    updateWorldDataOutput();
                });
            }

            bindNumberField('fldX', function(e, v) { e.x = v; });
            bindNumberField('fldY', function(e, v) { e.y = v; });
            bindNumberField('fldW', function(e, v) { e.w = Math.max(4, v); });
            bindNumberField('fldH', function(e, v) { e.h = Math.max(4, v); });
            bindNumberField('fldRot', function(e, v) { e.rot = ((v % 360) + 360) % 360; });
            bindNumberField('fldHomeX', function(e, v) { e.homeX = v; });
            bindNumberField('fldRangeMin', function(e, v) { e.range[0] = v; });
            bindNumberField('fldRangeMax', function(e, v) { e.range[1] = v; });

            document.getElementById('fldItemId').addEventListener('change', function() {
                if (selectedIndex < 0) return;
                WORLD_DATA.items[selectedIndex].id = this.value;
                updateWorldDataOutput();
            });
            document.getElementById('fldCrystalId').addEventListener('input', function() {
                if (selectedIndex < 0) return;
                WORLD_DATA.crystals[selectedIndex].id = this.value;
                updateWorldDataOutput();
            });
            document.getElementById('fldEnemyType').addEventListener('change', function() {
                if (selectedIndex < 0) return;
                WORLD_DATA.enemies[selectedIndex].type = this.value;
                syncLayerRuntime('enemies');
                updateWorldDataOutput();
            });
            document.getElementById('fldColor').addEventListener('input', function() {
                if (selectedIndex < 0) return;
                WORLD_DATA.spikes[selectedIndex].color = this.value;
                updateWorldDataOutput();
            });
            document.getElementById('fldBroken').addEventListener('change', function() {
                if (selectedIndex < 0) return;
                WORLD_DATA.breakables[selectedIndex].broken = this.checked;
                syncLayerRuntime('breakables');
                updateWorldDataOutput();
            });

            window.addEventListener('keydown', function(e) {

                // ----------------------------------------------------------
                // EDIT MODE HOTKEY
                // ----------------------------------------------------------

                var k = e.key.toLowerCase();

                // Don't count repeated keydown events.
                if (!e.repeat && ['e', 'd', 'i', 't'].indexOf(k) !== -1) {

                    if (k === EDIT_SEQUENCE[editSequence.length]) {
                        editSequence.push(k);
                    } else if (k === 'e') {
                        editSequence = ['e'];
                    } else {
                        editSequence = [];
                    }

                    if (editSequence.length === EDIT_SEQUENCE.length) {
                        editSequence = [];
                        toggleEditor();

                        // Prevent the final T from doing anything else.
                        e.preventDefault();
                        return;
                    }
                }

                // ----------------------------------------------------------
                // EDITOR CONTROLS
                // ----------------------------------------------------------

                if (editMode) {

                    if (e.key === 'Escape') {
                        selectedIndex = -1;
                        editorDragging = false;
                        editorResizing = false;
                        editorRotating = false;
                        refreshEditorUI();
                        return;
                    }

                    // [ and ] rotate the selected box-shaped entity by
                    // 15 degrees (Shift for 1 degree of fine control).
                    if ((e.key === '[' || e.key === ']') && selectedIndex >= 0 && currentArray()[selectedIndex]) {
                        var rotEntKey = currentArray()[selectedIndex];
                        if (LAYER_DEFS[currentLayer].rotatable) {
                            var step = e.shiftKey ? 1 : 15;
                            var delta = e.key === '[' ? -step : step;
                            var nextRot = ((rotEntKey.rot || 0) + delta) % 360;
                            rotEntKey.rot = nextRot < 0 ? nextRot + 360 : nextRot;
                            syncAABB(rotEntKey);
                            syncLayerRuntime(currentLayer);
                            refreshEditorUI();
                        }
                        e.preventDefault();
                        return;
                    }

                    // Arrow keys move the selected block by one pixel.
                    // Shift + arrow moves by 16 pixels.
                    if (selectedIndex >= 0 && currentArray()[selectedIndex]) {

                        var amount = e.shiftKey ? 16 : 1;
                        var s = currentArray()[selectedIndex];

                        if (e.key === 'ArrowLeft') {
                            s.x -= amount;
                        }

                        if (e.key === 'ArrowRight') {
                            s.x += amount;
                        }

                        if (e.key === 'ArrowUp') {
                            s.y -= amount;
                        }

                        if (e.key === 'ArrowDown') {
                            s.y += amount;
                        }

                        if (
                            e.key === 'ArrowLeft' ||
                            e.key === 'ArrowRight' ||
                            e.key === 'ArrowUp' ||
                            e.key === 'ArrowDown'
                        ) {
                            rebuildEditorWorld();
                            refreshEditorUI();
                            updateWorldDataOutput();
                            e.preventDefault();
                            return;
                        }
                    }
                }

                // ----------------------------------------------------------
                // NORMAL GAME INPUT
                // ----------------------------------------------------------

                if (editMode) return;

                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
                if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
                if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = true;

                if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                    if (!keys.jumpHeld) jumpPressedFlag = true;
                    keys.jumpHeld = true;
                    e.preventDefault();
                }

                if (e.key === 'Shift' || e.key === 'x' || e.key === 'X') {
                    keys.dash = true;
                }
            });

            // Stop normal controls when editor mode is active.
            window.addEventListener('keyup', function(e) {
                if (editMode) return;

                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
                if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
                if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = false;

                if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                    keys.jumpHeld = false;
                }
            });

            // Copy button.
            copyWorldDataBtn.addEventListener('click', function() {
                worldDataOutput.select();

                navigator.clipboard.writeText(worldDataOutput.value)
                    .then(function() {
                        copyWorldDataBtn.textContent = 'Copied!';
                        setTimeout(function() {
                            copyWorldDataBtn.textContent = 'Copy World Data';
                        }, 1200);
                    })
                    .catch(function() {
                        // Fallback for browsers where clipboard permissions fail.
                        document.execCommand('copy');

                        copyWorldDataBtn.textContent = 'Copied!';
                        setTimeout(function() {
                            copyWorldDataBtn.textContent = 'Copy World Data';
                        }, 1200);
                    });
            });

            refreshWorldDataBtn.addEventListener('click', function() {
                updateWorldDataOutput();
            });

            var W, H, DPR;
            var ZOOM = 2.4; // CSS pixels per game unit - tuned so 16px tiles read clearly
            function resize() {
                DPR = Math.min(window.devicePixelRatio || 1, 2);
                W = window.innerWidth;
                H = window.innerHeight;
                canvas.width = W * DPR;
                canvas.height = H * DPR;
                ctx.setTransform(DPR * ZOOM, 0, 0, DPR * ZOOM, 0, 0);
            }
            window.addEventListener('resize', resize);

            // ================= PHYSICS (verbatim from verified physics.js) =================
            var PHYS = {
                TILE: 16,
                GRAV: 980,
                MOVE_ACCEL: 1500,
                MOVE_MAX: 120,
                FRICTION: 1300,
                AIR_FRICTION: 700,
                JUMP_V: -290,
                JUMP_CUT: 0.4,
                DOUBLE_JUMP_V: -260,
                DASH_SPEED: 340,
                DASH_TIME: 0.16,
                DASH_COOLDOWN: 0.35,
                WALL_SLIDE_MAX: 60,
                WALL_JUMP_VX: 200,
                WALL_JUMP_VY: -280,
                MAX_FALL: 620,
                PLAYER_W: 10,
                PLAYER_H: 14,
                SKIN: 1.5,
                COYOTE_TIME: 0.1,
                JUMP_BUFFER: 0.12
            };

            // ---- Rotated Collision Detection (SAT - Separating Axis Theorem) ----
            // Rotated boxes are now used directly by gameplay collision.  The cached
            // AABB is only a broad-phase optimization; it is NEVER used as the actual
            // collision shape.
            function getOBBCorners(box) {
                var cx = box.x + box.w / 2;
                var cy = box.y + box.h / 2;
                var rot = (box.rot || 0) * Math.PI / 180;
                var cos = Math.cos(rot);
                var sin = Math.sin(rot);
                var hw = box.w / 2;
                var hh = box.h / 2;
                var corners = [
                    [-hw, -hh],
                    [hw, -hh],
                    [hw, hh],
                    [-hw, hh]
                ];
                return corners.map(function(c) {
                    return {
                        x: cx + c[0] * cos - c[1] * sin,
                        y: cy + c[0] * sin + c[1] * cos
                    };
                });
            }

            function projectPolygon(poly, axisX, axisY) {
                var min = Infinity;
                var max = -Infinity;
                for (var i = 0; i < poly.length; i++) {
                    var v = poly[i].x * axisX + poly[i].y * axisY;
                    if (v < min) min = v;
                    if (v > max) max = v;
                }
                return { min: min, max: max };
            }

            // Returns the minimum translation vector that moves poly1 out of poly2.
            // If they do not overlap, returns null.
            function satMTV(poly1, poly2) {
                var polygons = [poly1, poly2];
                var bestOverlap = Infinity;
                var bestX = 0;
                var bestY = 0;

                var c1x = 0, c1y = 0, c2x = 0, c2y = 0;
                for (var ci = 0; ci < poly1.length; ci++) {
                    c1x += poly1[ci].x;
                    c1y += poly1[ci].y;
                }
                for (var cj = 0; cj < poly2.length; cj++) {
                    c2x += poly2[cj].x;
                    c2y += poly2[cj].y;
                }
                c1x /= poly1.length;
                c1y /= poly1.length;
                c2x /= poly2.length;
                c2y /= poly2.length;

                for (var p = 0; p < polygons.length; p++) {
                    var poly = polygons[p];
                    for (var i = 0; i < poly.length; i++) {
                        var p1 = poly[i];
                        var p2 = poly[(i + 1) % poly.length];
                        var edgeX = p2.x - p1.x;
                        var edgeY = p2.y - p1.y;
                        var axisX = -edgeY;
                        var axisY = edgeX;
                        var len = Math.sqrt(axisX * axisX + axisY * axisY);
                        if (len < 0.000001) continue;
                        axisX /= len;
                        axisY /= len;

                        var a = projectPolygon(poly1, axisX, axisY);
                        var b = projectPolygon(poly2, axisX, axisY);
                        var overlap = Math.min(a.max, b.max) - Math.max(a.min, b.min);

                        if (overlap <= 0) return null;

                        if (overlap < bestOverlap) {
                            bestOverlap = overlap;
                            // Axis must point from obstacle toward player.
                            var dx = c1x - c2x;
                            var dy = c1y - c2y;
                            var sign = dx * axisX + dy * axisY >= 0 ? 1 : -1;
                            bestX = axisX * overlap * sign;
                            bestY = axisY * overlap * sign;
                        }
                    }
                }

                return { x: bestX, y: bestY, depth: bestOverlap };
            }

            function obbCollide(a, b) {
                return satMTV(getOBBCorners(a), getOBBCorners(b)) !== null;
            }

            function satCollide(poly1, poly2) {
                return satMTV(poly1, poly2) !== null;
            }

            // Compatibility helper used by the rest of the game.
            function obbVsAABB(aabb, rotatedBox) {
                return satMTV(getOBBCorners(aabb), getOBBCorners(rotatedBox)) !== null;
            }

            function aabb(a, b) {
                return a.x < b.x + b.w && a.x + a.w > b.x &&
                    a.y < b.y + b.h && a.y + a.h > b.y;
            }

            // Cached AABB is broad phase only.
            function syncAABB(s) {
                var rot = s.rot || 0;
                if (!rot) {
                    s._ax = s.x;
                    s._ay = s.y;
                    s._aw = s.w;
                    s._ah = s.h;
                    return s;
                }

                var corners = getOBBCorners(s);
                var minX = Infinity, maxX = -Infinity;
                var minY = Infinity, maxY = -Infinity;
                for (var i = 0; i < corners.length; i++) {
                    minX = Math.min(minX, corners[i].x);
                    maxX = Math.max(maxX, corners[i].x);
                    minY = Math.min(minY, corners[i].y);
                    maxY = Math.max(maxY, corners[i].y);
                }
                s._ax = minX;
                s._ay = minY;
                s._aw = maxX - minX;
                s._ah = maxY - minY;
                return s;
            }

            function cbox(s) {
                return { x: s._ax, y: s._ay, w: s._aw, h: s._ah };
            }

            function syncAABBList(arr) {
                for (var i = 0; i < arr.length; i++) syncAABB(arr[i]);
                return arr;
            }

            function broadPhase(entity, s, extra) {
                var a = {
                    x: entity.x,
                    y: entity.y,
                    w: entity.w,
                    h: entity.h
                };
                var b = cbox(s);
                extra = extra || 0;
                return a.x < b.x + b.w + extra &&
                    a.x + a.w > b.x - extra &&
                    a.y < b.y + b.h + extra &&
                    a.y + a.h > b.y - extra;
            }

            function playerSolidMTV(entity, solid) {
                if (!broadPhase(entity, solid, PHYS.SKIN + 2)) return null;
                var playerBox = {
                    x: entity.x,
                    y: entity.y,
                    w: entity.w,
                    h: entity.h,
                    rot: 0
                };
                return satMTV(getOBBCorners(playerBox), getOBBCorners(solid));
            }

            function moveAndCollide(entity, dt, world, allowDrop) {
                var SKIN = PHYS.SKIN;

                entity.onWallDir = 0;
                entity.onGround = false;

                // ---------------- X movement ----------------
                entity.x += entity.vx * dt;
                for (var i = 0; i < world.solids.length; i++) {
                    var solid = world.solids[i];
                    var mtv = playerSolidMTV(entity, solid);
                    if (!mtv) continue;

                    // Resolve using the TRUE rotated surface.
                    entity.x += mtv.x;
                    entity.y += mtv.y;

                    // A predominantly horizontal normal means this is a wall.
                    if (Math.abs(mtv.x) > Math.abs(mtv.y) * 0.9) {
                        if (mtv.x < 0) entity.onWallDir = 1;
                        else if (mtv.x > 0) entity.onWallDir = -1;
                    }

                    entity.vx = 0;
                }

                // ---------------- Y movement ----------------
                entity.y += entity.vy * dt;
                for (var j = 0; j < world.solids.length; j++) {
                    var sy = world.solids[j];
                    var ymtv = playerSolidMTV(entity, sy);
                    if (!ymtv) continue;

                    entity.x += ymtv.x;
                    entity.y += ymtv.y;

                    // Upward MTV means the surface is underneath the player.
                    if (ymtv.y < -0.05 && Math.abs(ymtv.y) >= Math.abs(ymtv.x) * 0.35) {
                        entity.onGround = true;
                    }

                    // Only genuine side contacts count as walls.  In particular,
                    // an underside collision has a downward MTV and can NEVER
                    // enable wall cling.
                    if (Math.abs(ymtv.x) > Math.abs(ymtv.y) * 0.9) {
                        if (ymtv.x < 0) entity.onWallDir = 1;
                        else if (ymtv.x > 0) entity.onWallDir = -1;
                    }

                    entity.vy = 0;
                }

                // ---------------- One-way platforms ----------------
                // Platforms are still one-way, but their actual rotated shape is
                // used.  You can jump through them from underneath.
                if (allowDrop !== false && world.platforms) {
                    var previousY = entity.y - entity.vy * dt;
                    var previousBottom = previousY + entity.h;
                    var currentBox = {
                        x: entity.x,
                        y: entity.y,
                        w: entity.w,
                        h: entity.h,
                        rot: 0
                    };

                    for (var k = 0; k < world.platforms.length; k++) {
                        var platform = world.platforms[k];
                        if (!broadPhase(entity, platform, 2)) continue;
                        if (entity.vy < 0) continue;

                        var platformCorners = getOBBCorners(platform);
                        // The platform's local top edge, transformed to world space.
                        var pcx = platform.x + platform.w / 2;
                        var pcy = platform.y + platform.h / 2;
                        var prad = (platform.rot || 0) * Math.PI / 180;
                        var pcos = Math.cos(prad);
                        var psin = Math.sin(prad);
                        var leftTop = {
                            x: pcx + (-platform.w / 2) * pcos - (-platform.h / 2) * psin,
                            y: pcy + (-platform.w / 2) * psin + (-platform.h / 2) * pcos
                        };
                        var rightTop = {
                            x: pcx + (platform.w / 2) * pcos - (-platform.h / 2) * psin,
                            y: pcy + (platform.w / 2) * psin + (-platform.h / 2) * pcos
                        };

                        var edgeX = rightTop.x - leftTop.x;
                        var edgeY = rightTop.y - leftTop.y;
                        var edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY) || 1;
                        var nx = edgeY / edgeLen;
                        var ny = -edgeX / edgeLen;
                        // Make the normal point upward in screen/world coordinates.
                        if (ny > 0) {
                            nx = -nx;
                            ny = -ny;
                        }

                        // Project the player's bottom-center onto the platform normal.
                        var footX = entity.x + entity.w / 2;
                        var footY = entity.y + entity.h;
                        var relX = footX - leftTop.x;
                        var relY = footY - leftTop.y;
                        var signedDist = relX * nx + relY * ny;

                        var prevRelX = footX - (entity.vx * dt) - leftTop.x;
                        var prevRelY = previousBottom - leftTop.y;
                        var prevSignedDist = prevRelX * nx + prevRelY * ny;

                        var edgeT = (relX * edgeX + relY * edgeY) / (edgeLen * edgeLen);
                        var horizontalReach = Math.max(0, Math.min(1, edgeT));

                        // Use SAT as the final overlap test, but only accept a
                        // crossing of the platform's top plane from above.
                        if (prevSignedDist >= -1 && signedDist <= 2 &&
                            horizontalReach >= -0.05 && horizontalReach <= 1.05 &&
                            satMTV(getOBBCorners(currentBox), platformCorners)) {
                            var correction = -signedDist + SKIN;
                            entity.x += nx * correction;
                            entity.y += ny * correction;
                            entity.vy = 0;
                            entity.onGround = true;
                        }
                    }
                }

                return entity;
            }

            function stepPlayer(state, input, world, abilities, dt) {
                if (state.dashCooldown > 0) state.dashCooldown -= dt;
                if (state.coyote > 0 && !state.onGround) state.coyote -= dt;
                if (state.jumpBuffer > 0) state.jumpBuffer -= dt;

                var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

                if (state.dashTime > 0) {
                    state.dashTime -= dt;
                    state.vx = state.dashDir * PHYS.DASH_SPEED;
                    state.vy = 0;
                    moveAndCollide(state, dt, world, !input.down);
                    return state;
                }

                if (input.dash && abilities.dash && state.dashCooldown <= 0 && dir !== 0) {
                    state.dashTime = PHYS.DASH_TIME;
                    state.dashDir = dir;
                    state.dashCooldown = PHYS.DASH_COOLDOWN;
                    state.vx = dir * PHYS.DASH_SPEED;
                    state.vy = 0;
                    moveAndCollide(state, dt, world, !input.down);
                    return state;
                }

                if (dir !== 0) {
                    state.vx += dir * PHYS.MOVE_ACCEL * dt;
                    state.vx = Math.max(-PHYS.MOVE_MAX, Math.min(PHYS.MOVE_MAX, state.vx));
                    state.facing = dir;
                } else {
                    var fr = (state.onGround ? PHYS.FRICTION : PHYS.AIR_FRICTION) * dt;
                    if (state.vx > 0) state.vx = Math.max(0, state.vx - fr);
                    else if (state.vx < 0) state.vx = Math.min(0, state.vx + fr);
                }

                // Wall cling only works on a genuine SIDE wall.  onWallDir is
                // intentionally not set by floor or underside contacts.
                var wallClinging = false;
                if (abilities.wallCling && !state.onGround && state.onWallDir !== 0 &&
                    ((state.onWallDir === 1 && input.right) ||
                     (state.onWallDir === -1 && input.left))) {
                    wallClinging = true;
                    if (state.vy > PHYS.WALL_SLIDE_MAX) state.vy = PHYS.WALL_SLIDE_MAX;
                }

                if (state.onGround) {
                    state.coyote = PHYS.COYOTE_TIME;
                    state.jumpsUsed = 0;
                }

                if (input.jumpPressed) state.jumpBuffer = PHYS.JUMP_BUFFER;

                if (state.jumpBuffer > 0) {
                    if (state.coyote > 0) {
                        state.vy = PHYS.JUMP_V;
                        state.jumpsUsed = 1;
                        state.jumpBuffer = 0;
                        state.coyote = 0;
                    } else if (wallClinging) {
                        state.vy = PHYS.WALL_JUMP_VY;
                        state.vx = -state.onWallDir * PHYS.WALL_JUMP_VX;
                        state.jumpsUsed = 1;
                        state.jumpBuffer = 0;
                    } else if (abilities.doubleJump && state.jumpsUsed < 2) {
                        state.vy = PHYS.DOUBLE_JUMP_V;
                        state.jumpsUsed++;
                        state.jumpBuffer = 0;
                    }
                }

                if (!input.jumpHeld && state.vy < PHYS.JUMP_V * PHYS.JUMP_CUT) {
                    state.vy = PHYS.JUMP_V * PHYS.JUMP_CUT;
                }

                if (!wallClinging) {
                    state.vy += PHYS.GRAV * dt;
                    if (state.vy > PHYS.MAX_FALL) state.vy = PHYS.MAX_FALL;
                }

                moveAndCollide(state, dt, world, !input.down);
                return state;
            }
            // ================= END PHYSICS =================

            var liveSolids = WORLD_DATA.solids.slice();
            var liveBreakables = WORLD_DATA.breakables.map(function(b) {
                return Object.assign({}, b);
            });
            var world = {
                solids: liveSolids,
                platforms: WORLD_DATA.platforms
            };

            function rebuildSolids() {
                liveSolids = WORLD_DATA.solids.slice();
                liveBreakables.forEach(function(b) {
                    if (!b.broken) liveSolids.push(b);
                });
                syncAABBList(liveSolids);
                world.solids = liveSolids;
            }
            rebuildSolids();

            var abilities = {
                doubleJump: false,
                dash: false,
                wallCling: false,
                breakBlocks: false
            };
            var collected = {};
            var lives = 3;
            var checkpoint = {
                x: WORLD_DATA.startPos.x,
                y: WORLD_DATA.startPos.y
            };
            var running = false;
            var won = false;
            var elapsed = 0;

            var player = null;
            var camera = {
                x: 0,
                y: 0
            };
            var keys = {
                left: false,
                right: false,
                jumpHeld: false,
                dash: false,
                down: false
            };
            var jumpPressedFlag = false;
            var particles = [];
            var stars = [];
            var toastTimer = 0;

            function rand(a, b) {
                return a + Math.random() * (b - a);
            }

            function makeStars() {
                stars = [];
                for (var i = 0; i < 100; i++) {
                    stars.push({
                        x: rand(WORLD_DATA.bounds.minX, WORLD_DATA.bounds.maxX),
                        y: rand(WORLD_DATA.bounds.minY, WORLD_DATA.bounds.maxY),
                        r: rand(0.4, 1.6),
                        a: rand(0.15, 0.55),
                        tw: rand(0, Math.PI * 2)
                    });
                }
            }
            makeStars();

            function freshPlayer(x, y) {
                return {
                    x: x,
                    y: y,
                    vx: 0,
                    vy: 0,
                    w: PHYS.PLAYER_W,
                    h: PHYS.PLAYER_H,
                    onGround: false,
                    onWallDir: 0,
                    facing: 1,
                    jumpsUsed: 0,
                    dashTime: 0,
                    dashCooldown: 0,
                    dashDir: 1,
                    coyote: 0,
                    jumpBuffer: 0,
                    hurtT: 0,
                    invT: 1.2
                };
            }

            var enemyState = [];

            function resetEnemies() {
                enemyState = WORLD_DATA.enemies.map(function(e) {
                    return {
                        type: e.type,
                        x: e.x,
                        y: e.y,
                        homeX: e.homeX,
                        homeY: e.type === 'flyer' ? e.y : null,
                        minX: e.range[0],
                        maxX: e.range[1],
                        dir: 1,
                        speed: e.type === 'flyer' ? 42 : 32,
                        vy: 0,
                        bob: rand(0, Math.PI * 2)
                    };
                });
            }
            resetEnemies();

            function burst(x, y, color, n) {
                n = n || 12;
                for (var i = 0; i < n; i++) {
                    var a = Math.random() * Math.PI * 2,
                        sp = rand(20, 80);
                    particles.push({
                        x: x,
                        y: y,
                        vx: Math.cos(a) * sp,
                        vy: Math.sin(a) * sp - 20,
                        life: 1,
                        color: color
                    });
                }
            }

            function abilityColor(id) {
                return {
                    doubleJump: '#8fd6ff',
                    dash: '#ff9fd6',
                    wallCling: '#c9a8ff',
                    breakBlocks: '#ffb26b',
                    treasure: '#ffe27a'
                } [id] || '#fff';
            }

            function currentZoneName(px, py) {
                if (currentLevelIndex !== 0) {
                    return LEVEL_NAMES[currentLevelIndex] || 'Hollow Frost';
                }
                var gx = Math.floor(px / (WORLD_DATA.ROOM_W * WORLD_DATA.TILE));
                var gy = Math.floor(py / (WORLD_DATA.ROOM_H * WORLD_DATA.TILE));
                return ZONE_NAMES[gx + ',' + gy] || 'Hollow Frost';
            }

            function showToast(text) {
                pickupToast.textContent = text;
                pickupToast.classList.add('show');
                toastTimer = 2.2;
            }

            function updateAbilityIcons() {
                ['doubleJump', 'dash', 'wallCling', 'breakBlocks'].forEach(function(a) {
                    var id = 'icon' + a.charAt(0).toUpperCase() + a.slice(1);
                    var el = document.getElementById(id);
                    if (el) el.classList.toggle('unlocked', !!abilities[a]);
                });
            }

            function renderLives() {
                livesArea.innerHTML = '';
                for (var i = 0; i < 3; i++) {
                    var full = i < lives;
                    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('class', 'lifeIcon');
                    svg.setAttribute('viewBox', '0 0 24 24');
                    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', 'M12 21s-7.5-4.6-10-9.3C-0.2 7.6 2 4 5.6 4 8 4 10 5.5 12 8c2-2.5 4-4 6.4-4 3.6 0 5.8 3.6 3.6 7.7C19.5 16.4 12 21 12 21z');
                    path.setAttribute('fill', full ? '#ff8b7b' : 'rgba(255,255,255,0.15)');
                    svg.appendChild(path);
                    livesArea.appendChild(svg);
                }
            }

            function loadLevel(idx, keepProgress) {
                currentLevelIndex = idx;
                WORLD_DATA = LEVELS[idx];
                WORLD_DATA.items.forEach(function(it) {
                    it.taken = false;
                });
                WORLD_DATA.crystals.forEach(function(c) {
                    c.activated = false;
                });
                liveBreakables = WORLD_DATA.breakables.map(function(b) {
                    return Object.assign({}, b);
                });
                world.platforms = WORLD_DATA.platforms;
                syncAABBList(WORLD_DATA.platforms);
                syncAABBList(WORLD_DATA.spikes);
                rebuildSolids();
                resetEnemies();
                makeStars();
                checkpoint = {
                    x: WORLD_DATA.startPos.x,
                    y: WORLD_DATA.startPos.y
                };
                player = freshPlayer(checkpoint.x, checkpoint.y);
                camera.x = player.x;
                camera.y = player.y;
                particles = [];
                won = false;
                if (!keepProgress) {
                    abilities = {
                        doubleJump: false,
                        dash: false,
                        wallCling: false,
                        breakBlocks: false
                    };
                    collected = {};
                    lives = 3;
                    elapsed = 0;
                }
                updateAbilityIcons();
                renderLives();
            }

            function resetRun() {
                loadLevel(0, false);
            }

            function respawn(fatal) {
                lives--;
                renderLives();
                burst(player.x + player.w / 2, player.y + player.h / 2, '#ff8b7b', 16);

                if (lives <= 0) {
                    lives = 3;
                    renderLives();
                    running = false;
                    setTimeout(function() {
                        player = freshPlayer(checkpoint.x, checkpoint.y);
                        running = true;
                    }, 450);
                    return;
                }

                // Losing a single life just resets the player in place
                // (or after a fall, back onto solid ground) instead of
                // sending them all the way back to the checkpoint.
                if (fatal) {
                    player = freshPlayer(checkpoint.x, checkpoint.y);
                } else {
                    player.x = player.lastSafeX !== undefined ? player.lastSafeX : player.x;
                    player.y = player.lastSafeY !== undefined ? player.lastSafeY : player.y;
                    player.vx = 0;
                    player.vy = 0;
                    player.dashTime = 0;
                    player.invT = 1.2;
                }
            }

            function checkItemPickup() {
                var pbox = {
                    x: player.x,
                    y: player.y,
                    w: player.w,
                    h: player.h
                };
                for (var i = 0; i < WORLD_DATA.items.length; i++) {
                    var it = WORLD_DATA.items[i];
                    if (it.taken) continue;
                    var ibox = {
                        x: it.x - 8,
                        y: it.y - 8,
                        w: 16,
                        h: 16
                    };
                    if (aabb(pbox, ibox)) {
                        it.taken = true;
                        collected[it.id] = true;
                        burst(it.x, it.y, abilityColor(it.id.replace('ability_', '').replace('goal_', '')), 18);
                        if (it.id.indexOf('ability_') === 0) {
                            var name = it.id.slice('ability_'.length);
                            abilities[name] = true;
                            updateAbilityIcons();
                            var labels = {
                                doubleJump: 'Double Jump',
                                dash: 'Dash',
                                wallCling: 'Wall Cling',
                                breakBlocks: 'Break Blocks'
                            };
                            showToast(labels[name] + ' unlocked');
                        } else if (it.id === 'goal_treasure') {
                            if (currentLevelIndex < LEVELS.length - 1) {
                                running = false;
                                showToast('Level Complete!');
                                setTimeout(function() {
                                    loadLevel(currentLevelIndex + 1, true);
                                    running = true;
                                }, 900);
                            } else {
                                won = true;
                                running = false;
                                setTimeout(showWin, 500);
                            }
                        }
                    }
                }
            }

            function checkCrystal() {
                var pbox = {
                    x: player.x,
                    y: player.y,
                    w: player.w,
                    h: player.h
                };
                WORLD_DATA.crystals.forEach(function(c) {
                    if (c.activated) return;
                    var cbox = {
                        x: c.x - 8,
                        y: c.y - 10,
                        w: 16,
                        h: 20
                    };
                    if (aabb(pbox, cbox)) {
                        c.activated = true;
                        checkpoint = {
                            x: c.x,
                            y: c.y - 4
                        };
                        burst(c.x, c.y, '#9fe8d6', 10);
                        showToast('Checkpoint saved');
                    }
                });
            }

            function checkBreakables() {
                if (!abilities.breakBlocks) return;
                var nextBox = {
                    x: player.x + player.vx / 60,
                    y: player.y,
                    w: player.w,
                    h: player.h
                };
                for (var i = 0; i < liveBreakables.length; i++) {
                    var b = liveBreakables[i];
                    if (b.broken) continue;
                    if (aabb(nextBox, cbox(b))) {
                        b.broken = true;
                        burst(b.x + 8, b.y + 8, '#ffb26b', 14);
                        rebuildSolids();
                    }
                }
            }

            function checkSpikes() {
                if (player.invT > 0) return;
                if (!WORLD_DATA.spikes || !WORLD_DATA.spikes.length) return;
                var pbox = {
                    x: player.x,
                    y: player.y,
                    w: player.w,
                    h: player.h
                };
                for (var i = 0; i < WORLD_DATA.spikes.length; i++) {
                    if (aabb(pbox, cbox(WORLD_DATA.spikes[i]))) {
                        respawn(false);
                        player.invT = 1.5;
                        return;
                    }
                }
            }

            // Replace your existing checkEnemies() with this:
function checkEnemies() {
    if (player.invT > 0) return;

    // player polygon: use player's current bbox (rot assumed 0 unless you set player.rot)
    var pbox = { x: player.x, y: player.y, w: player.w, h: player.h, rot: player.rot || 0 };
    var pPoly = getOBBCorners(pbox);

    for (var i = 0; i < enemyState.length; i++) {
        var e = enemyState[i];

        // treat enemy as 12x12 box (top-left at e.x,e.y) so SAT works consistently
        var ebox = { x: e.x, y: e.y, w: 12, h: 12, rot: e.rot || 0 };
        var ePoly = getOBBCorners(ebox);

        // Quick early-out: compare AABBs (enemy vs player's AABB)
        var ea = { x: ebox.x, y: ebox.y, w: ebox.w, h: ebox.h };
        var pa = { x: pbox.x, y: pbox.y, w: pbox.w, h: pbox.h };
        if (!aabb(ea, pa)) continue;

        // precise SAT test
        if (satMTV(pPoly, ePoly) !== null) {
            respawn(false);
            player.invT = 1.5;
            return;
        }
    }
}

// Replace your existing enemyHitsWall(...) with this:
function enemyHitsWall(e, prevX) {
    // create a small OBB for enemy
    var entBox = { x: e.x, y: e.y, w: 12, h: 12, rot: e.rot || 0 };

    for (var s = 0; s < liveSolids.length; s++) {
        var solid = liveSolids[s];

        // ensure cached AABB is up-to-date (syncAABBList is used elsewhere when world changes;
        // call syncAABB(solid) here if solids might change at runtime)
        // syncAABB(solid); // optional if needed

        // broadphase: cheap AABB reject using cached cbox
        if (!broadPhase(entBox, solid)) continue;

        // narrowphase SAT/MTV
        var solidBox = { x: solid.x, y: solid.y, w: solid.w, h: solid.h, rot: solid.rot || 0 };
        var mtv = satMTV(getOBBCorners(entBox), getOBBCorners(solidBox));
        if (mtv !== null) {
            // keep previous behavior (roll back x and invert direction)
            e.x = prevX;
            e.dir *= -1;
            return true;
        }
    }

    return false;
}

            function updateEnemies(dt) {
                for (var i = 0; i < enemyState.length; i++) {
                    var e = enemyState[i];
                    e.bob += dt * 4;
                    if (e.type === 'walker') {
                        var prevXW = e.x;
                        e.x += e.dir * e.speed * dt;
                        enemyHitsWall(e, prevXW);
                        if (e.x < e.minX) {
                            e.x = e.minX;
                            e.dir = 1;
                        }
                        if (e.x > e.maxX) {
                            e.x = e.maxX;
                            e.dir = -1;
                        }
                        e.vy += PHYS.GRAV * dt;
                        var testBox = {
                            x: e.x,
                            y: e.y + e.vy * dt,
                            w: 12,
                            h: 12
                        };
                        var grounded = false;
                        for (var s = 0; s < liveSolids.length; s++) {
                            var sBox = cbox(liveSolids[s]);
                            if (aabb(testBox, sBox) && e.vy >= 0) {
                                e.y = sBox.y - 12;
                                e.vy = 0;
                                grounded = true;
                                break;
                            }
                        }
                        if (!grounded) e.y += e.vy * dt;
                    } else {
                        var prevXF = e.x;
                        e.x += e.dir * e.speed * dt;
                        enemyHitsWall(e, prevXF);
                        if (e.x < e.minX) {
                            e.x = e.minX;
                            e.dir = 1;
                        }
                        if (e.x > e.maxX) {
                            e.x = e.maxX;
                            e.dir = -1;
                        }
                        e.y = e.homeY + Math.sin(e.bob) * 10;
                    }
                }
            }

            function updateParticles(dt) {
                for (var i = particles.length - 1; i >= 0; i--) {
                    var p = particles[i];
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.vy += 260 * dt;
                    p.life -= dt * 1.6;
                    if (p.life <= 0) particles.splice(i, 1);
                }
            }

            function updateCamera() {
                var targetX = player.x + player.w / 2;
                var targetY = player.y + player.h / 2;
                camera.x += (targetX - camera.x) * 0.14;
                camera.y += (targetY - camera.y) * 0.14;
            }

            function update(dt) {
                if (!running) return;
                elapsed += dt;
                if (player.hurtT > 0) player.hurtT -= dt;
                if (player.invT > 0) player.invT -= dt;
                if (toastTimer > 0) {
                    toastTimer -= dt;
                    if (toastTimer <= 0) pickupToast.classList.remove('show');
                }

                var input = {
                    left: keys.left,
                    right: keys.right,
                    jumpPressed: jumpPressedFlag,
                    jumpHeld: keys.jumpHeld,
                    dash: keys.dash,
                    down: keys.down
                };
                stepPlayer(player, input, world, abilities, dt);
                jumpPressedFlag = false;
                keys.dash = false;

                if (player.y > WORLD_DATA.bounds.maxY + 80) {
                    respawn(true);
                } else {
                    checkItemPickup();
                    checkCrystal();
                    checkBreakables();
                    checkSpikes();
                    checkEnemies();

                    // Remember the last spot the player was safely
                    // standing/moving on solid ground, in bounds, so a
                    // single-life loss can put them right back here.
                    if (player.onGround) {
                        player.lastSafeX = player.x;
                        player.lastSafeY = player.y;
                    }
                }

                updateEnemies(dt);
                updateParticles(dt);
                updateCamera();
                zoneNameEl.textContent = currentZoneName(player.x, player.y);
            }

            function draw() {
                ctx.clearRect(-4000, -4000, 12000, 12000);
                var vw = W / ZOOM,
                    vh = H / ZOOM; // visible viewport size in game units
                ctx.save();
                ctx.translate(vw / 2 - camera.x, vh / 2 - camera.y);

                var grad = ctx.createRadialGradient(camera.x, camera.y, 0, camera.x, camera.y, 700);
                grad.addColorStop(0, 'rgba(28,40,66,0.9)');
                grad.addColorStop(1, 'rgba(4,6,12,1)');
                ctx.fillStyle = grad;
                ctx.fillRect(camera.x - vw, camera.y - vh, vw * 2, vh * 2);

                for (var s = 0; s < stars.length; s++) {
                    var st = stars[s];
                    st.tw += 0.015;
                    var a = st.a * (0.6 + 0.4 * Math.sin(st.tw));
                    ctx.fillStyle = 'rgba(200,220,255,' + a.toFixed(2) + ')';
                    ctx.beginPath();
                    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Draws fn(ctx) with the origin moved to the shape's own
                // center and rotated by its .rot degrees (0 if unset), so
                // draw callbacks can just draw as if rot were 0, centered
                // on (0,0).
                function withRotation(s, fn) {
                    var rot = s.rot || 0;
                    if (!rot) {
                        fn();
                        return;
                    }
                    var cx = s.x + s.w / 2;
                    var cy = s.y + s.h / 2;
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(rot * Math.PI / 180);
                    ctx.translate(-cx, -cy);
                    fn();
                    ctx.restore();
                }

                for (var i = 0; i < liveSolids.length; i++) {
                    var so = liveSolids[i];
                    withRotation(so, function(so) {
                        return function() {
                            ctx.fillStyle = '#dbe8f5';
                            ctx.fillRect(so.x, so.y, so.w, so.h);
                            ctx.fillStyle = 'rgba(20,30,50,0.18)';
                            ctx.fillRect(so.x, so.y, so.w, 3);
                        };
                    }(so));
                }

                for (var pI = 0; pI < WORLD_DATA.platforms.length; pI++) {
                    var pl = WORLD_DATA.platforms[pI];
                    withRotation(pl, function(pl) {
                        return function() {
                            ctx.fillStyle = '#9fc9d8';
                            ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
                        };
                    }(pl));
                }

                for (var bI = 0; bI < liveBreakables.length; bI++) {
                    var b = liveBreakables[bI];
                    if (b.broken) continue;
                    withRotation(b, function(b) {
                        return function() {
                            ctx.save();
                            ctx.fillStyle = '#8a6a52';
                            ctx.fillRect(b.x, b.y, b.w, b.h);
                            ctx.strokeStyle = 'rgba(255,178,107,0.5)';
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.moveTo(b.x + 2, b.y + 2);
                            ctx.lineTo(b.x + 9, b.y + 8);
                            ctx.lineTo(b.x + 4, b.y + 14);
                            ctx.stroke();
                            ctx.restore();
                        };
                    }(b));
                }

                (WORLD_DATA.spikes || []).forEach(function(sp) {
                    withRotation(sp, function() {
                        var spColor = sp.color || '#ff5c5c';
                        ctx.save();
                        ctx.shadowColor = spColor;
                        ctx.shadowBlur = 6;
                        ctx.fillStyle = spColor;
                        ctx.beginPath();
                        ctx.moveTo(sp.x, sp.y + sp.h);
                        ctx.lineTo(sp.x + sp.w / 2, sp.y);
                        ctx.lineTo(sp.x + sp.w, sp.y + sp.h);
                        ctx.closePath();
                        ctx.fill();
                        ctx.restore();
                    });
                });

                WORLD_DATA.crystals.forEach(function(c) {
                    var isCurrent = checkpoint.x === c.x && checkpoint.y === c.y - 4;
                    ctx.save();
                    ctx.shadowColor = '#9fe8d6';
                    ctx.shadowBlur = isCurrent ? 20 : 10;
                    ctx.fillStyle = isCurrent ? '#9fe8d6' : 'rgba(159,232,214,0.55)';
                    ctx.beginPath();
                    ctx.moveTo(c.x, c.y - 12);
                    ctx.lineTo(c.x + 6, c.y);
                    ctx.lineTo(c.x, c.y + 12);
                    ctx.lineTo(c.x - 6, c.y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                });

                WORLD_DATA.items.forEach(function(it) {
                    if (it.taken) return;
                    var kind = it.id.replace('ability_', '').replace('goal_', '');
                    var col = abilityColor(kind);
                    var bob = Math.sin(elapsed * 3 + it.x) * 3;
                    ctx.save();
                    ctx.shadowColor = col;
                    ctx.shadowBlur = it.id === 'goal_treasure' ? 26 : 16;
                    ctx.fillStyle = col;
                    ctx.beginPath();
                    ctx.arc(it.x, it.y + bob, it.id === 'goal_treasure' ? 9 : 7, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });

                for (var e = 0; e < enemyState.length; e++) {
                    var en = enemyState[e];
                    ctx.save();
                    ctx.fillStyle = en.type === 'flyer' ? '#c792ea' : '#ff8b7b';
                    ctx.shadowColor = ctx.fillStyle;
                    ctx.shadowBlur = 8;
                    if (en.type === 'walker') {
                        ctx.fillRect(en.x, en.y, 12, 12);
                    } else {
                        ctx.beginPath();
                        ctx.ellipse(en.x + 6, en.y + 6, 7, 5, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                }

                if (player) {
                    var blink = player.invT > 0 && Math.floor(player.invT * 12) % 2 === 0;
                    if (!blink) {
                        ctx.save();
                        ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
                        ctx.scale(player.facing, 1);
                        if (player.dashTime > 0) {
                            ctx.shadowColor = '#ff9fd6';
                            ctx.shadowBlur = 14;
                        } else if (abilities.wallCling && player.onWallDir !== 0 && !player.onGround) {
                            ctx.shadowColor = '#c9a8ff';
                            ctx.shadowBlur = 10;
                        } else {
                            ctx.shadowColor = '#8fd6ff';
                            ctx.shadowBlur = 8;
                        }
                        ctx.fillStyle = '#2d6ea3';
                        ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
                        ctx.fillStyle = '#f2d3b3';
                        ctx.fillRect(-player.w / 2, -player.h / 2 - 4, player.w, 6);
                        ctx.restore();
                    }
                }

                for (var p2 = 0; p2 < particles.length; p2++) {
                    var pt = particles[p2];
                    ctx.globalAlpha = Math.max(pt.life, 0);
                    ctx.fillStyle = pt.color;
                    ctx.fillRect(pt.x - 1.5, pt.y - 1.5, 3, 3);
                }
                ctx.globalAlpha = 1;

                if (editMode) drawEditorOverlay(vw, vh);

                ctx.restore();
            }

            function drawEditorOverlay(vw, vh) {
                // Faint grid, snapped to GRID_SIZE, across the visible viewport.
                ctx.save();
                ctx.strokeStyle = 'rgba(143,214,255,0.10)';
                ctx.lineWidth = 1 / ZOOM;
                var left = camera.x - vw / 2,
                    right = camera.x + vw / 2;
                var top = camera.y - vh / 2,
                    bottom = camera.y + vh / 2;
                var gx0 = Math.floor(left / GRID_SIZE) * GRID_SIZE;
                var gy0 = Math.floor(top / GRID_SIZE) * GRID_SIZE;
                ctx.beginPath();
                for (var gx = gx0; gx <= right; gx += GRID_SIZE) {
                    ctx.moveTo(gx, top);
                    ctx.lineTo(gx, bottom);
                }
                for (var gy = gy0; gy <= bottom; gy += GRID_SIZE) {
                    ctx.moveTo(left, gy);
                    ctx.lineTo(right, gy);
                }
                ctx.stroke();
                ctx.restore();

                var arr = currentArray();
                var def = LAYER_DEFS[currentLayer];

                // Outline every entity in the active layer, highlighting the
                // selected one.
                for (var i = 0; i < arr.length; i++) {
                    var ent = arr[i];
                    var isSel = i === selectedIndex;

                    ctx.save();
                    ctx.strokeStyle = isSel ? '#ffe27a' : 'rgba(143,214,255,0.55)';
                    ctx.lineWidth = (isSel ? 2 : 1) / ZOOM;

                    if (def.shape === 'point') {
                        var pb = entityBox(currentLayer, ent);
                        ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);
                    } else {
                        // True (rotated) outline.
                        var rot = ent.rot || 0;
                        var cx = ent.x + ent.w / 2,
                            cy = ent.y + ent.h / 2;

                        ctx.save();
                        ctx.translate(cx, cy);
                        ctx.rotate(rot * Math.PI / 180);
                        ctx.strokeRect(-ent.w / 2, -ent.h / 2, ent.w, ent.h);
                        ctx.restore();

                        // Show the broad-phase AABB as a dashed guide. The actual
                        // collision uses the rotated rectangle itself.
                        if (rot) {
                            ctx.strokeStyle = isSel ? 'rgba(255,226,122,0.55)' : 'rgba(143,214,255,0.3)';
                            ctx.setLineDash([4 / ZOOM, 4 / ZOOM]);
                            ctx.strokeRect(ent._ax, ent._ay, ent._aw, ent._ah);
                            ctx.setLineDash([]);
                        }
                    }
                    ctx.restore();
                }

                // Resize + rotate handles for the selected box entity.
                if (selectedIndex >= 0 && arr[selectedIndex] && def.shape === 'box') {
                    var s = arr[selectedIndex];
                    var scx = s.x + s.w / 2,
                        scy = s.y + s.h / 2;
                    var srad = (s.rot || 0) * Math.PI / 180;
                    var hs = 4 / ZOOM;

                    // Resize handle, rotated with the shape, at its bottom-right corner.
                    var hlx = s.w / 2,
                        hly = s.h / 2;
                    var hx = scx + hlx * Math.cos(srad) - hly * Math.sin(srad);
                    var hy = scy + hlx * Math.sin(srad) + hly * Math.cos(srad);
                    ctx.fillStyle = '#ffe27a';
                    ctx.fillRect(hx - hs, hy - hs, hs * 2, hs * 2);

                    // Rotate handle, floating above the shape's center.
                    if (def.rotatable) {
                        var rh = getRotateHandlePos(s);
                        ctx.save();
                        ctx.strokeStyle = 'rgba(255,226,122,0.6)';
                        ctx.lineWidth = 1 / ZOOM;
                        ctx.beginPath();
                        ctx.moveTo(rh.cx, rh.cy);
                        ctx.lineTo(rh.x, rh.y);
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.arc(rh.x, rh.y, 5 / ZOOM, 0, Math.PI * 2);
                        ctx.fillStyle = '#ffe27a';
                        ctx.fill();
                        ctx.strokeStyle = '#7a5f16';
                        ctx.lineWidth = 1 / ZOOM;
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            }

            // ---------- Input ----------
            window.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
                if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
                if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = true;
                if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                    if (!keys.jumpHeld) jumpPressedFlag = true;
                    keys.jumpHeld = true;
                    e.preventDefault();
                }
                if (e.key === 'Shift' || e.key === 'x' || e.key === 'X') keys.dash = true;
            });
            window.addEventListener('keyup', function(e) {
                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
                if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
                if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = false;
                if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.jumpHeld = false;
            });

            function bindHold(el, onDown, onUp) {
                el.addEventListener('touchstart', function(ev) {
                    ev.preventDefault();
                    onDown();
                }, {
                    passive: false
                });
                el.addEventListener('touchend', function(ev) {
                    ev.preventDefault();
                    onUp();
                }, {
                    passive: false
                });
                el.addEventListener('mousedown', function() {
                    onDown();
                });
                el.addEventListener('mouseup', function() {
                    onUp();
                });
                el.addEventListener('mouseleave', function() {
                    onUp();
                });
            }
            bindHold(btnLeft, function() {
                keys.left = true;
            }, function() {
                keys.left = false;
            });
            bindHold(btnRight, function() {
                keys.right = true;
            }, function() {
                keys.right = false;
            });
            bindHold(btnJump, function() {
                if (!keys.jumpHeld) jumpPressedFlag = true;
                keys.jumpHeld = true;
            }, function() {
                keys.jumpHeld = false;
            });
            bindHold(btnDash, function() {
                keys.dash = true;
            }, function() {});

            // ---------- UI flow ----------
            function showWin() {
                titleText.textContent = 'The treasure is yours';
                subText.classList.add('hidden');
                legendEl.classList.add('hidden');
                statLine.classList.remove('hidden');
                statLine.textContent = 'Cleared in ' + Math.floor(elapsed) + 's with ' + Object.keys(collected).filter(function(k) {
                    return k.indexOf('ability_') === 0;
                }).length + '/4 abilities found';
                startBtn.textContent = 'Play again';
                overlay.classList.remove('hidden');
            }

            function showGameOver() {
                titleText.textContent = 'Lost in the frost';
                subText.classList.add('hidden');
                legendEl.classList.add('hidden');
                statLine.classList.remove('hidden');
                statLine.textContent = 'You made it to ' + currentZoneName(checkpoint.x, checkpoint.y);
                startBtn.textContent = 'Try again';
                overlay.classList.remove('hidden');
            }
            startBtn.addEventListener('click', function() {
                resetRun();
                overlay.classList.add('hidden');
                running = true;
            });

            var lastT = performance.now();

            function loop(now) {
                var dt = Math.min((now - lastT) / 1000, 0.033);
                lastT = now;
                update(dt);
                draw();
                requestAnimationFrame(loop);
            }

            resize();
            resetRun();
            requestAnimationFrame(loop);
        })();

}

/*

* Start loading the selected level.
  */
  loadLevel();
