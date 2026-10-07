const endpoint = document.querySelector("#endpoint");
const result = document.querySelector("#result");
const run = document.querySelector("#run");

document.querySelector("#year").textContent = new Date().getFullYear();

async function runRequest() {
  run.disabled = true;
  run.textContent = "Running…";
  result.textContent = "Loading…";

  try {
    const response = await fetch(endpoint.value);
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    result.textContent = JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      body
    }, null, 2);
  } catch (error) {
    result.textContent = JSON.stringify({ error: String(error) }, null, 2);
  } finally {
    run.disabled = false;
    run.textContent = "Run request";
  }
}

run.addEventListener("click", runRequest);
