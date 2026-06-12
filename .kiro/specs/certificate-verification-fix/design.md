# Certificate Verification Fix Design

## Overview

This design document describes the fix for certificate verification failures that occur when users scan QR codes. The root cause is case-sensitive database lookups for student_id values, which fail when there are case variations between the stored student_id and the lookup parameter. The fix implements case-insensitive lookups using Django's `__iexact` lookup operator and normalizes student_id inputs with `.strip()` to handle whitespace variations.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a student_id is queried using case-sensitive exact match (`student_id=`) and the case differs from the stored value
- **Property (P)**: The desired behavior - certificate lookups should succeed regardless of case variations in student_id
- **Preservation**: Existing behavior for genuinely non-existent certificates (returning 404) and valid certificate retrievals that must remain unchanged
- **_latest_certificate()**: The helper function in `backend/certificates/views.py` that retrieves the most recent certificate for a student_id
- **verify_certificate()**: The API endpoint at `/api/certificates/verify/{student_id}/` that validates and returns certificate details
- **view_certificate()**: The API endpoint at `/api/certificates/view/{student_id}/` that displays certificate history and details
- **download_certificate()**: The API endpoint at `/api/certificates/download/{student_id}/` that serves the certificate file
- **student login flow**: The authentication process in `backend/accounts/views.py` that validates student credentials
- **session validation**: The session_view() function that checks student authentication status

## Bug Details

### Bug Condition

The bug manifests when a certificate verification request is made with a student_id that exists in the database but has case variations from the stored value. The database lookup uses case-sensitive matching (`student_id=`), causing the query to return no results even though the certificate exists.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type StudentIDQuery
  OUTPUT: boolean
  
  RETURN input.student_id IS_VALID_FORMAT
         AND EXISTS(student WHERE student.student_id.upper() == input.student_id.upper())
         AND NOT EXISTS(student WHERE student.student_id == input.student_id)
         AND NOT certificateLookup_case_sensitive(input.student_id) returns result
END FUNCTION
```

### Examples


- **Example 1**: Student ID stored as "TSC001", QR code verification uses "tsc001" → Certificate lookup fails with 404 (actual: bug) → Should succeed with 200 (expected)
- **Example 2**: Student ID stored as "U25PG507CAP002", QR code verification uses "u25pg507cap002" → Certificate lookup fails with 404 (actual: bug) → Should succeed with 200 (expected)
- **Example 3**: Student ID stored as "TSC001", QR code verification uses "TSC001" → Certificate lookup succeeds with 200 (actual: correct) → Should continue to succeed (expected)
- **Edge case**: Student ID "TSC999" has no certificate, verification uses "tsc999" → Should return 404 "Certificate not found" (expected)
- **Edge case**: Student ID has leading/trailing whitespace " TSC001 " in URL parameter → Should normalize and find certificate (expected)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Verification requests for non-existent student IDs must continue to return HTTP 404 with "Certificate not found" message
- Verification requests for student IDs that genuinely have no generated certificates must continue to return appropriate error responses
- QR code generation with verification URLs must continue to embed the correct student_id
- Certificate file availability checking must continue to return "file not available" indicator when files are missing
- Access control checks (admin vs student permissions) must continue to enforce proper authorization
- Certificate history retrieval for valid requests must continue to work correctly

**Scope:**
All inputs that do NOT involve case variations or whitespace normalization issues should be completely unaffected by this fix. This includes:
- Verification requests with exact case match to stored student_id
- Requests for non-existent student IDs (should continue to fail appropriately)
- Admin certificate uploads and generation operations
- QR code generation and storage operations

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause has been identified:

1. **Case-Sensitive Database Lookups**: Django ORM queries using `student_id=` perform exact case-sensitive matching
   - `Certificate.objects.filter(student__student_id=student_id)` fails when case differs
   - `Student.objects.get(student_id=student_id)` fails when case differs

2. **URL Parameter Handling**: Student IDs passed through URL parameters may have case variations
   - QR codes may be printed with different cases
   - Manual URL entry may use different cases
   - URL encoding/decoding may preserve case but not normalize it

3. **No Input Normalization**: The verification flow does not normalize student_id inputs
   - No `.strip()` to remove whitespace
   - No case normalization before database queries
   - Direct passthrough from URL parameter to database query

4. **Multiple Affected Endpoints**: The issue propagates to all endpoints that lookup by student_id
   - `/api/certificates/verify/{student_id}/` - verification endpoint
   - `/api/certificates/view/{student_id}/` - certificate viewing
   - `/api/certificates/download/{student_id}/` - certificate downloads
   - `/api/accounts/login/` - student login authentication
   - `/api/accounts/students/{student_id}/` - student profile retrieval

## Correctness Properties

Property 1: Bug Condition - Case-Insensitive Certificate Verification

_For any_ certificate verification request where a student_id exists in the database (regardless of case) and has an associated certificate, the fixed verification function SHALL successfully locate and return the certificate details with HTTP 200 status, treating the student_id lookup as case-insensitive.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Existent Certificate Responses

_For any_ certificate verification request where the student_id does NOT exist in the database OR exists but has no certificate, the fixed verification function SHALL produce the same HTTP 404 response as the original function, preserving the appropriate error messaging for genuinely missing certificates.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

The fix has been implemented across two files to address the root cause:

**File**: `backend/certificates/views.py`

**Function**: `_latest_certificate(student_id)`

**Specific Changes**:
1. **Case-Insensitive Lookup**: Replace `filter(student__student_id=student_id)` with `filter(student__student_id__iexact=student_id)`
   - Uses Django's `__iexact` lookup to perform case-insensitive matching
   - Ensures certificates are found regardless of case variations

2. **Input Normalization in verify_certificate()**: Add `student_id = student_id.strip()` at function entry
   - Removes leading/trailing whitespace from URL parameters
   - Prevents lookup failures due to whitespace variations

3. **Input Normalization in view_certificate()**: Add `student_id = student_id.strip()` at function entry
   - Ensures consistent handling across all certificate endpoints

4. **Input Normalization in download_certificate()**: Add `student_id = student_id.strip()` at function entry
   - Normalizes input before certificate file retrieval

**File**: `backend/accounts/views.py`

**Function**: `login_view(request)` - Student authentication section

**Specific Changes**:
1. **Case-Insensitive Student Lookup**: Replace `Student.objects.get(student_id=student_id)` with `Student.objects.get(student_id__iexact=student_id)`
   - Allows students to login with any case variation of their student_id
   - Prevents authentication failures due to case sensitivity

2. **Input Normalization**: Add `student_id = str(request.data.get("student_id", "")).strip()` 
   - Normalizes student_id from login form data
   - Removes whitespace that could cause lookup failures

**Function**: `student_detail(request, student_id)`

**Specific Changes**:
1. **Case-Insensitive Student Lookup**: Replace `Student.objects.get(student_id=student_id)` with `Student.objects.get(student_id__iexact=student_id)`
2. **Input Normalization**: Add `student_id = student_id.strip()` at function entry

**Function**: `student_profile(request, student_id)`

**Specific Changes**:
1. **Case-Insensitive Student Lookup**: Replace `Student.objects.get(student_id=student_id)` with `Student.objects.get(student_id__iexact=student_id)`
2. **Input Normalization**: Add `student_id = student_id.strip()` at function entry

**Function**: `session_view(request)` - Student session validation

**Specific Changes**:
1. **Case-Insensitive Session Check**: Replace `Student.objects.filter(student_id=student_id)` with `Student.objects.filter(student_id__iexact=student_id)` in the session validation logic
   - Ensures session validation succeeds even if stored session student_id has case variations

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the root cause analysis that case-sensitive lookups cause verification failures.

**Test Plan**: Write tests that call the verification endpoint with case variations of valid student IDs that have certificates. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Lowercase Variation Test**: Create certificate for "TSC001", verify with "tsc001" (will fail on unfixed code with 404)
2. **Uppercase Variation Test**: Create certificate for "tsc002", verify with "TSC002" (will fail on unfixed code with 404)
3. **Mixed Case Test**: Create certificate for "U25PG507CAP002", verify with "u25pg507cap002" (will fail on unfixed code with 404)
4. **Whitespace Test**: Create certificate for "TSC003", verify with " TSC003 " (may fail on unfixed code with 404)

**Expected Counterexamples**:
- HTTP 404 responses with "Certificate not found" message for existing certificates when case differs
- Possible causes: case-sensitive `student_id=` filter, no input normalization, exact string matching in database query

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (certificate exists but case differs), the fixed function produces the expected behavior (successful verification).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := verify_certificate_fixed(input)
  ASSERT result.status == 200
  ASSERT result.valid == True
  ASSERT result.student_id exists
  ASSERT result.certificate_available is defined
END FOR
```

