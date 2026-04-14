// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const appPath = path.resolve(__dirname, '../src/App.jsx');
const layoutPath = path.resolve(__dirname, '../src/components/Layout.jsx');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

describe('Route layout uniformity guard', () => {
  it('keeps critical routes wrapped in Layout shell', () => {
    const source = read(appPath);

    const requiredSnippets = [
      '<Route path="/admin" element={<Layout><AdminPage /></Layout>} />',
      '<Route path="/admin/orders" element={<RequireAdminAuth><Layout><AdminOrdersPage /></Layout></RequireAdminAuth>} />',
      '<Route path="/admin/governance" element={<RequireAdminAuth><Layout><AdminGovernancePage /></Layout></RequireAdminAuth>} />',
      '<Route path="/dashboard" element={<RequireUserAuth><Layout><UserDashboard /></Layout></RequireUserAuth>} />',
      '<Route path="/login" element={<Layout><LoginPage /></Layout>} />',
      '<Route path="/register" element={<Layout><RegisterPage /></Layout>} />',
      '<Route path="/archive" element={<Layout><ArchiveLibraryPage /></Layout>} />',
      '<Route path="/marketplace" element={<Layout><MarketplacePage /></Layout>} />',
    ];

    for (const snippet of requiredSnippets) {
      expect(source).toContain(snippet);
    }
  });

  it('keeps theme toggle wiring in shared layout', () => {
    const source = read(layoutPath);

    expect(source).toContain("import useArchiveTheme from '../hooks/useArchiveTheme.js';");
    expect(source).toContain('const { darkMode, toggleTheme } = useArchiveTheme();');
    expect(source).toContain('className="layout__themeToggle"');
  });
});
