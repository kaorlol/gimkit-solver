import browser from "webextension-polyfill";

const script = document.createElement("script");
script.src = browser.runtime.getURL("script.js");
script.onload = function () {
	script.remove();
};

(document.head || document.documentElement).appendChild(script);
