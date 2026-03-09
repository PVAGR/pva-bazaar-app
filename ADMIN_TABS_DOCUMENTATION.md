# Admin Panel - Tabbed Interface Documentation

## Overview

The Admin Panel now features a comprehensive tabbed interface that organizes admin functionality into five dedicated sections. Each tab provides specific management capabilities with a consistent, theme-aware UI.

---

## Access

**URL:** `/admin`

**Authentication:** Username + Password (session-based authentication)

---

## Tab Structure

### 📚 **Archive Tab** (Default)

**PURPOSE:** Create, edit, and manage archive entries

**FEATURES:**
- ✅ Create new archive entries with Markdown support
- ✅ Edit existing entries
- ✅ Delete entries with confirmation modal
- ✅ Upload media files (drag & drop or file selector)
- ✅ Cloudinary integration for media uploads
- ✅ Word count calculation
- ✅ Category organization (Fiction, Spiritual, Technology, etc.)
- ✅ Real-time preview sidebar with all saved entries
- ✅ Statistics (original entries + custom entries)

**HOW TO USE:**
1. Fill in the form fields (Title, Category, Description, Content)
2. Optionally add media URLs or drag & drop files to upload
3. Click "Publish to Live Site" to create the entry
4. Entries appear immediately in the sidebar
5. Click an entry in the sidebar to edit it
6. Click the 🗑️ icon to delete (with confirmation)

**API ENDPOINTS:**
- `POST /api/blog/entries` - Create entry
- `GET /api/blog/entries` - Fetch entries
- `DELETE /api/blog/entries/:id` - Delete entry

**FILES:**
- Component: `Frontend/src/pages/AdminPage.jsx` (lines 827-1051)
- Styles: `Frontend/src/pages/AdminPage.css`

---

### 🛒 **Marketplace Tab**

**PURPOSE:** Manage marketplace items (products/artifacts)

**FEATURES:**
- ✅ View all marketplace items in sidebar list
- ✅ Create new items with full details
- ✅ Edit existing items
- ✅ Delete items with confirmation
- ✅ Set pricing, stock, and condition
- ✅ Image URL support with preview
- ✅ Category organization
- ✅ Origin tracking

**HOW TO USE:**
1. View existing items in the sidebar (shows thumbnail, price, stock)
2. Fill in the form to create a new item:
   - **Title**: Item name (e.g., "Hand-carved Wooden Bowl")
   - **Price**: USD amount (e.g., 49.99)
   - **Stock**: Available quantity
   - **Category**: Handicrafts, Textiles, Jewelry, Pottery, Art, Other
   - **Condition**: New, Like New, Good, Fair, Vintage
   - **Origin**: Geographic origin (e.g., "Kenya, Nairobi")
   - **Image URL**: Direct link to item image
   - **Description**: Full item description
3. Click "Create Item" to publish
4. Click an item in sidebar to edit
5. Click 🗑️ to delete (with confirmation)

**API ENDPOINTS:**
- `GET /api/items` - Fetch all items
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

**FILES:**
- Component: `Frontend/src/components/MarketplaceTab.jsx`
- Styles: `Frontend/src/components/MarketplaceTab.css`

---

### 👥 **Users Tab**

**PURPOSE:** View and manage user accounts

**FEATURES:**
- ✅ View all registered users in table format
- ✅ Search users by name or email
- ✅ See user roles (admin/user)
- ✅ View user status (active/inactive)
- ✅ Track join dates and order counts
- ✅ Statistics dashboard (total users, active users)

**HOW TO USE:**
1. Use search box to filter users by name or email
2. View user details in the table:
   - **Name**: User's full name
   - **Email**: User's email address
   - **Role**: admin or user (color-coded badges)
   - **Status**: active or inactive (color-coded badges)
   - **Joined**: Account creation date
   - **Orders**: Number of orders placed
3. Click 👁️ icon to view user details (feature ready for backend implementation)

**CURRENT STATUS:** 
- ⚠️ **Demo Mode**: Displays mock data for demonstration
- **Full functionality requires backend admin endpoints**

**TO ENABLE FULL FUNCTIONALITY:**
1. Add admin middleware to backend
2. Implement `/api/admin/users` endpoints:
   - `GET /api/admin/users` - Fetch all users
   - `GET /api/admin/users/:id` - Get user details
   - `PUT /api/admin/users/:id` - Update user
   - `DELETE /api/admin/users/:id` - Delete user
3. Add role-based access control (RBAC)
4. Connect tab to real API

