async function changeValue(setting_name, element) {
	const form = {
		setting_name: setting_name,
		value: element.value,
		id: window.location.href.split("/")[4],
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
	const new_password_1 = qs("#cp-new-1");
	const new_password_2 = qs("#cp-new-2");

	if (current_password.value === "") return (status.innerText = "Please enter your current password.");

	if (new_password_1.value !== new_password_2.value) return (status.innerText = "New password does not match.");

	return (status.innerHTML = "&nbsp;");
}

function sendPasswordUpdate() {
	const new_password_1 = qs("#cp-new-1");
	// Check fields match
	// Send post update
	changeValue("password", new_password_1);
}
