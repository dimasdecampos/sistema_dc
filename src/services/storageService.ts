import { getSupabase } from '../lib/supabase';

export const SUPABASE_STORAGE_BUCKET = 'img';
export const SUPABASE_STORAGE_FOLDER = '';
export const MAX_PHOTOS_PER_PRODUCT = 5;

// Buckets suportados em ordem de tentativa
export const STORAGE_BUCKET_CANDIDATES = ['img', 'Img', 'images'];

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
  bucketUsed?: string;
  stats?: OptimizationStats;
  error?: string;
  isRlsError?: boolean;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
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
 * Testa ativamente a conexão e escrita no bucket de imagens do Supabase
 */
export async function testSupabaseStorageBucket(
  preferredBucket = SUPABASE_STORAGE_BUCKET
): Promise<{
  success: boolean;
  bucketName: string;
  message: string;
  isRlsError?: boolean;
  isBucketNotFoundError?: boolean;
  details?: string;
  publicUrl?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      bucketName: preferredBucket,
      message: 'Supabase não conectado. Configure a URL e a Chave Anon.',
    };
  }

  // Tenta primeiro o bucket preferido, depois candidatos alternativos
  const candidates = Array.from(
    new Set([preferredBucket, ...STORAGE_BUCKET_CANDIDATES])
  );

  let lastError: string | undefined;
  let isRls = false;
  let isNotFound = false;

  // Tiny 1x1 WebP pixel para teste
  const testPixel = dataUrlToFile(
    'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=',
    'ping.webp'
  );
  const testPath = `_probe_test_${Date.now()}.webp`;

  for (const bucket of candidates) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(testPath, testPixel, {
          cacheControl: '60',
          upsert: true,
          contentType: 'image/webp',
        });

      if (!error && data) {
        const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(testPath);
        // Remove arquivo de teste (best-effort)
        supabase.storage.from(bucket).remove([testPath]).catch(() => {});

        return {
          success: true,
          bucketName: bucket,
          message: `Bucket '${bucket}' está ativo e gravando fotos com sucesso!`,
          publicUrl: pubData.publicUrl,
        };
      }

      if (error) {
        lastError = error.message;
        const msg = error.message?.toLowerCase() || '';
        if (
          msg.includes('row-level security') ||
          msg.includes('violates') ||
          msg.includes('policy') ||
          (error as any).statusCode === '403'
        ) {
          isRls = true;
          // Bucket existe, mas RLS bloqueou inserção
          return {
            success: false,
            bucketName: bucket,
            message: `O bucket '${bucket}' existe, mas as Políticas RLS de acesso público precisam ser executadas no Supabase SQL Editor.`,
            isRlsError: true,
            details: error.message,
          };
        }
        if (msg.includes('not found') || (error as any).statusCode === '404') {
          isNotFound = true;
        }
      }
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  if (isNotFound) {
    return {
      success: false,
      bucketName: preferredBucket,
      message: `Nenhum dos buckets ('${candidates.join("', '")}') foi encontrado. Crie o bucket 'img' como público ou execute o script SQL.`,
      isBucketNotFoundError: true,
      details: lastError,
    };
  }

  return {
    success: false,
    bucketName: preferredBucket,
    message: `Falha no teste do bucket: ${lastError || 'Erro desconhecido'}`,
    isRlsError: isRls,
    details: lastError,
  };
}

/**
 * Verifica se o bucket existe no Supabase Storage
 */
export async function checkBucketExists(
  bucketName = SUPABASE_STORAGE_BUCKET
): Promise<{ exists: boolean; bucketName: string; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { exists: false, bucketName, error: 'Supabase não configurado ou desconectado' };
  }

  const candidates = Array.from(new Set([bucketName, ...STORAGE_BUCKET_CANDIDATES]));
  for (const b of candidates) {
    try {
      const { data, error } = await supabase.storage.getBucket(b);
      if (!error && data) {
        return { exists: true, bucketName: b };
      }
    } catch {
      // Ignora erro e tenta o próximo
    }
  }

  // Tenta teste prático com probe
  const testRes = await testSupabaseStorageBucket(bucketName);
  if (testRes.success || testRes.isRlsError) {
    return { exists: true, bucketName: testRes.bucketName };
  }

  return { exists: false, bucketName, error: testRes.message };
}

/**
 * Tenta criar ou validar o bucket 'img' no Supabase
 */
