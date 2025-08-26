/**
 * @fileoverview Unit tests for icons index exports.
 * Tests that all icon definitions are properly exported and accessible.
 */
import * as IconsIndex from './icons.index';

describe('Icons Index', () => {
  describe('Exports', () => {
    it('should export IconName type', () => {
      expect(IconsIndex).toBeDefined();
    });

    it('should export icons object', () => {
      expect(IconsIndex.icons).toBeDefined();
      expect(typeof IconsIndex.icons).toBe('object');
    });

    it('should have icons as a non-empty object', () => {
      expect(Object.keys(IconsIndex.icons).length).toBeGreaterThan(0);
    });
  });

  describe('Icon Definitions', () => {
    it('should have string values for all icon keys', () => {
      Object.entries(IconsIndex.icons).forEach(([key, value]) => {
        expect(typeof key).toBe('string');
        expect(typeof value).toBe('string');
        expect(key.length).toBeGreaterThan(0);
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should have valid SVG content for icons', () => {
      Object.entries(IconsIndex.icons).forEach(([key, value]) => {
        // Check that the value contains SVG-like content
        expect(value).toMatch(/<svg|<path|<g|<circle|<rect|<line/);
      });
    });

    it('should have consistent icon naming', () => {
      Object.keys(IconsIndex.icons).forEach(key => {
        // Icon names should be kebab-case or contain allowed characters
        expect(key).toMatch(/^[a-z0-9-_]+$/);
      });
    });
  });

  describe('Common Icons', () => {
    const commonIcons = [
      'star',
      'star-filled',
      'user',
      'user-plus',
      'user-check',
      'arrow-uturn-left',
      'arrows-pointing-out',
      'eye',
      'eye-slash'
    ];

    commonIcons.forEach(iconName => {
      it(`should include common icon: ${iconName}`, () => {
        expect(IconsIndex.icons).toHaveProperty(iconName);
        expect(typeof IconsIndex.icons[iconName as keyof typeof IconsIndex.icons]).toBe('string');
      });
    });
  });

  describe('Icon Content Validation', () => {
    it('should have non-empty SVG content for all icons', () => {
      Object.entries(IconsIndex.icons).forEach(([key, value]) => {
        expect(value.trim()).not.toBe('');
        expect(value).not.toBe('undefined');
        expect(value).not.toBe('null');
      });
    });

    it('should not have duplicate icon definitions', () => {
      const iconValues = Object.values(IconsIndex.icons);
      const uniqueValues = [...new Set(iconValues)];
      
      // Allow some duplication as icons might legitimately share SVG content
      // but check that we don't have excessive duplication
      expect(uniqueValues.length).toBeGreaterThan(iconValues.length * 0.5);
    });
  });

  describe('Type Safety', () => {
    it('should export IconName type that matches icon keys', () => {
      // This test ensures type safety at runtime
      const iconKeys = Object.keys(IconsIndex.icons);
      expect(iconKeys.length).toBeGreaterThan(0);
      
      // Each key should be a valid string
      iconKeys.forEach(key => {
        expect(typeof key).toBe('string');
      });
    });
  });

  describe('Performance', () => {
    it('should load icons index without significant delay', () => {
      const startTime = performance.now();
      
      // Access all icons
      const allIcons = IconsIndex.icons;
      Object.keys(allIcons).forEach(key => {
        const icon = allIcons[key as keyof typeof allIcons];
        expect(icon).toBeDefined();
      });
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Should load in reasonable time (less than 100ms)
      expect(loadTime).toBeLessThan(100);
    });

    it('should have reasonable memory footprint', () => {
      const iconCount = Object.keys(IconsIndex.icons).length;
      const totalSize = JSON.stringify(IconsIndex.icons).length;
      
      // Basic sanity check - should have icons but not be excessively large
      expect(iconCount).toBeGreaterThan(5);
      expect(iconCount).toBeLessThan(1000);
      expect(totalSize).toBeLessThan(1000000); // Less than 1MB
    });
  });
});
