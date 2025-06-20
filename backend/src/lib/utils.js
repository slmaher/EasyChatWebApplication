import jwt from "jsonwebtoken";
import axios from "axios";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // MS
    httpOnly: true, // prevent XSS attacks cross-site scripting attacks
    sameSite: "strict", // CSRF attacks cross-site request forgery attacks
    secure: process.env.NODE_ENV !== "development",
  });

  return token;
};

// Language detection and translation utilities using MyMemory API (more reliable)
const MYMEMORY_API_URL = "https://api.mymemory.translated.net";

export const detectLanguage = async (text) => {
  try {
    // MyMemory can auto-detect language by trying to translate to a known language
    const response = await axios.get(`${MYMEMORY_API_URL}/get`, {
      params: {
        q: text,
        langpair: 'auto|en',
        de: 'your-email@domain.com' // Optional but recommended
      },
      timeout: 5000
    });
    
    const detectedLang = response.data.detectedLanguage?.lang || 'en';
    console.log(`Language detection successful:`, detectedLang);
    return detectedLang;
  } catch (error) {
    console.error(`Language detection failed:`, error.message);
    return 'en'; // Default to English on error
  }
};

export const translateText = async (text, target) => {
  // If target language is English, just return original text
  if (target === 'en') return text;
  
  try {
    // Map language codes to MyMemory format
    const langMap = {
      'ar': 'ar',
      'fr': 'fr', 
      'es': 'es',
      'de': 'de',
      'it': 'it',
      'pt': 'pt',
      'ru': 'ru',
      'ja': 'ja',
      'ko': 'ko',
      'zh': 'zh'
    };
    
    const targetLang = langMap[target] || target;
    
    const response = await axios.get(`${MYMEMORY_API_URL}/get`, {
      params: {
        q: text,
        langpair: `en|${targetLang}`,
        de: 'your-email@domain.com' // Optional but recommended
      },
      timeout: 5000
    });
    
    const translatedText = response.data.responseData?.translatedText;
    if (translatedText && translatedText !== text) {
      console.log(`Translation successful:`, translatedText);
      return translatedText;
    }
    
    return text; // Return original if translation failed
  } catch (error) {
    console.error(`Translation failed:`, error.message);
    return text; // Return original text if translation fails
  }
};
