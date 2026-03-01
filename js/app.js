$SD.on('connected', conn => connected(conn));

var ACTION_UUIDS = [
    "com.felixmil.dice.d4", "com.felixmil.dice.d6", "com.felixmil.dice.d8",
    "com.felixmil.dice.d10", "com.felixmil.dice.d12", "com.felixmil.dice.d20",
    "com.felixmil.dice.custom"
];

var PRESETS = {
    "com.felixmil.dice.d4": { lowerLimit: 1, upperLimit: 4 },
    "com.felixmil.dice.d6": { lowerLimit: 1, upperLimit: 6 },
    "com.felixmil.dice.d8": { lowerLimit: 1, upperLimit: 8 },
    "com.felixmil.dice.d10": { lowerLimit: 1, upperLimit: 10 },
    "com.felixmil.dice.d12": { lowerLimit: 1, upperLimit: 12 },
    "com.felixmil.dice.d20": { lowerLimit: 1, upperLimit: 20 },
    "com.felixmil.dice.custom": null
};

function connected (jsn) {
    debugLog('Connected Plugin:', jsn);
    ACTION_UUIDS.forEach(function (uuid) {
        $SD.on(uuid + ".willAppear", jsonObj => diceAction.onWillAppear(jsonObj));
        $SD.on(uuid + ".keyDown", jsonObj => diceAction.onKeyDown(jsonObj));
        $SD.on(uuid + ".keyUp", jsonObj => diceAction.onKeyUp(jsonObj));
        $SD.on(uuid + ".sendToPlugin", jsonObj => diceAction.onSendToPlugin(jsonObj));
    });
}

var DICE_LABELS = {
	"com.felixmil.dice.d4": "d4",
	"com.felixmil.dice.d6": "d6",
	"com.felixmil.dice.d8": "d8",
	"com.felixmil.dice.d10": "d10",
	"com.felixmil.dice.d12": "d12",
	"com.felixmil.dice.d20": "d20",
	"com.felixmil.dice.custom": "d?",
};

var fontMagnitudes = {
	"0": [70, 0],
	"1": [70, 0],
	"2": [70, 4],
	"3": [56, 4],
	"4": [46, 4],
	"5": [37, 3],
	"6": [32, 2],
	"7": [29, 2],
	"other": [25, 2],
};

/** Map upperLimit to dice shape: d4=triangle, d6=square, d8=double-triangle, d10/d12=pentagon, d20=hexagon */
function getDiceShape(upperLimit) {
	var n = parseInt(upperLimit, 10) || 20;
	if (n === 6) return "square";
	if (n === 4) return "triangle";
	if (n === 8) return "double-triangle";
	if (n === 10 || n === 12) return "pentagon";
	if (n === 20) return "hexagon";
	return n <= 6 ? "square" : n <= 8 ? "double-triangle" : n <= 12 ? "pentagon" : "hexagon";
}

var SHAPE_SVGS = {
	triangle: "images/shape-triangle.svg",
	"double-triangle": "images/shape-double-triangle.svg",
	square: "images/shape-square.svg",
	pentagon: "images/shape-pentagon.svg",
	hexagon: "images/shape-hexagon.svg"
};

