import { IPlayer, ICard, IUnit } from '../types';
import { Helpers } from '../utils/Helpers';

export interface DeckStats {
  wins: number;
  losses: number;
  avgTurnLength: number;
  mostPlayedCard: string;
  winRate: number;
  gamesPlayed: number;
}

export class Player implements IPlayer {
  public id: number;
  public name: string;
  public health: number;
  public maxHealth: number;
  public mana: number;
  public maxMana: number;
  public deck: ICard[];
  public hand: ICard[];
  public units: IUnit[];
  public graveyard: ICard[];
  public turnCount: number;
  public fatigueDamage: number;
  public personalTurnNumber: number;
  // ADD THESE PROPERTIES
  public costReductions: Map<string, number>;
  public statusEffects: Map<string, any>;

  constructor(id: number, name: string, deck: ICard[]) {
    this.id = id;
    this.name = name;
    this.health = 30;
    this.maxHealth = 30;
    this.mana = 0;
    this.maxMana = 0;
    this.deck = Helpers.shuffle([...deck]);
    this.hand = [];
    this.units = [];
    this.graveyard = [];
    this.turnCount = 0;
    this.fatigueDamage = 1;
    this.personalTurnNumber = 0;
    // INITIALIZE THE NEW PROPERTIES
    this.costReductions = new Map<string, number>();
    this.statusEffects = new Map<string, any>();
  }

  public drawCard(): ICard | null {
    if (this.deck.length === 0) {
      // Fatigue damage
      this.health -= this.fatigueDamage;
      this.fatigueDamage++;
      return null;
    }

    const card = this.deck.shift()!;
    
    if (this.hand.length < 7) {
      this.hand.push(card);
      return card;
    } else {
      // Burn card
      this.graveyard.push(card);
      return null;
    }
  }

  public startTurn(): void {
    // Increment personal turn number
    this.personalTurnNumber = (this.personalTurnNumber || 0) + 1;
    this.turnCount = this.personalTurnNumber;
    this.maxMana = Math.min(10, this.personalTurnNumber);
    this.mana = this.maxMana;
    console.log(`${this.name} - Turn ${this.personalTurnNumber}: Mana ${this.mana}/${this.maxMana}`);
  }

  public getPersonalTurnNumber(): number {
    return this.personalTurnNumber;
  }

  // Add cost reduction helper methods
  public addCostReduction(archetype: string, amount: number): void {
    const current = this.costReductions.get(archetype) || 0;
    this.costReductions.set(archetype, current + amount);
  }

  public getCostReduction(archetype: string): number {
    return this.costReductions.get(archetype) || 0;
  }

  public useCostReduction(archetype: string): void {
    this.costReductions.delete(archetype);
  }

  // Add status effect helper methods
  public addStatusEffect(effectType: string, data: any): void {
    this.statusEffects.set(effectType, data);
  }

  public hasStatusEffect(effectType: string): boolean {
    return this.statusEffects.has(effectType);
  }

  public getStatusEffect(effectType: string): any {
    return this.statusEffects.get(effectType);
  }

  public removeStatusEffect(effectType: string): void {
    this.statusEffects.delete(effectType);
  }

  private saveDeckStats(deckId: string, won: boolean, turnCount: number): void {
    const stats = JSON.parse(localStorage.getItem('deckStats') || '{}');
    if (!stats[deckId]) {
      stats[deckId] = { 
        wins: 0, 
        losses: 0, 
        avgTurnLength: 0, 
        gamesPlayed: 0,
        mostPlayedCard: '',
        winRate: 0
      };
    }
    
    if (won) stats[deckId].wins++;
    else stats[deckId].losses++;
    
    stats[deckId].gamesPlayed++;
    stats[deckId].avgTurnLength = 
      (stats[deckId].avgTurnLength * (stats[deckId].gamesPlayed - 1) + turnCount) 
      / stats[deckId].gamesPlayed;
    
    stats[deckId].winRate = (stats[deckId].wins / stats[deckId].gamesPlayed) * 100;
      
    localStorage.setItem('deckStats', JSON.stringify(stats));
  }

  public getDeckStats(deckId: string): DeckStats | null {
    const stats = JSON.parse(localStorage.getItem('deckStats') || '{}');
    return stats[deckId] || null;
  }
}