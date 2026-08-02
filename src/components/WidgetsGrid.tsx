import React from 'react';
import { WeatherCard } from './WeatherCard';
import { QuoteCard } from './QuoteCard';
import { CalendarCard } from './CalendarCard';
import { StatusMonitorCard } from './StatusMonitorCard';

interface WidgetsGridProps {
  isAdmin?: boolean;
}

export const WidgetsGrid: React.FC<WidgetsGridProps> = ({ isAdmin = false }) => {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 my-3">
      {/* 4 Standalone Bento Cards Row (~165px height) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 🌤️ Standalone Weather Card */}
        <WeatherCard isAdmin={isAdmin} />

        {/* Card 2: 💬 Enhanced Hitokoto Quote Card */}
        <QuoteCard />

        {/* Card 3: 📅 Interactive Calendar Card (Shows Full Month) */}
        <CalendarCard />

        {/* Card 4: ⚡ Node Status Monitor Card */}
        <StatusMonitorCard isAdmin={isAdmin} />
      </div>
    </section>
  );
};
