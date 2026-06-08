# Authentication & Authorization Testing Guide

## La Paz AptFinder - PWA Platform

This guide provides comprehensive testing instructions for the authentication and verification system.

---

## Table of Contents

1. [Test Accounts](#test-accounts)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Testing Scenarios](#testing-scenarios)
4. [Verification Flow](#verification-flow)
5. [Known Behaviors](#known-behaviors)

---

## Test Accounts

### Pre-seeded Accounts

The following test accounts are automatically created on first load:

#### Admin Account
```
Email: admin@test.com
Password: admin123
Role: Admin
Status: Verified
```

#### Landlord Account
```
Email: landlord@test.com
Password: password123
Role: Landlord
Mobile: +63 917 123 4567
Permit: BPN-2024-001234
Status: Unverified (by default - needs admin approval)
```

---

## User Roles & Permissions

### 1. Student/Employee
**Permissions:**
- ✅ Browse all apartments (from all verified landlords)
- ✅ Search and filter listings
- ✅ View apartment details
- ✅ Save apartments to favorites
- ✅ View interactive maps
- ✅ Contact landlord information
- ❌ **Cannot** add apartments
- ❌ **Cannot** edit apartments

**Dashboard Features:**
- Saved favorites list
- Quick stats
- Recent views
- Browse shortcut

---

### 2. Landlord (Unverified)
**Permissions:**
- ✅ Can login and access dashboard
- ✅ Browse all apartments
- ✅ View analytics (limited)
- ❌ **Cannot** add new apartments
- ❌ **Cannot** edit apartments
- ❌ Apartments won't have verification badge

**Dashboard Features:**
- ⚠️ Verification pending alert (orange)
- Disabled "Add New Property" button
- Property overview (shows 0 properties)
- Permit number displayed
- Stats dashboard

**Visual Indicators:**
- Orange alert banner: "⏳ Verification Pending"
- Message: "Your landlord account is awaiting admin verification..."

---

### 3. Landlord (Verified)
**Permissions:**
- ✅ Login and access dashboard
- ✅ Add new apartments **with verified badge**
- ✅ Edit own apartments only
- ✅ Delete own apartments
- ✅ View detailed analytics
- ✅ Track performance
- ✅ Browse all apartments
- ❌ **Cannot** edit other landlords' apartments

**Dashboard Features:**
- ✅ Green verification alert
- Enabled "Add New Property" button
- Property management
- Revenue tracking
- Analytics dashboard

**Visual Indicators:**
- Green alert banner: "✓ Account Verified"
- Blue "Verified Landlord" badge on their apartments
- Permit number shown as verified

**Apartment Features:**
- All apartments show blue badge: "🛡️ Verified Landlord"
- Visible to all users (students/employees)
- Editable only by owner (landlordId match)

---

### 4. Admin
**Permissions:**
- ✅ View all registered landlords
- ✅ Verify landlord accounts
- ✅ Revoke landlord verifications
- ✅ View permit information
- ✅ Review mobile numbers
- ✅ Access verification statistics

**Dashboard Features:**
- Landlord verification management table
- Stats cards:
  - Total landlords
  - Verified landlords
  - Pending verifications
- Verify/Revoke buttons
- Landlord details display

**Header Indicator:**
- Pending count badge on "Dashboard" menu item
- Orange notification badge shows number awaiting review

---

## Testing Scenarios

### Scenario 1: Student/Employee Registration & Login

**Steps:**
1. Navigate to `/signup`
2. Select "Student" or "Employee" role
3. Fill in:
   - Name: `Test Student`
   - Email: `student@test.com`
   - Password: `student123`
4. Click "Create Account"
5. Redirect to login with success message
6. Login with credentials
7. Redirected to `/dashboard`

**Expected Results:**
- ✅ Account created successfully
- ✅ Can login immediately
- ✅ Dashboard shows favorites and browse options
- ✅ Can browse apartments
- ✅ Can save favorites
- ✅ Cannot see "Add Apartment" options

---

### Scenario 2: Landlord Registration (Unverified)

**Steps:**
1. Navigate to `/signup`
2. Select "Landlord" role
3. Fill in:
   - Name: `New Landlord`
   - Email: `newlandlord@test.com`
   - Password: `landlord123`
   - Mobile Number: `+63 917 555 1234`
   - Permit Number: `BPN-2024-999999`
4. Click "Create Account"
5. See success message: "You can login now, but won't be able to add apartments until admin verifies your account"
6. Login with new credentials

**Expected Results:**
- ✅ Account created with `isVerified: false`
- ✅ Can login successfully
- ✅ Dashboard accessible
- ✅ Orange "Verification Pending" alert shown
- ✅ "Add New Property" button is **disabled**
- ✅ Statistics show 0 properties
- ❌ Cannot add apartments

---

### Scenario 3: Admin Verification Process

**Steps:**
1. Login as admin (`admin@test.com` / `admin123`)
2. Navigate to `/dashboard`
3. See Admin Dashboard with landlord list
4. Locate unverified landlord
5. Review permit number and mobile number
6. Click "Verify" button
7. Confirm verification in dialog
8. See success toast: "Landlord verified successfully"

**Expected Results:**
- ✅ Landlord list shows all registered landlords
- ✅ Unverified landlords have gray "Unverified" badge
- ✅ Verify button available for unverified landlords
- ✅ Confirmation dialog appears
- ✅ After verification:
  - Badge changes to green "Verified"
  - "Verify" button becomes "Revoke" button
  - Pending count decreases
- ✅ Landlord can now add apartments

---

### Scenario 4: Landlord Adding Apartment (After Verification)

**Steps:**
1. Login as verified landlord
2. Dashboard shows green "Account Verified" alert
3. Click "Add New Property" button (now enabled)
4. Fill apartment form:
   - Title, price, bedrooms, etc.
   - Upload images
   - Select location on map
   - Choose amenities
5. Submit form
6. Apartment created with `landlordId`
7. View apartment listing

**Expected Results:**
- ✅ "Add New Property" button is enabled
- ✅ Form accessible at `/add-apartment`
- ✅ Apartment saved with landlord's ID
- ✅ Apartment shows blue "Verified Landlord" badge
- ✅ Visible to all users (students/employees)
- ✅ Editable only by owner landlord
- ✅ Dashboard shows updated property count

---

### Scenario 5: Apartment Verification Badge Display

**Steps:**
1. Login as student/employee
2. Navigate to `/browse`
3. View apartment cards

**Expected Results:**
- ✅ Apartments from **verified** landlords show:
  - Blue badge with shield icon
  - Text: "Verified Landlord"
- ✅ Apartments from **unverified** landlords (shouldn't exist):
  - No badge shown
  - Gray appearance
- ✅ Badge positioned top-left with other badges
- ✅ Badge also shown on apartment detail page

---

### Scenario 6: Admin Revoking Verification

**Steps:**
1. Login as admin
2. Navigate to dashboard
3. Find verified landlord
4. Click "Revoke" button
5. Confirm revocation
6. See success toast

**Expected Results:**
- ✅ Landlord status changes to unverified
- ✅ Badge changes to gray "Unverified"
- ✅ Button changes to "Verify"
- ✅ Pending count increases
- ✅ Landlord's existing apartments **keep** verification badge (historical)
- ✅ Landlord cannot add new apartments until re-verified

---

### Scenario 7: Landlord Permission Testing

**Test Case A: Edit Own Apartment**
1. Login as verified landlord
2. Navigate to `/browse`
3. Find own apartment
4. Click edit icon
5. Modify details
6. Save changes

**Expected:** ✅ Success - apartment updated

**Test Case B: Try to Edit Other Landlord's Apartment**
1. Login as different verified landlord
2. Navigate to apartment from another landlord
3. Try to click edit

**Expected:** ❌ Edit button not visible (filtered by landlordId)

---

### Scenario 8: Multi-Landlord Platform

**Steps:**
1. Create multiple landlord accounts
2. Admin verifies all landlords
3. Each landlord adds 2-3 apartments
4. Login as student
5. Browse apartments

**Expected Results:**
- ✅ Student sees **ALL** apartments from **ALL** verified landlords
- ✅ All apartments show "Verified Landlord" badge
- ✅ Search/filter works across all landlords
- ✅ Map shows all apartments
- ✅ Each landlord only sees their own apartments in management

---

## Verification Flow

### Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────┐
│  Landlord Signs Up                                  │
│  (Provides Mobile + Permit Number)                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Account Created                                    │
│  isVerified: false                                  │
│  Stored in localStorage                             │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Landlord Can Login ✓                               │
│  - Access dashboard                                 │
│  - View pending status                              │
│  - Cannot add apartments                            │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Admin Reviews Account                              │
│  - Check permit number                              │
│  - Verify mobile number                             │
│  - Review landlord details                          │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   ┌─────────┐      ┌─────────┐
   │ Approve │      │ Reject  │
   └────┬────┘      └────┬────┘
        │                │
        ▼                ▼
┌──────────────┐   ┌──────────────┐
│ isVerified:  │   │ isVerified:  │
│ true         │   │ false        │
└──────┬───────┘   └──────┬───────┘
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│ Can Add      │   │ Cannot Add   │
│ Apartments   │   │ Apartments   │
│ with Badge   │   │ (Pending)    │
└──────────────┘   └──────────────┘
```

---

## Known Behaviors

### Data Storage
- All data stored in `localStorage`
- Keys used:
  - `users` - All user accounts
  - `passwords` - Password storage (hashed in production)
  - `currentUser` - Active session
  - `customApartments` - Landlord-created apartments
  - `favorites` - User favorites

### Verification Status
- **Unverified landlords:**
  - `isVerified: false`
  - Can login ✓
  - Can view dashboard ✓
  - See orange alert
  - Add button disabled
  
- **Verified landlords:**
  - `isVerified: true`
  - Full access ✓
  - Green alert shown
  - Apartments get blue badge

### Apartment Ownership
- Each apartment has `landlordId` field
- Matches owner's `user.id`
- Only owner can edit
- All users can view (if landlord verified)

### Badge Display
- Blue badge: "🛡️ Verified Landlord"
- Shown on:
  - Apartment cards (browse page)
  - Apartment detail page
  - Next to other badges (Pet Friendly, etc.)

### Header Notifications
- Admin sees pending count badge
- Orange badge on "Dashboard" menu
- Updates in real-time after verification

---

## Test Checklist

### Registration Tests
- [ ] Student can sign up
- [ ] Employee can sign up
- [ ] Landlord can sign up with permit/mobile
- [ ] Landlord signup validation works
- [ ] Duplicate email blocked

### Login Tests
- [ ] Student can login
- [ ] Employee can login
- [ ] Landlord (unverified) can login
- [ ] Landlord (verified) can login
- [ ] Admin can login
- [ ] Invalid credentials rejected
- [ ] Success messages shown

### Admin Dashboard Tests
- [ ] Shows all landlords
- [ ] Shows verification statistics
- [ ] Verify button works
- [ ] Revoke button works
- [ ] Confirmation dialogs appear
- [ ] Toast notifications shown
- [ ] List updates after actions
- [ ] Pending badge shows count

### Landlord Dashboard Tests
- [ ] Unverified: Orange alert shown
- [ ] Unverified: Add button disabled
- [ ] Verified: Green alert shown
- [ ] Verified: Add button enabled
- [ ] Shows property count
- [ ] Analytics displayed

### Apartment Management Tests
- [ ] Verified landlord can add apartments
- [ ] Apartments get landlordId
- [ ] Apartments show verified badge
- [ ] Only owner can edit
- [ ] All users can view
- [ ] Badge displays correctly

### Permission Tests
- [ ] Students cannot add apartments
- [ ] Unverified landlords cannot add
- [ ] Verified landlords can add
- [ ] Landlords cannot edit others' apartments
- [ ] Admin cannot add apartments (admin-only role)

---

## Troubleshooting

### Issue: Landlord can't login
**Check:**
- Account exists in localStorage
- Password is correct
- No blocking logic in AuthContext

### Issue: Add button not appearing
**Check:**
- User is landlord role
- User is verified (`isVerified: true`)
- Check admin dashboard for verification status

### Issue: Badge not showing
**Check:**
- Apartment has `landlordId` field
- Landlord is verified
- Badge component imported correctly

### Issue: Admin can't verify
**Check:**
- User role is "admin"
- Admin account exists
- verifyLandlord function in context

---

## Migration Notes

### Future Backend Integration
The current system is ready for Supabase migration:

**Database Schema:**
```sql
-- Users table
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT CHECK (role IN ('student', 'employee', 'landlord', 'admin')),
  mobile_number TEXT,
  permit_number TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP
)

-- Apartments table
apartments (
  id UUID PRIMARY KEY,
  landlord_id UUID REFERENCES users(id),
  title TEXT,
  price DECIMAL,
  ... other fields
)

-- Favorites table
favorites (
  user_id UUID REFERENCES users(id),
  apartment_id UUID REFERENCES apartments(id),
  PRIMARY KEY (user_id, apartment_id)
)
```

**Auth Integration:**
- Replace localStorage with Supabase Auth
- Add RLS policies for landlord apartment access
- Admin role verification via custom claims

---

## Version History

- **v2.0** (Current) - Admin verification system with badge display
- **v1.0** - Initial authentication with auto-verification

---

## Contact

For issues or questions about the authentication system:
- Check flowchart at `/flowchart`
- View design guide at `/design-guide`
- Review this testing guide

---

**Last Updated:** 2026-04-11
