const persistent_setting = require("node-persist");
persistent_setting.init({ dir: "data/" });

const setupComplete = async () => (await persistent_setting.getItem("SETUP_COMPLETE")) || false;
const userRegistrationAllowed = async () => {
  const setting = await persistent_setting.getItem("REGISTRATION_ALLOWED");
  if (typeof setting == "undefined") return true;
  console.log(setting);
  return setting == "true";
};
const setSetupComplete = async () => await persistent_setting.setItem("SETUP_COMPLETE", "true");
const setUserRegistrationAllowed = (new_value) => persistent_setting.setItem("REGISTRATION_ALLOWED", String(new_value));

module.exports = { setupComplete, userRegistrationAllowed, setSetupComplete, setUserRegistrationAllowed };
