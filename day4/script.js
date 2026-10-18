// Select elements
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

// Updates character counter, word counter, and warning/over classes
function updateCounts() {
  const text = noteText.value;
  const chars = text.length;

  charCount.textContent = `${chars} / 200 characters`;

  const trimmed = text.trim();
  const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  wordCount.textContent = `${words} words`;

  charCount.classList.remove("warning", "over");
  if (chars > 200) {
    charCount.classList.add("over");
  } else if (chars > 180) {
    charCount.classList.add("warning");
  }
}

// Empties the textarea, resets counters, and removes saved draft
function clearAll() {
  noteText.value = "";
  localStorage.removeItem("draft");
  updateCounts();
}

// Input event: update counts and save draft
noteText.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem("draft", noteText.value);
});

// Escape key inside textarea clears it
noteText.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    clearAll();
  }
});

// Clear button click
clearBtn.addEventListener("click", clearAll);

// Theme toggle click
themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// On page load: restore draft and theme, then update counts
const savedDraft = localStorage.getItem("draft");
if (savedDraft !== null) {
  noteText.value = savedDraft;
}

const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "Light mode";
} else {
  document.body.classList.remove("dark");
  themeToggle.textContent = "Dark mode";
}

updateCounts();
