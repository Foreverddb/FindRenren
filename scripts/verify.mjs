import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outputDirectory = path.join(root, 'verification');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = process.env.APP_URL || 'http://127.0.0.1:4173/';

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const consoleErrors = [];
const remoteModelRequests = [];
const modelRequestStartedAt = { low: 0, high: 0 };
const cutoutRequestedAt = { low: 0, high: 0 };

function createModelGate() {
  let releaseRequest;
  let signalRequestStarted;
  let released = false;
  const requestGate = new Promise((resolve) => { releaseRequest = resolve; });
  const requestStarted = new Promise((resolve) => { signalRequestStarted = resolve; });
  return {
    requestGate,
    requestStarted,
    signalRequestStarted,
    release() {
      if (released) return;
      released = true;
      releaseRequest();
    },
  };
}

const modelGates = { low: createModelGate(), high: createModelGate() };
const modelGateTimeout = setTimeout(() => {
  modelGates.low.release();
  modelGates.high.release();
}, 120000);
desktop.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
desktop.on('pageerror', (error) => consoleErrors.push(error.message));
desktop.on('request', (request) => {
  if (/huggingface\.co|hf\.co|hf-mirror/i.test(request.url())) remoteModelRequests.push(request.url());
});
await desktop.route('**/models/onnx-community/BEN2-ONNX/onnx/model_fp16.onnx', async (route) => {
  if (!modelRequestStartedAt.high) {
    modelRequestStartedAt.high = Date.now();
    modelGates.high.signalRequestStarted();
  }
  await modelGates.high.requestGate;
  await route.continue();
});
await desktop.route('**/models/Xenova/modnet/onnx/model_quantized.onnx', async (route) => {
  if (!modelRequestStartedAt.low) {
    modelRequestStartedAt.low = Date.now();
    modelGates.low.signalRequestStarted();
  }
  await modelGates.low.requestGate;
  await route.continue();
});

await desktop.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await desktop.locator('#loadingState').waitFor({ state: 'hidden' });
await Promise.race([
  Promise.all([modelGates.low.requestStarted, modelGates.high.requestStarted]),
  new Promise((_, reject) => setTimeout(() => reject(new Error('页面进入后未同时开始静默加载高、低质量模型')), 15000)),
]);

const editorReadyWhileModelPreloading = await desktop.locator('#loadingState').isHidden()
  && await desktop.locator('#colorPicker').isEnabled()
  && (await desktop.locator('#portraitSection').getAttribute('data-model-state-low')) === 'loading'
  && (await desktop.locator('#portraitSection').getAttribute('data-model-state-high')) === 'loading';
const modelProgressSilentDuringPreload = await desktop.locator('#portraitModelProgress').isHidden();
const highQualityDefault = await desktop.locator('[data-portrait-quality="high"]').getAttribute('aria-pressed') === 'true'
  && await desktop.locator('[data-portrait-quality="low"]').getAttribute('aria-pressed') === 'false'
  && await desktop.locator('#portraitQualityRow').isHidden();
if (!editorReadyWhileModelPreloading) throw new Error('模型静默加载期间编辑器主流程未保持可用');
if (!modelProgressSilentDuringPreload) throw new Error('静默预加载阶段错误地显示了模型进度条');
if (!highQualityDefault) throw new Error('人物抠图未默认选择高质量');

const samplePoints = {
  glowStick: [215, 280],
  scarf: [365, 575],
  body: [380, 850],
  sign: [330, 1035],
  portrait: [590, 750],
  beak: [590, 480],
  blackBody: [590, 300],
};

async function readSamples() {
  return desktop.locator('#editorCanvas').evaluate((canvas, points) => {
    const context = canvas.getContext('2d');
    return Object.fromEntries(Object.entries(points).map(([name, [x, y]]) => {
      const data = context.getImageData(x, y, 1, 1).data;
      return [name, [data[0], data[1], data[2], data[3]]];
    }));
  }, samplePoints);
}

async function hashCanvasRegion(x, y, width, height) {
  return desktop.locator('#editorCanvas').evaluate((canvas, region) => {
    const context = canvas.getContext('2d');
    const data = context.getImageData(region.x, region.y, region.width, region.height).data;
    let hash = 2166136261;
    for (let index = 0; index < data.length; index += 13) {
      hash ^= data[index];
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }, { x, y, width, height });
}

async function readCanvasRegionPixels(x, y, width, height) {
  return desktop.locator('#editorCanvas').evaluate((canvas, region) => {
    const context = canvas.getContext('2d');
    return Array.from(context.getImageData(region.x, region.y, region.width, region.height).data);
  }, { x, y, width, height });
}

async function measureCurvedLogoText(referencePixels) {
  return desktop.locator('#editorCanvas').evaluate((canvas, payload) => {
    const { region, reference } = payload;
    const context = canvas.getContext('2d');
    const current = context.getImageData(region.x, region.y, region.width, region.height).data;
    const splitX = region.x + region.width / 2;
    const points = [];

    for (let y = 0; y < region.height; y += 1) {
      for (let x = 0; x < region.width; x += 1) {
        const index = (y * region.width + x) * 4;
        const delta = Math.abs(current[index] - reference[index])
          + Math.abs(current[index + 1] - reference[index + 1])
          + Math.abs(current[index + 2] - reference[index + 2]);
        if (delta >= 18) points.push([region.x + x, region.y + y]);
      }
    }

    if (points.length === 0) return null;
    const summarize = (subset) => ({
      pixels: subset.length,
      centerY: subset.reduce((sum, point) => sum + point[1], 0) / subset.length,
    });
    const left = points.filter((point) => point[0] < splitX);
    const right = points.filter((point) => point[0] >= splitX);
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);

    return {
      pixels: points.length,
      bounds: {
        left: Math.min(...xs),
        right: Math.max(...xs),
        top: Math.min(...ys),
        bottom: Math.max(...ys),
      },
      left: summarize(left),
      right: summarize(right),
      rise: summarize(left).centerY - summarize(right).centerY,
    };
  }, {
    region: { x: 590, y: 505, width: 280, height: 126 },
    reference: referencePixels,
  });
}

