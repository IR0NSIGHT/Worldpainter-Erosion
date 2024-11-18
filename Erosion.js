//Code by ctRy
//This was possible thanks to these two papersedimentAmount:
//"Fast Hydraulic Erosion Simulation and Visualization on GPU" by Xing Mei, Philippe Decaudin, Bao-Gang Hu
//"Fast Hydraulic and Thermal Erosion on the GPU" by Balazs Jako

///////////////////////////////////////////////////CODE/////////////////////////////////////////////////////
var DEBUG = false;

var ITERATIONS = 10;
var DELTA_TIME = 0.1;
var RAIN_CONSTANT = 20;
var PIPE_AREA = 20;
var GRAVITY = 9.8;
var PIPE_LENGTH = 1;
var SEDIMENT_CONSTANT = 10;
var MAX_EROSION_DEPTH = 100;
var DISSOLVING_CONSTANT = 1;
var DEPOSITION_CONSTANT = 1;
var BLOCK_CONSTANT = 1 / 256 / 256;
var EVAPORATION_CONSTANT = 1;

var extentMap = extent();
var width = extentMap.width;
var height = extentMap.height;
var minX = extentMap.minX;
var minY = extentMap.minY;

print(JSON.stringify(extentMap));

//if (DEBUG) print = (string) => console.log(string);
var arguments;

var coords;
var coordsNext;
/////////////////////////

print("Script by ctRy\n");
print(arguments);
var args = arguments[0].split("\n");

var coords = [];

//runs all functions
args.forEach(function (funcc) {
  //remove spaces
  func = funcc.split(" ").join("");

  if (func == "help()" || func == "help" || func == "") helpGeneral();
  else if (/fluvial\((.*)\)/.test(func)) {
    var argsFunc = func
      .substring(func.indexOf("(") + 1, func.indexOf(")"))
      .split(",");
    fluvial(argsFunc);
  }

  print("---");
});

print("Done! :D");

/////////////////////////

function helpGeneral() {
  print("These functions allow natural processes to change the terrain.");
  print(
    "The terrain should be a rectangle (Don't add/remove tiles in weird locations)."
  );
  print("Type one function per line.\n");
  print("help(): Displays help messages");
  print("fluvial(): hydraulic erosion (World Machine Erosion)");
  print("thermal(): thermal erosion");
  print("hybrid(): fluvial + thermal erosion");
}

/**
 *
 * @param {Cell[]} arr
 * @returns {Cell[]}
 */
function deepCloneArray(arr) {
  var clonedArray = [];
  for (var i = 0; i < arr.length; i++) {
    // Deep clone each item in the array using JSON.stringify and JSON.parse
    clonedArray[i] = JSON.parse(JSON.stringify(arr[i]));
  }
  return clonedArray;
}