var diceAction = {
	cache: {},
	lastContext: null,
	defaultHandleObj: {
		action: null,
		timer: null,
		resultTimer: null,
		doublePressTimer: null,
		canvas: null,
		hadLongPress: false,
		settings: {
			lowerLimit: 1,
			upperLimit: 6,
			diceAmount: 1,
			median: false,
			addValue: 0,
			lastRoll: null,
		},
	},

	getHandleObjFromCache: function(context) {
		let handleObj = this.cache[context];
		if (handleObj === undefined) {
			handleObj = JSON.parse(JSON.stringify(this.defaultHandleObj));
			this.cache[context] = handleObj;
		}
		return handleObj;
	},

	onKeyDown: function(jsonObj) {
		var context = jsonObj.context;
		lastContext = context;
		let handleObj = this.getHandleObjFromCache(context);

		clearTimeout(handleObj.resultTimer);
		handleObj.resultTimer = null;
		handleObj.timer = setTimeout(function() {
			handleObj.hadLongPress = true;
			diceAction.updateSettings(context, {lastRoll: null});
			diceAction.setDiceRoll(context, null);
		}, 500);
	},

	onKeyUp: function(jsonObj) {
		var context = jsonObj.context;
		lastContext = context;
		let handleObj = this.getHandleObjFromCache(context);

		clearTimeout(handleObj.timer);

		if (handleObj.hadLongPress) {
			handleObj.hadLongPress = false;
			return;
		}

		// If a double-press timer is already running, this is the second press
		if (handleObj.doublePressTimer !== null) {
			clearTimeout(handleObj.doublePressTimer);
			handleObj.doublePressTimer = null;
			diceAction.rollAdvantage(context);
			return;
		}

		// First press — roll immediately, then open a 300ms double-press window
		diceAction.rollSingle(context);
		handleObj.doublePressTimer = setTimeout(function() {
			handleObj.doublePressTimer = null;
		}, 300);
	},

	rollSingle: function(context) {
		let handleObj = this.getHandleObjFromCache(context);

		var rolls = [];
		var lastRoll = 0;
		for (let i = 0; i < handleObj.settings.diceAmount; i++) {
			rolls.push(Math.floor(Math.random() * (handleObj.settings.upperLimit - handleObj.settings.lowerLimit + 1) + handleObj.settings.lowerLimit));
		}

		if (handleObj.settings.median) {
			rolls = rolls.sort();
			var len = rolls.length;
			var mid = Math.ceil(len / 2);
			lastRoll = len % 2 == 0 ? rolls[mid] : rolls[mid - 1];
		} else {
			rolls.forEach(function(value) { lastRoll += value; });
		}

		lastRoll += handleObj.settings.addValue;

		diceAction.updateSettings(context, {lastRoll: lastRoll});
		diceAction.setDiceRoll(context, lastRoll);
		diceAction.startResultTimer(context);
	},

	rollAdvantage: function(context) {
		let handleObj = this.getHandleObjFromCache(context);

		var roll1 = Math.floor(Math.random() * (handleObj.settings.upperLimit - handleObj.settings.lowerLimit + 1) + handleObj.settings.lowerLimit);
		var roll2 = Math.floor(Math.random() * (handleObj.settings.upperLimit - handleObj.settings.lowerLimit + 1) + handleObj.settings.lowerLimit);

		diceAction.updateSettings(context, {lastRoll: null});
		diceAction.setAdvantageRoll(context, roll1, roll2);
		diceAction.startResultTimer(context);
	},

	startResultTimer: function(context) {
		let handleObj = this.getHandleObjFromCache(context);
		clearTimeout(handleObj.resultTimer);
		handleObj.resultTimer = setTimeout(function() {
			diceAction.updateSettings(context, {lastRoll: null});
			diceAction.setDiceRoll(context, null);
		}, 10000);
	},

	onWillAppear: function(jsonObj) {
		var context = jsonObj.context;
		var action = jsonObj.action;
		var settings = jsonObj.payload.settings;
		lastContext = context;
		let handleObj = this.getHandleObjFromCache(context);
		handleObj.action = action;

		var preset = PRESETS[action];
		if (preset) {
			handleObj.settings.lowerLimit = preset.lowerLimit;
			handleObj.settings.upperLimit = preset.upperLimit;
		}

		if (settings != null) {
			if (settings.hasOwnProperty('lastRoll')) {
				handleObj.settings.lastRoll = settings["lastRoll"];
				if (handleObj.settings.lastRoll === undefined || isNaN(handleObj.settings.lastRoll)) {
					handleObj.settings.lastRoll = null;
				}
			}
			if (!preset) {
				if (settings.hasOwnProperty('lowerLimit')) {
					handleObj.settings.lowerLimit = parseInt(settings["lowerLimit"]) || 1;
				}
				if (settings.hasOwnProperty('upperLimit')) {
					handleObj.settings.upperLimit = parseInt(settings["upperLimit"]) || 6;
				}
			}
			if (settings.hasOwnProperty('diceAmount')) {
				handleObj.settings.diceAmount = parseInt(settings["diceAmount"]) || 1;
			}
			if (settings.hasOwnProperty('median')) {
				handleObj.settings.median = Boolean(settings["median"]) || false;
			}
			if (settings.hasOwnProperty('addValue')) {
				handleObj.settings.addValue = parseInt(settings["addValue"]) || 0;
			}
		}

		this.setDiceRoll(context, handleObj.settings.lastRoll);
		if (handleObj.settings.lastRoll !== null) {
			diceAction.startResultTimer(context);
		}
	},

	onSendToPlugin: function(jsonObj) {
		var context = jsonObj.context;
		var action = jsonObj.action;
		let handleObj = this.getHandleObjFromCache(context);
		if (!handleObj.action) handleObj.action = action;

		if (jsonObj.payload.hasOwnProperty('DATAREQUEST')) {
			$SD.api.sendToPropertyInspector(
				context,
				{
					action: handleObj.action,
					lowerLimit: handleObj.settings.lowerLimit,
					upperLimit: handleObj.settings.upperLimit,
					diceAmount: handleObj.settings.diceAmount,
					median: handleObj.settings.median,
					addValue: handleObj.settings.addValue,
				},
				handleObj.action
			);
		} else {
			var isCustom = action === "com.felixmil.dice.custom";
			if (isCustom && jsonObj.payload.hasOwnProperty('lowerLimit')) {
				handleObj.settings.lowerLimit = parseInt(jsonObj.payload['lowerLimit']) || 1;
			}
			if (isCustom && jsonObj.payload.hasOwnProperty('upperLimit')) {
				handleObj.settings.upperLimit = parseInt(jsonObj.payload['upperLimit']) || 6;
			}
			if (jsonObj.payload.hasOwnProperty('diceAmount')) {
				handleObj.settings.diceAmount = parseInt(jsonObj.payload['diceAmount']) || 1;
			}
			if (jsonObj.payload.hasOwnProperty('median')) {
				handleObj.settings.median = Boolean(jsonObj.payload['median']) || false;
			}
			if (jsonObj.payload.hasOwnProperty('addValue')) {
				handleObj.settings.addValue = parseInt(jsonObj.payload['addValue']) || 0;
			}
			if (isCustom && handleObj.settings.lowerLimit > handleObj.settings.upperLimit) {
				var t = handleObj.settings.lowerLimit;
				handleObj.settings.lowerLimit = handleObj.settings.upperLimit;
				handleObj.settings.upperLimit = t;
			}

			diceAction.updateSettings(context, {
				lowerLimit: handleObj.settings.lowerLimit,
				upperLimit: handleObj.settings.upperLimit,
				diceAmount: handleObj.settings.diceAmount,
				median: handleObj.settings.median,
				addValue: handleObj.settings.addValue,
			});
		}
	},

	setDiceRoll: function(context, num) {
		let handleObj = this.getHandleObjFromCache(context);
		var upperLimit = handleObj.settings.upperLimit;
		var shape = getDiceShape(upperLimit);

		if (handleObj.canvas === null) {
			handleObj.canvas = document.createElement("canvas");
			handleObj.canvas.width = 144;
			handleObj.canvas.height = 144;
			handleObj.canvas.context = context;
		}

		let ctx = handleObj.canvas.getContext("2d");
		ctx.filter = "none";
		ctx.fillStyle = "#0A1423";
		ctx.fillRect(0, 0, handleObj.canvas.width, handleObj.canvas.height);

		var shapeUrl = SHAPE_SVGS[shape] || SHAPE_SVGS.square;
		var img = new Image();
		img.onload = function() {
			var cx = handleObj.canvas.width / 2, cy = handleObj.canvas.height / 2;
			var margin = 16;
			var w = handleObj.canvas.width - 2 * margin;
			var h = handleObj.canvas.height - 2 * margin;
			ctx.drawImage(img, margin, margin, w, h);

			var isCustom = handleObj.action === "com.felixmil.dice.custom";
			var label, fontSize;
			if (num === null) {
				if (!isCustom) {
					var dLabel = DICE_LABELS[handleObj.action] || ("d" + handleObj.settings.upperLimit);
					label = dLabel;
					fontSize = dLabel.length <= 2 ? 36 : 30;
				}
			} else {
				label = "" + num;
				var magnitude = num !== 0 ? Math.floor(Math.log10(Math.abs(num))) : 1;
				fontSize = (fontMagnitudes["" + magnitude] || fontMagnitudes.other)[0];
				if (num < 0 && magnitude > 1) {
					fontSize -= (fontMagnitudes["" + magnitude] || [0, 2])[1] || 2;
				}
			}
			if (label) {
				ctx.fillStyle = "#FFFFFF";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.font = fontSize + "px Arial";
				ctx.fillText(label, cx, cy);
			}
			$SD.api.setImage(context, handleObj.canvas.toDataURL());
		};
		img.src = shapeUrl;
	},

	setAdvantageRoll: function(context, roll1, roll2) {
		let handleObj = this.getHandleObjFromCache(context);
		var upperLimit = handleObj.settings.upperLimit;
		var shape = getDiceShape(upperLimit);

		if (handleObj.canvas === null) {
			handleObj.canvas = document.createElement("canvas");
			handleObj.canvas.width = 144;
			handleObj.canvas.height = 144;
			handleObj.canvas.context = context;
		}

		let ctx = handleObj.canvas.getContext("2d");
		ctx.filter = "none";
		ctx.fillStyle = "#0A1423";
		ctx.fillRect(0, 0, handleObj.canvas.width, handleObj.canvas.height);

		var shapeUrl = SHAPE_SVGS[shape] || SHAPE_SVGS.square;
		var img = new Image();
		img.onload = function() {
			var cx = handleObj.canvas.width / 2, cy = handleObj.canvas.height / 2;
			var margin = 16;
			var w = handleObj.canvas.width - 2 * margin;
			var h = handleObj.canvas.height - 2 * margin;
			ctx.drawImage(img, margin, margin, w, h);

			ctx.fillStyle = "#FFFFFF";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = "28px Arial";
			ctx.fillText(roll1 + " | " + roll2, cx, cy);
			$SD.api.setImage(context, handleObj.canvas.toDataURL());
		};
		img.src = shapeUrl;
	},

	/* Helper function to set settings while keeping all other fields unchanged */
	updateSettings: function(context, settings) {
		let handleObj = this.getHandleObjFromCache(context);
		let updatedSettings = handleObj.settings;

		for (let field in settings) {
			updatedSettings[field] = settings[field];
		}

		$SD.api.setSettings(context, updatedSettings);
	},
};
