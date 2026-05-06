# Security Specification for AI Cartoon Studio

## 1. Data Invariants
- A User profile must be uniquely identified by their Firebase Auth UID.
- Users can only read and write their own profile data.
- Personal Identifiable Information (PII) like email and phone numbers are restricted to the owner.

## 2. The "Dirty Dozen" Payloads (Deny List)
1. Creating a user profile with a different UID than `request.auth.uid`.
2. Updating a user profile to change the `uid` (immutability).
3. Updating a user profile adding unlisted "shadow" fields.
4. Reading another user's profile (including PII).
5. Deleting a user profile without being the owner.
6. Creating a user profile as an unauthenticated guest.
7. Injecting a massive string (1MB+) into the `displayName` field.
8. Updating `createdAt` timestamp after it's set.
9. Writing an invalid email format.
10. Spoofing `email_verified` as true in the app logic (handled by rules checking auth token).
11. Setting a blank `displayName` on create.
12. Creating a user profile with a 129+ character ID.

## 3. Test Runner (Conceptual)
All payloads above should return `PERMISSION_DENIED`.
