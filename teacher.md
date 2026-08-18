Detailed Teacher Module Design — Educational Platform

Below is an implementation-focused design for the Teacher role. The goal is to make the teacher responsible for creating and managing educational content while keeping important platform rules—such as publishing, access control, and academic configuration—controlled by the system and administrators.

1. Teacher Role Overview

The Teacher module should support this complete lifecycle:

Teacher Login
     |
     v
Teacher Dashboard
     |
     +--> Create Course
     |
     +--> Update Course
     |
     +--> Manage Modules
     |
     +--> Manage Lessons
     |       |
     |       +--> Add Video
     |       +--> Add Text/Notes
     |       +--> Add PDF/Documents
     |       +--> Add Quiz
     |       +--> Add Assignment
     |       +--> Add Live Session
     |
     +--> Submit Course for Review
     |
     +--> Update Published Course
     |
     +--> Monitor Students
     |
     +--> Review Assignments
     |
     +--> View Analytics

The most important principle is:

A Course should not directly contain videos, quizzes, or assignments. Instead, a Course contains Modules, Modules contain Lessons, and Lessons contain configurable Content Blocks.

This gives the teacher maximum flexibility.

2. Teacher Responsibilities

The Teacher role should have the following functional responsibilities.

2.1 Course Management

The teacher can:

Create a course.
Update course information.
Delete a draft course.
Archive a course.
Submit a course for review.
View course status.
Duplicate an existing course if permitted.

The teacher should not necessarily be allowed to publish directly.

This depends on organization configuration.

Teacher Creates Course
        |
        v
       DRAFT
        |
        +----> Edit
        |
        +----> Delete
        |
        v
 Submit for Review
        |
        v
  UNDER_REVIEW
        |
   +----+-----+
   |          |
APPROVED   REJECTED
   |
   v
PUBLISHED
3. Teacher Permissions

A permission model should be used instead of checking only:

role == TEACHER

Recommended permissions:

course:create
course:read:own
course:update:own
course:delete:own
course:submit

module:create
module:update
module:delete

lesson:create
lesson:update
lesson:delete

video:create
video:update
video:delete

assignment:create
assignment:update
assignment:delete
assignment:grade

quiz:create
quiz:update
quiz:delete

question:create
question:update
question:delete

student:analytics:view

course:publish

A standard teacher might have:

course:create
course:update:own
course:delete:own
module:create
module:update
module:delete
lesson:create
lesson:update
lesson:delete
assignment:create
assignment:update
assignment:grade
quiz:create
quiz:update
question:create
question:update
student:analytics:view
course:submit

While an organization can configure whether the teacher also has:

course:publish
4. Teacher Dashboard Design

The Teacher Dashboard should be the main entry point.

+------------------------------------------------------+
| Hello, Dr. Ahmed                                     |
|                                                      |
| [Create Course]     [Create Quiz]                   |
+------------------------------------------------------+

+----------------+ +----------------+ +---------------+
| Active Courses | | Total Students | | Pending Grade |
|       12       | |      1,250     | |      18       |
+----------------+ +----------------+ +---------------+

My Courses

+------------------------------------------------------+
| Physics Grade 12                                    |
| Status: Published                                   |
| Students: 320                                       |
| Progress: 85%                                       |
| [Manage] [Analytics]                                |
+------------------------------------------------------+

+------------------------------------------------------+
| Physics Revision                                    |
| Status: Draft                                       |
| Progress: 40%                                       |
| [Continue Editing]                                  |
+------------------------------------------------------+

Dashboard API:

GET /api/v1/teacher/dashboard

Example response:

{
  "statistics": {
    "activeCourses": 12,
    "totalStudents": 1250,
    "pendingAssignments": 18
  },
  "courses": [
    {
      "id": "course_001",
      "title": "Physics Grade 12",
      "status": "PUBLISHED",
      "studentCount": 320,
      "completion": 85
    }
  ]
}
5. Course Management Design
5.1 Create Course

The teacher should not manually enter invalid academic information.

The UI should dynamically load:

Academic Year
      |
      v
Educational Stage
      |
      v
Grade
      |
      v
Subject

Example:

Create Course

Course Title:
[ Physics - Full Course 2026 ]

Academic Year:
[ 2026/2027 ]

