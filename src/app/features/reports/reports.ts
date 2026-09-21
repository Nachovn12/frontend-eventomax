import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [RouterLink, Icon],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reports {
}
