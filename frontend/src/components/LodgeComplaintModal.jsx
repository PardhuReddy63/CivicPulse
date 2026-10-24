import React, { useState } from 'react';
import { store } from '../services/store';
import { GrievanceMap } from './GrievanceMap';
import {
  X,
  Upload,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Compass,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const LodgeComplaintModal = ({ onClose, onSuccess }) => {
  const departments = store.getDepartments();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(departments[3]?.name || 'Roads & Infrastructure');
  const [subCategory, setSubCategory] = useState('Pothole');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [coordsExplicitlySet, setCoordsExplicitlySet] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locating, setLocating] = useState(false);

  const subCategoryMap = {
    'Roads & Infrastructure': ['Pothole', 'Damaged Footpath', 'Missing Manhole Cover', 'Traffic Sign Broken', 'Road Cave-in'],
    'Water Works & Drainage': ['Water Contamination', 'Low Pressure', 'Main Pipeline Burst', 'Open Sewage Drain', 'Water Meter Leak'],
    'Electricity & Power': ['Streetlight Out', 'Transformer Sparking', 'Hanging Low Wire', 'Frequent Power Surge', 'Uncovered Feeder Box'],
    'Sanitation & Solid Waste': ['Garbage Dump Overflow', 'Illegal Debris Dumping', 'Bio-waste Hazard', 'Uncleaned Public Toilet', 'Dead Animal Disposal'],
    'Public Health & Safety': ['Stagnant Mosquito Pool', 'Stray Animal Pack', 'Chemical Odor Leak', 'Food Adulteration Alert', 'Open Hazard Pit'],
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image file size exceeds the 5 MB maximum allowed limit.');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Only JPEG, PNG, and WebP images are supported.');
      return;
    }

    setErrorMsg(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUseCurrentLocation = () => {
    setErrorMsg(null);
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setCoordsExplicitlySet(true);
        setLocating(false);
        if (!location.trim()) {
          setLocation(`Current GPS Location (${lat}, ${lng})`);
        }
      },
      (err) => {
        setLocating(false);
        let msg = 'Unable to retrieve location.';
        if (err.code === 1) msg = 'Location access denied. Please select on the map or enter coordinates.';
        else if (err.code === 2) msg = 'Position unavailable.';
        else if (err.code === 3) msg = 'Location request timed out.';
        setErrorMsg(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleProceedToConfirmation = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !description.trim() || !location.trim()) {
      setErrorMsg('Please complete all mandatory fields marked with an asterisk (*).');
      return;
    }

    if (
      !coordsExplicitlySet ||
      !Number.isFinite(Number(latitude)) ||
      !Number.isFinite(Number(longitude))
    ) {
      setErrorMsg('Select the complaint location on the map or enter its latitude and longitude.');
      return;
    }

    setShowConfirmation(true);
  };

  const handleFinalSubmit = async () => {
    setErrorMsg(null);
    try {
      setIsSubmitting(true);
      await store.createComplaint({
        title: title.trim(),
        description: description.trim(),
        category,
        sub_category: subCategory,
        location: location.trim(),
        latitude,
        longitude,
        image: imagePreview,
        imageFile: imageFile,
      });

      onSuccess('Grievance lodged successfully! Status is set to PENDING for municipal administrator assignment.');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit grievance.');
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Citizen Redressal Submission
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              {showConfirmation ? 'Review & Confirm Grievance' : 'Lodge New Municipal Grievance'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form or Confirmation View */}
        {!showConfirmation ? (
          <form onSubmit={handleProceedToConfirmation} className="p-6 overflow-y-auto space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Grievance Heading / Summary *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hazardous Pothole near Indiranagar Bus Shelter"
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                maxLength={255}
              />
            </div>

            {/* Category & Subcategory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department / Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    const firstSub = subCategoryMap[e.target.value]?.[0] || 'General';
                    setSubCategory(firstSub);
                  }}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                >
                  {departments.map((d) => (
                    <option key={d.department_id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sub-Classification
                </label>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                >
                  {(subCategoryMap[category] || ['General Issue']).map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location & GPS Coordinate Picking */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Street Address / Landmark *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={locating}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Compass className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                    <span>{locating ? 'Locating...' : 'Use My Current Location'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(!showMapPicker)}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>{showMapPicker ? 'Hide Map' : 'Show Map'}</span>
                  </button>
                </div>
              </div>

              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. 5th Cross Road, opposite Corporation Bank, Ward 12"
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                maxLength={255}
              />

              {/* OpenStreetMap location picker */}
              {showMapPicker && (
                <div className="space-y-1 rounded-2xl overflow-hidden border border-slate-200">
                  <div className="bg-slate-100 px-3 py-1.5 text-[11px] text-slate-600 font-medium flex items-center justify-between">
                    <span>Click on the map or drag the pin to set the exact civic issue location:</span>
                    <span className="font-mono text-blue-700 font-bold">
                      {Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
                        ? `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
                        : 'No location selected'}
                    </span>
                  </div>
                  <GrievanceMap
                    complaints={[]}
                    selectableLocation={true}
                    initialLat={latitude}
                    initialLng={longitude}
                    onLocationSelect={(lat, lng, address) => {
                      setLatitude(lat);
                      setLongitude(lng);
                      setCoordsExplicitlySet(true);
                    }}
                  />
                  <p className="px-3 pb-2 text-[11px] text-slate-500">
                    {address}: coordinates only. Enter the real street address or landmark above.
                  </p>
                </div>
              )}
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detailed Description & Impact *
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide exact details of the situation, duration of the issue, and immediate hazards..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Before Photographic Evidence */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Before Photographic Evidence (Max 5 MB, JPEG/PNG/WebP)
              </label>
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-4 text-center bg-slate-50/70 transition">
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Uploaded preview"
                      className="h-32 rounded-lg object-cover shadow-sm mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                      }}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white p-1 rounded-full text-xs shadow-md cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                    <span className="text-xs font-semibold text-blue-600 hover:underline block">
                      Upload camera or device photo
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Uploaded photos serve as baseline proof for officer before/after remediation
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Next / Proceed Button */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Review</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation Step Dialog */
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1 text-sm text-blue-950">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Please verify your grievance details before submitting:
              </div>
              <p className="text-[11px] text-blue-800">
                Once lodged, this grievance will be logged in the immutable municipal audit registry and queued for administrative assignment.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Grievance Heading</span>
                <span className="font-bold text-slate-900 text-sm">{title}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Department</span>
                  <span className="font-semibold text-blue-700">{category}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Classification</span>
                  <span className="font-semibold text-slate-700">{subCategory}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Physical Landmark & GPS Coordinates</span>
                <span className="text-slate-800">{location}</span>
                <div className="font-mono text-[11px] text-blue-600 mt-0.5">
                  Latitude: {Number(latitude).toFixed(6)}, Longitude: {Number(longitude).toFixed(6)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Description</span>
                <p className="text-slate-700 leading-relaxed mt-0.5">{description}</p>
              </div>

              {imagePreview && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase mb-1">Attached Photographic Proof</span>
                  <img src={imagePreview} alt="Attached Evidence" className="h-24 rounded-lg object-cover border border-slate-300" />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Recording to MySQL...' : 'Confirm & Lodge Grievance'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
