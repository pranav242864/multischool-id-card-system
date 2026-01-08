# Phase 5 & 6 Readiness Inventory Report
**Generated:** Based on codebase analysis (no runtime data fetched)

---

## 1. AUTHENTICATION ENDPOINTS

### Login Endpoint
- **Path:** `POST /api/v1/auth/login` (also available at `/api/auth/login`)
- **Access:** Public (no authMiddleware required)
- **Request Body:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response Structure (Success):**
  ```json
  {
    "success": true,
    "token": "JWT_TOKEN_STRING",
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "username": "username",
      "role": "SUPERADMIN" | "SCHOOLADMIN" | "TEACHER",
      "schoolId": "school_id_or_null",
      "schoolName": "school_name_or_null",
      "status": "ACTIVE" | "DISABLED"
    }
  }
  ```
- **Response Structure (Error):**
  ```json
  {
    "success": false,
    "message": "Error message"
  }
  ```

### Token Storage
- **Frontend Storage Key:** `localStorage.getItem('authToken')`
- **User Data Storage Key:** `localStorage.getItem('user')` (JSON stringified)
- **Token Format:** JWT signed with `JWT_SECRET` (default: `'your-super-secret-jwt-key-change-this-in-production'`)
- **Token Expiry:** `JWT_EXPIRE` env var (default: `7d`)
- **Token Payload Structure:**
  ```json
  {
    "user": {
      "id": "user_id",
      "role": "SUPERADMIN" | "SCHOOLADMIN" | "TEACHER",
      "schoolId": "school_id_or_null"
    }
  }
  ```

### Other Auth Endpoints
- `POST /api/v1/auth/register-superadmin` - One-time superadmin registration (public)
- `POST /api/v1/auth/google` - Google OAuth login (public)
- `POST /api/v1/auth/forgot-password` - Password reset request (public)
- `POST /api/v1/auth/reset-password` - Password reset (public)
- `GET /api/v1/auth/me` - Get current user (protected)
- `GET /api/v1/auth/login-logs` - Get login logs (SUPERADMIN only)

---

## 2. DEMO USER CREDENTIALS

Based on `server/scripts/setupDemoAccounts.js`:

### SUPERADMIN
- **Email:** `super@admin.com`
- **Password:** `admin123` (bcrypt hashed)
- **Username:** `superadmin`
- **Name:** `Super Admin`
- **Role:** `SUPERADMIN`
- **Status:** `ACTIVE`
- **schoolId:** `null` (SUPERADMIN has no schoolId)

### SCHOOLADMIN
- **Email:** `admin@school.com`
- **Password:** `admin123` (bcrypt hashed)
- **Username:** `schooladmin`
- **Name:** `School Admin`
- **Role:** `SCHOOLADMIN`
- **Status:** `ACTIVE`
- **schoolId:** Points to "Demo School" (created by setup script)

### TEACHER
- **Email:** `teacher@school.com`
- **Password:** `teacher123` (bcrypt hashed)
- **Username:** `teacher`
- **Name:** `Demo Teacher`
- **Role:** `TEACHER`
- **Status:** `ACTIVE`
- **schoolId:** Points to "Demo School" (created by setup script)

### Demo School (Created by setup script)
- **Name:** `Demo School`
- **Address:** `123 Demo Street, Demo City`
- **contactEmail:** `admin@school.com`
- **Status:** `active`

**Note:** These credentials are only valid if `node server/scripts/setupDemoAccounts.js` has been run.

---

## 3. SYSTEM ENTITY MODELS

### Schools
**Model:** `server/models/School.js`
**Fields:**
- `_id` (ObjectId, primary key)
- `name` (String, required, max 100 chars)
- `address` (String, required)
- `contactEmail` (String, required, validated email)
- `status` (Enum: `'active'`, `'inactive'`, `'suspended'`, default: `'active'`)
- `createdAt`, `updatedAt` (timestamps)

**API Endpoints:**
- `POST /api/v1/schools` - Create school (SUPERADMIN only, requires `schoolId` query param)
- `GET /api/v1/schools` - Get all schools (SUPERADMIN, SCHOOLADMIN)
- `GET /api/v1/schools/:id` - Get school by ID (SUPERADMIN, SCHOOLADMIN)
- `DELETE /api/v1/schools/:id` - Soft delete school (SUPERADMIN only, requires `schoolId` query param)

