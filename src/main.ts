import "./style.css";
import { explainWallet, type Step } from "./agent";
import { EMPTY_WALLET, SAMPLE_WALLET } from "./chain";

const form = document.querySelector("#lookup") as HTMLFormElement;
const addressInput = document.querySelector("#address") as HTMLInputElement;
const submitButton = document.querySelector("#submit") as HTMLButtonElement;
const error = document.querySelector("#form-error") as HTMLParagraphElement;
const status = document.querySelector("#status") as HTMLParagraphElement;
const steps = document.querySelector("#steps") as HTMLOListElement;
const note = document.querySelector("#note") as HTMLElement;
const noteText = document.querySelector("#note-text") as HTMLParagraphElement;

function addStep(step: Step) {
  const item = document.createElement("li");
  const tool = document.createElement("span");
  tool.className = "tool";
  tool.textContent = step.tool;
  const detail = document.createElement("span");
  detail.className = "detail";
  detail.textContent = step.detail;
  item.append(tool, detail);
  steps.append(item);
}

async function run(input: string) {
  error.textContent = "";
  status.textContent = "Calling tools…";
  steps.replaceChildren();
  note.hidden = true;
  submitButton.disabled = true;
  try {
    const report = await explainWallet(input, addStep);
    noteText.textContent = report.note;
    note.hidden = false;
    status.textContent = "Done. The note uses only the tool results above.";
  } catch (caught) {
    status.textContent = "";
    error.textContent = caught instanceof Error ? caught.message : "Base did not answer.";
  } finally {
    submitButton.disabled = false;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void run(addressInput.value);
});

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-example]")) {
  button.addEventListener("click", () => {
    const next = button.dataset.example === "empty" ? EMPTY_WALLET : SAMPLE_WALLET;
    addressInput.value = next;
    void run(next);
  });
}
