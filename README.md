# College Workshop Registration Portal - Sansah Innovations

A modern, full-stack college workshop registration application built with **React.js**, **Node.js (Express)**, and dual database support for **MySQL** and **SQLite**. 

The portal allows students to enroll in courses (IoT, Embedded Systems, PCB Design, Robotics, and Smart Home Technologies), organize team enrollments, and provides an administrative portal for verifying payments, tracking session attendance, assessing project submissions, and issuing certificates.

---

## Technical Architecture

*   **Frontend**: React (Vite), React Router v6, Lucide Icons, Custom CSS Theme tokens (Glassmorphism layout).
*   **Backend**: Node.js, Express.js.
*   **Database**: Dual-Driver Database System:
    *   **SQLite** (Default local fallback for zero-configuration testing).
    *   **MySQL** (Production integration configured via environment parameters).
*   **AI Integrations**: Custom rule-based local generative templates with Google Gemini API credentials fallback options.

---

## Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org) (v18 or higher recommended)
*   NPM (v9 or higher)
*   *Optional*: MySQL Server instance (for production hosting)

---

### Step 1: Backend Configuration

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install server-side dependencies:
    ```bash
    npm install
    ```
3.  Configure your environment parameters:
    *   Duplicate `.env.example` to create a `.env` file:
        ```bash
        cp .env.example .env
        ```
    *   By default, `DB_TYPE` is set to `sqlite`, which will write to a local file database at `backend/db/database.sqlite` automatically. No credentials required!
    *   To use **MySQL**, modify the variables inside `.env`:
        ```env
        DB_TYPE=mysql
        DB_HOST=localhost
        DB_USER=root
        DB_PASSWORD=your_mysql_password
        DB_NAME=college_workshops
        DB_PORT=3306
        ```
    *   *Optional*: Add your `GEMINI_API_KEY` to enable active generative LLM prompts for confirmations and follow-ups.

4.  Start the Express API server:
    ```bash
    npm start
    ```
    The server will startup on: **`http://localhost:5000`**

---

### Step 2: Frontend Configuration

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install client-side dependencies:
    ```bash
    npm install
    ```
3.  Launch the Vite Dev Server:
    ```bash
    npm run dev
    ```
    The frontend client will load on: **`http://localhost:5173`** (or another port shown in your terminal).

---

## Student Portal Access

To access your personal student portal:
1.  Navigate to the **Student Gateway** tab in the sidebar navigation (or open `http://localhost:5173/student/login`).
2.  Click **Create Account** to sign up, or sign in using:
    *   **Email**: `sneha.reddy@example.com`
    *   **Password**: `student123`
3.  In the student dashboard, you can track schedules, review attendance markings, submit code repository links, and download issued certifications.

---

## Administrative Console Access

To inspect registrations, issue credentials, run analytics, and manage workshops:
1.  Navigate to the **Coordinator Gateway** tab in the sidebar navigation (or open `http://localhost:5173/login`).
2.  Enter the following credentials:
    *   **Username**: `admin`
    *   **Password**: `admin123`
3.  Click **Access Console** to enter the workspace.
4.  Navigate to **Workshop CRUD** to Add, Edit, or Delete workshops.

---

## Core Features List

1.  **Student Authentication**: Secure student signups, logins, and private session profile tracking.
2.  **Student Dashboard**: View personal enrollments, trainer bios, schedules, daily attendance logs, and project submissions.
3.  **Workshop CRUD Panel**: Admin capabilities to create, edit, list, and delete technical workshops with schedule, venue, deadline, and cover images.
4.  **Student Enrollment**: Dynamic single or team entry with member list validation.
5.  **Interactive Advisor**: Built-in AI recommender that guides students towards topics matching their branch and skills.
6.  **Coordinators Dashboard**: Manage workshop statuses, review registrations, and trace audit trails.
7.  **Attendance Tracker**: Daily checklist grids to log Present/Absent markings.
8.  **Project Assessment**: Log Git repos, descriptions, and scores.
9.  **Certificate Generator**: Generate custom codes (e.g., `SANSAH-WS-XXXX`) and PDF downloads.
10. **Data Analytics**: View charts for workshop capacity shares and college registration rankings.
11. **Data Exporters**: Download registration tables in CSV spreadsheets or trigger print styles to output PDF.
12. **AI Prompts Center**: Generate registration confirmations, joining manuals, and coordinator follow-up templates dynamically.
