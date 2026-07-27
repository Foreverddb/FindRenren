import { createIcons, CircleUserRound, Download, Image as ImageIcon, ImagePlus, LoaderCircle, Maximize2, Monitor, Palette, Pipette, RefreshCw, RotateCcw, ScanFace, Signature, Type, WandSparkles, Wind, X } from 'lucide';
import './style.css';

createIcons({
  icons: { CircleUserRound, Download, Image: ImageIcon, ImagePlus, LoaderCircle, Maximize2, Monitor, Palette, Pipette, RefreshCw, RotateCcw, ScanFace, Signature, Type, WandSparkles, Wind, X },
});

const APP_BASE_URL = new URL(import.meta.env.BASE_URL, window.location.href);
const SOURCE_URL = new URL('assets/penguin-original.png', APP_BASE_URL).href;
const DEFAULT_COLOR = '#DC5F86';
const DEFAULT_CAPTION = '恋恋。';
const DEFAULT_TEXT_COLOR = '#FFFFFF';
const DEFAULT_SIGNATURE = 'Renren';
const DEFAULT_LOGO_TEXT = 'StarHoney';
const BASE_PINK = { h: 343 / 360, s: 0.58, l: 0.73 };
const CAPTION_AREA = {
  patchX: 350,
  patchY: 991,
  patchWidth: 494,
  patchHeight: 143,
  textureX: 319,
  textureWidth: 38,
  textX: 366,
  baseline: 1109,
  maxWidth: 470,
  fontSize: 112,
  minFontSize: 39,
};
const SCARF_TEXT_AREA = {
  x: 448,
  y: 548,
  width: 146,
  height: 72,
  textX: 456,
  baseline: 612,
  maxWidth: 126,
  fontSize: 54,
  minFontSize: 18,
};
const SCARF_LOGO_AREA = {
  x: 590,
  y: 505,
  width: 280,
  height: 126,
  drawX: 600,
  drawY: 522,
  drawWidth: 252,
  drawHeight: 78,
  curveStartX: 600,
  curveEndX: 858,
};
const SIGNATURE_AREA = {
  x: 533,
  y: 918,
  width: 176,
  height: 50,
  textX: 545,
  centerY: 936,
  verticalOffset: 3,
  maxWidth: 151,
  fontSize: 34,
  minFontSize: 20,
};
const PORTRAIT_INNER_AREA = {
  x: 484,
  y: 652,
  width: 236,
  height: 264,
};
const PORTRAIT_CONTENT_AREA = {
  x: 493,
  y: 661,
  width: 218,
  height: 246,
};
const PORTRAIT_FRAME_AREA = {
  x: 470,
  y: 638,
  width: 264,
  height: 294,
};
const PORTRAIT_BACKGROUND_COLOR = '#F4E8CB';
const MAX_PORTRAIT_FILE_SIZE = 20 * 1024 * 1024;
const PORTRAIT_MODELS = {
  low: {
    id: 'Xenova/modnet',
    dtype: 'q8',
    inputSize: 256,
    fileSize: 6632188,
    label: '低质量',
  },
  high: {
    id: 'onnx-community/BEN2-ONNX',
    dtype: 'fp16',
    inputSize: 1024,
    fileSize: 219121675,
    label: '高质量',
  },
};

const state = {
  color: DEFAULT_COLOR,
  caption: DEFAULT_CAPTION,
  textColor: DEFAULT_TEXT_COLOR,
  signature: DEFAULT_SIGNATURE,
  logoMode: 'text',
  logoText: DEFAULT_LOGO_TEXT,
  logoImage: null,
  portraitMode: 'full',
  portraitQuality: 'low',
  portraitFile: null,
  portraitImage: null,
  portraitCutouts: { low: null, high: null },
  portraitCutoutBounds: { low: null, high: null },
  portraitProcessing: false,
  strength: 1,
  view: 'result',
};

const canvas = document.querySelector('#editorCanvas');
const context = canvas.getContext('2d', { willReadFrequently: true });
const colorPicker = document.querySelector('#colorPicker');
const mobileColorButton = document.querySelector('#mobileColorButton');
const mobileColorDialog = document.querySelector('#mobileColorDialog');
const mobileColorCloseButton = document.querySelector('#mobileColorCloseButton');
const mobileColorCancelButton = document.querySelector('#mobileColorCancelButton');
const mobileColorApplyButton = document.querySelector('#mobileColorApplyButton');
const mobileColorPreview = document.querySelector('#mobileColorPreview');
const mobileColorHex = document.querySelector('#mobileColorHex');
const mobileHueRange = document.querySelector('#mobileHueRange');
const mobileHueValue = document.querySelector('#mobileHueValue');
const mobileSaturationRange = document.querySelector('#mobileSaturationRange');
const mobileSaturationValue = document.querySelector('#mobileSaturationValue');
const mobileValueRange = document.querySelector('#mobileValueRange');
const mobileValueValue = document.querySelector('#mobileValueValue');
const hexInput = document.querySelector('#hexInput');
const colorChip = document.querySelector('#colorChip');
const captionInput = document.querySelector('#captionInput');
const textColorPicker = document.querySelector('#textColorPicker');
const textHexInput = document.querySelector('#textHexInput');
const signatureInput = document.querySelector('#signatureInput');
const logoInput = document.querySelector('#logoInput');
const logoUploadButton = document.querySelector('#logoUploadButton');
const logoResetButton = document.querySelector('#logoResetButton');
const logoPreview = document.querySelector('#logoPreview');
const logoThumbnail = document.querySelector('#logoThumbnail');
const logoFileName = document.querySelector('#logoFileName');
const logoState = document.querySelector('#logoState');
const logoImagePanel = document.querySelector('#logoImagePanel');
const logoTextPanel = document.querySelector('#logoTextPanel');
const logoTextInput = document.querySelector('#logoTextInput');
const portraitSection = document.querySelector('#portraitSection');
const portraitInput = document.querySelector('#portraitInput');
const portraitUploadButton = document.querySelector('#portraitUploadButton');
const portraitResetButton = document.querySelector('#portraitResetButton');
const portraitPreview = document.querySelector('#portraitPreview');
const portraitThumbnail = document.querySelector('#portraitThumbnail');
const portraitProcessingIndicator = document.querySelector('#portraitProcessingIndicator');
const portraitFileName = document.querySelector('#portraitFileName');
const portraitState = document.querySelector('#portraitState');
const portraitProgress = document.querySelector('#portraitProgress');
const portraitQualityRow = document.querySelector('#portraitQualityRow');
const portraitModelProgress = document.querySelector('#portraitModelProgress');
const portraitModelProgressFill = document.querySelector('#portraitModelProgressFill');
const portraitModelProgressLabel = document.querySelector('#portraitModelProgressLabel');
const portraitModelProgressBytes = document.querySelector('#portraitModelProgressBytes');
const portraitHighQualityModal = document.querySelector('#portraitHighQualityModal');
const portraitHighQualityModalStatus = document.querySelector('#portraitHighQualityModalStatus');
const portraitHighQualityProgress = document.querySelector('#portraitHighQualityProgress');
const portraitHighQualityProgressFill = document.querySelector('#portraitHighQualityProgressFill');
const strengthRange = document.querySelector('#strengthRange');
const strengthValue = document.querySelector('#strengthValue');
const loadingState = document.querySelector('#loadingState');
const recognitionStatus = document.querySelector('#recognitionStatus');
const statusDot = document.querySelector('.status-dot');
const toast = document.querySelector('#toast');

