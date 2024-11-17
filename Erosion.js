//Code by ctRy
//This was possible thanks to these two papersedimentAmount:
//"Fast Hydraulic Erosion Simulation and Visualization on GPU" by Xing Mei, Philippe Decaudin, Bao-Gang Hu
//"Fast Hydraulic and Thermal Erosion on the GPU" by Balazs Jako

///////////////////////////////////////////////////CODE/////////////////////////////////////////////////////

var ITERATIONS = 1;
var DELTA_TIME = 0.01;
var RAIN_CONSTANT = 1;
var PIPE_AREA = 20;
var GRAVITY = 9.8;
var PIPE_LENGTH = 1;
var SEDIMENT_CONSTANT = 1;
var MAX_EROSION_DEPTH = 100;
var DISSOLVING_CONSTANT = 0.5;
var DEPOSITION_CONSTANT = 1;
var BLOCK_CONSTANT = 1 / 256 / 256;
var EVAPORATION_CONSTANT = 1;

var minX = dimension.getExtent().getX() * 128;
var maxX =
  (dimension.getExtent().getX() + dimension.getExtent().getWidth()) * 128;
var minY = dimension.getExtent().getY() * 128;
var maxY =
  (dimension.getExtent().getY() + dimension.getExtent().getHeight()) * 128;
var width = maxX - minX;
var height = maxY - minY;

/////////////////////////

print("Script by ctRy\n");

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

function fluvial(argsFunc) {
  print("Starting Fluvial Erosion");

  addCoords();

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

  for (var i = 0; i < ITERATIONS; i++) {
    print("(" + (i + 1) + " / " + ITERATIONS + ")");

    increaseWater();
    flow();
    erode();
    transportSediment();
    decreaseWater();
  }

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      setWaterLevelAt(x, y, Math.ceil(coords[x + y * width].waterHeightRel));
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

function addCoords() {
  print("Adding coords");

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      //waterHeightRel: water height (relative to terrain height)
      //sedimentAmount: sediment amount
      //f: 4 directional vector of water movement
      //v: velocity
      //coords[x + y * width] = {waterHeightRel:Math.max(0, getWaterLevelAt(x, y) - height), sedimentAmount:0, f:{l:0, r:0, t:0, b:0}, v:{x:0, y:0} };
      coords[x + y * width] = {
        waterHeightRel: Math.max(0, getWaterLevelAt(x, y) - height),
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
}

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
    arr[i].waterHeightRel =
      arr[i].waterHeightRel + DELTA_TIME * 1.0 * RAIN_CONSTANT; //TODO
  });

  // for (var i in coords)
  // {
  // 	if (!coords.hasOwnProperty(i)) continue;

  // 	coords[i].waterHeightRel += DELTA_TIME * 1.0 * RAIN_CONSTANT;
  // }
}

//step 2
/**
 * 2. Flow simulation using shallow-water model. Computation of velocity field and water height changes.
 * this function iterates the whole map and updates the flux objects of all blocks
 * flow (in all 4 directions) and velocity x y are updated
 * flow is based on heightmap and neighbours height
 */
