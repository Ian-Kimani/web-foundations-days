-- Enable foreign key constraints in SQLite
PRAGMA foreign_keys = ON;

-- Drop tables if they already exist for a clean rerun
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- 1. Table: students
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- 2. Table: courses
CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE
);

-- 3. Table: enrolments (Join table linking students and courses with grade)
CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id),
    UNIQUE (student_id, course_id) -- Prevents duplicate enrolments on the same course
);

-- ============================================================================
-- INSERT Sample Data (at least 3 students, 3 courses, 5 enrolments)
-- ============================================================================

-- Insert students (including one student with no enrolments for testing query 4)
INSERT INTO students (name, email) VALUES
    ('Alice Johnson', 'alice.johnson@example.com'),
    ('Bob Smith', 'bob.smith@example.com'),
    ('Charlie Brown', 'charlie.brown@example.com'),
    ('Diana Prince', 'diana.prince@example.com');

-- Insert courses
INSERT INTO courses (title, code) VALUES
    ('Introduction to Computer Science', 'CS101'),
    ('Web Development Foundations', 'WEB201'),
    ('Database Systems', 'DB301');

-- Insert enrolments (6 enrolments across the courses)
INSERT INTO enrolments (student_id, course_id, grade) VALUES
    (1, 1, 'A'),   -- Alice on CS101
    (1, 2, 'A-'),  -- Alice on WEB201
    (2, 1, 'B+'),  -- Bob on CS101
    (2, 3, 'B'),   -- Bob on DB301
    (3, 2, 'A'),   -- Charlie on WEB201
    (3, 3, 'B-');  -- Charlie on DB301

-- ============================================================================
-- Required Queries
-- ============================================================================

-- Query 1: All courses for one student (by name)
SELECT 
    students.name AS student_name,
    courses.code AS course_code,
    courses.title AS course_title,
    enrolments.grade
FROM students
JOIN enrolments ON students.student_id = enrolments.student_id
JOIN courses ON enrolments.course_id = courses.course_id
WHERE students.name = 'Alice Johnson';

-- Query 2: All students on one course
SELECT 
    courses.code AS course_code,
    courses.title AS course_title,
    students.name AS student_name,
    students.email AS student_email,
    enrolments.grade
FROM courses
JOIN enrolments ON courses.course_id = enrolments.course_id
JOIN students ON enrolments.student_id = students.student_id
WHERE courses.code = 'CS101';

-- Query 3: The number of students per course
SELECT 
    courses.code AS course_code,
    courses.title AS course_title,
    COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments ON courses.course_id = enrolments.course_id
GROUP BY courses.course_id, courses.code, courses.title;

-- Query 4: Students who have no enrolments
SELECT 
    students.student_id,
    students.name,
    students.email
FROM students
LEFT JOIN enrolments ON students.student_id = enrolments.student_id
WHERE enrolments.enrolment_id IS NULL;

-- Query 5: An update of one enrolment's grade
UPDATE enrolments
SET grade = 'A+'
WHERE student_id = (SELECT student_id FROM students WHERE name = 'Alice Johnson')
  AND course_id = (SELECT course_id FROM courses WHERE code = 'CS101');

-- Verify the update in Query 5
SELECT 
    students.name AS student_name,
    courses.code AS course_code,
    enrolments.grade AS updated_grade
FROM enrolments
JOIN students ON enrolments.student_id = students.student_id
JOIN courses ON enrolments.course_id = courses.course_id
WHERE students.name = 'Alice Johnson' AND courses.code = 'CS101';
