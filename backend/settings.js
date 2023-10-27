const persistent_setting = require("node-persist");
persistent_setting.init({ dir: "data/site/" });

let settings = {
  SETUP_COMPLETE: false,
  ACCOUNT_REGISTRATION: false,
  BLOG_UPLOADING: false,

  USER_MINIMUM_PASSWORD_LENGTH: 6,
};

async function act(key, value) {
  // Change value if we have a value field
  if (value) {
    // Just incase the value is a string instead of a boolean
    value = String(value).toLowerCase() === "true";

    await persistent_setting.setItem(key, value);
    settings[key] = value;
  }

  // Return the current setting
  return settings[key];
}

function getSettings() {
  return settings;
}

// Initialize our settings
setTimeout(async () => {
  for (let i = 0; Object.keys(settings).length > i; i++) {
    const setting_title = Object.keys(settings)[i];
    const setting_value = await persistent_setting.getItem(setting_title);

    settings[setting_title] = setting_value == true || setting_value == "true";
  }
}, 3000);

module.exports = { act, getSettings };
