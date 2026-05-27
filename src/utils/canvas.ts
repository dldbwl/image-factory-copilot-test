/**
 * Canvas 기반 이미지 합성 유틸리티
 * 검증된 Canvas API만 사용
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 이미지에서 실제 콘텐츠의 바운딩 박스를 계산합니다.
 */
export function getBoundingBox(imageBitmap: ImageBitmap): BoundingBox | null {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageBitmap.width;
  tempCanvas.height = imageBitmap.height;
  const tempCtx = tempCanvas.getContext('2d');

  if (!tempCtx) return null;

  tempCtx.drawImage(imageBitmap, 0, 0);
  const imageData = tempCtx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
  const pixels = imageData.data;

  let minX = imageBitmap.width;
  let minY = imageBitmap.height;
  let maxX = 0;
  let maxY = 0;

  const alphaThreshold = 30;

  for (let y = 0; y < imageBitmap.height; y++) {
    for (let x = 0; x < imageBitmap.width; x++) {
      const alpha = pixels[(y * imageBitmap.width + x) * 4 + 3];
      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * 이미지를 바운딩 박스에 맞게 자릅니다.
 */
export function cropCharacterImage(
  imageBitmap: ImageBitmap,
  boundingBox: BoundingBox
): HTMLCanvasElement {
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = boundingBox.width;
  cropCanvas.height = boundingBox.height;
  const cropCtx = cropCanvas.getContext('2d')!;

  cropCtx.drawImage(
    imageBitmap,
    boundingBox.x,
    boundingBox.y,
    boundingBox.width,
    boundingBox.height,
    0,
    0,
    boundingBox.width,
    boundingBox.height
  );

  return cropCanvas;
}

/**
 * 배경이미지와 캐릭터를 합성하여 PC 버전 이미지를 생성합니다.
 */
export async function generatePCImage(
  backgroundUrl: string,
  croppedCharCanvas: HTMLCanvasElement,
  componentType: string
): Promise<string> {
  const pcWidth = 1920;
  const isRollupType = componentType === '콘텐츠 소개 - 롤업형';
  const isScrollLeftType = componentType === '콘텐츠 소개 - 스크롤형 (좌측)';
  const isScrollRightType = componentType === '콘텐츠 소개 - 스크롤형 (우측)';
  const pcCanvasHeight = isRollupType || isScrollLeftType || isScrollRightType ? 820 : 900;

  const pcCanvas = document.createElement('canvas');
  pcCanvas.width = pcWidth;
  pcCanvas.height = pcCanvasHeight;
  const pcCtx = pcCanvas.getContext('2d')!;

  const bgImg = new Image();
  bgImg.src = backgroundUrl;
  await new Promise((resolve) => {
    bgImg.onload = resolve;
  });

  const bgAspect = bgImg.width / bgImg.height;
  const pcCanvasAspect = pcWidth / pcCanvasHeight;
  let bgDrawWidth, bgDrawHeight, bgDrawX, bgDrawY;

  if (bgAspect > pcCanvasAspect) {
    bgDrawHeight = pcCanvasHeight;
    bgDrawWidth = pcCanvasHeight * bgAspect;
    bgDrawX = (pcWidth - bgDrawWidth) / 2;
    bgDrawY = 0;
  } else {
    bgDrawWidth = pcWidth;
    bgDrawHeight = pcWidth / bgAspect;
    bgDrawX = 0;
    bgDrawY = (pcCanvasHeight - bgDrawHeight) / 2;
  }

  pcCtx.drawImage(bgImg, bgDrawX, bgDrawY, bgDrawWidth, bgDrawHeight);

  pcCtx.globalAlpha = 0.2;
  pcCtx.filter = 'blur(40px)';
  pcCtx.drawImage(bgImg, bgDrawX, bgDrawY, bgDrawWidth, bgDrawHeight);
  pcCtx.filter = 'none';
  pcCtx.globalAlpha = 1.0;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = pcWidth;
  tempCanvas.height = pcCanvasHeight;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.drawImage(pcCanvas, 0, 0);

  pcCtx.filter = 'blur(7.5px)';
  pcCtx.drawImage(tempCanvas, 0, 0);
  pcCtx.filter = 'none';

  pcCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  pcCtx.fillRect(0, 0, pcWidth, pcCanvasHeight);

  const maxCharHeight = isScrollLeftType || isScrollRightType
    ? pcCanvasHeight * 0.9 * 1.15
    : pcCanvasHeight * 0.9;

  const scale = maxCharHeight / croppedCharCanvas.height;
  const drawWidth = croppedCharCanvas.width * scale;
  const drawHeight = croppedCharCanvas.height * scale;

  let drawX;
  if (isScrollLeftType) {
    drawX = pcWidth * 0.3 - drawWidth / 2;
  } else if (isScrollRightType) {
    drawX = pcWidth * 0.7 - drawWidth / 2;
  } else if (isRollupType) {
    drawX = pcWidth * 0.65 - drawWidth / 2;
  } else {
    drawX = (pcWidth - drawWidth) / 2;
  }

  const drawY = pcCanvasHeight * 0.1;

  pcCtx.drawImage(croppedCharCanvas, drawX, drawY, drawWidth, drawHeight);

  return pcCanvas.toDataURL('image/png');
}

/**
 * 배경이미지와 캐릭터를 합성하여 Mobile 버전 이미지를 생성합니다.
 */
export async function generateMobileImage(
  backgroundUrl: string,
  croppedCharCanvas: HTMLCanvasElement,
  componentType: string
): Promise<string> {
  const isScrollLeftType = componentType === '콘텐츠 소개 - 스크롤형 (좌측)';
  const isScrollRightType = componentType === '콘텐츠 소개 - 스크롤형 (우측)';
  const mobileCanvasHeight = isScrollLeftType || isScrollRightType ? 440 : 480;
  const mobileWidth = 360;

  const mobileCanvas = document.createElement('canvas');
  mobileCanvas.width = mobileWidth;
  mobileCanvas.height = mobileCanvasHeight;
  const mobileCtx = mobileCanvas.getContext('2d')!;

  const bgImg = new Image();
  bgImg.src = backgroundUrl;
  await new Promise((resolve) => {
    bgImg.onload = resolve;
  });

  const mobileBgAspect = bgImg.width / bgImg.height;
  const mobileCanvasAspect = mobileWidth / mobileCanvasHeight;
  let mobileBgDrawWidth, mobileBgDrawHeight, mobileBgDrawX, mobileBgDrawY;

  if (mobileBgAspect > mobileCanvasAspect) {
    mobileBgDrawHeight = mobileCanvasHeight;
    mobileBgDrawWidth = mobileCanvasHeight * mobileBgAspect;
    mobileBgDrawX = (mobileWidth - mobileBgDrawWidth) / 2;
    mobileBgDrawY = 0;
  } else {
    mobileBgDrawWidth = mobileWidth;
    mobileBgDrawHeight = mobileWidth / mobileBgAspect;
    mobileBgDrawX = 0;
    mobileBgDrawY = (mobileCanvasHeight - mobileBgDrawHeight) / 2;
  }

  mobileCtx.drawImage(bgImg, mobileBgDrawX, mobileBgDrawY, mobileBgDrawWidth, mobileBgDrawHeight);

  mobileCtx.globalAlpha = 0.2;
  mobileCtx.filter = 'blur(40px)';
  mobileCtx.drawImage(bgImg, mobileBgDrawX, mobileBgDrawY, mobileBgDrawWidth, mobileBgDrawHeight);
  mobileCtx.filter = 'none';
  mobileCtx.globalAlpha = 1.0;

  const mobileTempCanvas = document.createElement('canvas');
  mobileTempCanvas.width = mobileWidth;
  mobileTempCanvas.height = mobileCanvasHeight;
  const mobileTempCtx = mobileTempCanvas.getContext('2d')!;
  mobileTempCtx.drawImage(mobileCanvas, 0, 0);

  mobileCtx.filter = 'blur(7.5px)';
  mobileCtx.drawImage(mobileTempCanvas, 0, 0);
  mobileCtx.filter = 'none';

  mobileCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  mobileCtx.fillRect(0, 0, mobileWidth, mobileCanvasHeight);

  const maxMobileCharHeight = isScrollLeftType || isScrollRightType
    ? mobileCanvasHeight * 0.9 * 1.15
    : mobileCanvasHeight * 0.9;

  const mobileScale = maxMobileCharHeight / croppedCharCanvas.height;
  const mobileDrawWidth = croppedCharCanvas.width * mobileScale;
  const mobileDrawHeight = croppedCharCanvas.height * mobileScale;
  const mobileDrawX = (mobileWidth - mobileDrawWidth) / 2;
  const mobileDrawY = isScrollLeftType || isScrollRightType ? 10 : mobileCanvasHeight * 0.1;

  mobileCtx.drawImage(croppedCharCanvas, mobileDrawX, mobileDrawY, mobileDrawWidth, mobileDrawHeight);

  return mobileCanvas.toDataURL('image/png');
}
