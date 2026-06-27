-- PostgreSQL Schema for College Workshop Registration Portal (Sansah Innovations)

-- Drop tables if they exist (for easy resetting/re-run)
DROP TABLE IF EXISTS student_attendance CASCADE;
DROP TABLE IF EXISTS registration_status_history CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS project_submissions CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS workshops CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS colleges CASCADE;


-- 1. Colleges Table
CREATE TABLE colleges (
    college_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Students Table
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    college_id INT NOT NULL REFERENCES colleges(college_id) ON DELETE CASCADE,
    branch VARCHAR(100) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    password VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Workshops Table
CREATE TABLE workshops (
    workshop_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    capacity INT DEFAULT 50,
    status VARCHAR(50) DEFAULT 'Active', -- Active, Full, Suspended
    fee DECIMAL(10, 2) DEFAULT 0.00,
    trainer_name VARCHAR(100),
    image_url VARCHAR(255) DEFAULT NULL,
    deadline TIMESTAMP DEFAULT NULL,
    schedule VARCHAR(100) DEFAULT NULL,
    venue VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Teams Table
CREATE TABLE teams (
    team_id SERIAL PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    leader_student_id INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    member_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Workshop Registrations Table
CREATE TABLE registrations (
    registration_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    workshop_id INT NOT NULL REFERENCES workshops(workshop_id) ON DELETE CASCADE,
    team_id INT DEFAULT NULL REFERENCES teams(team_id) ON DELETE SET NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(50) DEFAULT 'Pending', -- Pending, Completed, Refunded
    confirmation_status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_workshop UNIQUE (student_id, workshop_id)
);

-- Create a trigger function to update updated_at in PostgreSQL
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_registrations_updated_at
    BEFORE UPDATE ON registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Team Members Table (For group registrations)
CREATE TABLE team_members (
    team_member_id SERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    student_phone VARCHAR(20) NOT NULL
);

-- 7. Attendance Records Table
CREATE TABLE attendance_records (
    attendance_id SERIAL PRIMARY KEY,
    registration_id INT NOT NULL REFERENCES registrations(registration_id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Present', -- Present, Absent
    CONSTRAINT unique_attendance_date UNIQUE (registration_id, session_date)
);

-- 8. Project Submissions Table
CREATE TABLE project_submissions (
    submission_id SERIAL PRIMARY KEY,
    registration_id INT NOT NULL REFERENCES registrations(registration_id) ON DELETE CASCADE,
    project_title VARCHAR(255) NOT NULL,
    description TEXT,
    submission_link VARCHAR(255) NOT NULL,
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score INT DEFAULT NULL,
    remarks TEXT
);

-- 9. Certificates Table
CREATE TABLE certificates (
    certificate_id SERIAL PRIMARY KEY,
    registration_id INT NOT NULL REFERENCES registrations(registration_id) ON DELETE CASCADE,
    certificate_code VARCHAR(100) NOT NULL UNIQUE,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    download_url VARCHAR(255)
);

-- 10. Registration Status History Table
CREATE TABLE registration_status_history (
    history_id SERIAL PRIMARY KEY,
    registration_id INT NOT NULL REFERENCES registrations(registration_id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(100) DEFAULT 'System',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT
);

-- 11. Student Attendance Table (7-Day Program)
CREATE TABLE student_attendance (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    workshop_id INT NOT NULL REFERENCES workshops(workshop_id) ON DELETE CASCADE,
    day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
    attendance_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Present', 'Absent')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_workshop_day UNIQUE (student_id, workshop_id, day_number)
);

CREATE TRIGGER update_student_attendance_updated_at
    BEFORE UPDATE ON student_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

