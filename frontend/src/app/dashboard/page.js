'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserTrips, createTrip, deleteTrip, addActivity, removeActivity, regenerateDay } from '@/utils/api';
import CreateTripForm from '@/components/CreateTripForm';
import ItineraryView from '@/components/ItineraryView';
import ExpenseTracker from '@/components/ExpenseTracker';

export default function Dashboard() {
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState(null);

  // On mount: check auth, load trips
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(savedUser));
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const data = await getUserTrips();
      // If token is invalid/expired, backend returns { message: '...' }
      if (Array.isArray(data)) {
        setTrips(data);
        if (data.length > 0) setSelectedTrip(data[0]);
      } else {
        // Token likely expired
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to fetch trips', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleCreateTrip = async (formData) => {
    setGenerating(true);
    try {
      const newTrip = await createTrip(formData);
      if (newTrip._id) {
        setTrips([newTrip, ...trips]);
        setSelectedTrip(newTrip);
        setShowCreateForm(false);
      }
    } catch (err) {
      console.error('Failed to create trip', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    await deleteTrip(tripId);
    const remaining = trips.filter((t) => t._id !== tripId);
    setTrips(remaining);
    setSelectedTrip(remaining.length > 0 ? remaining[0] : null);
  };

  const handleAddActivity = async (tripId, data) => {
    const updated = await addActivity(tripId, data);
    if (updated._id) {
      updateTripInState(updated);
    }
  };

  const handleRemoveActivity = async (tripId, activityId) => {
    const updated = await removeActivity(tripId, activityId);
    if (updated._id) {
      updateTripInState(updated);
    }
  };

  const handleRegenerateDay = async (tripId, dayNumber, instruction) => {
    const updated = await regenerateDay(tripId, { dayNumber, instruction });
    if (updated._id) {
      updateTripInState(updated);
    }
  };

  // Helper: update a trip in both the trips list and selectedTrip
  const updateTripInState = (updatedTrip) => {
    setTrips((prev) => prev.map((t) => t._id === updatedTrip._id ? updatedTrip : t));
    setSelectedTrip(updatedTrip);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 animate-pulse text-lg">Loading your trips...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">✈️ AI Travel Planner</h1>
            {user && (
              <p className="text-slate-400 text-sm">Welcome back, {user.name}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              + New Trip
            </button>
            <button
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Trip generation overlay */}
        {generating && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center max-w-sm">
              <div className="text-4xl mb-4 animate-bounce">🤖</div>
              <p className="text-white font-semibold text-lg">Generating your itinerary...</p>
              <p className="text-slate-400 text-sm mt-2">Our AI is crafting your perfect trip</p>
            </div>
          </div>
        )}

        {/* Create Trip Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
            <div className="w-full max-w-lg">
              <CreateTripForm
                onSubmit={handleCreateTrip}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          </div>
        )}

        {trips.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-xl font-semibold text-white mb-2">No trips yet</h2>
            <p className="text-slate-400 mb-6">Create your first AI-powered travel itinerary</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Plan My First Trip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Trip sidebar */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Your Trips
              </h2>
              {trips.map((trip) => (
                <button
                  key={trip._id}
                  onClick={() => setSelectedTrip(trip)}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    selectedTrip?._id === trip._id
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <p className="font-semibold truncate">{trip.destination}</p>
                  <p className="text-xs opacity-75 mt-1">
                    {trip.durationDays} days · {trip.budgetTier}
                  </p>
                </button>
              ))}
            </div>

            {/* Main itinerary view */}
            <div className="lg:col-span-3">
             {selectedTrip && (
                <>
                  <ItineraryView
                    trip={selectedTrip}
                    onAddActivity={handleAddActivity}
                    onRemoveActivity={handleRemoveActivity}
                    onRegenerateDay={handleRegenerateDay}
                    onDeleteTrip={handleDeleteTrip}
                  />
                  <div className="mt-6">
                    <ExpenseTracker
                    trip={selectedTrip}
                    onTripUpdated={updateTripInState}
                    />
                  </div>
                </>
            )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}