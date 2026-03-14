import cv from '@techstark/opencv-js';

/**
 * Loads OpenCV.js if not already loaded.
 * @returns {Promise}
 */
export const waitForOpenCV = () => {
  return new Promise((resolve) => {
    if (cv.Mat) {
      resolve();
    } else {
      cv.onRuntimeInitialized = () => {
        resolve();
      };
    }
  });
};

/**
 * Processes an image: detects edges, crops to the bill, and enhances readability.
 * @param {HTMLImageElement|HTMLCanvasElement} source 
 * @returns {Promise<Blob>}
 */
export const processBillImage = async (source) => {
  await waitForOpenCV();

  let src = cv.imread(source);
  let dst = new cv.Mat();
  let gray = new cv.Mat();
  let blurred = new cv.Mat();
  let edged = new cv.Mat();

  // 1. Grayscale
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

  // 2. Blur to reduce noise
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

  // 3. Canny edge detection
  cv.Canny(blurred, edged, 75, 200);

  // 4. Find contours
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(edged, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

  let largestContour = null;
  let maxArea = 0;

  for (let i = 0; i < contours.size(); ++i) {
    let contour = contours.get(i);
    let area = cv.contourArea(contour);
    if (area > 5000) { // Minimum area threshold
      let peri = cv.arcLength(contour, true);
      let approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.02 * peri, true);

      if (approx.rows === 4 && area > maxArea) {
        if (largestContour) largestContour.delete();
        largestContour = approx;
        maxArea = area;
      } else {
        approx.delete();
      }
    }
  }

  let finalResult;

  if (largestContour) {
    // 5. Perspective Transform (Crop to bill) - keeps color
    finalResult = perspectiveTransform(src, largestContour);
    largestContour.delete();
  } else {
    // If no 4-corner contour found, use the original image
    finalResult = src.clone();
  }

  // 6. Enhancement: Instead of aggressive binarization (grayscaling/thresholding),
  // we use a light contrast/brightness boost to keep the image readable but natural.
  // This avoids the "gritty" look that was hurting OCR and user experience.
  // alpha (1.0-3.0) for contrast, beta (0-100) for brightness
  let enhanced = new cv.Mat();
  finalResult.convertTo(enhanced, -1, 1.1, 10); // Slight boost

  // Create a canvas to get the blob
  const outCanvas = document.createElement('canvas');
  cv.imshow(outCanvas, enhanced);
  
  // Cleanup
  src.delete();
  dst.delete();
  gray.delete();
  blurred.delete();
  edged.delete();
  contours.delete();
  hierarchy.delete();
  finalResult.delete();
  enhanced.delete();
  
  
  return new Promise((resolve) => {
    outCanvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.92); // Slightly higher quality
  });
};

/**
 * Performs perspective transform to "flatten" the detected rectangle.
 */
function perspectiveTransform(src, corners) {
  let points = [];
  for (let i = 0; i < 4; i++) {
    points.push({ x: corners.data32S[i * 2], y: corners.data32S[i * 2 + 1] });
  }

  // Sort points: top-left, top-right, bottom-right, bottom-left
  points.sort((a, b) => a.y - b.y);
  let top = points.slice(0, 2).sort((a, b) => a.x - b.x);
  let bottom = points.slice(2, 4).sort((a, b) => a.x - b.x);

  let tl = top[0];
  let tr = top[1];
  let br = bottom[1];
  let bl = bottom[0];

  let widthA = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2));
  let widthB = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2));
  let maxWidth = Math.max(widthA, widthB);

  let heightA = Math.sqrt(Math.pow(tr.x - br.x, 2) + Math.pow(tr.y - br.y, 2));
  let heightB = Math.sqrt(Math.pow(tl.x - bl.x, 2) + Math.pow(tl.y - bl.y, 2));
  let maxHeight = Math.max(heightA, heightB);

  let destPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    maxWidth - 1, 0,
    maxWidth - 1, maxHeight - 1,
    0, maxHeight - 1
  ]);

  let srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x, tl.y,
    tr.x, tr.y,
    br.x, br.y,
    bl.x, bl.y
  ]);

  let M = cv.getPerspectiveTransform(srcPoints, destPoints);
  let dst = new cv.Mat();
  let dsize = new cv.Size(maxWidth, maxHeight);
  cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

  M.delete();
  srcPoints.delete();
  destPoints.delete();

  return dst;
}
