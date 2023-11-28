async function toggleState(setting_name, new_value, element_id) {
  // Show spinner
  qs(`#${element_id}`).parentNode.querySelector(".spinner").classList.remove("hidden");

  const form = {
    setting_name: setting_name,
    value: JSON.stringify(new_value),
  };

  const response = await request("/setting", "POST", form);

  qs(`#${element_id}`).parentNode.querySelector(".spinner").classList.add("hidden");

  // TODO: On failure, notify the user
  // Check response for errors
  if (response.body.success) {
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

async function updateValue(key_pressed, setting_name, new_value, element_id) {
  if (key_pressed !== 13) return;
  // Show spinner
  qs(`#${element_id}`).parentNode.querySelector(".spinner").classList.remove("hidden");

  const form = {
    setting_name: setting_name,
    value: new_value,
  };

  const response = await request("/setting", "POST", form);

  qs(`#${element_id}`).parentNode.querySelector(".spinner").classList.add("hidden");

  // TODO: On failure, notify the user
  // Check response for errors
  if (response.body.success) {
  }
}

function toggleActiveCategory(category_id) {
  // Pages ----------------
  // Hide all pages
  qsa(".category-page").forEach((page) => {
    page.classList.add("hidden");
  });
  // Show requested page
  qs(`#${category_id}`).classList.remove("hidden");

  // Navigation bar -------
  // Unactive all buttons
  qsa(".category-navigation button").forEach((btn) => {
    btn.classList.remove("active");
  });
  // Active current page
  qs(`#${category_id}-nav-btn`).classList.add("active");
  qs(`#${category_id}-nav-btn`).blur(); // Unfocus the button
}
