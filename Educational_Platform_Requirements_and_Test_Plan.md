# Educational Platform – Functional Requirements and Test Plan

## Purpose
This document defines functional requirements, acceptance criteria, and test scenarios for an educational platform with three user roles: **Admin, Teacher, and Student**. It is structured as an implementation specification for an LLM coding agent.

## General Implementation Rules
- Authentication is required for protected resources.
- Role-based authorization MUST be enforced.
- Teachers can manage only their own courses and related content unless explicitly authorized otherwise.
- Students can access only courses/content available to them.
- Invalid input MUST return clear validation errors.
- APIs MUST return appropriate HTTP status codes.
- Destructive actions SHOULD require UI confirmation.

Course hierarchy:

```text
Course
└── Module
    └── Lesson
        ├── Video
        ├── Document
        ├── Quiz
        └── Assignment
```

# 1. Authentication

## FR-AUTH-001 — User Login
**Requirement:** Admins, Teachers, and Students SHALL log in using valid credentials.

**Acceptance Criteria:**
- Valid credentials authenticate the user.
- Invalid credentials are rejected.
- Users are redirected to the correct role dashboard.
- Authentication identifies both user and role.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-AUTH-001 | Admin login | Submit valid Admin credentials | Admin dashboard opens |
| TC-AUTH-002 | Teacher login | Submit valid Teacher credentials | Teacher dashboard opens |
| TC-AUTH-003 | Student login | Submit valid Student credentials | Student dashboard opens |
| TC-AUTH-004 | Invalid password | Submit wrong password | Login rejected with clear error |
| TC-AUTH-005 | Missing fields | Submit empty required fields | Validation errors shown |
| TC-AUTH-006 | Role isolation | Access another role's protected endpoint | 403/unauthorized response |

# 2. Admin Requirements

## FR-ADMIN-001 — Manage Teacher Accounts
**Requirement:** Admin SHALL create, view, update, activate, and deactivate Teacher accounts.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-ADMIN-001 | Create Teacher | Submit valid Teacher data | Account created |
| TC-ADMIN-002 | Update Teacher | Edit Teacher information | Changes saved |
| TC-ADMIN-003 | Deactivate Teacher | Deactivate active Teacher | Teacher loses access |
| TC-ADMIN-004 | Reactivate Teacher | Activate deactivated Teacher | Teacher can access platform |
| TC-ADMIN-005 | Unauthorized management | Teacher/Student manages Teacher accounts | Request rejected |

## FR-ADMIN-002 — Manage Student Accounts
**Requirement:** Admin SHALL view, activate, deactivate, and manage Student accounts.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-ADMIN-010 | View Students | Open student list | Student list displayed |
| TC-ADMIN-011 | Deactivate Student | Deactivate Student | Student loses protected access |
| TC-ADMIN-012 | Activate Student | Activate Student | Student can access platform |
| TC-ADMIN-013 | Unauthorized access | Teacher manages Student status | Request rejected |

## FR-ADMIN-003 — Manage Academic Structure
**Requirement:** Admin SHALL manage academic years, grades, subjects, and optional topics.

Example:

```text
Academic Year
└── Secondary School
    ├── Grade 10
    ├── Grade 11
    └── Grade 12
        ├── Physics
        ├── Chemistry
        └── Mathematics
```

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-ADMIN-020 | Create Grade | Create valid grade | Grade available for courses |
| TC-ADMIN-021 | Create Subject | Associate subject with grade | Subject available for that grade |
| TC-ADMIN-022 | Invalid relationship | Associate invalid subject/grade | Validation error |
| TC-ADMIN-023 | Update academic year | Edit academic year | Changes saved |
| TC-ADMIN-024 | Unauthorized modification | Teacher creates grade | Request rejected |

## FR-ADMIN-004 — Review and Publish Courses
**Requirement:** Admin SHALL review, approve, reject, publish, and archive courses.

