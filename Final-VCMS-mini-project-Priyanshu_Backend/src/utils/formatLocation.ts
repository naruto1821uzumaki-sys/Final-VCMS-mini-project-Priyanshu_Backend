// Utility to convert a doctor/user location field into a displayable string.
// Some APIs return a simple string, others return an object with address/city/state.

export function formatLocation(loc: any): string {
  if (!loc) return 'Location unavailable';
  if (typeof loc === 'string') {
    // if string is empty or generic unknown, fallback
    if (/^\s*unknown/i.test(loc)) return 'Location unavailable';
    return loc;
  }
  // object containing address/city/state/zipCode
  if (loc.address || loc.city || loc.state) {
    const clean = (val: any) => {
      if (!val) return '';
      if (typeof val === 'string' && /^\s*unknown/i.test(val)) return '';
      return val;
    };
    const result = [loc.address, loc.city, loc.state].map(clean).filter(Boolean).join(', ');
    return result || 'Location unavailable';
  }
  return 'Location unavailable';
}
