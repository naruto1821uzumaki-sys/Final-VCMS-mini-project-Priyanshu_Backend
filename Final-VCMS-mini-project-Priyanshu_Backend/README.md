# VCMS - Virtual Clinic Management System

## College Project - Full Stack MERN Application

**Status:** ✅ Ready to Run on Localhost  
**No Errors:** ✅ Zero Compilation Errors  

---

## 🚀 Quick Start

### Terminal 1: Start Backend
```bash
cd server
node server.js
```

### Terminal 2: Start Frontend
```bash
npm run dev
```

### Open Browser
```
http://localhost:5173
```

---

## 📁 Project Structure

```
├── src/                 # Frontend (React + TypeScript)
│   ├── components/      # UI Components
│   ├── pages/           # Page Components
│   ├── services/        # API Services
│   ├── contexts/        # React Contexts
│   ├── hooks/           # Custom Hooks
│   └── ...
├── server/              # Backend (Node.js + Express)
│   ├── controllers/     # API Controllers
│   ├── models/          # MongoDB Models
│   ├── routes/          # API Routes
│   ├── middleware/      # Middleware
│   ├── config/          # Configuration
│   └── server.js        # Main Server File
├── package.json         # Frontend Dependencies
└── .env                 # Frontend Configuration
```

---

## 🎯 Features

✅ User Authentication (Register/Login/Logout)  
✅ Patient Dashboard  
✅ Doctor Dashboard  
✅ Admin Dashboard  
✅ Appointment Booking  
✅ Prescription Management  
✅ Medical History  
✅ Real-time Messaging  
✅ Notifications  
✅ Doctor Search & Filter  
✅ Reviews & Ratings  

---

## 👥 User Roles

- **Patient** - Browse doctors, book appointments, view prescriptions
- **Doctor** - Manage appointments, write prescriptions
- **Admin** - Manage users, approve doctors, view analytics

---

## 🔧 Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (Build Tool)
- Tailwind CSS + shadcn/ui
- Axios (HTTP Client)
- Socket.IO (Real-time)

**Backend:**
- Node.js + Express
- MongoDB (Database)
- JWT (Authentication)
- Socket.IO (Real-time)

---

## 📋 Requirements

- Node.js installed
- npm or yarn
- Internet connection (MongoDB Atlas)

---

## ⚙️ Configuration

Frontend `.env`:
```
VITE_API_BASE=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Backend `.env`:
```
PORT=5000
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-secret-key>
```

---

## 🧪 Test the Application

1. Register as a new user (Patient or Doctor)
2. Login with your credentials
3. Explore the features based on your role

---

## ✅ Status

- ✅ **0 Errors**
- ✅ **0 Warnings**
- ✅ **All Features Working**
- ✅ **Database Connected**
- ✅ **Security Implemented**

---

## 📞 Support

For any issues, check:
- Terminal output for error messages
- Browser console (F12) for frontend errors
- Network tab to verify API connection

---

**Created:** February 2026  
**Version:** 1.0  
**Status:** Ready for College Submission