let originalImageData;
let workingImageData;
let maskStrength;
let scarfInpaintPlan;
let signatureInpaintPlan;
let logoInpaintPlan;
let renderFrame;
let toastTimer;
let recognizedPixels = 0;
let logoObjectUrl;
let portraitObjectUrl;
const portraitCutoutObjectUrls = { low: undefined, high: undefined };
let portraitRequestId = 0;
let portraitModulePromise;
const portraitModelRuntime = Object.fromEntries(Object.keys(PORTRAIT_MODELS).map((quality) => [quality, {
  segmenterPromise: undefined,
  state: 'idle',
  progress: 0,
  loadedBytes: 0,
  totalBytes: PORTRAIT_MODELS[quality].fileSize,
  weightProgressStarted: false,
}]));
let portraitModelRequestedQuality;
let mobileColorOriginal = DEFAULT_COLOR;
let mobileColorDraft = DEFAULT_COLOR;

const image = new Image();
image.decoding = 'async';
image.src = SOURCE_URL;
image.addEventListener('load', initializeEditor);
image.addEventListener('error', () => {
  loadingState.innerHTML = '<span>图片载入失败</span>';
  recognitionStatus.textContent = '载入失败';
});

async function initializeEditor() {
  if (document.fonts) {
    await Promise.allSettled([
      document.fonts.load('48px "Great Vibes Local"', 'StarHoney Renren'),
      document.fonts.load('48px "Ma Shan Zheng Local"', '寻之恋恋找'),
    ]);
  }

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  context.drawImage(image, 0, 0);
  originalImageData = context.getImageData(0, 0, canvas.width, canvas.height);
  workingImageData = context.createImageData(canvas.width, canvas.height);
  maskStrength = new Uint8ClampedArray(canvas.width * canvas.height);

  buildMask();
  scarfInpaintPlan = createInpaintPlan(SCARF_TEXT_AREA, isScarfTextPixel, isScarfBackgroundPixel, 4);
  signatureInpaintPlan = createInpaintPlan(SIGNATURE_AREA, isSignatureTextPixel, isSignatureBackgroundPixel, 6);
  logoInpaintPlan = createInpaintPlan(SCARF_LOGO_AREA, isScarfLogoPixel, isScarfBackgroundPixel, 4);
  bindControls();
  updateThemeColor(state.color);
  updateTextColorControl(state.textColor);
  render();

  loadingState.classList.add('hidden');
  statusDot.classList.add('ready');
  recognitionStatus.textContent = `已识别 ${recognizedPixels.toLocaleString('zh-CN')} 个像素`;
  schedulePortraitModelPreload();
}

function buildMask() {
  const pixels = originalImageData.data;
  const width = canvas.width;
  const height = canvas.height;

  for (let pixelIndex = 0; pixelIndex < maskStrength.length; pixelIndex += 1) {
    const dataIndex = pixelIndex * 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const red = pixels[dataIndex] / 255;
    const green = pixels[dataIndex + 1] / 255;
    const blue = pixels[dataIndex + 2] / 255;
    const { h, s, l } = rgbToHsl(red, green, blue);

    const hueDistance = circularDistance(h, 343 / 360);
    const hueAffinity = 1 - smoothstep(0.035, 0.125, hueDistance);
    const saturationAffinity = smoothstep(0.025, 0.22, s);
    const redDominance = smoothstep(0.005, 0.16, red - Math.max(green, blue));
    const brightnessGuard = smoothstep(0.045, 0.22, l);
    const protectedPortrait = x >= width * 0.41 && x <= width * 0.59 && y >= height * 0.525 && y <= height * 0.765;

    let strength = hueAffinity * saturationAffinity * Math.max(0.55, redDominance) * brightnessGuard;
    if (protectedPortrait) strength = 0;
    if (strength < 0.025) continue;

    const byteStrength = Math.round(Math.min(1, strength) * 255);
    maskStrength[pixelIndex] = byteStrength;

    if (byteStrength >= 20) recognizedPixels += 1;
  }
}

function bindControls() {
  portraitHighQualityModal.addEventListener('cancel', (event) => event.preventDefault());
  colorPicker.addEventListener('input', (event) => setColor(event.target.value));
  mobileColorButton.addEventListener('click', openMobileColorPicker);
  mobileColorCloseButton.addEventListener('click', cancelMobileColorPicker);
  mobileColorCancelButton.addEventListener('click', cancelMobileColorPicker);
  mobileColorApplyButton.addEventListener('click', applyMobileColorDraft);
  mobileColorDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    cancelMobileColorPicker();
  });

  [mobileHueRange, mobileSaturationRange, mobileValueRange].forEach((range) => {
    range.addEventListener('input', syncMobileColorPicker);
  });

  hexInput.addEventListener('input', (event) => {
    const sanitized = event.target.value.replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase();
    event.target.value = sanitized;
    if (sanitized.length === 6) setColor(`#${sanitized}`, { syncHex: false });
  });

  hexInput.addEventListener('blur', () => {
    hexInput.value = state.color.slice(1);
  });

  document.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => setColor(swatch.dataset.color));
  });

  captionInput.addEventListener('input', (event) => {
    state.caption = event.target.value.replace(/[\r\n]/g, '').slice(0, 8);
    if (event.target.value !== state.caption) event.target.value = state.caption;
    scheduleRender();
  });

  signatureInput.addEventListener('input', (event) => {
    state.signature = event.target.value.replace(/[\r\n]/g, '').slice(0, 14);
    if (event.target.value !== state.signature) event.target.value = state.signature;
    scheduleRender();
  });

  document.querySelectorAll('[data-portrait-mode]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (state.portraitProcessing || state.portraitMode === button.dataset.portraitMode) return;
      state.portraitMode = button.dataset.portraitMode;
      syncPortraitModeControls();

      if (state.portraitMode === 'cutout' && state.portraitImage && !state.portraitCutouts[state.portraitQuality]) {
        await preparePortraitCutout();
        return;
      }

      updatePortraitPreview();
      scheduleRender();
    });
  });

  document.querySelectorAll('[data-portrait-quality]').forEach((button) => {
    button.addEventListener('click', async () => {
      const quality = button.dataset.portraitQuality;
      if (state.portraitProcessing || state.portraitQuality === quality) return;

      state.portraitQuality = quality;
      syncPortraitModeControls();
      if (state.portraitMode === 'cutout' && state.portraitImage && !state.portraitCutouts[quality]) {
        await preparePortraitCutout();
        return;
      }

      updatePortraitPreview();
      scheduleRender();
    });
  });

  portraitUploadButton.addEventListener('click', () => portraitInput.click());
  portraitInput.addEventListener('change', async (event) => {
    const [file] = event.target.files;
    if (!file) return;

    try {
      await setCustomPortrait(file);
      if (state.portraitMode === 'full') showToast('人物图片已更新');
    } catch (error) {
      portraitInput.value = '';
      showToast(error instanceof RangeError ? error.message : '人物图片无法读取');
    }
  });
  portraitResetButton.addEventListener('click', () => {
    clearCustomPortrait();
    showToast('已恢复原始人物');
  });

  logoUploadButton.addEventListener('click', () => logoInput.click());
  logoInput.addEventListener('change', async (event) => {
    const [file] = event.target.files;
    if (!file) return;

    try {
      await setCustomLogo(file);
      showToast('Logo 已更新');
    } catch {
      logoInput.value = '';
      showToast('图片无法读取');
    }
  });
  logoResetButton.addEventListener('click', () => {
    clearCustomLogo();
    showToast('已恢复默认 Logo');
  });

  document.querySelectorAll('[data-logo-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      if (state.logoMode === button.dataset.logoMode) return;
      state.logoMode = button.dataset.logoMode;
      syncLogoControls();
      scheduleRender();
    });
  });

  logoTextInput.addEventListener('input', (event) => {
    state.logoText = event.target.value.replace(/[\r\n]/g, '').slice(0, 18);
    if (event.target.value !== state.logoText) event.target.value = state.logoText;
    logoFileName.textContent = state.logoText || '空白文字';
    scheduleRender();
  });

  textColorPicker.addEventListener('input', (event) => setTextColor(event.target.value));

  textHexInput.addEventListener('input', (event) => {
    const sanitized = event.target.value.replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase();
    event.target.value = sanitized;
    if (sanitized.length === 6) setTextColor(`#${sanitized}`, { syncHex: false });
  });

  textHexInput.addEventListener('blur', () => {
    textHexInput.value = state.textColor.slice(1);
  });

  strengthRange.addEventListener('input', (event) => {
    state.strength = Number(event.target.value) / 100;
    strengthValue.value = `${event.target.value}%`;
    updateRangeFill();
    scheduleRender();
  });

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      document.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('active', item === button));
      scheduleRender();
    });
  });

  document.querySelector('#resetButton').addEventListener('click', resetEditor);
  document.querySelector('#downloadButton').addEventListener('click', downloadResult);
}

