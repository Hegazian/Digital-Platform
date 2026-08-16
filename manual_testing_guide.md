# EduPlatform — Manual Testing & Verification Guide

This guide provides step-by-step instructions to manually verify the implemented API endpoints for **Authentication** (Week 2) and **Course & Subject Management** (Week 3).

---

## Prerequisites

1. Ensure the PostgreSQL and Redis containers are running:
   ```bash
   docker compose -f docker-compose.test.yml up -d
   ```
2. Start the Express server:
   ```bash
   cd server
   npm run dev
   ```
   *(Server running on `http://localhost:5000`)*

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### 1.1 Register a Student
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "Password123!",
    "name": "Ahmed Ali",
    "role": "STUDENT"
  }'
```
**Expected Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "student@example.com",
    "name": "Ahmed Ali",
    "role": "STUDENT",
    "teacherStatus": null
  }
}
```

### 1.2 Register a Teacher (Status: PENDING)
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "Password123!",
    "name": "Dr. Sarah",
    "role": "TEACHER"
  }'
```
**Expected Response (201 Created):**
*Notice `teacherStatus` is `"PENDING"`.*

### 1.3 Login & Obtain Tokens
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "Password123!"
  }'
```
**Expected Response (200 OK):**
Save the `accessToken` for subsequent request authorization headers (`Bearer <token>`).

---

## 2. Subject Endpoints (`/api/v1/subjects`)

### 2.1 Get All Subjects (Public)
```bash
curl -X GET http://localhost:5000/api/v1/subjects
```
**Expected Response (200 OK):** Returns array of subjects with pricing options.

### 2.2 Create Subject (Requires ADMIN role)
```bash
curl -X POST http://localhost:5000/api/v1/subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -d '{
    "nameEn": "Physics",
    "nameAr": "فيزياء",
    "description": "Secondary School Physics",
    "pricing": [
      { "period": "MONTHLY", "priceEgp": 250, "priceUsd": 15 },
      { "period": "SIX_MONTHS", "priceEgp": 1200, "priceUsd": 70 },
      { "period": "YEARLY", "priceEgp": 2000, "priceUsd": 120 }
    ]
  }'
```

---

## 3. Course Endpoints (`/api/v1/courses`)

### 3.1 Create Course (Requires APPROVED Teacher)
```bash
curl -X POST http://localhost:5000/api/v1/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <APPROVED_TEACHER_TOKEN>" \
  -d '{
    "titleEn": "Physics 1st Secondary - Mechanics",
    "titleAr": "فيزياء الصف الأول الثانوي - الميكانيكا",
    "description": "Comprehensive course covering motion and forces",
    "subjectId": "<SUBJECT_ID>"
  }'
```

### 3.2 Add Section with Free Preview
```bash
curl -X POST http://localhost:5000/api/v1/courses/<COURSE_ID>/sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <APPROVED_TEACHER_TOKEN>" \
  -d '{
    "titleEn": "Chapter 1: Kinematics",
    "titleAr": "الفصل الأول: علم الحركة",
    "orderIndex": 1,
    "isFreePreview": true
  }'
```

### 3.3 Publish Course (Requires Course Owner Teacher)
```bash
curl -X PATCH http://localhost:5000/api/v1/courses/<COURSE_ID>/publish \
  -H "Authorization: Bearer <APPROVED_TEACHER_TOKEN>"
```
**Expected Response (200 OK):** `"isPublished": true`.

---

## Automated Verification Suite

To run all automated unit and integration tests at any time:
```bash
cd server
npx vitest run
```
*Current test suite status: **21/21 tests passing (100%)**.*
