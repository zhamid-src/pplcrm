import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComposeEmailComponent } from './email-compose';
import { EmailActionsStore } from '../../services/store/email-actions.store';
import { ConfirmDialogService } from '@uxcommon/services/shared-dialog.service';

describe('ComposeEmailComponent discard', () => {
  let component: ComposeEmailComponent;
  let fixture: ComponentFixture<ComposeEmailComponent>;
  let actions: jest.Mocked<EmailActionsStore>;
  let dialogs: jest.Mocked<ConfirmDialogService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComposeEmailComponent],
      providers: [
        { provide: EmailActionsStore, useValue: { deleteDraft: jest.fn(), saveDraft: jest.fn(), sendEmail: jest.fn() } },
        { provide: ConfirmDialogService, useValue: { confirm: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ComposeEmailComponent);
    component = fixture.componentInstance;
    actions = TestBed.inject(EmailActionsStore) as jest.Mocked<EmailActionsStore>;
    dialogs = TestBed.inject(ConfirmDialogService) as jest.Mocked<ConfirmDialogService>;
  });

  it('should close immediately when pristine and no draft', async () => {
    const finished = jest.fn();
    component.finished.subscribe(finished);
    await component.discard();
    expect(dialogs.confirm).not.toHaveBeenCalled();
    expect(finished).toHaveBeenCalled();
  });

  it('should confirm when form is dirty', async () => {
    dialogs.confirm.mockResolvedValue(true);
    component.form.markAsDirty();
    const finished = jest.fn();
    component.finished.subscribe(finished);
    await component.discard();
    expect(dialogs.confirm).toHaveBeenCalled();
    expect(actions.deleteDraft).not.toHaveBeenCalled();
    expect(finished).toHaveBeenCalled();
  });

  it('should delete draft when confirmed and draft exists', async () => {
    dialogs.confirm.mockResolvedValue(true);
    component.draftId.set('42');
    const finished = jest.fn();
    component.finished.subscribe(finished);
    await component.discard();
    expect(dialogs.confirm).toHaveBeenCalled();
    expect(actions.deleteDraft).toHaveBeenCalledWith('42');
    expect(finished).toHaveBeenCalled();
  });

  it('should patch form with initial values', () => {
    component.initial = { to: 'a@example.com', subject: 'Hello' };
    expect(component.form.value.to).toBe('a@example.com');
    expect(component.form.value.subject).toBe('Hello');
  });
});