function openMobileColorPicker() {
  const { r, g, b } = hexToRgb(state.color);
  const { h } = rgbToHsv(r, g, b);
  mobileColorOriginal = state.color;
  mobileHueRange.value = String(Math.round(h));
  mobileSaturationRange.value = '100';
  mobileValueRange.value = '100';
  syncMobileColorPicker({ applyToCanvas: false });
  mobileColorDialog.showModal();
}

function syncMobileColorPicker(options = {}) {
  const hue = Number(mobileHueRange.value);
  const saturation = Number(mobileSaturationRange.value);
  const value = Number(mobileValueRange.value);
  mobileColorDraft = hsvToHex(hue, saturation, value);

  mobileHueValue.value = `${hue}\u00b0`;
  mobileSaturationValue.value = `${saturation}%`;
  mobileValueValue.value = `${value}%`;
  mobileColorHex.textContent = mobileColorDraft;
  mobileColorPreview.style.backgroundColor = mobileColorDraft;
  mobileColorDialog.style.setProperty('--mobile-hue-color', hsvToHex(hue, 100, 100));

  if (options.applyToCanvas !== false) setColor(mobileColorDraft);
}

function applyMobileColorDraft() {
  setColor(mobileColorDraft);
  mobileColorDialog.close();
}

function cancelMobileColorPicker() {
  setColor(mobileColorOriginal);
  mobileColorDialog.close();
}

function setColor(color, options = {}) {
  const normalized = normalizeHex(color);
  if (!normalized) return;

  state.color = normalized;
  colorPicker.value = normalized;
  if (options.syncHex !== false) hexInput.value = normalized.slice(1);
  document.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.classList.toggle('active', swatch.dataset.color.toUpperCase() === normalized);
  });
  updateThemeColor(normalized);
  scheduleRender();
}

function updateThemeColor(color) {
  const { r, g, b } = hexToRgb(color);
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  colorChip.style.backgroundColor = color;
}

function setTextColor(color, options = {}) {
  const normalized = normalizeHex(color);
  if (!normalized) return;

  state.textColor = normalized;
  textColorPicker.value = normalized;
  if (options.syncHex !== false) textHexInput.value = normalized.slice(1);
  updateTextColorControl(normalized);
  scheduleRender();
}

function updateTextColorControl(color) {
  const { r, g, b } = hexToRgb(color);
  const contrast = relativeLuminance(r, g, b) > 0.72 ? '#353940' : '#FFFFFF';
  document.documentElement.style.setProperty('--text-color', color);
  document.documentElement.style.setProperty('--text-picker-contrast', contrast);
}

function scheduleRender() {
  if (renderFrame) cancelAnimationFrame(renderFrame);
  renderFrame = requestAnimationFrame(render);
}

function render() {
  renderFrame = undefined;
  if (!originalImageData) return;

  if (state.view === 'original') {
    context.putImageData(originalImageData, 0, 0);
    return;
  }

  const source = originalImageData.data;
  const output = workingImageData.data;
  const targetRgb = hexToRgb(state.color);
  const target = rgbToHsl(targetRgb.r / 255, targetRgb.g / 255, targetRgb.b / 255);

  for (let pixelIndex = 0; pixelIndex < maskStrength.length; pixelIndex += 1) {
    const dataIndex = pixelIndex * 4;
    const blendAmount = (maskStrength[pixelIndex] / 255) * state.strength;

    if (blendAmount <= 0) {
      output[dataIndex] = source[dataIndex];
      output[dataIndex + 1] = source[dataIndex + 1];
      output[dataIndex + 2] = source[dataIndex + 2];
      output[dataIndex + 3] = source[dataIndex + 3];
      continue;
    }

    const original = rgbToHsl(source[dataIndex] / 255, source[dataIndex + 1] / 255, source[dataIndex + 2] / 255);
    const recoloredLightness = remapLightness(original.l, target.l);
    const recoloredSaturation = Math.min(1, (original.s / BASE_PINK.s) * Math.max(0.035, target.s));
    const recolored = hslToRgb(target.h, recoloredSaturation, recoloredLightness);

    output[dataIndex] = Math.round(lerp(source[dataIndex], recolored.r * 255, blendAmount));
    output[dataIndex + 1] = Math.round(lerp(source[dataIndex + 1], recolored.g * 255, blendAmount));
    output[dataIndex + 2] = Math.round(lerp(source[dataIndex + 2], recolored.b * 255, blendAmount));
    output[dataIndex + 3] = source[dataIndex + 3];
  }

  context.putImageData(workingImageData, 0, 0);
  renderPortrait();
  renderScarfCaption();
  renderScarfLogo();
  renderCaption();
  renderSignature();
}

function renderPortrait() {
  if (!state.portraitImage) return;

  drawPortraitFrameBase();

  context.save();
  clipPortraitInterior();
  context.fillStyle = PORTRAIT_BACKGROUND_COLOR;
  context.fillRect(PORTRAIT_INNER_AREA.x, PORTRAIT_INNER_AREA.y, PORTRAIT_INNER_AREA.width, PORTRAIT_INNER_AREA.height);
  context.restore();

  context.save();
  clipPortraitContent();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  if (state.portraitMode === 'cutout' && state.portraitCutouts[state.portraitQuality]) {
    drawPortraitCutout();
  } else {
    drawImageCover(state.portraitImage, PORTRAIT_CONTENT_AREA, { focusX: 0.5, focusY: 0.42 });
  }

  context.restore();
  drawPortraitFrameFinish();
}

function drawPortraitFrameBase() {
  context.save();
  context.shadowColor = 'rgba(86, 55, 35, 0.18)';
  context.shadowBlur = 5;
  context.shadowOffsetY = 2;
  addRoundedRectPath(
    context,
    PORTRAIT_FRAME_AREA.x,
    PORTRAIT_FRAME_AREA.y,
    PORTRAIT_FRAME_AREA.width,
    PORTRAIT_FRAME_AREA.height,
    22,
  );
  context.fillStyle = PORTRAIT_BACKGROUND_COLOR;
  context.fill();
  context.restore();
}