function fluvial(argsFunc) {
  print("Starting Fluvial Erosion");

  argsFunc.forEach(function (argu, i, arr) {
    if (arr[i].indexOf("=") != -1) {
      entry = arr[i].toUpperCase().split("_").join("").split("=");

      if (entry[0] == "ITERATIONS") ITERATIONS = parseInt(entry[1]);
      else if (entry[0] == "DELTATIME") DELTA_TIME = parseInt(entry[1]);
      else if (entry[0] == "RAINCONSTANT") RAIN_CONSTANT = parseInt(entry[1]);
      else if (entry[0] == "PIPEAREA") PIPE_AREA = parseInt(entry[1]);
      else if (entry[0] == "GRAVITY") GRAVITY = parseInt(entry[1]);
      else if (entry[0] == "PIPELENGTH") PIPE_LENGTH = parseInt(entry[1]);
      else if (entry[0] == "SEDIMENTCONSTANT")
        SEDIMENT_CONSTANT = parseInt(entry[1]);
      else if (entry[0] == "MAXEROSIONDEPTH")
        MAX_EROSION_DEPTH = parseInt(entry[1]);
      else if (entry[0] == "DISSOLVINGCONSTANT")
        DISSOLVING_CONSTANT = parseInt(entry[1]);
      else if (entry[0] == "DEPOSITIONCONSTANT")
        DEPOSITION_CONSTANT = parseInt(entry[1]);
      else if (entry[0] == "BLOCK_CONSTANT")
        BLOCK_CONSTANT = parseInt(entry[1]);
      else if (entry[0] == "EVAPORATIONCONSTANT")
        EVAPORATION_CONSTANT = parseInt(entry[1]);
      else throw "Wrong argument: " + entry[0] + " does not exist.";
    }

    // var ITERATIONS = 1;
    // var DELTA_TIME = 0.1;
    // var RAIN_CONSTANT = 2;
    // var PIPE_AREA = 10;
    // var GRAVITY = 9.8;
    // var PIPE_LENGTH = 1;
    // var SEDIMENT_CONSTANT = 1;
    // var MAX_EROSION_DEPTH = 100;
    // var DISSOLVING_CONSTANT = 0.1;
    // var DEPOSITION_CONSTANT = 0.1;
    // var BLOCK_CONSTANT = 0.00390625;
    // var EVAPORATION_CONSTANT = 0.5;
  });

  function sumFlows(value, cell) {
    value += cell.flowRight + cell.flowLeft + cell.flowBottom + cell.flowTop;
    return value;
  }

  coords = addCoords(width, height);
  for (var i = 0; i < ITERATIONS; i++) {
    coordsNext = deepCloneArray(coords);
    print("(" + (i + 1) + " / " + ITERATIONS + ")");

    increaseWater();
    print("water was increased:");
    print(
      "total water:" +
        coordsNext.reduce(function (value, cell) {
          return value + cell.waterHeight;
        }, 0)
    );
    print("totalFlow: " + coordsNext.reduce(sumFlows, 0));

    flow();
    print("flow was calculated:");
    print("totalFlow: " + coordsNext.reduce(sumFlows, 0));

    erode();
    print("erode");
    print("total suspended soil:");
    print(
      coordsNext.reduce(function (value, cell) {
        return value + cell.sedimentAmount;
      }, 0)
    );

    transportSediment();
    decreaseWater();
    print("evaporation");
    var totalWater = coordsNext.reduce(function (value, cell) {
      return value + cell.waterHeight;
    }, 0);
    print("total water:" + totalWater);
    coords = coordsNext;
    if (totalWater <= 0) break;
  }

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      //  setWaterLevelAt(x, y, Math.ceil(coords[x + y * width].waterHeight));
      setHeightAt(x, y, coordNext(x, y).terrainHeight);
      //dimension.setTerrainAt(x + minX, y + minY, org.pepsoft.worldpainter.Terrain.WHITE_STAINED_CLAY);
    }
  }
}

function thermal() {
  addCoords();
}

function hybrid() {
  addCoords();
}

/////////////////////////

/**
 * @typedef {Object} Cell
 * @property {number} waterHeight - The relative water height, calculated as `Math.max(0, getWaterLevelAt(x, y) - height)`.
 * @property {number} sedimentAmount - The amount of sediment present, initialized to 0.
 * @property {number} terrainHeight - height of terrain at time t, intialized to dimension.getHeightAt
 * @property {number} flowLeft - The flow of water to the left, initialized to 0.
 * @property {number} flowRight - The flow of water to the right, initialized to 0.
 * @property {number} flowTop - The flow of water to the top, initialized to 0.
 * @property {number} flowBottom - The flow of water to the bottom, initialized to 0.
 * @property {number} velocityX - The velocity of water in the X direction, initialized to 0.
 * @property {number} velocityY - The velocity of water in the Y direction, initialized to 0.
 */

/**
 *
 * @returns {Cell[]} coords
 */
function addCoords(width, height) {
  print("Adding coords");
  coords = [];
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      //waterHeight: water height (relative to terrain height)
      //sedimentAmount: sediment amount
      //f: 4 directional vector of water movement
      //v: velocity
      //coords[x + y * width] = {waterHeight:Math.max(0, getWaterLevelAt(x, y) - height), sedimentAmount:0, f:{l:0, r:0, t:0, b:0}, v:{x:0, y:0} };
      coords[x + y * width] = {
        waterHeight: 0,
        terrainHeight: getHeightAt(x, y),
        sedimentAmount: 0,
        flowLeft: 0,
        flowRight: 0,
        flowTop: 0,
        flowBottom: 0,
        velocityX: 0,
        velocityY: 0,
      };
    }
  }
  return coords;
}

/**
 *
 * @param {Cell} obj
 * @returns {string}
 */