Grade:
[ Grade 12 ]

Subject:
[ Physics ]

Description:
[ ................................ ]

Thumbnail:
[ Upload ]

[ Save Draft ]

API:

POST /api/v1/teacher/courses

Request:

{
  "academicYearId": "year_2026",
  "gradeId": "grade_12",
  "subjectId": "physics",
  "title": "Physics Grade 12",
  "description": "Complete Physics course"
}

Backend logic:

1. Authenticate teacher.
2. Validate course:create permission.
3. Validate academic year.
4. Validate grade.
5. Validate subject.
6. Validate subject belongs to grade.
7. Create course.
8. Set teacher_id = authenticated user.
9. Set status = DRAFT.
10. Return course.
6. Course Entity Design
courses
------------------------------------------------
id                  UUID PK
organization_id     UUID FK
teacher_id          UUID FK -> users.id

academic_year_id    UUID FK
grade_id            UUID FK
subject_id          UUID FK

title               VARCHAR
slug                VARCHAR
description         TEXT

thumbnail_file_id   UUID FK

status              ENUM
visibility          ENUM

created_at
updated_at
deleted_at

Recommended status:

DRAFT
UNDER_REVIEW
APPROVED
PUBLISHED
REJECTED
ARCHIVED

Visibility:

PUBLIC
PRIVATE
UNLISTED

Recommended indexes:

INDEX(organization_id)
INDEX(teacher_id)
INDEX(status)
INDEX(grade_id, subject_id)
7. Updating a Course

API:

PATCH /api/v1/teacher/courses/{courseId}

The backend must verify ownership.

Current User
      |
      v
Find Course
      |
      v
course.teacher_id == current_user.id ?
      |
   +--+--+
   |     |
 YES     NO
   |      |
Update   403 Forbidden

Example request:

{
  "title": "Physics Grade 12 - Updated",
  "description": "Updated course description"
}

Important rule:

Some fields should be restricted after publication.

For example:

Teacher can update:
- Title
- Description
- Thumbnail
- Lessons

Teacher may require approval to change:
- Grade
- Subject
- Academic Year

This prevents academic inconsistency.

8. Deleting a Course

Avoid physical deletion.

Use:

Soft Delete

Database:

deleted_at

API:

DELETE /api/v1/teacher/courses/{courseId}

Rules:

DRAFT
    -> Can Delete

UNDER_REVIEW
    -> Cannot Delete, Can Withdraw

PUBLISHED
    -> Cannot Delete
    -> Can Archive

ARCHIVED
    -> Can Restore if permitted

Published courses should not disappear while students still have access.

9. Course Structure

The recommended hierarchy is:

Course
  |
  +-- Module 1
  |      |
  |      +-- Lesson 1
  |      |      |
  |      |      +-- Video
  |      |      +-- PDF
  |      |      +-- Quiz
  |      |
  |      +-- Lesson 2
  |
  +-- Module 2
         |
         +-- Lesson 3
         |
         +-- Assignment

Database:

course_modules
--------------
id
course_id
title
description
sort_order
created_at
updated_at
lessons
-------
id
module_id
title
description
status
sort_order
estimated_duration
created_at
updated_at
10. Module Management

Teacher operations:

Create Module
Update Module
Delete Module
Reorder Module

APIs:

POST   /teacher/courses/{courseId}/modules
PATCH  /teacher/modules/{moduleId}
DELETE /teacher/modules/{moduleId}
POST   /teacher/courses/{courseId}/modules/reorder

Example reorder:

{
  "modules": [
    {
      "id": "module_3",
      "sortOrder": 1
    },
    {
      "id": "module_1",
      "sortOrder": 2
    }
  ]
}

The backend should perform the operation inside a database transaction.

11. Lesson Management

A teacher can:

Create lesson.
Update lesson.
Delete lesson.
Reorder lessons.
Add content blocks.
Configure completion rules.

Example:

Lesson:
Newton's Second Law

Content:

1. Introduction Video
2. Theory Explanation
3. PDF Summary
4. Quiz
5. Homework Assignment

The lesson should not be limited to one content type.

12. Generic Lesson Content Block Architecture

Recommended database:

lesson_blocks
------------------------------------------------
id
lesson_id

