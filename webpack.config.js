/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const path = require("path");

module.exports = {
	entry: {
		script: "./src/index.ts",
		content : "./src/content.ts",
	},
	module: {
		rules: [
			{
				test: /\.ts?$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: [".ts", ".js"],
	},
	output: {
		path: path.resolve(__dirname, "build"),
		filename: "[name].js",
	},
};
