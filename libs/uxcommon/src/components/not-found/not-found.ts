import { Component } from '@angular/core';

/**
 * A fallback component rendered when a route is not found.
 * Typically used to display a 404-style message.
 */
@Component({
  selector: 'pc-not-found',
  imports: [],
  template: `<section class="min-h-full">
    <div class="md:px-12 lg:px-0">
      <div class="max-auto w-full justify-center text-center lg:p-10">
        <div class="mx-auto w-full justify-center">
          <p class="text-5xl tracking-tight lg:text-9xl">404</p>
          <p class="mx-auto mt-4 max-w-xl text-lg font-light">Please check the URL in the address bar and try again.</p>
        </div>
        <div class="mt-10 flex justify-center gap-3">
          <a href="/" class="link link-hover">Home&nbsp; → </a>
        </div>
      </div>
    </div>
  </section>`,
})
export class NotFound {}
