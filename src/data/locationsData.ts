import type { LocationItem } from '../types';

export const PROVINCE = {
  id: 'sudurpashchim',
  nameEn: 'Sudurpashchim Province',
  nameNe: 'सुदूरपश्चिम प्रदेश',
};

export const DISTRICT = {
  id: 'kanchanpur',
  nameEn: 'Kanchanpur',
  nameNe: 'कञ्चनपुर',
};

export const MUNICIPALITY = {
  id: 'bheemdatta',
  nameEn: 'Bheemdatta Municipality',
  nameNe: 'भीमदत्त नगरपालिका',
  totalWards: 19,
};

export const WARDS = Array.from({ length: 19 }, (_, i) => ({
  number: i + 1,
  nameEn: `Ward No. ${String(i + 1).padStart(2, '0')}`,
  nameNe: `वडा नं. ${toNepaliDigits(i + 1)}`,
}));

export function toNepaliDigits(num: number | string): string {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return num
    .toString()
    .split('')
    .map((char) => {
      const parsed = parseInt(char, 10);
      return !isNaN(parsed) ? nepaliDigits[parsed] : char;
    })
    .join('');
}

export const LOCATIONS: LocationItem[] = [
  // Ward 01
  {
    id: 'loc-01-01',
    nameEn: 'Rauteli Bichawa',
    nameNe: 'रौतेली बिचवा',
    wardNumber: 1,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.9312, lng: 80.1245 },
    substation: 'Mahendranagar 33/11 kV',
    feeder: 'Rauteli Feeder',
  },
  {
    id: 'loc-01-02',
    nameEn: 'Matamula',
    nameNe: 'मतमुला',
    wardNumber: 1,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.9345, lng: 80.1311 },
  },


  // Ward 02
  {
    id: 'loc-02-01',
    nameEn: 'Katan',
    nameNe: 'कटान',
    wardNumber: 2,
    type: 'Area',
    coordinates: { lat: 28.9511, lng: 80.1654 },
    substation: 'Mahendranagar 33/11 kV',
    feeder: 'Katan 11kV Feeder',
  },
  {
    id: 'loc-02-02',
    nameEn: 'Bageli',
    nameNe: 'बगेली',
    wardNumber: 2,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.9567, lng: 80.1702 },
  },

  // Ward 03 (Primary Sample)
  {
    id: 'loc-03-01',
    nameEn: 'Naulakhet',
    nameNe: 'नौलाखेत',
    wardNumber: 3,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.9688, lng: 80.1834 },
    substation: 'Bheemdatta City Substation',
    feeder: 'Naulakhet-Bhasi 11kV Feeder',
  },
  {
    id: 'loc-03-02',
    nameEn: 'Bhasi',
    nameNe: 'भासी',
    wardNumber: 3,
    type: 'Area',
    coordinates: { lat: 28.9642, lng: 80.1788 },
    substation: 'Bheemdatta City Substation',
    feeder: 'Naulakhet-Bhasi 11kV Feeder',
  },
  {
    id: 'loc-03-03',
    nameEn: 'Shanti Tol',
    nameNe: 'शान्ति टोल',
    wardNumber: 3,
    type: 'Neighborhood',
    coordinates: { lat: 28.9712, lng: 80.1872 },
  },
  {
    id: 'loc-03-04',
    nameEn: 'Ward 03 Area Center',
    nameNe: 'वडा नं ०३ केन्द्रीय क्षेत्र',
    wardNumber: 3,
    type: 'Electricity Distribution Area',
    coordinates: { lat: 28.9665, lng: 80.1812 },
  },

  // Ward 04 (City Center)
  {
    id: 'loc-04-01',
    nameEn: 'Mahendranagar Bazaar',
    nameNe: 'महेन्द्रनगर बजार',
    wardNumber: 4,
    type: 'Area',
    coordinates: { lat: 28.9621, lng: 80.1895 },
    substation: 'Bheemdatta Main Substation',
    feeder: 'City Commercial 11kV Feeder',
  },
  {
    id: 'loc-04-02',
    nameEn: 'Samvidhan Chowk',
    nameNe: 'संविधान चोक',
    wardNumber: 4,
    type: 'Road / Specific Area',
    coordinates: { lat: 28.961, lng: 80.191 },
  },
  {
    id: 'loc-04-03',
    nameEn: 'Gali No. 1 to 5',
    nameNe: 'गल्ली नं १ देखि ५ सम्म',
    wardNumber: 4,
    type: 'Neighborhood',
    coordinates: { lat: 28.963, lng: 80.188 },
  },

  // Ward 05
  {
    id: 'loc-05-01',
    nameEn: 'Gobariya',
    nameNe: 'गोबरिया',
    wardNumber: 5,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.9542, lng: 80.2014 },
    substation: 'Mahendranagar 33/11 kV',
    feeder: 'Gobariya Industrial Feeder',
  },
  {
    id: 'loc-05-02',
    nameEn: 'Bandevi Temple Area',
    nameNe: 'बनदेवी मन्दिर क्षेत्र',
    wardNumber: 5,
    type: 'Area',
    coordinates: { lat: 28.958, lng: 80.208 },
  },

  // Ward 06
  {
    id: 'loc-06-01',
    nameEn: 'Aithpur',
    nameNe: 'ऐठपुर',
    wardNumber: 6,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.9745, lng: 80.1982 },
    substation: 'Bheemdatta Main Substation',
    feeder: 'Aithpur 11kV',
  },
  {
    id: 'loc-06-02',
    nameEn: 'Pragatinagar',
    nameNe: 'प्रगतिनगर',
    wardNumber: 6,
    type: 'Neighborhood',
    coordinates: { lat: 28.9782, lng: 80.2031 },
  },

  // Ward 07
  {
    id: 'loc-07-01',
    nameEn: 'Haldhunga',
    nameNe: 'हलढुङ्गा',
    wardNumber: 7,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.9812, lng: 80.2155 },
  },

  // Ward 08
  {
    id: 'loc-08-01',
    nameEn: 'Tilkeni',
    nameNe: 'तिलकेनी',
    wardNumber: 8,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.989, lng: 80.2241 },
  },

  // Ward 09
  {
    id: 'loc-09-01',
    nameEn: 'Brahmadev',
    nameNe: 'ब्रह्मदेव',
    wardNumber: 9,
    type: 'Area',
    coordinates: { lat: 29.0821, lng: 80.1415 },
    substation: 'Tanakpur Link 33kV',
    feeder: 'Brahmadev Feeder',
  },

  // Ward 10
  {
    id: 'loc-10-01',
    nameEn: 'Suda',
    nameNe: 'सुडा',
    wardNumber: 10,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.9412, lng: 80.2415 },
  },

  // Ward 11
  {
    id: 'loc-11-01',
    nameEn: 'Bhujela',
    nameNe: 'भुजेला',
    wardNumber: 11,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.9482, lng: 80.1512 },
  },

  // Ward 12
  {
    id: 'loc-12-01',
    nameEn: 'Odali',
    nameNe: 'ओदाली',
    wardNumber: 12,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.939, lng: 80.171 },
  },

  // Ward 13
  {
    id: 'loc-13-01',
    nameEn: 'Pipaiya',
    nameNe: 'पिपैया',
    wardNumber: 13,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.9281, lng: 80.1845 },
  },

  // Ward 14
  {
    id: 'loc-14-01',
    nameEn: 'Majhgaun Airport Area',
    nameNe: 'मझगाउँ विमानस्थल क्षेत्र',
    wardNumber: 14,
    type: 'Area',
    coordinates: { lat: 28.9515, lng: 80.1455 },
  },

  // Ward 15
  {
    id: 'loc-15-01',
    nameEn: 'Gobarchaur',
    nameNe: 'गोबरचौर',
    wardNumber: 15,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.9189, lng: 80.1985 },
  },

  // Ward 16
  {
    id: 'loc-16-01',
    nameEn: 'Majhagaun South',
    nameNe: 'मझगाउँ दक्षिण',
    wardNumber: 16,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.9351, lng: 80.1389 },
  },

  // Ward 17
  {
    id: 'loc-17-01',
    nameEn: 'Badhaiya',
    nameNe: 'बढैया',
    wardNumber: 17,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.921, lng: 80.155 },
  },

  // Ward 18
  {
    id: 'loc-18-01',
    nameEn: 'Salaghari',
    nameNe: 'सलाघारी',
    wardNumber: 18,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.9615, lng: 80.2185 },
  },

  // Ward 19
  {
    id: 'loc-19-01',
    nameEn: 'Bagkhor',
    nameNe: 'बागखोर',
    wardNumber: 19,
    type: 'Tole / Settlement',
    coordinates: { lat: 28.972, lng: 80.231 },
  },
];
