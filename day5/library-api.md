# Library Books REST API Design

A RESTful API specification for managing a library's collection of books.

## Endpoints

### 1. List All Books
- **Method:** `GET`
- **Path:** `/books`
- **Description:** Retrieves a list of all books in the library catalog.
- **Request Body:** None
- **Success Status Code:** `200 OK`

### 2. Get a Specific Book
- **Method:** `GET`
- **Path:** `/books/:id`
- **Description:** Retrieves the details of a single book by its unique ID.
- **Request Body:** None
- **Success Status Code:** `200 OK`

### 3. Create a New Book
- **Method:** `POST`
- **Path:** `/books`
- **Description:** Adds a new book to the library collection.
- **Request Body:**
  ```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "isbn": "978-0385474542",
    "publishedYear": 1958,
    "genre": "Historical Fiction",
    "copiesAvailable": 5
  }
  ```
- **Success Status Code:** `201 Created`

### 4. Update an Existing Book
- **Method:** `PUT`
- **Path:** `/books/:id`
- **Description:** Updates the complete record of an existing book by its unique ID.
- **Request Body:**
  ```json
  {
    "title": "Things Fall Apart (Annotated Edition)",
    "author": "Chinua Achebe",
    "isbn": "978-0385474542",
    "publishedYear": 1958,
    "genre": "Classic Literature",
    "copiesAvailable": 4
  }
  ```
- **Success Status Code:** `200 OK`

### 5. Delete a Book
- **Method:** `DELETE`
- **Path:** `/books/:id`
- **Description:** Removes a book from the library catalog by its unique ID.
- **Request Body:** None
- **Success Status Code:** `204 No Content`

### 6. List Books by Author
- **Method:** `GET`
- **Path:** `/books?author={authorName}`
- **Description:** Retrieves a filtered list of books matching a specific author name via a query parameter.
- **Request Body:** None
- **Success Status Code:** `200 OK`

---

## Error Codes

### 400 Bad Request
- **Description:** The server cannot process the request because the client sent invalid, malformed, or incomplete data.
- **Example:** A client submits a `POST /books` request missing the required `title` field (e.g., `{ "author": "Ngũgĩ wa Thiong'o" }`), or provides an invalid data type like `"publishedYear": "nineteen-eighty"`.

### 404 Not Found
- **Description:** The server cannot find the requested resource because the specified identifier does not exist.
- **Example:** A client attempts to fetch, update, or delete a book with an ID that is not present in the library database (e.g., `GET /books/99999` or `DELETE /books/nonexistent-id`).
