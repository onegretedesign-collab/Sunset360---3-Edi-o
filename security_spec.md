# Security Specification - Sunset 360 Ticket System

## 1. Data Invariants
- A ticket must have a unique hash.
- Only an administrator can mark a ticket as 'checkedIn'.
- A ticket once 'checkedIn' cannot be 'un-checked' except by an admin.
- Sensitive data (revenue) is not stored per-ticket if possible, or if so, restricted.
- Document IDs for tickets are their unique hashes.

## 2. The "Dirty Dozen" Payloads (Rejection Targets)
1. **Self-Promotion**: Non-admin trying to mark `checkedIn: true`.
2. **Double Dip**: Trying to check in a ticket that is already `checkedIn: true`.
3. **Identity Spoofing**: Trying to create a ticket with someone else's UID or phone without authorization.
4. **Data Injection**: Ticket with a 1MB string in the `name` field.
5. **Ghost Fields**: Creating a ticket with `isAdmin: true` field.
6. **Time Warp**: Creating a ticket with a `createdAt` in the future.
7. **Orphan Tickets**: Creating a ticket without a valid hash.
8. **Shadow Update**: Updating a ticket's `hash` after creation.
9. **Bulk Exfiltration**: Listing all tickets without being an admin.
10. **Unauthorized Deletion**: A user trying to delete their own ticket after it's been used (to hide traces?).
11. **Malicious ID**: Using a 1KB string as the document ID (id poisoning).
12. **Status Bypass**: Changing status from 'Entregue' back to 'Ativa'.

## 3. Test Scenarios
- `get(/tickets/valid_hash)` -> ALLOW
- `update(/tickets/valid_hash)` with `checkedIn: true` while NOT admin -> DENY
- `create(/tickets/new_hash)` with `qty: -1` -> DENY
- `list(/tickets)` as non-admin -> DENY
