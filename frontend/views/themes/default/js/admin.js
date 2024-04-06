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
