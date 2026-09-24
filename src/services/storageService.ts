import { getSupabase } from '../lib/supabase';

export const SUPABASE_STORAGE_BUCKET = 'img';
export const SUPABASE_STORAGE_FOLDER = 'img';
export const MAX_PHOTOS_PER_PRODUCT = 5;

export interface OptimizationStats {
  originalSize: number;
  optimizedSize: number;
  savedPercentage: number;
  width: number;
  height: number;
}

export interface UploadResult {
  url: string;
  path: string;
  isSupabase: boolean;
  stats?: OptimizationStats;
  error?: string;
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
function sanitizeFileName(name: string): string {
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

/**
 * Verifica se o bucket existe no Supabase Storage
 */
export async function checkBucketExists(
  bucketName = SUPABASE_STORAGE_BUCKET
): Promise<{ exists: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { exists: false, error: 'Supabase não configurado ou desconectado' };
  }

  try {
    const { data, error } = await supabase.storage.getBucket(bucketName);
    if (error || !data) {
      return { exists: false, error: error?.message || 'Bucket não encontrado' };
    }
    return { exists: true };
  } catch (err: unknown) {
    return { exists: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Tenta criar o bucket 'img' no Supabase se ainda não existir
 */
export async function ensureBucketExists(
  bucketName = SUPABASE_STORAGE_BUCKET
): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Supabase não conectado' };
  }

  try {
    const check = await checkBucketExists(bucketName);
    if (check.exists) {
      return { success: true, message: `Bucket '${bucketName}' já existe e está pronto.` };
    }

    const { error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
    });

    if (error) {
      return {
        success: false,
        message: `Não foi possível criar o bucket '${bucketName}' automaticamente (${error.message}). Crie pelo painel do Supabase com acesso público.`,
      };
    }

    return { success: true, message: `Bucket '${bucketName}' criado com sucesso!` };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Faz upload de uma imagem diretamente para a pasta do bucket 'img' no Supabase Storage.
 * Aplica redimensionamento e otimização automática para economizar espaço no Supabase.
 * Caminho padrão salvo: img/${timestamp}-${nome_arquivo}.webp
 */
export async function uploadImageToSupabase(
  fileOrBlob: File | Blob,
  options?: {
    folder?: string;
    bucket?: string;
    customName?: string;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    skipResize?: boolean;
  }
): Promise<UploadResult> {
  const bucketName = options?.bucket || SUPABASE_STORAGE_BUCKET;
  const folder = (options?.folder || SUPABASE_STORAGE_FOLDER).replace(/^\/+|\/+$/g, '');
  const supabase = getSupabase();

  // 1. Otimiza e redimensiona a imagem antes de qualquer envio
  let fileToUpload: File;
  let stats: OptimizationStats | undefined;

  if (options?.skipResize) {
    const originalName =
      options?.customName ||
      (fileOrBlob instanceof File ? fileOrBlob.name : `foto-${Date.now()}.jpg`);
    fileToUpload =
      fileOrBlob instanceof File
        ? fileOrBlob
        : new File([fileOrBlob], originalName, { type: fileOrBlob.type || 'image/jpeg' });
  } else {
    const optimized = await optimizeAndResizeImage(fileOrBlob, {
      maxWidth: options?.maxWidth || 1200,
      maxHeight: options?.maxHeight || 1200,
      quality: options?.quality ?? 0.82,
      outputFormat: 'image/webp',
    });
    fileToUpload = optimized.file;
    stats = optimized.stats;
  }

  const safeName = sanitizeFileName(options?.customName || fileToUpload.name);
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const filePath = folder ? `${folder}/${uniquePrefix}-${safeName}` : `${uniquePrefix}-${safeName}`;

  // Se o Supabase estiver configurado e conectado
  if (supabase) {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileToUpload, {
          cacheControl: '31536000', // 1 ano de cache para assets estáticos
          upsert: true,
          contentType: fileToUpload.type || 'image/webp',
        });

      if (error) {
        console.warn(`Erro no upload para Supabase Storage (${bucketName}/${filePath}):`, error);

        // Se o bucket não existe, tenta criar e tentar novamente
        if (
          error.message?.toLowerCase().includes('bucket not found') ||
          error.message?.toLowerCase().includes('not found')
        ) {
          const creation = await ensureBucketExists(bucketName);
          if (creation.success) {
            const retry = await supabase.storage
              .from(bucketName)
              .upload(filePath, fileToUpload, {
                cacheControl: '31536000',
                upsert: true,
                contentType: fileToUpload.type || 'image/webp',
              });

            if (!retry.error && retry.data) {
              const { data: pubData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
              return {
                url: pubData.publicUrl,
                path: filePath,
                isSupabase: true,
                stats,
              };
            }
          }
        }

        // Fallback para base64 local
        const fallbackUrl = await blobToDataUrl(fileToUpload);
        return {
          url: fallbackUrl,
          path: filePath,
          isSupabase: false,
          stats,
          error: `Falha no Supabase: ${error.message}. Salvo localmente para não perder a publicação.`,
        };
      }

      // Sucesso no upload para o Supabase! Retorna a URL pública
      const { data: pubData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      return {
        url: pubData.publicUrl,
        path: filePath,
        isSupabase: true,
        stats,
      };
    } catch (err: unknown) {
      console.error('Erro de conexão com Supabase Storage:', err);
      const fallbackUrl = await blobToDataUrl(fileToUpload);
      return {
        url: fallbackUrl,
        path: filePath,
        isSupabase: false,
        stats,
        error: err instanceof Error ? err.message : 'Falha desconhecida',
      };
    }
  }

  // Fallback se o Supabase não estiver conectado ainda
  const fallbackUrl = await blobToDataUrl(fileToUpload);
  return {
    url: fallbackUrl,
    path: filePath,
    isSupabase: false,
    stats,
    error: 'Supabase não conectado. Foto salva em armazenamento local temporário.',
  };
}

/**
 * Upload de múltiplas imagens em lote para a pasta do bucket 'img' com otimização
 */
export async function uploadMultipleImagesToSupabase(
  files: File[],
  options?: {
    folder?: string;
    bucket?: string;
    onProgress?: (completed: number, total: number, stats?: OptimizationStats) => void;
  }
): Promise<{ urls: string[]; results: UploadResult[] }> {
  const results: UploadResult[] = [];
  const urls: string[] = [];
  let count = 0;

  for (const file of files) {
    const res = await uploadImageToSupabase(file, {
      folder: options?.folder,
      bucket: options?.bucket,
    });
    results.push(res);
    urls.push(res.url);
    count++;
    if (options?.onProgress) {
      options.onProgress(count, files.length, res.stats);
    }
  }

  return { urls, results };
}

/**
 * Converte Blob ou File para DataURL (Base64) como fallback
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}

