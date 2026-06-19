import { inject, Pipe, PipeTransform } from '@angular/core';
import { UserService } from '../../services/user.service';

@Pipe({
  name: 'resolveAvatar',
  standalone: true,
})
export class ResolveAvatarPipe implements PipeTransform {
  private readonly userService = inject(UserService);

  transform(url: string | null | undefined): string | null {
    return this.userService.resolveAvatarUrl(url);
  }
}
