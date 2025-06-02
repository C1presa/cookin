// src/ui/VisualEffectsSystem.ts
import { Position } from '../types';

export interface IParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: string;
}

export class VisualEffectsSystem {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: IParticle[] = [];
  private animationId: number | null = null;

  constructor() {
    this.container = this.createContainer();
    this.canvas = this.createCanvas();
    this.ctx = this.canvas.getContext('2d')!;
    this.container.appendChild(this.canvas);
    document.body.appendChild(this.container);
    
    this.setupCanvas();
    this.startAnimation();
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'particle-container';
    return container;
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    return canvas;
  }

  private setupCanvas(): void {
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    
    resize();
    window.addEventListener('resize', resize);
  }

  private startAnimation(): void {
    const animate = () => {
      this.update();
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Update life
      particle.life--;
      
      // Apply gravity for some effects
      if (particle.type === 'damage' || particle.type === 'heal') {
        particle.vy += 0.2;
      }
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      this.ctx.globalAlpha = alpha;
      
      switch (particle.type) {
        case 'sparkle':
          this.renderSparkle(particle);
          break;
        case 'damage':
          this.renderDamageNumber(particle);
          break;
        case 'heal':
          this.renderHealNumber(particle);
          break;
        case 'explosion':
          this.renderExplosion(particle);
          break;
        default:
          this.renderDefault(particle);
      }
    });
    
    this.ctx.globalAlpha = 1;
  }

  private renderSparkle(particle: IParticle): void {
    this.ctx.fillStyle = particle.color;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderDamageNumber(particle: IParticle): void {
    this.ctx.font = `bold ${particle.size}px Arial`;
    this.ctx.fillStyle = particle.color;
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(`-${particle.size}`, particle.x, particle.y);
    this.ctx.fillText(`-${particle.size}`, particle.x, particle.y);
  }

  private renderHealNumber(particle: IParticle): void {
    this.ctx.font = `bold ${particle.size}px Arial`;
    this.ctx.fillStyle = particle.color;
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(`+${particle.size}`, particle.x, particle.y);
    this.ctx.fillText(`+${particle.size}`, particle.x, particle.y);
  }

  private renderExplosion(particle: IParticle): void {
    const gradient = this.ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.size
    );
    gradient.addColorStop(0, particle.color);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderDefault(particle: IParticle): void {
    this.ctx.fillStyle = particle.color;
    this.ctx.fillRect(
      particle.x - particle.size / 2,
      particle.y - particle.size / 2,
      particle.size,
      particle.size
    );
  }

  // Public effect methods
  public playCardEffect(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 30,
        maxLife: 30,
        size: Math.random() * 3 + 1,
        color: '#00d2d3',
        type: 'sparkle'
      });
    }
  }

  public unitSpawnEffect(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        life: 40,
        maxLife: 40,
        size: 3,
        color: '#2ed573',
        type: 'sparkle'
      });
    }
  }

  public attackEffect(from: HTMLElement, to: HTMLElement): void {
    const fromRect = from.getBoundingClientRect();
    const toRect = to.getBoundingClientRect();
    
    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height / 2;
    const endX = toRect.left + toRect.width / 2;
    const endY = toRect.top + toRect.height / 2;
    
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      setTimeout(() => {
        const t = i / steps;
        const x = startX + (endX - startX) * t;
        const y = startY + (endY - startY) * t;
        
        this.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 20,
          maxLife: 20,
          size: 4,
          color: '#ff4757',
          type: 'sparkle'
        });
      }, i * 20);
    }
    
    // Impact effect
    setTimeout(() => {
      this.particles.push({
        x: endX,
        y: endY,
        vx: 0,
        vy: 0,
        life: 30,
        maxLife: 30,
        size: 50,
        color: '#ff4757',
        type: 'explosion'
      });
    }, steps * 20);
  }

  public damageEffect(element: HTMLElement, damage: number): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: -2,
      life: 60,
      maxLife: 60,
      size: damage,
      color: '#ff4757',
      type: 'damage'
    });
  }

  public healEffect(element: HTMLElement, amount: number): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: -1,
      life: 60,
      maxLife: 60,
      size: amount,
      color: '#2ed573',
      type: 'heal'
    });
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.container.remove();
  }
}