function drawPortraitFrameFinish() {
  context.save();
  context.lineJoin = 'round';
  context.lineCap = 'round';

  addRoundedRectPath(
    context,
    PORTRAIT_FRAME_AREA.x,
    PORTRAIT_FRAME_AREA.y,
    PORTRAIT_FRAME_AREA.width,
    PORTRAIT_FRAME_AREA.height,
    22,
  );
  context.strokeStyle = '#D5B684';
  context.lineWidth = 6;
  context.stroke();

  addRoundedRectPath(
    context,
    PORTRAIT_INNER_AREA.x,
    PORTRAIT_INNER_AREA.y,
    PORTRAIT_INNER_AREA.width,
    PORTRAIT_INNER_AREA.height,
    17,
  );
  context.strokeStyle = '#FFF9E8';
  context.lineWidth = 3;
  context.stroke();

  addRoundedRectPath(
    context,
    PORTRAIT_CONTENT_AREA.x - 3,
    PORTRAIT_CONTENT_AREA.y - 3,
    PORTRAIT_CONTENT_AREA.width + 6,
    PORTRAIT_CONTENT_AREA.height + 6,
    15,
  );
  context.strokeStyle = '#CFAE78';
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = PORTRAIT_BACKGROUND_COLOR;
  context.strokeStyle = '#D5B684';
  context.lineWidth = 2;

  context.beginPath();
  context.moveTo(448, 898);
  context.quadraticCurveTo(480, 901, 506, 907);
  context.quadraticCurveTo(507, 928, 510, 949);
  context.quadraticCurveTo(480, 944, 451, 940);
  context.quadraticCurveTo(457, 930, 463, 920);
  context.quadraticCurveTo(455, 909, 448, 898);
  context.closePath();
  context.fill();
  context.stroke();

  context.beginPath();
  context.moveTo(756, 898);
  context.quadraticCurveTo(724, 901, 698, 907);
  context.quadraticCurveTo(697, 928, 694, 949);
  context.quadraticCurveTo(724, 944, 753, 940);
  context.quadraticCurveTo(747, 930, 741, 920);
  context.quadraticCurveTo(749, 909, 756, 898);
  context.closePath();
  context.fill();
  context.stroke();

  addRoundedRectPath(context, 486, 906, 232, 60, 14);
  context.fill();
  context.stroke();
  context.restore();
}

function addRoundedRectPath(targetContext, x, y, width, height, radius) {
  const corner = Math.min(radius, width / 2, height / 2);
  targetContext.beginPath();
  targetContext.moveTo(x + corner, y);
  targetContext.lineTo(x + width - corner, y);
  targetContext.quadraticCurveTo(x + width, y, x + width, y + corner);
  targetContext.lineTo(x + width, y + height - corner);
  targetContext.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
  targetContext.lineTo(x + corner, y + height);
  targetContext.quadraticCurveTo(x, y + height, x, y + height - corner);
  targetContext.lineTo(x, y + corner);
  targetContext.quadraticCurveTo(x, y, x + corner, y);
  targetContext.closePath();
}

function clipPortraitInterior() {
  clipRoundedArea(PORTRAIT_INNER_AREA, 17);
}

function clipPortraitContent() {
  clipRoundedArea(PORTRAIT_CONTENT_AREA, 12);
}

function clipRoundedArea(area, radius) {
  addRoundedRectPath(context, area.x, area.y, area.width, area.height, radius);
  context.clip();
}

function drawImageCover(sourceImage, area, { focusX = 0.5, focusY = 0.5 } = {}) {
  const sourceWidth = sourceImage.naturalWidth || sourceImage.width;
  const sourceHeight = sourceImage.naturalHeight || sourceImage.height;
  const scale = Math.max(area.width / sourceWidth, area.height / sourceHeight);
  const cropWidth = area.width / scale;
  const cropHeight = area.height / scale;
  const sourceX = (sourceWidth - cropWidth) * focusX;
  const sourceY = (sourceHeight - cropHeight) * focusY;

  context.drawImage(
    sourceImage,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    area.x,
    area.y,
    area.width,
    area.height,
  );
}

function drawPortraitCutout() {
  const source = state.portraitCutouts[state.portraitQuality];
  const bounds = state.portraitCutoutBounds[state.portraitQuality]
    || { x: 0, y: 0, width: source.width, height: source.height };
  const scale = Math.min(
    (PORTRAIT_CONTENT_AREA.width - 8) / bounds.width,
    (PORTRAIT_CONTENT_AREA.height - 6) / bounds.height,
  ) * 0.98;
  const width = bounds.width * scale;
  const height = bounds.height * scale;
  const x = PORTRAIT_CONTENT_AREA.x + (PORTRAIT_CONTENT_AREA.width - width) / 2;
  const y = PORTRAIT_CONTENT_AREA.y + PORTRAIT_CONTENT_AREA.height - height - 2;

  context.save();
  context.shadowColor = 'rgba(86, 61, 39, 0.16)';
  context.shadowBlur = 2;
  context.shadowOffsetY = 1;
  context.drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height, x, y, width, height);
  context.restore();
}

async function setCustomPortrait(file) {
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
    throw new RangeError('仅支持 PNG、JPEG 或 WebP');
  }
  if (file.size > MAX_PORTRAIT_FILE_SIZE) {
    throw new RangeError('人物图片不能超过 20 MB');
  }

  const objectUrl = URL.createObjectURL(file);
  const customPortrait = new Image();
  customPortrait.decoding = 'async';
  customPortrait.src = objectUrl;

  try {
    await customPortrait.decode();
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }

  portraitRequestId += 1;
  if (portraitObjectUrl) URL.revokeObjectURL(portraitObjectUrl);
  clearPortraitCutoutCache();
  portraitObjectUrl = objectUrl;
  state.portraitFile = file;
  state.portraitImage = customPortrait;
  portraitFileName.textContent = file.name;
  portraitResetButton.disabled = false;
  syncPortraitModeControls();
  updatePortraitPreview();
  scheduleRender();

  if (state.portraitMode === 'cutout') await preparePortraitCutout();
}

async function preparePortraitCutout() {
  if (!state.portraitFile || state.portraitProcessing) return false;

  const requestId = ++portraitRequestId;
  const sourceFile = state.portraitFile;
  const quality = state.portraitQuality;
  const model = PORTRAIT_MODELS[quality];
  const runtime = portraitModelRuntime[quality];
  setPortraitProcessing(true);
  portraitState.textContent = '智能抠图';
  delete portraitProgress.dataset.error;

  if (runtime.state === 'ready') {
    hidePortraitModelProgress();
    portraitProgress.textContent = '正在抠图';
    updateHighQualityModalStatus('正在启动高质量抠图');
  } else {
    showPortraitModelProgress(quality);
  }

  try {
    const transformers = await getPortraitTransformer();
    const segmenter = await getPortraitSegmenter(transformers, quality);
    if (requestId !== portraitRequestId || sourceFile !== state.portraitFile || quality !== state.portraitQuality) return false;

    hidePortraitModelProgress();
    portraitProgress.textContent = '正在抠图';
    updateHighQualityModalStatus('正在进行高质量抠图');
    await waitForUiPaint();
    const rawImage = await transformers.RawImage.fromBlob(sourceFile);
    const output = await withTimeout(segmenter(rawImage), 240000, `${model.label}本地抠图超时`);
    if (requestId !== portraitRequestId || sourceFile !== state.portraitFile || quality !== state.portraitQuality) return false;

    const cutoutCanvas = output.toCanvas();
    const cutoutBlob = await output.toBlob('image/png');
    const cutoutUrl = URL.createObjectURL(cutoutBlob);
    if (requestId !== portraitRequestId || sourceFile !== state.portraitFile || quality !== state.portraitQuality) {
      URL.revokeObjectURL(cutoutUrl);
      return false;
    }

    if (portraitCutoutObjectUrls[quality]) URL.revokeObjectURL(portraitCutoutObjectUrls[quality]);
    portraitCutoutObjectUrls[quality] = cutoutUrl;
    state.portraitCutouts[quality] = cutoutCanvas;
    state.portraitCutoutBounds[quality] = findOpaqueBounds(cutoutCanvas);
    delete portraitProgress.dataset.error;
    portraitProgress.textContent = '抠图完成';
    updatePortraitPreview();
    scheduleRender();
    showToast(`${model.label}抠图已完成`);
    return true;
  } catch (error) {
    if (requestId === portraitRequestId) {
      hidePortraitModelProgress();
      portraitProgress.dataset.error = error instanceof Error ? error.message : String(error);
      state.portraitMode = 'full';
      syncPortraitModeControls();
      portraitProgress.textContent = '已使用完整图片';
      updatePortraitPreview();
      scheduleRender();
      showToast('抠图失败，已使用完整图片');
    }
    return false;
  } finally {
    if (requestId === portraitRequestId) {
      hidePortraitModelProgress();
      setPortraitProcessing(false);
    }
  }
}

