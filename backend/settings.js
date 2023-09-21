const persistent_setting = require("node-persist");
persistent_setting.init({ dir: "data/" });

const setupComplete = async () => (await persistent_setting.getItem("SETUP_COMPLETE")) || false;
const userRegistrationAllowed = async () => (await persistent_setting.getItem("REGISTRATION_ALLOWED")) == "true";

const setUserRegistrationAllowed = (new_value) => persistent_setting.setItem("REGISTRATION_ALLOWED", String(new_value));

module.exports = { setupComplete, userRegistrationAllowed, setUserRegistrationAllowed };
