-- Seed Data for College Workshop Registration Portal
-- Target: MySQL/SQLite

-- Insert initial workshops
INSERT INTO workshops (title, description, capacity, status, fee, trainer_name, image_url, deadline, schedule, venue) VALUES
('IoT (Internet of Things)', 'Learn sensor integration, ESP8266/ESP32, MQTT protocols, cloud dashboard integration, and build actual smart device prototypes.', 50, 'Active', 1499.00, 'Dr. Arul Prasad', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80', '2026-08-30 23:59:59', 'Mon-Tue 09:30 AM - 04:30 PM', 'IoT Lab, 3rd Floor, Sansah Center'),
('Embedded Systems', 'Deep dive into 8051 and PIC microcontrollers, register configuration, GPIO operations, serial communication (UART, I2C, SPI), and hardware assembly.', 45, 'Active', 1299.00, 'Er. Rajesh Kumar', 'https://images.unsplash.com/photo-1517055720413-77a282b112e7?auto=format&fit=crop&w=600&q=80', '2026-08-31 23:59:59', 'Wed-Thu 09:30 AM - 04:30 PM', 'Microcontroller Lab, 2nd Floor'),
('PCB Design', 'Master schematic drafting, multilayer footprint placement, PCB routing techniques using Altium/Eagle CAD, and prototype manufacturing steps.', 30, 'Active', 999.00, 'Ms. Priyadarshini S.', 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&w=600&q=80', '2026-09-05 23:59:59', 'Fri 09:30 AM - 04:30 PM', 'Hardware Design Lab, Ground Floor'),
('Robotics', 'Build autonomous mobile robots, obstacle avoidance algorithms, PID controllers, motor driver configurations, and line follower designs using Arduino.', 40, 'Active', 1799.00, 'Dr. Amit Varma', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80', '2026-09-10 23:59:59', 'Sat-Sun 09:30 AM - 04:30 PM', 'Robotics Center, Building B'),
('Smart Home Technologies', 'Explore home automation networks, Zigbee protocols, voice assistant integration, power management relays, and secure local hub setups.', 35, 'Active', 1599.00, 'Er. Vignesh Gowda', 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80', '2026-09-15 23:59:59', 'Mon-Tue 09:30 AM - 04:30 PM', 'Automation Lab, 1st Floor');

-- Insert initial colleges
INSERT INTO colleges (name, city, state) VALUES
('Sathyabama Institute of Science and Technology', 'Chennai', 'Tamil Nadu'),
('PSG College of Technology', 'Coimbatore', 'Tamil Nadu'),
('Vellore Institute of Technology', 'Vellore', 'Tamil Nadu'),
('RV College of Engineering', 'Bangalore', 'Karnataka'),
('SRM Institute of Science and Technology', 'Kattankulathur', 'Tamil Nadu');

-- Insert mock students
INSERT INTO students (name, email, phone, college_id, branch, semester, password) VALUES
('Rahul Sharma', 'rahul.sharma@example.com', '9876543210', 1, 'Computer Science', 'Semester 5', 'student123'),
('Sneha Reddy', 'sneha.reddy@example.com', '9876543211', 2, 'Electronics & Communication', 'Semester 7', 'student123'),
('Aditya Sen', 'aditya.sen@example.com', '9876543212', 3, 'Electrical Engineering', 'Semester 3', 'student123'),
('Meera Nair', 'meera.nair@example.com', '9876543213', 4, 'Information Technology', 'Semester 6', 'student123'),
('Vijay Kumar', 'vijay.kumar@example.com', '9876543214', 5, 'Mechatronics', 'Semester 5', 'student123');

-- Insert registrations (individual)
INSERT INTO registrations (student_id, workshop_id, registration_date, payment_status, confirmation_status) VALUES
(1, 1, CURRENT_TIMESTAMP, 'Completed', 'Approved'),
(2, 2, CURRENT_TIMESTAMP, 'Completed', 'Approved'),
(3, 3, CURRENT_TIMESTAMP, 'Pending', 'Pending'),
(4, 4, CURRENT_TIMESTAMP, 'Completed', 'Approved'),
(5, 5, CURRENT_TIMESTAMP, 'Pending', 'Pending');

-- Insert registration history
INSERT INTO registration_status_history (registration_id, previous_status, new_status, changed_by, remarks) VALUES
(1, 'Pending', 'Approved', 'Admin', 'Payment verified successfully'),
(2, 'Pending', 'Approved', 'Admin', 'Payment verified successfully'),
(3, NULL, 'Pending', 'System', 'Registration submitted, awaiting payment'),
(4, 'Pending', 'Approved', 'Admin', 'Payment verified successfully'),
(5, NULL, 'Pending', 'System', 'Registration submitted, awaiting payment');
