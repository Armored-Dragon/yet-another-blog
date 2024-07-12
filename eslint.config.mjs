import globals from "globals";
import pluginJs from "@eslint/js";

export default [
	{
		files: ["**/*.js"],
		languageOptions: { sourceType: "commonjs" },
	},
	{ languageOptions: { globals: globals.browser } },
	pluginJs.configs.recommended,
	{
		rules: {
			"no-unused-vars": "error",
			"semi-style": ["error", "last"],
			indent: ["error", "tab"],
		},
	},
];