### Sessions
**Model:** `server/models/Session.js`
**Fields:**
- `_id` (ObjectId, primary key)
- `sessionName` (String, required, max 50 chars)
- `startDate` (Date, required)
- `endDate` (Date, required)
- `schoolId` (ObjectId ref School, required)
- `activeStatus` (Boolean, default: false)
- `archived` (Boolean, default: false)
- `archivedAt` (Date, nullable)
- `status` (Enum: `'ACTIVE'`, `'DISABLED'`, default: `'ACTIVE'`)
- `createdAt`, `updatedAt` (timestamps)

**Unique Constraint:** Only one session per school can have `activeStatus: true`

**API Endpoints:**
- `POST /api/v1/sessions/sessions` - Create session (SUPERADMIN, SCHOOLADMIN)
- `GET /api/v1/sessions/sessions` - Get sessions (SUPERADMIN, SCHOOLADMIN, TEACHER)
- `GET /api/v1/sessions/sessions/:sessionId/students` - Get session students
- `PATCH /api/v1/sessions/sessions/:id/activate` - Activate session (SUPERADMIN, SCHOOLADMIN)
- `PATCH /api/v1/sessions/:id/activate` - Alternative activate route
- `PATCH /api/v1/sessions/sessions/:id/deactivate` - Deactivate session
- `PATCH /api/v1/sessions/sessions/:id/archive` - Archive session (SUPERADMIN only)
- `PATCH /api/v1/sessions/sessions/:id/unarchive` - Unarchive session (SUPERADMIN only)
- `POST /api/v1/sessions/sessions/promote` - Promote students to session (SUPERADMIN, SCHOOLADMIN)

### Classes
**Model:** `server/models/Class.js`
**Fields:**
- `_id` (ObjectId, primary key)
- `className` (String, required, max 50 chars)
- `schoolId` (ObjectId ref School, required)
- `sessionId` (ObjectId ref Session, required)
- `frozen` (Boolean, default: false)
- `status` (Enum: `'ACTIVE'`, `'DISABLED'`, default: `'ACTIVE'`)
- `createdAt`, `updatedAt` (timestamps)

**Unique Constraint:** `className` must be unique per (`schoolId` + `sessionId`)

**API Endpoints:**
- `POST /api/v1/classes` - Create class (SUPERADMIN, SCHOOLADMIN, requires active session)
- `GET /api/v1/classes` - Get classes (SUPERADMIN, SCHOOLADMIN, TEACHER, requires active session)
- `PATCH /api/v1/classes/:id/freeze` - Freeze class (SUPERADMIN, SCHOOLADMIN)
- `PATCH /api/v1/classes/:id/unfreeze` - Unfreeze class (SUPERADMIN, SCHOOLADMIN)

### Students
**Model:** `server/models/Student.js`
**Fields:**
- `_id` (ObjectId, primary key)
- `admissionNo` (String, required, unique per school+session)
- `name` (String, required, max 100 chars)
- `dob` (Date, required)
- `fatherName` (String, required, max 100 chars)
- `motherName` (String, required, max 100 chars)
- `mobile` (String, required, 10 digits)
- `address` (String, required)
- `aadhaar` (String, optional, 12 digits)
- `photoUrl` (String, optional, validated URL)
- `classId` (ObjectId ref Class, required)
- `sessionId` (ObjectId ref Session, required)
- `schoolId` (ObjectId ref School, required)
- `status` (Enum: `'ACTIVE'`, `'DISABLED'`, default: `'ACTIVE'`)
- `createdAt`, `updatedAt` (timestamps)

**Unique Constraint:** `admissionNo` must be unique per (`schoolId` + `sessionId`)

**API Endpoints:**
- `POST /api/v1/students/students` - Create student (SUPERADMIN, SCHOOLADMIN, TEACHER, requires active session)
- `GET /api/v1/students/students` - Get students (SUPERADMIN, SCHOOLADMIN, TEACHER, requires active session)
- `PATCH /api/v1/students/students/:id` - Update student (SUPERADMIN, SCHOOLADMIN, TEACHER, requires active session)
- `DELETE /api/v1/students/students/:id` - Delete student (SUPERADMIN, SCHOOLADMIN, requires active session)
- `POST /api/v1/students/bulk-delete` - Bulk delete students (SUPERADMIN, SCHOOLADMIN, requires active session)

