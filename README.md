# DSU Campus Events Portal

Official event management portal for **Dayananda Sagar University, Bengaluru**.

## 🎓 Project Details

- **University:** Dayananda Sagar University
- **Department:** Computer Science and Engineering (AI & ML)
- **Students:**  Laxmita Raghavendra Shanbhag (ENG24AM0223), Ganesh kumar (ENG24AM0174)
- **Guide:** Dr. Sugandha Saxena
- **Year:** 2025-2026

## 🚀 Tech Stack

**Frontend:**
- HTML5, CSS3, Vanilla JavaScript (ES6+)
- Google Fonts (Inter, Poppins)
- Font Awesome 6.5
- Responsive design with dark/light mode

**Backend:**
- Node.js 18+ with Express.js 4.x
- MongoDB 6.x with Mongoose 8.x
- JWT authentication with bcryptjs
- Multer for file uploads
- RESTful API architecture

## ✨ Features

- 🔐 JWT authentication with role-based access (Student/Organizer/Admin)
- 📅 Event management with live countdown timers
- 📊 Admin dashboard with live statistics
- 📢 Announcements notice board
- 🖼 Photo gallery with upload support
- 🌓 Dark/light mode toggle
- 📱 Fully responsive design
- 🎨 DSU official branding

## 🛠 Installation

### Prerequisites
- Node.js 18+ installed
- MongoDB installed and running locally

### Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd dsu-events-portal
```

2. **Install backend dependencies**
```bash
cd server
npm install
```

3. **Configure environment variables**
Create `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/campusevents
JWT_SECRET=campusevents_super_secret_key_2026
JWT_EXPIRES_IN=7d
```

4. **Seed the database**
```bash
node seed.js
```

5. **Start the server**
```bash
node index.js
```

6. **Open in browser**
Navigate to `http://localhost:5000`

## 🔑 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@college.edu | admin123 |
| Organizer | organizer@college.edu | org123 |
| Student | Any email | Any (min 6 chars) |

## 📁 Project Structure

```
dsu-events-portal/
├── index.html              # Main frontend SPA
├── style.css               # All styles (dark + light mode)
├── app.js                  # Frontend JavaScript
├── dsu-logo-new.png        # DSU logo
└── server/
    ├── index.js            # Express server
    ├── package.json        # Dependencies
    ├── .env                # Environment config
    ├── seed.js             # Database seeder
    ├── models/             # Mongoose schemas
    ├── routes/             # API endpoints
    └── middleware/         # JWT auth middleware
```

## 🌐 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login and receive JWT |
| GET | /api/events | No | Get all events |
| POST | /api/events | Organizer/Admin | Create event |
| POST | /api/events/:id/register | Yes | Register for event |
| GET | /api/announcements | No | Get announcements |
| POST | /api/announcements | Admin | Post announcement |
| GET | /api/gallery | No | Get gallery photos |
| POST | /api/gallery | Organizer/Admin | Upload photo |
| GET | /api/users/stats | Admin | Dashboard statistics |

## 📝 License

© 2026 Dayananda Sagar University

---

**Made with ❤️ for DSU students**