async function readSignatureBounds() {
  return desktop.locator('#editorCanvas').evaluate((canvas) => {
    const context = canvas.getContext('2d');
    const area = { x: 540, y: 912, width: 170, height: 56 };
    const data = context.getImageData(area.x, area.y, area.width, area.height).data;
    const rows = [];

    for (let y = 0; y < area.height; y += 1) {
      let count = 0;
      for (let x = 0; x < area.width; x += 1) {
        const index = (y * area.width + x) * 4;
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        if (red >= 65 && red <= 175 && green >= 55 && green <= 160 && blue <= 125 && green - blue >= 8) {
          count += 1;
        }
      }
      if (count >= 2 && count < 90) rows.push(area.y + y);
    }

    if (rows.length === 0) return null;
    const top = Math.min(...rows);
    const bottom = Math.max(...rows);
    return { top, bottom, center: (top + bottom) / 2 };
  });
}

async function readPortraitFrameSmoothness() {
  return desktop.locator('#editorCanvas').evaluate((canvas) => {
    const context = canvas.getContext('2d');
    const isWarmFrame = (x, y) => {
      const [red, green, blue] = context.getImageData(x, y, 1, 1).data;
      return red >= 195 && green >= 165 && blue >= 112 && red >= green && green >= blue;
    };
    const summarizeLine = (points) => {
      let warm = 0;
      let gap = 0;
      let maximumGap = 0;
      points.forEach(([x, y]) => {
        if (isWarmFrame(x, y)) {
          warm += 1;
          gap = 0;
        } else {
          gap += 1;
          maximumGap = Math.max(maximumGap, gap);
        }
      });
      return { coverage: warm / points.length, maximumGap };
    };
    const ranges = {
      top: Array.from({ length: 215 }, (_, index) => [495 + index, 646]),
      left: Array.from({ length: 230 }, (_, index) => [477, 666 + index]),
      right: Array.from({ length: 230 }, (_, index) => [727, 666 + index]),
    };
    const lines = Object.fromEntries(Object.entries(ranges).map(([name, points]) => [name, summarizeLine(points)]));
    const matte = [244, 232, 203];
    const cornerStarts = [642, 646, 650, 654, 658].map((y) => {
      for (let x = 464; x <= 500; x += 1) {
        const pixel = context.getImageData(x, y, 1, 1).data;
        const delta = Math.abs(pixel[0] - matte[0])
          + Math.abs(pixel[1] - matte[1])
          + Math.abs(pixel[2] - matte[2]);
        if (delta <= 3) return x;
      }
      return null;
    });
    const completeCurve = cornerStarts.every((value) => value !== null);
    const curveSpan = completeCurve ? cornerStarts[0] - cornerStarts[cornerStarts.length - 1] : 0;
    const monotonicCurve = completeCurve
      && cornerStarts.slice(1).every((value, index) => value <= cornerStarts[index] + 1);

    return {
      lines,
      minimumCoverage: Math.min(...Object.values(lines).map((line) => line.coverage)),
      maximumGap: Math.max(...Object.values(lines).map((line) => line.maximumGap)),
      cornerStarts,
      curveSpan,
      monotonicCurve,
    };
  });
}

async function saveCanvasRegion(fileName, region) {
  const dataUrl = await desktop.locator('#editorCanvas').evaluate((canvas, area) => {
    const crop = document.createElement('canvas');
    crop.width = area.width;
    crop.height = area.height;
    crop.getContext('2d').drawImage(canvas, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
    return crop.toDataURL('image/png');
  }, region);
  await writeFile(path.join(outputDirectory, fileName), Buffer.from(dataUrl.split(',')[1], 'base64'));
}

async function readPortraitPreviewAlphaStats() {
  return desktop.locator('#portraitPreview').evaluate((image) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    let soft = 0;
    let opaque = 0;

    for (let index = 3; index < pixels.length; index += 4) {
      const alpha = pixels[index];
      if (alpha <= 8) transparent += 1;
      else if (alpha >= 247) opaque += 1;
      else soft += 1;
    }

    const readAlpha = ([normalizedX, normalizedY]) => {
      const x = Math.min(canvas.width - 1, Math.round(normalizedX * (canvas.width - 1)));
      const y = Math.min(canvas.height - 1, Math.round(normalizedY * (canvas.height - 1)));
      return pixels[(y * canvas.width + x) * 4 + 3];
    };
    const transparentSamples = [[0.04, 0.04], [0.06, 0.46], [0.96, 0.04]].map(readAlpha);
    const opaqueSamples = [[0.58, 0.43], [0.3, 0.78], [0.91, 0.72]].map(readAlpha);
    const total = canvas.width * canvas.height;

    return {
      width: canvas.width,
      height: canvas.height,
      transparent,
      soft,
      opaque,
      transparentRatio: transparent / total,
      softRatio: soft / total,
      opaqueRatio: opaque / total,
      transparentSamples,
      opaqueSamples,
      transparentMaximum: Math.max(...transparentSamples),
      opaqueMinimum: Math.min(...opaqueSamples),
    };
  });
}

async function savePortraitPreview(fileName) {
  const dataUrl = await desktop.locator('#portraitPreview').evaluate((image) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas.toDataURL('image/png');
  });
  await writeFile(path.join(outputDirectory, fileName), Buffer.from(dataUrl.split(',')[1], 'base64'));
}

async function readPortraitOutsideHashes() {
  return {
    left: await hashCanvasRegion(452, 680, 12, 190),
    right: await hashCanvasRegion(744, 680, 12, 190),
    top: await hashCanvasRegion(510, 621, 185, 8),
    bottom: await hashCanvasRegion(510, 978, 185, 8),
  };
}

