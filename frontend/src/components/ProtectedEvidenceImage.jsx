import React, { useEffect, useState } from 'react';
import { ApiClient } from '../services/apiClient';

export const ProtectedEvidenceImage = ({ complaintId, type, alt, className }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;

    ApiClient.fetchEvidence(complaintId, type, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [complaintId, type]);

  if (error) return <span role="alert" className="px-3 text-xs text-red-700">{error}</span>;
  if (!imageUrl) return <span role="status" className="text-xs text-slate-500">Loading evidence...</span>;
  return <img src={imageUrl} alt={alt} className={className} />;
};
