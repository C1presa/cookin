import { ICard, Rarity } from '../types';

export class DeckValidator {
  static validateDeck(deck: ICard[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check deck size
    if (deck.length < 20) {
      errors.push(`Deck has only ${deck.length} cards (minimum 20)`);
    }
    if (deck.length > 30) {
      errors.push(`Deck has ${deck.length} cards (maximum 30)`);
    }
    
    // Check card limits
    const cardCounts = new Map<string, number>();
    deck.forEach(card => {
      const count = cardCounts.get(card.id) || 0;
      cardCounts.set(card.id, count + 1);
      
      if (card.rarity === Rarity.LEGENDARY && count > 1) {
        errors.push(`Too many copies of legendary card: ${card.name}`);
      } else if (card.rarity !== Rarity.LEGENDARY && count > 3) {
        errors.push(`Too many copies of ${card.name} (max 3)`);
      }
    });
    
    return { valid: errors.length === 0, errors };
  }
} 