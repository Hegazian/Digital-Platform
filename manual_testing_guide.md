# 🧪 EduPlatform — Manual Testing & QA Verification Guide

This guide provides step-by-step instructions to manually test and verify all major subsystems of EduPlatform, including **Authentication**, **Home Page & Generic Topic Customization**, **Course Authoring & Review Queues**, **Interactive Code Runner**, **Collaborative Whiteboard**, and **Commerce & Vouchers**.

---

## 🚀 Environment Setup

1. Start Docker containers (Dev PostgreSQL, Test PostgreSQL, Redis):
   ```bash
   docker-compose up -d
   ```
2. Start Express API Server:
   ```bash
   cd server
   npm run dev
   ```
   *(Running on `http://localhost:5000`)*
3. Start Next.js Frontend Client:
   ```bash
   cd client
   npm run dev
   ```
   *(Running on `http://localhost:3000`)*

---

## 1. Authentication & Role Gating (`/api/v1/auth`)

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
**Expected Response (201 Created):** User object returned with role `"STUDENT"`.

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
**Expected Response (201 Created):** `teacherStatus` is `"PENDING"`.

### 1.3 Login & Obtain JWT Tokens
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "Password123!"
  }'
```
**Expected Response (200 OK):**
Returns `accessToken` and sets secure HTTP-only refresh cookie. Save `accessToken` for authenticated requests (`Authorization: Bearer <TOKEN>`).

---

## 2. Dynamic Home Page & Generic Topic Customization (`/api/v1/config`)

### 2.1 Retrieve Public Configuration
```bash
curl -X GET http://localhost:5000/api/v1/config
```
**Expected Response (200 OK):**
Returns `siteNameEn`, `siteNameAr`, `sloganEn`, `sloganAr`, `primaryColor`, and `homeContent` object containing `hero`, `navbar`, `howItWorks`, `teacherBanner`, and `footer`.

### 2.2 Update Home Page Copy & Topic Badges (Admin Only)
```bash
curl -X PUT http://localhost:5000/api/v1/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -d '{
    "siteNameEn": "Global Academy",
    "siteNameAr": "الأكاديمية العالمية",
    "homeContent": {
      "navbar": {
        "subtitleEn": "Medical & Clinical Sciences",
        "subtitleAr": "العلوم الطبية والسريرية"
      },
      "hero": {
        "headingLine1En": "Master Medical & Clinical Sciences",
        "headingLine1Ar": "أتقن العلوم الطبية والسريرية",
        "topicBadges": [
          { "labelEn": "Medicine", "labelAr": "طب بشري", "subEn": "Clinical", "subAr": "إكلينيكي" },
          { "labelEn": "Pharmacy", "labelAr": "صيدلة", "subEn": "Pharmacology", "subAr": "أدوية" }
        ]
      }
    }
  }'
```
**Expected Response (200 OK):** Configuration updated.
**Verification in Browser:** Open `http://localhost:3000`. The navbar subtitle, hero heading, and category badges immediately render the new medical terms.

---

## 3. Course Authoring & Review Governance

### 3.1 Create Course as Approved Teacher
```bash
curl -X POST http://localhost:5000/api/v1/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TEACHER_ACCESS_TOKEN>" \
  -d '{
    "titleEn": "Advanced Calculus",
    "titleAr": "التفاضل والتكامل المتقدم",
    "description": "Comprehensive engineering mathematics course",
    "subjectId": "<SUBJECT_ID>"
  }'
```
**Expected Response (201 Created):** Returns course with status `"DRAFT"`.

### 3.2 Add Section with Free Preview
```bash
curl -X POST http://localhost:5000/api/v1/courses/<COURSE_ID>/sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TEACHER_ACCESS_TOKEN>" \
  -d '{
    "titleEn": "Chapter 1: Limits & Continuity",
    "titleAr": "الفصل الأول: النهايات والاتصال",
    "orderIndex": 1,
    "isFreePreview": true
  }'
```

### 3.3 Submit Course for Admin Review
```bash
curl -X POST http://localhost:5000/api/v1/courses/<COURSE_ID>/submit-for-review \
  -H "Authorization: Bearer <TEACHER_ACCESS_TOKEN>"
```
**Expected Response (200 OK):** Course status transitions to `"PENDING_REVIEW"`.

### 3.4 Admin Review & Approval
```bash
# View pending courses
curl -X GET http://localhost:5000/api/v1/admin/courses/pending \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"

# Approve course
curl -X PUT http://localhost:5000/api/v1/admin/courses/<COURSE_ID>/approve \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```
**Expected Response (200 OK):** Course status transitions to `"APPROVED"` and `"isPublished": true`.

---

## 4. Interactive Tools Verification

### 4.1 Python Code Execution Sandbox
```bash
curl -X POST http://localhost:5000/api/v1/playground/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <STUDENT_ACCESS_TOKEN>" \
  -d '{
    "language": "python",
    "code": "nums = [x**2 for x in range(5)]\nprint(nums)"
  }'
```
**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "stdout": "[0, 1, 4, 9, 16]\n",
    "stderr": "",
    "executionTimeMs": 42
  }
}
```

### 4.2 Collaborative Whiteboard Room
```bash
curl -X POST http://localhost:5000/api/v1/board/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TEACHER_ACCESS_TOKEN>" \
  -d '{
    "name": "Live Physics Session - Room 1",
    "lessonId": "<LESSON_ID>"
  }'
```
**Expected Response (201 Created):** Returns room identifier for multiplayer canvas synchronization.

---

## 5. Commerce & Voucher Redemption

### 5.1 Redeem Pre-Paid Voucher Code
```bash
curl -X POST http://localhost:5000/api/v1/commerce/vouchers/redeem \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <STUDENT_ACCESS_TOKEN>" \
  -d '{
    "code": "MATH2026-TERM1"
  }'
```
**Expected Response (200 OK):**
Voucher marked redeemed and an active entitlement is created for the student's account.

---

## 6. Automated Test Suite Verification

Run the full automated test suite to verify all 67 domain test suites:
```bash
cd server
npm test
```
**Expected Result:**
```
Test Files  67 passed (67)
     Tests  338 passed (338)
```
