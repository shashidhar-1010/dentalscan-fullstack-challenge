# DentalScan AI — Full-Stack Engineering Challenge

Hi, I’m **Shashidhar Reddy Ananthula**. This repository contains my submission for the DentalScan Full-Stack Engineering Challenge.

---

## 📌 Project Overview

This project enhances a dental telehealth scanning workflow by improving:

* Scan capture quality (frontend UX + guidance)
* Clinic awareness (notification system)
* Patient–dentist communication (messaging system)

The goal is to ensure **high-quality scan data**, **real-time awareness**, and **better post-scan engagement**.

---

## ⚠️ How to Run the Project

> The runnable application is located inside the `starter-kit` directory.

### Steps:

```bash
cd starter-kit
npm install
npm run dev
```

Open in browser:

```
http://localhost:3000
```

---

## 🚀 Features Implemented

### 1. Scan Enhancement (Frontend)

* Implemented a **Visual Guidance Circle ("Mouth Guide")**
* Fully responsive and centered overlay
* Added **Quality Indicator**:

  * 🔴 Red → unstable / misaligned
  * 🟡 Yellow → adjusting
  * 🟢 Green → stable (ready to capture)
* Fixed scan progression logic by deriving state from captured images
* Improved UX for multi-angle capture (front, left, right, upper, lower)

---

### 2. Notification System (Backend + State)

* Triggered **"Scan Completed" notification** after final image capture
* Implemented Prisma `Notification` model:

  * Tracks `read / unread` state
* Simulated async notification flow (non-blocking API)
* Designed for easy extension to real-time systems (WebSockets / queues)

---

### 3. Patient–Dentist Messaging (Full-Stack)

* Built **Quick Message Sidebar** on results dashboard
* Send messages directly to clinic after scan
* Backend API persists messages using:

  * `Thread`
  * `Message` models (Prisma)
* Supports:

  * Message history
  * State consistency
  * Optimistic UI updates

---

## 🧠 Key Architectural Decisions

* **State Derivation over Duplication**
  Scan steps are derived from captured images to avoid inconsistent UI state.

* **Lightweight Stability Detection**
  Used device/orientation-based logic instead of heavy computer vision for performance.

* **Scalable Backend Design**
  Prisma models (`Notification`, `Thread`, `Message`) designed for:

  * read states
  * future real-time features
  * multi-user support

* **Optimistic UI for Messaging**
  Improves responsiveness and user experience while maintaining consistency.

---

## 📂 Tech Stack

* **Frontend**: React / Next.js
* **Backend**: Next.js API Routes
* **Database**: Prisma ORM
* **Language**: TypeScript

---

## 📁 Project Structure

```
dentalscan-fullstack-challenge/
│
├── starter-kit/          # Main application (run from here)
│   ├── app/ or src/
│   ├── components/
│   ├── prisma/
│   ├── public/
│   ├── package.json
│
├── AUDIT.md              # Phase 1 UX audit
├── README.md             # This file
```

---

## 🧪 Testing Instructions

1. Run the app (see steps above)
2. Perform scan flow:

   * Capture all 5 views:

     * Front
     * Left
     * Right
     * Upper
     * Lower
3. Verify:

   * Visual guidance and quality indicator
   * Automatic progression between steps
4. After completion:

   * Confirm notification trigger (backend)
   * Open messaging sidebar
   * Send message → verify persistence

---

## 📄 Notes

* `node_modules` and build artifacts are excluded from version control
* The structure follows the provided starter template
* Enhancements were implemented without breaking base functionality