block_type

configuration_json

sort_order

is_required

created_at
updated_at

Supported types:

VIDEO
TEXT
DOCUMENT
QUIZ
ASSIGNMENT
LIVE_SESSION
LINK

Example:

{
  "id": "block_001",
  "type": "VIDEO",
  "sortOrder": 1,
  "isRequired": true,
  "configuration": {
    "mediaId": "media_1001"
  }
}

Quiz:

{
  "id": "block_002",
  "type": "QUIZ",
  "sortOrder": 2,
  "isRequired": true,
  "configuration": {
    "assessmentId": "assessment_001",
    "minimumScore": 60
  }
}

Assignment:

{
  "id": "block_003",
  "type": "ASSIGNMENT",
  "sortOrder": 3,
  "configuration": {
    "assignmentId": "assignment_001"
  }
}
13. Recommended Alternative: Strongly Typed Content Tables

Although JSON configuration is flexible, I recommend a hybrid design.

Use:

lesson_blocks

as the generic structure.

But store complex entities separately:

videos
quizzes
assignments
documents
live_sessions

Relationship:

lesson_block
      |
      +-- block_type = VIDEO
      |       |
      |       +--> video_id
      |
      +-- block_type = QUIZ
      |       |
      |       +--> quiz_id
      |
      +-- block_type = ASSIGNMENT
              |
              +--> assignment_id

This gives both:

Flexibility + Strong Data Integrity
14. Video Upload Architecture

The browser or mobile application should not upload large videos through the NestJS server.

Recommended architecture:

Teacher
   |
   v
POST /media/upload-url
   |
   v
Backend validates permission
   |
   v
Generate temporary upload URL
   |
   v
Teacher uploads directly
   |
   v
Object Storage
   |
   v
Upload Completed Event
   |
   v
Media Processing Queue
   |
   +--> Validate File
   +--> Extract Metadata
   +--> Generate Thumbnail
   +--> Transcode
   +--> Generate Streaming Format
   |
   v
Video = READY
15. Video Database Design
media_files
---------------------------------
id
organization_id
uploaded_by

file_name
original_file_name
mime_type

file_size

storage_key

media_type

status

duration_seconds

thumbnail_key

created_at
updated_at

Media types:

VIDEO
DOCUMENT
IMAGE
AUDIO

Status:

UPLOADING
UPLOADED
PROCESSING
READY
FAILED
DELETED

For video streaming:

video_assets
----------------------------
id
media_file_id
streaming_manifest_key
resolution
duration_seconds
16. Video Attachment Flow
Teacher creates lesson
        |
        v
Click "Add Video"
        |
        v
Upload Video
        |
        v
Media Processing
        |
        v
Video Status = READY
        |
        v
Teacher selects video
        |
        v
Create Lesson Block

API:

POST /api/v1/teacher/lessons/{lessonId}/blocks

Request:

{
  "type": "VIDEO",
  "mediaId": "media_001",
  "sortOrder": 1,
  "isRequired": true
}
17. Quiz Design

A teacher should be able to create a quiz independently and attach it to one or multiple lessons.

Teacher
   |
   +-- Question Bank
   |
   +-- Quiz
          |
          +-- Question 1
          +-- Question 2
          +-- Question 3

Quiz database:

assessments
--------------------------
id
organization_id
created_by

title
description

assessment_type

duration_minutes
attempt_limit
passing_score

randomize_questions
randomize_options

show_result_immediately

status

created_at
updated_at

Assessment types:

QUIZ
EXAM
PRACTICE
18. Quiz Creation Workflow
Create Quiz
    |
    v
Quiz Information
    |
    +-- Title
    +-- Description
    +-- Duration
    +-- Attempts
    +-- Passing Score
    |
    v
Add Questions
    |
    +-- Create New Question
    |
    +-- Select From Question Bank
    |
    v
Save Draft
    |
    v
Attach Quiz to Lesson
19. Question Bank Design
questions
-----------------------------------
id
organization_id
created_by

subject_id
topic_id

question_type
difficulty

question_content

explanation

status

created_at
updated_at

Question types:

MULTIPLE_CHOICE
MULTIPLE_SELECT
TRUE_FALSE
SHORT_ANSWER
NUMERIC
ESSAY
MATCHING
ORDERING

