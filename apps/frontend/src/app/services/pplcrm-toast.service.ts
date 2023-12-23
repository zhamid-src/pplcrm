import { Injectable } from "@angular/core";
import { IndividualConfig, ToastrService } from "ngx-toastr";

/**
 * The service that shows notifications
 */
@Injectable({
  providedIn: "root",
})
export class PplCrmToastrService {
  private defaultOptions = {
    positionClass: "toast-top-full-width",
    messageClass: "toast-title text-center",
  };

  constructor(private toastr: ToastrService) {}

  /**
   * Used sparingly. Provides info to users in context
   * @param message The message to show in the snackbar.
   * @param action The label for the snackbar action.
   */
  info(message: string, title?: string, options?: Partial<IndividualConfig>) {
    return this.toastr.info(message, title, {
      toastClass: "ngx-toastr bg-info",
      ...this.defaultOptions,
      ...options,
    });
  }

  /**
   * Used to provide success status (eg: "you're successfully logged in")
   * @param message The message to show in the snackbar.
   * @param action The label for the snackbar action.
   */
  success(
    message: string,
    title?: string,
    options?: Partial<IndividualConfig>,
  ) {
    return this.toastr.success(message, title, {
      toastClass: "ngx-toastr bg-success",
      ...this.defaultOptions,
      ...options,
    });
  }

  /**
   * Used for errors, malfunctions and critical issues (eg: license expiration)
   * @param message The message to show in the snackbar.
   * @param action The label for the snackbar action.
   */
  error(message: string, title?: string, options?: Partial<IndividualConfig>) {
    if (!message?.length) {
      return;
    }
    return this.toastr.error(message, title, {
      toastClass: "ngx-toastr bg-error",
      ...this.defaultOptions,
      ...options,
    });
  }

  /**
   * Used for warnings, a message that needs the user attention but
   * will not cause errors
   * @param message The message to show in the snackbar.
   * @param action The label for the snackbar action.
   */
  warn(message: string, title?: string, options?: Partial<IndividualConfig>) {
    return this.toastr.warning(message, title, {
      toastClass: "ngx-toastr bg-warning",
      ...this.defaultOptions,
      ...options,
    });
  }

  clear() {
    return this.toastr.clear();
  }
}
