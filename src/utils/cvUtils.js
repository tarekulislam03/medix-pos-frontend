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
 * Processes an image: detects edges, crops to the bill, and optimizes for OCR.
 * @param {HTMLImageElement|HTMLCanvasElement} source 
 * @returns {Promise<Blob>}
 */
export const processBillImage = async (source) => {
  await waitForOpenCV();

  let src = cv.imread(source);
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
    let contour = contours.get(i); // Note: This allocates a Mat that must be deleted
    let area = cv.contourArea(contour);

    if (area > 5000) {
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
    contour.delete(); // Critical memory leak fix
  }

  let finalResult;

  if (largestContour) {
    // 5. Perspective Transform (Crop to bill)
    finalResult = perspectiveTransform(src, largestContour);
    largestContour.delete();
  } else {
    finalResult = src.clone();
  }

  // 6. HD B&W Enhancement for OCR
  let enhanced = new cv.Mat();
  let tempBlur = new cv.Mat();

  // Convert cropped image to grayscale
  cv.cvtColor(finalResult, enhanced, cv.COLOR_RGBA2GRAY, 0);

  // Apply a very light blur to remove speckle noise before thresholding
  cv.GaussianBlur(enhanced, tempBlur, new cv.Size(3, 3), 0);

  // Adaptive Gaussian Thresholding: The secret to high-quality OCR
  // blockSize (15) determines the size of a pixel neighborhood.
  // C (10) is a constant subtracted from the mean to keep backgrounds white.
  cv.adaptiveThreshold(
    tempBlur,
    enhanced,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY,
    15,
    10
  );

  // Create a canvas to get the blob
  const outCanvas = document.createElement('canvas');
  cv.imshow(outCanvas, enhanced);

  // Cleanup
  src.delete();
  gray.delete();
  blurred.delete();
  edged.delete();
  contours.delete();
  hierarchy.delete();
  finalResult.delete();
  enhanced.delete();
  tempBlur.delete();

  return new Promise((resolve) => {
    outCanvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.95); // Bumped quality slightly
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

  // Robust corner sorting using Sums and Differences
  // Top-Left: smallest (x + y), Bottom-Right: largest (x + y)
  // Top-Right: largest (x - y), Bottom-Left: smallest (x - y)
  let tl = points.reduce((min, p) => (p.x + p.y < min.x + min.y ? p : min), points[0]);
  let br = points.reduce((max, p) => (p.x + p.y > max.x + max.y ? p : max), points[0]);
  let tr = points.reduce((max, p) => (p.x - p.y > max.x - max.y ? p : max), points[0]);
  let bl = points.reduce((min, p) => (p.x - p.y < min.x - min.y ? p : min), points[0]);

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