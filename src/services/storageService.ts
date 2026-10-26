import { supabase } from '../lib/supabase';

export const REPORT_PHOTOS_BUCKET =
  (import.meta.env.VITE_STORAGE_BUCKET as string | undefined) || 'problem-photos';

export const storageService = {
  getBucketName(): string {
    return REPORT_PHOTOS_BUCKET;
  },

  async uploadProblemPhoto(
    userId: string,
    reportId: string,
    file: File | Blob,
    customFileName?: string
  ): Promise<string> {
    const safeFileName = customFileName || `photo_${Date.now()}_${crypto.randomUUID()}.jpg`;
    const filePath = `${userId}/${reportId}/${safeFileName}`;

    // Ensure we pass a proper File instance with explicit MIME type
    const fileToUpload =
      file instanceof File
        ? file
        : new File([file], safeFileName, {
            type: file.type || 'image/jpeg',
            lastModified: Date.now(),
          });

    const bucketName = this.getBucketName();

    const { error } = await supabase.storage.from(bucketName).upload(filePath, fileToUpload, {
      cacheControl: '3600',
      upsert: false,
      contentType: fileToUpload.type || 'image/jpeg',
    });

    if (error) {
      console.error('Supabase Storage upload failed:', {
        bucket: bucketName,
        fileName: fileToUpload.name,
        fileType: fileToUpload.type,
        fileSize: fileToUpload.size,
        error,
      });
      console.error('Photo upload error:', error);
      throw new Error(`Photo upload failed: ${error.message}`);
    }

    return filePath;
  },

  getPublicUrl(path: string): string {
    const { data } = supabase.storage.from(this.getBucketName()).getPublicUrl(path);
    return data.publicUrl;
  },

  async getSignedUrl(path: string, expiresIn = 3600) {
    const { data, error } = await supabase.storage.from(this.getBucketName()).createSignedUrl(path, expiresIn);
    if (error) {
      console.error('Storage signed URL error:', error);
      throw error;
    }
    return data.signedUrl;
  },

  resolvePhotoUrl,
};

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function resolvePhotoUrl(photoPath: string | null | undefined): Promise<string | null> {
  if (!photoPath || !photoPath.trim()) return null;
  const path = photoPath.trim();

  // If already a full web URL or data/blob URI, return as is
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  // Check in-memory cache to prevent redundant requests
  const cached = signedUrlCache.get(path);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from(REPORT_PHOTOS_BUCKET)
      .createSignedUrl(path, 3600);

    if (error) {
      console.error('Failed to create signed photo URL:', error);
      return null;
    }

    if (data?.signedUrl) {
      signedUrlCache.set(path, {
        url: data.signedUrl,
        expiresAt: Date.now() + 55 * 60 * 1000, // cache for 55 mins
      });
      return data.signedUrl;
    }

    return null;
  } catch (err) {
    console.error('Failed to create signed photo URL:', err);
    return null;
  }
}

