let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
  const lowerWord = word.toLowerCase();
  return notes.filter(note => note.text.toLowerCase().includes(lowerWord));
}

function longestNote() {
  if (notes.length === 0) return null;
  
  let longest = notes[0];
  for (let i = 1; i < notes.length; i++) {
    if (notes[i].text.length > longest.text.length) {
      longest = notes[i];
    }
  }
  return longest;
}

function countByCategory() {
  const counts = {};
  for (let i = 0; i < notes.length; i++) {
    const cat = notes[i].category;
    if (counts[cat]) {
      counts[cat]++;
    } else {
      counts[cat] = 1;
    }
  }
  return counts;
}

function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  const noteWord = total === 1 ? "note" : "notes";
  
  const details = [];
  for (const cat in counts) {
    details.push(`${counts[cat]} ${cat}`);
  }
  
  return `${total} ${noteWord}: ${details.join(', ')}.`;
}

function isDuplicate(text) {
  const normalizedText = text.trim().toLowerCase();
  return notes.some(note => note.text.trim().toLowerCase() === normalizedText);
}

function addNote(text, category) {
  if (text.length < 1 || text.length > 200) {
    console.log("Failed to add note: text must be between 1 and 200 characters.");
    return false;
  }
  
  if (category !== "personal" && category !== "work" && category !== "study") {
    console.log("Failed to add note: category must be 'personal', 'work', or 'study'.");
    return false;
  }
  
  if (isDuplicate(text)) {
    console.log("Failed to add note: it is a duplicate.");
    return false;
  }
  
  const newId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
  notes.push({ id: newId, text: text, category: category });
  console.log("Note successfully added.");
  return true;
}


// --- Tests ---

console.log("=== searchNotes ===");
console.log(searchNotes("day")); 
// Expected output: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]
console.log(searchNotes("javascript"));
// Expected output: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]
console.log(searchNotes("zebra")); 
// Expected output: []

console.log("\n=== longestNote ===");
console.log(longestNote()); 
// Expected output: { id: 3, text: "Email the project report to Grace", category: "work" }

const originalNotes = [...notes]; // Store notes for edge case tests
notes = []; 
console.log(longestNote()); 
// Expected output: null
notes = [...originalNotes]; // Restore notes

console.log("\n=== countByCategory ===");
console.log(countByCategory()); 
// Expected output: { personal: 2, study: 2, work: 1 }

notes = [];
console.log(countByCategory());
// Expected output: {}
notes = [...originalNotes];

console.log("\n=== getSummary ===");
console.log(getSummary()); 
// Expected output: "5 notes: 2 personal, 2 study, 1 work."

notes = [{ id: 1, text: "Only one note", category: "personal" }];
console.log(getSummary());
// Expected output: "1 note: 1 personal."
notes = [...originalNotes];

console.log("\n=== isDuplicate ===");
console.log(isDuplicate("  call MUM  ")); 
// Expected output: true
console.log(isDuplicate("Go for a run")); 
// Expected output: false

console.log("\n=== addNote ===");
console.log(addNote("Buy groceries", "personal")); 
// Expected output: Note successfully added. true
console.log(addNote("Call mum", "personal")); 
// Expected output: Failed to add note: it is a duplicate. false
console.log(addNote("", "work")); 
// Expected output: Failed to add note: text must be between 1 and 200 characters. false
console.log(addNote("Learn CSS", "hobby")); 
// Expected output: Failed to add note: category must be 'personal', 'work', or 'study'. false
