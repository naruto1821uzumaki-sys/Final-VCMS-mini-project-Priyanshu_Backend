/**
 * DoctorCard - Reusable doctor profile card component
 * 
 * Displays:
 * - Doctor's name, specialization
 * - Avatar/image
 * - Rating and review count
 * - Quick info (experience, availability)
 * - Call-to-action button
 */

import { Star, MapPin, Calendar, Badge } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatLocation } from '@/utils/formatLocation';
import type { PublicDoctorProfile } from '@/services/publicService';

interface DoctorCardProps {
  doctor: PublicDoctorProfile;
  onBookClick?: (doctorId: string) => void;
}

export function DoctorCard({ doctor, onBookClick }: DoctorCardProps) {
  const averageRating = doctor.rating || 0;
  const ratingPercentage = (averageRating / 5) * 100;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header with Badge */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-r from-blue-50 to-blue-100"></div>
        {doctor.avatar && (
          <img
            src={doctor.avatar}
            alt={doctor.name}
            className="absolute top-12 left-4 w-24 h-24 rounded-lg border-4 border-white shadow-md object-cover"
          />
        )}
        {!doctor.avatar && (
          <div className="absolute top-12 left-4 w-24 h-24 rounded-lg border-4 border-white bg-gray-300 flex items-center justify-center shadow-md">
            <span className="text-2xl font-bold text-gray-600">
              {doctor.name.charAt(0)}
            </span>
          </div>
        )}
        {doctor.approvalStatus === 'approved' && (
          <div className="absolute top-2 right-2 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Badge className="w-3 h-3" />
            Verified
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-6 pt-14 pb-4">
        {/* Name and Specialization */}
        <h3 className="text-lg font-bold text-gray-900">
          Dr. {doctor.name || doctor.specialization || 'Unknown'}
        </h3>
        <p className="text-sm text-blue-600 font-medium mb-3">
          {doctor.specialization || 'General'}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.round(averageRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">
            {averageRating.toFixed(1)} ({doctor.totalReviews} reviews)
          </span>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>{doctor.experience} years exp</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>{formatLocation(doctor.location)}</span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {doctor.availableOnline && (
            <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">
              Online
            </span>
          )}
          {doctor.availablePhysical && (
            <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">
              In-Person
            </span>
          )}
        </div>

        {/* Fee */}
        <div className="flex justify-between items-center mb-4 pt-3 border-t">
          <span className="text-sm text-gray-600">Consultation Fee</span>
          <span className="text-lg font-bold text-gray-900">
            ₹{doctor.consultationFee}
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2">
          <Link
            to={`/doctors/${doctor._id}`}
            className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors text-center"
          >
            View Profile
          </Link>
          <button
            onClick={() => onBookClick?.(doctor._id)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default DoctorCard;
