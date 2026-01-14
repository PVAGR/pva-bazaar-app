# How to Restore Your Journal Entries

## Current Situation
The backend database is empty (`/api/archive` returns `[]`). Your journal content needs to be imported.

## Quick Restore Steps

### 1. Add Your Archive Content
Edit `import/Archive.md` and paste ALL your journal entries. Format should be:

```markdown
# **First Entry Title**

Entry content here...

# **Second Entry Title**

More content...
```

### 2. Set Your Admin Secret
```bash
export ADMIN_SECRET_CODE="your-admin-secret-from-backend-env"
```

### 3. Test Import (Dry Run)
```bash
node backend/scripts/import-archive-md.mjs \
  --file import/Archive.md \
  --api https://pva-backend-api.vercel.app \
  --dryRun
```

This shows what WOULD be created without actually creating anything.

### 4. Real Import
```bash
node backend/scripts/import-archive-md.mjs \
  --file import/Archive.md \
  --api https://pva-backend-api.vercel.app
```

## What the Script Does

- ✅ Parses your markdown into individual entries
- ✅ Assigns dates (spreads entries evenly from past to present)
- ✅ Auto-categorizes based on title keywords
- ✅ Extracts tags from titles
- ✅ Creates excerpts for archive view
- ✅ Preserves ALL your original text exactly (uses `<pre>` for formatting)
- ✅ Uses `externalId` to prevent duplicates (safe to re-run)
- ✅ Posts to backend via `/api/archive` (requires admin auth)

## After Import

Visit `https://pvabazaar.org` and your entries will appear on:
- Home page (recent entries)
- Journal page (chronological)
- Archive page (by category)
- Search (full text search)

## Troubleshooting

**"No entry headings found"**
- Make sure entries start with `# **Title**` format
- Check for proper `**` bold markers

**"Failed to get admin token"**
- Verify `ADMIN_SECRET_CODE` matches backend env var
- Check backend is accessible at the API URL

**Entries appear but formatting is off**
- The script wraps content in `<pre>` to preserve whitespace
- Check browser DevTools for any CSS conflicts

## Files Created

```
/workspaces/pva-bazaar-app/
├── import/
│   └── Archive.md              ← PASTE YOUR CONTENT HERE
└── backend/
    └── scripts/
        └── import-archive-md.mjs  ← Import script (ready to run)
```
