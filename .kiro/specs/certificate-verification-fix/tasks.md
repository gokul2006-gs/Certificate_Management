# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Case-Insensitive Certificate Lookup Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases with case variations
  - Test that certificate verification fails for valid student_ids when case differs:
    - Create certificate for student "TSC001"
    - Verify lookup with "tsc001" fails (returns 404 on unfixed code)
    - Create certificate for "U25PG507CAP002"
    - Verify lookup with "u25pg507cap002" fails (returns 404 on unfixed code)
  - Test assertions should match Expected Behavior: lookups should succeed with HTTP 200 and return certificate details
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "verify_certificate('tsc001') returns 404 instead of 200 for existing certificate 'TSC001'")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Input Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Verify that "NONEXISTENT001" returns 404 "Certificate not found"
    - Verify that exact case match "TSC001" → "TSC001" succeeds with 200
    - Verify that students without certificates return 404 appropriately
    - Verify that missing certificate files return "file not available" indicator
  - Write property-based tests capturing observed behavior patterns:
    - For all non-existent student_ids, verification returns 404 with error message
    - For all exact case matches with existing certificates, verification returns 200 with certificate details
    - For all students without certificates, verification returns 404 "Certificate not found"
    - For all certificate records with missing files, "certificate_available" is False
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix for case-sensitive certificate verification failures

  - [ ] 3.1 Implement case-insensitive lookups in backend/certificates/views.py
    - Modify `_latest_certificate()` to use `filter(student__student_id__iexact=student_id)` instead of `filter(student__student_id=student_id)`
    - Add `student_id = student_id.strip()` normalization in `verify_certificate()`
    - Add `student_id = student_id.strip()` normalization in `view_certificate()`
    - Add `student_id = student_id.strip()` normalization in `download_certificate()`
    - _Bug_Condition: isBugCondition(input) where student_id case differs from stored value OR has whitespace_
    - _Expected_Behavior: Certificate lookups succeed regardless of case variations (HTTP 200 with certificate details)_
    - _Preservation: Non-existent certificates return 404, exact matches continue to work, file availability checks unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.2 Implement case-insensitive lookups in backend/accounts/views.py
    - Modify student login to use `Student.objects.get(student_id__iexact=student_id)` with `student_id.strip()` normalization
    - Modify `student_detail()` to use `Student.objects.get(student_id__iexact=student_id)` with `student_id.strip()` normalization
    - Modify `student_profile()` to use `Student.objects.get(student_id__iexact=student_id)` with `student_id.strip()` normalization
    - Modify `session_view()` session validation to use `Student.objects.filter(student_id__iexact=student_id)`
    - _Bug_Condition: isBugCondition(input) where student_id case differs from stored value OR has whitespace_
    - _Expected_Behavior: Student authentication and profile access succeed regardless of case variations_
    - _Preservation: Invalid credentials return errors, access control checks remain enforced_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2_

  - [ ] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Case-Insensitive Certificate Lookup Success
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify that "tsc001" lookup for "TSC001" certificate returns HTTP 200
    - Verify that "u25pg507cap002" lookup for "U25PG507CAP002" certificate returns HTTP 200
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Input Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all non-existent student_id queries still return 404
    - Confirm exact case matches still work correctly
    - Confirm students without certificates still return appropriate errors
    - Confirm access control and file availability checks remain unchanged

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise
