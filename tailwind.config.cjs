/** @type {import('tailwindcss').Config}*/
module.exports = {
	// Note: config only includes the used styles & variables of your selection
	content: ["./src/**/*.{html,vue,svelte,js,jsx,tsx}"],
	theme: {
	  extend: {
		fontFamily: {
		  "medium-font-family": "NotoSansKr-Medium, sans-serif",
		  "small-medium-font-family": "NotoSansKr-Medium, sans-serif",
		  "small-font-family": "NotoSansKr-Regular, sans-serif",
		  "xsmall-font-family": "NotoSansKr-Regular, sans-serif",
		},
		fontSize: {
		  "medium-font-size": "16px",
		  "small-medium-font-size": "13px",
		  "small-font-size": "10px",
		  "xsmall-font-size": "8px",
		},
		fontWeight: {
		  "medium-font-weight": "500",
		  "small-medium-font-weight": "500",
		  "small-font-weight": "400",
		  "xsmall-font-weight": "400",
		},
		lineHeight: {
		  "medium-line-height": "normal",
		  "small-medium-line-height": "normal",
		  "small-line-height": "normal",
		  "xsmall-line-height": "normal",
		},
		borderRadius: {},
		colors: {
		  "primary-primary-800": "#6a5134",
		  "gray-gray-950": "#1a1a1a",
		  "gray-gray-800": "#343434",
		},
		spacing: {},
		width: {},
		minWidth: {},
		maxWidth: {},
		height: {},
		minHeight: {},
		maxHeight: {},
	  },
	},
};