function schedulePortraitModelPreload() {
  const startPreload = () => {
    void preloadPortraitModels();
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(startPreload, { timeout: 1500 });
  } else {
    window.setTimeout(startPreload, 400);
  }
}

async function preloadPortraitModels() {
  try {
    const transformers = await getPortraitTransformer();
    await Promise.allSettled(Object.keys(PORTRAIT_MODELS).map((quality) => getPortraitSegmenter(transformers, quality)));
  } catch {
    // Silent preload failures are retried when that quality is requested.
  }
}

async function getPortraitTransformer() {
  if (!portraitModulePromise) {
    portraitModulePromise = import('@huggingface/transformers').then((transformers) => {
      transformers.env.allowLocalModels = true;
      transformers.env.allowRemoteModels = false;
      transformers.env.localModelPath = new URL('models/', APP_BASE_URL).pathname;
      transformers.env.backends.onnx.wasm.numThreads = 1;
      return transformers;
    }).catch((error) => {
      portraitModulePromise = undefined;
      throw error;
    });
  }
  return portraitModulePromise;
}

async function getPortraitSegmenter(transformers, quality) {
  const model = PORTRAIT_MODELS[quality];
  const runtime = portraitModelRuntime[quality];
  if (!runtime.segmenterPromise) {
    setPortraitModelState(quality, 'loading');
    runtime.progress = 0;
    runtime.loadedBytes = 0;
    runtime.totalBytes = model.fileSize;
    runtime.weightProgressStarted = false;
    renderPortraitModelProgress();
    runtime.segmenterPromise = transformers.pipeline('background-removal', model.id, {
      device: 'wasm',
      dtype: model.dtype,
      progress_callback: (progress) => updatePortraitModelProgress(quality, progress),
    }).then((segmenter) => {
      runtime.progress = 100;
      runtime.loadedBytes = runtime.totalBytes;
      setPortraitModelState(quality, 'ready');
      renderPortraitModelProgress();
      return segmenter;
    }).catch((error) => {
      runtime.segmenterPromise = undefined;
      runtime.progress = 0;
      runtime.loadedBytes = 0;
      runtime.totalBytes = model.fileSize;
      setPortraitModelState(quality, 'error');
      renderPortraitModelProgress();
      throw error;
    });
  }
  return runtime.segmenterPromise;
}

function updatePortraitModelProgress(quality, progress) {
  if (progress.status !== 'progress' || !Number.isFinite(progress.progress)) return;

  const runtime = portraitModelRuntime[quality];
  const model = PORTRAIT_MODELS[quality];
  const fileName = typeof progress.file === 'string' ? progress.file : '';
  const callbackProgress = Math.max(0, Math.min(100, progress.progress));
  if (/\.onnx(?:$|\?)/i.test(fileName)) {
    const isFirstWeightProgress = !runtime.weightProgressStarted;
    const callbackTotal = model.fileSize;
    const callbackLoaded = Number.isFinite(progress.loaded) && progress.loaded >= 0
      ? progress.loaded
      : callbackTotal * callbackProgress / 100;
    runtime.weightProgressStarted = true;
    runtime.totalBytes = callbackTotal;
    runtime.loadedBytes = Math.max(runtime.loadedBytes, Math.min(callbackLoaded, callbackTotal));
    const byteProgress = Math.min(100, runtime.loadedBytes / callbackTotal * 100);
    runtime.progress = isFirstWeightProgress ? byteProgress : Math.max(runtime.progress, byteProgress);
  } else if (!runtime.weightProgressStarted) {
    runtime.progress = 0;
  }

  renderPortraitModelProgress();
}

function setPortraitModelState(quality, modelState) {
  portraitModelRuntime[quality].state = modelState;
  portraitSection.setAttribute(`data-model-state-${quality}`, modelState);
  if (quality === state.portraitQuality) portraitSection.dataset.modelState = modelState;
}

function showPortraitModelProgress(quality) {
  portraitModelRequestedQuality = quality;
  portraitModelProgress.hidden = false;
  renderPortraitModelProgress();
}

function hidePortraitModelProgress() {
  portraitModelRequestedQuality = undefined;
  portraitModelProgress.hidden = true;
}

