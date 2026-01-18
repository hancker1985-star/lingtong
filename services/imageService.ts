
/**
 * Processes a File or data URL into a circular 800x800 PNG with specific scaling and position.
 */
export const processImageToCircle = (
  source: File | string, 
  scale: number = 1.0, 
  position: { x: number; y: number } = { x: 0, y: 0 }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const loadImage = (src: string) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 800; // Original 800x800 size as requested
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.clearRect(0, 0, size, size);

        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        const aspect = img.width / img.height;
        let baseWidth, baseHeight;

        if (aspect > 1) {
          baseHeight = size;
          baseWidth = size * aspect;
        } else {
          baseWidth = size;
          baseHeight = size / aspect;
        }

        const drawWidth = baseWidth * scale;
        const drawHeight = baseHeight * scale;
        
        const offsetX = (size - drawWidth) / 2 + position.x;
        const offsetY = (size - drawHeight) / 2 + position.y;

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        ctx.restore();

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = src;
    };

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => loadImage(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(source);
    } else {
      loadImage(source);
    }
  });
};

/**
 * Generates an A4-sized canvas with images arranged in a grid.
 * A4 at 300DPI is approx 2480 x 3508 pixels.
 * Arranged in a 2x3 grid for 6 images (2 images per row).
 * Each circle is placed as exactly 800x800 pixels with appropriate margins.
 */
export const generateA4Sheet = (imageUrls: string[]): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const width = 2480; // A4 Width at 300 DPI
    const height = 3508; // A4 Height at 300 DPI
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return resolve('');

    // Pure white background for printing
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const cols = 2; // 2 per row
    const rows = 3; // 3 rows
    const itemSize = 800; // Each circle is 800x800 on the A4 sheet
    
    // Calculate precise centering gaps ("Appropriate distance")
    // Total Horizontal Gap = 2480 - (2 * 800) = 880px
    // Gap = 880 / 3 = 293.3px
    const gapX = (width - (cols * itemSize)) / (cols + 1);
    
    // Total Vertical Gap = 3508 - (3 * 800) = 1108px
    // Gap = 1108 / 4 = 277px
    const gapY = (height - (rows * itemSize)) / (rows + 1);

    let loadedCount = 0;
    const maxOnSheet = 6;
    const targets = imageUrls.slice(0, maxOnSheet);

    if (targets.length === 0) {
      resolve(canvas.toDataURL('image/jpeg', 0.95));
      return;
    }

    targets.forEach((url, index) => {
      const img = new Image();
      img.onload = () => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const x = gapX + col * (itemSize + gapX);
        const y = gapY + row * (itemSize + gapY);

        ctx.drawImage(img, x, y, itemSize, itemSize);
        
        loadedCount++;
        if (loadedCount === targets.length) {
          resolve(canvas.toDataURL('image/jpeg', 0.98));
        }
      };
      img.src = url;
    });
  });
};

export const downloadImage = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
