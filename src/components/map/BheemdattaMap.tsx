import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { LOCATIONS, toNepaliDigits } from '../../data/locationsData';
import { Zap, MapPin, Layers, Info } from 'lucide-react';

interface BheemdattaMapProps {
  highlightWards?: number[];
  highlightLocations?: string[];
  selectedLocationId?: string;
  onSelectWard?: (ward: number) => void;
  onSelectLocation?: (locationId: string) => void;
  statusVariant?: 'SCHEDULED' | 'ACTIVE' | 'RESTORATION' | 'RESTORED' | 'NORMAL';
  interactive?: boolean;
}

interface WardLayout {
  ward: number;
  labelEn: string;
  labelNe: string;
  x: number;
  y: number;
  width: number;
  height: number;
  keyToles: string;
}

// Schematic geographic layout of Bheemdatta's 19 wards
const WARD_TILES: WardLayout[] = [
  // North / Chure Wards
  { ward: 9, labelEn: 'W9 Brahmadev', labelNe: 'वडा ९ ब्रह्मदेव', x: 40, y: 30, width: 140, height: 60, keyToles: 'Brahmadev, Khalla' },
  { ward: 8, labelEn: 'W8 Tilkeni', labelNe: 'वडा ८ तिलकेनी', x: 190, y: 30, width: 130, height: 60, keyToles: 'Tilkeni' },
  { ward: 7, labelEn: 'W7 Haldhunga', labelNe: 'वडा ७ हलढुङ्गा', x: 330, y: 30, width: 130, height: 60, keyToles: 'Haldhunga' },
  { ward: 10, labelEn: 'W10 Suda', labelNe: 'वडा १० सुडा', x: 470, y: 30, width: 130, height: 60, keyToles: 'Suda, Jhilmila' },

  // Upper Mid Wards
  { ward: 1, labelEn: 'W1 Rauteli', labelNe: 'वडा १ रौतेली', x: 40, y: 100, width: 100, height: 65, keyToles: 'Rauteli Bichawa' },
  { ward: 3, labelEn: 'W3 Naulakhet', labelNe: 'वडा ३ नौलाखेत', x: 150, y: 100, width: 140, height: 65, keyToles: 'Naulakhet, Bhasi' },
  { ward: 4, labelEn: 'W4 Bazaar', labelNe: 'वडा ४ बजार', x: 300, y: 100, width: 150, height: 65, keyToles: 'Mahendranagar, Samvidhan Chk' },
  { ward: 6, labelEn: 'W6 Aithpur', labelNe: 'वडा ६ ऐठपुर', x: 460, y: 100, width: 140, height: 65, keyToles: 'Aithpur, Pragatinagar' },

  // Central Wards
  { ward: 2, labelEn: 'W2 Katan', labelNe: 'वडा २ कटान', x: 40, y: 175, width: 120, height: 65, keyToles: 'Katan, Bageli' },
  { ward: 5, labelEn: 'W5 Gobariya', labelNe: 'वडा ५ गोबरिया', x: 170, y: 175, width: 140, height: 65, keyToles: 'Gobariya, Bandevi' },
  { ward: 18, labelEn: 'W18 Salaghari', labelNe: 'वडा १८ सलाघारी', x: 320, y: 175, width: 130, height: 65, keyToles: 'Salaghari' },
  { ward: 19, labelEn: 'W19 Bagkhor', labelNe: 'वडा १९ बागखोर', x: 460, y: 175, width: 140, height: 65, keyToles: 'Bagkhor' },

  // South Mid Wards
  { ward: 14, labelEn: 'W14 Majhgaun', labelNe: 'वडा १४ मझगाउँ', x: 40, y: 250, width: 140, height: 65, keyToles: 'Airport Area' },
  { ward: 11, labelEn: 'W11 Bhujela', labelNe: 'वडा ११ भुजेला', x: 190, y: 250, width: 130, height: 65, keyToles: 'Bhujela, Pitamkhet' },
  { ward: 12, labelEn: 'W12 Odali', labelNe: 'वडा १२ ओदाली', x: 330, y: 250, width: 130, height: 65, keyToles: 'Odali, Tundikhel' },
  { ward: 13, labelEn: 'W13 Pipaiya', labelNe: 'वडा १३ पिपैया', x: 470, y: 250, width: 130, height: 65, keyToles: 'Pipaiya' },

  // Southern Boundary Wards
  { ward: 17, labelEn: 'W17 Badhaiya', labelNe: 'वडा १७ बढैया', x: 80, y: 325, width: 150, height: 55, keyToles: 'Badhaiya' },
  { ward: 16, labelEn: 'W16 Majhagaun S', labelNe: 'वडा १६ दक्षिण', x: 240, y: 325, width: 160, height: 55, keyToles: 'South Border' },
  { ward: 15, labelEn: 'W15 Gobarchaur', labelNe: 'वडा १५ गोबरचौर', x: 410, y: 325, width: 150, height: 55, keyToles: 'Gobarchaur' },
];