### Teachers
**Model:** `server/models/Teacher.js`
**Fields:**
- `_id` (ObjectId, primary key)
- `name` (String, required, max 100 chars)
- `userId` (ObjectId ref User, required, unique)
- `mobile` (String, required, 10 digits)
- `photoUrl` (String, optional, validated URL)
- `classId` (ObjectId ref Class, optional)
- `schoolId` (ObjectId ref School, required)
- `status` (Enum: `'ACTIVE'`, `'DISABLED'`, default: `'ACTIVE'`)
- `createdAt`, `updatedAt` (timestamps)

**Unique Constraint:** One teacher per (`schoolId` + `classId`) - one teacher per class per school

**API Endpoints:**
- `POST /api/v1/teachers` - Create teacher (SUPERADMIN, SCHOOLADMIN)
- `GET /api/v1/teachers` - Get teachers (SUPERADMIN, SCHOOLADMIN, TEACHER)
- `PATCH /api/v1/teachers/:id` - Update teacher (SUPERADMIN, SCHOOLADMIN, TEACHER)
- `DELETE /api/v1/teachers/:id` - Delete teacher (SUPERADMIN only, soft delete)
- `POST /api/v1/teachers/bulk-delete` - Bulk delete teachers (SUPERADMIN only)

### Templates
**Model:** `server/models/Template.js`
**Fields:**
- `_id` (ObjectId, primary key)
- `schoolId` (ObjectId ref School, required)
- `sessionId` (ObjectId ref Session, required)
- `classId` (ObjectId ref Class, optional, default: null)
- `type` (Enum: `'STUDENT'`, `'TEACHER'`, `'SCHOOLADMIN'`, required)
- `name` (String, required)
- `version` (Number, required, default: 1)
- `layoutConfig` (Mixed/Object, required)
- `dataTags` ([String], optional)
- `isActive` (Boolean, default: true)
- `createdAt`, `updatedAt` (timestamps)

**Unique Constraints:**
- `(schoolId + sessionId + type + version)` must be unique
- Only one active template per (`schoolId + sessionId + classId + type`) where `isActive: true`

**API Endpoints:**
- `POST /api/v1/templates` - Create template
- `GET /api/v1/templates` - Get templates
- `GET /api/v1/templates/:id` - Get template by ID
- `GET /api/v1/templates/active/:type` - Get active template by type
- `PATCH /api/v1/templates/:id` - Update template
- `DELETE /api/v1/templates/:id` - Delete template
- `GET /api/v1/templates/download-excel/:type` - Download Excel template by type
- `GET /api/v1/templates/:id/download-excel` - Download Excel template by ID
- `POST /api/v1/templates/resolve/test` - Test template resolution (temporary endpoint)

---

## 4. RBAC BEHAVIOR

### SUPERADMIN
**Scoping:** 
- **CONSTRAINT:** `schoolScoping` middleware requires `req.query.schoolId` for ALL operations
- If `schoolId` query param is missing → Returns `400: "School ID is required for this operation"`
- `req.user.schoolId` is `null` for SUPERADMIN
- `req.schoolId` is set from `req.query.schoolId` (must be valid ObjectId)

**Access:**
- Can access ALL schools (but must specify `?schoolId` for operations)
- Can create/delete schools (requires `schoolId` query param, which is problematic)
- Can view all login logs
- Can archive/unarchive sessions
- Can delete teachers (only role with this permission)
- Can bulk delete teachers

**Endpoints Available:**
- All endpoints with role `'SUPERADMIN'` or `'SUPERADMIN', 'SCHOOLADMIN'` or `'SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'`

**Known Issue:** School operations (GET /schools, POST /schools) fail because `schoolScoping` requires `schoolId` query param, but:
- GET all schools shouldn't need `schoolId`
- POST create school doesn't have a `schoolId` yet

### SCHOOLADMIN
**Scoping:**
- `req.user.schoolId` is required (from JWT token)
- `req.schoolId` is set from `req.user.schoolId`
- Cannot access other schools' data

