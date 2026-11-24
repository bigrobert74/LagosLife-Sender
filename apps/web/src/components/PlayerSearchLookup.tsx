import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle2, User, Loader2, X } from 'lucide-react';

export interface LagosLifePlayer {
  id: string;
  username: string;
  name: string;
  online?: boolean;
  location?: string;
}

interface PlayerSearchLookupProps {
  onSelectPlayer: (player: LagosLifePlayer) => void;
  selectedPlayer: LagosLifePlayer | null;
  onClear: () => void;
  onUsernameChange?: (username: string) => void;
  initialUsername?: string;
}

export const PlayerSearchLookup: React.FC<PlayerSearchLookupProps> = ({
  onSelectPlayer,
  selectedPlayer,
  onClear,
  onUsernameChange,
  initialUsername = '',
}) => {
  const [query, setQuery] = useState<string>(initialUsername || selectedPlayer?.username || '');
  const [results, setResults] = useState<LagosLifePlayer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external changes to query if needed
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.username !== query) {
      setQuery(selectedPlayer.username);
    }
  }, [selectedPlayer?.username]);

  // Debounced search suggestions query (strictly advisory - NEVER auto-selects)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`http://localhost:3000/api/v1/game/players?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          const players: LagosLifePlayer[] = data.players || [];
          setResults(players);
          // Show suggestions only if matches exist
          if (players.length > 0) {
            setIsOpen(true);
          }
        }
      } catch (err) {
        // Silently ignore if offline
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onUsernameChange?.(val);

    // If user modifies text away from a previously selected player, unbind that specific player ID
    if (selectedPlayer && selectedPlayer.username.toLowerCase() !== val.trim().toLowerCase()) {
      onClear();
    }
  };

  const handleSelectSuggestion = (player: LagosLifePlayer) => {
    onSelectPlayer(player);
    setQuery(player.username);
    onUsernameChange?.(player.username);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onClear();
    onUsernameChange?.('');
    setResults([]);
    setIsOpen(false);
  };

  const isVerifiedMatch =
    selectedPlayer &&
    query.trim().length > 0 &&
    selectedPlayer.username.toLowerCase() === query.trim().toLowerCase();

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="character-username-input" className="block text-xs font-semibold text-slate-300">
          Lagos Life Username
        </label>
        {isVerifiedMatch && (
          <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 font-mono font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Character Verified</span>
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-2.5">
        Type your exact Lagos Life character username below.
      </p>

      {/* Input Field - Stays permanently visible and editable */}
      <div className="relative">
        <div className="absolute left-3.5 top-3.5 text-slate-500 font-mono font-bold text-sm select-none">
          @
        </div>

        <input
          id="character-username-input"
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="e.g. Tunde_Lekki99"
          autoComplete="off"
          spellCheck="false"
          className={`w-full pl-8 pr-20 py-3 rounded-xl bg-slate-950 border text-white text-sm focus:outline-none font-mono transition ${
            isVerifiedMatch
              ? 'border-emerald-500/50 focus:border-emerald-400'
              : 'border-slate-800 focus:border-emerald-400'
          }`}
        />

        <div className="absolute right-3 top-2.5 flex items-center space-x-1.5">
          {isLoading && (
            <div className="text-slate-500 p-1">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            </div>
          )}

          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition"
              title="Clear username"
              aria-label="Clear username"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Optional In-Game Player Suggestions Dropdown (User clicks only if they want to) */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-30 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden max-h-56 overflow-y-auto animate-in fade-in duration-100">
          <div className="p-2 bg-slate-950/60 border-b border-slate-800 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
            Suggested Lagos Life Characters (Optional)
          </div>
          <div className="divide-y divide-slate-800/80">
            {results.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => handleSelectSuggestion(player)}
                className="w-full p-3 text-left hover:bg-slate-800/80 flex items-center justify-between text-xs transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-md bg-slate-800 text-slate-400 group-hover:text-emerald-400 flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-mono font-bold text-white group-hover:text-emerald-300">
                      @{player.username}
                    </span>
                    {player.name && player.name !== player.username && (
                      <span className="text-slate-400 text-[11px] ml-1.5 font-normal">
                        ({player.name})
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-emerald-400 font-medium group-hover:underline">
                  Select
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