function fluxToString(obj) {
  function roundNumbers(value) {
    if (typeof value === "number") {
      return Math.round(value * 100) / 100; // Round to 2 decimal places
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      var roundedObj = {};
      for (var key in value) {
        if (value.hasOwnProperty(key)) {
          roundedObj[key] = roundNumbers(value[key]);
        }
      }
      return roundedObj;
    } else {
      return value; // Return other types as is
    }
  }

  // Create a new rounded object without modifying the original and stringify it
  var roundedCopy = roundNumbers(obj);
  return JSON.stringify(roundedCopy);
}

/*
1. Water incrementation due to rain or water sources.
2. Flow simulation using shallow-water model. Computation of velocity field and water height changes.
3. Soil flow calculation with outflow in virtual pipes of thermal erosion model.
4. Simulation of erosion-deposition process.
5. Transportation of suspended sediment by the velocity field.
6. Thermal erosion material amount calculation.
7. Water evaporation.
*/

//step 1
/**
 1. Water incrementation due to rain or water sources.
 flux objects waterheight is increased simulating railfall 
 */
function increaseWater() {
  coords.forEach(function (coord, i, arr) {
    coordsNext[i].waterHeight =
      coords[i].waterHeight + DELTA_TIME * 1.0 * RAIN_CONSTANT;
  });
}

function waterHeightAt(x, y) {
  var i = x + y * width;
  return coordNext(x, y).terrainHeight + coords[i].waterHeight;
}

/**
 * pure function, no sideeffects
 * @param {int} x
 * @param {int} y
 * @param {int} deltaX
 * @param {int} deltaY
 * @param {float} flow flow in direction deltaX/deltaY
 * @returns
 */
function timestepOutflow(x, y, deltaX, deltaY, flow) {
  var flowLeftAfter = max(
    0,
    flow +
      (DELTA_TIME *
        PIPE_AREA *
        GRAVITY *
        (coordNext(x, y).terrainHeight +
          coordNext(x, y).waterHeight -
          coordNext(x + deltaX, y + deltaY).terrainHeight +
          coordNext(x + deltaX, y + deltaY).waterHeight)) /
        PIPE_LENGTH
  );
  return flowLeftAfter;
}

/**
 * section 3.2.1
 * calculate coordsNext flow in LRUP dir from coords
 * pure function (except global constants)
 * modifies coordsNext
 * @param {*} coords
 * @param {*} coordsNext
 */
function updateFlowDirections() {
  //calculate flux for each 4 directions
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var i = x + y * width;

      if (x - 1 >= 0)
        coordsNext[i].flowLeft = timestepOutflow(
          x,
          y,
          -1,
          0,
          coords[i].flowLeft
        );
      if (x + 1 < width)
        coordsNext[i].flowRight = timestepOutflow(
          x,
          y,
          1,
          0,
          coords[i].flowRight
        );
      if (y - 1 >= 0)
        coordsNext[i].flowTop = timestepOutflow(
          x,
          y,
          0,
          -1,
          coords[i].flowBottom
        );
      if (y + 1 < height)
        coordsNext[i].flowBottom = timestepOutflow(
          x,
          y,
          0,
          1,
          coords[i].flowTop
        );

      //scale flux so the sum of every directions is less than the water in the tile
      var sumF =
        coordsNext[i].flowLeft +
        coordsNext[i].flowRight +
        coordsNext[i].flowTop +
        coordsNext[i].flowBottom;

      if (sumF > coordsNext[i].waterHeight) {
        //TODO: only when sum exceeds current water? or always?
        var factor = Math.min(
          1,
          (coordsNext[i].waterHeight * PIPE_LENGTH * PIPE_LENGTH) /
            (sumF * DELTA_TIME)
        );
        coordsNext[i].flowLeft *= factor;
        coordsNext[i].flowRight *= factor;
        coordsNext[i].flowTop *= factor;
        coordsNext[i].flowBottom *= factor;
      }
    }
  }
}

/**
 *
 * @param {*} x
 * @param {*} y
 * @returns {Cell}
 */
function coordNext(x, y) {
  return coordsNext[x + y * width];
}

/**
 *
 * @param {*} x
 * @param {*} y
 * @returns {Cell}
 */
function coord(x, y) {
  return coords[x + y * width];
}

//step 2
/**
 * 2. Flow simulation using shallow-water model. Computation of velocity field and water height changes.
 * this function iterates the whole map and updates the flux objects of all blocks
 * flow (in all 4 directions) and velocity x y are updated
 * flow is based on heightmap and neighbours height
 */