function flow() {
  //calculate flux for each 4 directions
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var i = x + y * width;
      if (x > 0)
        coords[i].flowLeft = Math.max(
          0,
          coords[i].flowLeft +
            (DELTA_TIME *
              PIPE_AREA *
              GRAVITY *
              (getHeightAt(x, y) +
                coords[i].waterHeightRel -
                getHeightAt(x - 1, y) -
                coords[i - 1].waterHeightRel)) /
              PIPE_LENGTH
        );
      if (x + 1 < width)
        coords[i].flowRight = Math.max(
          0,
          coords[i].flowRight +
            (DELTA_TIME *
              PIPE_AREA *
              GRAVITY *
              (getHeightAt(x, y) +
                coords[i].waterHeightRel -
                getHeightAt(x + 1, y) -
                coords[i + 1].waterHeightRel)) /
              PIPE_LENGTH
        );
      if (y > 0)
        coords[i].flowTop = Math.max(
          0,
          coords[i].flowTop +
            (DELTA_TIME *
              PIPE_AREA *
              GRAVITY *
              (getHeightAt(x, y) +
                coords[i].waterHeightRel -
                getHeightAt(x + 1, y) -
                coords[i - width].waterHeightRel)) /
              PIPE_LENGTH
        );
      if (y + 1 < height)
        coords[i].flowBottom = Math.max(
          0,
          coords[i].flowBottom +
            (DELTA_TIME *
              PIPE_AREA *
              GRAVITY *
              (getHeightAt(x, y) +
                coords[i].waterHeightRel -
                getHeightAt(x + 1, y) -
                coords[i + width].waterHeightRel)) /
              PIPE_LENGTH
        );

      //scale flux so the sum of every directions is less than the water in the tile
      var sumF =
        coords[i].flowLeft +
        coords[i].flowRight +
        coords[i].flowTop +
        coords[i].flowBottom;
      if (sumF > coords[i].waterHeightRel) {
        var factor = Math.min(
          1,
          (coords[i].waterHeightRel * PIPE_LENGTH * PIPE_LENGTH) /
            sumF /
            DELTA_TIME
        );
        coords[i].flowLeft *= factor;
        coords[i].flowRight *= factor;
        coords[i].flowTop *= factor;
        coords[i].flowBottom *= factor;
      }

      //print("after flowing:" + fluxToString(coords[i]));
    }
  }

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var i = x + y * width;

      var sumFOut =
        coords[i].flowLeft +
        coords[i].flowRight +
        coords[i].flowTop +
        coords[i].flowBottom;
      var sumFIn = 0;
      if (x > 0) sumFIn += coords[i - 1].flowRight;
      if (x + 1 < width) sumFIn += coords[i + 1].flowLeft;
      if (y > 0) sumFIn += coords[i - width].flowBottom;
      if (y + 1 < height) sumFIn += coords[i + width].flowTop;

      //update water level
      coords[i].waterHeightRel = Math.max(
        0,
        coords[i].waterHeightRel +
          (DELTA_TIME * (sumFIn - sumFOut)) / PIPE_LENGTH / PIPE_LENGTH
      );

      //update velocity
      if (x == 0)
        //left border
        coords[i].velocityX =
          coords[i].flowRight - coords[x + 1 + y * width].flowLeft;
      else if (x + 1 == width)
        //right border
        coords[i].velocityX =
          coords[x - 1 + y * width].flowRight - coords[i].flowLeft;
      else
        coords[i].velocityX =
          coords[i].flowRight -
          coords[x + 1 + y * width].flowLeft +
          coords[x - 1 + y * width].flowRight -
          coords[i].flowLeft;

      if (y == 0)
        //top border
        coords[i].velocityX =
          coords[i].flowBottom - coords[x + (y + 1) * width].flowTop;
      else if (y + 1 == height)
        //bottom border
        coords[i].velocityX =
          coords[x + (y - 1) * width].flowBottom - coords[i].flowTop;
      else
        coords[i].velocityX =
          coords[i].flowBottom -
          coords[x + (y + 1) * width].flowTop +
          coords[x + (y - 1) * width].flowBottom -
          coords[i].flowTop;
      //	print("after flowing:" + fluxToString(coords[i]));
    }
  }
}

/**
 *  comment by ironsight: step 1 and step 2 (flow update) seem to work (on first glance)
 * the flux objects produce somewhat coherent values, as in flowing top/bottom and haveing velocity for larger flow values (above 0.5)
 */

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

      var maxDepthMult = getHeightAt(x, y) >= MAX_EROSION_DEPTH ? 1 : 0;
      if (maxDepthMult == 0 && getHeightAt(x, y) > 0)
        maxDepthMult =
          1 - (MAX_EROSION_DEPTH - getHeightAt(x, y)) / MAX_EROSION_DEPTH;

      //irn: carry capacity of sediment based on slope and water velocity?
      var capacity =
        SEDIMENT_CONSTANT *
        Math.sin((getSlopeAt(x, y) * Math.PI) / 180) *
        Math.sqrt(
          coords[i].velocityX * coords[i].velocityX +
            coords[i].velocityY * coords[i].velocityY
        ) *
        (1 - maxDepthMult);

      if (capacity > 1000) print(capacity); //ironsight: is this for debugging?

      if (capacity > coords[i].sedimentAmount) {
        setHeightAt(
          x,
          y,
          getHeightAt(x, y) -
            DISSOLVING_CONSTANT *
              (capacity - coords[i].sedimentAmount) *
              BLOCK_CONSTANT
        );
        coords[i].sedimentAmount +=
          DISSOLVING_CONSTANT * (capacity - coords[i].sedimentAmount);
      } else if (capacity < coords[i].sedimentAmount) {
        setHeightAt(
          x,
          y,
          getHeightAt(x, y) +
            DEPOSITION_CONSTANT *
              (coords[i].sedimentAmount - capacity) *
              BLOCK_CONSTANT
        );
        coords[i].sedimentAmount -=
          DEPOSITION_CONSTANT * (coords[i].sedimentAmount - capacity);
      }

      //print(x + " " + y + " " + capacity + " " + coords[i].waterHeightRel);
      //prepare for transport sediment
      //coords[i].ss = coords[i].sedimentAmount;
      //	print(fluxToString(coords[i]))
    }
  }
}

