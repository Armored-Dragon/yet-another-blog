async function changeValue(setting_name, element) {
  const form = {
    setting_name: setting_name,
    value: element.value,
    id: window.location.href.split("/")[4],
  };
  const response = await request(`/api/web/user`, "PATCH", form);

  // TODO: On failure, notify the user
  if (response.body.success) {
  }
}
