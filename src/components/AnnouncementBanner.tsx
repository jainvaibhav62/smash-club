import type { Announcement } from '../types'

interface AnnouncementBannerProps {
  announcement: Announcement
}

export function AnnouncementBanner({ announcement }: AnnouncementBannerProps) {
  return (
    <div className="animate-pulse bg-gradient-to-r from-yellow-400 via-red-400 to-pink-400 px-4 py-3 text-center font-bold text-white shadow-lg">
      <style>{`
        @keyframes blink {
          0%, 49%, 100% { opacity: 1; }
          50%, 99% { opacity: 0.5; }
        }
        .banner-blink {
          animation: blink 1.5s ease-in-out infinite;
        }
      `}</style>
      <div className="banner-blink">
        🚨 {announcement.text}
      </div>
    </div>
  )
}