function renderPortraitModelProgress() {
  if (!portraitModelRequestedQuality) return;
  const quality = portraitModelRequestedQuality;
  const model = PORTRAIT_MODELS[quality];
  const runtime = portraitModelRuntime[quality];
  const progress = Math.max(0, Math.min(100, runtime.progress));
  const roundedProgress = Math.round(progress);
  const totalBytes = runtime.totalBytes || model.fileSize;
  const loadedBytes = Math.min(totalBytes, runtime.loadedBytes);
  const byteSummary = `${formatFileSize(loadedBytes)} / ${formatFileSize(totalBytes)}`;
  const downloadComplete = roundedProgress >= 100;

  portraitModelProgress.setAttribute('aria-valuenow', progress.toFixed(2));
  portraitModelProgressFill.style.width = `${progress}%`;
  portraitModelProgressLabel.textContent = downloadComplete ? '模型文件已下载，正在初始化' : '模型文件下载';
  portraitModelProgressBytes.value = byteSummary;
  portraitProgress.textContent = `${model.label}模型 ${roundedProgress}%`;
  if (quality === 'high') {
    portraitHighQualityModalStatus.textContent = downloadComplete
      ? '模型文件已下载，正在初始化高质量模型'
      : `正在下载高质量模型：${byteSummary} · ${roundedProgress}%`;
    setHighQualityModalDeterminateProgress(progress);
  }
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  if (bytes < 1000000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1000000).toFixed(1)} MB`;
}

function withTimeout(promise, timeout, message) {
  let timer;
  const timeoutPromise = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeout);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

function waitForUiPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.setTimeout(resolve, 600));
    });
  });
}

function findOpaqueBounds(sourceCanvas) {
  const sourceContext = sourceCanvas.getContext('2d');
  const pixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
  let left = sourceCanvas.width;
  let top = sourceCanvas.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < sourceCanvas.height; y += 1) {
    for (let x = 0; x < sourceCanvas.width; x += 1) {
      if (pixels[(y * sourceCanvas.width + x) * 4 + 3] < 18) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    return { x: 0, y: 0, width: sourceCanvas.width, height: sourceCanvas.height };
  }

  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function setPortraitProcessing(processing) {
  state.portraitProcessing = processing;
  portraitSection.classList.toggle('is-processing', processing);
  portraitSection.setAttribute('aria-busy', String(processing));
  portraitProcessingIndicator.classList.toggle('is-visible', processing);
  setHighQualityModalVisible(processing && state.portraitQuality === 'high');
  portraitUploadButton.disabled = processing;
  portraitResetButton.disabled = processing || !state.portraitImage;
  document.querySelectorAll('[data-portrait-mode]').forEach((button) => {
    button.disabled = processing;
  });
  document.querySelectorAll('[data-portrait-quality]').forEach((button) => {
    button.disabled = processing;
  });
}

function setHighQualityModalVisible(visible) {
  document.body.classList.toggle('has-processing-modal', visible);
  if (visible) {
    portraitHighQualityModalStatus.textContent = '正在准备高质量模型';
    setHighQualityModalIndeterminateProgress();
    if (!portraitHighQualityModal.open) portraitHighQualityModal.showModal();
    return;
  }

  if (portraitHighQualityModal.open) portraitHighQualityModal.close();
}

function updateHighQualityModalStatus(message) {
  if (!portraitHighQualityModal.open) return;
  portraitHighQualityModalStatus.textContent = message;
  setHighQualityModalIndeterminateProgress();
}

function setHighQualityModalDeterminateProgress(progress) {
  portraitHighQualityProgress.classList.remove('is-indeterminate');
  portraitHighQualityProgress.classList.add('is-determinate');
  portraitHighQualityProgress.setAttribute('aria-valuenow', progress.toFixed(2));
  portraitHighQualityProgressFill.style.width = `${progress}%`;
}

function setHighQualityModalIndeterminateProgress() {
  portraitHighQualityProgress.classList.remove('is-determinate');
  portraitHighQualityProgress.classList.add('is-indeterminate');
  portraitHighQualityProgress.removeAttribute('aria-valuenow');
  portraitHighQualityProgressFill.style.removeProperty('width');
}

function syncPortraitModeControls() {
  document.querySelectorAll('[data-portrait-mode]').forEach((button) => {
    const active = button.dataset.portraitMode === state.portraitMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-portrait-quality]').forEach((button) => {
    const active = button.dataset.portraitQuality === state.portraitQuality;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  portraitQualityRow.hidden = state.portraitMode !== 'cutout';
  portraitSection.dataset.modelState = portraitModelRuntime[state.portraitQuality].state;
  portraitState.textContent = state.portraitImage
    ? (state.portraitMode === 'cutout' ? '智能抠图' : '完整图片')
    : '原始人物';
}

function updatePortraitPreview() {
  const activeCutoutUrl = portraitCutoutObjectUrls[state.portraitQuality];
  const activeCutout = state.portraitCutouts[state.portraitQuality];
  const previewUrl = state.portraitMode === 'cutout' && activeCutoutUrl
    ? activeCutoutUrl
    : portraitObjectUrl;
  portraitThumbnail.classList.toggle('is-cutout', state.portraitMode === 'cutout' && Boolean(activeCutoutUrl));

  if (!previewUrl) {
    portraitPreview.removeAttribute('src');
    portraitPreview.hidden = true;
    portraitThumbnail.classList.remove('has-image', 'is-cutout');
    if (!state.portraitProcessing) portraitProgress.textContent = '就绪';
    return;
  }

  portraitPreview.src = previewUrl;
  portraitPreview.hidden = false;
  portraitThumbnail.classList.add('has-image');
  if (!state.portraitProcessing) {
    portraitProgress.textContent = state.portraitMode === 'cutout' && activeCutout ? '抠图完成' : '完整图片';
  }
}

function clearPortraitCutoutCache() {
  Object.keys(PORTRAIT_MODELS).forEach((quality) => {
    if (portraitCutoutObjectUrls[quality]) URL.revokeObjectURL(portraitCutoutObjectUrls[quality]);
    portraitCutoutObjectUrls[quality] = undefined;
    state.portraitCutouts[quality] = null;
    state.portraitCutoutBounds[quality] = null;
  });
}

function clearCustomPortrait(shouldRender = true) {
  portraitRequestId += 1;
  hidePortraitModelProgress();
  if (portraitObjectUrl) URL.revokeObjectURL(portraitObjectUrl);
  clearPortraitCutoutCache();
  portraitObjectUrl = undefined;
  state.portraitMode = 'full';
  state.portraitQuality = 'low';
  state.portraitFile = null;
  state.portraitImage = null;
  state.portraitProcessing = false;
  portraitInput.value = '';
  portraitFileName.textContent = '原始人物';
  portraitResetButton.disabled = true;
  portraitUploadButton.disabled = false;
  portraitSection.classList.remove('is-processing');
  portraitSection.setAttribute('aria-busy', 'false');
  portraitProcessingIndicator.classList.remove('is-visible');
  setHighQualityModalVisible(false);
  document.querySelectorAll('[data-portrait-mode]').forEach((button) => {
    button.disabled = false;
  });
  document.querySelectorAll('[data-portrait-quality]').forEach((button) => {
    button.disabled = false;
  });
  syncPortraitModeControls();
  updatePortraitPreview();
  if (shouldRender) scheduleRender();
}

function renderScarfCaption() {
  const text = `找${state.caption}`.replace(/[。.!！?？]+$/u, '');
  if (state.caption === DEFAULT_CAPTION && state.textColor === DEFAULT_TEXT_COLOR) return;

  applyInpaintPlan(scarfInpaintPlan);
  if (!text) return;

  const fontSize = fitTextFontSize(text, SCARF_TEXT_AREA, (size) => `800 ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`);
  const { r, g, b } = hexToRgb(state.textColor);
  const isLightText = relativeLuminance(r, g, b) >= 0.48;

  context.save();
  context.font = `800 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.lineJoin = 'round';
  context.fillStyle = state.textColor;
  context.shadowColor = isLightText ? 'rgba(111, 48, 73, 0.52)' : 'rgba(255, 255, 255, 0.5)';
  context.shadowBlur = 1.5;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 2;
  context.fillText(text, SCARF_TEXT_AREA.textX, SCARF_TEXT_AREA.baseline);
  context.restore();
}

function renderScarfLogo() {
  const shouldRenderImage = state.logoMode === 'image' && state.logoImage;
  const shouldRenderText = state.logoMode === 'text';
  if (!shouldRenderImage && !shouldRenderText) return;

  applyInpaintPlan(logoInpaintPlan);
  if (shouldRenderText) {
    renderCurvedScarfLogoText();
    return;
  }

  const scale = Math.min(
    SCARF_LOGO_AREA.drawWidth / state.logoImage.naturalWidth,
    SCARF_LOGO_AREA.drawHeight / state.logoImage.naturalHeight,
  );
  const width = state.logoImage.naturalWidth * scale;
  const height = state.logoImage.naturalHeight * scale;
  const centerX = SCARF_LOGO_AREA.drawX + SCARF_LOGO_AREA.drawWidth / 2;
  const centerY = SCARF_LOGO_AREA.drawY + SCARF_LOGO_AREA.drawHeight / 2;

  context.save();
  clipScarfLogoBand();
  context.translate(centerX, centerY);
  context.rotate(-0.13);
  context.shadowColor = 'rgba(56, 34, 43, 0.24)';
  context.shadowBlur = 2;
  context.shadowOffsetY = 1;
  context.drawImage(state.logoImage, -width / 2, -height / 2, width, height);
  context.restore();
}

