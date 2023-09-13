// Quick document selectors
const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => document.querySelectorAll(selector);

async function request(url, method, body) {
  const response = await fetch(url, {
    method: method,
    body: body,
  });
  return { status: response.status, body: await response.json() };
}