**Access:**
- Scoped to their own school only
- Can create/update/delete students in their school
- Can create/update (but not delete) teachers in their school
- Can create/update sessions for their school
- Can activate/deactivate sessions for their school
- Cannot archive/unarchive sessions
- Cannot delete teachers
- Cannot bulk delete teachers

**Endpoints Available:**
- All endpoints with role `'SCHOOLADMIN'` or `'SUPERADMIN', 'SCHOOLADMIN'` or `'SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'`

### TEACHER
**Scoping:**
- `req.user.schoolId` is required (from JWT token)
- `req.schoolId` is set from `req.user.schoolId`
- Class-scoped via `classId` association in Teacher model

**Access:**
- Scoped to their own school only
- Can view students (filtered by active session)
- Can create/update students in active session
- Cannot delete students
- Cannot bulk delete students
- Can view teachers
- Can update own teacher record
- Cannot delete teachers
- Cannot bulk delete teachers

**Endpoints Available:**
- Endpoints with role `'TEACHER'` or `'SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'`

---

## 5. BACKEND READINESS

### Implemented Endpoints

#### Authentication (`/api/v1/auth`)
- ✅ `POST /login` - Email/password login
- ✅ `POST /google` - Google OAuth login
- ✅ `POST /register-superadmin` - One-time superadmin registration
- ✅ `POST /forgot-password` - Password reset request
- ✅ `POST /reset-password` - Password reset
- ✅ `GET /me` - Get current user
- ✅ `GET /login-logs` - Get login logs (SUPERADMIN only)

#### Schools (`/api/v1`)
- ✅ `POST /schools` - Create school (SUPERADMIN, **CONSTRAINT:** requires `?schoolId` query param)
- ✅ `GET /schools` - Get all schools (SUPERADMIN, SCHOOLADMIN, **CONSTRAINT:** SUPERADMIN requires `?schoolId`)
- ✅ `GET /schools/:id` - Get school by ID (SUPERADMIN, SCHOOLADMIN)
- ✅ `DELETE /schools/:id` - Delete school (SUPERADMIN only, requires `?schoolId` query param)
- ❌ `PATCH /schools/:id` - **NOT IMPLEMENTED** (Update school)

#### Sessions (`/api/v1/sessions`)
- ✅ `POST /sessions/sessions` - Create session (SUPERADMIN, SCHOOLADMIN)
- ✅ `GET /sessions/sessions` - Get sessions (SUPERADMIN, SCHOOLADMIN, TEACHER)
- ✅ `GET /sessions/sessions/:sessionId/students` - Get session students
- ✅ `PATCH /sessions/sessions/:id/activate` - Activate session
- ✅ `PATCH /sessions/:id/activate` - Alternative activate route
- ✅ `PATCH /sessions/sessions/:id/deactivate` - Deactivate session
- ✅ `PATCH /sessions/sessions/:id/archive` - Archive session (SUPERADMIN only)
- ✅ `PATCH /sessions/sessions/:id/unarchive` - Unarchive session (SUPERADMIN only)
- ✅ `POST /sessions/sessions/promote` - Promote students
- ❌ `PATCH /sessions/sessions/:id` - **NOT IMPLEMENTED** (Update session)
- ❌ `DELETE /sessions/sessions/:id` - **NOT IMPLEMENTED** (Delete session)

#### Classes (`/api/v1/classes`)
- ✅ `POST /` - Create class (requires active session)
- ✅ `GET /` - Get classes (requires active session)
- ✅ `PATCH /:id/freeze` - Freeze class
- ✅ `PATCH /:id/unfreeze` - Unfreeze class
- ❌ `PATCH /:id` - **NOT IMPLEMENTED** (Update class)
- ❌ `DELETE /:id` - **NOT IMPLEMENTED** (Delete class)

#### Students (`/api/v1/students`)
- ✅ `POST /students` - Create student (requires active session)
- ✅ `GET /students` - Get students (requires active session)
- ✅ `PATCH /students/:id` - Update student (requires active session)
- ✅ `DELETE /students/:id` - Delete student (requires active session)
- ✅ `POST /bulk-delete` - Bulk delete students (requires active session)
- ✅ `POST /promote` (via session routes) - Promote students

