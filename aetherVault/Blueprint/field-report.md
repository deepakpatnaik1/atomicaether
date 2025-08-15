# Field Report

## Lesson #1: import.meta.glob Not Finding Files in Static Directory

### 🚨 Symptoms (How to recognize this problem)
- `import.meta.glob()` returns empty array `[]` despite files existing
- Files are accessible via HTTP: `curl http://localhost:5174/themes/file.json` works ✅
- Files exist in filesystem: `ls static/themes/` shows files ✅
- Console shows: "Available Themes (0)" but themes directory has files
- DiscoveryBus returns empty list from `discoveryBus.list('themes')`
- Browser console logs: `Object.keys(globModules) = []`

### 🔍 Root Cause
`import.meta.glob` only works for files within the `src/` directory tree. Files in `static/` directory are served by Vite for HTTP access but are not accessible to build-time glob patterns. Additionally, glob paths resolve relative to the calling file's location, not the project root.

### ✅ Solution
Implement **dual location approach** with symlinks:

1. **Create symlink in src for glob access:**
   ```bash
   cd apps/web/src
   ln -sf ../../../aetherVault/themes themes
   ```

2. **Keep existing symlink in static for HTTP access:**
   ```bash
   cd apps/web/static
   ln -sf ../../../aetherVault/themes themes
   ```

3. **Use absolute glob pattern in code:**
   ```typescript
   // ❌ Fails - relative path depends on caller location
   const modules = import.meta.glob('../themes/*.json');

   // ✅ Works - absolute path always resolves correctly
   const modules = import.meta.glob('/src/themes/*.json');
   ```

4. **Verify both access methods work:**
   - Glob: `Object.keys(import.meta.glob('/src/themes/*.json'))` returns file paths
   - HTTP: `curl http://localhost:5174/themes/file.json` returns file content

### 🎯 Prevention
- **Always use absolute paths** with `import.meta.glob()` to avoid caller-location dependencies
- **Test glob patterns** by logging `Object.keys(modules)` before assuming they work
- **Remember**: `static/` is for HTTP serving, `src/` is for build-time processing
- **Use symlinks** to maintain single source of truth while satisfying both access methods
- **Document the dual-location pattern** so others understand why both symlinks exist
