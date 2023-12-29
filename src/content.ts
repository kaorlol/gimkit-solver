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

Math.random = (min: number = 0, max: number = 1) => {
	if (min > max) throw new Error("Min cannot be greater than max");

	const array = new Uint32Array(1);
	const pseudorandomValue = crypto.getRandomValues(array)[0];
	return (pseudorandomValue / 2 ** 32) * (max - min) + min;
};

const script = document.createElement("script");
script.src = browser.runtime.getURL("index.js");
script.onload = () => script.remove();

(document.head || document.documentElement).appendChild(script);
