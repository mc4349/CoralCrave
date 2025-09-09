import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PreviewModal from './PreviewModal';

interface LiveStream {
  id: string;
  title?: string;
  hostId?: string;
  hostUsername?: string;
  channelName: string;
  viewerCount?: number;
  status: 'live' | 'offline' | 'ended';
  categories?: string[];
  startedAt?: any;
  previewUrl?: string | null;
}

interface LiveCardProps {
  stream: LiveStream;
}

export default function LiveCard({ stream }: LiveCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking preview
    e.stopPropagation();
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  return (
    <>
      <Link
        to={`/live?room=${encodeURIComponent(stream.channelName)}`}
        className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:transform hover:scale-105 group block"
      >
        {/* Preview Image Box */}
        <div className="bg-gray-200 flex items-center justify-center aspect-video rounded-lg mb-4 relative overflow-hidden">
          {stream.previewUrl ? (
            <img
              src={stream.previewUrl}
              alt={stream.title || stream.channelName}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-gray-500 text-center">
              <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">📹</span>
              </div>
              <p className="text-sm">Live Preview</p>
            </div>
          )}

          {/* LIVE Badge */}
          <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
            LIVE
          </div>

          {/* Preview Button */}
          <button
            onClick={handlePreviewClick}
            className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800/90 transition-colors border border-slate-700 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.707.707A1 1 0 0012.414 11H13m-3 3a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            <span>Preview</span>
          </button>

          {/* Viewer Count */}
          <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-sm text-slate-100 px-3 py-1 rounded-full text-sm border border-slate-700">
            {stream.viewerCount || 0} viewers
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-100 mb-2 group-hover:text-cyan-300 transition-colors duration-300">
            {stream.title || stream.channelName}
          </h3>
          <p className="text-slate-400 text-sm mb-3">
            by @{stream.hostUsername || stream.hostId || 'Unknown'}
          </p>
          <div className="flex justify-between items-center">
            <div className="flex space-x-1">
              {stream.categories?.map(category => (
                <span
                  key={category}
                  className="text-xs px-2 py-1 bg-slate-800/50 text-slate-300 rounded-full border border-slate-600"
                >
                  {category}
                </span>
              ))}
            </div>
            <span className="text-sm text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full">
              Live
            </span>
          </div>
        </div>
      </Link>

      {/* Preview Modal */}
      <PreviewModal
        channelName={stream.channelName}
        title={stream.title}
        hostUsername={stream.hostUsername}
        isOpen={showPreview}
        onClose={handleClosePreview}
      />
    </>
  );
}