#### Teachers (`/api/v1/teachers`)
- ✅ `POST /` - Create teacher
- ✅ `GET /` - Get teachers
- ✅ `PATCH /:id` - Update teacher
- ✅ `DELETE /:id` - Delete teacher (SUPERADMIN only, soft delete)
- ✅ `POST /bulk-delete` - Bulk delete teachers (SUPERADMIN only)

#### Templates (`/api/v1/templates`)
- ✅ `POST /` - Create template
- ✅ `GET /` - Get templates
- ✅ `GET /:id` - Get template by ID
- ✅ `GET /active/:type` - Get active template by type
- ✅ `PATCH /:id` - Update template
- ✅ `DELETE /:id` - Delete template
- ✅ `GET /download-excel/:type` - Download Excel template
- ✅ `GET /:id/download-excel` - Download Excel template by ID
- ✅ `POST /resolve/test` - Test template resolution (temporary)

#### Bulk Operations
- ✅ `POST /api/v1/bulk-import/:entityType` - Bulk import students/teachers (Excel)
- ✅ `POST /api/v1/bulk-upload/images/:entityType` - Bulk image upload (students/teachers)

#### PDF & Preview
- ✅ `GET /api/v1/preview/students/:id` - Preview student ID card
- ✅ `GET /api/v1/pdf/students/:studentId` - Generate student PDF
- ✅ `POST /api/v1/pdf/students/bulk` - Bulk generate student PDFs

#### Notices (`/api/v1/notices`)
- ✅ `POST /` - Create notice (with file attachments)
- ✅ `GET /` - Get notices
- ✅ `GET /:id` - Get notice by ID
- ✅ `PATCH /:id` - Update notice
- ✅ `PATCH /:id/archive` - Archive notice
- ❌ `DELETE /:id` - **NOT IMPLEMENTED** (Hard delete notice)

#### User Management (`/api/v1/users`)
- ✅ `POST /teacher` - Create teacher user (SUPERADMIN only)

### Missing Endpoints

#### School Management
- ❌ `PATCH /api/v1/schools/:id` - Update school

#### Session Management
- ❌ `PATCH /api/v1/sessions/sessions/:id` - Update session (only activate/deactivate/archive exist)
- ❌ `DELETE /api/v1/sessions/sessions/:id` - Delete session

#### Class Management
- ❌ `PATCH /api/v1/classes/:id` - Update class (only freeze/unfreeze exist)
- ❌ `DELETE /api/v1/classes/:id` - Delete class

#### Notice Management
- ❌ `DELETE /api/v1/notices/:id` - Hard delete notice (only archive exists)

### Backend Constraints & Blockers

#### 1. School Scoping Constraint (CRITICAL)
**Issue:** `schoolScoping` middleware requires `req.query.schoolId` for SUPERADMIN on ALL routes, including school management routes.

