"use strict";

const fixESM = require("..");
const clearModule = require("clear-module");

let pDefer;

function tryRegularImport() {
	clearModule("p-defer");
	
	try {
		pDefer = require("p-defer").default;
		throw new Error(`This point should not be reached!`);
	} catch (error) {
		if (error.code === "ERR_REQUIRE_ESM") {
			console.log("It works!");
		} else {
			throw error;
		}
	}
}

function tryCustomImport() {
	clearModule("p-defer");

	pDefer = fixESM.require("p-defer").default;

	let { resolve, promise } = pDefer();

	promise.then(() => {
		console.log("It works!");
	});

	resolve();
}

tryRegularImport();
tryCustomImport();
tryRegularImport(); // Once more, to ensure that the hook hasn't lingered

// This should print "It works!" three times!
