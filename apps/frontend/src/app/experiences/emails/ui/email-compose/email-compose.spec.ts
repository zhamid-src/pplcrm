import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { ConfirmDialogService } from '../../../../services/shared-dialog.service';
import { EmailActionsStore } from '../../services/store/email-actions.store';
import { ComposeEmailComponent } from './email-compose';

/**
 * onSend must not lose the user's message: the composer closes only after the
 * send actually succeeded, and stays open (content intact) when it fails.
 * The Quill editor is irrelevant to that logic, so the template is stubbed out.
 */
describe('ComposeEmailComponent.onSend', () => {
  let actions: {
    deleteDraft: ReturnType<typeof vi.fn>;
    getDraft: ReturnType<typeof vi.fn>;
    saveDraft: ReturnType<typeof vi.fn>;
    sendEmail: ReturnType<typeof vi.fn>;
  };
  let component: ComposeEmailComponent;
  let finished: ReturnType<typeof vi.fn>;

  const payload = {
    to: 'ada@example.org; grace@example.org',
    cc: '',
    bcc: '',
    subject: 'Volunteer shift',
    html: '<p>See you Saturday.</p>',
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    actions = {
      deleteDraft: vi.fn().mockResolvedValue(undefined),
      getDraft: vi.fn(),
      saveDraft: vi.fn(),
      sendEmail: vi.fn().mockResolvedValue({ id: 'sent-1' }),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: EmailActionsStore, useValue: actions },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn().mockResolvedValue(true) } },
      ],
    });
    // The real template mounts Quill; onSend never touches the DOM.
    TestBed.overrideComponent(ComposeEmailComponent, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(ComposeEmailComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
    finished = vi.fn();
    component.finished.subscribe(finished);
  });

  it('does nothing without a recipient', async () => {
    component.payload.set({ ...payload, to: '   ' });

    await component.onSend();

    expect(actions.sendEmail).not.toHaveBeenCalled();
    expect(finished).not.toHaveBeenCalled();
  });

  it('sends the parsed payload and closes only after success', async () => {
    component.payload.set({ ...payload });

    await component.onSend();

    expect(actions.sendEmail).toHaveBeenCalledWith({
      to: ['ada@example.org', 'grace@example.org'],
      cc: [],
      bcc: [],
      subject: 'Volunteer shift',
      html: '<p>See you Saturday.</p>',
      attachments: [],
    });
    expect(finished).toHaveBeenCalledTimes(1);
    expect(component.sending()).toBe(false);
  });

  it('keeps the composer open with content intact when the send fails', async () => {
    actions.sendEmail.mockRejectedValueOnce(new Error('smtp down'));
    component.payload.set({ ...payload });

    await component.onSend();

    expect(finished).not.toHaveBeenCalled(); // composer stays open…
    expect(component.payload().subject).toBe('Volunteer shift'); // …with the message preserved
    expect(component.sending()).toBe(false); // and the Send button re-enabled
  });

  it('ignores a second send while one is already in flight', async () => {
    let resolveSend: (value: unknown) => void = () => undefined;
    actions.sendEmail.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSend = resolve;
      }),
    );
    component.payload.set({ ...payload });

    const first = component.onSend();
    const second = component.onSend(); // double-click / Enter while sending
    resolveSend({ id: 'sent-1' });
    await Promise.all([first, second]);

    expect(actions.sendEmail).toHaveBeenCalledTimes(1);
    expect(finished).toHaveBeenCalledTimes(1);
  });

  it('retires the source draft after a draft is sent successfully', async () => {
    actions.getDraft.mockResolvedValue({
      id: 'draft-9',
      to_list: ['ada@example.org'],
      cc_list: [],
      bcc_list: [],
      subject: 'Volunteer shift',
      body_html: '<p>See you Saturday.</p>',
    });
    await component.loadDraft('draft-9');

    await component.onSend();

    expect(actions.sendEmail).toHaveBeenCalledTimes(1);
    expect(actions.deleteDraft).toHaveBeenCalledWith('draft-9');
    expect(finished).toHaveBeenCalledTimes(1);
  });

  it('still closes if the send worked but the draft cleanup fails', async () => {
    actions.getDraft.mockResolvedValue({
      id: 'draft-9',
      to_list: ['ada@example.org'],
      cc_list: [],
      bcc_list: [],
      subject: 'Volunteer shift',
      body_html: '<p>See you Saturday.</p>',
    });
    actions.deleteDraft.mockRejectedValueOnce(new Error('gone already'));
    await component.loadDraft('draft-9');

    await component.onSend();

    expect(finished).toHaveBeenCalledTimes(1); // the email did send — don't trap the user
  });
});
