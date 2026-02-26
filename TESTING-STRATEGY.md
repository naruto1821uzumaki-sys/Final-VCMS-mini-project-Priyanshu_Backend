# PHASE 10: Testing & QA Strategy

## Overview
Comprehensive testing suite for Virtual Clinic Management System (VCMS) security, API, and performance.

**Overall Goal:** Achieve 80%+ test coverage for critical paths, verify all security controls, ensure no regressions.

---

## 1. Unit Tests for Security Services

### Location: `src/__tests__/services/`

#### 1.1 Encryption Service Tests
**File:** `encryptionService.test.ts`
- ✅ Encrypt/decrypt roundtrip
- ✅ Different messages produce different ciphertexts (IV randomization)
- ✅ Authentication tag verification (tamper detection)
- ✅ Key derivation determinism (same password → same key)
- ✅ HMAC constant-time comparison
- ✅ Object-level encryption
- ✅ Memory cleanup (wipeBuffer)
- ✅ Error handling (invalid input, bad auth tag)

#### 1.2 Password Hashing Service Tests
**File:** `passwordHashingService.test.ts`
- ✅ Hash verification passes for correct password
- ✅ Hash verification fails for wrong password
- ✅ Bcrypt salt rounds (12 rounds takes ~0.3s)
- ✅ Password strength validation (min 12 chars, complexity)
- ✅ Strength scoring (weak/medium/strong/excellent)
- ✅ Leaked password detection (HaveIBeenPwned mock)
- ✅ Password generation entropy
- ✅ Age tracking (90-day recommendation)

#### 1.3 Token Service Tests
**File:** `tokenService.test.ts`
- ✅ Access token generation and expiry (15 min)
- ✅ Refresh token generation and expiry (7 days)
- ✅ MFA token generation and expiry (5 min)
- ✅ Token verification (signature, exp, jti unique)
- ✅ Token rotation (old refresh revoked, new issued)
- ✅ Token blacklisting
- ✅ Revoke all user tokens
- ✅ Token expiring soon detection

#### 1.4 Validation Service Tests
**File:** `validationService.test.ts`
- ✅ Email validation (format, length, suspicious chars)
- ✅ Phone validation (E.164 format)
- ✅ URL validation (protocol, localhost, HTTPS)
- ✅ Password strength validation
- ✅ File upload validation (size, MIME, extension)
- ✅ SQL injection detection
- ✅ XSS payload detection
- ✅ Command injection detection
- ✅ Path traversal detection
- ✅ HTML encoding/decoding
- ✅ JSON validation

#### 1.5 Authentication Service Tests
**File:** `authenticationService.test.ts`
- ✅ TOTP setup (secret generation, QR code)
- ✅ TOTP verification (current + adjacent windows)
- ✅ Backup code generation and use (single-use)
- ✅ Brute-force protection (5 attempts → 30min lockout)
- ✅ Login attempt tracking
- ✅ Suspicious activity detection (IP change, device change)
- ✅ Session timeout validation
- ✅ Account lockout/unlock

#### 1.6 Rate Limiting Service Tests
**File:** `rateLimitingService.test.ts`
- ✅ Per-user rate limit (100 req/min)
- ✅ Per-IP rate limit (200 req/min)
- ✅ Per-endpoint rate limit (varies)
- ✅ Global rate limit (10k req/min)
- ✅ Combined limit checks (all must pass)
- ✅ Retry-After headers
- ✅ Exponential backoff calculation
- ✅ Token bucket simulation

### Test Framework
- **Vitest** for TypeScript unit tests
- **Sinon** for mocking (HaveIBeenPwned, crypto)
- **Chai** for assertions
- **Benchmark:** All services <50ms per operation

---

## 2. API Integration Tests

### Location: `server/__tests__/`

#### 2.1 Security Middleware Tests
**File:** `server/__tests__/middleware/csrf.test.js`
- ✅ CSRF token generation endpoint returns valid token
- ✅ CSRF token is single-use (validated then deleted)
- ✅ Expired CSRF tokens rejected (30 min window)
- ✅ POST/PUT/DELETE require valid CSRF for protected endpoints
- ✅ GET requests skip CSRF validation

#### 2.2 Payload Scanning Tests
**File:** `server/__tests__/middleware/payload-scanning.test.js`
- ✅ NoSQL injection patterns blocked (`$where:`, `$ne:`, etc.)
- ✅ XSS payloads blocked (`<script>`, `javascript:`, `on*=`)
- ✅ Command injection chars blocked (`|`, `&`, `;`, backtick)
- ✅ Path traversal blocked (`../`, `~`, `/etc`)
- ✅ Valid payloads pass through (no false positives)

#### 2.3 Rate Limiting Middleware Tests
**File:** `server/__tests__/middleware/rate-limit.test.js`
- ✅ Login endpoint limited to 5 attempts / 15 min
- ✅ Register endpoint limited to 3 attempts / 1 hour
- ✅ 429 returned when limit exceeded
- ✅ Retry-After header present
- ✅ Per-IP tracking separate from per-user

#### 2.4 Authentication Endpoint Tests
**File:** `server/__tests__/routes/auth.test.js`
- ✅ Login with valid credentials returns token
- ✅ Login with invalid credentials returns 401
- ✅ Login blocked after 5 failed attempts (30 min lockout)
- ✅ Suspicious login detected and logged
- ✅ Register validates email and password strength
- ✅ Register rejects weak passwords
- ✅ Refresh token endpoint returns new access token

