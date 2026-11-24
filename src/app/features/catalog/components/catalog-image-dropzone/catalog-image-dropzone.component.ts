import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  LucideCircleAlert,
  LucideImagePlus,
  LucideLoaderCircle,
  LucideRefreshCw,
  LucideTrash2,
} from '@lucide/angular';
import { ButtonDirective } from '../../../../shared/ui/button.component';

@Component({
  selector: 'emx-catalog-image-dropzone',
  standalone: true,
  imports: [
    ButtonDirective,
    LucideCircleAlert,
    LucideImagePlus,
    LucideLoaderCircle,
    LucideRefreshCw,
    LucideTrash2,
  ],
  templateUrl: './catalog-image-dropzone.component.html',
  styleUrl: './catalog-image-dropzone.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogImageDropzoneComponent {
  readonly imageUrl = input<string | null>(null);
  readonly isDragging = input<boolean>(false);
  readonly isProcessing = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly entityLabel = input<'servicio' | 'equipo'>('servicio');
  readonly imageFit = input<'cover' | 'contain'>('cover');

  readonly fileSelected = output<Event>();
  readonly removeRequested = output<void>();
  readonly dragOverEvent = output<DragEvent>();
  readonly dragLeaveEvent = output<DragEvent>();
  readonly dropEvent = output<DragEvent>();

  /**
   * Shows optimization badge ONLY when compression format is confirmed in the processed Data URL.
   */
  readonly confirmedOptimization = computed<string | null>(() => {
    const url = this.imageUrl();
    if (!url) return null;
    if (url.startsWith('data:image/webp')) return 'WebP optimizada';
    if (url.startsWith('data:image/jpeg')) return 'JPEG optimizada';
    return null;
  });

  readonly imageInfoLabel = computed<string>(() => {
    const url = this.imageUrl();
    if (!url) return '';
    if (url.startsWith('data:image/')) {
      return 'Lista para guardar al confirmar los cambios.';
    }
    return 'Fotografía actual almacenada en el catálogo.';
  });

  onFileChange(event: Event): void {
    this.fileSelected.emit(event);
  }
}
