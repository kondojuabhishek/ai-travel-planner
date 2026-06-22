'use client';

import { useState } from 'react';
import { updateTrip } from '@/utils/api';

export default function ExpenseTracker({ trip, onTripUpdated }) {
  const [saving, setSaving] = useState(false);
  const [customActivity, setCustomActivity] = useState({ title: '', actualCostUSD: '' });
  const [addingCustom, setAddingCustom] = useState(false);

  // Flatten all activities across all days with day context
  const allActivities = trip.itinerary.flatMap((day) =>
    day.activities.map((activity) => ({
      ...activity,
      dayNumber: day.dayNumber,
      dayIndex: trip.itinerary.indexOf(day),
      activityIndex: day.activities.indexOf(activity),
    }))
  );

  const totalEstimated = allActivities.reduce(
    (sum, a) => sum + (a.estimatedCostUSD || 0), 0
  );

  const totalActual = allActivities.reduce(
    (sum, a) => sum + (a.actualCostUSD || 0), 0
  );

  const trackedCount = allActivities.filter((a) => a.actualCostUSD !== null).length;
  const difference = totalActual - totalEstimated;

  const handleActualCostChange = async (dayIndex, activityIndex, value) => {
    setSaving(true);
    try {
      // Build updated itinerary with the new actual cost
      const updatedItinerary = trip.itinerary.map((day, dIdx) => ({
        ...day,
        activities: day.activities.map((activity, aIdx) => {
          if (dIdx === dayIndex && aIdx === activityIndex) {
            return {
              ...activity,
              actualCostUSD: value === '' ? null : Number(value),
            };
          }
          return activity;
        }),
      }));

      const updated = await updateTrip(trip._id, { itinerary: updatedItinerary });
      if (updated._id) onTripUpdated(updated);
    } catch (err) {
      console.error('Failed to update actual cost', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomExpense = async () => {
  if (!customActivity.title.trim() || customActivity.actualCostUSD === '') return;
  setSaving(true);
  try {
    // Add to Day 1 by default — it's a custom expense, day doesn't matter much
    const updatedItinerary = trip.itinerary.map((day, dIdx) => {
      if (dIdx === 0) {
        return {
          ...day,
          activities: [
            ...day.activities,
            {
              title: customActivity.title,
              description: 'Custom expense added by user',
              estimatedCostUSD: 0,
              actualCostUSD: Number(customActivity.actualCostUSD),
              timeOfDay: 'Afternoon',
            },
          ],
        };
      }
      return day;
    });

    const updated = await updateTrip(trip._id, { itinerary: updatedItinerary });
    if (updated._id) {
      onTripUpdated(updated);
      setCustomActivity({ title: '', actualCostUSD: '' });
      setAddingCustom(false);
    }
  } catch (err) {
    console.error('Failed to add custom expense', err);
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">💰 Expense Tracker</h3>
          <p className="text-slate-400 text-sm mt-1">
            Track actual spending against AI estimates
          </p>
        </div>
        {saving && (
          <span className="text-xs text-indigo-400 animate-pulse">Saving...</span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-800 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">AI Estimated</p>
          <p className="text-white font-bold text-lg">${totalEstimated}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">
            Actual ({trackedCount}/{allActivities.length})
          </p>
          <p className="text-white font-bold text-lg">${totalActual}</p>
        </div>
        <div className={`rounded-xl p-4 text-center ${
          difference > 0
            ? 'bg-red-900/30 border border-red-800'
            : difference < 0
            ? 'bg-green-900/30 border border-green-800'
            : 'bg-slate-800'
        }`}>
          <p className="text-xs text-slate-400 mb-1">Difference</p>
          <p className={`font-bold text-lg ${
            difference > 0 ? 'text-red-400' : difference < 0 ? 'text-green-400' : 'text-white'
          }`}>
            {difference > 0 ? '+' : ''}{difference}$
          </p>
        </div>
      </div>

      {/* Activity rows */}
      <div className="space-y-2">
        <div className="grid grid-cols-12 text-xs text-slate-500 uppercase tracking-wider px-3 mb-1">
          <span className="col-span-1">Day</span>
          <span className="col-span-5">Activity</span>
          <span className="col-span-3 text-right">Estimated</span>
          <span className="col-span-3 text-right">Actual</span>
        </div>

        {allActivities.map((activity, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 items-center bg-slate-800 rounded-lg px-3 py-2.5 gap-2"
          >
            <span className="col-span-1 text-xs text-slate-500">
              D{activity.dayNumber}
            </span>
            <span className="col-span-5 text-sm text-white truncate">
              {activity.title}
            </span>
            <span className="col-span-3 text-right text-sm text-slate-400">
              ${activity.estimatedCostUSD || 0}
            </span>
            <div className="col-span-3 flex justify-end">
              <input
                type="number"
                min="0"
                placeholder="$0"
                defaultValue={activity.actualCostUSD ?? ''}
                onBlur={(e) =>
                  handleActualCostChange(
                    activity.dayIndex,
                    activity.activityIndex,
                    e.target.value
                  )
                }
                className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-4 text-center">
        Click an actual cost field and enter your spent amount — saves automatically
      </p>

      {/* Custom expense entry */}
<div className="mt-4 border-t border-slate-800 pt-4">
  {!addingCustom ? (
    <button
      onClick={() => setAddingCustom(true)}
      className="w-full text-sm text-indigo-400 hover:text-indigo-300 border border-dashed border-slate-700 hover:border-indigo-500 rounded-lg py-2.5 transition"
    >
      + Add Unplanned Expense
    </button>
  ) : (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        placeholder="What did you spend on?"
        value={customActivity.title}
        onChange={(e) => setCustomActivity({ ...customActivity, title: e.target.value })}
        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
      />
      <input
        type="number"
        placeholder="$"
        min="0"
        value={customActivity.actualCostUSD}
        onChange={(e) => setCustomActivity({ ...customActivity, actualCostUSD: e.target.value })}
        className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
      />
      <button
        onClick={handleAddCustomExpense}
        disabled={saving}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-semibold transition"
      >
        Add
      </button>
      <button
        onClick={() => { setAddingCustom(false); setCustomActivity({ title: '', actualCostUSD: '' }); }}
        className="text-slate-500 hover:text-slate-300 px-2 py-2 text-sm transition"
      >
        Cancel
      </button>
    </div>
  )}
</div>
    </div>
  );
}