import cv from "@techstark/opencv-js"

export const waitForOpenCV = () => {
  return new Promise((resolve) => {
    if (cv?.Mat) resolve()
    else cv.onRuntimeInitialized = resolve
  })
}

export class DocScanner {

  constructor(interactive = false, MIN_QUAD_AREA_RATIO = 0.25, MAX_QUAD_ANGLE_RANGE = 40) {
    this.interactive = interactive
    this.MIN_QUAD_AREA_RATIO = MIN_QUAD_AREA_RATIO
    this.MAX_QUAD_ANGLE_RANGE = MAX_QUAD_ANGLE_RANGE
  }

  distance(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1])
  }

  filterCorners(corners, minDist = 20) {
    const filtered = []

    for (const c of corners) {
      let keep = true

      for (const r of filtered) {
        if (this.distance(r, c) < minDist) {
          keep = false
          break
        }
      }

      if (keep) filtered.push(c)
    }

    return filtered
  }

  angleBetween(u, v) {
    const dot = u[0] * v[0] + u[1] * v[1]
    const mu = Math.hypot(u[0], u[1])
    const mv = Math.hypot(v[0], v[1])
    return Math.acos(dot / (mu * mv)) * 180 / Math.PI
  }

  getAngle(p1, p2, p3) {
    const v1 = [p1[0] - p2[0], p1[1] - p2[1]]
    const v2 = [p3[0] - p2[0], p3[1] - p2[1]]
    return this.angleBetween(v1, v2)
  }

  angleRange(quad) {

    const [tl, tr, br, bl] = quad

    const ura = this.getAngle(tl, tr, br)
    const ula = this.getAngle(bl, tl, tr)
    const lra = this.getAngle(tr, br, bl)
    const lla = this.getAngle(br, bl, tl)

    const arr = [ura, ula, lra, lla]

    return Math.max(...arr) - Math.min(...arr)
  }

  isValidContour(cnt, width, height) {

    if (cnt.rows !== 4) return false

    const area = cv.contourArea(cnt)

    if (area < width * height * this.MIN_QUAD_AREA_RATIO) return false

    const pts = [
      [cnt.data32S[0], cnt.data32S[1]],
      [cnt.data32S[2], cnt.data32S[3]],
      [cnt.data32S[4], cnt.data32S[5]],
      [cnt.data32S[6], cnt.data32S[7]]
    ]

    return this.angleRange(pts) < this.MAX_QUAD_ANGLE_RANGE
  }

  getContour(image) {

    const MORPH = 5
    const CANNY = 75

    const height = image.rows
    const width = image.cols

    const gray = new cv.Mat()
    cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY)

    // const blur = new cv.Mat() // Removed as per instruction

    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(MORPH, MORPH))

    const dilated = new cv.Mat()
    cv.morphologyEx(gray, dilated, cv.MORPH_CLOSE, kernel) // Changed from blur to gray

    const edged = new cv.Mat()
    cv.Canny(dilated, edged, 0, CANNY)

    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()

    cv.findContours(edged, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let best = null
    let bestArea = 0

    for (let i = 0; i < contours.size(); i++) {

      const c = contours.get(i)

      const peri = cv.arcLength(c, true)

      const approx = new cv.Mat()
      cv.approxPolyDP(c, approx, 0.02 * peri, true)

      if (this.isValidContour(approx, width, height)) {

        const area = cv.contourArea(approx)

        if (area > bestArea) {
          bestArea = area
          if (best) best.delete()
          best = approx
        } else {
          approx.delete()
        }

      } else {
        approx.delete()
      }

      c.delete()
    }

    if (!best) {

      best = cv.matFromArray(4, 1, cv.CV_32SC2, [
        width, 0,
        width, height,
        0, height,
        0, 0
      ])
    }

    gray.delete()
    kernel.delete()
    dilated.delete()
    edged.delete()
    contours.delete()
    hierarchy.delete()

    return best
  }

  perspectiveTransform(src, corners) {

    const pts = []

    for (let i = 0; i < 4; i++) {
      pts.push({
        x: corners.data32S[i * 2],
        y: corners.data32S[i * 2 + 1]
      })
    }

    const tl = pts.reduce((a, b) => (a.x + a.y < b.x + b.y ? a : b))
    const br = pts.reduce((a, b) => (a.x + a.y > b.x + b.y ? a : b))
    const tr = pts.reduce((a, b) => (a.x - a.y > b.x - b.y ? a : b))
    const bl = pts.reduce((a, b) => (a.x - a.y < b.x - b.y ? a : b))

    const widthA = Math.hypot(br.x - bl.x, br.y - bl.y)
    const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y)
    const maxWidth = Math.max(widthA, widthB)

    const heightA = Math.hypot(tr.x - br.x, tr.y - br.y)
    const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y)
    const maxHeight = Math.max(heightA, heightB)

    const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      tl.x, tl.y,
      tr.x, tr.y,
      br.x, br.y,
      bl.x, bl.y
    ])

    const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      maxWidth - 1, 0,
      maxWidth - 1, maxHeight - 1,
      0, maxHeight - 1
    ])

    const M = cv.getPerspectiveTransform(srcPts, dstPts)

    const dst = new cv.Mat()

    cv.warpPerspective(
      src,
      dst,
      M,
      new cv.Size(maxWidth, maxHeight),
      cv.INTER_CUBIC,
      cv.BORDER_REPLICATE
    )

    srcPts.delete()
    dstPts.delete()
    M.delete()

    return dst
  }

  enhance(gray) {

    // normalize contrast
    const norm = new cv.Mat()
    cv.normalize(gray, norm, 0, 255, cv.NORM_MINMAX)

    // strong document threshold
    const thresh = new cv.Mat()
    cv.adaptiveThreshold(
      norm,
      thresh,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      85,
      22
    )

    norm.delete()

    return thresh
  }



  async processRaw(source) {
    return this.scan(source)
  }

  async scan(source) {
    try {
      await waitForOpenCV()
      let src = cv.imread(source)

      const ratio = src.rows / 500

      const resized = new cv.Mat()
      cv.resize(src, resized, new cv.Size(), 500 / src.rows, 500 / src.rows)

      const contour = this.getContour(resized)

      const scaled = new cv.Mat(4, 1, cv.CV_32SC2)

      for (let i = 0; i < 4; i++) {
        scaled.data32S[i * 2] = contour.data32S[i * 2] * ratio
        scaled.data32S[i * 2 + 1] = contour.data32S[i * 2 + 1] * ratio
      }

      const warped = this.perspectiveTransform(src, scaled)

      const gray = new cv.Mat()
      cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY)

      const result = this.enhance(gray)

      const canvas = document.createElement("canvas")
      cv.imshow(canvas, result)

      // cleanup
      src.delete(); resized.delete(); contour.delete();
      scaled.delete(); warped.delete(); gray.delete(); result.delete();

      return canvas
    } catch (e) {
      console.error("OpenCV Scan Error:", e);
      throw new Error("AI failed to process this image. Try a clearer photo.");
    }
  }

}