async function readPortraitBackdropStats() {
  return desktop.locator('#editorCanvas').evaluate((canvas) => {
    const context = canvas.getContext('2d');
    const area = { x: 484, y: 652, width: 236, height: 264 };
    const expected = [244, 232, 203];
    const data = context.getImageData(area.x, area.y, area.width, area.height).data;
    let solidPixels = 0;

    for (let index = 0; index < data.length; index += 4) {
      const delta = Math.abs(data[index] - expected[0])
        + Math.abs(data[index + 1] - expected[1])
        + Math.abs(data[index + 2] - expected[2]);
      if (delta <= 3) solidPixels += 1;
    }

    return {
      expected: '#F4E8CB',
      solidPixels,
      totalPixels: area.width * area.height,
      ratio: solidPixels / (area.width * area.height),
    };
  });
}

await desktop.locator('[data-view="original"]').click();
const originalSamples = await readSamples();

await desktop.locator('#colorPicker').evaluate((picker) => {
  picker.value = '#7651A8';
  picker.dispatchEvent(new Event('input', { bubbles: true }));
});
await desktop.waitForTimeout(120);
const manualColorSynced = (await desktop.locator('#hexInput').inputValue()) === '7651A8';
if (!manualColorSynced) throw new Error('手动调色板与十六进制输入未同步');

await desktop.locator('[data-color="#277F9F"]').click();
await desktop.locator('[data-view="result"]').click();
await desktop.waitForTimeout(120);
const blueSamples = await readSamples();

const deltas = Object.fromEntries(Object.keys(samplePoints).map((name) => {
  const delta = originalSamples[name].slice(0, 3).reduce((sum, channel, index) => {
    return sum + Math.abs(channel - blueSamples[name][index]);
  }, 0);
  return [name, delta];
}));

const changedRegions = ['glowStick', 'scarf', 'body', 'sign'];
for (const region of changedRegions) {
  if (deltas[region] < 20) throw new Error(`${region} 未被可靠替色，通道差值仅为 ${deltas[region]}`);
}
const completeAreaReplacement = changedRegions.every((region) => deltas[region] >= 20);
const regionControlsRemoved = await desktop.locator('#toggleAllButton, [data-region]').count() === 0;
if (!regionControlsRemoved) throw new Error('替换区域选项仍然存在');
for (const region of ['portrait', 'beak', 'blackBody']) {
  if (deltas[region] !== 0) throw new Error(`${region} 不应变化，通道差值为 ${deltas[region]}`);
}

await desktop.locator('#strengthRange').fill('0');
await desktop.waitForTimeout(120);
const zeroStrengthSamples = await readSamples();
const zeroStrengthRestoresOriginal = zeroStrengthSamples.body.slice(0, 3).every((channel, index) => channel === originalSamples.body[index]);
if (!zeroStrengthRestoresOriginal) throw new Error('替换强度归零后未恢复原图像素');
await desktop.locator('#strengthRange').fill('100');
await desktop.waitForTimeout(120);

await desktop.screenshot({ path: path.join(outputDirectory, 'desktop-blue.png'), fullPage: true });

const fixedTextHashBefore = await hashCanvasRegion(350, 997, 140, 136);
const editableTextHashBefore = await hashCanvasRegion(500, 997, 340, 136);
const scarfTextHashBefore = await hashCanvasRegion(450, 554, 158, 76);
const scarfEnglishHashBefore = await hashCanvasRegion(595, 548, 100, 78);
const scarfTopBorderHashBefore = await hashCanvasRegion(448, 538, 247, 8);
const scarfBottomBorderHashBefore = await hashCanvasRegion(448, 622, 247, 8);
const signatureHashBefore = await hashCanvasRegion(533, 901, 176, 62);
await desktop.locator('#captionInput').fill('星河。');
await desktop.locator('#textHexInput').fill('FFD84A');
await desktop.locator('#signatureInput').fill('Luna');
await desktop.waitForTimeout(120);

const fixedTextHashAfter = await hashCanvasRegion(350, 997, 140, 136);
const editableTextHashAfter = await hashCanvasRegion(500, 997, 340, 136);
const scarfTextHashAfter = await hashCanvasRegion(450, 554, 158, 76);
const scarfEnglishHashAfter = await hashCanvasRegion(595, 548, 100, 78);
const scarfTopBorderHashAfter = await hashCanvasRegion(448, 538, 247, 8);
const scarfBottomBorderHashAfter = await hashCanvasRegion(448, 622, 247, 8);
const signatureHashAfter = await hashCanvasRegion(533, 901, 176, 62);
const fixedCharacterFrontendRendered = fixedTextHashBefore !== fixedTextHashAfter;
const editableTextChanged = editableTextHashBefore !== editableTextHashAfter;
const scarfTextSynced = scarfTextHashBefore !== scarfTextHashAfter;
const scarfEnglishPreserved = scarfEnglishHashBefore === scarfEnglishHashAfter;
const scarfBordersPreserved = scarfTopBorderHashBefore === scarfTopBorderHashAfter
  && scarfBottomBorderHashBefore === scarfBottomBorderHashAfter;
const signatureChanged = signatureHashBefore !== signatureHashAfter;
const captionValue = await desktop.locator('#captionInput').inputValue();
const fixedPrefixValue = await desktop.locator('.fixed-prefix').textContent();
const fixedPrefixLocked = fixedPrefixValue === '找' && captionValue === '星河。';
const signatureValue = await desktop.locator('#signatureInput').inputValue();
const textColorSynced = (await desktop.locator('#textColorPicker').inputValue()).toUpperCase() === '#FFD84A';
const signatureBounds = await readSignatureBounds();
const signatureVerticallyCentered = signatureBounds
  && signatureBounds.top >= 918
  && signatureBounds.bottom <= 954
  && signatureBounds.center >= 934
  && signatureBounds.center <= 938;

