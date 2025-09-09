import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { previewManager } from '../agora/previewManager';

interface PreviewModalProps {
  channelName: string;
  title?: string;
  hostUsername?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PreviewModal({
  channelName,
  title,
  hostUsername,
  isOpen,
  onClose
}: PreviewModalProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      setIsLoading(true);
      setError(null);

      previewManager.startPreview(channelName, videoRef.current)
        .then(() => {
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('PreviewModal: Failed to start preview:', err);
          setError('Failed to load preview');
          setIsLoading(false);
        });
    }

    return () => {
      // Cleanup when modal closes or component unmounts
      if (isOpen) {
        previewManager.stopCurrentPreview();
      }
    };
  }, [isOpen, channelName]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-4xl w-full mx-4 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">
              {title || channelName}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              by @{hostUsername || 'Unknown Host'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video Container */}
        <div className="relative bg-black aspect-video">
          <div
            ref={videoRef}
            className="w-full h-full flex items-center justify-center"
          />

          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                <p className="text-white text-lg">Loading preview...</p>
                <p className="text-slate-300 text-sm mt-2">Connecting to stream</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-white text-lg">Preview Unavailable</p>
                <p className="text-slate-300 text-sm mt-2">{error}</p>
              </div>
            </div>
          )}

          {/* Preview Badge */}
          {!isLoading && !error && (
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-slate-300 px-3 py-1 rounded-full text-sm border border-slate-700">
              🔇 Preview (Muted)
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              This is a live preview of the stream
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