```text
DRAFT
  ↓
SUBMITTED_FOR_REVIEW
  ├── APPROVED → PUBLISHED
  └── REJECTED
```

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-ADMIN-030 | Approve Course | Approve submitted course | Status updated |
| TC-ADMIN-031 | Reject Course | Reject with reason | Status REJECTED; reason visible to Teacher |
| TC-ADMIN-032 | Publish Course | Publish approved course | Eligible Students can discover it |
| TC-ADMIN-033 | Archive Course | Archive published course | Archive policy applied |
| TC-ADMIN-034 | Invalid publishing | Publish incomplete course | Publishing blocked |

## FR-ADMIN-005 — Dashboard and Reports
**Requirement:** Admin SHALL view total Students, Teachers, Courses, Active Courses, and Active Users.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-ADMIN-040 | View dashboard | Open Admin dashboard | Statistics displayed |
| TC-ADMIN-041 | Data accuracy | Create known test data | Counts match stored data |
| TC-ADMIN-042 | Unauthorized dashboard | Student accesses Admin dashboard | Access denied |

# 3. Teacher Requirements

## FR-TEACHER-001 — Teacher Dashboard
**Requirement:** Teacher SHALL see own courses, enrolled student counts, pending assignments, and basic statistics.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-TEACHER-001 | View dashboard | Login as Teacher | Dashboard displayed |
| TC-TEACHER-002 | Course isolation | Create courses for two Teachers | Each sees only own courses |
| TC-TEACHER-003 | Pending grading | Create ungraded submissions | Correct pending count displayed |

## FR-TEACHER-002 — Create Course
**Requirement:** Teacher SHALL create courses with title, academic year, grade, subject, and description. Initial status is `DRAFT`.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-TEACHER-010 | Valid creation | Submit required fields | Course created as DRAFT |
| TC-TEACHER-011 | Missing title | Submit without title | Validation error |
| TC-TEACHER-012 | Invalid subject | Select incompatible grade/subject | Validation error |
| TC-TEACHER-013 | Ownership | Teacher B accesses Teacher A course | Access denied |
| TC-TEACHER-014 | Draft persistence | Save and reload | Draft remains available |

## FR-TEACHER-003 — Update Course
**Requirement:** Teacher SHALL update courses they own, including title, description, thumbnail, and content.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-TEACHER-020 | Update own course | Change title | Changes saved |
| TC-TEACHER-021 | Update other course | Teacher B edits Teacher A course | Access denied |
| TC-TEACHER-022 | Invalid update | Submit invalid data | Validation error |

## FR-TEACHER-004 — Delete or Archive Course
**Requirement:** Teacher SHALL delete drafts and archive eligible published courses.

Rules:
- DRAFT → deletable.
- SUBMITTED_FOR_REVIEW → withdrawable.
- PUBLISHED → archive instead of permanent deletion.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-TEACHER-030 | Delete draft | Delete own draft | Course removed/soft-deleted |
| TC-TEACHER-031 | Delete published | Attempt permanent deletion | Blocked or archive required |
| TC-TEACHER-032 | Archive | Archive course | Status ARCHIVED |
| TC-TEACHER-033 | Delete foreign course | Delete another Teacher's course | Access denied |

## FR-TEACHER-005 — Manage Modules
**Requirement:** Teacher SHALL create, update, delete, and reorder modules in owned courses.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-TEACHER-040 | Create module | Add module | Module appears |
| TC-TEACHER-041 | Update module | Change title | Changes saved |
| TC-TEACHER-042 | Reorder modules | Change order | New order persists |
| TC-TEACHER-043 | Delete module | Delete module | Cascade/soft-delete policy applied |
| TC-TEACHER-044 | Ownership | Modify foreign module | Access denied |

## FR-TEACHER-006 — Manage Lessons
**Requirement:** Teacher SHALL create, update, delete, and reorder lessons.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-TEACHER-050 | Create lesson | Add lesson to module | Lesson created |
| TC-TEACHER-051 | Update lesson | Edit title/description | Changes saved |
| TC-TEACHER-052 | Reorder lessons | Change order | Order persists |
| TC-TEACHER-053 | Delete lesson | Delete lesson | Deletion policy applied |

