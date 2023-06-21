"use strict";

require("..").register();
const pDefer = require("p-defer").default;

let { resolve, promise } = pDefer();

promise.then(() => {
	console.log("It works!");
});

resolve();
