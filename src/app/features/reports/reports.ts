import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChartNoAxesCombined } from '@lucide/angular';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [RouterLink, LucideChartNoAxesCombined],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reports {
}