if (!fixedCharacterFrontendRendered) throw new Error('“找”字区域未随前端文字颜色发生变化');
if (!fixedPrefixLocked) throw new Error('编辑栏中的固定“找”字被修改或混入了输入值');
if (!editableTextChanged) throw new Error('修改文字后画布可编辑区域未发生变化');
if (!scarfTextSynced) throw new Error('围脖文字未随底部文字同步变化');
if (!scarfEnglishPreserved) throw new Error('围脖同步文字侵入了英文署名区域');
if (!scarfBordersPreserved) throw new Error('围脖同步文字侵入了上下边线区域');
if (!signatureChanged || signatureValue !== 'Luna') throw new Error('人物署名未正确更新');
if (!signatureVerticallyCentered) throw new Error(`人物署名未在标题栏内垂直居中：${JSON.stringify(signatureBounds)}`);
if (captionValue !== '星河。' || !textColorSynced) throw new Error('文字内容或颜色未正确同步');

await desktop.screenshot({ path: path.join(outputDirectory, 'desktop-synced-text.png'), fullPage: true });

const logoPath = path.join(root, 'public', 'favicon.svg');
const defaultLogoState = await desktop.locator('#logoState').textContent();
const defaultLogoName = await desktop.locator('#logoFileName').textContent();
const defaultLogoText = await desktop.locator('#logoTextInput').inputValue();
const defaultLogoTextMode = await desktop.locator('[data-logo-mode="text"]').getAttribute('aria-pressed');
const defaultLogoImageMode = await desktop.locator('[data-logo-mode="image"]').getAttribute('aria-pressed');
const defaultLogoTextPanelVisible = await desktop.locator('#logoTextPanel').isVisible();
const defaultLogoImagePanelHidden = await desktop.locator('#logoImagePanel').isHidden();
const defaultLogoIsStarHoney = defaultLogoState === '文字 Logo'
  && defaultLogoName === 'StarHoney'
  && defaultLogoText === 'StarHoney'
  && defaultLogoTextMode === 'true'
  && defaultLogoImageMode === 'false'
  && defaultLogoTextPanelVisible
  && defaultLogoImagePanelHidden;
if (!defaultLogoIsStarHoney) throw new Error('围脖 Logo 首次加载时未默认选中文字 StarHoney');

const logoHashBefore = await hashCanvasRegion(590, 505, 280, 126);
const logoLeftHashBefore = await hashCanvasRegion(590, 540, 120, 88);
const logoRightHashBefore = await hashCanvasRegion(710, 505, 160, 117);
await desktop.locator('#logoInput').setInputFiles(logoPath);
await desktop.waitForTimeout(160);
const logoHashAfter = await hashCanvasRegion(590, 505, 280, 126);
const logoLeftHashAfter = await hashCanvasRegion(590, 540, 120, 88);
const logoRightHashAfter = await hashCanvasRegion(710, 505, 160, 117);
const logoImageCoversExpandedArea = logoLeftHashBefore !== logoLeftHashAfter
  && logoRightHashBefore !== logoRightHashAfter;
const logoUploadWorks = logoHashBefore !== logoHashAfter
  && logoImageCoversExpandedArea
  && (await desktop.locator('#logoState').textContent()) === '自定义图片'
  && (await desktop.locator('#logoFileName').textContent()) === 'favicon.svg';
if (!logoUploadWorks) throw new Error('自定义围脖 Logo 未正确载入或绘制');

await desktop.screenshot({ path: path.join(outputDirectory, 'desktop-custom-logo.png'), fullPage: true });

await desktop.locator('#logoResetButton').click();
await desktop.waitForTimeout(160);
const logoHashRestored = await hashCanvasRegion(590, 505, 280, 126);
const logoRestoreWorks = logoHashRestored === logoHashBefore
  && (await desktop.locator('#logoState').textContent()) === '文字 Logo'
  && (await desktop.locator('#logoFileName').textContent()) === 'StarHoney'
  && (await desktop.locator('#logoTextInput').inputValue()) === 'StarHoney'
  && (await desktop.locator('[data-logo-mode="text"]').getAttribute('aria-pressed')) === 'true'
  && await desktop.locator('#logoResetButton').isDisabled();
if (!logoRestoreWorks) throw new Error('围脖 Logo 单独恢复后未还原默认文字 StarHoney');

await desktop.locator('[data-logo-mode="text"]').click();
await desktop.locator('#logoTextInput').fill('');
await desktop.waitForTimeout(160);
const logoTextBackgroundPixels = await readCanvasRegionPixels(590, 505, 280, 126);
await desktop.locator('#logoTextInput').fill('Moonlight');
await desktop.waitForTimeout(160);
const logoTextGeometry = await measureCurvedLogoText(logoTextBackgroundPixels);
const logoTextModeWorks = (await desktop.locator('#logoState').textContent()) === '文字 Logo'
  && (await desktop.locator('#logoFileName').textContent()) === 'Moonlight';
const logoTextFollowsScarf = logoTextGeometry
  && logoTextGeometry.left.pixels >= 80
  && logoTextGeometry.right.pixels >= 80
  && logoTextGeometry.rise >= 12
  && logoTextGeometry.bounds.left >= 598
  && logoTextGeometry.bounds.right <= 860
  && logoTextGeometry.bounds.top >= 515
  && logoTextGeometry.bounds.bottom <= 622;
if (!logoTextModeWorks) throw new Error('围脖文字 Logo 模式或内容未正确同步');
if (!logoTextFollowsScarf) throw new Error(`围脖文字 Logo 未沿围脖曲线安全排版：${JSON.stringify(logoTextGeometry)}`);

await desktop.waitForTimeout(1900);
await desktop.evaluate(() => window.scrollTo(0, 0));
await desktop.screenshot({ path: path.join(outputDirectory, 'desktop-custom-text-logo.png'), fullPage: true });

await desktop.locator('[data-logo-mode="image"]').click();
await desktop.waitForTimeout(160);
const logoImageModeRestoresOriginal = await hashCanvasRegion(590, 505, 280, 126) !== logoHashBefore
  && (await desktop.locator('#logoState').textContent()) === '原始图片';
