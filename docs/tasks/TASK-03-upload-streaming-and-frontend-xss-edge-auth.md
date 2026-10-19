# TASK-03: Disk Upload Streaming (`P0-4`) & Frontend XSS / Edge JWT Hardening (`P0-5`)

- **Phase**: Phase 1 — Test Harness & P0 Security Remediation
- **Dependencies**: [TASK-02](./TASK-02-quiz-security-and-answer-key-protection.md)
- **Estimated Effort**: 2–3 hours
- **Target Issue IDs**: `P0-4` (500MB in-memory Multer buffer OOM risk), `P0-5` (Unsanitized `dangerouslySetInnerHTML` in `TiptapEditor.tsx` & unverified JWT decode in `client/src/middleware.ts`)

---

## 1. Objective & Problem Statement

1. **Memory Exhaustion Risk on Uploads (`P0-4`)**:
   - [`server/src/modules/videos/video.routes.ts`](../../server/src/modules/videos/video.routes.ts#L14) configures `multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } })`.
   - Buffering a 500MB video in `req.file.buffer` inside V8 heap memory causes out-of-memory (OOM) crashes under concurrent uploads.
2. **DOM XSS in `TiptapEditor.tsx` (`P0-5a`)**:
   - [`client/src/components/editor/TiptapEditor.tsx`](../../client/src/components/editor/TiptapEditor.tsx#L130) renders read-only lesson HTML via `dangerouslySetInnerHTML={{ __html: content }}` without sanitization.
3. **Unverified JWT Role Decode in Next.js Edge Middleware (`P0-5b`)**:
   - [`client/src/middleware.ts`](../../client/src/middleware.ts#L17-L39) decodes `eduplat_rt` using `atob()` without checking token expiration (`exp`) or structure, allowing a stale or crafted cookie to bypass edge redirects.

---

## 2. Files to Modify

| File | Action | Purpose |
| :--- | :---: | :--- |
| [`server/src/utils/storage.ts`](../../server/src/utils/storage.ts) | Modify | Support saving uploaded files from a temporary disk path (`file.path`) in addition to `Buffer`, cleaning up the temp file after move/upload. |
| [`server/src/modules/videos/video.routes.ts`](../../server/src/modules/videos/video.routes.ts) | Modify | Switch from `multer.memoryStorage()` to `multer.diskStorage()` writing to an OS/uploads temp directory. |
| [`server/src/modules/videos/video.controller.ts`](../../server/src/modules/videos/video.controller.ts) | Modify | Pass disk-backed Multer file to `VideoService.uploadVideo` and ensure temp cleanup in `finally`. |
| [`server/src/modules/videos/video.service.ts`](../../server/src/modules/videos/video.service.ts) | Modify | Accept file stream/path or buffer seamlessly. |
| [`client/package.json`](../../client/package.json) | Modify | Add `isomorphic-dompurify` for safe HTML rendering in `TiptapEditor.tsx`. |
| [`client/src/components/editor/TiptapEditor.tsx`](../../client/src/components/editor/TiptapEditor.tsx) | Modify | Sanitize `content` with `DOMPurify.sanitize(content)` before rendering `dangerouslySetInnerHTML`. |
| [`client/src/middleware.ts`](../../client/src/middleware.ts) | Modify | Validate `exp` timestamp and strict role enum (`STUDENT \| TEACHER \| ADMIN`) when inspecting `eduplat_rt`, clearing expired cookies. |

---

## 3. Step-by-Step TDD Implementation Guide

### Step 1: Write Failing Tests First (`Red` Phase)

1. In [`server/src/modules/videos/__tests__/video.integration.spec.ts`](../../server/src/modules/videos/__tests__/video.integration.spec.ts):
   - Add a test verifying that uploading a video via `POST /api/v1/videos/upload` stores the video on disk without leaving orphaned temporary files in the temp upload directory, and that invalid MIME types cleanup their temp files immediately.
2. In [`client/e2e/routing.spec.ts`](../../client/e2e/routing.spec.ts):
   - Add a test setting an **expired** `eduplat_rt` cookie (where `payload.exp` is in the past) and navigating to `/admin/dashboard`.
   - **Expected Assertion**: Middleware treats the expired cookie as unauthenticated and redirects to `/login`.

Run the tests (`Red`):
```bash
cd server
npx vitest run src/modules/videos/__tests__/video.integration.spec.ts
```

---

### Step 2: Implement the Fixes (`Green` Phase)

#### 2.1 Switch `video.routes.ts` from `memoryStorage` to `diskStorage`
1. In [`server/src/utils/storage.ts`](../../server/src/utils/storage.ts):
   - Add a helper `getTempUploadsDir()` (`path.join(getUploadsRoot(), '.tmp')`) and ensure the directory exists (`fs.mkdirSync(..., { recursive: true })`).
   - Update `uploadFile(folder, fileBufferOrPath: Buffer | string, originalName, mimeType)`:
     - When `typeof fileBufferOrPath === 'string'` (a disk file path):
       - For local storage: use `fs.promises.rename(fileBufferOrPath, targetPath)` (or copy + unlink across volumes) instead of buffering in RAM!
       - For Supabase storage: stream the file via `fs.createReadStream(fileBufferOrPath)` and `fs.promises.unlink(fileBufferOrPath)` in a `finally` block.
2. In [`server/src/modules/videos/video.routes.ts`](../../server/src/modules/videos/video.routes.ts):
   - Configure `multer.diskStorage({ destination: getTempUploadsDir(), filename: ... })` with `fileFilter` rejecting unsupported MIME types *before* writing the stream to disk.

#### 2.2 Sanitize Rich Text HTML in `TiptapEditor.tsx`
1. Install `isomorphic-dompurify` in `client/`:
   ```bash
   cd client && npm install isomorphic-dompurify
   ```
2. In [`client/src/components/editor/TiptapEditor.tsx`](../../client/src/components/editor/TiptapEditor.tsx#L125-L135):
   ```tsx
   import DOMPurify from 'isomorphic-dompurify';
   // ...
   if (!editable) {
     const safeHtml = DOMPurify.sanitize(content || '');
     return (
       <div
         className="prose prose-invert max-w-none text-slate-300"
         dangerouslySetInnerHTML={{ __html: safeHtml }}
       />
     );
   }
   ```

#### 2.3 Harden `client/src/middleware.ts`
In [`client/src/middleware.ts`](../../client/src/middleware.ts#L17-L39):
- When decoding the JWT payload from `eduplat_rt`:
  - Check `typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()`. If expired, redirect to `/login` and delete the `eduplat_rt` cookie on the response.
  - Validate that `payload.role` is strictly one of `'STUDENT' | 'TEACHER' | 'ADMIN'`.
  - If `JWT_REFRESH_SECRET` is available in the edge environment, verify the HMAC signature via Web Crypto (`crypto.subtle`).

---

### Step 3: Refactor & Cleanup (`Refactor` Phase)

Verify that `server/uploads/.tmp` is ignored by git (covered by `uploads/` in `.gitignore`) and cleaned up on any upload validation error.

---

## 4. Code Review Checklist

- [x] Does `video.routes.ts` use `multer.diskStorage` and reject invalid MIME types inside `fileFilter` before buffering 500MB?
- [x] Are temporary upload files always deleted in a `try / finally` block if an error occurs during DB persistence?
- [x] Does `TiptapEditor.tsx` sanitize all HTML strings through `DOMPurify.sanitize` before passing to `dangerouslySetInnerHTML`?
- [x] Does `client/src/middleware.ts` reject expired `eduplat_rt` tokens (`exp * 1000 <= Date.now()`)?

---

## 5. Verification & Test Commands (Verified: 100% Pass)

```bash
# Backend verification
cd server
npx vitest run src/modules/videos
npm run typecheck
npm test

# Frontend verification
cd ../client
npm run typecheck
npm run lint
npm run build
```
