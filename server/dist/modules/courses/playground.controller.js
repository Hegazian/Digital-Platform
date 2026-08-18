"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCode = void 0;
const child_process_1 = require("child_process");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const executeCode = async (req, res) => {
    const { language, code } = req.body;
    if (!language || !code) {
        return res.status(400).json({ success: false, message: 'Language and code are required' });
    }
    if (language !== 'python') {
        return res.status(400).json({ success: false, message: 'Only python is supported currently' });
    }
    // Create a temporary file
    const tempId = crypto_1.default.randomUUID();
    const tempDir = path_1.default.join(__dirname, '../../../../tmp_code');
    const filePath = path_1.default.join(tempDir, `${tempId}.py`);
    try {
        await promises_1.default.mkdir(tempDir, { recursive: true });
        await promises_1.default.writeFile(filePath, code);
        // Using a timeout to prevent infinite loops (secure code execution basic principle)
        // In production, this should be a docker run command
        (0, child_process_1.exec)(`python "${filePath}"`, { timeout: 5000 }, async (error, stdout, stderr) => {
            // Clean up the file asynchronously
            promises_1.default.unlink(filePath).catch(console.error);
            if (error) {
                if (error.killed) {
                    return res.status(400).json({
                        success: false,
                        data: { output: '', error: 'Execution timed out' }
                    });
                }
                return res.status(400).json({
                    success: false,
                    data: { output: stdout, error: stderr || error.message }
                });
            }
            res.status(200).json({
                success: true,
                data: { output: stdout, error: stderr }
            });
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server execution error' });
    }
};
exports.executeCode = executeCode;