function flow() {
  //equation 2,3,4,5, section 3.2.1
  updateFlowDirections(coords, coordsNext);
  //  print("flows were updated:");
  //  print(coordsNext.map(f => [f.flowRight, f.flowLeft, f.flowBottom, f.flowTop]) );

  //equation 6 and 7, update water height
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var cellNext = coordNext(x, y);
      var sumFOut =
        cellNext.flowLeft +
        cellNext.flowRight +
        cellNext.flowTop +
        cellNext.flowBottom;

      var sumFIn = 0;
      if (x > 0) sumFIn += coordNext(x - 1, y).flowRight;
      if (x + 1 < width) sumFIn += coordNext(x + 1, y).flowLeft;
      if (y + 1 < height) sumFIn += coordNext(x, y + 1).flowBottom;
      if (y - 1 >= 0) sumFIn += coordNext(x, y - 1).flowTop;

      //net volume change of water
      var deltaV = DELTA_TIME * (sumFIn - sumFOut);
      // END OF (6)

      var waterheightD1 = coordNext(x, y).waterHeight;
      var waterheightD2 = waterheightD1 + deltaV / (PIPE_LENGTH * PIPE_LENGTH);
      coordNext(x, y).waterHeight = waterheightD1;
      // END OF  (7)

      // START (8) compute delta W x
      var deltaWX = 0; //average amount of water passing through cell
      {
        //update velocity
        if (x - 1 >= 0)
          deltaWX += coordNext(x - 1, y).flowRight - coordNext(x, y).flowLeft;
        if (x + 1 < width)
          deltaWX += coordNext(x, y).flowRight - coordNext(x + 1, y).flowLeft;

        deltaWX = deltaWX / 2;
      }

      var deltaWY = 0;
      {
        if (y - 1 >= 0)
          deltaWY += coordNext(x, y - 1).flowTop - coordNext(x, y).flowBottom;
        if (y + 1 < width)
          deltaWY += coordNext(x, y).flowTop - coordNext(x, y + 1).flowBottom;

        deltaWY = deltaWY / 2;
      }

      var dAvg = (waterheightD1 + waterheightD2) / 2;

      // COMPUTE velocity(u,v) usin g (8) and (9)
      var ly = PIPE_LENGTH;
      var lx = PIPE_LENGTH;
      var velX = deltaWX / (dAvg * ly);
      var velY = deltaWY / (dAvg * lx);
      coordNext(x, y).velocityX = velX;
      coordNext(x, y).velocityY = velY;
    }
  }
}

//step 3
/**
 * 3. Soil flow calculation with outflow in virtual pipes of thermal erosion model.
 */
function soilFlow() {
  //ironsight: why is this missing , is that relevant to the algorithm?
}

//step 4
/**
 * 4. Simulation of erosion-deposition process.
 * water on block picks up / deposists sediment
 * iterate all blocks
 * increment/decrement flux.sedimentAmount based on water velocity, and slope
 * does not care for neighbours
 */
function erode() {
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var i = x + y * width;

      //START OF (10)
      var tilt = max(0.01, calculateLocalTilt(x, y));

      var c_xy = //sediment capacity for cell xy
        SEDIMENT_CONSTANT *
        tilt *
        Math.sqrt(
          coordNext(x, y).velocityX * coordNext(x, y).velocityX +
            coordNext(x, y).velocityY * coordNext(x, y).velocityY
        );
      //absord soil
      if (c_xy > coordNext(x, y).sedimentAmount) {
        //reduce terrain soil
        var bTDeltaT =
          coordNext(x, y).terrainHeight -
          DISSOLVING_CONSTANT * (c_xy - coordNext(x, y).sedimentAmount);
        coordNext(x, y).terrainHeight = bTDeltaT;

        //increment suspended soil
        var s1 =
          coord(x, y).sedimentAmount +
          DISSOLVING_CONSTANT * (c_xy - coord(x, y).sedimentAmount);
        coordNext(x, y).sedimentAmount = s1;
      } else {
        //deposit soil onto terrain
        var bTDeltaT =
          coordNext(x, y).terrainHeight +
          DISSOLVING_CONSTANT * (coordNext(x, y).sedimentAmount - c_xy);
        coordNext(x, y).terrainHeight = bTDeltaT;

        //increment suspended soid
        var s1 =
          coord(x, y).sedimentAmount -
          DISSOLVING_CONSTANT * (coordNext(x, y).sedimentAmount - c_xy);
        coordNext(x, y).sedimentAmount = s1;
      }
    }
  }
}

