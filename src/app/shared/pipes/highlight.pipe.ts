import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true,
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  public transform(value: string | null | undefined, search: string | null | undefined): SafeHtml {
    if (!value) return '';
    if (!search || !search.trim()) return value;

    try {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedSearch})`, 'gi');
      const result = value.replace(regex, '<span class="highlight">$1</span>');
      return this.sanitizer.bypassSecurityTrustHtml(result);
    } catch (e) {
      console.error('HighlightPipe error:', e);
      return value;
    }
  }
}