## FR-TEACHER-007 — Add Learning Materials
**Requirement:** Teacher SHALL add Video, PDF/Document, Text, and External Link content to lessons.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-TEACHER-060 | Add video | Upload/select valid video | Video attached |
| TC-TEACHER-061 | Add PDF | Upload valid PDF | Document attached |
| TC-TEACHER-062 | Add text | Create text block | Text displayed |
| TC-TEACHER-063 | Invalid file | Upload unsupported type | Upload rejected |
| TC-TEACHER-064 | Remove material | Delete attached material | Material no longer visible |

## FR-TEACHER-008 — Create Quizzes
**Requirement:** Teacher SHALL create quizzes with questions, duration, passing score, attempts, and lesson attachment.

Supported MVP question types:
- Multiple Choice
- True/False
- Multiple Select
- Short Answer
- Essay

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-TEACHER-070 | Create quiz | Add valid quiz/questions | Quiz created |
| TC-TEACHER-071 | Create MCQ | Add options and correct answer | Question valid |
| TC-TEACHER-072 | Invalid MCQ | No correct answer | Validation blocks save/publish |
| TC-TEACHER-073 | Attempt limit | Set 2 attempts | Student limited to 2 |
| TC-TEACHER-074 | Attach quiz | Attach to lesson | Quiz appears |
| TC-TEACHER-075 | Edit quiz | Update question | Changes saved |

## FR-TEACHER-009 — Create Assignments
**Requirement:** Teacher SHALL create assignments with title, instructions, deadline, maximum score, and submission configuration.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-TEACHER-080 | Create assignment | Submit valid data | Assignment created |
| TC-TEACHER-081 | Invalid score | Use negative/invalid score | Validation error |
| TC-TEACHER-082 | Set deadline | Set future date | Deadline stored |
| TC-TEACHER-083 | Attach assignment | Attach to lesson | Assignment visible |
| TC-TEACHER-084 | Update assignment | Edit instructions | Changes visible |

## FR-TEACHER-010 — Grade Assignments
**Requirement:** Teacher SHALL review submissions, assign a score, and provide feedback.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-TEACHER-090 | Grade submission | Enter valid score | Status GRADED |
| TC-TEACHER-091 | Invalid score | Score above maximum | Validation error |
| TC-TEACHER-092 | Feedback | Grade with feedback | Student can view feedback |
| TC-TEACHER-093 | Unauthorized grading | Grade unrelated course submission | Access denied |

## FR-TEACHER-011 — View Student Performance
**Requirement:** Teacher SHALL view enrolled Students, progress, quiz scores, and assignment results for owned courses.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-TEACHER-100 | View students | Open owned course analytics | Enrolled Students shown |
| TC-TEACHER-101 | Quiz performance | Open quiz results | Correct results displayed |
| TC-TEACHER-102 | Analytics isolation | Open another Teacher's analytics | Access denied |

## FR-TEACHER-012 — Submit Course for Review
**Requirement:** Teacher SHALL submit a complete course for Admin review.

Minimum validation:
- Complete metadata.
- At least one module.
- At least one lesson.
- At least one learning resource.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-TEACHER-110 | Complete submission | Submit valid course | Status SUBMITTED_FOR_REVIEW |
| TC-TEACHER-111 | No modules | Submit empty course | Blocked |
| TC-TEACHER-112 | No resources | Submit lesson without content | Blocked |
| TC-TEACHER-113 | Resubmit | Fix rejected course | Returns to review workflow |

# 4. Student Requirements

## FR-STUDENT-001 — Registration and Profile
**Requirement:** Student SHALL register, log in, and update basic profile information including name and grade.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-STUDENT-001 | Register | Submit valid data | Account created |
| TC-STUDENT-002 | Duplicate account | Use existing unique identifier | Rejected |
| TC-STUDENT-003 | Update profile | Edit profile | Changes saved |
| TC-STUDENT-004 | Invalid grade | Submit invalid grade | Validation error |