function renderCurvedScarfLogoText() {
  const text = state.logoText.trim();
  if (!text) return;

  const characters = Array.from(text);
  const availableWidth = SCARF_LOGO_AREA.curveEndX - SCARF_LOGO_AREA.curveStartX;
  let fontSize = 54;
  let characterWidths;
  let textWidth;

  context.save();
  clipScarfLogoBand();
  while (fontSize >= 22) {
    context.font = buildScarfLogoFont(fontSize);
    characterWidths = characters.map((character) => context.measureText(character).width);
    textWidth = characterWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, characters.length - 1) * 0.5;
    if (textWidth <= availableWidth || fontSize === 22) break;
    fontSize -= 1;
  }

  context.font = buildScarfLogoFont(fontSize);
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(1.2, fontSize * 0.045);
  context.strokeStyle = 'rgba(160, 76, 111, 0.74)';
  context.fillStyle = '#FFF5F8';
  context.shadowColor = 'rgba(88, 43, 62, 0.28)';
  context.shadowBlur = 1.4;
  context.shadowOffsetY = 1;
  context.globalAlpha = 0.94;

  let cursor = SCARF_LOGO_AREA.curveStartX + (availableWidth - textWidth) / 2;
  characters.forEach((character, index) => {
    const width = characterWidths[index];
    const characterX = cursor + width / 2;
    const { y, angle } = getScarfLogoCurvePoint(characterX);
    context.save();
    context.translate(characterX, y);
    context.rotate(angle);
    context.strokeText(character, 0, 0);
    context.fillText(character, 0, 0);
    context.restore();
    cursor += width + 0.5;
  });
  context.restore();
}

function buildScarfLogoFont(size) {
  return `400 ${size}px "Great Vibes Local", "Ma Shan Zheng Local", cursive`;
}

function getScarfLogoCurvePoint(x) {
  const startX = SCARF_LOGO_AREA.curveStartX;
  const endX = SCARF_LOGO_AREA.curveEndX;
  const t = Math.max(0, Math.min(1, (x - startX) / (endX - startX)));
  const oneMinusT = 1 - t;
  const startY = 611;
  const controlY = 625;
  const endY = 559;
  const y = oneMinusT * oneMinusT * startY
    + 2 * oneMinusT * t * controlY
    + t * t * endY;
  const derivativeY = 2 * oneMinusT * (controlY - startY) + 2 * t * (endY - controlY);
  return { y, angle: Math.atan2(derivativeY, endX - startX) };
}

function clipScarfLogoBand() {
  context.beginPath();
  context.moveTo(592, 548);
  context.quadraticCurveTo(710, 553, 865, 505);
  context.lineTo(865, 574);
  context.quadraticCurveTo(724, 626, 592, 622);
  context.closePath();
  context.clip();
}

async function setCustomLogo(file) {
  const objectUrl = URL.createObjectURL(file);
  const customLogo = new Image();
  customLogo.decoding = 'async';
  customLogo.src = objectUrl;

  try {
    await customLogo.decode();
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }

  if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
  logoObjectUrl = objectUrl;
  state.logoMode = 'image';
  state.logoImage = customLogo;
  logoPreview.src = objectUrl;
  logoPreview.hidden = false;
  logoThumbnail.classList.add('has-image');
  logoResetButton.disabled = false;
  logoFileName.dataset.imageName = file.name;
  syncLogoControls();
  scheduleRender();
}

function clearCustomLogo(shouldRender = true) {
  if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
  logoObjectUrl = undefined;
  state.logoMode = 'text';
  state.logoText = DEFAULT_LOGO_TEXT;
  state.logoImage = null;
  logoTextInput.value = DEFAULT_LOGO_TEXT;
  logoInput.value = '';
  logoPreview.removeAttribute('src');
  logoPreview.hidden = true;
  logoThumbnail.classList.remove('has-image');
  delete logoFileName.dataset.imageName;
  logoResetButton.disabled = true;
  syncLogoControls();
  if (shouldRender) scheduleRender();
}

