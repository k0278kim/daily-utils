/**
 * Check if a character is a Korean initial consonant (Chosung)
 */
const isChosung = (char: string) => {
    const chosung = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    return chosung.includes(char);
};

/**
 * Get Chosung (Initial Consonant) from a Hangul character
 */
const getChosung = (char: string) => {
    const chosung = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    const charCode = char.charCodeAt(0);

    // Hangul Syllables range: AC00 - D7A3
    if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
        const chosungIndex = Math.floor((charCode - 0xAC00) / 588);
        return chosung[chosungIndex];
    }
    return char;
};

/**
 * Search strings including Hangul Chosung support
 */
export const searchHangul = (target: string, query: string): boolean => {
    if (!query) return true;

    const targetLower = target.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact/Substring match first
    if (targetLower.includes(queryLower)) return true;

    // Check if query contains Chosung
    // If query is all chosung, we can match against target's chosung
    // But mixed query (chosung + syllables) requires more complex logic.
    // Simplifying: if query looks like chosung pattern, convert target to chosung and check.

    // Convert target to Chosung string
    let targetChosung = '';
    for (const char of target) {
        targetChosung += getChosung(char);
    }

    // We only enable Chosung search if the query seems to be using Chosung characters 
    // strictly (or we can just check if targetChosung includes query).
    // Note: 'ㄱ' is a valid Chosung but also a standalone Jamo.
    // If query is 'ㄱ', it should match '가'.

    // Just finding substring in Chosung version of target is the standard simple Chosung search.
    if (targetChosung.includes(query)) return true;

    return false;
};
