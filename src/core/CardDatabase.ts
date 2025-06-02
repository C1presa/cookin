import { ICard, CardType, Rarity, EffectType, TargetType } from '../types';

export class CardDatabase {
  private cards: Map<string, ICard> = new Map();

  constructor() {
    this.initializeCards();
  }

  private initializeCards(): void {
    const cardDefinitions: ICard[] = [
      {
        id: 'kriper',
        name: 'Kriper',
        cost: 1,
        type: CardType.UNIT,
        archetype: 'Neutral',
        rarity: Rarity.COMMON,
        attack: 1,
        health: 1,
        effects: [],
        description: 'A basic unit.',
        icon: '🦎'
      },
      {
        id: 'mercenary',
        name: 'Mercenary',
        cost: 2,
        type: CardType.UNIT,
        archetype: 'Neutral',
        rarity: Rarity.COMMON,
        attack: 2,
        health: 2,
        effects: [],
        description: 'A reliable fighter.',
        icon: '⚔️'
      },
      {
        id: 'guard',
        name: 'Guard',
        cost: 3,
        type: CardType.UNIT,
        archetype: 'Neutral',
        rarity: Rarity.COMMON,
        attack: 2,
        health: 4,
        effects: [{
          type: EffectType.TAUNT,
          targetType: TargetType.SELF,
          requiresTargeting: false
        }],
        description: 'Taunt. Enemies must attack this unit first.',
        icon: '🛡️'
      },
      {
        id: 'berserker',
        name: 'Berserker',
        cost: 4,
        type: CardType.UNIT,
        archetype: 'Nether',
        rarity: Rarity.RARE,
        attack: 4,
        health: 3,
        effects: [{
          type: EffectType.STRIKE,
          targetType: TargetType.ENEMY,
          value: 1,
          requiresTargeting: false
        }],
        description: 'Strike: Deal 1 damage to the enemy player when this attacks.',
        icon: '🗡️'
      },
      {
        id: 'warchief',
        name: 'Warchief',
        cost: 5,
        type: CardType.UNIT,
        archetype: 'Neutral',
        rarity: Rarity.RARE,
        attack: 3,
        health: 3,
        effects: [{
          type: EffectType.WARSHOUT,
          targetType: TargetType.ALLY,
          area: 'all',
          value: 1,
          requiresTargeting: false
        }],
        description: 'Warshout: Give all other friendly units +1/+1.',
        icon: '👑'
      },
      {
        id: 'titan',
        name: 'Titan',
        cost: 6,
        type: CardType.UNIT,
        archetype: 'Neutral',
        rarity: Rarity.EPIC,
        attack: 6,
        health: 6,
        effects: [],
        description: 'A massive unit.',
        icon: '🗿'
      }
    ];

    cardDefinitions.forEach(card => {
      this.cards.set(card.id, card);
    });
  }

  public getCard(id: string): ICard | undefined {
    return this.cards.get(id);
  }

  public getAllCards(): ICard[] {
    return Array.from(this.cards.values());
  }
}