if (!logoImageModeRestoresOriginal) throw new Error('由文字 Logo 返回图片模式后未恢复原始围脖图案');

await desktop.locator('#logoInput').setInputFiles(logoPath);
await desktop.waitForTimeout(160);

const portraitPath = path.join(outputDirectory, 'portrait-test-source.png');
const portraitHashBefore = await hashCanvasRegion(470, 638, 264, 294);
const portraitOutsideHashesBefore = await readPortraitOutsideHashes();
await desktop.locator('#portraitInput').setInputFiles(portraitPath);
await desktop.waitForTimeout(180);

const portraitFullHash = await hashCanvasRegion(470, 638, 264, 294);
const portraitFrameSmoothnessInFull = await readPortraitFrameSmoothness();
const portraitOutsideHashesInFull = await readPortraitOutsideHashes();
const portraitFullBackdrop = await readPortraitBackdropStats();
const portraitFullReplaceWorks = portraitFullHash !== portraitHashBefore
  && (await desktop.locator('#portraitState').textContent()) === '完整图片'
  && (await desktop.locator('#portraitFileName').textContent()) === 'portrait-test-source.png';
const portraitFrameSmoothInFull = portraitFrameSmoothnessInFull.minimumCoverage >= 0.96
  && portraitFrameSmoothnessInFull.maximumGap <= 3
  && portraitFrameSmoothnessInFull.curveSpan >= 8
  && portraitFrameSmoothnessInFull.monotonicCurve;
const portraitFullStrictlyClipped = JSON.stringify(portraitOutsideHashesInFull) === JSON.stringify(portraitOutsideHashesBefore);
const portraitFullHasSolidMatte = portraitFullBackdrop.solidPixels >= 200;
await desktop.waitForTimeout(1900);
await desktop.evaluate(() => window.scrollTo(0, 0));
await desktop.screenshot({ path: path.join(outputDirectory, 'desktop-portrait-full.png'), fullPage: true });
await saveCanvasRegion('portrait-frame-full-detail.png', { x: 430, y: 610, width: 344, height: 380 });
if (!portraitFullReplaceWorks) throw new Error('完整人物图片未正确嵌入人物框');
if (!portraitFrameSmoothInFull) throw new Error(`完整人物相框曲线不连续：${JSON.stringify(portraitFrameSmoothnessInFull)}`);
if (!portraitFullStrictlyClipped) throw new Error('完整人物图片越过人物边框安全范围');
if (!portraitFullHasSolidMatte) throw new Error(`完整人物图片周围未保留纯色边框底：${JSON.stringify(portraitFullBackdrop)}`);

cutoutRequestedAt.high = Date.now();
await desktop.locator('[data-portrait-mode="cutout"]').click();
await desktop.locator('#portraitModelProgress').waitFor({ state: 'visible' });
const highProgressBeforeRelease = Number(await desktop.locator('#portraitModelProgress').getAttribute('aria-valuenow'));
const highProgressVisibleOnDemand = await desktop.locator('#portraitModelProgress').isVisible()
  && (await desktop.locator('#portraitProgress').textContent()).startsWith('高质量模型')
  && await desktop.locator('#portraitQualityRow').isVisible();
const highModelPreloadStartedBeforeCutout = modelRequestStartedAt.high > 0
  && modelRequestStartedAt.high < cutoutRequestedAt.high;
if (!highProgressVisibleOnDemand) throw new Error('请求高质量抠图时未显示对应模型进度');
if (!highModelPreloadStartedBeforeCutout) throw new Error('高质量模型未在抠图前开始静默预载');

await desktop.screenshot({ path: path.join(outputDirectory, 'desktop-model-loading-high.png'), fullPage: true });
modelGates.high.release();
try {
  await desktop.waitForFunction(() => {
    const progress = document.querySelector('#portraitProgress');
    return progress?.textContent === '抠图完成' || Boolean(progress?.dataset.error);
  }, null, { timeout: 300000 });
} catch (error) {
  const stalledProgress = await desktop.locator('#portraitProgress').textContent();
  const stalledError = await desktop.locator('#portraitProgress').getAttribute('data-error');
  throw new Error(`BEN2 等待超时：${JSON.stringify({ stalledProgress, stalledError, consoleErrors })}`, { cause: error });
}
const highCutoutError = await desktop.locator('#portraitProgress').getAttribute('data-error');
if (highCutoutError) throw new Error(`BEN2 高质量抠图失败：${highCutoutError}`);
const highProgressAfterReady = Number(await desktop.locator('#portraitModelProgress').getAttribute('aria-valuenow'));
const highProgressAdvanced = highProgressAfterReady > highProgressBeforeRelease;
const highProgressHiddenAfterReady = await desktop.locator('#portraitModelProgress').isHidden();
const highModelState = await desktop.locator('#portraitSection').getAttribute('data-model-state-high');
const portraitHighCutoutHash = await hashCanvasRegion(470, 638, 264, 294);
const portraitFrameSmoothnessInHigh = await readPortraitFrameSmoothness();
const portraitOutsideHashesInHigh = await readPortraitOutsideHashes();
const portraitHighBackdrop = await readPortraitBackdropStats();
await desktop.waitForFunction(() => {
  const preview = document.querySelector('#portraitPreview');
  return preview?.complete && preview.naturalWidth > 0;
}, null, { timeout: 30000 });
const portraitHighCutoutAlpha = await readPortraitPreviewAlphaStats();
const portraitHighCutoutAlphaQuality = portraitHighCutoutAlpha.width === 1359
  && portraitHighCutoutAlpha.height === 1359
  && portraitHighCutoutAlpha.transparentRatio >= 0.15
  && portraitHighCutoutAlpha.opaqueRatio >= 0.3
  && portraitHighCutoutAlpha.softRatio >= 0.001
  && portraitHighCutoutAlpha.softRatio <= 0.15
  && portraitHighCutoutAlpha.transparentMaximum <= 24
  && portraitHighCutoutAlpha.opaqueMinimum >= 230;
