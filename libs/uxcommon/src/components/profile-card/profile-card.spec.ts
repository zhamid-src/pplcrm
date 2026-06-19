import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileCard } from './profile-card';
import { describe, it, expect, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

describe('ProfileCard Component', () => {
  let component: ProfileCard;
  let fixture: ComponentFixture<ProfileCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render initials when avatarText is provided', () => {
    fixture.componentRef.setInput('avatarText', 'JD');
    fixture.detectChanges();
    const avatarEl = fixture.debugElement.query(By.css('.avatar'));
    expect(avatarEl).toBeTruthy();
    expect(avatarEl.nativeElement.textContent.trim()).toBe('JD');
  });

  it('should render image when avatarUrl is provided', () => {
    fixture.componentRef.setInput('avatarUrl', 'https://example.com/avatar.jpg');
    fixture.detectChanges();
    const imgEl = fixture.debugElement.query(By.css('img'));
    expect(imgEl).toBeTruthy();
    expect(imgEl.nativeElement.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  it('should render icon when iconName is provided', () => {
    fixture.componentRef.setInput('iconName', 'home');
    fixture.detectChanges();
    const iconEl = fixture.debugElement.query(By.css('pc-icon'));
    expect(iconEl).toBeTruthy();
  });
});
