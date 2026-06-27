-- SQL Schema for College Workshop Registration Portal (Sansah Innovations)
-- Target: MySQL Database

CREATE DATABASE IF NOT EXISTS college_workshops;
USE college_workshops;

-- 1. Colleges Table
CREATE TABLE IF NOT EXISTS colleges (
    college_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Students Table
CREATE TABLE IF NOT EXISTS students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    college_id INT NOT NULL,
    branch VARCHAR(100) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    password VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES colleges(college_id) ON DELETE CASCADE
);

-- 3. Workshops Table
CREATE TABLE IF NOT EXISTS workshops (
    workshop_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    capacity INT DEFAULT 50,
    status VARCHAR(50) DEFAULT 'Active', -- Active, Full, Suspended
    fee DECIMAL(10, 2) DEFAULT 0.00,
    trainer_name VARCHAR(100),
    image_url VARCHAR(255) DEFAULT NULL,
    deadline DATETIME DEFAULT NULL,
    schedule VARCHAR(100) DEFAULT NULL,
    venue VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Teams Table
CREATE TABLE IF NOT EXISTS teams (
    team_id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    leader_student_id INT NOT NULL,
    member_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leader_student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- 5. Workshop Registrations Table
CREATE TABLE IF NOT EXISTS registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL, -- The individual registrant or the team leader
    workshop_id INT NOT NULL,
    team_id INT DEFAULT NULL, -- NULL if registering individually
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(50) DEFAULT 'Pending', -- Pending, Completed, Refunded
    confirmation_status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (workshop_id) REFERENCES workshops(workshop_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE SET NULL,
    UNIQUE KEY unique_student_workshop (student_id, workshop_id)
);

-- 6. Team Members Table (For group registrations)
CREATE TABLE IF NOT EXISTS team_members (
    team_member_id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    student_phone VARCHAR(20) NOT NULL,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE
);

-- 7. Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NOT NULL,
    session_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Present', -- Present, Absent
    FOREIGN KEY (registration_id) REFERENCES registrations(registration_id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance_date (registration_id, session_date)
);

-- 8. Project Submissions Table
CREATE TABLE IF NOT EXISTS project_submissions (
    submission_id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NOT NULL,
    project_title VARCHAR(255) NOT NULL,
    description TEXT,
    submission_link VARCHAR(255) NOT NULL,
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score INT DEFAULT NULL,
    remarks TEXT,
    FOREIGN KEY (registration_id) REFERENCES registrations(registration_id) ON DELETE CASCADE
);

-- 9. Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
    certificate_id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NOT NULL,
    certificate_code VARCHAR(100) NOT NULL UNIQUE,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    download_url VARCHAR(255),
    FOREIGN KEY (registration_id) REFERENCES registrations(registration_id) ON DELETE CASCADE
);

-- 10. Registration Status History Table
CREATE TABLE IF NOT EXISTS registration_status_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(100) DEFAULT 'System',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    FOREIGN KEY (registration_id) REFERENCES registrations(registration_id) ON DELETE CASCADE
);

-- 11. Student Attendance Table (7-Day Program)
CREATE TABLE IF NOT EXISTS student_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    workshop_id INT NOT NULL,
    day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
    attendance_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Present', 'Absent')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (workshop_id) REFERENCES workshops(workshop_id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_workshop_day (student_id, workshop_id, day_number)
);

