# Multi-Format Book Upload & Reader — Implementation Plan

## Goal
Allow uploading PDF, DOCX, and HTML manuscripts separately during publish. The reader page renders HTML inline, offers PDF download, and offers DOCX converted-to-HTML reading on site. Replace EPUB with HTML.

## User Decisions
- DOCX: **Read on site** — convert to HTML via mammoth, render inline in reader
- Upload UX: **Keep textarea + add file uploads** — markdown editor stays, add HTML/PDF/DOCX upload fields
- HTML input: **File upload (.html)** — upload HTML file directly, stored in Cloudinary

## Architecture
- Books live in Cloudinary (manifest JSON + raw files), NOT MongoDB
- The `bookprojects` MongoDB collection is EMPTY — all 12 books are Cloudinary-stored
- Each Cloudinary book has: manifest JSON, manuscript text (markdown), cover images
- New: store additional manuscript formats (PDF, DOCX, HTML) in separate Cloudinary folders

---

## Step 1: Backend Model — BookProject.js
Add new fields:
```
manuscriptPdfUrl: { type: String, default: '' }
manuscriptDocxUrl: { type: String, default: '' }
manuscriptHtml: { type: String, default: '' }   // HTML version for inline reading
```

## Step 2: Cloudinary Folders
Add constants:
```
CLOUDINARY_BOOK_PDF_FOLDER = 'pva-bazaar-books/book-pdfs'
CLOUDINARY_BOOK_DOCX_FOLDER = 'pva-bazaar-books/book-docx'
CLOUDINARY_BOOK_HTML_FOLDER = 'pva-bazaar-books/book-html'
```

## Step 3: Upload Routes
- Add `manuscriptPdf`, `manuscriptDocx`, `manuscriptHtml` file fields to `bookUpload` multer config
- On publish POST: upload each file to its Cloudinary folder
- Store URLs in `book.manuscriptPdfUrl`, `book.manuscriptDocxUrl`, `book.manuscriptHtml`
- Also store in Cloudinary manifest JSON

## Step 4: View Endpoint (/view)
Priority:
1. If `book.manuscriptHtml` exists → render it as raw HTML
2. Else if `book.manuscriptMarkdown` exists → render markdown to HTML
3. Else if `book.manuscriptUrl` exists → fetch and render
4. Else → show download link fallback

## Step 5: New Download Route
- `GET /public/:slug/download/docx` — serves the DOCX file from Cloudinary
- Existing PDF route already works (generates from markdown)

## Step 6: Book Summary / Lightweight Summary
Add to both `bookSummary()` and `lightweightPublicSummary()`:
```
links: {
  ...existing,
  docx: '/api/book-publishing/public/{slug}/download/docx',
  html: '/api/book-publishing/public/{slug}/download/html',
}
manuscriptPdfUrl: book.manuscriptPdfUrl || '',
manuscriptDocxUrl: book.manuscriptDocxUrl || '',
manuscriptHtml: book.manuscriptHtml ? 'available' : '',  // don't expose full HTML in list
```

## Step 7: Frontend — BookPublishingPage.jsx
Replace single manuscript upload with three format-specific upload areas:
- **HTML Version** (primary — for web reader): file input (.html)
- **PDF Version** (for download): file input (.pdf)
- **DOCX Version** (for reading on site): file input (.docx)
- Keep existing **Manuscript text** textarea (markdown source)

Upload flow in `submitBook()`:
1. Upload HTML file → Cloudinary raw → store URL in `manuscriptHtml` field
2. Upload PDF file → Cloudinary raw → store URL in `manuscriptPdfUrl` field
3. Upload DOCX file → Cloudinary raw → store URL in `manuscriptDocxUrl` field
4. Send all URLs as form fields in the POST request

## Step 8: Frontend — BookReaderPage.jsx
Update reader to support multiple formats:
- **Primary reader**: If HTML available → show HTML in iframe (`/view` endpoint)
- **PDF download button**: Always show if available
- **DOCX read button**: Show "Read on site" → opens DOCX via a viewer (convert to HTML via mammoth on server)
- Remove EPUB button entirely
- Add DOCX viewer route: `GET /public/:slug/view/docx` — converts DOCX to HTML via mammoth and serves it

## Step 9: Server DOCX Viewer
Add `GET /public/:slug/view/docx`:
1. Load book manifest from Cloudinary
2. Fetch DOCX from Cloudinary URL
3. Convert to HTML using mammoth
4. Return full HTML page (same styling as /view)

## Step 10: Cleanup
- Update `lightweightPublicSummary` links to include docx and html
- Update `bookSummary` links to include docx and html
- Update delete route to also delete from new Cloudinary folders
- Update manifest JSON to include new URLs
- Remove EPUB references from frontend

---

## Files to Modify
1. `backend/models/BookProject.js` — add 3 fields
2. `backend/routes/bookPublishing.js` — upload routes, view routes, download routes, summary functions, manifest, delete cleanup
3. `backend/services/bookPublisher.js` — `renderBookBody()` to prefer HTML manuscript
4. `Frontend/src/pages/BookPublishingPage.jsx` — multi-format upload UI
5. `Frontend/src/pages/BookReaderPage.jsx` — multi-format reader UI, remove EPUB
6. `Frontend/src/pages/BookReaderPage.css` — styles for new buttons/sections
7. `Frontend/src/lib/api.js` — no changes needed (generic save/delete)

## Verification
1. Deploy to Vercel
2. Publish a book with all three formats uploaded
3. Verify /view renders HTML version
4. Verify PDF download works
5. Verify DOCX viewer converts and displays correctly
6. Verify delete removes all Cloudinary files
7. Verify existing books still render (fallback to markdown)
