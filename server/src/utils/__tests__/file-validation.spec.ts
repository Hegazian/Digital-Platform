import { describe, expect, it } from 'vitest';
import { validateUploadedFile } from '../file-validation';

function validate(file: Record<string, unknown>) {
  return new Promise<Error | undefined>((resolve) => {
    validateUploadedFile({ file } as any, {} as any, (error?: any) => resolve(error));
  });
}

describe('uploaded file signature validation', () => {
  it.each([
    ['photo.jpg', 'image/jpeg', Buffer.from([255, 216, 255])],
    ['photo.gif', 'image/gif', Buffer.from('GIF89a')],
    ['photo.png', 'image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])],
    ['photo.webp', 'image/webp', Buffer.from('RIFFxxxxWEBP')],
    ['doc.doc', 'application/msword', Buffer.from([208, 207, 17, 224, 161, 177, 26, 225])],
    ['deck.ppt', 'application/vnd.ms-powerpoint', Buffer.from([208, 207, 17, 224, 161, 177, 26, 225])],
    ['doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', Buffer.from('PK\x03\x04')],
    ['clip.wav', 'audio/wav', Buffer.from('RIFFxxxxWAVE')],
    ['clip.avi', 'video/x-msvideo', Buffer.from('RIFFxxxxAVI ')],
    ['clip.webm', 'video/webm', Buffer.from([26, 69, 223, 163])],
    ['clip.mp4', 'video/mp4', Buffer.from('xxxxftypxxxx')],
    ['clip.mp3', 'audio/mpeg', Buffer.from('ID3')],
    ['clip.mpeg', 'video/mpeg', Buffer.from([0, 0, 1, 179])],
    ['notes.txt', 'text/plain', Buffer.from('ملاحظات الدرس / lesson notes')],
  ])('accepts supported matching signatures for %s', async (originalname, mimetype, buffer) => {
    expect(await validate({ originalname, mimetype, buffer })).toBeUndefined();
  });
  it('rejects an active extension even when the MIME and signature claim PDF', async () => {
    expect(await validate({ originalname: 'lesson.html', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7') })).toBeInstanceOf(Error);
  });
  it('accepts matching PDF extension, MIME and signature', async () => {
    expect(await validate({ originalname: 'lesson.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7') })).toBeUndefined();
  });

  it('rejects active HTML disguised as plain text', async () => {
    expect(await validate({ originalname: 'lesson.txt', mimetype: 'text/plain', buffer: Buffer.from('<!doctype html><script>alert(1)</script>') })).toBeInstanceOf(Error);
  });

  it('rejects an image with a mismatched signature', async () => {
    expect(await validate({ originalname: 'lesson.png', mimetype: 'image/png', buffer: Buffer.from('not a PNG') })).toBeInstanceOf(Error);
  });
});
