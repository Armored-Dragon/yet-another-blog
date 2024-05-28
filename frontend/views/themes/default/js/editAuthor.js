async function changeValue(setting_name, element, extra = {}) {
	const form = {
		setting_name: setting_name,
		value: element.value,
		id: window.location.href.split("/")[4],
		...extra,
	};
	const response = await request(`/api/web/user`, "PATCH", form);

	// TODO: On failure, notify the user
	if (response.body.success) {
		alert("Successfully changed password");
	}
}
const change_password_dialog = qs("#change-password-dialog");

qs("#change-password-button").addEventListener("click", () => change_password_dialog.showModal());
qs("#cp-cancel").addEventListener("click", () => change_password_dialog.close());

function changePasswordInputUpdate() {
	const status = qs("#change-password-dialog .status");
	const current_password = qs("#cp-current");

	if (current_password.value === "") return (status.innerText = "Please enter your current password.");

	if (!_newPasswordEntriesMatch()) return (status.innerText = "New password does not match.");

	return (status.innerHTML = "&nbsp;");
}

function sendPasswordUpdate() {
	if (!_newPasswordEntriesMatch()) return false;

	const current_password = qs("#cp-current").value;
	const new_password_1 = qs("#cp-new-1");

	changeValue("password", new_password_1, { original_password: current_password });
}

function _newPasswordEntriesMatch() {
	const new_password_1 = qs("#cp-new-1");
	const new_password_2 = qs("#cp-new-2");

	return new_password_1.value === new_password_2.value;
}
