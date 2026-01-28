/**
 * Dynamic social media links configuration
 * Can be fetched from backend API in the future
 */

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Default social media links
const defaultSocialMedia = {
  instagram: "https://instagram.com/smartloc",
  twitter: "https://twitter.com/smartloc",
  facebook: "https://facebook.com/smartloc",
  whatsapp: "0705292183", // Your WhatsApp number
  phone: "+94 52 222 1234", // Contact phone number
};

/**
 * Get social media links (from API or default)
 */
export async function getSocialMediaLinks() {
  if (!API_BASE) {
    return defaultSocialMedia;
  }

  try {
    const response = await fetch(`${API_BASE}/api/social-media`);
    if (response.ok) {
      const data = await response.json();
      return data.data || defaultSocialMedia;
    }
  } catch (error) {
    console.warn("Failed to fetch social media links, using defaults:", error);
  }

  return defaultSocialMedia;
}

/**
 * Get WhatsApp link
 * Formats Sri Lankan phone numbers correctly (removes leading 0, adds country code 94)
 */
export function getWhatsAppLink(phoneNumber) {
  if (!phoneNumber) return "#";
  
  // Remove any spaces, dashes, or special characters
  let cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");
  
  // If starts with 0 (Sri Lankan format), remove it
  if (cleanNumber.startsWith("0")) {
    cleanNumber = cleanNumber.substring(1);
  }
  
  // Ensure it starts with country code (94 for Sri Lanka)
  const formattedNumber = cleanNumber.startsWith("94") ? cleanNumber : `94${cleanNumber}`;
  
  return `https://wa.me/${formattedNumber}`;
}

/**
 * Social media icons mapping
 */
export const socialMediaIcons = {
  instagram: "📷",
  twitter: "🐦",
  facebook: "👥",
  whatsapp: "💬",
};