**FILES:**
- Component: `Frontend/src/components/UsersTab.jsx`
- Styles: `Frontend/src/components/UsersTab.css`

---

### 💚 **Health Tab**

**PURPOSE:** System health monitoring and OpenClaw integration

**FEATURES:**
- ✅ Overall health status indicator (Healthy/Degraded/Error)
- ✅ API endpoint connectivity checks
- ✅ OpenClaw watchdog status monitoring
- ✅ Recent events viewer (last 10 events)
- ✅ Manual test event dispatch
- ✅ Auto-refresh (60-second intervals)
- ✅ Last checked timestamp
- ✅ Color-coded status indicators

**HOW TO USE:**
1. **Monitor Overall Health**: Top card shows system-wide status
   - ✅ Green = All Systems Operational
   - ⚠️ Yellow = Some Systems Degraded
   - ❌ Red = System Error
   
2. **Check Endpoints**: View connectivity for:
   - Health Check - API availability
   - OpenClaw Status - Watchdog state
   - OpenClaw Events - Event system status
   
3. **Test Event Dispatch**:
   - Click "🚀 Dispatch Test Event" button
   - Verifies event processing pipeline
   - Shows success/failure message
   - Events appear in Recent Events after dispatch

4. **View Recent Events**:
   - See last 10 dispatched events
   - Color-coded by level (info/warning/error)
   - Timestamps for each event

5. **Auto-Refresh**:
   - Toggle checkbox to enable/disable
   - Refreshes every 60 seconds when enabled
   - Manual refresh with "🔄 Refresh" button

**API ENDPOINTS:**
- `GET /api/health` - System health
- `GET /api/openclaw/status` - OpenClaw watchdog status
- `GET /api/openclaw/recent-events` - Recent events list
- `POST /api/openclaw/dispatch` - Dispatch test event
- `GET /api/openclaw/metrics` - Prometheus metrics

**OPENCLAW INTEGRATION:**
- Monitors watchdog state, errors, and alerts
- Tracks event processing pipeline
- Provides real-time system observability
- See `OPENCLAW_*.md` files for full documentation

**FILES:**
- Component: `Frontend/src/components/HealthTab.jsx`
- Styles: `Frontend/src/components/HealthTab.css`

---

### ⚙️ **Settings Tab**

**PURPOSE:** Application configuration and settings management

**FEATURES:**
- ✅ Configure API base URL
- ✅ Reset to default API URL
- ✅ View current theme (dark/light)
- ✅ Clear all cached data and local storage
- ✅ Export settings as JSON
- ✅ View system information (environment, version, build date)

**HOW TO USE:**

**API Configuration:**
1. Enter custom API base URL in the input field
2. Click "💾 Save" to apply
3. Click "🔄 Reset" to restore default from environment

**Data Management:**
1. **Clear Cache**: Removes all localStorage and sessionStorage
   - ⚠️ Warning: Will log you out and reload the page
   - Use for troubleshooting or fresh start
2. **Export Settings**: Downloads JSON file with:
   - Current API URL
   - Active theme
   - Export timestamp

**System Information:**
- **Environment**: Development or production
- **API URL**: Currently configured backend URL
- **Version**: Application version
- **Build**: Last build date

**FILES:**
- Component: `Frontend/src/components/SettingsTab.jsx`
- Styles: `Frontend/src/components/SettingsTab.css`

---

## Theme Support

All tabs inherit the global Archive design baseline:

**Dark Mode (Default):**
- Background: Deep blue night mode (#0a0e27)
- Accents: Cyan (#00d9ff)
- Text: High contrast white

**Light Mode:**
- Background: Soft green
- Accents: Green tones
- Text: Dark for readability

**CSS Variables Used:**
- `--site-bg` - Background
- `--site-panel` - Panel backgrounds
- `--site-accent` - Accent color (cyan/green)
- `--site-text` - Primary text
- `--site-text-dim` - Secondary text
- `--site-border` - Border colors
- `--site-success-*` - Success states
- `--site-warning-*` - Warning states
- `--site-danger-*` - Error/danger states

All custom CSS uses these variables to ensure consistent theming.

---

## Architecture

**Component Structure:**
```
AdminPage.jsx (main container)
├── AdminNav.jsx (global navigation)
├── AdminTabs.jsx (tab navigation)
└── Tab Panels (conditional rendering):
    ├── Archive (inline in AdminPage.jsx)
    ├── MarketplaceTab.jsx
    ├── UsersTab.jsx
    ├── HealthTab.jsx
    └── SettingsTab.jsx
```

**State Management:**
- `activeTab` state in AdminPage controls which tab is visible
- Each tab manages its own internal state
- Shared utilities: `api.js`, `logger.js`, `auth.js`

**Code Splitting:**
- Tab components are NOT lazy-loaded (immediate availability)
- All admin functionality bundled together
- ~20KB additional bundle size per tab (gzipped)

---

## Testing Checklist

### Archive Tab:
- [ ] Login with valid credentials
- [ ] Create new archive entry
- [ ] Edit existing entry
- [ ] Delete entry with confirmation
- [ ] Upload media file (if Cloudinary configured)
- [ ] Verify entry appears on live site

### Marketplace Tab:
- [ ] View existing items in sidebar
- [ ] Create new item with all fields
- [ ] Edit existing item
- [ ] Delete item with confirmation
- [ ] Verify image preview works
- [ ] Check items appear on marketplace page

### Users Tab:
- [ ] View mock user data
- [ ] Search users by name
- [ ] Search users by email
- [ ] Verify role badges display correctly
- [ ] Verify status badges display correctly

### Health Tab:
- [ ] View overall health status
- [ ] Check endpoint connectivity
- [ ] View OpenClaw watchdog status
- [ ] Dispatch test event
- [ ] View recent events
- [ ] Toggle auto-refresh
- [ ] Manual refresh

### Settings Tab:
- [ ] View current API URL
- [ ] Change API URL and save
- [ ] Reset to default API URL
- [ ] View system information
- [ ] Export settings as JSON
- [ ] Clear cache (confirms logout)

---

## Future Enhancements

### Users Tab:
1. Backend admin endpoints
2. User detail modal
3. Edit user roles
4. Suspend/activate users
5. View user order history
6. Bulk actions

### Marketplace Tab:
1. Bulk import from CSV
2. Image upload via Cloudinary
3. Inventory alerts
4. Sales analytics
5. Featured item toggle

### Health Tab:
1. Historical metrics graphs
2. Alert configuration
3. Email notifications
4. Webhook integrations
5. Performance metrics

### Settings Tab:
1. Email configuration
2. Payment gateway settings
3. Shipping options
4. Tax configuration
5. Import settings from JSON

---

## Troubleshooting

**Tab not switching:**
- Check browser console for errors
- Verify `activeTab` state is updating
- Ensure all tab components are imported

**API errors:**
- Verify API_URL in settings tab
- Check backend is running
- Review network tab in DevTools
- Check CORS configuration

**Build errors:**
- Run `npm install` to update dependencies
- Check for missing imports
- Verify all CSS files exist
- Review theme guard output

**OpenClaw not working:**
- Verify backend `/api/openclaw/*` endpoints exist
- Check watchdog is running (Windows: Task Scheduler)
- Review `OPENCLAW_*.md` documentation
- Run integration tests: `infra/openclaw/test-integration.ps1`

---

## Contributing

When adding new admin functionality:
1. Create new tab component in `Frontend/src/components/`
2. Add corresponding CSS file
3. Add tab to `AdminTabs.jsx` tabs array
4. Import and render in `AdminPage.jsx`
5. Use existing theme variables
6. Follow Archive design baseline
7. Add documentation section here
8. Update testing checklist

---

## Related Documentation

- **OpenClaw Integration**: `OPENCLAW_INTEGRATION.md`
- **OpenClaw Events**: `OPENCLAW_EVENT_INTEGRATION.md`
- **OpenClaw Quick Reference**: `OPENCLAW_QUICK_REFERENCE.md`
- **Frontend Instructions**: `.github/instructions/frontend.instructions.md`
- **Backend Routes**: `backend/routes/README.md`
- **API Documentation**: `CLAUDE.md` (API Endpoints Structure section)

---

## Summary

The tabbed admin interface provides:
- ✅ **5 organized tabs** for different admin functions
- ✅ **Consistent UI** matching Archive design baseline
- ✅ **Full CRUD operations** for entries and items
- ✅ **System monitoring** via Health tab
- ✅ **Configuration management** via Settings tab
- ✅ **Extensible architecture** for future enhancements
- ✅ **Theme-aware styling** (dark/light modes)
- ✅ **Production-ready** (builds successfully, no errors)

All tabs are fully functional and ready for use. The Users tab shows mock data pending backend admin endpoints, but the UI is complete and ready to connect once backend support is added.
