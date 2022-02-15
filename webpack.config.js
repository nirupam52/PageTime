const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
	experiments: {
		topLevelAwait: true
	},
	devtool: "inline-source-map",
	entry: ["@babel/polyfill", "./src/js/popup.js"],
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "bundle.js",
	},
	mode: "development",
	module: {
		rules: [
			{
				test: /\.m?js$/,
				exclude: /(node_modules|bower_components)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env'],
						plugins: []
					}
				}
			},
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