**Impact:**
- `GET /api/v1/schools` (all schools) fails for SUPERADMIN without `?schoolId`
- `POST /api/v1/schools` (create school) fails because no `schoolId` exists yet
- `DELETE /api/v1/schools/:id` requires `?schoolId` query param (redundant since it's in URL)

**Workaround:** None (requires backend fix)

#### 2. Active Session Requirement
**Issue:** Student and Class routes require `activeSessionMiddleware`, which checks for an active session.

**Impact:**
- Cannot create/read/update students if no active session exists
- Cannot create/read classes if no active session exists
- Error: `403: "No active session found for this school"`

**Requirement:** At least one session must be activated before student/class operations

#### 3. Teacher Creation Requires User First
**Issue:** Teacher creation requires an existing `userId`.

**Solution:** Use `POST /api/v1/users/teacher` to create teacher user first, then `POST /api/v1/teachers` with the returned `userId`.

#### 4. One Active Session Per School
**Constraint:** Database enforces only one active session per school (unique index on `{schoolId, activeStatus: true}`).

**Impact:** Must deactivate current session before activating another.

#### 5. Template Resolution Requires Specific Scope
**Constraint:** Template resolution follows priority:
1. `schoolId + sessionId + classId + type + isActive=true`
2. `schoolId + sessionId + classId=null + type + isActive=true`
3. `schoolId + sessionId=null + classId=null + type + isActive=true`

**Impact:** Must create templates with correct scope hierarchy.

#### 6. Admission Number Uniqueness
**Constraint:** `admissionNo` must be unique per (`schoolId` + `sessionId`).

**Impact:** Cannot reuse admission numbers within same school+session, but can reuse across sessions.

#### 7. Class Name Uniqueness
**Constraint:** `className` must be unique per (`schoolId` + `sessionId`).

**Impact:** Cannot have duplicate class names within same school+session.

#### 8. One Teacher Per Class
**Constraint:** Unique index on `{schoolId, classId}` in Teacher model.

**Impact:** Only one teacher can be assigned to a class per school.

---

## 6. MIDDLEWARE CHAIN

### Standard Protected Routes
1. `authMiddleware` - Validates JWT token, sets `req.user`
2. `schoolScoping` - Sets `req.schoolId` and `req.schoolFilter` based on role
3. `requireRole(...)` - Checks if user role is allowed
4. Route-specific middleware (e.g., `activeSessionMiddleware`)

### Special Middleware
- `activeSessionMiddleware` - Required for student/class routes, checks for active session
- `sessionProtection` - Prevents modifications to archived sessions
- `authMiddleware` - NOT applied to `/api/v1/auth/*` routes (login is public)

---

## 7. RUNTIME VERIFICATION CHECKLIST

### Prerequisites
- [ ] MongoDB connection configured (`MONGODB_URI` or `MONGO_URI`)
- [ ] JWT_SECRET environment variable set
- [ ] Demo accounts created: `node server/scripts/setupDemoAccounts.js`

### Entity Verification Order
1. **Login as SUPERADMIN**
   - Use: `super@admin.com` / `admin123`
   - Store token and user data

2. **Fetch Schools**
   - `GET /api/v1/schools?schoolId=<ANY_VALID_SCHOOL_ID>` (workaround for constraint)
   - Note: This will fail without `?schoolId` due to `schoolScoping` constraint

3. **Fetch Sessions**
   - `GET /api/v1/sessions/sessions?schoolId=<SCHOOL_ID>`
   - Identify active session (if any)

4. **Fetch Classes**
   - `GET /api/v1/classes?schoolId=<SCHOOL_ID>`
   - Requires active session

5. **Fetch Students**
   - `GET /api/v1/students/students?schoolId=<SCHOOL_ID>`
   - Requires active session

6. **Fetch Teachers**
   - `GET /api/v1/teachers?schoolId=<SCHOOL_ID>`

7. **Fetch Templates**
   - `GET /api/v1/templates?schoolId=<SCHOOL_ID>`

### Testing Different Roles
1. **SUPERADMIN Tests**
   - All endpoints require `?schoolId` query param
   - Can access any school by providing `?schoolId`

2. **SCHOOLADMIN Tests**
   - No `?schoolId` required (uses `req.user.schoolId`)
   - Cannot access other schools' data

3. **TEACHER Tests**
   - No `?schoolId` required (uses `req.user.schoolId`)
   - Limited to read/update operations on students
   - Cannot delete students or teachers

---

## 8. SUMMARY

### Ready for Phase 5/6
- ✅ Authentication flow complete
- ✅ CRUD operations for most entities
- ✅ Bulk operations (import, upload, delete)
- ✅ PDF generation and preview
- ✅ Template management
- ✅ Notice management
- ✅ RBAC enforcement

### Known Issues
- ❌ School management routes have `schoolScoping` constraint (SUPERADMIN must provide `?schoolId`)
- ❌ Missing update endpoints for School, Session, Class
- ❌ Missing delete endpoint for Notice (hard delete)
- ❌ Missing delete endpoint for Session

### Critical Constraints
1. SUPERADMIN must provide `?schoolId` for all operations (including school operations)
2. Active session required for student/class operations
3. Teacher creation requires user creation first
4. One active session per school enforced by database
5. Various uniqueness constraints enforced by database indexes

---

**Report Generated:** Based on static codebase analysis
**Next Steps:** Run `node server/scripts/setupDemoAccounts.js` to create demo users, then verify endpoints with actual runtime data.