Options:

question_options
----------------
id
question_id

content

is_correct

sort_order

Quiz questions:

assessment_questions
--------------------
assessment_id
question_id
sort_order
points
20. Dynamic Quiz Generation

Teachers may define:

Generate Quiz

Subject:
Physics

Topics:
- Motion
- Newton's Laws

Questions:
20

Difficulty:
5 Easy
10 Medium
5 Hard

Configuration:

{
  "questionRules": [
    {
      "topicId": "motion",
      "difficulty": "EASY",
      "count": 5
    },
    {
      "topicId": "newton",
      "difficulty": "MEDIUM",
      "count": 10
    }
  ]
}

Questions can be generated when the student starts the quiz.

Important:

The generated question set must be saved to the attempt.

Never regenerate questions after an attempt has started.

21. Assignment Design

Assignments are different from quizzes.

Assignments may require:

File upload.
Text answer.
Multiple files.
Manual grading.
Automatic deadline validation.
Teacher feedback.

Example:

Assignment:
Solve Mechanics Problems

Instructions:
Solve questions 1 to 10.

Deadline:
20 August 2026

Submission:
PDF or Image

Maximum Score:
20

Database:

assignments
--------------------------------
id
organization_id
created_by

title
description

instructions

max_score

due_date

allow_late_submission

max_attempts

status

created_at
updated_at
22. Assignment Submission
Student
   |
   v
Open Assignment
   |
   v
Submit Text / Files
   |
   v
Submission Created
   |
   v
Status = SUBMITTED
   |
   v
Teacher Reviews
   |
   +-- Grade
   +-- Feedback
   |
   v
Status = GRADED

Database:

assignment_submissions
--------------------------------
id
assignment_id
student_id

submission_text

submitted_at

status

score

feedback

graded_by

graded_at

Submission files:

assignment_submission_files
---------------------------
submission_id
media_file_id

Statuses:

DRAFT
SUBMITTED
LATE
GRADED
RETURNED
23. Teacher Assignment Review Screen
+------------------------------------------------------+
| Assignment: Newton's Laws Homework                   |
+------------------------------------------------------+

Student: Ahmed Mohamed

Submitted:
2026-08-15 18:30

Files:

[ homework.pdf ]

Teacher Feedback:

[________________________________________________]

Score:

[ 18 / 20 ]

[ Save Draft ]     [ Publish Grade ]

API:

POST /api/v1/teacher/assignment-submissions/{submissionId}/grade

Request:

{
  "score": 18,
  "feedback": "Excellent work. Review question number 5."
}

Backend:

1. Validate teacher permission.
2. Validate assignment ownership.
3. Validate score <= max_score.
4. Store grade.
5. Change status to GRADED.
6. Publish ASSIGNMENT_GRADED event.
7. Notification worker notifies student.
8. Analytics updates student performance.
24. Lesson Builder UI

The Teacher Course Editor should behave like a structured builder.

Course: Physics Grade 12

Modules
----------------------------------

[Module 1: Introduction]

   Lesson 1: Introduction to Mechanics
      ✓ Video
      ✓ PDF

   Lesson 2: Newton's Laws
      ✓ Video
      ✓ Quiz
      ✓ Assignment

[Module 2: Motion]

   Lesson 3: Speed and Velocity

[ + Add Module ]

Lesson editor:

Lesson: Newton's Laws

Content Blocks

1. [ VIDEO ]
   Newton_Laws.mp4

2. [ TEXT ]
   Theory Explanation

3. [ DOCUMENT ]
   Newton_Laws_Summary.pdf

4. [ QUIZ ]
   Newton's Laws Quiz

5. [ ASSIGNMENT ]
   Homework #1

[ + Add Content ]

The UI should support:

Drag and Drop
Reordering
Draft Auto Save
Preview
Validation Errors
25. Teacher Course Management APIs
Courses
GET    /api/v1/teacher/courses
POST   /api/v1/teacher/courses

GET    /api/v1/teacher/courses/{courseId}
PATCH  /api/v1/teacher/courses/{courseId}
DELETE /api/v1/teacher/courses/{courseId}

