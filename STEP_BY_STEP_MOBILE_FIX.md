# Mobile & Desktop Fixes - Step by Step Plan

## MASTER CHECKLIST OF ALL ROUNDS

### ROUND 1: Add Home Button to Entry Detail Header
**Changes:** 
- Add home button (🏠) to EntryDetail.jsx header
- Add minimal CSS styling for home button
- Keep everything else identical

**Files Modified:**
- Frontend/src/pages/EntryDetail.jsx (1 location - header JSX)
- Frontend/src/base.css (1 location - add home button styles)

**Expected Result:** Home button appears in entry view header on mobile

**Verification:**
- [ ] Build succeeds without errors
- [ ] GitHub Pages deploys (check workflow)
- [ ] Visit https://pvabazaar.org/ on MOBILE - see home button in entry header
- [ ] Visit https://pvabazaar.org/ on DESKTOP - see home button in entry header
- [ ] Click home button - goes back to library
- [ ] No styling broken

---

### ROUND 2: Fix Login Authentication
**Changes:**
- Improve AdminPage login form validation
- Add whitespace trimming to username/password inputs
- Better error messaging

**Files Modified:**
- Frontend/src/pages/AdminPage.jsx (handleLogin function)

**Expected Result:** Login form accepts username and password correctly

**Verification:**
- [ ] Build succeeds without errors
- [ ] GitHub Pages deploys
- [ ] Visit https://pvabazaar.org/#/admin on MOBILE
- [ ] Visit https://pvabazaar.org/#/admin on DESKTOP
- [ ] Try login with: username=`richyrichaii` password=`pva123zxc!`
- [ ] Should authenticate successfully
- [ ] Admin panel loads

---

### ROUND 3: Add "Back to Home" Link to Entry Navigation Footer
**Changes:**
- Update entry footer "Back to Journal" link to "Back to Home"
- Change link destination to `#/` instead of `#/journal`

**Files Modified:**
- Frontend/src/pages/EntryDetail.jsx (navigation footer)

**Expected Result:** Footer navigation takes users to home page

**Verification:**
- [ ] Build succeeds
- [ ] GitHub Pages deploys
- [ ] Visit entry on MOBILE - click "Back to Home"
- [ ] Visit entry on DESKTOP - click "Back to Home"
- [ ] Returns to library page
- [ ] All other navigation works

---

### ROUND 4: Ensure Mobile Scrolling Still Works
**Changes:**
- Verify and test mobile scrolling is still functional after all changes

**Files Modified:**
- None (verification only)

**Expected Result:** Mobile entries display and scroll properly

**Verification:**
- [ ] Visit https://pvabazaar.org/ on MOBILE
- [ ] Click entry - full-screen overlay appears
- [ ] Entry content scrolls smoothly
- [ ] Header stays at top, footer stays at bottom
- [ ] No click-through issues

---

## DEPLOYMENT PROCESS FOR EACH ROUND

1. Make code changes locally
2. Test in local dev environment
3. Commit to git with clear message
4. Push to GitHub (main branch)
5. Wait for GitHub Actions to deploy
6. Check GitHub workflow status
7. Visit website on MOBILE browser
8. Visit website on DESKTOP browser
9. Confirm changes visible and working
10. Move to next round

---

## CURRENT STATE
- Website: https://pvabazaar.org/
- Last stable commit: d76d0bef (mobile scrolling working)
- Backend: https://pva-backend-api.vercel.app (deployed)
- Frontend: GitHub Pages (deployed)
