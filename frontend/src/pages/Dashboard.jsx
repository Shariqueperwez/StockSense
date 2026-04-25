import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, TrendingUp, TrendingDown, BarChart2, BookOpen, Target, AlertTriangle, Zap, Activity, Star, ChevronDown, ChevronUp, Bell, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api';
import { useMode } from '../context/ModeContext';
import WatchlistPanel from './WatchlistPanel';
import TraderView from './TraderView';
import InvestorView from './InvestorView';

// 600+ NSE stocks
const NSE_STOCKS = [
  {symbol:'RELIANCE',name:'Reliance Industries'},{symbol:'TCS',name:'Tata Consultancy Services'},
  {symbol:'HDFCBANK',name:'HDFC Bank'},{symbol:'INFY',name:'Infosys'},{symbol:'ICICIBANK',name:'ICICI Bank'},
  {symbol:'SBIN',name:'State Bank of India'},{symbol:'BHARTIARTL',name:'Bharti Airtel'},{symbol:'ITC',name:'ITC Limited'},
  {symbol:'LT',name:'Larsen & Toubro'},{symbol:'BAJFINANCE',name:'Bajaj Finance'},{symbol:'HINDUNILVR',name:'Hindustan Unilever'},
  {symbol:'AXISBANK',name:'Axis Bank'},{symbol:'KOTAKBANK',name:'Kotak Mahindra Bank'},{symbol:'MARUTI',name:'Maruti Suzuki'},
  {symbol:'SUNPHARMA',name:'Sun Pharmaceutical'},{symbol:'WIPRO',name:'Wipro'},{symbol:'HCLTECH',name:'HCL Technologies'},
  {symbol:'TITAN',name:'Titan Company'},{symbol:'ASIANPAINT',name:'Asian Paints'},{symbol:'TECHM',name:'Tech Mahindra'},
  {symbol:'NTPC',name:'NTPC Limited'},{symbol:'POWERGRID',name:'Power Grid Corporation'},{symbol:'ONGC',name:'Oil & Natural Gas'},
  {symbol:'TATAMOTORS',name:'Tata Motors'},{symbol:'TATASTEEL',name:'Tata Steel'},{symbol:'HINDALCO',name:'Hindalco Industries'},
  {symbol:'JSWSTEEL',name:'JSW Steel'},{symbol:'M&M',name:'Mahindra & Mahindra'},{symbol:'BAJAJFINSV',name:'Bajaj Finserv'},
  {symbol:'DRREDDY',name:'Dr Reddys Laboratories'},{symbol:'CIPLA',name:'Cipla'},{symbol:'DIVISLAB',name:'Divis Laboratories'},
  {symbol:'APOLLOHOSP',name:'Apollo Hospitals'},{symbol:'ADANIPORTS',name:'Adani Ports'},{symbol:'ADANIENT',name:'Adani Enterprises'},
  {symbol:'ULTRACEMCO',name:'UltraTech Cement'},{symbol:'NESTLEIND',name:'Nestle India'},{symbol:'TRENT',name:'Trent'},
  {symbol:'ZOMATO',name:'Zomato'},{symbol:'PAYTM',name:'Paytm (One97 Communications)'},{symbol:'NYKAA',name:'Nykaa (FSN E-Commerce)'},
  {symbol:'DMART',name:'Avenue Supermarts (DMart)'},{symbol:'IRCTC',name:'Indian Railway Catering'},{symbol:'HAL',name:'Hindustan Aeronautics'},
  {symbol:'BEL',name:'Bharat Electronics'},{symbol:'RVNL',name:'Rail Vikas Nigam'},{symbol:'YESBANK',name:'Yes Bank'},
  {symbol:'IDFCFIRSTB',name:'IDFC First Bank'},{symbol:'FEDERALBNK',name:'Federal Bank'},
  {symbol:'COALINDIA',name:'Coal India'},{symbol:'GAIL',name:'GAIL India'},{symbol:'IOC',name:'Indian Oil Corporation'},
  {symbol:'TATAPOWER',name:'Tata Power'},{symbol:'ADANIGREEN',name:'Adani Green Energy'},{symbol:'SUZLON',name:'Suzlon Energy'},
  {symbol:'DLF',name:'DLF Limited'},{symbol:'GODREJPROP',name:'Godrej Properties'},{symbol:'OBEROIRLTY',name:'Oberoi Realty'},
  {symbol:'HAVELLS',name:'Havells India'},{symbol:'VOLTAS',name:'Voltas'},{symbol:'DIXON',name:'Dixon Technologies'},
  {symbol:'POLYCAB',name:'Polycab India'},{symbol:'ANGELONE',name:'Angel One'},{symbol:'MCX',name:'Multi Commodity Exchange'},
  {symbol:'PERSISTENT',name:'Persistent Systems'},{symbol:'COFORGE',name:'Coforge'},{symbol:'MPHASIS',name:'Mphasis'},
  {symbol:'TATAELXSI',name:'Tata Elxsi'},{symbol:'LTIM',name:'LTIMindtree'},{symbol:'KPITTECH',name:'KPIT Technologies'},
  {symbol:'AUROPHARMA',name:'Aurobindo Pharma'},{symbol:'LUPIN',name:'Lupin'},{symbol:'BIOCON',name:'Biocon'},
  {symbol:'MAXHEALTH',name:'Max Healthcare'},{symbol:'FORTIS',name:'Fortis Healthcare'},
  {symbol:'TVSMOTOR',name:'TVS Motor Company'},{symbol:'ASHOKLEY',name:'Ashok Leyland'},{symbol:'MRF',name:'MRF'},
  {symbol:'APOLLOTYRE',name:'Apollo Tyres'},{symbol:'BHARATFORG',name:'Bharat Forge'},
  {symbol:'INDUSINDBK',name:'IndusInd Bank'},{symbol:'BANDHANBNK',name:'Bandhan Bank'},
  {symbol:'MUTHOOTFIN',name:'Muthoot Finance'},{symbol:'CHOLAFIN',name:'Cholamandalam Finance'},
  {symbol:'RECLTD',name:'REC Limited'},{symbol:'PFC',name:'Power Finance Corporation'},
  {symbol:'NMDC',name:'NMDC'},{symbol:'SAIL',name:'Steel Authority of India'},{symbol:'VEDL',name:'Vedanta'},
  {symbol:'PIDILITIND',name:'Pidilite Industries'},{symbol:'DEEPAKNTR',name:'Deepak Nitrite'},
  {symbol:'INTERGLOBE',name:'InterGlobe Aviation (IndiGo)'},{symbol:'INDHOTEL',name:'Indian Hotels (Taj)'},
  {symbol:'VBL',name:'Varun Beverages'},{symbol:'MARICO',name:'Marico'},{symbol:'DABUR',name:'Dabur India'},
  {symbol:'COLPAL',name:'Colgate-Palmolive India'},{symbol:'PVRINOX',name:'PVR INOX'},
  {symbol:'ZYDUSLIFE',name:'Zydus Lifesciences'},{symbol:'TORNTPHARM',name:'Torrent Pharmaceuticals'},
  {symbol:'ALKEM',name:'Alkem Laboratories'},{symbol:'IPCALAB',name:'IPCA Laboratories'},
  {symbol:'ABBOTINDIA',name:'Abbott India'},{symbol:'PFIZER',name:'Pfizer India'},
  {symbol:'GLAXO',name:'GSK Pharmaceuticals'},{symbol:'SANOFI',name:'Sanofi India'},
  {symbol:'GLENMARK',name:'Glenmark Pharmaceuticals'},{symbol:'NATCOPHARM',name:'Natco Pharma'},
  {symbol:'LAURUSLABS',name:'Laurus Labs'},{symbol:'GRANULES',name:'Granules India'},
  {symbol:'SUNPHARMA',name:'Sun Pharmaceutical'},{symbol:'DISHTV',name:'Dish TV India'},
  {symbol:'HDFCAMC',name:'HDFC AMC'},{symbol:'NIPPONLIFE',name:'Nippon India Mutual Fund'},
  {symbol:'ICICIGI',name:'ICICI Lombard'},{symbol:'HDFCLIFE',name:'HDFC Life Insurance'},
  {symbol:'SBILIFE',name:'SBI Life Insurance'},{symbol:'LICI',name:'LIC of India'},
  {symbol:'BAJAJ-AUTO',name:'Bajaj Auto'},{symbol:'EICHERMOT',name:'Eicher Motors'},
  {symbol:'HEROMOTOCO',name:'Hero MotoCorp'},{symbol:'BALKRISIND',name:'Balkrishna Industries'},
  {symbol:'CUMMINSIND',name:'Cummins India'},{symbol:'BOSCH',name:'Bosch'},{symbol:'MOTHERSON',name:'Samvardhana Motherson'},
  {symbol:'MINDAIND',name:'Uno Minda'},{symbol:'ENDURANCE',name:'Endurance Technologies'},
  {symbol:'TIINDIA',name:'Tube Investments'},{symbol:'EXIDEIND',name:'Exide Industries'},
  {symbol:'AMARARAJA',name:'Amara Raja Energy'},{symbol:'SUPRAJIT',name:'Suprajit Engineering'},
  {symbol:'SCHAEFFLER',name:'Schaeffler India'},{symbol:'SKFINDIA',name:'SKF India'},
  {symbol:'TIMKEN',name:'Timken India'},{symbol:'NCC',name:'NCC Limited'},
  {symbol:'KNRCON',name:'KNR Constructions'},{symbol:'PNCINFRA',name:'PNC Infratech'},
  {symbol:'IRB',name:'IRB Infrastructure'},{symbol:'GMRINFRA',name:'GMR Airports Infrastructure'},
  {symbol:'AIAENG',name:'AIA Engineering'},{symbol:'THERMAX',name:'Thermax'},
  {symbol:'ABB',name:'ABB India'},{symbol:'SIEMENS',name:'Siemens India'},
  {symbol:'BHEL',name:'Bharat Heavy Electricals'},{symbol:'CGPOWER',name:'CG Power'},
  {symbol:'TDPOWER',name:'TD Power Systems'},{symbol:'INOXWIND',name:'Inox Wind'},
  {symbol:'CESC',name:'CESC Limited'},{symbol:'TORNTPOWER',name:'Torrent Power'},
  {symbol:'ADANIPOWER',name:'Adani Power'},{symbol:'JSWENERGY',name:'JSW Energy'},
  {symbol:'GREENKO',name:'Greenko Energy'},{symbol:'RENUKA',name:'Shree Renuka Sugars'},
  {symbol:'BALRAMCHIN',name:'Balrampur Chini Mills'},{symbol:'BAJAJHIND',name:'Bajaj Hindusthan Sugar'},
  {symbol:'TRIVENI',name:'Triveni Engineering'},{symbol:'DHAMPUR',name:'Dhampur Sugar'},
  {symbol:'SHREECEM',name:'Shree Cement'},{symbol:'AMBUJACEM',name:'Ambuja Cements'},
  {symbol:'ACCLTD',name:'ACC Limited'},{symbol:'JKCEMENT',name:'JK Cement'},
  {symbol:'DALBHARAT',name:'Dalmia Bharat'},{symbol:'RAMCOCEM',name:'Ramco Cements'},
  {symbol:'HEIDELBERG',name:'Heidelberg Cement India'},{symbol:'STARCEMENT',name:'Star Cement'},
  {symbol:'INDIACEM',name:'India Cements'},{symbol:'PRISM',name:'Prism Johnson'},
  {symbol:'HGSINFRA',name:'HG Infra Engineering'},{symbol:'GRSE',name:'Garden Reach Shipbuilders'},
  {symbol:'MAZDA',name:'Mazda Limited'},{symbol:'COCHINSHIP',name:'Cochin Shipyard'},
  {symbol:'RITES',name:'RITES Limited'},{symbol:'IRCON',name:'IRCON International'},
  {symbol:'NBCC',name:'NBCC India'},{symbol:'WABAG',name:'VA Tech Wabag'},
  {symbol:'ENGINERSIN',name:'Engineers India'},{symbol:'ELGIEQUIP',name:'Elgi Equipments'},
  {symbol:'GRINDWELL',name:'Grindwell Norton'},{symbol:'CARBORUNIV',name:'Carborundum Universal'},
  {symbol:'FINOLEX',name:'Finolex Cables'},{symbol:'KEI',name:'KEI Industries'},
  {symbol:'STERLITE',name:'Sterlite Technologies'},{symbol:'VGUARD',name:'V-Guard Industries'},
  {symbol:'ORIENTELEC',name:'Orient Electric'},{symbol:'CROMPTON',name:'Crompton Greaves Consumer'},
  {symbol:'WHIRLPOOL',name:'Whirlpool of India'},{symbol:'BLUEDART',name:'Blue Dart Express'},
  {symbol:'GESHIP',name:'Great Eastern Shipping'},{symbol:'SCI',name:'Shipping Corporation of India'},
  {symbol:'MAHINDCIE',name:'Mahindra CIE Automotive'},{symbol:'APOLLOTYRES',name:'Apollo Tyres'},
  {symbol:'MGL',name:'Mahanagar Gas'},{symbol:'IGL',name:'Indraprastha Gas'},
  {symbol:'GUJGASLTD',name:'Gujarat Gas'},{symbol:'PETRONET',name:'Petronet LNG'},
  {symbol:'BPCL',name:'Bharat Petroleum'},{symbol:'HPCL',name:'Hindustan Petroleum'},
  {symbol:'CASTROLIND',name:'Castrol India'},{symbol:'GULFOILLUB',name:'Gulf Oil Lubricants'},
  {symbol:'TIDEWATER',name:'Tide Water Oil'},{symbol:'HINDPETRO',name:'Hindustan Petroleum'},
  {symbol:'MRPL',name:'Mangalore Refinery'},{symbol:'CPCL',name:'Chennai Petroleum'},
  {symbol:'TATACHEM',name:'Tata Chemicals'},{symbol:'COROMANDEL',name:'Coromandel International'},
  {symbol:'CHAMBLFERT',name:'Chambal Fertilizers'},{symbol:'NFL',name:'National Fertilizers'},
  {symbol:'GNFC',name:'Gujarat Narmada Valley'},{symbol:'GSFC',name:'Gujarat State Fertilizers'},
  {symbol:'SRF',name:'SRF Limited'},{symbol:'AAVAS',name:'Aavas Financiers'},
  {symbol:'HOMEFIRST',name:'Home First Finance'},{symbol:'CAN_FIN',name:'Can Fin Homes'},
  {symbol:'REPCO',name:'Repco Home Finance'},{symbol:'APTUS',name:'Aptus Value Housing Finance'},
  {symbol:'RBLBANK',name:'RBL Bank'},{symbol:'DCBBANK',name:'DCB Bank'},
  {symbol:'KARURVYSYA',name:'Karur Vysya Bank'},{symbol:'SOUTHBANK',name:'South Indian Bank'},
  {symbol:'CITYUNIONBANK',name:'City Union Bank'},{symbol:'TMBFINL',name:'Tamilnad Mercantile Bank'},
  {symbol:'UJJIVANSFB',name:'Ujjivan Small Finance Bank'},{symbol:'SURYODAY',name:'Suryoday Small Finance Bank'},
  {symbol:'ESAFSFB',name:'ESAF Small Finance Bank'},{symbol:'UTKARSHBNK',name:'Utkarsh Small Finance Bank'},
  {symbol:'MANAPPURAM',name:'Manappuram Finance'},{symbol:'BAJAJHFL',name:'Bajaj Housing Finance'},
  {symbol:'PIRAMALENT',name:'Piramal Enterprises'},{symbol:'MOTHERSON',name:'Samvardhana Motherson'},
  {symbol:'JBCHEPHARM',name:'JB Chemicals'},{symbol:'SUVENPHAR',name:'Suven Pharmaceuticals'},
  {symbol:'SYMPHONY',name:'Symphony Limited'},{symbol:'WONDERLA',name:'Wonderla Holidays'},
  {symbol:'MAHLIFE',name:'Mahindra Lifespace'},{symbol:'PHOENIXLTD',name:'Phoenix Mills'},
  {symbol:'PRESTIGE',name:'Prestige Estates'},{symbol:'BRIGADE',name:'Brigade Enterprises'},
  {symbol:'SOBHA',name:'Sobha Limited'},{symbol:'PURAVANKARA',name:'Puravankara'},
  {symbol:'KOLTEPATIL',name:'Kolte-Patil Developers'},{symbol:'ARVINDFASN',name:'Arvind Fashions'},
  {symbol:'TATACOMM',name:'Tata Communications'},{symbol:'RCOM',name:'Reliance Communications'},
  {symbol:'TTML',name:'Tata Teleservices Maharashtra'},{symbol:'IDEA',name:'Vodafone Idea'},
  {symbol:'HFCL',name:'HFCL Limited'},{symbol:'TEJAS',name:'Tejas Networks'},
  {symbol:'AFFLE',name:'Affle India'},{symbol:'INFOEDGE',name:'Info Edge (Naukri)'},
  {symbol:'ZAUBACORP',name:'Varun Beverages'},{symbol:'JUSTDIAL',name:'Just Dial'},
  {symbol:'POLICYBZR',name:'PB Fintech (Policybazaar)'},{symbol:'CARTRADE',name:'CarTrade Tech'},
  {symbol:'NAUKRI',name:'Info Edge (Naukri.com)'},{symbol:'INDIAMART',name:'IndiaMART InterMESH'},
  {symbol:'MAPMYINDIA',name:'CE Info Systems (MapmyIndia)'},{symbol:'ROUTE',name:'Route Mobile'},
  {symbol:'TANLA',name:'Tanla Platforms'},{symbol:'ONMOBILE',name:'OnMobile Global'},
  {symbol:'NAZARA',name:'Nazara Technologies'},{symbol:'ZENSAR',name:'Zensar Technologies'},
  {symbol:'MASTECH',name:'Mastech Digital'},{symbol:'NIITTECH',name:'NIIT Technologies'},
  {symbol:'RAMSARUP',name:'Ram Sarup Industries'},{symbol:'HEXAWARE',name:'Hexaware Technologies'},
  {symbol:'MINDTREE',name:'Mindtree (now LTIMindtree)'},{symbol:'NIIT',name:'NIIT Limited'},
  {symbol:'APTECH',name:'Aptech Limited'},{symbol:'KFINTECH',name:'KFin Technologies'},
  {symbol:'CAMS',name:'CAMS (Computer Age Management)'},{symbol:'BSE',name:'BSE Limited'},
  {symbol:'NCDEX',name:'National Commodity Exchange'},{symbol:'CDSL',name:'CDSL'},
  {symbol:'NSDL',name:'NSDL (National Securities Depository)'},{symbol:'MASFIN',name:'MAS Financial Services'},
  {symbol:'CREDITACC',name:'CreditAccess Grameen'},{symbol:'SPANDANA',name:'Spandana Sphoorty'},
  {symbol:'ARMANFIN',name:'Arman Financial Services'},{symbol:'SUMILON',name:'Sumilon Industries'},
  {symbol:'BAJAJCONS',name:'Bajaj Consumer Care'},{symbol:'EMAMILTD',name:'Emami Limited'},
  {symbol:'GODREJCP',name:'Godrej Consumer Products'},{symbol:'JYOTHYLAB',name:'Jyothy Labs'},
  {symbol:'GILLETTE',name:'Gillette India'},{symbol:'PGHH',name:'Procter & Gamble Hygiene'},
  {symbol:'HATSUN',name:'Hatsun Agro Product'},{symbol:'HERITAGE',name:'Heritage Foods'},
  {symbol:'PARAS',name:'Paras Defence'},{symbol:'MTAR',name:'MTAR Technologies'},
  {symbol:'IDEAFORGE',name:'ideaForge Technology'},{symbol:'SANSERA',name:'Sansera Engineering'},
  {symbol:'DRAFTFCB',name:'Draftfcb Ulka Advertising'},{symbol:'BARBEQUE',name:'Barbeque Nation'},
  {symbol:'WESTLIFE',name:'Westlife Foodworld (McD India)'},{symbol:'DEVYANI',name:'Devyani International'},
  {symbol:'SAPPHIRE',name:'Sapphire Foods India'},{symbol:'JUBLFOOD',name:'Jubilant Foodworks'},
  {symbol:'TIPSMUSIC',name:'Tips Music'},{symbol:'EROSSTX',name:'Eros STX Global'},
  {symbol:'PCBL',name:'PCBL Limited'},{symbol:'ATUL',name:'Atul Limited'},
  {symbol:'NAVINFLUOR',name:'Navin Fluorine'},{symbol:'FLUOROCHEM',name:'Gujarat Fluorochemicals'},
  {symbol:'ALKYLAMINE',name:'Alkyl Amines Chemicals'},{symbol:'BALAJI',name:'Balaji Amines'},
  {symbol:'VINATIORGA',name:'Vinati Organics'},{symbol:'FINEORG',name:'Fine Organic Industries'},
  {symbol:'CLEAN',name:'Clean Science Technology'},{symbol:'NOCIL',name:'NOCIL Limited'},
  {symbol:'TATVA',name:'Tatva Chintan Pharma Chem'},{symbol:'CHEMFAB',name:'Chemfab Alkalis'},
  {symbol:'NUVAMA',name:'Nuvama Wealth Management'},{symbol:'360ONE',name:'360 ONE WAM'},
  {symbol:'IIFL',name:'IIFL Finance'},{symbol:'MOTILALOFS',name:'Motilal Oswal Financial'},
  {symbol:'GEOJITFSL',name:'Geojit Financial Services'},{symbol:'EDELWEISS',name:'Edelweiss Financial Services'},
  {symbol:'IIFLWAM',name:'IIFL Wealth Management'},{symbol:'ZENTEC',name:'Zen Technologies'},
  {symbol:'DATAPATTNS',name:'Data Patterns India'},{symbol:'BHEL',name:'BHEL'},
  {symbol:'GPIL',name:'Godawari Power & Ispat'},{symbol:'RATNAMANI',name:'Ratnamani Metals'},
  {symbol:'WELSPUNIND',name:'Welspun India'},{symbol:'TRIDENT',name:'Trident Limited'},
  {symbol:'ALOKTEXT',name:'Alok Industries'},{symbol:'VARDHMAN',name:'Vardhman Textiles'},
  {symbol:'RAYMOND',name:'Raymond Limited'},{symbol:'VMART',name:'V-Mart Retail'},
  {symbol:'SHOPERSTOP',name:'Shoppers Stop'},{symbol:'TRENT',name:'Trent (Tata Retail)'},
  {symbol:'CENTRALBK',name:'Central Bank of India'},{symbol:'BANKBARODA',name:'Bank of Baroda'},
  {symbol:'BANKINDIA',name:'Bank of India'},{symbol:'MAHABANK',name:'Bank of Maharashtra'},
  {symbol:'IOB',name:'Indian Overseas Bank'},{symbol:'CANBK',name:'Canara Bank'},
  {symbol:'UCOBANK',name:'UCO Bank'},{symbol:'UNIONBANK',name:'Union Bank of India'},
  {symbol:'PNB',name:'Punjab National Bank'},{symbol:'ALLAHABAD',name:'Allahabad Bank'},
  {symbol:'SYNDIBANK',name:'Syndicate Bank'},{symbol:'ANDHRABANK',name:'Andhra Bank'},
  {symbol:'CORPBANK',name:'Corporation Bank'},{symbol:'ORIENTBNK',name:'Oriental Bank of Commerce'},
  {symbol:'DENABANK',name:'Dena Bank'},{symbol:'VIJAYABANK',name:'Vijaya Bank'},
  {symbol:'RECLTD',name:'REC Limited'},{symbol:'IRFC',name:'Indian Railway Finance Corp'},
  {symbol:'HUDCO',name:'Housing & Urban Development'},{symbol:'NABARD',name:'NABARD'},
  {symbol:'NHB',name:'National Housing Bank'},{symbol:'SIDBI',name:'SIDBI'},
  {symbol:'MMTC',name:'MMTC Limited'},{symbol:'MSTCLTD',name:'MSTC Limited'},
  {symbol:'RITES',name:'RITES Limited'},{symbol:'RAILTEL',name:'RailTel Corporation'},
  {symbol:'BEML',name:'BEML Limited'},{symbol:'MIDHANI',name:'Mishra Dhatu Nigam'},
  {symbol:'MOIL',name:'MOIL Limited'},{symbol:'KIOCL',name:'KIOCL Limited'},
  {symbol:'NLCINDIA',name:'NLC India'},{symbol:'SJVN',name:'SJVN Limited'},
  {symbol:'NPCIL',name:'Nuclear Power Corporation'},{symbol:'BHAVISHYA',name:'Bhavishya Finance'},
  {symbol:'PCJEWELLER',name:'PC Jeweller'},{symbol:'KALYANKJIL',name:'Kalyan Jewellers'},
  {symbol:'SENCO',name:'Senco Gold'},{symbol:'RAJESHEXPO',name:'Rajesh Exports'},
  {symbol:'TBZ',name:'Tribhovandas Bhimji Zaveri'},{symbol:'MOTISONS',name:'Motisons Jewellers'},
  {symbol:'TITAN',name:'Titan Company'},{symbol:'MANYAVAR',name:'Vedant Fashions (Manyavar)'},
  {symbol:'BATA',name:'Bata India'},{symbol:'LIBERTY',name:'Liberty Shoes'},
  {symbol:'KANSAINER',name:'Kansai Nerolac Paints'},{symbol:'BERGER',name:'Berger Paints'},
  {symbol:'AKZONOBEL',name:'AkzoNobel India'},{symbol:'INDIGO',name:'IndiGo (InterGlobe Aviation)'},
  {symbol:'SPICEJET',name:'SpiceJet'},{symbol:'AIRINDIA',name:'Air India (Tata)'},
  {symbol:'BLUEDART',name:'Blue Dart Express'},{symbol:'GATI',name:'Gati Limited'},
  {symbol:'TCI',name:'Transport Corporation of India'},{symbol:'MAHLOG',name:'Mahindra Logistics'},
  {symbol:'DELHIVERY',name:'Delhivery'},{symbol:'XPRESSBEES',name:'XpressBees'},
  {symbol:'ECOMEXPRESS',name:'Ecom Express'},{symbol:'FIRSTCRY',name:'FirstCry (Brainbees Solutions)'},
  {symbol:'SWIGGY',name:'Swiggy (Bundl Technologies)'},{symbol:'OYO',name:'OYO Rooms'},
  {symbol:'NYKAA',name:'Nykaa (FSN E-Commerce)'},{symbol:'MEESHO',name:'Meesho'},
  {symbol:'SNAPDEAL',name:'Snapdeal'},{symbol:'FLIPKART',name:'Flipkart'},
  {symbol:'WAKEFIT',name:'Wakefit Solutions'},{symbol:'PRISTYN',name:'Pristyn Care'},
  {symbol:'PHARMEASY',name:'PharmEasy (API Holdings)'},{symbol:'1MG',name:'1mg (Tata 1mg)'},
  {symbol:'MEDIBUDDY',name:'MediBuddy (DOC Online)'},{symbol:'PRACTO',name:'Practo'},
  {symbol:'NETMEDS',name:'Netmeds'},{symbol:'NARAYANA',name:'Narayana Hrudayalaya'},
  {symbol:'RAINBOW',name:'Rainbow Childrens Medicare'},{symbol:'KRSNAA',name:'Krsnaa Diagnostics'},
  {symbol:'METROPOLIS',name:'Metropolis Healthcare'},{symbol:'LALPATHLAB',name:'Dr. Lal PathLabs'},
  {symbol:'THYROCARE',name:'Thyrocare Technologies'},{symbol:'VIJAYADIAG',name:'Vijaya Diagnostics Centre'},
  {symbol:'SUVENPHAR',name:'Suven Pharmaceuticals'},{symbol:'SOLARA',name:'Solara Active Pharma Sciences'},
  {symbol:'NEULANDLAB',name:'Neuland Laboratories'},{symbol:'SEQUENT',name:'SeQuent Scientific'},
  {symbol:'SUDARSCHEM',name:'Sudarshan Chemical'},{symbol:'ROSSARI',name:'Rossari Biotech'},
  {symbol:'ASTRAL',name:'Astral Limited'},{symbol:'FINOLEX',name:'Finolex Industries'},
  {symbol:'SUPREMEIND',name:'Supreme Industries'},{symbol:'TIME',name:'Time Technoplast'},
  {symbol:'MOLD-TEK',name:'Mold-Tek Packaging'},{symbol:'UFLEX',name:'UFlex Limited'},
  {symbol:'HUHTAMAKI',name:'Huhtamaki India'},{symbol:'MANJUSHREE',name:'Manjushree Technopack'},
  {symbol:'GUJFLUORO',name:'Gujarat Fluorochemicals'},{symbol:'NFIL',name:'Navin Fluorine International'},
  {symbol:'PRINCEPIPE',name:'Prince Pipes'},{symbol:'VETO',name:'Veto Switchgears & Cables'},
  {symbol:'REMSONS',name:'Remsons Industries'},{symbol:'KPRMILL',name:'KPR Mill'},
  {symbol:'GOKEX',name:'Gokaldas Exports'},{symbol:'PAGEIND',name:'Page Industries (Jockey)'},
  {symbol:'NILAINFRA',name:'Nila Infrastructures'},{symbol:'RTNPOWER',name:'Rattanindia Power'},
  {symbol:'ADANIGAS',name:'Adani Total Gas'},{symbol:'AEGASIND',name:'AEG Gas India'},
  {symbol:'GULSHAN',name:'Gulshan Polyols'},{symbol:'AGROPHOS',name:'Agi Infra'},
  {symbol:'SUNFLAG',name:'Sunflag Iron and Steel'},{symbol:'JSPL',name:'Jindal Steel and Power'},
  {symbol:'JINDALSAW',name:'Jindal Saw'},{symbol:'WELCORP',name:'Welspun Corp'},
  {symbol:'APL',name:'APL Apollo Tubes'},{symbol:'MANINFRA',name:'Man Infraconstruction'},
  {symbol:'GPIL',name:'Godawari Power'},{symbol:'SYNGAS',name:'Syngas'},
  {symbol:'IGPL',name:'IG Petrochemicals'},{symbol:'VINDHYATEL',name:'Vindhya Telelinks'},
  {symbol:'OPTIEMUS',name:'Optiemus Infracom'},{symbol:'CELLECOR',name:'Cellecor Gadgets'},
  {symbol:'ONWARDTEC',name:'Onward Technologies'},{symbol:'SAKSOFT',name:'Saksoft'},
  {symbol:'INTELLECT',name:'Intellect Design Arena'},{symbol:'RATEGAIN',name:'RateGain Travel Technologies'},
  {symbol:'BSOFT',name:'BTST Services (Birlasoft)'},{symbol:'BIRLASOFT',name:'Birlasoft'},
  {symbol:'HEXAWARE',name:'Hexaware Technologies'},{symbol:'MASTEK',name:'Mastek'},
  {symbol:'NIITLTD',name:'NIIT Limited'},{symbol:'ECLERX',name:'eClerx Services'},
  {symbol:'DATAMATICS',name:'Datamatics Global Services'},{symbol:'KSOLVES',name:'Ksolves India'},
  {symbol:'PGIL',name:'PG Electroplast'},{symbol:'KAYNES',name:'Kaynes Technology India'},
  {symbol:'SYRMA',name:'Syrma SGS Technology'},{symbol:'AVALON',name:'Avalon Technologies'},
  {symbol:'AMBER',name:'Amber Enterprises India'},{symbol:'VIMTALABS',name:'Vimta Labs'},
  {symbol:'NTEST',name:'Navin Fluorine'},{symbol:'CAMPUS',name:'Campus Activewear'},
  {symbol:'METROBRAND',name:'Metro Brands'},{symbol:'RELAXO',name:'Relaxo Footwears'},
  {symbol:'BATAINDIA',name:'Bata India'},{symbol:'KHADIM',name:'Khadim India'},
  {symbol:'MANYAVAR',name:'Vedant Fashions'},{symbol:'ARVINDFASN',name:'Arvind Fashions'},
  {symbol:'LILLADHER',name:'Prabhudas Lilladher'},{symbol:'BRDL',name:'Bombay Rayon Fashions'},
  {symbol:'GOKALDAS',name:'Gokaldas Exports'},{symbol:'WELSPUNIND',name:'Welspun India'},
  {symbol:'VARDHMAN',name:'Vardhman Textiles'},{symbol:'SPORTKING',name:'Sportking India'},
  {symbol:'NITIN',name:'Nitin Spinners'},{symbol:'RSWM',name:'RSWM Limited'},
  {symbol:'SUTLEJ',name:'Sutlej Textiles'},{symbol:'SANGAMIND',name:'Sangam India'},
];