POST   /api/v1/teacher/courses/{courseId}/submit
POST   /api/v1/teacher/courses/{courseId}/withdraw
Modules
POST   /api/v1/teacher/courses/{courseId}/modules
PATCH  /api/v1/teacher/modules/{moduleId}
DELETE /api/v1/teacher/modules/{moduleId}

POST /api/v1/teacher/courses/{courseId}/modules/reorder
Lessons
POST   /api/v1/teacher/modules/{moduleId}/lessons

GET    /api/v1/teacher/lessons/{lessonId}
PATCH  /api/v1/teacher/lessons/{lessonId}
DELETE /api/v1/teacher/lessons/{lessonId}

POST /api/v1/teacher/modules/{moduleId}/lessons/reorder
Lesson Blocks
POST   /api/v1/teacher/lessons/{lessonId}/blocks
PATCH  /api/v1/teacher/lesson-blocks/{blockId}
DELETE /api/v1/teacher/lesson-blocks/{blockId}

POST /api/v1/teacher/lessons/{lessonId}/blocks/reorder
26. Teacher API Ownership Guard

A reusable ownership guard should be implemented.

Concept:

@UseGuards(
  JwtAuthGuard,
  PermissionGuard,
  CourseOwnershipGuard
)

Example logic:

const course = await courseRepository.findOne({
  where: {
    id: courseId,
    organizationId: currentOrganizationId
  }
});

if (!course) {
  throw new NotFoundException();
}

if (
  course.teacherId !== currentUser.id &&
  !currentUser.hasPermission("course:update:any")
) {
  throw new ForbiddenException();
}

This logic should not be duplicated in every controller.

27. Course Aggregate Validation

Before submitting a course for review:

Course
 |
 +-- At least 1 Module
       |
       +-- At least 1 Lesson
             |
             +-- At least 1 Content Block

Validation example:

Can Submit Course?

[✓] Course title
[✓] Description
[✓] Grade
[✓] Subject
[✓] At least one module
[✓] At least one lesson
[✓] At least one learning resource

Result:
READY FOR REVIEW

Backend endpoint:

GET /api/v1/teacher/courses/{courseId}/validation

Response:

{
  "valid": false,
  "errors": [
    {
      "code": "COURSE_HAS_NO_MODULES",
      "message": "The course must contain at least one module."
    }
  ]
}
28. Published Course Update Strategy

This is an important design decision.

Directly modifying published content can create problems if students are currently studying it.

Recommended model:

Published Course
       |
       v
Teacher Creates Revision
       |
       v
Draft Changes
       |
       v
Validation / Review
       |
       v
Publish Revision

Simpler MVP approach:

Allow immediate updates for:

Description
Thumbnail
New lessons

Require review for:

Academic grade change
Subject change
Major course restructuring

For a more advanced version:

course_versions

Example:

Course
 |
 +-- Version 1 -> Published
 |
 +-- Version 2 -> Draft

Students continue using the active version until Version 2 is published.

29. Teacher Analytics

Teacher should be able to view:

Course Analytics
Total Enrolled Students
Active Students
Course Completion Rate
Average Quiz Score
Average Study Time
Lesson Analytics
Lesson Views
Completion Rate
Average Watch Time
Drop-Off Points
Question Analytics
Correct Answer Rate
Incorrect Answer Rate
Average Time
Question Difficulty
Topic Analytics
Topic: Newton's Laws

Students:
320

Average Score:
65%

Weak Students:
74

Recommendation:
Create revision lesson

API:

GET /api/v1/teacher/courses/{courseId}/analytics
30. Teacher Module Architecture in NestJS

Recommended module structure:

teacher/
|
+-- teacher.module.ts
|
+-- dashboard/
|   +-- dashboard.controller.ts
|   +-- dashboard.service.ts
|
+-- courses/
|   +-- courses.controller.ts
|   +-- courses.service.ts
|   +-- course.repository.ts
|   +-- dto/
|   +-- guards/
|
+-- modules/
|
+-- lessons/
|
+-- lesson-blocks/
|
+-- media/
|
+-- quizzes/
|
+-- questions/
|
+-- assignments/
|
+-- grading/
|
+-- analytics/

However, the underlying domain modules can remain shared.

For example:

Course Module
    |
    +-- Student API
    |
    +-- Teacher API
    |
    +-- Admin API