function syncLogoControls() {
  document.querySelectorAll('[data-logo-mode]').forEach((button) => {
    const active = button.dataset.logoMode === state.logoMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  logoImagePanel.hidden = state.logoMode !== 'image';
  logoTextPanel.hidden = state.logoMode !== 'text';
  if (state.logoMode === 'text') {
    logoState.textContent = '文字 Logo';
    logoFileName.textContent = state.logoText || '空白文字';
    return;
  }

  logoState.textContent = state.logoImage ? '自定义图片' : '原始图片';
  logoFileName.textContent = state.logoImage ? logoFileName.dataset.imageName : DEFAULT_LOGO_TEXT;
}

function renderCaption() {
  const texture = document.createElement('canvas');
  texture.width = CAPTION_AREA.textureWidth;
  texture.height = CAPTION_AREA.patchHeight;
  const textureContext = texture.getContext('2d');
  textureContext.drawImage(
    canvas,
    CAPTION_AREA.textureX,
    CAPTION_AREA.patchY,
    CAPTION_AREA.textureWidth,
    CAPTION_AREA.patchHeight,
    0,
    0,
    CAPTION_AREA.textureWidth,
    CAPTION_AREA.patchHeight,
  );

  context.save();
  context.beginPath();
  context.rect(CAPTION_AREA.patchX, CAPTION_AREA.patchY, CAPTION_AREA.patchWidth, CAPTION_AREA.patchHeight);
  context.clip();

  for (let x = CAPTION_AREA.patchX, tile = 0; x < CAPTION_AREA.patchX + CAPTION_AREA.patchWidth; x += CAPTION_AREA.textureWidth, tile += 1) {
    context.save();
    if (tile % 2 === 1) {
      context.translate(x * 2 + CAPTION_AREA.textureWidth, 0);
      context.scale(-1, 1);
    }
    context.drawImage(texture, tile % 2 === 1 ? x : x, CAPTION_AREA.patchY);
    context.restore();
  }
  context.restore();

  const text = `找${state.caption}`;
  const fontSize = fitCaptionFontSize(text);
  const { r, g, b } = hexToRgb(state.textColor);
  const isLightText = relativeLuminance(r, g, b) >= 0.48;

  context.save();
  context.font = `900 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.lineJoin = 'round';
  context.fillStyle = state.textColor;
  context.shadowColor = isLightText ? 'rgba(38, 33, 36, 0.42)' : 'rgba(255, 255, 255, 0.48)';
  context.shadowBlur = 2;
  context.shadowOffsetX = 4;
  context.shadowOffsetY = 5;
  context.fillText(text, CAPTION_AREA.textX, CAPTION_AREA.baseline);
  context.restore();
}

function fitCaptionFontSize(text) {
  return fitTextFontSize(text, CAPTION_AREA, (size) => `900 ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`);
}

function renderSignature() {
  applyInpaintPlan(signatureInpaintPlan);
  if (!state.signature) return;

  const fontBuilder = (size) => `400 ${size}px "Great Vibes Local", "Ma Shan Zheng Local", cursive`;
  const fontSize = fitTextFontSize(state.signature, SIGNATURE_AREA, fontBuilder);

  context.save();
  context.font = fontBuilder(fontSize);
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  const metrics = context.measureText(state.signature);
  const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.72;
  const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
  const baseline = SIGNATURE_AREA.centerY + (ascent - descent) / 2 + SIGNATURE_AREA.verticalOffset;
  context.fillStyle = '#756D4C';
  context.shadowColor = 'rgba(255, 255, 255, 0.45)';
  context.shadowBlur = 0.7;
  context.shadowOffsetY = 1;
  context.fillText(state.signature, SIGNATURE_AREA.textX, baseline);
  context.restore();
}

function isScarfTextPixel(red, green, blue) {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  return red >= 200 && green >= 185 && blue >= 190 && maximum - minimum <= 48;
}

function isScarfLogoPixel(red, green, blue) {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  return red >= 205 && green >= 195 && blue >= 200 && maximum - minimum <= 52;
}

function isScarfBackgroundPixel(red, green, blue) {
  const hsl = rgbToHsl(red / 255, green / 255, blue / 255);
  return (hsl.h >= 0.87 || hsl.h <= 0.03) && hsl.s >= 0.08 && hsl.l >= 0.36;
}

function isSignatureTextPixel(red, green, blue) {
  return red <= 190 && green <= 180 && blue <= 150;
}

function isSignatureBackgroundPixel(red, green, blue) {
  return red >= 205 && green >= 190 && blue >= 150;
}

function createInpaintPlan(area, isTextPixel, isBackgroundPixel, dilationRadius) {
  const source = originalImageData.data;
  const textMask = new Uint8Array(area.width * area.height);

  for (let row = 0; row < area.height; row += 1) {
    for (let column = 0; column < area.width; column += 1) {
      const sourceIndex = ((area.y + row) * canvas.width + area.x + column) * 4;
      if (isTextPixel(source[sourceIndex], source[sourceIndex + 1], source[sourceIndex + 2])) {
        textMask[row * area.width + column] = 1;
      }
    }
  }

  const mask = dilateMask(textMask, area.width, area.height, dilationRadius);
  const backgroundMask = new Uint8Array(mask.length);
  for (let index = 0; index < backgroundMask.length; index += 1) {
    if (mask[index]) continue;
    const column = index % area.width;
    const row = Math.floor(index / area.width);
    const sourceIndex = ((area.y + row) * canvas.width + area.x + column) * 4;
    if (isBackgroundPixel(source[sourceIndex], source[sourceIndex + 1], source[sourceIndex + 2])) {
      backgroundMask[index] = 1;
    }
  }

  const targets = [];
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;
    const sources = findNearestBackgroundPixels(backgroundMask, area.width, area.height, index);
    if (sources.length > 0) targets.push({ index, sources });
  }

  return { area, targets };
}

function applyInpaintPlan(plan) {
  const { area, targets } = plan;
  const rendered = context.getImageData(area.x, area.y, area.width, area.height);

  targets.forEach((target) => {
    let red = 0;
    let green = 0;
    let blue = 0;
    let alpha = 0;

    target.sources.forEach((sourceIndex) => {
      const dataIndex = sourceIndex * 4;
      red += rendered.data[dataIndex];
      green += rendered.data[dataIndex + 1];
      blue += rendered.data[dataIndex + 2];
      alpha += rendered.data[dataIndex + 3];
    });

    const targetDataIndex = target.index * 4;
    const count = target.sources.length;
    rendered.data[targetDataIndex] = Math.round(red / count);
    rendered.data[targetDataIndex + 1] = Math.round(green / count);
    rendered.data[targetDataIndex + 2] = Math.round(blue / count);
    rendered.data[targetDataIndex + 3] = Math.round(alpha / count);
  });

  context.putImageData(rendered, area.x, area.y);
}

function findNearestBackgroundPixels(backgroundMask, width, height, index) {
  const centerX = index % width;
  const centerY = Math.floor(index / width);
  const maximumRadius = Math.max(width, height);

  for (let radius = 1; radius < maximumRadius; radius += 1) {
    const found = new Set();
    for (let offset = -radius; offset <= radius; offset += 1) {
      const candidates = [
        [centerX + offset, centerY - radius],
        [centerX + offset, centerY + radius],
        [centerX - radius, centerY + offset],
        [centerX + radius, centerY + offset],
      ];

      candidates.forEach(([x, y]) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        const candidateIndex = y * width + x;
        if (backgroundMask[candidateIndex]) found.add(candidateIndex);
      });
    }

    if (found.size > 0) return [...found].slice(0, 16);
  }

  return [];
}

function dilateMask(mask, width, height, radius) {
  const dilated = new Uint8Array(mask.length);

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;
    const centerX = index % width;
    const centerY = Math.floor(index / width);

    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        if (offsetX * offsetX + offsetY * offsetY > radius * radius) continue;
        const x = centerX + offsetX;
        const y = centerY + offsetY;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        dilated[y * width + x] = 1;
      }
    }
  }

  return dilated;
}

function fitTextFontSize(text, area, fontBuilder) {
  let size = area.fontSize;
  context.save();
  while (size > area.minFontSize) {
    context.font = fontBuilder(size);
    if (context.measureText(text).width <= area.maxWidth) break;
    size -= 1;
  }
  context.restore();
  return size;
}

function remapLightness(sourceLightness, targetLightness) {
  if (sourceLightness >= BASE_PINK.l) {
    const highlightRange = 1 - BASE_PINK.l;
    return targetLightness + ((sourceLightness - BASE_PINK.l) / highlightRange) * (1 - targetLightness);
  }

  return targetLightness * (sourceLightness / BASE_PINK.l);
}

function resetEditor() {
  state.strength = 1;
  state.caption = DEFAULT_CAPTION;
  captionInput.value = DEFAULT_CAPTION;
  state.signature = DEFAULT_SIGNATURE;
  signatureInput.value = DEFAULT_SIGNATURE;
  clearCustomPortrait(false);
  clearCustomLogo(false);
  strengthRange.value = 100;
  strengthValue.value = '100%';
  setTextColor(DEFAULT_TEXT_COLOR);
  setColor(DEFAULT_COLOR);
  updateRangeFill();
  showToast('已恢复默认设置');
}

function downloadResult() {
  const previousView = state.view;
  if (previousView === 'original') {
    state.view = 'result';
    render();
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const safeCaption = state.caption.replace(/[\\/:*?"<>|]/g, '').trim();
    anchor.download = `找${safeCaption || '自定义'}-${state.color.slice(1)}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('PNG 已生成');
  }, 'image/png');

  if (previousView === 'original') {
    state.view = previousView;
    scheduleRender();
  }
}

function updateRangeFill() {
  const value = Number(strengthRange.value);
  strengthRange.style.background = `linear-gradient(to right, var(--accent) 0 ${value}%, #e1e4e7 ${value}% 100%)`;
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function normalizeHex(value) {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  return match ? `#${match[1].toUpperCase()}` : null;
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHsv(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }

  if (hue < 0) hue += 360;
  return {
    h: hue,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
  };
}

function hsvToHex(hue, saturation, value) {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.min(100, Math.max(0, saturation)) / 100;
  const v = Math.min(100, Math.max(0, value)) / 100;
  const chroma = v * s;
  const hueSegment = h / 60;
  const secondary = chroma * (1 - Math.abs((hueSegment % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSegment < 1) [red, green] = [chroma, secondary];
  else if (hueSegment < 2) [red, green] = [secondary, chroma];
  else if (hueSegment < 3) [green, blue] = [chroma, secondary];
  else if (hueSegment < 4) [green, blue] = [secondary, chroma];
  else if (hueSegment < 5) [red, blue] = [secondary, chroma];
  else [red, blue] = [chroma, secondary];

  const match = v - chroma;
  const toHex = (channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0');
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`.toUpperCase();
}

function relativeLuminance(r, g, b) {
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function circularDistance(a, b) {
  const difference = Math.abs(a - b);
  return Math.min(difference, 1 - difference);
}

function smoothstep(edge0, edge1, value) {
  const normalized = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return normalized * normalized * (3 - 2 * normalized);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { h: 0, s: 0, l: lightness };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  hue /= 6;
  if (hue < 0) hue += 1;
  return { h: hue, s: saturation, l: lightness };
}

function hslToRgb(h, s, l) {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hueSegment = h * 6;
  const secondary = chroma * (1 - Math.abs((hueSegment % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSegment < 1) [red, green] = [chroma, secondary];
  else if (hueSegment < 2) [red, green] = [secondary, chroma];
  else if (hueSegment < 3) [green, blue] = [chroma, secondary];
  else if (hueSegment < 4) [green, blue] = [secondary, chroma];
  else if (hueSegment < 5) [red, blue] = [secondary, chroma];
  else [red, blue] = [chroma, secondary];

  const match = l - chroma / 2;
  return { r: red + match, g: green + match, b: blue + match };
}