## FR-STUDENT-002 — Browse and Search Courses
**Requirement:** Student SHALL browse published courses and filter by grade and subject.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-STUDENT-010 | Browse | Open catalog | Available courses displayed |
| TC-STUDENT-011 | Grade filter | Select Grade 12 | Matching courses shown |
| TC-STUDENT-012 | Subject filter | Select Physics | Physics courses shown |
| TC-STUDENT-013 | Search | Search title keyword | Matching results returned |
| TC-STUDENT-014 | Unpublished course | Search for draft | Not visible |

## FR-STUDENT-003 — Course Enrollment
**Requirement:** Student SHALL enroll in available courses. MVP enrollment may be free but policy must support future configuration.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-STUDENT-020 | Enroll | Select available course | Enrollment created |
| TC-STUDENT-021 | Duplicate enrollment | Enroll twice | No duplicate created |
| TC-STUDENT-022 | Access enrolled course | Open course | Content accessible |
| TC-STUDENT-023 | Restricted course | Open unavailable course | Access denied |

## FR-STUDENT-004 — Access Learning Content
**Requirement:** Enrolled Student SHALL access authorized videos, documents, text, and links.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-STUDENT-030 | Watch video | Open video | Playback available |
| TC-STUDENT-031 | Open document | Select PDF | Document available per policy |
| TC-STUDENT-032 | Non-enrolled access | Request protected lesson | Access denied |
| TC-STUDENT-033 | Course isolation | Access unrelated protected lesson | Access policy enforced |

## FR-STUDENT-005 — Complete Quizzes
**Requirement:** Student SHALL start, answer, and submit quizzes. Attempt limits, time limits, and passing scores MUST be enforced when configured.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-STUDENT-040 | Start quiz | Open available quiz | Attempt created |
| TC-STUDENT-041 | Submit quiz | Answer and submit | Result calculated/stored |
| TC-STUDENT-042 | Attempt limit | Exhaust allowed attempts | Additional attempt blocked |
| TC-STUDENT-043 | Timeout | Allow timer to expire | Timeout policy applied |
| TC-STUDENT-044 | Score accuracy | Submit known answers | Correct score calculated |
| TC-STUDENT-045 | Attempt ownership | Submit another Student's attempt | Request rejected |

## FR-STUDENT-006 — Submit Assignments
**Requirement:** Student SHALL submit text, image, or document files according to assignment configuration and deadline policy.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-STUDENT-050 | On-time submission | Submit before deadline | Status SUBMITTED |
| TC-STUDENT-051 | Allowed late submission | Submit after deadline | Status LATE |
| TC-STUDENT-052 | Blocked late submission | Submit after blocked deadline | Rejected |
| TC-STUDENT-053 | Unsupported file | Upload invalid type | Validation error |
| TC-STUDENT-054 | View grade | Teacher grades submission | Score/feedback visible |

## FR-STUDENT-007 — Track Progress
**Requirement:** Student SHALL view completed lessons, course completion percentage, quiz scores, and assignment grades.

### Test Plan
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TC-STUDENT-060 | Lesson completion | Complete lesson activity | Progress updated |
| TC-STUDENT-061 | Course percentage | Complete known lesson count | Percentage correct |
| TC-STUDENT-062 | Quiz history | Complete quiz | Result appears |
| TC-STUDENT-063 | Grade history | Assignment graded | Grade appears |

# 5. Role and Permission Matrix

| Functionality | Admin | Teacher | Student |
|---|:---:|:---:|:---:|
| Manage users | Yes | No | No |
| Manage academic structure | Yes | No | No |
| Review/publish courses | Yes | No | No |
| Create/edit own course | Optional | Yes | No |
| Manage modules/lessons | Optional | Own only | No |
| Upload materials | Optional | Own only | No |
| Create quizzes | Optional | Own only | No |
| Create assignments | Optional | Own only | No |
| Grade assignments | Optional | Own courses | No |
| Browse published courses | Optional | Preview own | Yes |
| Enroll | No | No | Yes |
| Learn content | Optional | Preview own | Enrolled only |
| Take quizzes | Preview | Preview | Yes |
| Submit assignments | No | No | Yes |
| View own progress | No | No | Yes |