This prevents duplicated business logic.

A cleaner structure:

courses/
    |
    +-- domain/
    +-- application/
    +-- infrastructure/
    +-- presentation/
          |
          +-- teacher/
          +-- student/
          +-- admin/
31. Recommended Domain Events

Teacher actions should generate events.

COURSE_CREATED
COURSE_UPDATED
COURSE_SUBMITTED
COURSE_PUBLISHED

MODULE_CREATED
MODULE_UPDATED

LESSON_CREATED
LESSON_UPDATED
LESSON_COMPLETED

VIDEO_UPLOADED
VIDEO_READY

QUIZ_CREATED
QUIZ_UPDATED

ASSIGNMENT_CREATED
ASSIGNMENT_SUBMITTED
ASSIGNMENT_GRADED

Example:

ASSIGNMENT_GRADED
       |
       +--> Notification Worker
       |
       +--> Analytics Worker
       |
       +--> Student Progress Service
32. Transaction Boundaries

Use database transactions for operations such as:

Create Course
+
Create Initial Module
+
Create Initial Lesson

Also:

Delete Module
+
Delete Lessons
+
Delete Lesson Blocks

Example:

await dataSource.transaction(async (manager) => {
  await manager.save(module);

  await manager.update(
    Lesson,
    { moduleId },
    { deletedAt: new Date() }
  );

  await manager.update(
    LessonBlock,
    { moduleId },
    { deletedAt: new Date() }
  );
});

For large asynchronous operations, do not keep long database transactions open.

33. Recommended Implementation Sequence

I recommend implementing the Teacher module in the following order.

Sprint 1 — Teacher Foundation
Teacher Role
Teacher Permissions
Teacher Dashboard
Teacher Course List
Course Ownership Guard
Sprint 2 — Course CRUD
Create Course
Read Course
Update Course
Delete Draft Course
Archive Course
Course Validation
Sprint 3 — Course Structure
Modules
Lessons
Ordering
Drag and Drop API
Soft Delete
Sprint 4 — Lesson Content
Lesson Blocks
Text
Documents
Videos
Links
Sprint 5 — Media
Upload URLs
Object Storage
Media Processing
Video Status
Thumbnails
Streaming
Sprint 6 — Quiz Engine
Question Bank
Question CRUD
Quiz CRUD
Attach Quiz to Lesson
Question Randomization
Sprint 7 — Assignment Engine
Assignment Creation
Student Submission
File Upload
Teacher Review
Grading
Feedback
Sprint 8 — Publishing
Course Validation
Submit for Review
Approval Workflow
Publishing
Course Versioning
Sprint 9 — Analytics
Course Analytics
Lesson Analytics
Student Performance
Question Analysis
34. Final Recommended Teacher Architecture

The Teacher functionality should be implemented around this model:

                         TEACHER
                            |
                            v
                    Teacher Dashboard
                            |
        +-------------------+--------------------+
        |                   |                    |
        v                   v                    v
   Course Manager      Assessment Manager    Analytics
        |
        v
     Course
        |
        +----------------------+
        |                      |
        v                      v
     Modules                Course Settings
        |
        v
     Lessons
        |
        +----------------------------------------+
        |            |             |             |
        v            v             v             v
      Video        Document        Quiz       Assignment
        |            |             |             |
        +------------+-------------+-------------+
                             |
                             v
                      Lesson Blocks
                             |
                             v
                       Student Learning
Core Design Decision

I strongly recommend implementing the Course Editor as the central Teacher workspace.

The teacher should manage the entire educational journey from one structured interface:

Course
  -> Module
      -> Lesson
          -> Content Blocks
              -> Video
              -> Text
              -> PDF
              -> Quiz
              -> Assignment
              -> Live Session

This architecture gives you:

Flexible course creation
Reusable quizzes and assignments
Easy drag-and-drop ordering
Clear ownership rules
Controlled publishing
Strong database integrity
Future support for additional content types
Separation between content creation and student learning
A clean path toward analytics and AI-assisted teaching

The next logical implementation artifact is a complete Teacher Module database schema + ERD + NestJS API/DTO/entity/service design, which can be detailed down to table columns, TypeORM/Prisma models, endpoints, request/response objects, and folder structure.