"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPAWNS = exports.bombCoords = exports.GAMECONSTANTS = exports.Half = exports.State = exports.ConnectionStatus = exports.Team = void 0;
var Team;
(function (Team) {
    Team["NONE"] = "NONE";
    Team["COUNTER_TERRORIST"] = "COUNTER_TERRORIST";
    Team["TERRORIST"] = "TERRORIST";
})(Team = exports.Team || (exports.Team = {}));
var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus["CONNECTED"] = "CONNECTED";
    ConnectionStatus["DISCONNECTED"] = "DISCONNECTED";
})(ConnectionStatus = exports.ConnectionStatus || (exports.ConnectionStatus = {}));
var State;
(function (State) {
    State["CREATED"] = "CREATED";
    State["MATCH_STARTED"] = "MATCH_STARTED";
    State["MATCH_ENDED"] = "MATCH_ENDED";
})(State = exports.State || (exports.State = {}));
var Half;
(function (Half) {
    Half[Half["FIRST_HALF"] = 1] = "FIRST_HALF";
    Half[Half["SECOND_HALF"] = 2] = "SECOND_HALF";
})(Half = exports.Half || (exports.Half = {}));
var GAMECONSTANTS;
(function (GAMECONSTANTS) {
    GAMECONSTANTS[GAMECONSTANTS["TIME_LIMIT"] = 120] = "TIME_LIMIT";
    GAMECONSTANTS[GAMECONSTANTS["MAX_HEALTH"] = 100] = "MAX_HEALTH";
    GAMECONSTANTS[GAMECONSTANTS["MAX_BULLET_BUFFER"] = 10] = "MAX_BULLET_BUFFER";
    GAMECONSTANTS[GAMECONSTANTS["BULLET_VELOCITY"] = 750] = "BULLET_VELOCITY";
    GAMECONSTANTS[GAMECONSTANTS["HIT_REG_RADIUS"] = 100] = "HIT_REG_RADIUS";
    GAMECONSTANTS[GAMECONSTANTS["SHOT_DAMAGE"] = 25] = "SHOT_DAMAGE";
    GAMECONSTANTS[GAMECONSTANTS["TEAM_SIZE"] = 5] = "TEAM_SIZE";
    GAMECONSTANTS[GAMECONSTANTS["MAX_ROUNDS"] = 3] = "MAX_ROUNDS";
    GAMECONSTANTS[GAMECONSTANTS["SWITCH_SIDE_ROUND"] = 2] = "SWITCH_SIDE_ROUND";
    GAMECONSTANTS[GAMECONSTANTS["ROUND_TIME"] = 62] = "ROUND_TIME";
    GAMECONSTANTS[GAMECONSTANTS["BOMB_TIMER"] = 31] = "BOMB_TIMER";
})(GAMECONSTANTS = exports.GAMECONSTANTS || (exports.GAMECONSTANTS = {}));
exports.bombCoords = {
    x: 1700,
    y: 1700
};
exports.SPAWNS = {
    COUNTER_TERRORIST: [
        { x: 330, y: 125, angle: Math.PI, isTaken: false, by: undefined },
        { x: 430, y: 125, angle: Math.PI, isTaken: false, by: undefined },
        { x: 530, y: 125, angle: Math.PI, isTaken: false, by: undefined },
        { x: 630, y: 125, angle: Math.PI, isTaken: false, by: undefined },
        { x: 730, y: 125, angle: Math.PI, isTaken: false, by: undefined }
    ],
    TERRORIST: [
        { x: 1800, y: 1800, angle: -1 * Math.PI, isTaken: false, by: undefined },
        { x: 1700, y: 1800, angle: -1 * Math.PI, isTaken: false, by: undefined },
        { x: 1600, y: 1800, angle: -1 * Math.PI, isTaken: false, by: undefined },
        { x: 1500, y: 1800, angle: -1 * Math.PI, isTaken: false, by: undefined },
        { x: 1400, y: 1800, angle: -1 * Math.PI, isTaken: false, by: undefined }
    ]
};
