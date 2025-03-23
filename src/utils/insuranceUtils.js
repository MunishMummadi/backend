/**
 * Insurance utility functions for the Healthspot application
 * Provides utilities to handle insurance filtering and hardcoded insurance data
 */

// List of common insurance providers in the US healthcare system
export const INSURANCE_PROVIDERS = [
  { id: "medicare", name: "Medicare", type: "government" },
  { id: "medicaid", name: "Medicaid", type: "government" },
  { id: "bluecross", name: "Blue Cross Blue Shield", type: "private" },
  { id: "aetna", name: "Aetna", type: "private" },
  { id: "cigna", name: "Cigna", type: "private" },
  { id: "united", name: "UnitedHealthcare", type: "private" },
  { id: "humana", name: "Humana", type: "private" },
  { id: "tricare", name: "Tricare", type: "military" },
  { id: "kaiser", name: "Kaiser Permanente", type: "private" },
  { id: "anthem", name: "Anthem", type: "private" }
];

/**
 * Generate random insurance acceptance data for providers
 * Used to simulate real-world insurance data for demonstration purposes
 * 
 * @param {number} count - How many insurance providers to randomly select
 * @returns {Array} - Array of accepted insurance provider IDs
 */
export function generateRandomInsuranceData(count = 3) {
  // Shuffle and take a subset of insurance providers
  const shuffled = [...INSURANCE_PROVIDERS]
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.min(count, INSURANCE_PROVIDERS.length));
  
  return shuffled.map(insurance => insurance.id);
}

/**
 * Check if a provider accepts specific insurance
 * 
 * @param {Object} provider - Provider data object
 * @param {string|string[]} insuranceIds - Insurance ID(s) to check
 * @returns {boolean} - True if the provider accepts any of the specified insurances
 */
export function checkInsuranceAcceptance(provider, insuranceIds) {
  // Handle case where no insurance filtering is needed
  if (!insuranceIds || (Array.isArray(insuranceIds) && insuranceIds.length === 0)) {
    return true;
  }

  // Ensure we're working with an array
  const insuranceIdArray = Array.isArray(insuranceIds) ? insuranceIds : [insuranceIds];
  
  // If provider has no insurance data, return false for any insurance filtering
  if (!provider.insuranceAccepted || !Array.isArray(provider.insuranceAccepted)) {
    return false;
  }
  
  // Check if provider accepts any of the specified insurances
  return insuranceIdArray.some(id => 
    provider.insuranceAccepted.includes(id)
  );
}

/**
 * Format insurance data for frontend display
 * 
 * @param {string[]} insuranceIds - Array of insurance provider IDs
 * @returns {Object[]} - Formatted insurance information for display
 */
export function formatInsuranceData(insuranceIds) {
  if (!insuranceIds || !Array.isArray(insuranceIds)) {
    return [];
  }
  
  return insuranceIds.map(id => {
    const provider = INSURANCE_PROVIDERS.find(p => p.id === id);
    return provider ? {
      id: provider.id,
      name: provider.name,
      type: provider.type
    } : { id, name: id, type: 'unknown' };
  });
}
