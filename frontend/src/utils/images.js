/**
 * Generates the URL for a Cricbuzz news image.
 * 
 * @param {string|number} imageId - The ID of the image.
 * @param {string} [width='original'] - Target width (e.g., '595' or 'original').
 * @param {string} [height='original'] - Target height (e.g., '396' or 'original').
 * @returns {string} The fully qualified image URL.
 */
export const getNewsImage = (imageId, width, height) => {
    if (!imageId) return 'https://placehold.co/600x400?text=No+Image';

    const cleanId = String(imageId).trim();

    // We found that 600x400 with 'o.jpg' (original/output) returns the highest quality image (~23KB).
    // The standard 'i.jpg' is often a thumbnail.
    return `https://static.cricbuzz.com/a/img/v1/600x400/i1/c${cleanId}/o.jpg`;
};
