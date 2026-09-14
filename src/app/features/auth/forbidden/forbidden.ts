import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Forbidden {}
