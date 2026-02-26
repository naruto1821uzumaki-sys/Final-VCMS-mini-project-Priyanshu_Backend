import { describe, it, expect } from 'vitest';
import { formatLocation } from '@/utils/formatLocation';

describe('formatLocation util', () => {
  it('returns combined address/city/state when provided', () => {
    const loc = { address: '123 Main St', city: 'Mumbai', state: 'MH' };
    expect(formatLocation(loc)).toBe('123 Main St, Mumbai, MH');
  });

  it('handles string inputs gracefully', () => {
    expect(formatLocation('Bangalore')).toBe('Bangalore');
    expect(formatLocation('Unknown')).toBe('Location unavailable');
  });

  it('filters out unknown placeholders', () => {
    const loc = { address: '', city: 'Unknown city', state: 'Unknown state' };
    expect(formatLocation(loc)).toBe('Location unavailable');
  });

  it('returns default when no location', () => {
    expect(formatLocation(null)).toBe('Location unavailable');
    expect(formatLocation(undefined)).toBe('Location unavailable');
  });
});