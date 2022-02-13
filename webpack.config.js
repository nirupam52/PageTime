const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
	devtool: "inline-source-map",
	entry: "./src/js/popup.js",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "bundle.js",
	},
	mode: "development",
	module: {
		rules: [
			{
				test: /\.(scss)$/,
				use: [
					{
						
						loader: "style-loader",
					},
					{
						
						loader: "css-loader",
					},
					{
						
						loader: "postcss-loader",
						options: {
							postcssOptions:{
								plugins: function () {
									return [require("autoprefixer")];
								},
							}
							
						},
					},
					{
						
						loader: "sass-loader",
					},
				],
			},
		],
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: "./src/popup.html",
			filename: "popup.html",
		}),
		new CopyPlugin({
			patterns: [{ from: "public" }, { from: "src/js/browsingDataStore.js" }, {from: "src/info.html"}],
		}),
	],
};