function transportSediment(flux) {}

//step 5
/**
 * 5. Transportation of suspended sediment by the velocity field.
 * 	sediment is water is transported based on velocity field
 */
function transportSediment() {
  var sed = [];
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var i = x + y * width;
      sed[i] = coords[i].sedimentAmount;
    }
  }

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var i = x + y * width;

      // if (coords[i].ss <= 0)
      // 	continue;

      var coordOffsetX = coords[i].velocityX > 0 ? 1 : 0;
      var coordOffsetY = coords[i].velocityY > 0 ? 1 : 0;
      var baseCoordX = x - coordOffsetX;
      var baseCoordY = y - coordOffsetY;
      var coordPartX = coords[i].velocityX * DELTA_TIME - coordOffsetX;
      var coordPartY = coords[i].velocityY * DELTA_TIME - coordOffsetY;

      var sSum = 0;
      var wSum = 0;
      //top left
      if (
        baseCoordX < width &&
        x >= coordOffsetX &&
        baseCoordY < height &&
        y >= coordOffsetY
      ) {
        var weight = (1 + coordPartX) * (1 + coordPartY);
        sSum += sed[baseCoordX + baseCoordY * width] * weight;
        wSum += weight;
      }
      //top right
      if (
        baseCoordX + 1 < width &&
        x + 1 >= coordOffsetX &&
        baseCoordY < height &&
        y >= coordOffsetY
      ) {
        var weight = coordPartX * (1 + coordPartY);
        sSum += sed[baseCoordX + 1 + baseCoordY * width] * weight;
        wSum += weight;
      }
      //bottom left
      if (
        baseCoordX < width &&
        x >= coordOffsetX &&
        baseCoordY + 1 < height &&
        y + 1 >= coordOffsetY
      ) {
        var weight = (1 + coordPartX) * coordPartY;
        sSum += sed[baseCoordX + (baseCoordY + 1) * width] * weight;
        wSum += weight;
      }
      //bottom right
      if (
        baseCoordX + 1 < width &&
        x + 1 >= coordOffsetX &&
        baseCoordY + 1 < height &&
        y + 1 >= coordOffsetY
      ) {
        var weight = coordPartX * coordPartY;
        sSum += sed[baseCoordX + 1 + (baseCoordY + 1) * width] * weight;
        wSum += weight;
      }

      coords[i].sedimentAmount = wSum > 0 ? sSum / wSum : 0;
      //print(coords[i].sedimentAmount);
      print(fluxToString(coords[i]));
    }
  }
}

//step 6
function thermalErode() {}

//step 7
function decreaseWater() {
  coords.forEach(function (coord, i, arr) {
    arr[i].waterHeightRel *= Math.max(
      0,
      1.0 - EVAPORATION_CONSTANT * DELTA_TIME
    ); //TODO
    print(fluxToString(coords[i]));
  });
}

/////////////////////////

function getHeightAt(x, y) {
  return dimension.getHeightAt(x + minX, y + minY);
}
function setHeightAt(x, y, val) {
  dimension.setHeightAt(x + minX, y + minY, val);
}

function getWaterLevelAt(x, y) {
  return dimension.getWaterLevelAt(x + minX, y + minY);
}
function setWaterLevelAt(x, y, val) {
  //relative
  dimension.setWaterLevelAt(x + minX, y + minY, getHeightAt(x, y) + val);
}

function getSlopeAt(x, y) {
  return dimension.getSlope(x + minX, y + minY);
}

function truncate(number) {
  return number > 0 ? Math.floor(number) : Math.ceil(number);
}
