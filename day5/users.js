// Select DOM elements
const loadUsersBtn = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const statusEl = document.getElementById("status");
const usersList = document.getElementById("users-list");

// Store loaded users array
let users = [];

// Renders an array of user objects into the users list
function renderUsers(list) {
  usersList.innerHTML = "";

  if (list.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.textContent = "No users match your filter.";
    usersList.appendChild(emptyLi);
    return;
  }

  list.forEach((user) => {
    const li = document.createElement("li");

    const nameEl = document.createElement("h3");
    nameEl.textContent = user.name;

    const emailEl = document.createElement("p");
    emailEl.textContent = `Email: ${user.email}`;

    const cityEl = document.createElement("p");
    const cityName = user.address?.city || user.city || "";
    cityEl.textContent = `City: ${cityName}`;

    const companyEl = document.createElement("p");
    const companyName = user.company?.name || user.company || "";
    companyEl.textContent = `Company: ${companyName}`;

    li.appendChild(nameEl);
    li.appendChild(emailEl);
    li.appendChild(cityEl);
    li.appendChild(companyEl);

    usersList.appendChild(li);
  });
}

// Loads users from JSONPlaceholder API
async function loadUsers() {
  loadUsersBtn.disabled = true;
  statusEl.textContent = "Loading users...";
  usersList.innerHTML = "";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    users = data;
    statusEl.textContent = "Users loaded successfully.";
    renderUsers(users);
  } catch (error) {
    statusEl.textContent = `Error loading users: ${error.message}`;
  } finally {
    loadUsersBtn.disabled = false;
  }
}

// Event listener to trigger loading users
loadUsersBtn.addEventListener("click", loadUsers);

// Filter users without making a new request
filterInput.addEventListener("input", () => {
  const searchTerm = filterInput.value.toLowerCase();
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm)
  );
  renderUsers(filteredUsers);
});
