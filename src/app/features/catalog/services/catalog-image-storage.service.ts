import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CatalogImageStorageService {
  private readonly storagePrefix = 'eventomax_catalog_img_';

  getImage(type: 'service' | 'equipment', id: number | string): string | null {
    if (!id) return null;
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return localStorage.getItem(`${this.storagePrefix}${type}_${id}`);
    } catch {
      return null;
    }
  }

  setImage(type: 'service' | 'equipment', id: number | string, dataUrl: string): void {
    if (!id || !dataUrl) return;
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.setItem(`${this.storagePrefix}${type}_${id}`, dataUrl);
    } catch (err) {
      console.warn('[CatalogImageStorage] Failed to store image:', err);
    }
  }

  removeImage(type: 'service' | 'equipment', id: number | string): void {
    if (!id) return;
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.removeItem(`${this.storagePrefix}${type}_${id}`);
    } catch {
      // ignore
    }
  }

  /**
   * Resizes and compresses image to lightweight WebP or JPEG Data URL (< 150KB)
   */
  async processImageFile(file: File, maxDim = 800, quality = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('El archivo seleccionado no es una imagen válida.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          try {
            const dataUrl = canvas.toDataURL('image/webp', quality);
            resolve(dataUrl);
          } catch {
            resolve(canvas.toDataURL('image/jpeg', quality));
          }
        };
        img.onerror = () => reject(new Error('No se pudo decodificar la imagen seleccionada.'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
      reader.readAsDataURL(file);
    });
  }
}
