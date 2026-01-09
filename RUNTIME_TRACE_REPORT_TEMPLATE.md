# Runtime Trace Report: schoolScoping Middleware

**Date:** [Fill after testing]  
**Tester:** [Fill]  
**Backend Server:** Running on port 5001  
**Frontend:** Loaded SUPERADMIN dashboard

---

## Request 1: GET /api/v1/schools

### Runtime Values:
- **ROLE:** [Fill from console]
- **METHOD:** [Fill from console]
- **req.originalUrl:** [Fill from console]
- **req.baseUrl:** [Fill from console]
- **req.path:** [Fill from console]
- **req.url:** [Fill from console]
- **req.query:** [Fill from console]

### Pattern Matching:
- **Regex evaluated against:** [Fill from console - "Checking dashboardReadRoutes against:"]
- **Pattern 1 (/^\/api\/v1\/schools\/?(\?|$)/):** [MATCH / NO MATCH]
- **Pattern 2 (/^\/api\/v1\/notices\/?(\?|$)/):** [MATCH / NO MATCH]
- **Pattern 3 (/^\/api\/v1\/auth\/login-logs\/?(\?|$)/):** [MATCH / NO MATCH]

### Result:
- **isDashboardReadRoute value:** [Fill from console]
- **Fallthrough occurred?** [YES / NO]
- **Error returned?** [YES / NO]

### Root Cause:
[1-2 lines explaining why isDashboardReadRoute === false, factual, no solution]

---

## Request 2: GET /api/v1/notices

### Runtime Values:
- **ROLE:** [Fill from console]
- **METHOD:** [Fill from console]
- **req.originalUrl:** [Fill from console]
- **req.baseUrl:** [Fill from console]
- **req.path:** [Fill from console]
- **req.url:** [Fill from console]
- **req.query:** [Fill from console]

### Pattern Matching:
- **Regex evaluated against:** [Fill from console - "Checking dashboardReadRoutes against:"]
- **Pattern 1 (/^\/api\/v1\/schools\/?(\?|$)/):** [MATCH / NO MATCH]
- **Pattern 2 (/^\/api\/v1\/notices\/?(\?|$)/):** [MATCH / NO MATCH]
- **Pattern 3 (/^\/api\/v1\/auth\/login-logs\/?(\?|$)/):** [MATCH / NO MATCH]

### Result:
- **isDashboardReadRoute value:** [Fill from console]
- **Fallthrough occurred?** [YES / NO]
- **Error returned?** [YES / NO]

### Root Cause:
[1-2 lines explaining why isDashboardReadRoute === false, factual, no solution]

---

## Console Output (Full)

```
[Paste full console output here]
```

---

## Summary

### Which request(s) fall through?
- GET /api/v1/schools: [YES / NO]
- GET /api/v1/notices: [YES / NO]

### Exact Reason for Failure:
[Concise explanation based on runtime values observed]

### Key Finding:
[Most important discovery from the trace]

---

## Next Steps

1. Review runtime values
2. Compare actual URL format vs expected regex patterns
3. Identify why pattern matching fails
4. Document findings for fix implementation
