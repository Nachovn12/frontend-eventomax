import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from './icon';
@Component({
  selector: 'emx-demo-notice',
  standalone: true,
  imports: [Icon],
  template:
    '<div class="demo-notice"><emx-icon name="info" /><p><strong>Datos de demostración local</strong><span>Escenario ficticio · septiembre 2026. Los filtros solo afectan esta vista; no se envían ni guardan cambios.</span></p><span class="demo-tag">DEMO UI</span></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoNotice {}
