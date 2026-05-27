import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tags } from './tags';
import { TagsService } from '@experiences/tags/services/tags-service';
import { TagPaletteService } from './tag-palette.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('Tags Component', () => {
  let component: Tags;
  let fixture: ComponentFixture<Tags>;
  let mockTagsService: any;
  let mockPaletteService: any;

  beforeEach(async () => {
    mockTagsService = {
      findByName: vi.fn().mockResolvedValue([{ name: 'VIP' }]),
    };

    mockPaletteService = {
      palette: vi.fn().mockReturnValue({ VIP: 'red' }),
      colorFor: vi.fn().mockReturnValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [Tags],
      providers: [
        { provide: TagsService, useValue: mockTagsService },
        { provide: TagPaletteService, useValue: mockPaletteService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tags);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeDefined();
  });

  it('should initialize and display tags provided via input', () => {
    fixture.componentRef.setInput('tags', ['VIP', 'New']);
    fixture.detectChanges();

    // Verify internal displayTags returns correctly resolved colors
    const views = component['displayTags']();
    expect(views.length).toBe(2);
    expect(views.find(v => v.name === 'VIP')?.color).toBe('red');
    expect(views.find(v => v.name === 'New')?.color).toBeNull();
  });

  it('should add a new tag and emit events', () => {
    fixture.componentRef.setInput('tags', ['VIP']);
    fixture.detectChanges();

    const addSpy = vi.spyOn(component.tagAdded, 'emit');
    const changeSpy = vi.spyOn(component.tagsChange, 'emit');

    // act
    component['add']('NewTag');

    expect(addSpy).toHaveBeenCalledWith('NewTag');
    expect(changeSpy).toHaveBeenCalledWith(['NewTag', 'VIP']);
    expect(component.tags()).toEqual(['NewTag', 'VIP']);
  });

  it('should move an existing tag to the front if added again', () => {
    fixture.componentRef.setInput('tags', ['A', 'B', 'C']);
    fixture.detectChanges();

    const addSpy = vi.spyOn(component.tagAdded, 'emit');
    const changeSpy = vi.spyOn(component.tagsChange, 'emit');

    // act
    component['add']('B');

    // Should not emit tagAdded since it already exists
    expect(addSpy).not.toHaveBeenCalled();
    // But it should move 'B' to the front and emit tagsChange
    expect(component.tags()).toEqual(['B', 'C', 'A']);
    expect(changeSpy).toHaveBeenCalledWith(['B', 'C', 'A']);
  });

  it('should remove a tag and emit events', () => {
    fixture.componentRef.setInput('tags', ['A', 'B']);
    fixture.detectChanges();

    const removeSpy = vi.spyOn(component.tagRemoved, 'emit');
    const changeSpy = vi.spyOn(component.tagsChange, 'emit');

    // act
    component['remove']('A');

    expect(removeSpy).toHaveBeenCalledWith('A');
    expect(changeSpy).toHaveBeenCalledWith(['B']);
    expect(component.tags()).toEqual(['B']);
  });

  it('should filter suggestions via tags service', async () => {
    fixture.detectChanges();

    const result = await component.filter('VI');
    expect(mockTagsService.findByName).toHaveBeenCalledWith('VI', 'tag');
    expect(result).toEqual(['VIP']);
  });
  
  it('should gracefully handle empty filters', async () => {
    fixture.detectChanges();
    const result = await component.filter('');
    expect(result).toEqual([]);
    expect(mockTagsService.findByName).not.toHaveBeenCalled();
  });
});
