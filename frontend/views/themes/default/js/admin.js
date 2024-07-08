async function toggleState(setting_name, element) {
	console.log(element.checked);
	const form = {
		setting_name: setting_name,
		value: element.checked,
	};
	const response = await request("/setting", "POST", form);

	// TODO: On failure, notify the user
	if (response.body.success) {
	}
}

async function changeValue(setting_name, element) {
	const form = {
		setting_name: setting_name,
		value: element.value,
	};
	const response = await request("/setting", "POST", form);

	// TODO: On failure, notify the user
	if (response.body.success) {
	}
}

async function addTheme() {
	const url = qs("#theme-url").value;

	if (!url || url.length == 0) return false;

	const response = await request("/api/theme", "POST", { url: url });

	if (response.body.success) {
		alert("Added theme.");
	}
}

async function setTheme(name) {
	const form = {
		setting_name: "theme",
		value: name,
	};

	const response = await request("/setting", "POST", form);

	if (response.body.success) {
		alert("Changed theme.");
	}
}