const portraitHighCutoutWorks = portraitHighCutoutHash !== portraitFullHash
  && (await desktop.locator('#portraitState').textContent()) === '智能抠图'
  && (await desktop.locator('#portraitProgress').textContent()) === '抠图完成';
const portraitFrameSmoothInHigh = portraitFrameSmoothnessInHigh.minimumCoverage >= 0.96
  && portraitFrameSmoothnessInHigh.maximumGap <= 3
  && portraitFrameSmoothnessInHigh.curveSpan >= 8
  && portraitFrameSmoothnessInHigh.monotonicCurve;
const portraitHighStrictlyClipped = JSON.stringify(portraitOutsideHashesInHigh) === JSON.stringify(portraitOutsideHashesBefore);
const portraitHighHasSolidBackground = portraitHighBackdrop.ratio >= 0.12;
const portraitModelSelfHosted = remoteModelRequests.length === 0;
if (!portraitHighCutoutWorks) throw new Error('BEN2 高质量抠图未正确生成透明人物层');
if (!portraitHighCutoutAlphaQuality) throw new Error(`BEN2 抠图透明度质量未达标：${JSON.stringify(portraitHighCutoutAlpha)}`);
if (!portraitFrameSmoothInHigh) throw new Error(`高质量抠图相框曲线不连续：${JSON.stringify(portraitFrameSmoothnessInHigh)}`);
if (!portraitHighStrictlyClipped) throw new Error('高质量抠图人物越过人物边框安全范围');
if (!portraitHighHasSolidBackground) throw new Error(`高质量抠图背景不是稳定纯色：${JSON.stringify(portraitHighBackdrop)}`);
if (!portraitModelSelfHosted) throw new Error(`抠图模型仍访问外部地址：${remoteModelRequests.join(' | ')}`);
if (!highProgressAdvanced || highProgressAfterReady !== 100) throw new Error('高质量模型进度未推进到 100%');
if (!highProgressHiddenAfterReady || highModelState !== 'ready') throw new Error('高质量模型就绪后进度条未收起或状态未更新');

await desktop.waitForTimeout(1900);
await desktop.evaluate(() => window.scrollTo(0, 0));
await desktop.screenshot({ path: path.join(outputDirectory, 'desktop-portrait-cutout-high.png'), fullPage: true });
await saveCanvasRegion('portrait-frame-cutout-high.png', { x: 430, y: 610, width: 344, height: 380 });
await saveCanvasRegion('portrait-frame-cutout-detail.png', { x: 430, y: 610, width: 344, height: 380 });
await savePortraitPreview('portrait-cutout-ben2.png');

cutoutRequestedAt.low = Date.now();
await desktop.locator('[data-portrait-quality="low"]').click();
await desktop.locator('#portraitModelProgress').waitFor({ state: 'visible' });
const lowProgressBeforeRelease = Number(await desktop.locator('#portraitModelProgress').getAttribute('aria-valuenow'));
const lowProgressVisibleOnDemand = await desktop.locator('#portraitModelProgress').isVisible()
  && (await desktop.locator('#portraitProgress').textContent()).startsWith('低质量模型');
const lowModelPreloadStartedBeforeCutout = modelRequestStartedAt.low > 0
  && modelRequestStartedAt.low < cutoutRequestedAt.low;
if (!lowProgressVisibleOnDemand) throw new Error('请求低质量抠图时未显示对应模型进度');
if (!lowModelPreloadStartedBeforeCutout) throw new Error('低质量模型未在抠图前开始静默预载');
await desktop.screenshot({ path: path.join(outputDirectory, 'desktop-model-loading-low.png'), fullPage: true });
modelGates.low.release();
clearTimeout(modelGateTimeout);
try {
  await desktop.waitForFunction(() => {
    const progress = document.querySelector('#portraitProgress');
    return progress?.textContent === '抠图完成' || Boolean(progress?.dataset.error);
  }, null, { timeout: 300000 });
} catch (error) {
  const stalledProgress = await desktop.locator('#portraitProgress').textContent();
  const stalledError = await desktop.locator('#portraitProgress').getAttribute('data-error');
  throw new Error(`MODNet 等待超时：${JSON.stringify({ stalledProgress, stalledError, consoleErrors })}`, { cause: error });
}
const lowCutoutError = await desktop.locator('#portraitProgress').getAttribute('data-error');
if (lowCutoutError) throw new Error(`MODNet 低质量抠图失败：${lowCutoutError}`);
const lowProgressAfterReady = Number(await desktop.locator('#portraitModelProgress').getAttribute('aria-valuenow'));
const lowProgressAdvanced = lowProgressAfterReady > lowProgressBeforeRelease;
const lowProgressHiddenAfterReady = await desktop.locator('#portraitModelProgress').isHidden();
const lowModelState = await desktop.locator('#portraitSection').getAttribute('data-model-state-low');
const portraitLowCutoutHash = await hashCanvasRegion(470, 638, 264, 294);
const portraitFrameSmoothnessInLow = await readPortraitFrameSmoothness();
const portraitOutsideHashesInLow = await readPortraitOutsideHashes();
const portraitLowBackdrop = await readPortraitBackdropStats();
await desktop.waitForFunction(() => {
  const preview = document.querySelector('#portraitPreview');
  return preview?.complete && preview.naturalWidth > 0;
}, null, { timeout: 30000 });
const portraitLowCutoutAlpha = await readPortraitPreviewAlphaStats();
const portraitLowCutoutAlphaQuality = portraitLowCutoutAlpha.width === 1359
  && portraitLowCutoutAlpha.height === 1359
  && portraitLowCutoutAlpha.transparentRatio >= 0.1
  && portraitLowCutoutAlpha.opaqueRatio >= 0.2
  && portraitLowCutoutAlpha.transparentMaximum <= 40;
