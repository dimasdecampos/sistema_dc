/** Preparo de imagens no navegador (redimensionar, converter, nomes seguros) antes do upload. */

export interface OptimizationStats {
  originalSize: number;
  optimizedSize: number;
  savedPercentage: number;
  width: number;
  height: number;
}

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'image/webp' | 'image/jpeg';
}

/**
 * Sanitiza o nome do arquivo para evitar caracteres inválidos no Supabase Storage
 */
export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Redimensiona e otimiza a imagem no navegador usando Canvas.
 * - Reduz para resolução máxima de 1200x1200px mantendo proporção.
 * - Converte para formato WebP com qualidade 82%.
 * - Reduz o tamanho do arquivo em até 90-95%, economizando espaço precioso no Supabase.
 */
export async function optimizeAndResizeImage(
  fileOrBlob: File | Blob,
  options?: ImageOptimizationOptions
): Promise<{ file: File; stats: OptimizationStats }> {
  const maxWidth = options?.maxWidth || 1200;
  const maxHeight = options?.maxHeight || 1200;
  const quality = options?.quality ?? 0.82;
  const format = options?.outputFormat || 'image/webp';

  const originalSize = fileOrBlob.size;
  const originalName = fileOrBlob instanceof File ? fileOrBlob.name : 'foto.jpg';
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const extension = format === 'image/webp' ? 'webp' : 'jpg';
  const newFileName = `${baseName}.${extension}`;

  // SVGs são vetores, não precisam de resize via canvas
  if (fileOrBlob.type === 'image/svg+xml') {
    const file =
      fileOrBlob instanceof File
        ? fileOrBlob
        : new File([fileOrBlob], originalName, { type: fileOrBlob.type });
    return {
      file,
      stats: {
        originalSize,
        optimizedSize: originalSize,
        savedPercentage: 0,
        width: 0,
        height: 0,
      },
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Calcula novas dimensões mantendo aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        const fallback =
          fileOrBlob instanceof File
            ? fileOrBlob
            : new File([fileOrBlob], originalName, { type: fileOrBlob.type });
        return resolve({
          file: fallback,
          stats: { originalSize, optimizedSize: originalSize, savedPercentage: 0, width, height },
        });
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            const fallback =
              fileOrBlob instanceof File
                ? fileOrBlob
                : new File([fileOrBlob], originalName, { type: fileOrBlob.type });
            return resolve({
              file: fallback,
              stats: {
                originalSize,
                optimizedSize: originalSize,
                savedPercentage: 0,
                width,
                height,
              },
            });
          }

          const optimizedFile = new File([blob], newFileName, { type: format });
          const optimizedSize = blob.size;
          const savedPercentage =
            originalSize > 0
              ? Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100))
              : 0;

          resolve({
            file: optimizedFile,
            stats: {
              originalSize,
              optimizedSize,
              savedPercentage,
              width,
              height,
            },
          });
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      const fallback =
        fileOrBlob instanceof File
          ? fileOrBlob
          : new File([fileOrBlob], originalName, { type: fileOrBlob.type });
      resolve({
        file: fallback,
        stats: { originalSize, optimizedSize: originalSize, savedPercentage: 0, width: 0, height: 0 },
      });
    };

    img.src = url;
  });
}

/**
 * Converte DataURL (Base64) em File para permitir upload para o Supabase Storage
 */
export function dataUrlToFile(dataUrl: string, fileName = 'upload.jpg'): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mime });
}
