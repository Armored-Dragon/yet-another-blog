/* global qs request */

async function changeValue(setting_name, value) {
	const form = {
		setting_name: setting_name,
		value: value.value || value,
		id: window.location.href.split("/")[4],
	};
	const response = await request(`/api/web/user`, "PATCH", form);

	// TODO: On failure, notify the user
	if (response.body.success) {
		alert("Successfully changed setting.");
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

async function sendPasswordUpdate() {
	const new_password_1 = qs("#cp-new-1");
	const original_password_value = qs("#cp-current").value;

	const form = {
		setting_name: "password",
		value: new_password_1.value,
		original_password: original_password_value,
		id: window.location.href.split("/")[4],
	};
	const response = await request(`/api/web/user`, "PATCH", form);

	if (response.body.success) {
		alert("Successfully changed password");
	}
}

const fileInput = qs("#profile_picture");
fileInput.addEventListener("change", uploadProfileImage);

async function uploadProfileImage(event) {
	const file = event.target.files[0];
	const image_object = {
		data_blob: new Blob([await file.arrayBuffer()]),
		content_type: file.type,
	};

	let form_data = {
		buffer: await _readFile(image_object.data_blob),
		content_type: image_object.content_type,
		parent_id: window.location.href.split("/")[4],
		parent_type: "user",
	};

	const image_uploading_request = await request("/api/web/image", "POST", form_data);

	if (image_uploading_request.status == 200) {
		// Update profile picture link
		changeValue("profile_image", image_uploading_request.body);
		// alert(image_uploading_request.body);
	}
}

function _readFile(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}
