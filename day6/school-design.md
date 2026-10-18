# School Database Design

This document details the database schema, entity relationships, indexing strategy, and technology selection for the school enrolment management system.

---

## 1. Table Explanations

- **`students`**: Stores entity records for all learners registered in the institution. Key attributes include `student_id` (primary key), `name` (full name of the student, marked `NOT NULL`), and `email` (unique contact address, marked `NOT NULL UNIQUE` to prevent duplicate student profiles).
- **`courses`**: Stores the curriculum catalog. Key attributes include `course_id` (primary key), `title` (descriptive name of the course, marked `NOT NULL`), and `code` (academic course identifier such as `CS101`, marked `NOT NULL UNIQUE`).
- **`enrolments`**: Serves as the junction (join) table linking individual students to specific courses. It stores `enrolment_id` (primary key), `student_id` (foreign key referencing `students`), `course_id` (foreign key referencing `courses`), and `grade` (the evaluation or mark achieved by the student in that course). It enforces a composite `UNIQUE (student_id, course_id)` constraint so that a student cannot be registered in the same course more than once.

---

## 2. Entity Relationships & Join Table Architecture

### Relationships
- **Many-to-Many (M:N):** The core business relationship between `students` and `courses` is many-to-many. A single student can enrol in multiple distinct courses throughout their studies, and a single course is attended by many enrolled students.
- **One-to-Many (1:N):**
  - One student has many enrolment records (`students` 1 &rarr; N `enrolments`).
  - One course has many enrolment records (`courses` 1 &rarr; N `enrolments`).

### Why a Join Table is Needed
In relational database design and First Normal Form (1NF), every column must store atomic (single) values. Relational databases cannot directly store arrays or comma-delimited lists of foreign keys within a row without causing data redundancy, update anomalies, and slow unindexed queries. 

The `enrolments` join table:
1. Decomposes the complex many-to-many relationship into two clean, manageable one-to-many relationships.
2. Preserves referential integrity via foreign keys (`ON DELETE` / `ON UPDATE` rules).
3. Provides a dedicated, normalized location to store attributes that belong to the *interaction* between the two entities, specifically the student's `grade` for that course.

---

## 3. Recommended Index and Rationale

- **Proposed Index:**
  ```sql
  CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);
  ```
- **Rationale:**  
  The `enrolments` table already has an automatic index on `enrolment_id` (primary key) and an index on `(student_id, course_id)` created by the composite `UNIQUE` constraint. However, because `student_id` is the leading column in that composite index, queries that filter or join primarily on `course_id` (such as listing all students enrolled in a specific course or grouping student counts per course) cannot effectively leverage it. Adding a dedicated B-tree index on `course_id` eliminates the need for full table scans when looking up course rosters and computing course-level aggregations, significantly improving query performance as enrolment volume scales.

---

## 4. Database Selection: SQL vs. NoSQL

For this school enrolment system, **SQL (a relational database)** is definitively the better choice. Academic institutions depend on rigid data structures, strict referential integrity, and ACID transaction guarantees to maintain accurate student transcripts, prevent concurrent over-enrolment, and ensure grades are recorded reliably. Relational databases enforce constraints directly at the database engine level—such as `FOREIGN KEY` constraints ensuring no orphan enrolments exist and `UNIQUE` constraints preventing students from enrolling in the same course twice. Furthermore, reporting requirements in schools—such as computing student GPAs, generating course rosters, calculating completion rates, and identifying unenrolled students—heavily rely on relational `JOIN`, `GROUP BY`, and aggregation queries. In contrast, a NoSQL document database (like MongoDB) would either require embedding data (which leads to duplicate student/course details and data synchronization headaches when a course title or student name changes) or manual client-side referencing without built-in referential integrity.
