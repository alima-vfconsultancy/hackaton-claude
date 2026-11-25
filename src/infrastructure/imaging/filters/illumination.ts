import { createGrayImage, type GrayImage } from './grayImage';

/**
 * Removes shadows and uneven lighting: estimates the paper brightness around each pixel
 * (brightest value per cell, smoothed and interpolated) and divides the pixel by it.
 * Paper becomes close to white everywhere and the ink keeps its relative darkness.
 *
 * @param image - gray image with dark text on light paper (not changed)
 * @param cellSize - size of the cells used to estimate the paper; must be larger than the strokes.
 *   Defaults to 1/40 of the shorter side (at least 8 px).
 * @returns a new image with flat lighting
 */
export function normalizeIllumination(
  image: GrayImage,
  cellSize = Math.max(8, Math.round(Math.min(image.width, image.height) / 40)),
): GrayImage {
  const { width, height, data } = image;
  const columns = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);

  // 1. Brightest pixel of each cell (ink is darker than the paper around it).
  const grid = new Float64Array(columns * rows);
  for (let y = 0; y < height; y++) {
    const cellRow = Math.floor(y / cellSize) * columns;
    for (let x = 0; x < width; x++) {
      const cell = cellRow + Math.floor(x / cellSize);
      const value = data[y * width + x];
      if (value > grid[cell]) grid[cell] = value;
    }
  }

  // 2. Smooth the grid (3×3 mean) so a single dark cell (a bold title) does not leave a hole.
  const smooth = new Float64Array(grid.length);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const r = row + dy;
          const c = column + dx;
          if (r < 0 || r >= rows || c < 0 || c >= columns) continue;
          sum += grid[r * columns + c];
          count++;
        }
      }
      smooth[row * columns + column] = Math.max(grid[row * columns + column] * 0.85, sum / count);
    }
  }

  // 3. Bilinear interpolation between cell centers, then divide.
  const output = createGrayImage(width, height);
  for (let y = 0; y < height; y++) {
    const gy = Math.min(rows - 1, Math.max(0, (y + 0.5) / cellSize - 0.5));
    const r0 = Math.floor(gy);
    const r1 = Math.min(rows - 1, r0 + 1);
    const fy = gy - r0;
    for (let x = 0; x < width; x++) {
      const gx = Math.min(columns - 1, Math.max(0, (x + 0.5) / cellSize - 0.5));
      const c0 = Math.floor(gx);
      const c1 = Math.min(columns - 1, c0 + 1);
      const fx = gx - c0;
      const top = smooth[r0 * columns + c0] * (1 - fx) + smooth[r0 * columns + c1] * fx;
      const bottom = smooth[r1 * columns + c0] * (1 - fx) + smooth[r1 * columns + c1] * fx;
      const background = Math.max(1, top * (1 - fy) + bottom * fy);
      output.data[y * width + x] = (data[y * width + x] * 255) / background;
    }
  }
  return output;
}
