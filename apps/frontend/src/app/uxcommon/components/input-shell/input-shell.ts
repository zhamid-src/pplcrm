import { Component, input } from '@angular/core';
import { Icon } from '@icons/icon';
import type { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-input-shell',
  standalone: true,
  imports: [Icon],
  template: `
    <div>
      <label class="relative block">
        @if (icon() !== null) {
          <pc-icon
            [size]="5"
            class="focus-within:text-primary pointer-events-none absolute left-3 top-1/3 h-1 w-4 -translate-y-1/2 transform pt-0.5 text-sm text-gray-300"
            [name]="icon()!"
          />
        }
        <div class="relative w-full min-w-[200px] h-10">
          <ng-content></ng-content>
          <label
            [class.pl-8]="icon() !== null"
            class="flex w-full h-full select-none pointer-events-none absolute left-0 font-normal !overflow-visible truncate leading-tight transition-all -top-1.5 text-[11px] before:content[' '] before:block before:box-border before:w-2.5 before:h-1.5 before:mt-[6.5px] before:mr-1 before:rounded-tl-md before:border-t before:border-l before:pointer-events-none before:transition-all after:content[' '] after:block after:flex-grow after:box-border after:w-2.5 after:h-1.5 after:mt-[6.5px] after:ml-1 after:rounded-tr-md after:border-t after:border-r after:pointer-events-none after:transition-all text-gray-400 peer-invalid:text-error before:border-blue-gray-200 before:peer-invalid:border-error after:border-blue-gray-200 after:peer-invalid:border-error peer-disabled:after:border-transparent peer-disabled:before:border-transparent peer-focus:leading-tight peer-focus:text-primary peer-focus:text-[11px] peer-focus:pl-0 peer-focus:before:border-t-2 peer-focus:before:!border-primary peer-focus:before:border-l-2 peer-focus:after:border-t-2 peer-focus:after:border-r-2 peer-focus:after:!border-primary peer-placeholder-shown:text-sm peer-placeholder-shown:before:border-transparent peer-placeholder-shown:after:border-transparent peer-placeholder-shown:leading-[3.75]"
            >{{ placeholder() }}
          </label>
        </div>
      </label>
    </div>
  `,
})
export class InputShellComponent {
  public icon = input<PcIconNameType | null>(null);
  public placeholder = input<string>('');
}