export const BheemdattaMap: React.FC<BheemdattaMapProps> = ({
  highlightWards = [],
  highlightLocations = [],
  selectedLocationId,
  onSelectWard,
  onSelectLocation,
  statusVariant,
  interactive = true,
}) => {
  const { language } = useLanguage();
  const [hoveredWard, setHoveredWard] = useState<WardLayout | null>(null);

  // Determine styling based on status
  const getHighlightFill = () => {
    if (statusVariant === 'ACTIVE') return 'fill-rose-500/25 stroke-rose-600 dark:fill-rose-900/40 dark:stroke-rose-400 stroke-2';
    if (statusVariant === 'SCHEDULED') return 'fill-amber-500/25 stroke-amber-600 dark:fill-amber-900/40 dark:stroke-amber-400 stroke-2';
    if (statusVariant === 'RESTORATION') return 'fill-blue-500/25 stroke-blue-600 dark:fill-blue-900/40 dark:stroke-blue-400 stroke-2';
    if (statusVariant === 'RESTORED') return 'fill-emerald-500/25 stroke-emerald-600 dark:fill-emerald-900/40 dark:stroke-emerald-400 stroke-2';
    return 'fill-amber-500/30 stroke-amber-500 dark:fill-amber-900/40 dark:stroke-amber-400 stroke-2';
  };

  const getHighlightBadge = () => {
    if (statusVariant === 'ACTIVE') return 'bg-rose-500 text-white';
    if (statusVariant === 'SCHEDULED') return 'bg-amber-500 text-slate-950';
    if (statusVariant === 'RESTORATION') return 'bg-blue-500 text-white';
    if (statusVariant === 'RESTORED') return 'bg-emerald-500 text-white';
    return 'bg-amber-500 text-slate-950';
  };

  const relevantLocations = LOCATIONS.filter((loc) => {
    if (highlightLocations.length > 0) return highlightLocations.includes(loc.id);
    if (highlightWards.length > 0) return highlightWards.includes(loc.wardNumber);
    if (selectedLocationId) return loc.id === selectedLocationId;
    return false;
  });

  return (
    <div className="relative w-full rounded-2xl bg-slate-900 text-white p-4 sm:p-6 overflow-hidden border border-slate-800 shadow-xl">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Map Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-wide text-white">
              {language === 'ne' ? 'भीमदत्त नगरपालिका विद्युत ग्रिड नक्सा' : 'Bheemdatta Municipal Grid & Ward Map'}
            </h4>
            <p className="text-xs text-slate-400">
              {language === 'ne' ? '१९ वटा वडाहरू र विद्युत फिडर क्षेत्र' : 'Wards 1–19, 33/11 kV Feeders & Substation Areas'}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>{language === 'ne' ? 'सामान्य' : 'Normal'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>{language === 'ne' ? 'निर्धारित' : 'Scheduled'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>{language === 'ne' ? 'अवरोध' : 'Active Outage'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>{language === 'ne' ? 'पुनर्बहाली' : 'Restoring'}</span>
          </div>
        </div>
      </div>

      {/* SVG Map Container */}
      <div className="relative w-full aspect-16/10 max-h-[420px] bg-slate-950/80 rounded-xl p-2 border border-slate-800/80 overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 640 400"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Mahakali River Accent on West */}
          <path
            d="M 20 0 Q 35 120 15 240 Q 28 320 20 400"
            fill="none"
            stroke="#0284c7"
            strokeWidth="8"
            strokeOpacity="0.3"
            strokeDasharray="6,4"
          />
          <text x="18" y="200" fill="#38bdf8" fontSize="9" opacity="0.6" transform="rotate(-90 18 200)">
            {language === 'ne' ? 'महाकाली नदी (पश्चिमी सिमाना)' : 'Mahakali River'}
          </text>

          {/* Substation Center Marker */}
          <g transform="translate(370, 92)">
            <circle r="12" fill="#0369a1" fillOpacity="0.4" />
            <circle r="6" fill="#38bdf8" />
            <text x="14" y="4" fill="#93c5fd" fontSize="9" fontWeight="bold">
              33/11 kV Substation
            </text>
          </g>

          {/* Ward Blocks */}
          {WARD_TILES.map((tile) => {
            const isHighlighted = highlightWards.includes(tile.ward);
            const isHovered = hoveredWard?.ward === tile.ward;

            return (
              <g
                key={tile.ward}
                className={interactive ? 'cursor-pointer transition-all duration-200' : ''}
                onClick={() => onSelectWard && onSelectWard(tile.ward)}
                onMouseEnter={() => setHoveredWard(tile)}
                onMouseLeave={() => setHoveredWard(null)}
              >
                <rect
                  x={tile.x}
                  y={tile.y}
                  width={tile.width}
                  height={tile.height}
                  rx="8"
                  className={`transition-all duration-200 ${
                    isHighlighted
                      ? getHighlightFill()
                      : isHovered
                      ? 'fill-slate-800 stroke-blue-400 stroke-2'
                      : 'fill-slate-900/90 stroke-slate-700/60 stroke-1'
                  }`}
                />

                {/* Ward Label */}
                <text
                  x={tile.x + 10}
                  y={tile.y + 22}
                  fill={isHighlighted ? '#ffffff' : '#cbd5e1'}
                  fontSize="12"
                  fontWeight={isHighlighted ? '700' : '600'}
                  className="pointer-events-none"
                >
                  {language === 'ne' ? tile.labelNe : tile.labelEn}
                </text>

                {/* Sub-toles text */}
                <text
                  x={tile.x + 10}
                  y={tile.y + 40}
                  fill={isHighlighted ? '#fde047' : '#64748b'}
                  fontSize="9.5"
                  className="pointer-events-none"
                >
                  {tile.keyToles}
                </text>

                {/* Outage status pin if affected */}
                {isHighlighted && (
                  <g transform={`translate(${tile.x + tile.width - 24}, ${tile.y + 12})`}>
                    <circle r="8" fill="#ffffff" />
                    <circle
                      r="6"
                      className={
                        statusVariant === 'ACTIVE'
                          ? 'fill-rose-600'
                          : statusVariant === 'RESTORATION'
                          ? 'fill-blue-600'
                          : 'fill-amber-500'
                      }
                    />
                    <Zap className="w-2.5 h-2.5 text-white" />
                  </g>
                )}
              </g>
            );
          })}

          {/* Highlighted Specific Location Pins */}
          {relevantLocations.map((loc, idx) => {
            // Find parent tile
            const tile = WARD_TILES.find((w) => w.ward === loc.wardNumber);
            if (!tile) return null;
            const pinX = tile.x + 35 + (idx * 30) % (tile.width - 40);
            const pinY = tile.y + tile.height - 18;

            return (
              <g
                key={loc.id}
                transform={`translate(${pinX}, ${pinY})`}
                className="cursor-pointer"
                onClick={() => onSelectLocation && onSelectLocation(loc.id)}
              >
                <circle r="10" fill="#38bdf8" fillOpacity="0.3" className="animate-ping" />
                <circle r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                <text x="8" y="3" fill="#ffffff" fontSize="8" fontWeight="bold">
                  {language === 'ne' ? loc.nameNe : loc.nameEn}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip if Hovering */}
        {hoveredWard && (
          <div className="absolute top-3 left-3 bg-slate-900/95 backdrop-blur-sm border border-slate-700 px-3 py-1.5 rounded-lg shadow-xl text-xs text-white flex items-center gap-2 pointer-events-none">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {language === 'ne'
                ? `वडा नं ${toNepaliDigits(hoveredWard.ward)}: ${hoveredWard.keyToles}`
                : `Ward ${hoveredWard.ward}: ${hoveredWard.keyToles}`}
            </span>
          </div>
        )}
      </div>

      {/* Footer Info inside Map */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>
            {language === 'ne'
              ? 'नक्सामा वडा छनोट गरी सम्बन्धित क्षेत्रको जानकारी हेर्न सक्नुहुन्छ।'
              : 'Click any ward block to focus or inspect feeder connection.'}
          </span>
        </div>
        {highlightWards.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${getHighlightBadge()}`}>
              {language === 'ne'
                ? `${highlightWards.map(w => toNepaliDigits(w)).join(', ')} वडा प्रभावित`
                : `Ward ${highlightWards.join(', ')} Affected`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
