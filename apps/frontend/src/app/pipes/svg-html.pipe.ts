import { Pipe, PipeTransform, inject } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

@Pipe({ standalone: true, name: "bypassHtmlSanitizer" })
export class BypassHtmlSanitizerPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);


  transform(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
