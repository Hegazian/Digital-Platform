/* Rebuild the tiny, non-educational video fixture with a local Chromium. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.M0_CHROMIUM_EXECUTABLE });
  try {
    const page = await browser.newPage();
    await page.setContent('<canvas width="160" height="90"></canvas>');
    const bytes = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas');
      const context = canvas.getContext('2d');
      context.fillStyle = '#3344aa'; context.fillRect(0, 0, 160, 90);
      const stream = canvas.captureStream(10);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      const complete = new Promise((resolve) => { recorder.ondataavailable = (event) => chunks.push(event.data); recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' })); });
      recorder.start();
      let frame = 0;
      const timer = setInterval(() => { context.fillStyle = frame++ % 2 ? '#3344aa' : '#5588cc'; context.fillRect(0, 0, 160, 90); stream.getVideoTracks()[0].requestFrame(); }, 100);
      await new Promise((resolve) => setTimeout(resolve, 2200));
      recorder.stop(); clearInterval(timer);
      const clip = await complete;
      stream.getTracks().forEach((track) => track.stop());
      return Array.from(new Uint8Array(await clip.arrayBuffer()));
    });
    if (bytes.length < 500) throw new Error('No video frames were captured');
    fs.writeFileSync(path.join(__dirname, 'renewal.webm'), Buffer.from(bytes));
    console.log(`Wrote ${bytes.length} bytes of deterministic test video`);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
