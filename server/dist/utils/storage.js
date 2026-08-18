"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Storage Utility for handling file uploads (Supabase Storage with local fallback).
 */
class StorageService {
    /**
     * Upload a file buffer to Supabase Storage or local fallback.
     */
    static async uploadFile(fileBuffer, fileName, mimeType, bucketName = 'lesson-materials') {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.match(/https:\/\/[^/]+/)?.[0];
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        const uniqueFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        if (supabaseUrl && supabaseKey) {
            try {
                const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${uniqueFileName}`;
                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'API-Key': supabaseKey,
                        'Content-Type': mimeType,
                        'x-upsert': 'true',
                    },
                    body: fileBuffer,
                });
                if (response.ok) {
                    // For materials we return public URL, for videos we return the raw object path to be signed later
                    if (bucketName === 'lesson-materials') {
                        return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${uniqueFileName}`;
                    }
                    else {
                        return `${bucketName}/${uniqueFileName}`; // internal path for signed URLs
                    }
                }
            }
            catch (error) {
                console.warn('Supabase storage upload failed, falling back to local storage:', error);
            }
        }
        // Fallback to local uploads directory
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', bucketName);
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        const localFilePath = path_1.default.join(uploadDir, uniqueFileName);
        fs_1.default.writeFileSync(localFilePath, fileBuffer);
        return `/uploads/${bucketName}/${uniqueFileName}`;
    }
    /**
     * Generates a secure, temporary signed URL for private bucket objects.
     * Expires in 7200 seconds (2 hours) by default.
     */
    static async getSignedUrl(internalPath, expiresIn = 7200) {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.match(/https:\/\/[^/]+/)?.[0];
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (internalPath.startsWith('/uploads/')) {
            // It's a local file. We return a backend API route that streams the file securely.
            // We will handle token generation at the video service level, so just return internal path.
            return internalPath;
        }
        if (supabaseUrl && supabaseKey) {
            try {
                // internalPath format: "lesson-videos/163000000-video.mp4"
                const signUrl = `${supabaseUrl}/storage/v1/object/sign/${internalPath}`;
                const response = await fetch(signUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'API-Key': supabaseKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ expiresIn }),
                });
                if (response.ok) {
                    const data = await response.json();
                    // Supabase returns { signedURL: "/object/sign/..." }
                    if (data.signedURL) {
                        return `${supabaseUrl}/storage/v1${data.signedURL}`;
                    }
                }
            }
            catch (error) {
                console.error('Error generating Supabase signed URL:', error);
            }
        }
        throw new Error('Failed to generate signed URL');
    }
    /**
     * Delete a file from storage.
     */
    static async deleteFile(fileUrl) {
        if (fileUrl.startsWith('/uploads/')) {
            const parts = fileUrl.split('/');
            const fileName = parts.pop();
            const bucketName = parts.pop();
            const localFilePath = path_1.default.join(process.cwd(), 'uploads', bucketName, fileName);
            if (fs_1.default.existsSync(localFilePath)) {
                fs_1.default.unlinkSync(localFilePath);
            }
        }
        // Note: Supabase deletion can be added here if needed
    }
}
exports.StorageService = StorageService;