const portraitLowCutoutWorks = portraitLowCutoutHash !== portraitFullHash
  && portraitLowCutoutHash !== portraitHighCutoutHash
  && (await desktop.locator('#portraitProgress').textContent()) === '抠图完成';
const portraitFrameSmoothInLow = portraitFrameSmoothnessInLow.minimumCoverage >= 0.96
  && portraitFrameSmoothnessInLow.maximumGap <= 3
  && portraitFrameSmoothnessInLow.curveSpan >= 8
  && portraitFrameSmoothnessInLow.monotonicCurve;
const portraitLowStrictlyClipped = JSON.stringify(portraitOutsideHashesInLow) === JSON.stringify(portraitOutsideHashesBefore);
const portraitLowHasSolidBackground = portraitLowBackdrop.ratio >= 0.12;
if (!portraitLowCutoutWorks) throw new Error('MODNet 低质量抠图未正确生成独立透明人物层');
if (!portraitLowCutoutAlphaQuality) throw new Error(`MODNet 抠图透明度未达标：${JSON.stringify(portraitLowCutoutAlpha)}`);
if (!portraitFrameSmoothInLow) throw new Error(`低质量抠图相框曲线不连续：${JSON.stringify(portraitFrameSmoothnessInLow)}`);
if (!portraitLowStrictlyClipped) throw new Error('低质量抠图人物越过人物边框安全范围');
if (!portraitLowHasSolidBackground) throw new Error(`低质量抠图背景不是稳定纯色：${JSON.stringify(portraitLowBackdrop)}`);
if (!lowProgressAdvanced || lowProgressAfterReady !== 100) throw new Error('低质量模型进度未推进到 100%');
if (!lowProgressHiddenAfterReady || lowModelState !== 'ready') throw new Error('低质量模型就绪后进度条未收起或状态未更新');

await desktop.waitForTimeout(300);
await desktop.evaluate(() => window.scrollTo(0, 0));
await desktop.screenshot({ path: path.join(outputDirectory, 'desktop-portrait-cutout-low.png'), fullPage: true });
await saveCanvasRegion('portrait-frame-cutout-low.png', { x: 430, y: 610, width: 344, height: 380 });
await savePortraitPreview('portrait-cutout-modnet.png');

await desktop.locator('[data-portrait-quality="high"]').click();
await desktop.waitForTimeout(80);
const cachedHighHash = await hashCanvasRegion(470, 638, 264, 294);
await desktop.locator('[data-portrait-quality="low"]').click();
await desktop.waitForTimeout(80);
const cachedLowHash = await hashCanvasRegion(470, 638, 264, 294);
const portraitCachedQualitySwitch = cachedHighHash === portraitHighCutoutHash
  && cachedLowHash === portraitLowCutoutHash
  && await desktop.locator('#portraitModelProgress').isHidden()
  && (await desktop.locator('#portraitProgress').textContent()) === '抠图完成';
if (!portraitCachedQualitySwitch) throw new Error('高低质量切换未复用各自的抠图结果');

await desktop.locator('[data-portrait-mode="full"]').click();
const portraitFullSwitchStatus = await desktop.locator('#portraitProgress').textContent();
await desktop.locator('[data-portrait-mode="cutout"]').click();
await desktop.waitForTimeout(80);
const portraitCachedModeSwitch = portraitFullSwitchStatus === '完整图片'
  && (await desktop.locator('#portraitProgress').textContent()) === '抠图完成';
if (!portraitCachedModeSwitch) throw new Error('人物模式切换未复用已完成的抠图结果');

const safeEdgeHashBefore = await hashCanvasRegion(864, 997, 10, 136);
await desktop.locator('#captionInput').fill('永远闪耀发光吧');
await desktop.waitForTimeout(120);
const safeEdgeHashAfter = await hashCanvasRegion(864, 997, 10, 136);
const longTextFits = safeEdgeHashBefore === safeEdgeHashAfter;
if (!longTextFits) throw new Error('较长文字越过了底板右侧安全边界');
await desktop.locator('#captionInput').fill('星河。');
await desktop.waitForTimeout(120);

const downloadPromise = desktop.waitForEvent('download');
await desktop.locator('#downloadButton').click();
const download = await downloadPromise;
const exportPath = path.join(outputDirectory, 'export-custom-design.png');
await download.saveAs(exportPath);

const png = await readFile(exportPath);
const exportWidth = png.readUInt32BE(16);
const exportHeight = png.readUInt32BE(20);
if (exportWidth !== 1176 || exportHeight !== 1224) {
  throw new Error(`导出尺寸错误：${exportWidth} × ${exportHeight}`);
}

await desktop.locator('#portraitResetButton').click();
await desktop.waitForTimeout(160);
const portraitHashRestored = await hashCanvasRegion(470, 638, 264, 294);
const portraitRestoreWorks = portraitHashRestored === portraitHashBefore
  && (await desktop.locator('#portraitState').textContent()) === '原始人物'
  && await desktop.locator('#portraitResetButton').isDisabled();
if (!portraitRestoreWorks) throw new Error('人物单独恢复后未还原原图');

await desktop.locator('#portraitInput').setInputFiles(portraitPath);
await desktop.waitForTimeout(160);