//step 5
/**
 * 5. Transportation of suspended sediment by the velocity field.
 * 	sediment is water is transported based on velocity field
 */
function transportSediment() {
  var sed = [];
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      //write back soilT+1 (=s1) into soilT
      coord(x, y).sedimentAmount = coordNext(x, y).sedimentAmount;
    }
  }

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var cell = coordNext(x, y);
      var xOrg = x - cell.velocityX * DELTA_TIME;
      var yOrg = y - cell.velocityY * DELTA_TIME;

      var cellOrigin = coord(xOrg, yOrg);
      if (cellOrigin == undefined) continue;
      cell.sedimentAmount = cellOrigin.sedimentAmount;
    }
  }
}

//step 6
function thermalErode() {}

//step 7
function decreaseWater() {
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      coordNext(x, y).waterHeight =
        coordNext(x, y).waterHeight * 1.0 - EVAPORATION_CONSTANT * DELTA_TIME;
    }
  }
}

/////////////////////////

function getHeightAt(x, y) {
  if (DEBUG) return 62 + x / 10;
  return dimension.getHeightAt(x + minX, y + minY);
}
function setHeightAt(x, y, val) {
  if (DEBUG) return;
  dimension.setHeightAt(x + minX, y + minY, val);
}

function getWaterLevelAt(x, y) {
  if (DEBUG) return 62;
  return dimension.getWaterLevelAt(x + minX, y + minY);
}
function setWaterLevelAt(x, y, val) {
  //relative
  if (DEBUG) return;
  //dimension.setWaterLevelAt(x + minX, y + minY, getHeightAt(x, y) + val);
}

/**
 * Calculates the local tilt angle from the four direct neighbors of a cell.
 * @param {number} x - The X coordinate of the cell.
 * @param {number} y - The Y coordinate of the cell.
 * @returns {number} The tilt angle in degrees.
 */
function calculateLocalTilt(x, y) {
  // Heights of the current cell and its neighbors
  var slopeX = 0;
  if (x > 0 && x + 1 < width) {
    var heightLeft = coordNext(x - 1, y).terrainHeight;
    var heightRight = coordNext(x + 1, y).terrainHeight;
    slopeX = (heightRight - heightLeft) / 2; // Central difference approximation
    if (x + minX == 11 && y + minY == 1) {
      print("left" + heightLeft);
      print("right" + heightRight);
    }
  }
  var slopeY = 0;
  if (y > 0 && y + 1 < height) {
    var heightTop = coordNext(x, y - 1).terrainHeight;
    var heightBottom = coordNext(x, y + 1).terrainHeight;
    if (x + minX == 11 && y + minY == 1) {
      print("top" + heightTop);
      print("bottom" + heightBottom);
    } // Calculate slopes in X and Y directions
    slopeY = (heightBottom - heightTop) / 2;
  }
  // Compute the magnitude of the gradient (tilt)
  var gradientMagnitude = Math.sqrt(slopeX * slopeX + slopeY * slopeY);

  // Convert to tilt angle in degrees
  // Assuming the horizontal distance between neighbors is 1 unit
  var tiltAngleRadians = Math.atan(gradientMagnitude);

  if (x + minX == 11 && y + minY == 1)
    print(
      "" +
        (x + minX) +
        "," +
        (y + minY) +
        " slopeX = " +
        slopeX +
        " slopeY = " +
        slopeY +
        "gradient mag" +
        gradientMagnitude +
        " tilt angle rad: " +
        tiltAngleRadians +
        " sin tilt: " +
        Math.sin(tiltAngleRadians)
    );

  return Math.sin(tiltAngleRadians);
}

/**
 *
 * @returns {{ width: number, height: number}}
 */
function extent() {
  if (DEBUG) return { width: 40, height: 40 };

  var minX = dimension.getExtent().getX() * 128;
  var maxX =
    (dimension.getExtent().getX() + dimension.getExtent().getWidth()) * 128;
  var minY = dimension.getExtent().getY() * 128;
  var maxY =
    (dimension.getExtent().getY() + dimension.getExtent().getHeight()) * 128;
  var width = maxX - minX;
  var height = maxY - minY;
  return { width: width, height: height, minX: minX, minY: minY };
}

function truncate(number) {
  return number > 0 ? Math.floor(number) : Math.ceil(number);
}

function max(a, b) {
  if (a < b) return b;
  return a;
}