#### 2.5 Security Audit Logging Tests
**File:** `server/__tests__/middleware/audit.test.js`
- ✅ Auth attempts logged to audit log
- ✅ Data modifications logged with user, IP, endpoint
- ✅ Unauthorized access attempts logged to suspicious activity
- ✅ Sensitive endpoints logged for compliance (data access)
- ✅ Audit logs retrievable (admin only)

### Test Framework
- **Jest** for Node.js API tests
- **Supertest** for HTTP assertions
- **MongoDB Memory Server** for database mocks
- **Redis Mock** for cache testing

---

## 3. End-to-End (E2E) Test Scenarios

### Location: `e2e/`

#### 3.1 Patient Registration Flow
- Patient registers with email/password
- Verify email validation
- Verify password strength enforcement
- Create user in database
- Return JWT tokens

#### 3.2 Doctor Login & Approval Flow  
- Doctor logs in
- System detects new device/IP
- Alert logged for review
- Doctor sees unreviewed list
- Admin approves/rejects doctor account

#### 3.3 Appointment Booking Flow
- Patient selects available slot
- Books appointment with verified doctor
- Real-time notification pushed
- Doctor receives notification
- Appointment status updates in real-time

#### 3.4 Video Consultation Flow
- Patient initiates video call
- WebRTC offer/answer exchanged
- Video stream established
- Recording: ON (if enabled)
- End call, generate transcript

#### 3.5 Prescription Issuance Flow
- Doctor prescribes medications
- Prescription encrypted before storage
- Patient notified
- Prescription retrievable with audit trail

### Test Framework
- **Playwright** or **Cypress** for E2E
- **Video Recording** for failures
- **Performance Tracking** (page load, API latency)

---

## 4. Security & Penetration Testing

### Location: `security-tests/`

#### 4.1 OWASP Top 10 Coverage
- ✅ A01: Broken Authentication — MFA, session timeout, rate limiting
- ✅ A02: Broken Access Control — RBAC, token validation per endpoint
- ✅ A03: Injection — Validated inputs, parameterized queries, payload scanning
- ✅ A04: Insecure Design — Threat model, security patterns
- ✅ A05: Security Misconfiguration — Secure headers, CORS policy
- ✅ A06: Vulnerable Components — Dependency scanning (npm audit)
- ✅ A07: Auth Failures — Bcrypt hashing, token rotation, MFA
- ✅ A08: Data Integrity — HMAC signing, encryption, audit trails
- ✅ A09: Logging Failures — Comprehensive audit logging
- ✅ A10: SSRF — URL validation, network policies

#### 4.2 Attack Scenarios
**File:** `security-tests/attack-scenarios.test.js`
- ✅ Brute-force password attack simulation (verify lockout)
- ✅ TOKEN tampering (reject invalid signature)
- ✅ Concurrent token refresh (rate limiting)
- ✅ Expired token reuse (rejection)
- ✅ Cross-site request forgery (CSRF token required)
- ✅ XSS payload injection (sanitization)
- ✅ SQL/NoSQL injection (parameterized queries)
- ✅ Privilege escalation attempt (RBAC enforcement)

#### 4.3 Compliance Testing
**File:** `security-tests/compliance.test.js`
- ✅ HIPAA: PHI encryption, audit logging, access control
- ✅ GDPR: Data deletion, retention policy, user consent
- ✅ Password policy: 12+ chars, complexity, rotation
- ✅ Session timeout: 15 min inactivity, automatic logout
- ✅ Data retention: logs rotated after 30 days

---

## 5. Performance & Load Testing

### Location: `perf/`

#### 5.1 Security Service Benchmarks
**File:** `perf/security-services.bench.ts`
- Encryption: <5ms per operation
- Password hashing: ~300ms per hash (12 rounds intentional)
- Token generation: <1ms
- TOTP verification: <1ms
- Validation: <10ms per check

#### 5.2 API Endpoint Performance
**File:** `perf/api-endpoints.bench.js`
- Login: <200ms (with Bcrypt)
- Register: <300ms
- Appointment retrieval: <100ms
- Data access: <50ms

#### 5.3 Load Testing
**Tool:** Artillery or k6
- 100 concurrent users registering
- 500 concurrent users submitting payloads (verify rate limiting)
- Memory usage under sustained load
- Database connection pool exhaustion

---

## 6. Test Execution & CI/CD Integration

### Local Execution
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Security tests
npm run test:security

# All tests with coverage
npm run test:all
```

### CI/CD Pipeline (GitHub Actions)
- Run on every PR
- Fail if coverage < 80%
- Fail if security vulnerabilities found
- Report test results to PR

---

## 7. Test Data & Fixtures

### Location: `__fixtures__/`
- Valid/invalid credentials
- Suspicious payloads (injection, XSS, etc.)
- Valid tokens and expired tokens
- User roles and permissions
- Test appointments and prescriptions

---

## 8. Success Criteria

| Metric | Target |
|--------|--------|
| Unit Test Coverage | 85%+ |
| Integration Test Coverage | 75%+ |
| E2E Coverage (Critical Paths) | 100% |
| Security Test Pass Rate | 100% |
| Performance (API @ p95) | <200ms |
| Memory under load | <500MB |
| No dependency vulnerabilities | 0 |

---

## 9. Timeline

- **Week 1:** Unit tests for security services (encryptionService, passwordHashingService, tokenService)
- **Week 2:** Integration tests for API endpoints and middleware
- **Week 3:** Security & penetration testing
- **Week 4:** E2E tests and performance benchmarks

---

## 10. Reporting

- **Test Report:** Auto-generated HTML report
- **Coverage Report:** Codecov integration
- **Security Report:** OWASP checklist + findings
- **Performance Report:** Latency/throughput charts