const formatRupee = (v) => v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
const formatLargeNum = (v) => {
  if (!v) return '—';
  if (v >= 1e12) return `₹${(v/1e12).toFixed(2)}T`;
  if (v >= 1e7)  return `₹${(v/1e7).toFixed(2)}Cr`;
  if (v >= 1e5)  return `₹${(v/1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN')}`;
};
const fmtVol = (v) => {
  if (!v) return '—';
  if (v >= 1e7) return `${(v/1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `${(v/1e5).toFixed(2)}L`;
  return v.toLocaleString('en-IN');
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem' }}>
      <div style={{ color: '#8899b4', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontWeight: '700', color: '#f0f6ff' }}>{formatRupee(payload[0].value)}</div>
    </div>
  );
};

// ─── Market Pulse ─────────────────────────────────────────────────────────────
function MarketPulse({ mode }) {
  const [movers, setMovers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moverTab, setMoverTab] = useState('gainers');

  useEffect(() => {
    api.get('/market/movers')
      .then(r => setMovers(r.data))
      .catch(() => setMovers(null))
      .finally(() => setLoading(false));
  }, []);

  const modeColor = mode === 'investor' ? '#10b981' : '#3b82f6';

  const MOVER_TABS = [
    { id: 'gainers', label: '▲ Top Gainers', color: '#10b981' },
    { id: 'losers',  label: '▼ Top Losers',  color: '#f43f5e' },
    { id: 'volume',  label: '◈ Top Volume',  color: '#8b5cf6' },
  ];

  const fmtVol = (v) => {
    if (!v) return '—';
    if (v >= 1e7) return `${(v/1e7).toFixed(2)}Cr`;
    if (v >= 1e5) return `${(v/1e5).toFixed(1)}L`;
    return `${(v/1e3).toFixed(0)}K`;
  };

  const activeList = moverTab === 'gainers' ? movers?.gainers :
                     moverTab === 'losers'  ? movers?.losers  :
                     movers?.volume_leaders;

  const featureCards = mode === 'investor'
    ? [
        { icon: '🤖', label: 'AI Analysis', desc: 'Bull/Bear thesis', accent: '#10b981' },
        { icon: '📐', label: 'Fundamentals', desc: 'P/E, ROE, Growth', accent: '#3b82f6' },
        { icon: '⭐', label: 'Watchlist', desc: 'Track your picks', accent: '#f59e0b' },
        { icon: '🔊', label: 'Volume Leaders', desc: 'Institutional flow', accent: '#8b5cf6' },
      ]
    : [
        { icon: '⚡', label: 'AI Signals', desc: 'Entry & SL zones', accent: '#3b82f6' },
        { icon: '📊', label: 'Technicals', desc: 'RSI, MACD, Bands', accent: '#8b5cf6' },
        { icon: '⭐', label: 'Watchlist', desc: 'Track your picks', accent: '#f59e0b' },
        { icon: '🔊', label: 'Volume Leaders', desc: 'Institutional flow', accent: '#10b981' },
      ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="fade-in">

      {/* ── Hero banner ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: mode === 'investor'
          ? 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.05) 40%, rgba(0,0,0,0) 70%)'
          : 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(29,78,216,0.05) 40%, rgba(0,0,0,0) 70%)',
        border: `1px solid ${modeColor}28`,
        borderRadius: '16px',
        padding: '28px 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '32px', position:'relative', zIndex:1 }}>

          {/* Left: headline */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Live badge */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', background: `${modeColor}12`, border:`1px solid ${modeColor}30`, borderRadius:'20px', padding:'4px 12px', marginBottom:'14px' }}>
              <div className="pulse-dot" style={{ background: modeColor, width:'6px', height:'6px' }}/>
              <span style={{ fontSize:'0.72rem', color: modeColor, fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                {mode === 'investor' ? 'Investment Mode · NSE Live' : 'Trading Mode · NSE Live'}
              </span>
            </div>

            <h2 style={{ fontSize:'1.75rem', fontWeight:'800', color:'#f0f6ff', margin:'0 0 10px 0', letterSpacing:'-0.5px', lineHeight:'1.2' }}>
              {mode === 'investor' ? 'Research. Invest. Grow.' : 'Signal. Entry. Profit.'}
            </h2>
            <p style={{ color:'#64748b', fontSize:'0.88rem', margin:0, lineHeight:'1.65', maxWidth:'460px' }}>
              {mode === 'investor'
                ? 'Search any NSE/BSE stock for deep fundamentals, P/E valuation, fair value estimate & AI-powered investment thesis.'
                : 'Search any NSE stock for real-time entry zone, stop-loss, target price, technicals & F&O options flow analysis.'}
            </p>
          </div>

          {/* Right: 2×2 feature cards */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', flexShrink:0 }}>
            {featureCards.map(({ icon, label, desc, accent }) => (
              <div key={label} style={{
                background:'rgba(255,255,255,0.03)',
                border:`1px solid rgba(255,255,255,0.07)`,
                borderRadius:'12px', padding:'14px 16px',
                minWidth:'130px', transition:'all 0.2s',
                cursor:'default',
              }}
              onMouseOver={e => { e.currentTarget.style.background=`${accent}10`; e.currentTarget.style.borderColor=`${accent}30`; }}
              onMouseOut={e => { e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                  <span style={{ fontSize:'1rem', lineHeight:'1' }}>{icon}</span>
                  <span style={{ fontWeight:'700', fontSize:'0.82rem', color:'#e2e8f0' }}>{label}</span>
                </div>
                <div style={{ fontSize:'0.7rem', color:'#64748b', lineHeight:'1.4' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Movers with 3 tabs */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Panel header + tabs */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px 0', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', paddingBottom:'12px' }}>
            <div style={{ width:'3px', height:'18px', borderRadius:'2px', background:'linear-gradient(180deg,#10b981,#3b82f6)' }}/>
            <span style={{ fontWeight:'700', fontSize:'0.88rem', color:'#e2e8f0' }}>Market Pulse</span>
            <span style={{ fontSize:'0.7rem', color:'#64748b', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'6px', padding:'2px 8px' }}>Nifty 50</span>
          </div>
          <div style={{ display:'flex', gap:'2px', paddingBottom:'12px' }}>
            {MOVER_TABS.map(t => (
              <button key={t.id} onClick={() => setMoverTab(t.id)}
                style={{ padding:'6px 16px', background: moverTab === t.id ? `${t.color}15` : 'transparent', border: moverTab === t.id ? `1px solid ${t.color}35` : '1px solid transparent', borderRadius:'8px', color: moverTab === t.id ? t.color : '#64748b', fontSize:'0.78rem', fontWeight: moverTab === t.id ? '700' : '500', cursor:'pointer', transition:'all 0.18s', letterSpacing:'0.01em' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab hint */}
        {moverTab === 'volume' && (
          <div style={{ padding: '8px 16px', background: 'rgba(139,92,246,0.06)', borderBottom: '1px solid rgba(139,92,246,0.12)', fontSize: '0.72rem', color: '#a78bfa' }}>
            🔊 High volume = institutional buying/selling activity. Big players are moving these stocks today.
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '14px 16px' }}>
          {loading ? (
            [1,2,3,4,5].map(i => <div key={i} className="shimmer-box" style={{ height: '38px', marginBottom: '6px' }} />)
          ) : activeList?.length > 0 ? (
            activeList.map((s, i) => (
              moverTab === 'volume'
                ? <VolumeRow key={i} stock={s} fmtVol={fmtVol} />
                : <MoverRow key={i} stock={s} isPositive={moverTab === 'gainers'} />
            ))
          ) : (
            <div style={{ color: '#8899b4', fontSize: '0.82rem', padding: '20px 0', textAlign: 'center' }}>No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}

function VolumeRow({ stock, fmtVol }) {
  const pctColor = stock.percent_change >= 0 ? '#10b981' : '#f43f5e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', marginBottom: '4px', background: 'rgba(139,92,246,0.05)' }}
      onMouseOver={e => e.currentTarget.style.background = 'rgba(139,92,246,0.1)'}
      onMouseOut={e => e.currentTarget.style.background = 'rgba(139,92,246,0.05)'}>
      <div>
        <div style={{ fontWeight: '700', fontSize: '0.85rem', fontFamily: 'monospace' }}>{stock.symbol}</div>
        <div style={{ fontSize: '0.72rem', color: '#8899b4' }}>₹{Number(stock.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#8b5cf6' }}>Vol: {fmtVol(stock.volume)}</div>
        <div style={{ fontSize: '0.72rem', color: pctColor, fontWeight: '600' }}>
          {stock.percent_change >= 0 ? '+' : ''}{stock.percent_change?.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function MoverRow({ stock, isPositive }) {
  const color = isPositive ? '#10b981' : '#f43f5e';
  const bg = isPositive ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', marginBottom: '4px', background: bg }}
      onMouseOver={e => e.currentTarget.style.background = isPositive ? 'rgba(16,185,129,0.11)' : 'rgba(244,63,94,0.11)'}
      onMouseOut={e => e.currentTarget.style.background = bg}>
      <div>
        <div style={{ fontWeight: '700', fontSize: '0.85rem', fontFamily: 'monospace', letterSpacing: '0.02em' }}>{stock.symbol}</div>
        <div style={{ fontSize: '0.72rem', color: '#8899b4' }}>₹{Number(stock.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
      </div>
      <div style={{ fontWeight: '700', fontSize: '0.88rem', color, display: 'flex', alignItems: 'center', gap: '3px' }}>
        {isPositive ? '▲' : '▼'} {Math.abs(stock.percent_change).toFixed(2)}%
      </div>
    </div>
  );
}

function StockHeader({ stock, mode, formatRupee, onAddToWatchlist, isInWatchlist }) {
  const modeColor = mode === 'investor' ? '#10b981' : '#3b82f6';
  const isUp = stock.change >= 0;
  const displayName = stock.company_name || stock.symbol.replace('.NS','').replace('.BO','');
  const sector = stock.sector && stock.sector !== 'N/A' ? stock.sector : '';
  const industry = stock.industry && stock.industry !== 'N/A' ? stock.industry : '';
  const subtitle = sector || industry ? `${sector}${sector && industry ? ' · ' : ''}${industry}` : null;

  return (
    <div className="glass-panel fade-in" style={{ padding: '20px 26px', borderLeft: `4px solid ${modeColor}`, background: `linear-gradient(90deg, ${modeColor}08 0%, transparent 40%)` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: '800', letterSpacing: '-1px' }}>
              {stock.symbol.replace('.NS','').replace('.BO','')}
            </h1>
            <span style={{ background: `${modeColor}20`, color: modeColor, padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
              {mode === 'investor' ? 'INVEST' : 'TRADE'}
            </span>
            <span style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>NSE EQ</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.7rem', color: '#8899b4' }}>
              <span className="pulse-dot" style={{ width: '5px', height: '5px', background: '#10b981' }} /> LIVE
            </span>
            {/* Star/Watchlist button */}
            <button
              onClick={onAddToWatchlist}
              title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
              style={{
                background: isInWatchlist ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isInWatchlist ? '#f59e0b' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: '6px', padding: '3px 10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '0.75rem', fontWeight: '600',
                color: isInWatchlist ? '#f59e0b' : '#8899b4',
                transition: 'all 0.2s'
              }}>
              <Star size={12} fill={isInWatchlist ? '#f59e0b' : 'none'} />
              {isInWatchlist ? 'Watching' : 'Watchlist'}
            </button>
          </div>
          {displayName && displayName !== stock.symbol.replace('.NS','') && (
            <div style={{ color: '#c8d8f0', fontSize: '0.88rem', fontWeight: '500', marginBottom: '2px' }}>{displayName}</div>
          )}
          {subtitle && (
            <div style={{ color: '#8899b4', fontSize: '0.78rem' }}>{subtitle}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.4rem', fontWeight: '800', letterSpacing: '-1.5px', color: '#f0f6ff', lineHeight: 1 }}>
            {formatRupee(stock.price)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '4px', fontWeight: '700', color: isUp ? '#10b981' : '#f43f5e', fontSize: '1rem' }}>
            {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {stock.change > 0 ? '+' : ''}{formatRupee(stock.change)} ({stock.percent_change?.toFixed(2)}%)
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        {[
          { l: 'Open',       v: formatRupee(stock.open) },
          { l: 'Prev Close', v: formatRupee(stock.prev_close) },
          { l: 'Day High',   v: formatRupee(stock.day_high),            c: '#10b981' },
          { l: 'Day Low',    v: formatRupee(stock.day_low),             c: '#f43f5e' },
          { l: '52W High',   v: formatRupee(stock.fifty_two_week_high), c: '#10b981' },
          { l: '52W Low',    v: formatRupee(stock.fifty_two_week_low),  c: '#f43f5e' },
          { l: 'Volume',     v: fmtVol(stock.volume) },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ flex: '1 0 90px', padding: '0 16px 0 0' }}>
            <div style={{ fontSize: '0.66rem', color: '#8899b4', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>{l}</div>
            <div style={{ fontWeight: '700', fontSize: '0.87rem', color: c || '#f0f6ff' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { mode } = useMode();
  const [query, setQuery] = useState(()=>{ try{ const s=sessionStorage.getItem('last_stock'); return s?JSON.parse(s)?.symbol||'':''; }catch{return '';} });
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [hlIdx, setHlIdx] = useState(-1);
  const [stock, setStock] = useState(()=>{ try{ const s=sessionStorage.getItem('last_stock'); return s?JSON.parse(s):null; }catch{return null;} });
  const [news, setNews] = useState(()=>{ try{ const s=sessionStorage.getItem('last_news'); return s?JSON.parse(s):[]; }catch{return [];} });
  const [optionsData, setOptionsData] = useState(()=>{ try{ const s=sessionStorage.getItem('last_options'); return s?JSON.parse(s):null; }catch{return null;} });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [chartData, setChartData] = useState(()=>{ try{ const s=sessionStorage.getItem('last_chart'); return s?JSON.parse(s):[]; }catch{return [];} });
  const [chartLoading, setChartLoading] = useState(false);
  const [thesis, setThesis] = useState(()=>{ try{ return sessionStorage.getItem('last_thesis')||''; }catch{return '';} });
  const [thesisLoading, setThesisLoading] = useState(false);
  const [thesisError, setThesisError] = useState('');
  const [livePrice, setLivePrice] = useState(null);
  const livePollRef = React.useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activePeriod, setActivePeriod] = useState('1mo');
  const [holdingDays, setHoldingDays] = useState(365);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const searchRef = useRef(null);

  // Load watchlist
  useEffect(() => {
    api.get('/watchlist/').then(r => {
      const wl = r.data.watchlist || r.data || [];
      setWatchlist(wl.map(w => (w.symbol || '').replace('.NS','').replace('.BO','')));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    setThesis(''); setThesisError('');
    // Clear search when switching modes so results don't carry over
    setQuery(''); setStock(null); setNews([]); setChartData([]); setOptionsData(null); setError(''); setThesis(''); setThesisError('');
    try{
      ['last_stock','last_thesis','last_news','last_chart','last_options'].forEach(k=>sessionStorage.removeItem(k));
    }catch{}
    if (stock) {
      const p = mode === 'investor' ? '1y' : '1mo';
      setActivePeriod(p);
      fetchChart(stock.symbol, p);
    }
  }, [mode]);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val.replace(/\.NS$/i, '').replace(/\.BO$/i, ''));
    if (val.length > 0) {
      const q = val.toLowerCase().replace(/\.ns$/i, '');
      const filtered = NSE_STOCKS.filter(s =>
        s.symbol.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q)
      ).slice(0, 8);
      setSuggestions(filtered);
      setShowSugg(true);
    } else { setSuggestions([]); setShowSugg(false); }
  };

  const fetchChart = async (symbol, period) => {
    setChartLoading(true);
    try {
      const res = await api.get(`/market/history/${symbol}`, { params: { period } });
      const hist = res.data.history || [];
      setChartData(hist);
      try{ sessionStorage.setItem('last_chart', JSON.stringify(hist)); }catch{}
    } catch { setChartData([]); } finally { setChartLoading(false); }
  };

  const fetchAll = async (symbol) => {
    setLoading(true); setError(''); setStock(null); setNews([]); setOptionsData(null);
    setChartData([]); setThesis(''); setThesisError('');
    const ticker = symbol.replace(/\.NS$/i, '').replace(/\.BO$/i, '').toUpperCase();
    try {
      const [qRes, nRes] = await Promise.all([
        api.get(`/market/quote/${ticker}`),
        api.get(`/market/news/${ticker}`),
      ]);
      setStock(qRes.data);
      try{ sessionStorage.setItem('last_stock', JSON.stringify(qRes.data)); }catch{}
      const newsData = nRes.data.news || [];
      setNews(newsData);
      try{ sessionStorage.setItem('last_news', JSON.stringify(newsData)); }catch{}
      const p = mode === 'investor' ? '1y' : '1mo';
      setActivePeriod(p);
      fetchChart(ticker, p);
      setOptionsLoading(true);
      api.get(`/market/options/${ticker}`).then(r => { setOptionsData(r.data); try{ sessionStorage.setItem('last_options', JSON.stringify(r.data)); }catch{} }).catch(() => setOptionsData(null)).finally(() => setOptionsLoading(false));
    } catch {
      setError(`Could not find "${symbol}". Try the exact NSE ticker (e.g. RELIANCE, TCS, INFY).`);
    } finally { setLoading(false); }
  };

  const handleSubmit = (e) => { e.preventDefault(); if (query.trim()) { setShowSugg(false); fetchAll(query.trim()); } };
  const selectSugg = (sym) => { setQuery(sym); setShowSugg(false); fetchAll(sym); };
  const changePeriod = (p) => { if (!stock) return; setActivePeriod(p); fetchChart(stock.symbol, p); };

  // ── Live price polling every 15s when a stock is loaded ─────────────────────
  useEffect(() => {
    if (!stock) { setLivePrice(null); return; }
    setLivePrice(stock.price); // seed immediately
    const sym = stock.symbol.replace(/\.NS$/i,'').replace(/\.BO$/i,'').toUpperCase();
    const poll = async () => {
      try {
        const r = await api.get(`/market/quote/${sym}`);
        if (r.data?.price) setLivePrice(r.data.price);
      } catch {}
    };
    livePollRef.current = setInterval(poll, 15000);
    return () => clearInterval(livePollRef.current);
  }, [stock?.symbol]);

  const loadThesis = async (days) => {
    if (!stock) return;
    setThesisLoading(true); setThesisError(''); setThesis('');
    try {
      const params = { mode };
      if (mode === 'investor' && days) params.holding_days = days;
      const res = await api.get(`/ai/thesis/${stock.symbol}`, { params });
      setThesis(res.data.thesis);
    } catch (e) {
      setThesisError(e.response?.data?.detail || 'AI service unavailable. Check GROQ_API_KEY in backend .env');
    } finally { setThesisLoading(false); }
  };

  const handleAddToWatchlist = async () => {
    if (!stock) return;
    const sym = stock.symbol.replace('.NS','').replace('.BO','');
    const isIn = watchlist.includes(sym);
    try {
      if (isIn) {
        await api.delete(`/watchlist/remove/${sym}`);
        setWatchlist(prev => prev.filter(s => s !== sym));
      } else {
        await api.post('/watchlist/add', { symbol: sym, name: stock.company_name || sym });
        setWatchlist(prev => [...prev, sym]);
      }
    } catch(e) { console.error('Watchlist error', e); }
  };

  const handleWatchlistSelect = (sym) => { setQuery(sym); fetchAll(sym); };
  const modeColor = mode === 'investor' ? '#10b981' : '#3b82f6';
  const modeLabel = mode === 'investor' ? '💼 Investment Mode' : '📈 Trading Mode';
  const currentSym = stock ? stock.symbol.replace('.NS','').replace('.BO','') : '';
  const isInWatchlist = watchlist.includes(currentSym);

  const sharedProps = { stock, chartData, chartLoading, news, optionsData, optionsLoading, activePeriod, changePeriod, thesis, thesisLoading, thesisError, loadThesis, formatRupee, formatLargeNum, fmtVol, CustomTooltip, holdingDays, setHoldingDays, livePrice };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* Search Panel */}
      <div className="glass-panel" style={{ padding: '18px 22px', borderTop: `3px solid ${modeColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '0.95rem', color: '#8899b4', fontWeight: '500' }}>
            <span style={{ color: modeColor, fontWeight: '700' }}>{modeLabel}</span>
            {mode === 'investor' ? ' — Fundamentals, valuation & holding-period thesis' : ' — Entry signals, technicals & stop loss'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#8899b4', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <span className="pulse-dot" style={{ width: '5px', height: '5px' }} /> 🇮🇳 NSE Equities Live
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', display: 'flex', gap: '10px' }} ref={searchRef}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                value={query}
                onChange={handleQueryChange}
                onFocus={() => query.length > 0 && setShowSugg(true)}
                onKeyDown={e => {
                  if (!showSugg || suggestions.length === 0) return;
                  if (e.key === 'ArrowDown') { e.preventDefault(); setHlIdx(i => Math.min(i + 1, suggestions.length - 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setHlIdx(i => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter' && hlIdx >= 0) { e.preventDefault(); selectSugg(suggestions[hlIdx].symbol); setHlIdx(-1); }
                  else if (e.key === 'Escape') { setShowSugg(false); setHlIdx(-1); }
                }}
                placeholder={mode === 'investor'
                  ? 'Search NSE stock — type name or symbol (e.g. TCS, Infosys, HDFC Bank)'
                  : 'Search NSE stock for trading signals (e.g. RELIANCE, Tata Motors)'}
                style={{ paddingLeft: '42px', paddingRight: stock ? '80px' : '16px', borderColor: showSugg ? modeColor : undefined }}
              />
              <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8899b4' }} />
              {/* Clear button — shows when stock is searched */}
              {stock && (
                <button onClick={()=>{ setQuery(''); setStock(null); setNews([]); setChartData([]); setOptionsData(null); setError(''); setThesis(''); setThesisError(''); setSuggestions([]); setShowSugg(false); try{['last_stock','last_thesis','last_news','last_chart','last_options'].forEach(k=>sessionStorage.removeItem(k));}catch{} }}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', padding: '3px 10px', fontSize: '0.72rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}
                  onMouseOver={e=>e.currentTarget.style.background='rgba(239,68,68,0.12)'}
                  onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}>
                  ✕ Clear
                </button>
              )}
              {showSugg && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '48px', left: 0, right: 0, background: '#0f1623', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', overflow: 'hidden', zIndex: 1000, boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
                  {suggestions.map((s, i) => (
                    <div key={i} onMouseDown={() => { selectSugg(s.symbol); setHlIdx(-1); }}
                      onMouseEnter={() => setHlIdx(i)}
                      style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.12s', background: hlIdx === i ? `${modeColor}20` : 'transparent', borderLeft: hlIdx === i ? `3px solid ${modeColor}` : '3px solid transparent' }}>
                      <div>
                        <span style={{ fontWeight: '700', fontFamily: 'monospace', fontSize: '0.88rem', marginRight: '10px' }}>{s.symbol}</span>
                        <span style={{ color: '#8899b4', fontSize: '0.8rem' }}>{s.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {watchlist.includes(s.symbol) && <Star size={11} fill="#f59e0b" color="#f59e0b" />}
                        <span style={{ fontSize: '0.68rem', color: modeColor, background: `${modeColor}15`, padding: '2px 7px', borderRadius: '4px', fontWeight: '600' }}>NSE</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.7rem', color: '#8899b4', background: 'rgba(0,0,0,0.25)' }}>
                    💡 Just type a name or symbol — no need to add .NS
                  </div>
                </div>
              )}
            </div>
            <button type="submit" disabled={loading}
              style={{ whiteSpace: 'nowrap', height: '45px', padding: '0 26px', background: `linear-gradient(135deg, ${modeColor}, ${mode === 'investor' ? '#059669' : '#1d4ed8'})`, border: 'none', borderRadius: '9px', color: 'white', fontWeight: '700', fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: `0 4px 20px ${modeColor}40` }}>
              {loading ? <><span className="spinner" style={{ marginRight: '8px', verticalAlign: 'middle', width: '13px', height: '13px' }} />Searching...</> : '🔍 Analyze'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#f87171', padding: '12px 18px', borderRadius: '10px', fontSize: '0.87rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertTriangle size={15} />{error}
        </div>
      )}

      {loading && (
        <div className="glass-panel fade-in" style={{ padding: '30px', textAlign: 'center' }}>
          <div className="spinner" style={{ width: '24px', height: '24px', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '0.88rem', color: '#8899b4' }}>Fetching live market data...</div>
        </div>
      )}

      {!stock && !loading && <MarketPulse mode={mode} />}

      {stock && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <StockHeader stock={stock} mode={mode} formatRupee={formatRupee} onAddToWatchlist={handleAddToWatchlist} isInWatchlist={isInWatchlist} />
          {mode === 'trader' ? <TraderView {...sharedProps} /> : <InvestorView {...sharedProps} />}
        </div>
      )}

      {/* Watchlist */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: watchlistOpen ? '1px solid var(--border-color)' : 'none' }}
          onClick={() => setWatchlistOpen(!watchlistOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Star size={16} color="#f59e0b" fill="#f59e0b" />
            <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>My Watchlist</span>
            <span style={{ fontSize: '0.72rem', color: '#8899b4' }}>— Click to {watchlistOpen ? 'collapse' : 'expand'}</span>
          </div>
          {watchlistOpen ? <ChevronUp size={16} color="#8899b4" /> : <ChevronDown size={16} color="#8899b4" />}
        </div>
        {watchlistOpen && (
          <div style={{ padding: '16px 20px' }}>
            <WatchlistPanel onSelectStock={handleWatchlistSelect} currentSymbol={stock ? stock.symbol : null} inline={true} />
          </div>
        )}
      </div>
    </div>
  );
}