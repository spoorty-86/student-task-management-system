# Student Task Management System (STMS)

A web-based collaborative task management platform designed for student engineering teams to plan, assign, and track course deliverables and group milestones.

## 🎯 Feature: STMS-12 (Assign Task to Team Member)
This branch implements the core task assignment functionality allowing team members to:
- Assign an unassigned task to a specific student team member.
- Reassign a task to another team member with automatic audit history logging.
- Unassign tasks (`assignee = null`).
- View assignee details (avatar, name, role) directly on task cards.
- Search and filter team members dynamically in the assignment modal.
- Filter task views by assignee (e.g., "Assigned to Me", "Unassigned", or specific members).

---

## 🛠️ Tech Stack & Architecture
- **Runtime:** Node.js (ES Modules)
- **Backend:** Express REST API
- **Data Persistence:** JSON document store (`data/tasks.json`, `data/users.json`)
- **Frontend:** Responsive SPA (HTML5, Vanilla CSS with Glassmorphism, Vanilla JS)
- **Testing:** Native Node.js test runner (`node:test`, `node:assert`)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application dashboard.

---

## 🧪 Running Automated Tests
Run the comprehensive test suite verifying assignment, reassignment, unassignment, and error handling:
```bash
npm test
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/tasks` | Get all tasks with populated assignee profiles |
| `GET` | `/api/tasks/:id` | Get details for a single task |
| `PATCH` | `/api/tasks/:id/assign` | **STMS-12:** Assign, reassign, or unassign a task |
| `POST` | `/api/tasks` | Create a new task |
| `GET` | `/api/team-members` | Fetch registered student team members |

### Sample Payload for `PATCH /api/tasks/:id/assign`
```json
{
  "assigneeId": "usr-102",
  "assignedBy": "usr-101"
}
```
*(Send `"assigneeId": null` to unassign)*
