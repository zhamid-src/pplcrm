import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { FormDetail } from '../services/forms-service';

/**
 * Read-only render of a donation form's public card — the donation counterpart to
 * `pc-form-render`, shown in the Forms preview pane so donation forms preview inline like every
 * other form. It mirrors the fixed shape of the server-rendered `/d/:slug` page (amount + contact
 * + address + Stripe checkout), which donation forms always use regardless of their stored
 * `fields`, so it stays truthful without reading the (standard-shaped) normalized field list.
 */
@Component({
  selector: 'pc-donation-render',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-[440px] pc-panel p-8" [class.opacity-70]="closed()">
      <div class="mb-5 flex items-center gap-2">
        <div
          class="flex size-7 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary"
        >
          {{ orgInitials() }}
        </div>
        <span class="text-sm font-medium text-base-content">{{ orgName() }}</span>
      </div>

      @if (closed()) {
        <h2 class="mb-2 text-2xl font-bold text-base-content">This form is closed</h2>
        <p class="text-sm text-base-content/60">{{ orgName() }} isn’t taking donations here right now.</p>
      } @else {
        <h2 class="mb-2 text-2xl font-bold tracking-tight text-base-content">{{ form().name }}</h2>
        @if (form().description) {
          <p class="mb-6 text-sm leading-relaxed text-base-content/60">{{ form().description }}</p>
        } @else {
          <div class="mb-6"></div>
        }

        <div class="flex flex-col gap-6">
          <!-- Amount leads the donation page (one-time vs monthly). -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-base-content">
              {{ recurring() ? 'Monthly amount' : 'Donation amount' }}
              <span class="text-base-content/50"> *</span>
            </label>
            <label class="input input-bordered flex w-full items-center gap-2 bg-base-100 text-sm">
              <span class="text-base-content/50">$</span>
              <input class="grow" placeholder="50" disabled />
            </label>
            @if (recurring()) {
              <span class="text-xs text-base-content/50">Billed to the donor every month until they cancel.</span>
            }
          </div>

          @for (f of contactFields; track f.key) {
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-base-content">
                {{ f.label }}
                @if (f.required) {
                  <span class="text-base-content/50"> *</span>
                }
              </label>
              @if (f.key === 'country') {
                <select class="select select-bordered w-full bg-base-100 text-sm" disabled>
                  <option>Canada</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Australia</option>
                </select>
              } @else {
                <input class="input input-bordered w-full bg-base-100 text-sm" [placeholder]="f.placeholder" disabled />
              }
            </div>
          }

          <button class="btn btn-primary mt-1 w-full" type="button" disabled>{{ submitLabel() }}</button>
        </div>
      }

      <p class="mt-6 text-center text-xs text-base-content/40">Secure payment by Stripe · Powered by pplCRM</p>
    </div>
  `,
})
export class DonationFormRenderComponent {
  public readonly form = input.required<FormDetail>();
  public readonly orgName = input<string>('Your organization');
  /** When true, render the "closed" card instead of the form (archived/unpublished public page). */
  public readonly closed = input<boolean>(false);

  /** The fixed contact + address fields the /d/:slug page always collects, in render order. */
  protected readonly contactFields = [
    { key: 'first_name', label: 'First name', required: true, placeholder: 'John' },
    { key: 'last_name', label: 'Last name', required: true, placeholder: 'Doe' },
    { key: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
    { key: 'street1', label: 'Street address', required: true, placeholder: '123 Main St' },
    { key: 'city', label: 'City', required: true, placeholder: 'Toronto' },
    { key: 'country', label: 'Country', required: true, placeholder: '' },
    { key: 'state', label: 'State / province', required: true, placeholder: 'ON or NY' },
    { key: 'zip', label: 'Zip / postal code', required: true, placeholder: 'M5V 2T6' },
  ] as const;

  protected readonly recurring = computed(() => this.form().form_type === 'recurring_donation');

  protected readonly submitLabel = computed(() => {
    const label = this.form().submit_label?.trim();
    if (label) return label;
    return this.recurring() ? 'Give monthly' : 'Donate';
  });

  protected readonly orgInitials = computed(() => {
    const name = this.orgName().trim();
    if (!name) return 'pC';
    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map((p) => p.charAt(0).toUpperCase()).join('') || 'pC';
  });
}
