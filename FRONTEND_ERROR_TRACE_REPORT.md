# FRONTEND ERROR TRACE REPORT

**Date:** Code Analysis  
**Objective:** Trace frontend API calls that produce "School ID is required for this operation" error

---

## Error-Producing API Call #1: GET /api/v1/schools

### 1. Error-producing API call:
- **API name:** `schoolAPI.getSchools()`
- **Endpoint:** `GET /api/v1/schools`
- **HTTP method:** GET
- **Called from file:** `src/components/superadmin/SuperadminDashboard.tsx`
- **Component:** `SuperadminDashboard`
- **Trigger condition:** On component mount (useEffect, line 23-49, dependency array `[]`)

**Code Flow:**
- Line 29: `const schoolsResponse = await schoolAPI.getSchools();`
- No parameters passed to function
- Function signature: `getSchools: async (schoolId?: string)` (api.ts line 677)
- Since `schoolId` parameter is `undefined`, line 683 evaluates: `schoolId ? { schoolId } : undefined` → `undefined`
- `apiRequest` called with `params = undefined` (line 680)
- `buildQueryString(undefined)` returns empty string (api.ts line 23-50)
- Final URL: `http://localhost:5001/api/v1/schools` (no query parameters)

### 2. Was schoolId provided?
- **NO** - No schoolId parameter passed to `getSchools()`, and no query string appended

### 3. Is this API school-scoped by design?
- **NO** - For SUPERADMIN, this endpoint is designed to return all schools across the system
- Backend controller `getAllSchools` (school.controller.js) checks `isSuperadmin(req.user)` and returns all schools without filtering by schoolId
- This is a dashboard-level read operation

### 4. Should this API be called on SUPERADMIN dashboard?
- **YES** - This is the correct API call for SUPERADMIN dashboard
- Component comment on line 28: "Fetch schools"
- Component displays "Recently Added Schools" section (lines 200-230)
- Dashboard is intended to show system-wide overview, including all schools

### 5. Root Cause:
Frontend correctly calls `schoolAPI.getSchools()` without schoolId for SUPERADMIN dashboard, but backend middleware `schoolScoping.js` incorrectly requires schoolId because pattern matching fails to recognize this as a dashboard-level GET route.

---

## Error-Producing API Call #2: GET /api/v1/notices

### 1. Error-producing API call:
- **API name:** `noticeAPI.getNotices()`
- **Endpoint:** `GET /api/v1/notices`
- **HTTP method:** GET
- **Called from file:** `src/components/superadmin/SuperadminDashboard.tsx`
- **Component:** `SuperadminDashboard`
- **Trigger condition:** On component mount (useEffect, line 23-49, dependency array `[]`)

**Code Flow:**
- Line 36: `const noticesResponse = await noticeAPI.getNotices();`
- No parameters passed to function
- Function signature: `getNotices: async (params?: { includeArchived?: boolean; schoolId?: string })` (api.ts line 947)
- Since `params` is `undefined`, line 954 passes `undefined` to `apiRequest`
- `buildQueryString(undefined)` returns empty string (api.ts line 23-50)
- Final URL: `http://localhost:5001/api/v1/notices` (no query parameters)

### 2. Was schoolId provided?
- **NO** - No params object passed to `getNotices()`, and no query string appended

### 3. Is this API school-scoped by design?
- **NO** - For SUPERADMIN, this endpoint is designed to return all notices across the system
- Backend controller `getNotices` (notice.controller.js line 125) uses `getSchoolIdForFilter(req)` which allows `null` schoolId for SUPERADMIN
- Controller code (line 132-135) only filters by schoolId if it's provided: `if (schoolId) { query.schoolId = schoolId; }`
- This is a dashboard-level read operation

### 4. Should this API be called on SUPERADMIN dashboard?
- **YES** - This is the correct API call for SUPERADMIN dashboard
- Component comment on line 35: "Fetch notices (for SUPERADMIN, no schoolId needed)"
- Component displays "Notices" section (lines 152-197)
- Dashboard is intended to show system-wide overview, including all notices

### 5. Root Cause:
Frontend correctly calls `noticeAPI.getNotices()` without schoolId for SUPERADMIN dashboard (with explicit comment indicating no schoolId needed), but backend middleware `schoolScoping.js` incorrectly requires schoolId because pattern matching fails to recognize this as a dashboard-level GET route.

---

## Summary

**Both API calls:**
- Are correctly implemented in the frontend
- Are intended to be called without schoolId for SUPERADMIN
- Are dashboard-level read operations (not school-scoped)
- Should be called on SUPERADMIN dashboard
- Fail due to backend middleware pattern matching issue, not frontend logic error

**Frontend behavior is correct.**
**Error originates in backend middleware.**
