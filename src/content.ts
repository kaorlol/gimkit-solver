import browser from "webextension-polyfill";
import { Stores } from "./types/global";

declare global {
	interface Window {
		stores: Stores;
	}

	interface Math {
		random(min?: number, max?: number): number;
	}
}

Object.defineProperty(Math, "random", {
	value: (min: number = 0, max: number = 1) => {
		if (min > max) throw new Error("Min cannot be greater than max");

		const pseudorandomNumber = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
		return pseudorandomNumber * (max - min) + min;
	},
});

const script = document.createElement("script");
script.src = browser.runtime.getURL("script.js");
script.onload = function () {
	script.remove();
};

(document.head || document.documentElement).appendChild(script);
