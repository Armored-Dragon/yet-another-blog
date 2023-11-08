async function toggleState(setting_name, new_value, element_id) {
  // Show spinner
  qs(`#${element_id}`).parentNode.querySelector(".spinner").classList.remove("hidden");

  const form = {
    setting_name: setting_name,
    value: JSON.stringify(new_value),
  };

  const response = await request("/setting", "POST", form);

  // Check response for errors
  if (response.body.success) {
    qs(`#${element_id}`).parentNode.querySelector(".spinner").classList.add("hidden");

    // Update visual to reflect current setting
    // Class
    const add_class = new_value ? "good" : "bad";
    const remove_class = new_value ? "bad" : "good";
    qs(`#${element_id}`).classList.remove(remove_class);
    qs(`#${element_id}`).classList.add(add_class);

    // Text
    const new_text = new_value ? "Enabled" : "Disabled";
    qs(`#${element_id}`).children[0].innerText = new_text;

    // Function
    const add_function = new_value ? `toggleState('${setting_name}', false, this.id)` : `toggleState('${setting_name}', true, this.id)`;
    qs(`#${element_id}`).removeAttribute("onclick");
    qs(`#${element_id}`).setAttribute("onclick", add_function);
  }
}