export async function ensureBucketExists(
  bucketName = SUPABASE_STORAGE_BUCKET
): Promise<{ success: boolean; message: string; bucketName: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Supabase não conectado', bucketName };
  }

  try {
    const test = await testSupabaseStorageBucket(bucketName);
    if (test.success) {
      return { success: true, message: `Bucket '${test.bucketName}' já existe e está funcionando!`, bucketName: test.bucketName };
    }

    if (test.isRlsError) {
      return {
        success: false,
        bucketName: test.bucketName,
        message: `Bucket '${test.bucketName}' existe, mas bloqueou o envio por RLS. Execute o script de correção no SQL Editor do Supabase.`,
      };
    }

    // Tenta criar via API administrativa se permitido
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });

    if (error) {
      return {
        success: false,
        bucketName,
        message: `Não foi possível criar o bucket '${bucketName}' automaticamente via chave Anon (${error.message}). Crie pelo painel do Supabase (Storage > New Bucket: img, marcado como Public) ou execute o script SQL.`,
      };
    }

    return { success: true, message: `Bucket '${bucketName}' criado com sucesso!`, bucketName };
  } catch (err: unknown) {
    return {
      success: false,
      bucketName,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Faz upload de uma imagem para o bucket do Supabase Storage.
 * - Tenta os buckets suportados ('img', 'Img', 'images').
 * - Aplica redimensionamento e otimização automática para economizar ~90% de espaço.
 * - Se falhar no Supabase, salva com fallback base64 MAS retorna diagnóstico transparente.
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
  const primaryBucket = options?.bucket || SUPABASE_STORAGE_BUCKET;
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
    const candidateBuckets = Array.from(
      new Set([primaryBucket, ...STORAGE_BUCKET_CANDIDATES])
    );

    let lastError: string | undefined;
    let isRlsError = false;

    for (const b of candidateBuckets) {
      try {
        const { error, data } = await supabase.storage
          .from(b)
          .upload(filePath, fileToUpload, {
            cacheControl: '31536000', // 1 ano de cache
            upsert: true,
            contentType: fileToUpload.type || 'image/webp',
          });

        if (!error && data) {
          // Sucesso no upload para o Supabase! Retorna a URL pública
          const { data: pubData } = supabase.storage.from(b).getPublicUrl(filePath);
          return {
            url: pubData.publicUrl,
            path: filePath,
            isSupabase: true,
            bucketUsed: b,
            stats,
          };
        }

        if (error) {
          lastError = error.message;
          const msg = error.message?.toLowerCase() || '';
          if (
            msg.includes('row-level security') ||
            msg.includes('violates') ||
            msg.includes('policy') ||
            (error as any).statusCode === '403'
          ) {
            isRlsError = true;
          }
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    // Se chegou aqui, todos os buckets candidatos falharam no Supabase
    console.warn(`Falha ao salvar no Supabase Storage:`, lastError);
    const fallbackUrl = await blobToDataUrl(fileToUpload);

    let errorDetail = `Falha no Supabase: ${lastError || 'Erro desconhecido'}.`;
    if (isRlsError) {
      errorDetail = `Erro de Permissão (RLS): O bucket existe, mas falta a política de inserção pública no Supabase. Execute o script SQL no SQL Editor.`;
    } else if (lastError?.toLowerCase().includes('not found')) {
      errorDetail = `Bucket '${primaryBucket}' não encontrado no seu Supabase. Crie o bucket com nome 'img' e acesso público (Public).`;
    }

    return {
      url: fallbackUrl,
      path: filePath,
      isSupabase: false,
      stats,
      isRlsError,
      error: `${errorDetail} (Foto mantida localmente para não perder seu anúncio).`,
    };
  }

  // Fallback se o Supabase não estiver conectado ainda
  const fallbackUrl = await blobToDataUrl(fileToUpload);
  return {
    url: fallbackUrl,
    path: filePath,
    isSupabase: false,
    stats,
    error: 'Supabase não conectado. Configure a URL e Chave Anon para gravar as fotos na nuvem.',
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
 * Exclui uma imagem do Supabase Storage dado seu caminho ou URL pública.
 * Suporta buckets 'Img' e 'img'.
 */
export async function deleteImageFromSupabase(urlOrPath: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !urlOrPath) return false;

  // Se for DataURL (base64) ou foto externa (ex: Unsplash), não precisa apagar do Supabase
  if (urlOrPath.startsWith('data:') || urlOrPath.includes('images.unsplash.com')) {
    return true;
  }

  let targetBucket = SUPABASE_STORAGE_BUCKET;
  let filePath = urlOrPath;

  // Se for URL pública do Supabase (.../storage/v1/object/public/<bucket>/<path>)
  const match = urlOrPath.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (match) {
    targetBucket = match[1];
    filePath = match[2];
  } else {
    // Remove possíveis prefixos de bucket se passados no path
    filePath = filePath.replace(/^Img\//, '').replace(/^img\//, '');
  }

  try {
    const { error } = await supabase.storage.from(targetBucket).remove([filePath]);
    if (error) {
      // Tenta na capitalização alternativa
      const altBucket = targetBucket === 'Img' ? 'img' : 'Img';
      await supabase.storage.from(altBucket).remove([filePath]);
    }
    return true;
  } catch (err) {
    console.warn('Erro ao remover imagem do Supabase Storage:', err);
    return false;
  }
}

/**
 * Exclui múltiplas fotos de um anúncio do Supabase Storage
 */
export async function deleteMultipleImagesFromSupabase(urlsOrPaths: string[]): Promise<void> {
  if (!urlsOrPaths || urlsOrPaths.length === 0) return;
  await Promise.allSettled(urlsOrPaths.map((p) => deleteImageFromSupabase(p)));
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