await desktop.locator('#resetButton').click();
const resetCaption = await desktop.locator('#captionInput').inputValue();
const resetTextColor = (await desktop.locator('#textColorPicker').inputValue()).toUpperCase();
const resetSignature = await desktop.locator('#signatureInput').inputValue();
const resetLogoState = await desktop.locator('#logoState').textContent();
const resetLogoName = await desktop.locator('#logoFileName').textContent();
const resetLogoDisabled = await desktop.locator('#logoResetButton').isDisabled();
const resetLogoText = await desktop.locator('#logoTextInput').inputValue();
const resetLogoTextMode = await desktop.locator('[data-logo-mode="text"]').getAttribute('aria-pressed');
const resetLogoImageMode = await desktop.locator('[data-logo-mode="image"]').getAttribute('aria-pressed');
const resetPortraitState = await desktop.locator('#portraitState').textContent();
const resetPortraitName = await desktop.locator('#portraitFileName').textContent();
const resetPortraitDisabled = await desktop.locator('#portraitResetButton').isDisabled();
const resetPortraitHighQuality = await desktop.locator('[data-portrait-quality="high"]').getAttribute('aria-pressed') === 'true'
  && await desktop.locator('[data-portrait-quality="low"]').getAttribute('aria-pressed') === 'false'
  && await desktop.locator('#portraitQualityRow').isHidden();
const textDefaultsRestored = resetCaption === '恋恋。' && resetTextColor === '#FFFFFF' && resetSignature === 'Renren';
if (!textDefaultsRestored) throw new Error('恢复操作未还原默认标题、颜色或人物署名');
const logoDefaultsRestored = resetLogoState === '文字 Logo'
  && resetLogoName === 'StarHoney'
  && resetLogoText === 'StarHoney'
  && resetLogoTextMode === 'true'
  && resetLogoImageMode === 'false'
  && resetLogoDisabled;
if (!logoDefaultsRestored) throw new Error('恢复操作未还原默认围脖 Logo');
const portraitDefaultsRestored = resetPortraitState === '原始人物'
  && resetPortraitName === '原始人物'
  && resetPortraitDisabled
  && resetPortraitHighQuality;
if (!portraitDefaultsRestored) throw new Error('恢复操作未还原默认人物图片');

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await mobile.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await mobile.locator('#loadingState').waitFor({ state: 'hidden' });
await mobile.locator('[data-color="#2F8A66"]').click();
await mobile.waitForTimeout(120);
await mobile.screenshot({ path: path.join(outputDirectory, 'mobile-green.png'), fullPage: true });

const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow !== 0) throw new Error(`移动端存在 ${overflow}px 横向溢出`);
if (consoleErrors.length > 0) throw new Error(`浏览器控制台错误：${consoleErrors.join(' | ')}`);

const report = {
  page: baseUrl,
  desktopViewport: '1440 × 1000',
  mobileViewport: '390 × 844',
  selectedColors: ['#277F9F', '#2F8A66'],
  customCaption: captionValue,
  customTextColor: '#FFD84A',
  customSignature: signatureValue,
  pixelChannelDeltas: deltas,
  manualColorSynced,
  completeAreaReplacement,
  regionControlsRemoved,
  zeroStrengthRestoresOriginal,
  fixedCharacterFrontendRendered,
  fixedPrefixLocked,
  editableTextChanged,
  scarfTextSynced,
  scarfEnglishPreserved,
  scarfBordersPreserved,
  signatureChanged,
  signatureBounds,
  signatureVerticallyCentered,
  textColorSynced,
  textDefaultsRestored,
  customLogo: 'favicon.svg',
  defaultLogo: 'StarHoney',
  defaultLogoIsStarHoney,
  logoUploadWorks,
  logoImageCoversExpandedArea,
  logoRestoreWorks,
  customLogoText: 'Moonlight',
  logoTextModeWorks,
  logoTextFollowsScarf,
  logoTextGeometry,
  logoImageModeRestoresOriginal,
  logoDefaultsRestored,
  customPortrait: 'portrait-test-source.png',
  portraitFullReplaceWorks,
  portraitHighCutoutWorks,
  portraitLowCutoutWorks,
  portraitFrameSmoothInFull,
  portraitFrameSmoothInHigh,
  portraitFrameSmoothInLow,
  portraitFullStrictlyClipped,
  portraitHighStrictlyClipped,
  portraitLowStrictlyClipped,
  portraitFullHasSolidMatte,
  portraitHighHasSolidBackground,
  portraitLowHasSolidBackground,
  portraitFullBackdrop,
  portraitHighBackdrop,
  portraitLowBackdrop,
  portraitOutsideHashesBefore,
  portraitOutsideHashesInFull,
  portraitOutsideHashesInHigh,
  portraitOutsideHashesInLow,
  portraitFrameSmoothnessInFull,
  portraitFrameSmoothnessInHigh,
  portraitFrameSmoothnessInLow,
  portraitCachedQualitySwitch,
  portraitCachedModeSwitch,
  portraitRestoreWorks,
  portraitDefaultsRestored,
  highQualityDefault,
  resetPortraitHighQuality,
  portraitHighCutoutAlpha,
  portraitHighCutoutAlphaQuality,
  portraitLowCutoutAlpha,
  portraitLowCutoutAlphaQuality,
  portraitModels: {
    low: 'Xenova/modnet q8',
    high: 'onnx-community/BEN2-ONNX FP16',
  },
  portraitModelInputs: {
    low: '256 × 256',
    high: '1024 × 1024',
  },
  portraitModelSelfHosted,
  modelRequestStartedAt,
  highModelPreloadStartedBeforeCutout,
  lowModelPreloadStartedBeforeCutout,
  editorReadyWhileModelPreloading,
  modelProgressSilentDuringPreload,
  highProgressVisibleOnDemand,
  lowProgressVisibleOnDemand,
  highProgressBeforeRelease,
  highProgressAfterReady,
  highProgressAdvanced,
  highProgressHiddenAfterReady,
  lowProgressBeforeRelease,
  lowProgressAfterReady,
  lowProgressAdvanced,
  lowProgressHiddenAfterReady,
  highModelState,
  lowModelState,
  remoteModelRequests,
  longTextFits,
  protectedAreasUnchanged: deltas.portrait === 0 && deltas.beak === 0 && deltas.blackBody === 0,
  exportSize: `${exportWidth} × ${exportHeight}`,
  horizontalOverflow: overflow,
  consoleErrors,
};

await writeFile(path.join(outputDirectory, 'results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await browser.close();

console.log(JSON.stringify(report, null, 2));
