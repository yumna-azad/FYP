/**
 * Shared contact info for SmartLoc. Used on Home (Contact section) and
 * Recommendations (Contact Agent button → tel: link).
 */
export const CONTACT_PHONE = "+94 52 222 1234"; // Fallback if API unavailable
export const CONTACT_EMAIL = "hello@smartloc.lk";

/**
 * Get formatted phone number for tel: links
 * Removes spaces and ensures proper format
 */
export function getPhoneLink(phone = CONTACT_PHONE) {
  if (!phone) return `tel:${CONTACT_PHONE.replace(/\s/g, "")}`;
  return `tel:${phone.replace(/\s/g, "")}`;
}

/**
 * Get contact phone number dynamically from API
 * Falls back to default if API unavailable
 */
export async function getContactPhone() {
  const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  
  if (!API_BASE) {
    return CONTACT_PHONE;
  }

  try {
    const response = await fetch(`${API_BASE}/api/social-media`);
    if (response.ok) {
      const data = await response.json();
      return data.data?.phone || CONTACT_PHONE;
    }
  } catch (error) {
    console.warn("Failed to fetch contact phone, using default:", error);
  }

  return CONTACT_PHONE;
}

/**
 * Get formatted email link
 * If user is registered, opens Gmail compose, otherwise uses mailto:
 */
export function getEmailLink(email = CONTACT_EMAIL, isRegistered = false) {
  if (isRegistered) {
    // Open Gmail compose with email pre-filled
    const subject = encodeURIComponent("SmartLoc Inquiry");
    const body = encodeURIComponent("Hello SmartLoc team,\n\n");
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;
  }
  // Default mailto link for non-registered users
  return `mailto:${email}`;
}

/** Opens Google Calendar to create a new event (SmartLoc consultation). */
export const GOOGLE_CALENDAR_MEETING_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  "&text=SmartLoc+Location+Consultation" +
  "&details=Meeting+with+SmartLoc+team+for+location+advice+in+Nuwara+Eliya" +
  "&location=Nuwara+Eliya";
