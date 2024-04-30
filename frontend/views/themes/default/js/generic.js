// Quick document selectors
const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => document.querySelectorAll(selector);

// TODO: Try/Catch for failed requests
async function request(url, method, body) {
  const response = await fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json", // Set the Content-Type header
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
