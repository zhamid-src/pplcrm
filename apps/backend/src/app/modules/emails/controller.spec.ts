import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailsController } from './controller';
import { BadRequestError, InternalError } from '../../errors/app-errors';

describe('EmailsController Comments', () => {
  let controller: EmailsController;

  beforeEach(() => {
    controller = new EmailsController();
    vi.restoreAllMocks();
  });

  it('should throw BadRequestError if comment is empty or whitespace', async () => {
    await expect(controller.addComment('tenant-1', 'email-1', 'author-1', '')).rejects.toThrow(BadRequestError);
    await expect(controller.addComment('tenant-1', 'email-1', 'author-1', '   ')).rejects.toThrow(BadRequestError);
  });

  it('should call commentsRepo.add with the correct parameters', async () => {
    const mockCommentRow = {
      id: 'comment-123',
      tenant_id: 'tenant-1',
      email_id: 'email-1',
      author_id: 'author-1',
      comment: 'This is a test comment',
      createdby_id: 'author-1',
      updatedby_id: 'author-1',
    };

    const addSpy = vi.spyOn((controller as any).commentsRepo, 'add').mockResolvedValue(mockCommentRow);

    const result = await controller.addComment('tenant-1', 'email-1', 'author-1', 'This is a test comment');

    expect(addSpy).toHaveBeenCalledWith({
      row: {
        tenant_id: 'tenant-1',
        email_id: 'email-1',
        author_id: 'author-1',
        comment: 'This is a test comment',
        createdby_id: 'author-1',
        updatedby_id: 'author-1',
      },
    });
    expect(result).toEqual(mockCommentRow);
  });

  it('should throw InternalError if commentsRepo.add returns null or undefined', async () => {
    vi.spyOn((controller as any).commentsRepo, 'add').mockResolvedValue(undefined);

    await expect(
      controller.addComment('tenant-1', 'email-1', 'author-1', 'Some comment')
    ).rejects.toThrow(InternalError);
  });
});
