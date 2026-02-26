import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DoctorCard from '@/components/public/DoctorCard';
import type { PublicDoctorProfile } from '@/services/publicService';

const baseDoctor: PublicDoctorProfile = {
  _id: '1',
  name: '',
  email: '',
  phone: '',
  specialization: 'Psychiatry',
  qualifications: [],
  experience: 5,
  bio: '',
  location: { address: '', city: '', state: '', zipCode: '' },
  consultationFee: 300,
  rating: 0,
  totalReviews: 0,
  responseTime: '',
  availability: [],
  availableOnline: false,
  availablePhysical: false,
};

describe('DoctorCard component', () => {
  it('shows fallback name when name missing or matches specialization', () => {
    render(<DoctorCard doctor={baseDoctor} />);
    expect(screen.getByText(/Dr\./i)).toBeTruthy();
    // should use specialization as name if empty
    expect(screen.getByText(/Psychiatry/i)).toBeTruthy();
  });

  it('renders formatted location placeholder when missing', () => {
    render(<DoctorCard doctor={baseDoctor} />);
    expect(screen.getByText(/Location unavailable/i)).toBeTruthy();
  });
});