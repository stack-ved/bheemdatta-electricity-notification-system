import type { Outage } from '../types';


export const SAMPLE_OUTAGES: Outage[] = [

  {

    id: 'outage-2026-001',

    titleEn: 'Scheduled Electricity Interruption',

    titleNe: 'निर्धारित विद्युत अवरोध',

    status: 'SCHEDULED',

    municipality: 'Bheemdatta Municipality',

    district: 'Kanchanpur',

    province: 'Sudurpashchim Province',

    wards: [3],

    affectedLocations: [

      {

        locationId: 'loc-03-01',

        nameEn: 'Naulakhet',

        nameNe: 'नौलाखेत',

        wardNumber: 3,

      },

      {

        locationId: 'loc-03-02',

        nameEn: 'Bhasi',

        nameNe: 'भासी',

        wardNumber: 3,

      },

      {

        locationId: 'loc-03-03',

        nameEn: 'Shanti Tol',

        nameNe: 'शान्ति टोल',

        wardNumber: 3,

      },

      {

        locationId: 'loc-03-04',

        nameEn: 'Ward 03 Area Center',

        nameNe: 'वडा नं ०३ केन्द्रीय क्षेत्र',

        wardNumber: 3,

      },

    ],

    startTime: '2026-09-07T10:00:00+05:45',

    expectedRestoration: '2026-09-07T14:00:00+05:45',

    reasonEn: '11kV Feeder Conductor Upgrading and Substation Transformer Maintenance Work',

    reasonNe: '११ केभी फिडर कन्डक्टर स्तरोन्नति तथा सबस्टेशन ट्रान्सफर्मर नियमित मर्मत सम्भार कार्य',

    feederNameEn: 'Naulakhet-Bhasi 11kV Feeder',

    feederNameNe: 'नौलाखेत-भासी ११ केभी फिडर',

    substationEn: 'Bheemdatta City 33/11 kV Substation',

    substationNe: 'भीमदत्त नगर ३३/११ केभी सबस्टेशन',

    lastUpdated: '2026-09-06T16:45:00+05:45',

    affectedCustomersEstimate: 1450,

    contactNumber: '099-521153',

    emergencyNoteEn: 'Electricity may be restored earlier without prior notice if maintenance is completed ahead of schedule. Please keep switches turned off.',

    emergencyNoteNe: 'मर्मत कार्य समय अगावै सम्पन्न भएमा कुनै पूर्व सूचना बिना विद्युत सुचारु हुन सक्ने भएकोले सावधानी अपनाउनुहोला।',

  },

  {

    id: 'outage-2026-002',

    titleEn: 'Emergency Active Power Outage',

    titleNe: 'आकस्मिक विद्युत अवरोध',

    status: 'ACTIVE',

    municipality: 'Bheemdatta Municipality',

    district: 'Kanchanpur',

    province: 'Sudurpashchim Province',

    wards: [2],

    affectedLocations: [

      {

        locationId: 'loc-02-01',

        nameEn: 'Katan',

        nameNe: 'कटान',

        wardNumber: 2,

      },

      {

        locationId: 'loc-02-02',

        nameEn: 'Bageli',

        nameNe: 'बगेली',

        wardNumber: 2,

      },

    ],

    startTime: '2026-09-06T15:30:00+05:45',

    expectedRestoration: '2026-09-06T18:45:00+05:45',

    reasonEn: 'Tree branch fell on 11kV overhead transmission line due to wind gusts; line tripping fault repair',

    reasonNe: 'हावाहुरीका कारण ११ केभी प्रसारण लाइनमा रूखको हाँगा खसेर तार चुँडिएको र मर्मत टोली खटिएको',

    feederNameEn: 'Katan Feeder #2',

    feederNameNe: 'कटान फिडर नं २',

    substationEn: 'Mahendranagar 33/11 kV Substation',

    substationNe: 'महेन्द्रनगर ३३/११ केभी सबस्टेशन',

    lastUpdated: '2026-09-06T17:10:00+05:45',

    affectedCustomersEstimate: 820,

    contactNumber: '099-521153',

    emergencyNoteEn: 'NEA Emergency Rapid Response team is actively replacing the damaged line insulator.',

    emergencyNoteNe: 'नेपाल विद्युत प्राधिकरणको आपतकालीन टोलीले क्षतिग्रस्त इन्सुलेटर र तार मर्मत गरिरहेको छ।',

  },

  {

    id: 'outage-2026-003',

    titleEn: 'Power Restoration In Progress',

    titleNe: 'विद्युत पुनर्बहाली प्रक्रियामा',

    status: 'RESTORATION',

    municipality: 'Bheemdatta Municipality',

    district: 'Kanchanpur',

    province: 'Sudurpashchim Province',

    wards: [4],

    affectedLocations: [

      {

        locationId: 'loc-04-01',

        nameEn: 'Mahendranagar Bazaar',

        nameNe: 'महेन्द्रनगर बजार',

        wardNumber: 4,

      },

      {

        locationId: 'loc-04-02',

        nameEn: 'Samvidhan Chowk',

        nameNe: 'संविधान चोक',

        wardNumber: 4,

      },

      {

        locationId: 'loc-04-03',

        nameEn: 'Gali No. 1 to 5',

        nameNe: 'गल्ली नं १ देखि ५ सम्म',

        wardNumber: 4,

      },

    ],

    startTime: '2026-09-06T13:00:00+05:45',

    expectedRestoration: '2026-09-06T17:45:00+05:45',

    reasonEn: 'Distribution Transformer replacement and load balancing testing',

    reasonNe: 'वितरण ट्रान्सफर्मर फेर्ने तथा लोड सन्तुलन परीक्षण कार्य अन्तिम चरणमा पुगेको',

    feederNameEn: 'City Commercial 11kV Feeder',

    feederNameNe: 'सहर व्यापारिक ११ केभी फिडर',

    substationEn: 'Bheemdatta Main Substation',

    substationNe: 'भीमदत्त मुख्य सबस्टेशन',

    lastUpdated: '2026-09-06T17:15:00+05:45',

    affectedCustomersEstimate: 2100,

    contactNumber: '099-521153',

    emergencyNoteEn: 'Main transformer energization test underway. Power will return sequentially across alley blocks.',

    emergencyNoteNe: 'ट्रान्सफर्मर चार्ज गर्ने परीक्षण सुरु भएको छ। चरणबद्ध रूपमा विद्युत सुचारु हुनेछ।',

  },

  {

    id: 'outage-2026-004',

    titleEn: 'Completed Maintenance - Restored',

    titleNe: 'सम्पन्न मर्मत कार्य - सुचारु भएको',

    status: 'RESTORED',

    municipality: 'Bheemdatta Municipality',

    district: 'Kanchanpur',

    province: 'Sudurpashchim Province',

    wards: [5, 6],

    affectedLocations: [

      {

        locationId: 'loc-05-01',

        nameEn: 'Gobariya',

        nameNe: 'गोबरिया',

        wardNumber: 5,

      },

      {

        locationId: 'loc-06-01',

        nameEn: 'Aithpur',

        nameNe: 'ऐठपुर',

        wardNumber: 6,

      },

    ],

    startTime: '2026-09-06T08:00:00+05:45',

    expectedRestoration: '2026-09-06T12:00:00+05:45',

    actualRestoration: '2026-09-06T11:40:00+05:45',

    reasonEn: 'Tree branch trimming and preventive insulator cleaning along the 11kV highway route',

    reasonNe: 'राजमार्ग क्षेत्रको ११ केभी लाइनमुनि रहेका रुखका हाँगा छिमल्ने र इन्सुलेटर सफाइ कार्य',

    feederNameEn: 'Aithpur-Gobariya Feeder',

    feederNameNe: 'ऐठपुर-गोबरिया फिडर',

    substationEn: 'Bheemdatta Main Substation',

    substationNe: 'भीमदत्त मुख्य सबस्टेशन',

    lastUpdated: '2026-09-06T11:45:00+05:45',

    affectedCustomersEstimate: 1680,

    contactNumber: '099-521153',

  },

  {

    id: 'outage-2026-005',

    titleEn: 'Scheduled 33kV Line Shutdown',

    titleNe: '३३ केभी मुख्य लाइन निर्धारित शटडाउन',

    status: 'SCHEDULED',

    municipality: 'Bheemdatta Municipality',

    district: 'Kanchanpur',

    province: 'Sudurpashchim Province',

    wards: [8, 9, 10],

    affectedLocations: [

      {

        locationId: 'loc-08-01',

        nameEn: 'Tilkeni',

        nameNe: 'तिलकेनी',

        wardNumber: 8,

      },

      {

        locationId: 'loc-09-01',

        nameEn: 'Brahmadev',

        nameNe: 'ब्रह्मदेव',

        wardNumber: 9,

      },

      {

        locationId: 'loc-10-01',

        nameEn: 'Suda',

        nameNe: 'सुडा',

        wardNumber: 10,

      },

    ],

    startTime: '2026-09-09T09:00:00+05:45',

    expectedRestoration: '2026-09-09T16:00:00+05:45',

    reasonEn: 'Inter-district 33kV transmission grid strengthening and tower foundation reinforcement',

    reasonNe: 'अन्तर-जिल्ला ३३ केभी प्रसारण ग्रिड सुदृढीकरण तथा टावर जग सुदृढीकरण कार्य',

    feederNameEn: 'Brahmadev-Tanakpur Intertie 33kV',

    feederNameNe: 'ब्रह्मदेव-टनकपुर इन्टरटाई ३३ केभी',

    substationEn: 'Mahendranagar Grid Substation',

    substationNe: 'महेन्द्रनगर ग्रिड सबस्टेशन',

    lastUpdated: '2026-09-06T14:00:00+05:45',

    affectedCustomersEstimate: 3400,

    contactNumber: '099-521153',

    emergencyNoteEn: 'High capacity transmission line work. Affected areas will experience uninterrupted restoration once safety clearance is issued.',

    emergencyNoteNe: 'उच्च क्षमताको प्रसारण लाइनको काम भएकाले सुरक्षा जाँच पश्चात तत्काल विद्युत सुचारु गरिनेछ।',

  },

]; 