**Test Plan**: After implementing the fix, run tests with various case combinations to verify that certificates are found regardless of case variations.

**Test Cases**:
1. **Case Insensitivity**: Verify that "TSC001", "tsc001", "TsC001" all return the same certificate
2. **Whitespace Normalization**: Verify that " TSC001 ", "TSC001", "TSC001 " all return the same certificate
3. **Login Flow**: Verify student can login with "tsc001" when registered as "TSC001"
4. **Certificate Download**: Verify download endpoint works with case variations
5. **Session Validation**: Verify session remains valid with case variations in student_id

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT verify_certificate_original(input) = verify_certificate_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-buggy scenarios (exact case match, non-existent IDs), then write property-based tests capturing that behavior.

**Test Cases**:
1. **Non-Existent Student IDs**: Verify that verification requests for "NONEXISTENT001" continue to return 404 with appropriate error message (behavior should be unchanged)
2. **Exact Case Match**: Verify that "TSC001" → "TSC001" lookups continue to work correctly (behavior should be unchanged)
3. **No Certificate**: Verify that students without certificates continue to receive 404 "Certificate not found" (behavior should be unchanged)
4. **File Availability Check**: Verify that missing certificate files continue to be detected correctly (behavior should be unchanged)
5. **Access Control**: Verify that admin/student permission checks continue to enforce authorization correctly (behavior should be unchanged)

### Unit Tests

- Test `_latest_certificate()` with various case combinations of valid student IDs
- Test `verify_certificate()` endpoint with case variations and whitespace
- Test `view_certificate()` endpoint with case-insensitive lookups
- Test `download_certificate()` endpoint with normalized student IDs
- Test student login flow with case variations
- Test `student_detail()` with case-insensitive lookups
- Test `student_profile()` with normalized inputs
- Test session validation with case variations
- Test edge cases: empty strings, special characters, very long IDs

### Property-Based Tests

- Generate random student IDs with random case variations and verify all variations return the same certificate
- Generate random whitespace patterns around valid student IDs and verify normalization works
- Generate random non-existent student IDs and verify 404 responses are consistent
- Generate random valid student IDs with exact case match and verify behavior is preserved
- Test across multiple certificate records to verify case-insensitivity scales

### Integration Tests

- Test full QR code scan flow: generate certificate → create QR code → scan with case variation → verify success
- Test student registration → login with different case → view certificate → download certificate
- Test admin upload → verify with various case combinations → download with normalized ID
- Test bulk upload with mixed case student IDs → verify all certificates are accessible with any case
- Test session persistence: login with "TSC001" → change URL to "tsc001" → verify session remains valid
