/**
 * PublicDoctors - Guest doctor browsing page
 * 
 * Features:
 * - List all approved doctors
 * - Search by name
 * - Filter by specialization
 * - Sort by rating, experience, availability
 * - Quick appointment booking
 * - Mobile responsive
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown, Loader } from 'lucide-react';
import PublicLayout from '@/components/public/PublicLayout';
import DoctorCard from '@/components/public/DoctorCard';
import { publicService } from '@/services';
import type { PublicDoctorProfile, Specialization } from '@/services/publicService';

export function PublicDoctors() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [doctors, setDoctors] = useState<PublicDoctorProfile[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 12;
  const searchQuery = searchParams.get('search') || '';
  const selectedSpecialization = searchParams.get('specialization') || '';
  const sortBy = searchParams.get('sort') || 'rating';
  const [showFilters, setShowFilters] = useState(false);

  // Load specializations
  useEffect(() => {
    const loadSpecializations = async () => {
      const result = await publicService.getSpecializations();
      if (result.success && result.data?.specializations) {
        setSpecializations(result.data.specializations);
      }
    };
    loadSpecializations();
  }, []);

  // Load doctors
  useEffect(() => {
    const loadDoctors = async () => {
      setLoading(true);
      setError('');

      const result = await publicService.getDoctors(
        page,
        limit,
        selectedSpecialization,
        searchQuery,
        sortBy
      );

      if (result.success && result.data) {
        setDoctors(result.data.doctors);
        setTotal(result.data.total);
      } else {
        setError(result.message);
      }

      setLoading(false);
    };

    loadDoctors();
  }, [page, selectedSpecialization, searchQuery, sortBy]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search') as string;
    
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (selectedSpecialization) params.set('specialization', selectedSpecialization);
    params.set('sort', sortBy);
    
    setSearchParams(params);
  };

  const handleSpecializationChange = (spec: string) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (spec) params.set('specialization', spec);
    params.set('sort', sortBy);
    
    setSearchParams(params);
  };

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedSpecialization) params.set('specialization', selectedSpecialization);
    params.set('sort', sort);
    
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    params.set('page', newPage.toString());
    if (searchQuery) params.set('search', searchQuery);
    if (selectedSpecialization) params.set('specialization', selectedSpecialization);
    params.set('sort', sortBy);
    
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookClick = (doctorId: string) => {
    navigate(`/book-appointment?doctorId=${doctorId}`);
  };

  const pages = Math.ceil(total / limit);

  return (
    <PublicLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Find Your Doctor
          </h1>
          <p className="text-lg text-gray-600">
            Browse our directory of 200+ verified medical professionals
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              name="search"
              placeholder="Search by doctor name, specialization..."
              defaultValue={searchQuery}
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <Filter className="w-5 h-5" />
            <span>Filters</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showFilters ? 'rotate-180' : ''
              }`}
            />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="rating">Highest Rated</option>
              <option value="experience">Most Experienced</option>
              <option value="name">Name (A-Z)</option>
              <option value="available">Recently Available</option>
            </select>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Specialization
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                <button
                  onClick={() => handleSpecializationChange('')}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    !selectedSpecialization
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  All
                </button>
                {specializations.map((spec) => (
                  <button
                    key={spec._id}
                    onClick={() => handleSpecializationChange(spec._id)}
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      selectedSpecialization === spec._id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {spec.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results Counter */}
        <div className="text-sm text-gray-600">
          Showing {doctors.length === 0 ? 0 : (page - 1) * limit + 1} to{' '}
          {Math.min(page * limit, total)} of {total} doctors
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Doctors Grid */}
        {!loading && doctors.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor) => (
                <DoctorCard
                  key={doctor._id}
                  doctor={doctor}
                  onBookClick={handleBookClick}
                />
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>

                {[...Array(pages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => handlePageChange(i + 1)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      page === i + 1
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* No Results */}
        {!loading && doctors.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600 mb-4">
              No doctors found matching your criteria
            </p>
            <button
              onClick={() => {
                setSearchParams('');
                window.location.reload();
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

export default PublicDoctors;
