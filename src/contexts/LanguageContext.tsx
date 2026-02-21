import { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'hi' | 'gu';

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
    gu: string;
  };
}

const translations: Translations = {
  appName: { en: 'KisanMandi', hi: 'किसान मंडी', gu: 'કિસાન મંડી' },
  welcome: { en: 'Welcome', hi: 'स्वागत है', gu: 'સ્વાગત છે' },
  login: { en: 'Login', hi: 'लॉगिन', gu: 'લોગિન' },
  signup: { en: 'Sign Up', hi: 'साइन अप', gu: 'સાઇન અપ' },
  logout: { en: 'Logout', hi: 'लॉग आउट', gu: 'લૉગઆઉટ' },
  mobileNumber: { en: 'Mobile Number', hi: 'मोबाइल नंबर', gu: 'મોબાઇલ નંબર' },
  password: { en: 'Password', hi: 'पासवर्ड', gu: 'પાસવર્ડ' },
  confirmPassword: { en: 'Confirm Password', hi: 'पासवर्ड की पुष्टि करें', gu: 'પાસવર્ડની પુષ્ટિ કરો' },
  fullName: { en: 'Full Name', hi: 'पूरा नाम', gu: 'પૂરું નામ' },
  state: { en: 'State', hi: 'राज्य', gu: 'રાજ્ય' },
  district: { en: 'District', hi: 'जिला', gu: 'જિલ્લો' },
  village: { en: 'Village', hi: 'गाँव', gu: 'ગામ' },
  role: { en: 'Role', hi: 'भूमिका', gu: 'ભૂમિકા' },
  farmer: { en: 'Farmer', hi: 'किसान', gu: 'ખેડૂત' },
  buyer: { en: 'Buyer', hi: 'खरीदार', gu: 'ખરીદદાર' },
  dashboard: { en: 'Dashboard', hi: 'डैशबोर्ड', gu: 'ડેશબોર્ડ' },
  myListings: { en: 'My Listings', hi: 'मेरी लिस्टिंग', gu: 'મારી લિસ્ટિંગ' },
  addListing: { en: 'Add Listing', hi: 'लिस्टिंग जोड़ें', gu: 'લિસ્ટિંગ ઉમેરો' },
  searchCrops: { en: 'Search Crops', hi: 'फसल खोजें', gu: 'પાક શોધો' },
  mandiPrices: { en: 'Mandi Prices', hi: 'मंडी भाव', gu: 'મંડી ભાવ' },
  cropName: { en: 'Crop Name', hi: 'फसल का नाम', gu: 'પાકનું નામ' },
  quantity: { en: 'Quantity', hi: 'मात्रा', gu: 'જથ્થો' },
  expectedPrice: { en: 'Expected Price', hi: 'अपेक्षित मूल्य', gu: 'અપેક્ષિત કિંમત' },
  location: { en: 'Location', hi: 'स्थान', gu: 'સ્થાન' },
  contactNumber: { en: 'Contact Number', hi: 'संपर्क नंबर', gu: 'સંપર્ક નંબર' },
  description: { en: 'Description', hi: 'विवरण', gu: 'વર્ણન' },
  status: { en: 'Status', hi: 'स्थिति', gu: 'સ્થિતિ' },
  active: { en: 'Active', hi: 'सक्रिय', gu: 'સક્રિય' },
  sold: { en: 'Sold', hi: 'बिक गया', gu: 'વેચાયેલું' },
  expired: { en: 'Expired', hi: 'समाप्त', gu: 'સમાપ્ત' },
  edit: { en: 'Edit', hi: 'संपादित करें', gu: 'સંપાદિત કરો' },
  delete: { en: 'Delete', hi: 'मिटाएं', gu: 'કાઢી નાખો' },
  save: { en: 'Save', hi: 'सहेजें', gu: 'સાચવો' },
  cancel: { en: 'Cancel', hi: 'रद्द करें', gu: 'રદ કરો' },
  submit: { en: 'Submit', hi: 'जमा करें', gu: 'સબમિટ કરો' },
  sendOffer: { en: 'Send Offer', hi: 'ऑफर भेजें', gu: 'ઑફર મોકલો' },
  offerPrice: { en: 'Offer Price', hi: 'ऑफर मूल्य', gu: 'ઑફર કિંમત' },
  message: { en: 'Message', hi: 'संदेश', gu: 'સંદેશ' },
  minPrice: { en: 'Min Price', hi: 'न्यूनतम मूल्य', gu: 'ન્યૂનતમ કિંમત' },
  maxPrice: { en: 'Max Price', hi: 'अधिकतम मूल्य', gu: 'મહત્તમ કિંમત' },
  averagePrice: { en: 'Average Price', hi: 'औसत मूल्य', gu: 'સરેરાશ કિંમત' },
  date: { en: 'Date', hi: 'तारीख', gu: 'તારીખ' },
  filter: { en: 'Filter', hi: 'फ़िल्टर', gu: 'ફિલ્ટર' },
  search: { en: 'Search', hi: 'खोजें', gu: 'શોધો' },
  viewDetails: { en: 'View Details', hi: 'विवरण देखें', gu: 'વિગતો જુઓ' },
  forgotPassword: { en: 'Forgot Password?', hi: 'पासवर्ड भूल गए?', gu: 'પાસવર્ડ ભૂલી ગયા?' },
  dontHaveAccount: { en: "Don't have an account?", hi: 'खाता नहीं है?', gu: 'એકાઉન્ટ નથી?' },
  alreadyHaveAccount: { en: 'Already have an account?', hi: 'पहले से खाता है?', gu: 'પહેલેથી એકાઉન્ટ છે?' },
  resetPassword: { en: 'Reset Password', hi: 'पासवर्ड रीसेट करें', gu: 'પાસવર્ડ રીસેટ કરો' },
  email: { en: 'Email', hi: 'ईमेल', gu: 'ઇમેઇલ' },
  markAsSold: { en: 'Mark as Sold', hi: 'बिका हुआ के रूप में चिह्नित करें', gu: 'વેચાયેલું તરીકે ચિહ્નિત કરો' },
  receivedOffers: { en: 'Received Offers', hi: 'प्राप्त ऑफर', gu: 'પ્રાપ્ત ઑફર્સ' },
  myOffers: { en: 'My Offers', hi: 'मेरे ऑफर', gu: 'મારા ઑફર્સ' },
  perUnit: { en: 'per unit', hi: 'प्रति इकाई', gu: 'પ્રતિ એકમ' },
  unit: { en: 'Unit', hi: 'इकाई', gu: 'એકમ' },
  passwordMismatch: { en: 'Passwords do not match', hi: 'पासवर्ड मेल नहीं खाते', gu: 'પાસવર્ડ મેળ નથી ખાય' },
  invalidMobileNumber: { en: 'Mobile number must be 10 digits', hi: 'मोबाइल नंबर 10 अंकों का होना चाहिए', gu: 'મોબાઇલ નંબર 10 અંકની હોવી જોઇએ' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && ['en', 'hi', 'gu'].includes(savedLang)) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
