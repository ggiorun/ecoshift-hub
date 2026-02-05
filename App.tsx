
import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from './i18n';
import { LanguageSelector } from './components/LanguageSelector';
import { Dashboard } from './components/Dashboard';
import { User, Trip } from './types';
import { db } from './db';
import { ProfileModal } from './components/ProfileModal';
import { AuthScreen } from './components/AuthScreen';

const MOCK_TRIPS: Trip[] = [
  {
    id: 't1',
    driverId: 'd1',
    driverName: 'Marco Bianchi',
    from: 'Campus Bovisa',
    to: 'Stazione Centrale',
    departureTime: new Date(Date.now() + 3600000).toISOString(),
    seatsAvailable: 3,
    distanceKm: 8,
    co2Saved: 2.4,
    tutoringSubject: 'Analisi 1',
    assistanceOffered: true
  },
  {
    id: 't2',
    driverId: 'd2',
    driverName: 'Sofia Verdi',
    from: 'Piazza Leonardo',
    to: 'Sesto San Giovanni',
    departureTime: new Date(Date.now() + 7200000).toISOString(),
    seatsAvailable: 1,
    distanceKm: 12,
    co2Saved: 3.6,
    tutoringSubject: 'Fisica Tecnica',
    assistanceOffered: false
  },
  {
    id: 't3',
    driverId: 'd3',
    driverName: 'Luca Neri',
    from: 'Città Studi',
    to: 'Rho Fiera',
    departureTime: new Date(Date.now() + 86400000).toISOString(),
    seatsAvailable: 4,
    distanceKm: 15,
    co2Saved: 4.5,
    tutoringSubject: 'Chimica Organica',
    assistanceOffered: false
  },
  {
    id: 't4',
    driverId: 'd4',
    driverName: 'Giulia Moretti',
    from: 'Duomo',
    to: 'Campus Leonardo',
    departureTime: new Date(Date.now() + 5400000).toISOString(),
    seatsAvailable: 2,
    distanceKm: 5,
    co2Saved: 1.5,
    tutoringSubject: 'Storia Architettura',
    assistanceOffered: true
  },
  {
    id: 't5',
    driverId: 'd5',
    driverName: 'Davide Ferrari',
    from: 'San Donato',
    to: 'Campus Bovisa',
    departureTime: new Date(Date.now() + 10800000).toISOString(),
    seatsAvailable: 3,
    distanceKm: 18,
    co2Saved: 5.4,
    tutoringSubject: 'Informatica 1',
    assistanceOffered: false
  },
  {
    id: 't6',
    driverId: 'd6',
    driverName: 'Elena Gialli',
    from: 'Porta Genova',
    to: 'Città Studi',
    departureTime: new Date(Date.now() + 14400000).toISOString(),
    seatsAvailable: 2,
    distanceKm: 7,
    co2Saved: 2.1,
    tutoringSubject: 'Algebra Lineare',
    assistanceOffered: false
  }
];

const App: React.FC = () => {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleUserUpdate = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
    db.setSession(updatedUser);
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const existingTrips = await db.getTrips();
        if (existingTrips.length === 0) {
          for (const tMock of MOCK_TRIPS) {
            await db.saveTrip(tMock);
          }
        }

        const sessionUser = db.getCurrentSession();
        if (sessionUser) {
          setCurrentUser(sessionUser);

          // Rinfresca i dati dal server per avere i crediti aggiornati subito
          const users = await db.getUsers();
          const latest = users.find(u => u.id === sessionUser.id);
          if (latest) {
            handleUserUpdate(latest);
          }
        }
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  useEffect(() => {
    let syncTimeout: any = null;

    const handleSync = () => {
      if (syncTimeout) clearTimeout(syncTimeout);

      syncTimeout = setTimeout(async () => {
        const sessionUser = db.getCurrentSession();
        if (sessionUser) {
          try {
            const users = await db.getUsers();
            const latest = users.find(u => u.id === sessionUser.id);
            if (latest) {
              setCurrentUser(prev => {
                // Prevenzione: non sovrascrivere mai con dati più vecchi (meno crediti)
                if (prev && prev.id === latest.id && latest.credits < prev.credits) {
                  return prev;
                }
                // Aggiorna la sessione solo se i dati sono nuovi o coerenti
                db.setSession(latest);
                return latest;
              });
            }
          } catch (error) {
            console.error("Sync fetch failed:", error);
          }
        }
      }, 300); // Ridotto a 300ms per maggiore reattività
    };

    window.addEventListener('ecoshift-sync', handleSync);
    return () => {
      window.removeEventListener('ecoshift-sync', handleSync);
      if (syncTimeout) clearTimeout(syncTimeout);
    };
  }, [currentUser?.id]); // Ricollega se cambia l'utente

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    db.setSession(user);
  };

  const handleLogout = () => {
    db.setSession(null);
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xl">E</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">{t.app_name}</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <button
              onClick={handleLogout}
              className="text-[10px] font-black text-slate-400 hover:text-rose-600 transition-colors uppercase tracking-widest mr-2"
              aria-label={t.logout}
            >
              {t.logout}
            </button>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="focus-ring rounded-full overflow-hidden transition-transform active:scale-90"
              aria-label={t.open_profile}
            >
              <img
                src={`https://picsum.photos/seed/${currentUser.id}/32/32`}
                alt={t.my_profile}
                className="w-8 h-8 rounded-full border border-slate-300 object-cover"
              />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto">
        <Dashboard
          currentUser={currentUser}
          isOfferModalOpen={isOfferModalOpen}
          setIsOfferModalOpen={setIsOfferModalOpen}
          onUserUpdate={handleUserUpdate}
        />
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        onUpdate={handleUserUpdate}
      />

      <footer className="bg-white border-t border-slate-200 md:hidden sticky bottom-0 z-50">
        <div className="flex justify-around p-3">
          <button className="flex flex-col items-center text-brand-600" aria-label={t.home}>
            <span className="text-xl">🏠</span>
            <span className="text-[10px] font-bold">{t.home}</span>
          </button>
          <button
            onClick={() => setIsOfferModalOpen(true)}
            className="flex flex-col items-center text-brand-600 font-bold"
            aria-label={t.create_trip_aria}
          >
            <span className="text-2xl bg-brand-50 p-2 rounded-full mb-1">➕</span>
            <span className="text-[10px]">{t.create}</span>
          </button>
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex flex-col items-center text-slate-400"
            aria-label={t.profile}
          >
            <span className="text-xl">👤</span>
            <span className="text-[10px] font-bold">{t.profile}</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
