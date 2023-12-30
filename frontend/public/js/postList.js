qs("#search-btn").addEventListener("click", search);

function search() {
  const url_query = `search=${qs("input").value}`;
  window.location.href = `${window.location.origin}${window.location.pathname}?${url_query}`;
}
