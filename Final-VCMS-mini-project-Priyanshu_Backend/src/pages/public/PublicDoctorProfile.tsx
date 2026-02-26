/**
 * PublicDoctorProfile - Individual doctor public profile page
 * 
 * Shows:
 * - Complete doctor information
 * - Reviews and ratings
 * - Qualifications and experience
 * - Available time slots
 * - Quick booking button
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star,
  MapPin,
  Clock,
  Award,
  Users,
  Verified,
  Loader,
  ChevronRight,
} from 'lucide-react';
import PublicLayout from '@/components/public/PublicLayout';
import { publicService } from '@/services';
import type { PublicDoctorProfile, DoctorReview } from '@/services/publicService';

export function PublicDoctorProfile() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<PublicDoctorProfile | null>(null);
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      if (!doctorId) {
        setError('Doctor not found');
        setLoading(false);
        return;
      }

      const [doctorResult, reviewsResult] = await Promise.all([
        publicService.getDoctorProfile(doctorId),
        publicService.getDoctorReviews(doctorId, 1, 5),
      ]);

      if (doctorResult.success && doctorResult.data?.doctor) {
        setDoctor(doctorResult.data.doctor);
      } else {
        setError('Doctor not found');
      }

      if (reviewsResult.success && reviewsResult.data?.reviews) {
        setReviews(reviewsResult.data.reviews);
      }

      setLoading(false);
    };

    loadProfile();
  }, [doctorId]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex justify-center py-12">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </PublicLayout>
    );
  }

  if (error || !doctor) {
    return (
      <PublicLayout>
        <div className="text-center py-12">
          <p className="text-lg text-red-600 mb-4">{error || 'Doctor not found'}</p>
          <button
            onClick={() => navigate('/doctors')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Doctors
          </button>
        </div>
      </PublicLayout>
    );
  }

  const ratingPercentage = (doctor.rating / 5) * 100;

  return (
    <PublicLayout>
      <div className="space-y-8">
        {/* Header Section with Doctor Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-40 bg-gradient-to-r from-blue-50 to-blue-100"></div>

          <div className="px-6 py-6 -mt-16 relative z-10">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar */}
              <div>
                {doctor.avatar ? (
                  <img
                    src={doctor.avatar}
                    alt={doctor.name}
                    className="w-32 h-40 rounded-lg border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-40 rounded-lg border-4 border-white bg-gray-300 flex items-center justify-center shadow-lg">
                    <span className="text-4xl font-bold text-gray-600">
                      {doctor.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 mt-8">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    Dr. {doctor.name || doctor.specialization || 'Unknown'}
                  </h1>
                  {doctor.approvalStatus === 'approved' && (
                    <Verified className="w-6 h-6 text-primary" />
                  )}
                </div>

                <p className="text-xl text-blue-600 font-medium mb-4">
                  {doctor.specialization}
                </p>

                {/* Rating */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.round(doctor.rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {doctor.rating.toFixed(1)}
                  </span>
                  <span className="text-gray-600">
                    ({doctor.totalReviews} reviews)
                  </span>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Experience</p>
                    <p className="text-lg font-bold text-gray-900">
                      {doctor.experience} years
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Response Time</p>
                    <p className="text-lg font-bold text-gray-900">
                      {doctor.responseTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Consultation Fee</p>
                    <p className="text-lg font-bold text-gray-900">
                      ₹{doctor.consultationFee}
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => navigate(`/book-appointment?doctorId=${doctor._id}`)}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors h-fit whitespace-nowrap"
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
              <p className="text-gray-600 leading-relaxed mb-4">{doctor.bio}</p>

              {/* License Info */}
              <div className="bg-blue-50 rounded-lg p-4 mt-4">
                <p className="text-sm text-gray-600 mb-1">Medical License</p>
                <p className="font-semibold text-gray-900">
                  {doctor.licenseNumber}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Registered with {doctor.registrationBody}
                </p>
              </div>
            </div>

            {/* Qualifications */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-blue-600" />
                Qualifications
              </h2>
              <ul className="space-y-2">
                {doctor.qualifications.map((qual, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-700">
                    <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>{qual}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Location & Availability */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-blue-600" />
                Location & Availability
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Address</p>
                  <p className="text-gray-900 font-medium">
                    {doctor.location.address || 'Address not provided'}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {doctor.location.city || 'Unknown city'}
                    {doctor.location.state ? `, ${doctor.location.state}` : ''}{' '}
                    {doctor.location.zipCode || ''}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {doctor.availableOnline && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      <span className="font-medium text-gray-900">
                        Online Consultation
                      </span>
                    </div>
                  )}
                  {doctor.availablePhysical && (
                    <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      <span className="font-medium text-gray-900">
                        In-Person Visit
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Star className="w-6 h-6 text-blue-600" />
                Patient Reviews
              </h2>

              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review._id}
                      className="pb-4 border-b border-gray-200 last:border-0"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-gray-900">
                          {review.patientName}
                        </p>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600 mb-2">{review.comment}</p>
                      {review.verifiedBooking && (
                        <p className="text-xs text-primary flex items-center gap-1">
                          <Verified className="w-3 h-3" />
                          Verified Patient
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No reviews yet</p>
              )}

              {reviews.length > 0 && (
                <button className="mt-6 w-full px-6 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                  View All Reviews
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Contact Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Contact</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <a
                    href={`mailto:${doctor.email}`}
                    className="text-blue-600 hover:text-blue-700 font-medium break-all"
                  >
                    {doctor.email}
                  </a>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Phone</p>
                  <a
                    href={`tel:${doctor.phone}`}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {doctor.phone}
                  </a>
                </div>

                <button
                  onClick={() => navigate(`/book-appointment?doctorId=${doctor._id}`)}
                  className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                  Book Appointment
                </button>

                <button
                  onClick={() => navigate('/contact')}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Ask a Question
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default PublicDoctorProfile;
