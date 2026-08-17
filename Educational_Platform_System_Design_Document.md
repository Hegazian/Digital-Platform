# System Design Document
## Configurable Educational Platform for Egyptian Secondary School Students

**Version:** 1.0  
**Status:** Architecture and System Design  
**Architecture Style:** Modular Monolith, API-First, Event-Driven Extensions  
**Primary Target:** Secondary school students in Egypt

---

# Table of Contents

1. [Product Vision](#1-product-vision)
2. [Document Purpose](#2-document-purpose)
3. [System Scope](#3-system-scope)
4. [Stakeholders and Actors](#4-stakeholders-and-actors)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Core Design Principles](#7-core-design-principles)
8. [High-Level Architecture](#8-high-level-architecture)
9. [Technology Stack](#9-technology-stack)
10. [User Roles and Permissions](#10-user-roles-and-permissions)
11. [Academic Configuration Model](#11-academic-configuration-model)
12. [Core Domain and Database Model](#12-core-domain-and-database-model)
13. [Course and Content Architecture](#13-course-and-content-architecture)
14. [Student Registration Journey](#14-student-registration-journey)
15. [Course Purchase and Enrollment](#15-course-purchase-and-enrollment)
16. [Learning and Progress Tracking](#16-learning-and-progress-tracking)
17. [Assessment and Question Bank](#17-assessment-and-question-bank)
18. [Teacher Course Creation Workflow](#18-teacher-course-creation-workflow)
19. [Live Classes](#19-live-classes)
20. [Parent Portal](#20-parent-portal)
21. [AI Learning Assistant](#21-ai-learning-assistant)
22. [Recommendation Engine](#22-recommendation-engine)
23. [Gamification](#23-gamification)
24. [Notifications](#24-notifications)
25. [Configurable Workflow and Business Rules](#25-configurable-workflow-and-business-rules)
26. [Subscription and Entitlement Model](#26-subscription-and-entitlement-model)
27. [Security Architecture](#27-security-architecture)
28. [Video and Media Protection](#28-video-and-media-protection)
29. [Analytics](#29-analytics)
30. [Backend Modules](#30-backend-modules)
31. [API Design](#31-api-design)
32. [End-to-End Usage Scenarios](#32-end-to-end-usage-scenarios)
33. [Configuration and Feature Flags](#33-configuration-and-feature-flags)
34. [Caching and Background Jobs](#34-caching-and-background-jobs)
35. [File and Media Architecture](#35-file-and-media-architecture)
36. [Multi-Tenancy](#36-multi-tenancy)
37. [Failure Scenarios](#37-failure-scenarios)
38. [Observability](#38-observability)
39. [Deployment and Scaling](#39-deployment-and-scaling)
40. [CI/CD and Testing](#40-cicd-and-testing)
41. [Repository Structure](#41-repository-structure)
42. [Implementation Roadmap](#42-implementation-roadmap)
43. [Final Architecture Decision](#43-final-architecture-decision)

---

# 1. Product Vision

The system is a configurable, scalable educational ecosystem for secondary school students in Egypt.

The platform is not designed as a simple website containing videos and PDFs. It is designed as a reusable educational platform capable of supporting different:

- Academic years
- Educational stages
- Grades
- Subjects
- Curricula
- Teachers
- Educational organizations
- Content types
- Assessment models
- Subscription models
- Learning paths

The central design philosophy is:

> **One platform engine + configurable academic structures + configurable business rules + multiple end-to-end learning scenarios.**

## 1.1 Main Platform Capabilities

The platform should support:

- Structured courses
- Recorded lessons
- Interactive lessons
- PDF and document materials
- Live sessions
- Quizzes and exams
- Question banks
- Assignments
- Student progress tracking
- Parent monitoring
- Teacher content management
- Subscription and payment management
- Notifications
- Analytics
- Gamification
- AI-assisted learning
- Personalized recommendations

---

# 2. Document Purpose

This document defines the functional and technical design of the educational platform.

The design focuses on:

- Scalability
- Configurability
- Security
- Maintainability
- Modularity
- API-first development
- Future migration toward distributed services when required

The recommended initial architecture is a **modular monolith**, with clear domain boundaries and asynchronous processing.

---

# 3. System Scope

## 3.1 In Scope

| Domain | Features |
|---|---|
| Identity | Registration, login, OTP, sessions, roles |
| Academic Configuration | Academic years, stages, grades, subjects |
| Courses | Courses, modules, lessons, publishing |
| Content | Video, PDF, text, quizzes, assignments, live sessions |
| Assessment | Question bank, quizzes, exams, grading |
| Learning | Progress tracking, completion, recommendations |
| Commerce | Products, orders, subscriptions, payments, entitlements |
| Administration | User, teacher, content and configuration management |
| Parents | Student linking and progress monitoring |
| Notifications | In-app, push, email, SMS or configured channels |
| Analytics | Learning, engagement and business metrics |
| AI | AI tutor and learning recommendations |

## 3.2 Out of Scope for the Initial MVP

The first version should avoid unnecessary complexity such as:

- Building a proprietary video-conferencing platform
- Full machine-learning recommendation systems
- Advanced AI-generated curriculum
- Microservices for every domain
- Advanced online proctoring
- Full school ERP integration
- A social network between students

These features can be added later.

---

# 4. Stakeholders and Actors

```text
Super Admin
    |
    +-- Platform Admin
    |
    +-- Organization Admin
            |
            +-- Academic Admin
            +-- Finance Admin
            +-- Support Agent

Teacher
Teaching Assistant
Student
Parent
```

## 4.1 Super Admin

Responsibilities:

- Platform-wide configuration
- Organization management
- Global roles and permissions
- Platform policies
- System monitoring

## 4.2 Organization Admin

An organization may represent:

- Educational company
- Academy
- School
- Teacher organization

Responsibilities:

- Manage users
- Manage teachers
- Configure academic offerings
- Review content
- View analytics

## 4.3 Teacher

Responsibilities:

- Create courses
- Create modules and lessons
- Upload materials
- Create assessments
- Review assignments
- Analyze student performance

## 4.4 Student

Responsibilities:

- Manage educational profile
- Browse courses
- Purchase or activate access
- Study content
- Attend live sessions
- Complete assessments
- Track progress

## 4.5 Parent

Responsibilities:

- Link one or more students
- Monitor progress
- Receive notifications when enabled

---

# 5. Functional Requirements

## FR-01: Authentication

The system shall support:

- Phone-based registration
- Email registration
- OTP verification
- Password login
- Password reset
- Access tokens
- Refresh tokens
- Multi-device session management
- Account suspension

### Authentication Flow

```text
Client
  |
  | POST /auth/register
  v
Authentication Service
  |
  +--> Create pending user
  |
  +--> Generate OTP
  |
  +--> Send OTP
  |
  v
Student verifies OTP
  |
  +--> Activate account
  |
  +--> Create session
  |
  v
Access Token + Refresh Token
```

## FR-02: Academic Configuration

Administrators shall be able to configure:

- Academic years
- Educational stages
- Grades
- Subjects
- Grade/subject relationships
- Curricula
- Academic availability

No application code should need modification when the academic structure changes.

## FR-03: Course Management

Teachers or authorized administrators shall be able to:

- Create courses
- Add modules
- Add lessons
- Add lesson blocks
- Upload learning materials
- Add quizzes
- Schedule live sessions
- Submit courses for review
- Publish courses according to workflow rules

## FR-04: Student Learning

Students shall be able to:

- Browse available courses
- Purchase or activate access
- Watch lessons
- Read documents
- Resume from previous progress
- Complete quizzes
- Submit assignments
- Attend live sessions
- Track course completion

## FR-05: Assessments

The platform shall support:

- Static assessments
- Dynamically generated assessments
- Question randomization
- Answer randomization
- Attempt limits
- Timers
- Automatic grading
- Manual review
- Topic-level performance analysis

---

# 6. Non-Functional Requirements

## 6.1 Performance

Initial targets:

| Operation | Target |
|---|---:|
| Standard API response | Less than 500 ms |
| Cached read | Less than 100 ms |
| Dashboard load | Less than 2 seconds |
| Quiz submission | Less than 2 seconds |
| Login | Less than 1 second excluding OTP delivery |

## 6.2 Availability

Initial production target:

```text
99.5% availability
```

Future target:

```text
99.9%+
```

## 6.3 Scalability

The architecture should support horizontal scaling for:

- API servers
- Background workers
- Notification processing
- Assessment processing
- AI workloads

## 6.4 Security

The platform should provide:

- HTTPS
- Password hashing
- Access and refresh tokens
- Refresh token rotation
- RBAC
- Rate limiting
- Audit logging
- Protected media access
- Signed URLs
- Secure secrets management
- Database backups

---

# 7. Core Design Principles

The platform should be built around the following principles.

## 7.1 Configuration Over Hard Coding

Incorrect design:

```text
Grade 12
 ├── Mathematics
 ├── Physics
 └── Chemistry
```

Hard-coded application logic should not determine the academic structure.

Instead:

```text
Academic Year
    |
    +-- Educational Stage
            |
            +-- Grade
                    |
                    +-- Subject
                            |
                            +-- Curriculum
                                    |
                                    +-- Course
```

All relationships are stored in the database.

## 7.2 Modular Boundaries

Core domains should remain independent:

```text
Identity
Academic
Learning
Assessment
Commerce
Progress
Notifications
Analytics
AI
```

## 7.3 Modular Monolith First

The initial system should not be unnecessarily split into microservices.

The architecture should maintain boundaries internally so services can later be extracted if required.

## 7.4 Event-Driven Secondary Processing

Primary operations should complete quickly.

Secondary processes should react to events:

```text
ASSESSMENT_COMPLETED
        |
        +--> Update Progress
        +--> Update Analytics
        +--> Check Gamification
        +--> Generate Recommendations
        +--> Send Notifications
```

## 7.5 Entitlement-Based Access

Access should not be represented as a simple boolean.

Instead:

```text
Student
   |
   +-- Entitlement
           |
           +-- Resource Type
           +-- Resource ID
           +-- Start Date
           +-- End Date
           +-- Status
```

## 7.6 API-First

Web, mobile, administration, and future integrations should use stable APIs.

---

# 8. High-Level Architecture

```text
                    +----------------------+
                    |      Web Client      |
                    |       Next.js        |
                    +----------+-----------+
                               |
                    +----------v-----------+
                    |    Mobile Client     |
                    |    React Native      |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | API / Load Balancer  |
                    +----------+-----------+
                               |
                               v
       +------------------------------------------------+
       |             Backend Application                |
       |                   NestJS                       |
       |                                                |
       |  Auth        Academic       Courses            |
       |  Users       Content        Assessments        |
       |  Progress    Commerce       Notifications      |
       |  Analytics   Gamification   Administration     |
       +-------------------+----------------------------+
                           |
             +-------------+--------------+
             |             |              |
             v             v              v
       PostgreSQL        Redis       Object Storage
             |             |              |
             |             |              v
             |             |             CDN
             |             |
             v             v
          Backup       Queue/Jobs
                           |
              +------------+------------+
              |                         |
              v                         v
       Notification Workers        Analytics Workers
```

---

# 9. Technology Stack

## Web

```text
Next.js
React
TypeScript
Tailwind CSS
TanStack Query
Zustand or Redux Toolkit
```

## Mobile

Recommended:

```text
React Native
Expo
TypeScript
```

## Backend

Recommended:

```text
NestJS
TypeScript
```

Advantages:

- Modular architecture
- Dependency injection
- REST support
- WebSocket support
- Authentication support
- Strong TypeScript ecosystem

## AI Service

Potential architecture:

```text
NestJS Core Platform
        |
        +--> Python AI Service
                |
                +-- AI Tutor
                +-- Question Generation
                +-- Learning Analytics
```

## Infrastructure

```text
PostgreSQL
Redis
Object Storage
CDN
Background Queue
Containerization
CI/CD
```

---

# 10. User Roles and Permissions

The system should implement Role-Based Access Control.

Example permissions:

```text
course:create
course:update
course:delete
course:publish
student:progress:view
assessment:create
assessment:grade
```

Example role:

```text
Teacher
 |
 +-- course:create
 +-- course:update:own
 +-- assessment:create
 +-- assessment:view
```

Student:

```text
Student
 |
 +-- course:read
 +-- lesson:consume
 +-- assessment:attempt
 +-- progress:view:own
```

Authorization should combine:

```text
RBAC + Resource Ownership
```

For example, a teacher may have `course:update`, but the system must validate ownership unless administrative permissions override it.

---

# 11. Academic Configuration Model

The core academic hierarchy is:

```text
Organization
|
+-- Academic Year
        |
        +-- Educational Stage
                |
                +-- Grade
                        |
                        +-- Subject
                                |
                                +-- Curriculum
                                        |
                                        +-- Course
                                                |
                                                +-- Module
                                                        |
                                                        +-- Lesson
```

Example:

```text
Academic Year 2026/2027
|
+-- Secondary Education
     |
     +-- Grade 12
          |
          +-- Physics
          |     |
          |     +-- Mechanics
          |     +-- Electricity
          |
          +-- Mathematics
          |
          +-- Chemistry
```

Academic data should be queried dynamically:

```text
GET available subjects
WHERE grade_id = current_student.grade_id
AND academic_year_id = active_year
```

---

# 12. Core Domain and Database Model

## 12.1 Users

```text
users
-----
id
organization_id
first_name
last_name
email
phone
password_hash
status
created_at
updated_at
```

Statuses:

```text
PENDING_VERIFICATION
ACTIVE
SUSPENDED
BLOCKED
DELETED
```

## 12.2 Roles

```text
roles
-----
id
organization_id
name
code
description
is_system_role
```

```text
permissions
-----------
id
resource
action
```

```text
role_permissions
----------------
role_id
permission_id
```

```text
user_roles
----------
user_id
role_id
organization_id
```

## 12.3 Academic Years

```text
academic_years
--------------
id
organization_id
name
start_date
end_date
status
```

## 12.4 Educational Stages

```text
education_stages
----------------
id
organization_id
name
code
sort_order
```

## 12.5 Grades

```text
grades
------
id
stage_id
name
code
sort_order
```

## 12.6 Subjects

```text
subjects
--------
id
organization_id
name
code
description
```

## 12.7 Grade Subjects

```text
grade_subjects
--------------
id
grade_id
subject_id
academic_year_id
status
```

This supports academic changes between years without changing historical records.

---

# 13. Course and Content Architecture

## 13.1 Courses

```text
courses
-------
id
organization_id
grade_subject_id
teacher_id
title
slug
description
thumbnail_file_id
status
visibility
created_at
updated_at
```

Course statuses:

```text
DRAFT
UNDER_REVIEW
APPROVED
PUBLISHED
ARCHIVED
REJECTED
```

## 13.2 Modules

```text
course_modules
--------------
id
course_id
title
description
sort_order
```

## 13.3 Lessons

```text
lessons
-------
id
module_id
title
description
lesson_type
estimated_duration
sort_order
status
is_preview
```

Lesson types:

```text
VIDEO
TEXT
DOCUMENT
QUIZ
ASSIGNMENT
LIVE_SESSION
INTERACTIVE
```

## 13.4 Generic Content Blocks

A lesson should support ordered content blocks:

```text
lesson_blocks
-------------
id
lesson_id
block_type
configuration
sort_order
```

Example:

```json
{
  "lessonId": "lesson-123",
  "blocks": [
    {
      "type": "VIDEO",
      "mediaId": "video-1001"
    },
    {
      "type": "TEXT",
      "content": "Key concepts and explanation"
    },
    {
      "type": "DOCUMENT",
      "fileId": "file-2001"
    },
    {
      "type": "QUIZ",
      "assessmentId": "quiz-001"
    }
  ]
}
```

Future block types can include:

```text
SIMULATION
CODE_EDITOR
INTERACTIVE_DIAGRAM
AI_TUTOR
POLL
```

---

# 14. Student Registration Journey

```text
Student
   |
   v
Open Platform
   |
   v
Register
   |
   +-- Phone Number
   +-- Email
   +-- Password
   |
   v
OTP Verification
   |
   v
Select Academic Information
   |
   +-- Academic Year
   +-- Educational Stage
   +-- Grade
   |
   v
Student Dashboard
```

Detailed sequence:

```text
Student -> API: Register
API -> Identity: Create Pending User
Identity -> OTP Service: Send OTP
OTP Service -> Student: OTP

Student -> API: Verify OTP
API -> Identity: Activate User
API -> Student Profile: Create Profile
API -> Client: Access Token + Refresh Token
```

---

# 15. Course Purchase and Enrollment

## Student Journey

```text
Student
   |
   v
Browse Courses
   |
   v
Select Course
   |
   v
View Details
   |
   +-- Teacher
   +-- Lessons
   +-- Preview
   +-- Price
   +-- Subscription Type
   |
   v
Create Order
   |
   v
Payment
   |
   v
Payment Successful
   |
   v
Enrollment Created
   |
   v
Entitlement Granted
   |
   v
Course Unlocked
```

## Event Flow

```text
PAYMENT_COMPLETED
        |
        v
Verify Transaction
        |
        v
ORDER_PAID
        |
        v
ENTITLEMENT_GRANTED
        |
        v
STUDENT_ENROLLED
        |
        v
NOTIFICATION_SENT
```

Payment processing must be idempotent.

One successful payment must produce only one successful order completion and entitlement.

---

# 16. Learning and Progress Tracking

## Lesson Completion

```text
Student opens lesson
        |
        v
Access validation
        |
        v
Load lesson
        |
        v
Consume content
        |
        v
Progress saved
        |
        v
Completion criteria reached
        |
        v
Lesson marked completed
        |
        v
Update course progress
```

Example progress table:

```text
student_lesson_progress
-----------------------
id
student_id
lesson_id
status
progress_percentage
last_position_seconds
started_at
completed_at
updated_at
```

The system should store the last video position so students can continue later.

Course progress can use:

```text
Detailed progress -> Source of truth
Aggregated progress -> Read optimization
```

---

# 17. Assessment and Question Bank

## 17.1 Question Types

```text
MULTIPLE_CHOICE
MULTIPLE_SELECT
TRUE_FALSE
SHORT_ANSWER
NUMERIC
ESSAY
MATCHING
ORDERING
IMAGE_BASED
```

## 17.2 Questions

```text
questions
---------
id
organization_id
subject_id
topic_id
question_type
difficulty
content
explanation
status
created_by
```

## 17.3 Question Options

```text
question_options
----------------
id
question_id
content
is_correct
sort_order
```

## 17.4 Question Bank Hierarchy

```text
Question Bank
|
+-- Physics
     |
     +-- Mechanics
     |    |
     |    +-- Easy
     |    +-- Medium
     |    +-- Hard
     |
     +-- Electricity
```

---

# 18. Configurable Exam Engine

The assessment engine supports two approaches.

## Static Assessment

```text
Exam
 |
 +-- Question 1
 +-- Question 2
 +-- Question 3
```

## Dynamic Assessment

Example configuration:

```text
Physics Weekly Exam

20 Questions
|
+-- 5 Easy
+-- 10 Medium
+-- 5 Hard

Topics:
+-- Motion
+-- Energy
+-- Newton's Laws
```

Example configuration:

```json
{
  "durationMinutes": 45,
  "attemptLimit": 2,
  "randomizeQuestions": true,
  "randomizeOptions": true,
  "showResultImmediately": false,
  "passingScore": 60,
  "rules": [
    {
      "topicId": "motion",
      "difficulty": "EASY",
      "count": 5
    },
    {
      "topicId": "motion",
      "difficulty": "MEDIUM",
      "count": 10
    }
  ]
}
```

## Assessment Lifecycle

```text
NOT_STARTED
      |
      v
IN_PROGRESS
      |
      +-------------------+
      |                   |
      v                   v
SUBMITTED             EXPIRED
      |
      v
AUTO_GRADING
      |
      +----------------------+
      |                      |
      v                      v
COMPLETED              PENDING_REVIEW
                             |
                             v
                         COMPLETED
```

Answers should be auto-saved to reduce data loss.

The timer should be based on server time.

---

# 19. Teacher Course Creation Workflow

```text
Teacher Login
      |
      v
Teacher Dashboard
      |
      v
Create Course
      |
      +-- Select Grade
      +-- Select Subject
      +-- Course Name
      +-- Description
      |
      v
Create Modules
      |
      v
Create Lessons
      |
      +-- Upload Video
      +-- Upload PDF
      +-- Add Text
      +-- Add Quiz
      +-- Schedule Live Session
      |
      v
Submit for Review
      |
      v
Admin Approval
      |
      v
Course Published
```

Course state machine:

```text
                    +---------+
                    |  DRAFT  |
                    +----+----+
                         |
                    submit
                         |
                         v
                 +---------------+
                 | UNDER_REVIEW  |
                 +-------+-------+
                         |
              +----------+----------+
              |                     |
           approve               reject
              |                     |
              v                     v
        +-----------+         +-----------+
        | APPROVED  |         | REJECTED  |
        +-----+-----+         +-----------+
              |
           publish
              |
              v
        +-----------+
        | PUBLISHED |
        +-----+-----+
              |
           archive
              |
              v
        +-----------+
        | ARCHIVED  |
        +-----------+
```

Workflow behavior should be configurable.

Example:

```text
Organization A:
Teacher can publish directly.

Organization B:
Academic administrator approval required.
```

---

# 20. Live Classes

The initial platform should integrate with external live-session providers through an abstraction.

```text
Course
   |
   v
Create Live Session
   |
   +-- Title
   +-- Start Time
   +-- Duration
   +-- Teacher
   +-- Provider
```

Provider abstraction:

```text
LiveSessionProvider
|
+-- createSession()
+-- updateSession()
+-- cancelSession()
+-- getJoinInformation()
```

Database:

```text
live_sessions
-------------
id
course_id
teacher_id
provider
external_meeting_id
start_time
end_time
status
```

This prevents tight coupling to one provider.

---

# 21. Parent Portal

A parent can be linked to multiple students.

```text
Parent
|
+-- Student A
|     |
|     +-- Progress
|     +-- Attendance
|     +-- Exam Results
|     +-- Weak Subjects
|
+-- Student B
      |
      +-- Progress
      +-- Results
```

Relationship table:

```text
student_parents
---------------
student_id
parent_id
relationship_type
status
```

Statuses:

```text
PENDING
VERIFIED
REVOKED
```

Verification protects student information.

---

# 22. AI Learning Assistant

The AI assistant should understand the student's educational context.

```text
Student
|
+-- Grade
+-- Subjects
+-- Enrolled Courses
+-- Current Lesson
+-- Completed Lessons
+-- Exam Results
+-- Weak Topics
```

The AI can provide:

- Concept explanation
- Simplified explanations
- Examples
- Practice questions
- Mistake analysis
- Study plans
- Lesson recommendations
- Arabic and English interaction

Architecture:

```text
Student
   |
   v
AI Gateway
   |
   +-- Authentication
   +-- Authorization
   +-- Rate Limiting
   +-- Context Builder
   |
   v
AI Orchestrator
   |
   +------------------------+
   |                        |
   v                        v
Knowledge Retrieval        Student Context
   |                        |
   +------------+-----------+
                |
                v
               LLM
                |
                v
             Response
```

The AI service should receive only controlled context required for the request.

---

# 23. RAG Knowledge Pipeline

When a teacher uploads educational material:

```text
Teacher uploads PDF
        |
        v
File Processing Worker
        |
        +-- Extract text
        +-- Split into chunks
        +-- Generate embeddings
        |
        v
Vector Store
```

When the student asks:

```text
Explain Newton's Second Law
```

The system:

```text
Question
   |
   v
Retrieve relevant curriculum content
   |
   v
Retrieve relevant lesson context
   |
   v
Build controlled context
   |
   v
LLM
   |
   v
Response
```

---

# 24. Recommendation Engine

The first version should use rules rather than complex machine learning.

Example:

```text
IF
    Mathematics Score < 60
AND
    Lesson Completion < 70

THEN
    Recommend Algebra Revision
```

Architecture:

```text
Student Activity
      |
      +-- Study Time
      +-- Exam Scores
      +-- Mistakes
      +-- Repeated Topics
      +-- Completion Rate
              |
              v
      Recommendation Engine
              |
              v
       Personalized Learning Path
```

Later, this can evolve into an ML-based system.

---

# 25. Gamification

Gamification should be event-driven and configurable.

Events:

```text
LESSON_COMPLETED
QUIZ_COMPLETED
EXAM_PASSED
STREAK_CREATED
COURSE_COMPLETED
```

Example rules:

```text
Lesson Completed = 10 XP
Quiz Score > 90% = 30 XP
7 Day Streak = 100 XP
```

Architecture:

```text
Event
  |
  v
Rule Engine
  |
  +-- Award XP
  +-- Award Badge
  +-- Update Level
```

Possible achievements:

```text
7 Day Streak
Physics Master
100 Lessons Completed
Top Performer
```

---

# 26. Notifications

Supported channels should be configurable:

```text
IN_APP
PUSH
EMAIL
SMS
OTHER_CONFIGURED_CHANNELS
```

Events may include:

```text
PAYMENT_COMPLETED
EXAM_REMINDER
LIVE_SESSION_STARTING
COURSE_COMPLETED
NEW_LESSON
LOW_PROGRESS
```

Architecture:

```text
Application Event
       |
       v
Notification Service
       |
       +-- In-App
       +-- Push
       +-- Email
       +-- SMS
```

The primary business operation should not wait for notification delivery.

---

# 27. Configurable Workflow and Business Rules

Example workflow:

```text
DRAFT
  |
  v
SUBMITTED
  |
  v
UNDER_REVIEW
  |
  +-------------+
  |             |
  v             v
APPROVED     REJECTED
  |
  v
PUBLISHED
```

Configuration can be represented conceptually as:

```json
{
  "workflow": "coursePublishing",
  "states": [
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "PUBLISHED"
  ]
}
```

Other workflow use cases:

- Teacher onboarding
- Refund approval
- Assignment review
- Student suspension

Business rules can also support:

```text
Course Completion Rule:
Complete 80% of lessons
AND
Pass final exam
```

```text
Exam Passing Rule:
Score >= 60%
```

---

# 28. Subscription and Entitlement Model

Supported commercial models:

```text
FREE
PAY_PER_COURSE
MONTHLY_SUBSCRIPTION
TERM_SUBSCRIPTION
ANNUAL_SUBSCRIPTION
BUNDLE
```

Commerce separation:

```text
Product
   |
Order
   |
Payment
   |
Entitlement
```

## Products

```text
products
--------
id
organization_id
name
product_type
price
currency
status
```

Product types:

```text
COURSE
COURSE_BUNDLE
SUBSCRIPTION
GRADE_PACKAGE
PROMOTIONAL_PRODUCT
```

## Orders

```text
orders
------
id
student_id
status
total_amount
currency
created_at
```

Statuses:

```text
PENDING
PAYMENT_PROCESSING
PAID
FAILED
CANCELLED
REFUNDED
```

## Entitlements

```text
student_entitlements
--------------------
id
student_id
resource_type
resource_id
source_type
source_id
starts_at
expires_at
status
```

Resource types:

```text
COURSE
SUBJECT
GRADE_BUNDLE
LIVE_SESSION
PREMIUM_FEATURE
```

Source types:

```text
PURCHASE
SUBSCRIPTION
VOUCHER
ADMIN_GRANT
PROMOTION
```

---

# 29. Security Architecture

```text
Frontend
    |
HTTPS
    |
API / Load Balancer
    |
Authentication
    |
JWT / Refresh Token
    |
RBAC + Ownership
    |
Backend
    |
Database
```

Security requirements:

- Secure password hashing
- OTP verification
- Short-lived access tokens
- Refresh token rotation
- Rate limiting
- Brute-force protection
- Role-based authorization
- Resource ownership validation
- Audit logs
- File access control
- Signed media URLs
- Session management
- Secure secret storage

Audit events:

```text
USER_LOGIN
PASSWORD_CHANGED
ROLE_CHANGED
COURSE_PUBLISHED
PAYMENT_REFUNDED
STUDENT_SUSPENDED
```

---

# 30. Video and Media Protection

Video access flow:

```text
Student requests lesson
        |
        v
Backend validates:
    - Authentication
    - Enrollment
    - Entitlement
    - Expiration
        |
        v
Generate short-lived media access
        |
        v
Client loads media through CDN
```

Additional controls:

- Token expiration
- Signed URLs
- Concurrent device limits
- Suspicious activity detection
- Optional visible watermarking

---

# 31. Analytics

Track events such as:

```text
STUDENT_LOGIN
COURSE_OPENED
LESSON_STARTED
VIDEO_PROGRESS_UPDATED
LESSON_COMPLETED
QUIZ_STARTED
QUIZ_SUBMITTED
PAYMENT_COMPLETED
```

Generic event structure:

```text
event_id
event_type
user_id
organization_id
resource_type
resource_id
timestamp
metadata
```

Example:

```json
{
  "eventType": "LESSON_COMPLETED",
  "studentId": "student-1",
  "lessonId": "lesson-100",
  "courseId": "course-20",
  "timestamp": "2026-08-17T10:30:00Z"
}
```

Analytics categories:

### Student

```text
Completion Rate
Average Score
Study Time
Weak Topics
Learning Streak
```

### Teacher

```text
Active Students
Course Completion
Average Score
Lesson Engagement
```

### Platform

```text
DAU
MAU
Revenue
Conversion Rate
Course Enrollment
Retention
```

---

# 32. Backend Modules

Recommended backend structure:

```text
src/
|
+-- identity/
|   +-- authentication/
|   +-- users/
|   +-- roles/
|   +-- permissions/
|
+-- organization/
|   +-- organizations/
|   +-- memberships/
|
+-- academic/
|   +-- academic-years/
|   +-- stages/
|   +-- grades/
|   +-- subjects/
|   +-- curriculum/
|
+-- learning/
|   +-- courses/
|   +-- modules/
|   +-- lessons/
|   +-- content/
|   +-- progress/
|
+-- assessment/
|   +-- questions/
|   +-- quizzes/
|   +-- exams/
|   +-- attempts/
|   +-- grading/
|
+-- commerce/
|   +-- products/
|   +-- orders/
|   +-- payments/
|   +-- subscriptions/
|   +-- entitlements/
|
+-- communication/
|   +-- notifications/
|   +-- announcements/
|
+-- analytics/
+-- gamification/
+-- parent/
+-- ai/
+-- administration/
```

---

# 33. API Design

API versioning:

```text
/api/v1/
```

## Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/verify-otp
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

## Student

```text
GET /api/v1/students/me
PUT /api/v1/students/me
GET /api/v1/students/me/dashboard
GET /api/v1/students/me/progress
GET /api/v1/students/me/courses
```

## Academic

```text
GET /api/v1/academic-years
GET /api/v1/stages
GET /api/v1/grades
GET /api/v1/grades/{id}/subjects
```

## Courses

```text
GET /api/v1/courses
GET /api/v1/courses/{courseId}
POST /api/v1/courses
PATCH /api/v1/courses/{courseId}
POST /api/v1/courses/{courseId}/submit
POST /api/v1/courses/{courseId}/publish
```

## Lessons

```text
GET /api/v1/lessons/{lessonId}
POST /api/v1/lessons/{lessonId}/progress
POST /api/v1/lessons/{lessonId}/complete
```

## Assessments

```text
POST /api/v1/assessments/{id}/attempts
GET /api/v1/attempts/{attemptId}
PUT /api/v1/attempts/{attemptId}/answers
POST /api/v1/attempts/{attemptId}/submit
GET /api/v1/attempts/{attemptId}/result
```

---

# 34. API Authorization Flow

Every protected request should follow:

```text
Request
   |
   v
Authentication Guard
   |
   v
Identify User
   |
   v
Organization Context
   |
   v
Role / Permission Validation
   |
   v
Resource Ownership Validation
   |
   v
Controller
```

Example:

A teacher has:

```text
course:update
```

The system must still validate:

```text
course.teacher_id == current_user.id
```

unless the user has an administrative override permission.

---

# 35. API Error Standard

Example:

```json
{
  "success": false,
  "error": {
    "code": "COURSE_ACCESS_DENIED",
    "message": "You do not currently have access to this course.",
    "requestId": "req_123456"
  }
}
```

Error categories:

```text
VALIDATION_ERROR
AUTHENTICATION_ERROR
AUTHORIZATION_ERROR
RESOURCE_NOT_FOUND
CONFLICT
PAYMENT_ERROR
RATE_LIMITED
INTERNAL_ERROR
```

---

# 36. End-to-End Usage Scenarios

## Scenario 1: Student Registration

```text
1. Student opens the application.
2. Student selects registration.
3. Student enters identity information.
4. System creates PENDING_VERIFICATION user.
5. System sends OTP.
6. Student verifies OTP.
7. System activates the user.
8. Student selects academic year and grade.
9. Student profile is created.
10. Dashboard is generated.
```

## Scenario 2: Student Purchases a Course

```text
Student
   |
   v
Browse Course
   |
   v
Create Order
   |
   v
Initiate Payment
   |
   v
Payment Provider
   |
   v
Webhook
   |
   v
Validate Transaction
   |
   v
Order = PAID
   |
   v
Create Entitlement
   |
   v
Create Enrollment
   |
   v
Invalidate Dashboard Cache
   |
   v
Send Notification
```

## Scenario 3: Student Completes a Lesson

```text
Open Lesson
   |
   v
Validate Access
   |
   v
Load Content
   |
   v
Watch / Read / Interact
   |
   v
Save Progress
   |
   v
Completion Rule Reached
   |
   v
Mark Lesson Completed
   |
   v
Update Course Progress
```

## Scenario 4: Student Takes an Exam

```text
Student starts exam

System:
1. Validate access.
2. Validate attempt limit.
3. Generate or load questions.
4. Create attempt.
5. Save start time.

Student:
Answers questions.

Client:
Periodically saves answers.

Student:
Submits exam.

System:
1. Lock attempt.
2. Grade automatic questions.
3. Calculate score.
4. Identify weak topics.
5. Update progress.
6. Publish ASSESSMENT_COMPLETED.
```

## Scenario 5: Teacher Publishes a Course

```text
Teacher creates course
       |
       v
DRAFT
       |
       v
Teacher submits course
       |
       v
UNDER_REVIEW
       |
       +--------------------+
       |                    |
       v                    v
APPROVED                REJECTED
       |
       v
PUBLISHED
```

## Scenario 6: Personalized Recommendation

Suppose student performance is:

```text
Newton's Laws: 95%
Motion: 80%
Energy: 45%
```

The recommendation engine produces:

```text
Recommended Action:
Review Energy

1. Review Lesson 5
2. Read lesson summary
3. Solve 20 practice questions
4. Retake practice quiz
```

---

# 37. Configuration and Feature Flags

Configuration hierarchy:

```text
Global
   |
   +-- Organization
          |
          +-- Academic Year
                 |
                 +-- Grade
                        |
                        +-- Course
```

Configuration precedence:

```text
Course Configuration
        overrides
Grade Configuration
        overrides
Organization Configuration
        overrides
Global Configuration
```

Configuration categories:

- Academic settings
- Course publishing workflow
- Assessment rules
- Subscription rules
- Notification templates
- Gamification rules
- Feature flags
- UI branding

Feature flags:

```text
feature_flags
-------------
id
organization_id
key
enabled
configuration
```

Examples:

```text
ai_tutor_enabled
parent_portal_enabled
live_sessions_enabled
gamification_enabled
new_exam_engine_enabled
```

---

# 38. Caching Strategy

Redis can be used for:

```text
Session metadata
Rate limiting
Frequently accessed courses
Student dashboards
Configuration
Temporary locks
Background jobs
```

Example:

```text
course:{courseId}
TTL: 30 minutes
```

```text
student:{studentId}:dashboard
TTL: 5 minutes
```

Cache invalidation events:

```text
LESSON_COMPLETED
ASSESSMENT_COMPLETED
ENTITLEMENT_GRANTED
COURSE_UPDATED
```

---

# 39. Background Jobs

The following operations should execute asynchronously:

- Sending notifications
- Generating analytics
- Processing uploaded files
- Video processing
- Generating AI embeddings
- Large report generation
- Scheduled reminders
- Certificate generation

Architecture:

```text
API
 |
 v
Create Job
 |
 v
Queue
 |
 +----------------+
 |                |
 v                v
Worker A       Worker B
```

Jobs should support:

- Retry
- Exponential backoff
- Dead-letter handling
- Idempotency
- Monitoring
- Failure alerts

---

# 40. File and Media Architecture

Recommended upload flow:

```text
Teacher
   |
   v
Request Upload Permission
   |
   v
Backend generates temporary upload access
   |
   v
Client uploads directly to Object Storage
   |
   v
Storage Event
   |
   v
Processing Worker
   |
   +-- Generate thumbnail
   +-- Extract metadata
   +-- Process document
```

Large media files should not unnecessarily pass through the backend application.

---

# 41. Multi-Tenancy

The platform should support multiple organizations.

Initial approach:

```text
Shared Database
Shared Schema
organization_id on tenant-owned entities
```

Example:

```text
courses
-------
id
organization_id
teacher_id
title
```

Tenant-aware queries must enforce organization context:

```text
WHERE organization_id = current_context.organization_id
```

This enforcement should be centralized.

---

# 42. Failure Scenarios

## Duplicate Payment Webhook

```text
Payment Transaction ID
        |
        v
Already Processed?
        |
   +----+----+
   |         |
  Yes        No
   |          |
Return      Process
Success     Transaction
```

Use unique constraints and idempotency.

## Student Loses Internet During Exam

Solution:

- Auto-save answers
- Store latest answer state
- Support reconnect
- Use server-side timing

## Notification Provider Failure

```text
Notification Job
    |
    +--> Retry
    |
    +--> Exponential Backoff
    |
    +--> Dead Letter Queue
```

## Video Provider Failure

- Retry loading
- Display fallback state
- Monitor provider availability
- Avoid failing the entire lesson API

---

# 43. Observability

## Structured Logging

Recommended fields:

```text
timestamp
request_id
user_id
organization_id
module
severity
message
```

## Metrics

Monitor:

- API latency
- Error rate
- Database connections
- Queue depth
- Failed jobs
- Active users
- Payment failures

## Distributed Tracing

A request ID should flow through:

```text
Client
   |
   v
API
   |
   v
Database
   |
   v
Background Job
```

---

# 44. Deployment Architecture

Initial production deployment:

```text
                    Internet
                        |
                        v
                 Load Balancer
                        |
             +----------+----------+
             |                     |
         Web Application       Backend API
             |                     |
             +----------+----------+
                        |
        +---------------+---------------+
        |               |               |
        v               v               v
   PostgreSQL         Redis       Object Storage
        |                               |
        v                               v
     Backups                           CDN
```

Growth architecture:

```text
                 Load Balancer
                       |
          +------------+------------+
          |                         |
       API #1                     API #2
          |                         |
          +------------+------------+
                       |
          +------------+------------+
          |                         |
      PostgreSQL                  Redis
          |
          +---- Queue
                   |
              Workers
```

---

# 45. Scaling Strategy

## Phase 1: MVP

```text
Next.js
NestJS
PostgreSQL
Redis
Object Storage
```

Use a modular monolith.

## Phase 2: Growth

Extract heavy workloads:

```text
Core Platform
      |
      +-- Notification Workers
      +-- Analytics Workers
      +-- Media Processing
      +-- AI Service
```

## Phase 3: Large Scale

Potential architecture:

```text
API Gateway
    |
    +-- Identity Service
    +-- Learning Service
    +-- Assessment Service
    +-- Commerce Service
    +-- Notification Service
    +-- AI Service
    +-- Analytics Service
```

Service extraction should be driven by real operational needs.

---

# 46. CI/CD Architecture

```text
Developer
    |
    v
Git Repository
    |
    v
Pull Request
    |
    +-- Lint
    +-- Unit Tests
    +-- Integration Tests
    +-- Security Scan
    +-- Build
    |
    v
Deploy Staging
    |
    +-- Automated Tests
    |
    v
Production Approval
    |
    v
Production Deployment
```

Deployment strategies:

```text
Rolling Deployment
or
Blue/Green Deployment
```

Database migrations should be backward compatible when possible.

---

# 47. Testing Strategy

## Unit Testing

Test:

- Business rules
- Services
- Calculations
- State transitions

Example:

```text
Given:
Attempt Limit = 1

When:
Student already completed one attempt

Then:
Starting another attempt must fail.
```

## Integration Testing

Test:

- Database operations
- Authentication
- Payment workflows
- Assessment submission

## End-to-End Testing

Critical flows:

```text
Register -> Login -> Select Grade
Browse -> Purchase -> Access Course
Start Lesson -> Complete -> Progress Updated
Start Exam -> Answer -> Submit -> Result
Teacher -> Create Course -> Submit -> Publish
```

---

# 48. Repository Structure

Recommended monorepo:

```text
educational-platform/
|
+-- apps/
|   +-- web/
|   +-- mobile/
|   +-- api/
|
+-- packages/
|   +-- ui/
|   +-- types/
|   +-- api-client/
|   +-- config/
|   +-- utilities/
|
+-- infrastructure/
|   +-- docker/
|   +-- terraform/
|   +-- kubernetes/
|
+-- docs/
|   +-- architecture/
|   +-- api/
|   +-- database/
|   +-- decisions/
|
+-- scripts/
```

---

# 49. Implementation Roadmap

## Phase 1: Foundation

```text
Project Setup
Authentication
User Management
RBAC
Organization Model
Database Infrastructure
CI/CD
Logging
```

## Phase 2: Academic Engine

```text
Academic Years
Educational Stages
Grades
Subjects
Student Academic Profiles
```

## Phase 3: Learning

```text
Courses
Modules
Lessons
Content Blocks
Media Upload
Student Enrollment
```

## Phase 4: Progress

```text
Lesson Progress
Video Progress
Course Completion
Student Dashboard
```

## Phase 5: Assessment

```text
Question Bank
Quiz Engine
Exam Attempts
Automatic Grading
Results
Weak Topic Analysis
```

## Phase 6: Commerce

```text
Products
Orders
Payment Integration
Subscriptions
Entitlements
Access Validation
```

## Phase 7: Communication

```text
Notifications
Announcements
Scheduled Reminders
```

## Phase 8: Advanced Features

```text
Parent Portal
Gamification
Analytics
Recommendations
Live Sessions
```

## Phase 9: AI

```text
Document Ingestion
Knowledge Retrieval
AI Tutor
Contextual Assistance
Weak Topic Recommendations
```

---

# 50. Final Architecture Decision

The recommended production architecture is:

```text
                         USERS
              +-----------+-----------+
              |                       |
            WEB                    MOBILE
          Next.js               React Native
              |                       |
              +-----------+-----------+
                          |
                    Load Balancer
                          |
                 +--------v--------+
                 |   NestJS API    |
                 |                 |
                 | Modular Domains |
                 +--------+--------+
                          |
          +---------------+----------------+
          |               |                |
          v               v                v
     PostgreSQL         Redis        Object Storage
          |               |                |
          |               |               CDN
          |               |
          |          Background Queue
          |               |
          +---------------+----------------+
                          |
                 +--------+--------+
                 |                 |
                 v                 v
           Worker Services      AI Service
```

## Final Architectural Principles

### 1. Configuration Instead of Hard Coding

Academic years, grades, subjects, permissions, workflows, features, and business rules should be configuration-driven.

### 2. Clear Domain Boundaries

The system separates:

- Identity
- Academic
- Learning
- Assessment
- Commerce
- Progress
- Notifications
- Analytics
- AI

### 3. Modular Monolith First

Start simple while preserving clean module boundaries.

### 4. Event-Driven Secondary Processing

Use events and background workers for:

- Notifications
- Analytics
- Gamification
- File processing
- Recommendations

### 5. Entitlement-Based Access

Paid, subscribed, free, and granted access should all be represented using a unified entitlement model.

### 6. API-First Development

Web, mobile, administration, and future integrations use consistent API contracts.

### 7. Future-Ready Multi-Tenancy

The platform can evolve from a single educational provider into a multi-organization platform.

### 8. AI as an Isolated Extension

AI enhances the educational experience without becoming tightly coupled to the transactional core.

---

# 51. Recommended Next Technical Deliverables

The following artifacts should be created next to move from architecture into implementation:

1. Detailed PostgreSQL database schema with:
   - Tables
   - Columns
   - Data types
   - Primary keys
   - Foreign keys
   - Indexes
   - Constraints

2. Complete Entity Relationship Diagram.

3. NestJS backend project structure including:
   - Modules
   - Controllers
   - Services
   - DTOs
   - Entities
   - Guards
   - Events

4. Complete REST API specification.

5. Student, Teacher, Parent, and Admin frontend architecture.

6. Detailed sequence diagrams for all critical workflows.

7. DevOps architecture including:
   - Docker
   - Development
   - Staging
   - Production
   - CI/CD
   - Monitoring
   - Backups

8. Product backlog containing:
   - Epics
   - Features
   - User stories
   - Acceptance criteria
   - Development milestones

---

# Conclusion

This design provides a foundation for a configurable educational platform capable of starting as an MVP and evolving into a large-scale educational ecosystem.

The key architectural decision is to avoid designing the system around today's exact academic structure. Instead, academic data, workflows, access models, content types, and business rules should be configurable.

The recommended implementation strategy is:

```text
Configurable Data Model
        +
Modular Monolith
        +
API-First Design
        +
Event-Driven Background Processing
        +
Entitlement-Based Access
        +
Scalable Infrastructure
        =
Future-Ready Educational Platform
```