# 6. End-to-End Scenarios

## E2E-001 — Platform Setup
1. Admin logs in.
2. Admin creates academic year.
3. Admin creates grade.
4. Admin creates subject.
5. Admin creates Teacher.
6. Teacher logs in.

**Expected:** Teacher and academic configuration are ready.

## E2E-002 — Course Creation to Publication
1. Teacher logs in.
2. Creates course.
3. Adds module.
4. Adds lesson.
5. Adds video.
6. Adds quiz.
7. Adds assignment.
8. Submits course.
9. Admin approves/publishes.

**Expected:** Published course becomes available to eligible Students.

## E2E-003 — Student Learning Flow
1. Student logs in.
2. Browses courses.
3. Enrolls.
4. Opens lesson.
5. Watches video.
6. Completes quiz.
7. Submits assignment.
8. Teacher grades.
9. Student views feedback.
10. Student views progress.

**Expected:** Learning data, results, grades, and progress are stored correctly.

# 7. Non-Functional Requirements

## NFR-001 — Security
The system MUST:
- Authenticate protected requests.
- Enforce roles and permissions.
- Validate ownership.
- Prevent cross-user data access.
- Validate uploaded file types and sizes.

**Tests:** unauthenticated access, cross-user access, cross-teacher modifications, malformed input, unsupported files.  
**Expected:** unsafe or unauthorized requests are rejected.

## NFR-002 — Data Integrity
The system MUST preserve valid relationships:

```text
Course → Module → Lesson → Content
Quiz → Questions → Options
Assignment → Submission → Grade
Student → Enrollment → Progress
```

**Tests:** invalid foreign relationships, duplicate enrollment, invalid grade score.  
**Expected:** database and application validation reject invalid states.

## NFR-003 — Auditability
The system SHOULD audit:
- Course creation/update/submission/publication.
- Course status changes.
- Assignment grading.
- User activation/deactivation.

Minimum audit fields:

```text
actor_id
action
resource_type
resource_id
timestamp
```

# 8. Suggested Delivery Order

## Phase 1 — Foundation
- Authentication
- Roles and permissions
- Admin user management
- Academic structure

## Phase 2 — Teacher Course Management
- Course CRUD
- Modules
- Lessons
- Ordering

## Phase 3 — Learning Content
- Videos
- Documents
- Text
- Links

## Phase 4 — Assessments
- Quiz creation
- Questions
- Quiz attempts
- Assignments
- Submissions
- Grading

## Phase 5 — Student Experience
- Course discovery
- Enrollment
- Learning experience
- Progress

## Phase 6 — Publishing and Reporting
- Review workflow
- Publishing
- Admin reports
- Teacher analytics

# 9. Instructions for an LLM Implementation Agent

The implementation agent MUST:

1. Treat every `FR-*` identifier as a mandatory functional requirement.
2. Treat every `TC-*` identifier as an acceptance test.
3. Implement backend, database, API, authorization, and UI behavior required for each requirement.
4. Enforce role boundaries and ownership checks on the backend, not only in the frontend.
5. Validate all API input.
6. Use database constraints and transactions where required.
7. Implement requirements incrementally following the delivery phases.
8. Do not mark a requirement complete until its associated tests pass.
9. Do not silently skip ambiguous functionality; choose the simplest configurable implementation consistent with this document.

## Definition of Done

A requirement is complete only when:

- Functional behavior is implemented.
- Authorization and ownership are enforced.
- Input validation exists.
- Required UI and API flows exist.
- Associated test scenarios pass.
- Failure cases return clear and safe errors.

# 10. Future Extensions

Out of MVP scope but supported by future architecture:

- Payments and subscriptions
- Live classes
- Notifications
- Parent accounts
- Certificates
- Messaging
- AI tutoring
- Advanced analytics
- Course versioning
- Mobile applications
- Offline learning
