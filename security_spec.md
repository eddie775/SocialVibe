# Firestore Security Specification - SocialVibe

## 1. Data Invariants
- A User profile can only be created with a `userId` matching the `auth.uid`.
- A Post must have a valid `authorId` matching the creator's `auth.uid`.
- A Comment must be associated with a valid Post and created by an authenticated user.
- A Like can only be created by an authenticated user for their own `userId` sub-document.
- A Chat Room can only be accessed (read/write) by users whose `auth.uid` is in the `participants` array.
- Timestamps (`createdAt`, `updatedAt`) must be set to `request.time`.

## 2. The Dirty Dozen (Malicious Payloads)
1. **Identity Spoofing**: Attempt to create a user profile for a different UID.
2. **Post Hijacking**: Attempt to update another user's post content.
3. **Ghost Post**: Create a post with a fake `authorId`.
4. **Like Spam**: Attempt to create a like for another user.
5. **Private Chat Siphoning**: Attempt to read messages in a room where the user is not a participant.
6. **Room Infiltration**: Attempt to add self to a private room.
7. **Timestamp Tampering**: Set a `createdAt` date in the past or future manually.
8. **Shadow Field Injection**: Add `isVerified: true` to a user profile.
9. **Counter Bloating**: Increment `likesCount` by 100 in one update.
10. **ID Poisoning**: User a 2KB string as a `postId`.
11. **Unverified Write**: Attempt to post without a verified email (if strictly enforced).
12. **Recursive Cost Attack**: Query posts without any index-friendly filters.

## 3. Test Runner (Conceptual logic)
The `firestore.rules.test.ts` (if we had a runner environment) would:
- Assert `PERMISSION_DENIED` for all Dirty Dozen.
- Assert `PERMISSION_GRANTED` for legitimate social interactions.
